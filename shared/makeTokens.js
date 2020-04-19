const { sign } = require('jsonwebtoken');

const createAccessToken = (user) => {
  return sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
  });
};

// changing token version in database is useful for password changes and revoking access
// user won't be able to create refresh token after access token expires.
const createRefreshToken = (user) => {
  return sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
