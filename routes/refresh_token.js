const router = require('express').Router();
const { verify } = require('jsonwebtoken');

const { createAccessToken, createRefreshToken } = require('../shared/makeTokens');
const { sendRefreshToken } = require('../shared/sendRefreshToken');
const User = require('../models/user');

router.post('/', async (req, res) => {
  const token = req.cookies.tvrt;

  if (!token) {
    return res.send({ ok: false, accessToken: '' });
  }

  let payload = null;
  try {
    payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    console.log(err);
    return res.send({ ok: false, accessToken: '' });
  }

  //token is valid and we can send back an access token
  // User.findById(userId)
  const user = await User.findById({ _id: payload.userId });

  //Check if user is already in the database
  if (!user) {
    return res.send({ ok: false, accessToken: '' });
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return res.send({ ok: false, accessToken: '' });
  }

  sendRefreshToken(res, createRefreshToken(user));

  return res.send({
    ok: true,
    userId: user._id,
    username: user.username,
    accessToken: createAccessToken(user),
  });
});

module.exports = router;
