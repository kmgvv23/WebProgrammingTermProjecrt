const express = require('express');
const router = express.Router();
const pool = require('../db'); // db.js 사용

const fetch = global.fetch || require('node-fetch'); // node 18 이하면 필요

// Gemini REST API 호출 
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 가 .env에 설정되지 않았습니다.');
  }

  // 기본값을 gemini-pro 로 하니까 오류떠서 flash 로하니깐 해결
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // v1beta + models/모델명:generateContent 조합 사용
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Gemini API error:', res.status, text);
    throw new Error('Gemini API 요청 실패');
  }

  const data = await res.json();

  const candidates = data.candidates || [];
  if (!candidates.length) return '';

  const cand = candidates[0];
  const parts = cand.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('\n');

  return text.trim();
}


// 로그인 체크
function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.redirect('/login');
  }
  next();
}

// 🔹 새 스터디 작성 폼
router.get('/new', requireLogin, (req, res) => {
  res.render('study-form', { pageTitle: '새 스터디 만들기' });
});

// 🔹 스터디 생성
router.post('/create', requireLogin, async (req, res) => {
  const {
    title,
    description,
    maxMembers,
    day,
    bookTitle,
    bookIsbn,
    bookCoverUrl,
    bookAuthor
  } = req.body;

  if (!title || title.trim().length < 2) {
    return res.status(400).send('제목을 2글자 이상 입력하세요.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) studies에 스터디 생성
    const [result] = await conn.query(
      `INSERT INTO studies
       (title, description, max_members, day, book_isbn, book_title,
        book_cover_url, book_author, creator_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title.trim(),
        description || '',
        maxMembers || 10,
        day || '',
        bookIsbn || null,
        bookTitle || null,
        bookCoverUrl || null,
        bookAuthor || null,
        req.session.user.id
      ]
    );

    const newStudyId = result.insertId;

    // 2) 만든 사람을 study_members에 LEADER로 추가
    await conn.query(
      `INSERT INTO study_members (study_id, user_id, role)
       VALUES (?, ?, 'LEADER')`,
      [newStudyId, req.session.user.id]
    );

    await conn.commit();
    return res.redirect('/studies/' + newStudyId);
  } catch (err) {
    await conn.rollback();
    console.error('POST /studies/create error:', err);
    return res.status(500).send('서버 에러');
  } finally {
    conn.release();
  }
});

// 🔹 스터디 목록
router.get('/', async (req, res) => {
  try {
    const keyword = (req.query.keyword || '').trim();
    const day = (req.query.day || '').trim();

    let sql = `
      SELECT
        s.id,
        s.title,
        s.description,
        s.max_members AS maxMembers,
        s.day,
        s.book_isbn AS bookIsbn,
        s.book_title AS bookTitle,
        s.book_cover_url AS bookCoverUrl,
        s.book_author AS bookAuthor,
        s.created_at AS createdAt,
        u.nickname AS creatorName
      FROM studies s
      LEFT JOIN users u ON u.id = s.creator_id
    `;
    const conds = [];
    const params = [];

    if (keyword) {
      conds.push(`(s.title LIKE ? OR s.description LIKE ? OR s.book_title LIKE ?)`);
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (day) {
      conds.push(`s.day = ?`);
      params.push(day);
    }

    if (conds.length > 0) {
      sql += ' WHERE ' + conds.join(' AND ');
    }

    sql += ' ORDER BY s.created_at DESC';

    const [rows] = await pool.query(sql, params);

    res.render('studies', {
      pageTitle: '스터디 찾기',
      studies: rows,
      keyword,
      day
    });
  } catch (err) {
    console.error('GET /studies error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 스터디 수정 폼
router.get('/:id/edit', requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.session.user.id;

    const [[study]] = await pool.query(
      `
      SELECT
        s.id,
        s.title,
        s.description,
        s.max_members AS maxMembers,
        s.day,
        s.book_isbn AS bookIsbn,
        s.book_title AS bookTitle,
        s.book_cover_url AS bookCoverUrl,
        s.book_author AS bookAuthor,
        s.created_at AS createdAt,
        s.creator_id AS creatorId,
        u.nickname AS creatorName
      FROM studies s
      LEFT JOIN users u ON u.id = s.creator_id
      WHERE s.id = ?
    `,
      [id]
    );

    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');
    if (study.creatorId !== userId) {
      return res.status(403).send('수정 권한이 없습니다.');
    }

    res.render('study-form', {
      pageTitle: '스터디 수정',
      study
    });
  } catch (err) {
    console.error('GET /studies/:id/edit error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 스터디 수정 처리
router.post('/:id/update', requireLogin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.session.user.id;

    const [[study]] = await pool.query('SELECT * FROM studies WHERE id = ?', [id]);
    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');
    if (study.creator_id !== userId) {
      return res.status(403).send('수정 권한이 없습니다.');
    }

    const {
      title,
      description,
      maxMembers,
      day,
      bookTitle,
      bookIsbn,
      bookCoverUrl,
      bookAuthor
    } = req.body;

    if (!title || title.trim().length < 2) {
      return res.status(400).send('제목을 2글자 이상 입력하세요.');
    }

    await pool.query(
      `
      UPDATE studies
       SET title = ?,
           description = ?,
           max_members = ?,
           day = ?,
           book_isbn = ?,
           book_title = ?,
           book_cover_url = ?,
           book_author = ?
       WHERE id = ?
    `,
      [
        title.trim(),
        description || '',
        maxMembers || 10,
        day || '',
        bookIsbn || null,
        bookTitle || null,
        bookCoverUrl || null,
        bookAuthor || null,
        id
      ]
    );

    return res.redirect('/studies/' + id);
  } catch (err) {
    console.error('POST /studies/:id/update error:', err);
    res.status(500).send('서버 에러');
  }
});

// /studies/:id/delete 로 오는 GET/POST 전부 여기로
router.all('/:id/delete', requireLogin, deleteStudyHandler);

// 🔹 스터디 삭제 (GET/POST 모두 허용)
async function deleteStudyHandler(req, res) {
  const id = Number(req.params.id);
  const userId = req.session.user.id;

  const conn = await pool.getConnection();
  try {
    // 1) 이 스터디가 실제로 존재하는지 + 권한 체크
    const [[study]] = await conn.query(
      'SELECT * FROM studies WHERE id = ?',
      [id]
    );

    if (!study) {
      conn.release();
      return res.status(404).send('존재하지 않는 스터디입니다.');
    }

    if (study.creator_id !== userId) {
      conn.release();
      return res.status(403).send('삭제 권한이 없습니다.');
    }

    // 2) 트랜잭션 시작
    await conn.beginTransaction();

    // 2-1) 댓글 → 게시글 기준으로 먼저 삭제
    //      study_comments 에는 study_id가 없고 post_id만 있으니까
    await conn.query(`
      DELETE c
      FROM study_comments c
      JOIN study_posts p ON c.post_id = p.id
      WHERE p.study_id = ?
    `, [id]);

    // 2-2) 채팅 메시지 삭제
    await conn.query(
      'DELETE FROM study_chat_messages WHERE study_id = ?',
      [id]
    );

    // 2-3) 게시글 삭제
    await conn.query(
      'DELETE FROM study_posts WHERE study_id = ?',
      [id]
    );

    // 2-4) 멤버 삭제
    await conn.query(
      'DELETE FROM study_members WHERE study_id = ?',
      [id]
    );

    // 2-5) 마지막으로 스터디 삭제
    await conn.query(
      'DELETE FROM studies WHERE id = ?',
      [id]
    );

    await conn.commit();
    conn.release();

    return res.redirect('/mypage');
  } catch (err) {
    console.error('DELETE /studies/:id/delete error:', err);
    try {
      await conn.rollback();
    } catch (_) {}
    conn.release();
    return res.status(500).send('서버 에러');
  }
}




// 🔹 스터디 가입 (멤버로 참여)
router.post('/:id/join', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    // 스터디 존재 여부 확인
    const [[study]] = await pool.query('SELECT * FROM studies WHERE id = ?', [studyId]);
    if (!study) {
      return res.status(404).send('존재하지 않는 스터디입니다.');
    }

    // 이미 멤버인지(LEADER/MEMBER 상관없이) 확인
    const [rows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (rows.length === 0) {
      // 새 멤버로 추가
      await pool.query(
        'INSERT INTO study_members (study_id, user_id, role) VALUES (?, ?, "MEMBER")',
        [studyId, userId]
      );
    }

    // 가입 후 멤버 전용 홈으로 이동
    return res.redirect(`/studies/${studyId}/room`);
  } catch (err) {
    console.error('POST /studies/:id/join error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 스터디 탈퇴
router.post('/:id/leave', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    // 현재 역할 확인
    const [rows] = await pool.query(
      'SELECT role FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (rows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    const role = rows[0].role;

    // LEADER는 탈퇴 불가 (스터디 삭제로 처리하도록)
    if (role === 'LEADER') {
      return res.status(400).send('리더는 탈퇴할 수 없습니다. 스터디를 삭제하세요.');
    }

    await pool.query('DELETE FROM study_members WHERE study_id = ? AND user_id = ?', [
      studyId,
      userId
    ]);

    return res.redirect('/studies/' + studyId);
  } catch (err) {
    console.error('POST /studies/:id/leave error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 스터디 멤버 전용 룸(홈)
router.get('/:id/room', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    // 스터디 정보
    const [[study]] = await pool.query(
      `
      SELECT
        s.id,
        s.title,
        s.description,
        s.max_members AS maxMembers,
        s.day,
        s.book_isbn AS bookIsbn,
        s.book_title AS bookTitle,
        s.book_cover_url AS bookCoverUrl,
        s.book_author AS bookAuthor,
        s.created_at AS createdAt,
        s.creator_id AS creatorId,
        u.nickname AS creatorName
      FROM studies s
      LEFT JOIN users u ON u.id = s.creator_id
      WHERE s.id = ?
    `,
      [studyId]
    );

    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    // 멤버인지 확인
    const [memberRows] = await pool.query(
      'SELECT role FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    const role = memberRows[0].role;
    const isOwner = study.creatorId === userId;

    // 🔹 최근 게시글 5개
    const [recentPosts] = await pool.query(
      `
      SELECT p.id, p.title, p.created_at AS createdAt, u.nickname AS authorName
      FROM study_posts p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.study_id = ?
      ORDER BY p.created_at DESC
      LIMIT 5
    `,
      [studyId]
    );

    res.render('studies-room', {
      pageTitle: `${study.title} - 스터디 홈`,
      study,
      role,
      isOwner,
      recentPosts
    });
  } catch (err) {
    console.error('GET /studies/:id/room error:', err);
    res.status(500).send('서버 에러');
  }
});

//
// 🔹 Gemini: 책 요약 생성
//
router.post('/:id/ai/summary', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);

    const [[study]] = await pool.query(
      `
      SELECT
        book_title  AS bookTitle,
        book_author AS bookAuthor,
        description
      FROM studies
      WHERE id = ?
    `,
      [studyId]
    );

    if (!study) {
      return res.status(404).json({ error: '스터디 없음' });
    }

    const prompt = `
너는 독서 모임용 책 요약을 작성하는 AI야.
아래 정보를 바탕으로, 스포일러를 최소화하면서
독서 모임에서 이야기하기 좋은 5~7문장 정도의 한국어 요약을 써줘.

- 책 제목: ${study.bookTitle || '정보 없음'}
- 저자: ${study.bookAuthor || '정보 없음'}
- 스터디 설명: ${study.description || '설명 없음'}

요약은 자연스러운 단락 한 개 정도로 작성해줘.
`.trim();

    const summary = await callGemini(prompt);

    return res.json({ summary });
  } catch (err) {
    console.error('POST /studies/:id/ai/summary error:', err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

//
// 🔹 Gemini: 토론 주제 추천
//
router.post('/:id/ai/topics', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);

    const [[study]] = await pool.query(
      `
      SELECT
        book_title  AS bookTitle,
        book_author AS bookAuthor,
        description
      FROM studies
      WHERE id = ?
    `,
      [studyId]
    );

    if (!study) {
      return res.status(404).json({ error: '스터디 없음' });
    }

    const prompt = `
너는 독서 모임의 토론 주제를 만드는 AI야.
아래 책과 스터디 정보를 바탕으로,
참여자들이 깊게 얘기할 수 있는 핵심 토론 주제를 3개 만들어줘.

- 각 주제는 한 줄짜리 문장으로.
- 번호는 붙이지 말고, 줄바꿈으로만 구분해 줘.
- 모두 한국어로 작성해.

- 책 제목: ${study.bookTitle || '정보 없음'}
- 저자: ${study.bookAuthor || '정보 없음'}
- 스터디 설명: ${study.description || '설명 없음'}
`.trim();

    const raw = await callGemini(prompt);

    const topics = raw
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 3);

    return res.json({ topics });
  } catch (err) {
    console.error('POST /studies/:id/ai/topics error:', err);
    return res.status(500).json({ error: '서버 에러' });
  }
});

// 🔹 스터디 상세
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[study]] = await pool.query(
      `
      SELECT
        s.id,
        s.title,
        s.description,
        s.max_members AS maxMembers,
        s.day,
        s.book_isbn AS bookIsbn,
        s.book_title AS bookTitle,
        s.book_cover_url AS bookCoverUrl,
        s.book_author AS bookAuthor,
        s.created_at AS createdAt,
        s.creator_id AS creatorId,
        u.nickname AS creatorName
      FROM studies s
      LEFT JOIN users u ON u.id = s.creator_id
      WHERE s.id = ?
    `,
      [id]
    );

    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    let isOwner = false;
    let isMember = false;

    if (req.session?.user) {
      const userId = req.session.user.id;
      isOwner = study.creatorId === userId;

      const [memberRows] = await pool.query(
        'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
        [id, userId]
      );
      isMember = memberRows.length > 0;
    }

    res.render('studies-detail', {
      pageTitle: '스터디 상세',
      study,
      isOwner,
      isMember
    });
  } catch (err) {
    console.error('GET /studies/:id error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 게시판 목록
router.get('/:id/board', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    const [[study]] = await pool.query('SELECT id, title FROM studies WHERE id = ?', [
      studyId
    ]);
    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    const [memberRows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    const [posts] = await pool.query(
      `
      SELECT p.id, p.title, p.created_at AS createdAt, u.nickname AS authorName
      FROM study_posts p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.study_id = ?
      ORDER BY p.created_at DESC
    `,
      [studyId]
    );

    res.render('study-board-list', {
      pageTitle: `${study.title} - 게시판`,
      study,
      posts
    });
  } catch (err) {
    console.error('GET /studies/:id/board error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 글쓰기 폼
router.get('/:id/board/new', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    const [[study]] = await pool.query(
      'SELECT id, title, book_title AS bookTitle, book_author AS bookAuthor FROM studies WHERE id = ?',
      [studyId]
    );
    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    const [memberRows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    res.render('study-board-new', {
      pageTitle: `${study.title} - 글쓰기`,
      study
    });
  } catch (err) {
    console.error('GET /studies/:id/board/new error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 글 생성
router.post('/:id/board', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;
    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).send('제목을 입력하세요.');
    }
    if (!content || !content.trim()) {
      return res.status(400).send('내용을 입력하세요.');
    }

    const [memberRows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    const [result] = await pool.query(
      `
      INSERT INTO study_posts (study_id, user_id, title, content)
       VALUES (?, ?, ?, ?)
    `,
      [studyId, userId, title.trim(), content.trim()]
    );

    const newPostId = result.insertId;
    return res.redirect(`/studies/${studyId}/board/${newPostId}`);
  } catch (err) {
    console.error('POST /studies/:id/board error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 글 상세 + 댓글 목록
router.get('/:id/board/:postId', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const postId  = Number(req.params.postId);
    const userId  = req.session.user.id;

    // 스터디 존재 확인
    const [[study]] = await pool.query(
      'SELECT id, title FROM studies WHERE id = ?',
      [studyId]
    );
    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    // 멤버인지 확인
    const [memberRows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    // 게시글 조회
    const [[post]] = await pool.query(`
      SELECT p.id, p.title, p.content, p.created_at AS createdAt, u.nickname AS authorName
      FROM study_posts p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = ? AND p.study_id = ?
    `, [postId, studyId]);

    if (!post) return res.status(404).send('존재하지 않는 게시글입니다.');

    // 🔹 댓글 목록 조회
    const [commentRows] = await pool.query(`
      SELECT c.id,
             c.content,
             c.created_at AS createdAt,
             c.user_id AS userId,
             u.nickname
      FROM study_comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.study_id = ? AND c.post_id = ?
      ORDER BY c.created_at ASC
    `, [studyId, postId]);

    // 날짜 포맷 미리 문자열로
    const comments = commentRows.map(c => ({
      ...c,
      createdAtFormatted: c.createdAt
        ? new Date(c.createdAt).toLocaleString('ko-KR')
        : ''
    }));

    res.render('study-board-detail', {
      pageTitle: post.title,
      study,
      post,
      comments,
      currentUserId: userId
    });
  } catch (err) {
    console.error('GET /studies/:id/board/:postId error:', err);
    res.status(500).send('서버 에러');
  }
});

// 🔹 스터디 채팅 페이지
router.get('/:id/chat', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const userId = req.session.user.id;

    // 스터디 정보
    const [[study]] = await pool.query(
      'SELECT id, title FROM studies WHERE id = ?',
      [studyId]
    );
    if (!study) return res.status(404).send('존재하지 않는 스터디입니다.');

    // 멤버인지 확인
    const [memberRows] = await pool.query(
      'SELECT role FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      // 비멤버면 상세 페이지로 돌려보내기
      return res.redirect('/studies/' + studyId);
    }

// 최근 채팅 메시지 50개 불러오기
const [messagesRaw] = await pool.query(`
  SELECT m.id,
         m.message,
         m.created_at AS createdAt,
         u.nickname
  FROM study_chat_messages m
  LEFT JOIN users u ON u.id = m.user_id
  WHERE m.study_id = ?
  ORDER BY m.created_at ASC
  LIMIT 50
`, [studyId]);

// 날짜 포맷팅 추가
const messages = messagesRaw.map(row => ({
  ...row,
  createdAtFormatted: new Date(row.createdAt).toLocaleString('ko-KR', {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit"
  })
}));

res.render('study-chat', {
  pageTitle: `${study.title} - 채팅`,
  study,
  messages
});

  } catch (err) {
    console.error('GET /studies/:id/chat error:', err);
    res.status(500).send('서버 에러');
  }
});
// 🔹 댓글 작성
router.post('/:id/board/:postId/comments', requireLogin, async (req, res) => {
  try {
    const studyId = Number(req.params.id);
    const postId  = Number(req.params.postId);
    const userId  = req.session.user.id;
    const content = (req.body.content || '').trim();

    if (!content) {
      return res.status(400).send('댓글 내용을 입력하세요.');
    }

    // 멤버인지 확인
    const [memberRows] = await pool.query(
      'SELECT id FROM study_members WHERE study_id = ? AND user_id = ?',
      [studyId, userId]
    );
    if (memberRows.length === 0) {
      return res.redirect('/studies/' + studyId);
    }

    await pool.query(
      `INSERT INTO study_comments (study_id, post_id, user_id, content)
       VALUES (?, ?, ?, ?)`,
      [studyId, postId, userId, content]
    );

    return res.redirect(`/studies/${studyId}/board/${postId}`);
  } catch (err) {
    console.error('POST /studies/:id/board/:postId/comments error:', err);
    res.status(500).send('서버 에러');
  }
});
// 🔹 댓글 삭제 (작성자만)
router.post('/:id/board/:postId/comments/:commentId/delete', requireLogin, async (req, res) => {
  try {
    const studyId   = Number(req.params.id);
    const postId    = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    const userId    = req.session.user.id;

    // 댓글 정보 + 작성자 확인
    const [[comment]] = await pool.query(
      'SELECT id, user_id FROM study_comments WHERE id = ? AND study_id = ? AND post_id = ?',
      [commentId, studyId, postId]
    );
    if (!comment) {
      return res.status(404).send('존재하지 않는 댓글입니다.');
    }

    if (comment.user_id !== userId) {
      return res.status(403).send('본인이 작성한 댓글만 삭제할 수 있습니다.');
    }

    await pool.query(
      'DELETE FROM study_comments WHERE id = ?',
      [commentId]
    );

    return res.redirect(`/studies/${studyId}/board/${postId}`);
  } catch (err) {
    console.error('POST /studies/:id/board/:postId/comments/:commentId/delete error:', err);
    res.status(500).send('서버 에러');
  }
});



module.exports = router;
