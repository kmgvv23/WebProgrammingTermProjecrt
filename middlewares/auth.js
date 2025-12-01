module.exports.requireLogin = (req, res, next) => {
  if (!req.session.user) return res.status(401).send('로그인이 필요합니다.');
  next();
};