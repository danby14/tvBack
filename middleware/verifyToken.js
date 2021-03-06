const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).send('Access Denied');

  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.userData = { userId: verified.userId, role: verified.role };
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};
