const { sign } = require('jsonwebtoken');

const createAccessToken = (user) => {
  return sign({ userId: user.id, username: user.username }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });
};

const createRefreshToken = (user) => {
  return sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
