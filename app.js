const express = require('express');
const path = require('path');
require('dotenv').config(); // .env 파일 읽어서 process.env 환경변수 주입

const app = express();
const PORT = process.env.PORT || 3000;

// 채팅 구현을 위함
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// --- 세션 & MySQL 설정 ---
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'study_user',
  password: process.env.DB_PASS || 'study_pass',
  database: process.env.DB_NAME || 'studydb',
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 7 * 24 * 60 * 60 * 1000
});

// --- 기본 미들웨어 ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- 세션 미들웨어 ---
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// --- 모든 EJS에서 user 접근 가능하게 ---
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null;
  next();
});

// --- EJS 설정 ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- 정적 파일 설정 ---
app.use(express.static(path.join(__dirname, 'public')));

// --- 로그인 체크 미들웨어 ---
function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.redirect('/login');
  }
  next();
}

// --- DB & 라우터 등록 ---
const pool = require('./db');
const studiesRouter = require('./routes/studies');

app.use('/auth', require('./routes/auth'));
app.use('/studies', studiesRouter);   //  스터디 라우터만 사용

// --- 페이지 라우트 ---
app.get('/', (req, res) => {
  // 로그인 되어 있으면 대시보드로 이동
  if (req.session?.user) {
    return res.redirect('/dashboard');
  }

  // 비로그인 → 기존 로그인 페이지 보여주기
  return res.render('login');
});
app.get('/login', (req, res) => {
  res.render('login', { activeTab: 'login' });
});

app.get('/dashboard', requireLogin, async (req, res) => {
  // 로그인 안 되어 있으면 requireLogin에서 /login 으로 redirect
  const userId = req.session.user.id;

  try {
    const [myStudies] = await pool.query(`
      SELECT 
        s.id,
        s.title,
        s.description,
        s.max_members AS maxMembers,
        s.day,
        s.created_at AS createdAt
      FROM studies s
      JOIN study_members m ON s.id = m.study_id
      WHERE m.user_id = ?
      ORDER BY s.created_at DESC
    `, [userId]);

    res.render('dashboard', {
      pageTitle: '내 스터디',
      myStudies
    });
  } catch (err) {
    console.error('/dashboard error:', err);
    res.status(500).send('서버 에러');
  }
});

// 마이페이지: 내가 만든 스터디만 표시
app.get('/mypage', requireLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const [myStudies] = await pool.query(`
      SELECT 
        id,
        title,
        description,
        max_members AS maxMembers,
        day,
        created_at AS createdAt
      FROM studies
      WHERE creator_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    res.render('mypage', {
      pageTitle: '마이페이지',
      myStudies       
    });
  } catch (err) {
    console.error('GET /mypage error:', err);
    res.status(500).send('서버 에러');
  }
});

// ====== 알라딘 기반 책 검색 API ======
app.get('/search-books', async (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) return res.json({ books: [] });

  const ALADIN_KEY = 'ttbjck03691635001';
  const url = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_KEY}&Query=${encodeURIComponent(keyword)}&QueryType=Title&MaxResults=10&Start=1&SearchTarget=Book&Output=JS&Version=20131101`;

  try {
    const fetchFn = global.fetch ? global.fetch : (await import('node-fetch')).default;
    const apiRes = await fetchFn(url);
    const text = await apiRes.text();

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    let json = {};
    if (start !== -1 && end !== -1) {
      const jsonStr = text.slice(start, end + 1);
      json = JSON.parse(jsonStr);
    } else {
      json = JSON.parse(text);
    }

    const items = json.item || json.items || [];
    const rawList = Array.isArray(items) ? items : [items];

    const books = rawList.map(it => ({
      title: it.title || it.itemTitle || '',
      author: it.author || it.authorInfo || '',
      cover: it.cover || it.coverLarge || it.coverSmall || '',
      isbn: it.isbn || ''
    }));

    res.json({ books });
  } catch (err) {
    console.error('search-books error', err);
    res.status(500).json({ books: [] });
  }
});
// Socket.IO: 스터디별 채팅방
io.on('connection', (socket) => {
  // 쿼리로 넘어온 값 (studyId, userId, nickname)
  const { studyId, userId, nickname } = socket.handshake.query;

  if (!studyId || !userId) {
    console.log('잘못된 소켓 연결 (studyId/userId 없음)');
    socket.disconnect();
    return;
  }

  const roomName = `study_${studyId}`;
  socket.join(roomName);

  console.log(`✅ 소켓 접속: userId=${userId}, studyId=${studyId}`);

  // 클라이언트에서 chatMessage 이벤트 받기
  socket.on('chatMessage', async (msg) => {
    const text = (msg || '').toString().trim();
    if (!text) return;

    // DB 저장 
    try {
      await pool.query(
        `INSERT INTO study_chat_messages (study_id, user_id, message)
         VALUES (?, ?, ?)`,
        [studyId, userId, text]
      );
    } catch (err) {
      console.error('chat insert error:', err);
    }

    // 같은 방(studyId)에 브로드캐스트
    io.to(roomName).emit('chatMessage', {
      userId,
      nickname,
      message: text,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 소켓 종료: userId=${userId}, studyId=${studyId}`);
  });
});


// --- 404 핸들러 ---
app.use((req, res) => res.status(404).send('Not Found'));

// --- 서버 실행 ---
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});