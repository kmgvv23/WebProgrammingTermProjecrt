const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const pool = require('../db');

const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  nickname: Joi.string().min(2).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});


// =============================
//   회원가입 
// =============================
router.post('/signup', async (req, res) => {
  //입력값 검사 먼저 
  const { error, value } = signupSchema.validate(req.body);

  if (error) {
    // 수정: 같은 페이지에서 에러 + 회원가입 탭 활성화
    return res.status(400).render('login', {
      errorMessage: '입력 형식을 확인해주세요. (비밀번호 6자리 이상)',
      activeTab: 'register'
    });
  }

  // 공백 제거
  const email = value.email.trim();
  const password = value.password.trim();
  const nickname = value.nickname.trim();

  // 해시 (암호화)
  const hash = await bcrypt.hash(password, 12);

  //pool 은 db 에 구현해둠 
  const conn = await pool.getConnection();

  try {
    await conn.execute(
      'INSERT INTO users (email, password_hash, nickname) VALUES (:email, :hash, :nickname)',
      { email, hash, nickname }
    );

    // 회원가입 성공 → 로그인 탭으로 이동
    return res.redirect('/login');

  } catch (e) {

    // 중복 이메일
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).render('login', {
        errorMessage: '이미 가입된 이메일입니다.',
        activeTab: 'register'
      });
    }

    // 기타 서버 에러
    return res.status(500).render('login', {
      errorMessage: '서버 오류가 발생했습니다.',
      activeTab: 'register'
    });

  } finally {
    conn.release();
  }
});




// =============================
//   로그인 구현 
// =============================
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);

  if (error) {
    //수정: 로그인 탭에서 에러 표시
    return res.status(400).render('login', {
      errorMessage: '이메일/비밀번호 형식을 확인하세요. (비밀번호 6자리 이상)',
      activeTab: 'login'
    });
  }

  const email = value.email.trim();
  const password = value.password.trim();

  try {
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, nickname FROM users WHERE email=:email',
      { email }
    );

    // 이메일 없음
    if (rows.length === 0) {
      return res.status(401).render('login', {
        errorMessage: '이메일 또는 비밀번호가 틀렸습니다.',
        activeTab: 'login'
      });
    }

    const user = rows[0];

    // 비밀번호 불일치
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).render('login', {
        errorMessage: '이메일 또는 비밀번호가 틀렸습니다.',
        activeTab: 'login'
      });
    }

    // 세션에 저장 해주기 (로그인 상태 유지)
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).render('login', {
          errorMessage: '세션 오류가 발생했습니다.',
          activeTab: 'login'
        });
      }

      req.session.user = { 
        id: user.id, 
        email: user.email, 
        nickname: user.nickname 
      };
      //req.session.regenerate() 은 비동기 함수이므로 세션 저장 후 리다이렉트
    req.session.save(() => {
      return res.redirect('/dashboard');
    });
    });

  } catch (e) {
    console.error(e);
    return res.status(500).render('login', {
      errorMessage: '서버 오류가 발생했습니다.',
      activeTab: 'login'
    });
  }
});



// =============================
//   로그아웃
// =============================
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
