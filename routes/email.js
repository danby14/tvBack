const router = require('express').Router();
const { verify } = require('jsonwebtoken');

const User = require('../models/user');

router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).send('Invalid request');
  }

  // validate token and get email from verify
  let payload = null;
  try {
    payload = verify(token, process.env.CONFIRMATION_EMAIL_TOKEN_SECRET);
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send('make sure link is exactly copied over or try confirming email again');
  }

  // token is valid and use email stored in token to find a user in database
  const user = await User.findOne({ email: payload.email });

  // make sure email from token links to an existing user
  if (!user) return res.status(400).send('User does not exist');

  // check if the user has already completed this proccess, and end it if they have
  if (user.tempToken !== token)
    return res
      .status(403)
      .send('expired request, please use most recent email sent or request a new one.');

  // Make user confirmed to be true
  try {
    user.confirmed = true;
    user.tempToken = 'used';
    await user.save();
  } catch (err) {
    console.log(err);
  }

  return res.send({
    msg: 'Email confirmed. You may now sign in.',
  });
});

module.exports = router;
