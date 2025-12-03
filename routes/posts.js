const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireLogin } = require('../middlewares/auth');

router.get('/club/:clubId', requireLogin, async (req, res) => {
  const clubId = req.params.clubId;
  const [posts] = await pool.execute(
    `SELECT p.*, u.nickname 
     FROM posts p JOIN users u ON u.id=p.user_id
     WHERE p.club_id=:clubId ORDER BY p.created_at DESC`,
    { clubId }
  );
  res.render('posts', { posts, clubId, me: req.session.user });
});

router.post('/club/:clubId', requireLogin, async (req, res) => {
  const clubId = req.params.clubId;
  const { title, body } = req.body;
  await pool.execute(
    'INSERT INTO posts (club_id, user_id, title, body) VALUES (:c, :u, :t, :b)',
    { c: clubId, u: req.session.user.id, t: title, b: body }
  );
  res.redirect(`/posts/club/${clubId}`);
});

module.exports = router;
