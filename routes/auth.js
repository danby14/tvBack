const router = require('express').Router();
const User = require('../models/user');
const { verify } = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { registerValidation, loginValidation } = require('../validation');
const {
  createAccessToken,
  createRefreshToken,
  createPasswordResetToken,
  createConfirmationEmailToken,
} = require('../shared/makeTokens');
const { sendRefreshToken } = require('../shared/sendRefreshToken');
const { sendgridConfirmationEmail } = require('../shared/sendgridConfirmationEmail');
const { sesConfirmationEmail } = require('../shared/sesConfirmationEmail');
const { sendPasswordResetEmail } = require('../shared/sendPasswordResetEmail');

const verifyToken = require('../middleware/verifyToken');

router.post('/register', async (req, res) => {
  //Lets Validate the Data Before We Create a New User
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //Check if user is already in the database
  const userExist = await User.findOne({ username: req.body.username });
  if (userExist) return res.status(400).send('Username not available');

  //Check if email is already in the database
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist)
    return res.status(400).send('This email already has an account associated with it');

  //Hash Passwords
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  let emailToken = createConfirmationEmailToken(req.body.email);

  //Create a New User
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    birthdate: req.body.birthdate,
    gender: req.body.gender,
    optIn: req.body.optIn,
    tempToken: emailToken,
  });

  // send email verification link with sendgrid (100/day max)
  // try {
  //   await sendgridConfirmationEmail(user, emailToken);
  // } catch (err) {
  //   console.log(err);
  // }

  // send email verification link with SES(Amazon) 1200/day
  try {
    // sends email and saves user to db
    await sesConfirmationEmail(req, res, user, emailToken);
  } catch (err) {
    res.status(400).send(err);
  }
});

//Login
router.post('/login', async (req, res) => {
  //Lets Validate the Data Before We Login
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //Check if user is already in the database
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Incorrect username or password');

  //Password check
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send('Invalid username or password');

  // check if email is confirmed
  if (!user.confirmed) return res.status(400).send('Email not verified!');

  //Create and assign a jwt as access token
  let accessToken = createAccessToken(user);

  //Create and assign a jwt as refresh token
  let refreshToken = createRefreshToken(user);

  sendRefreshToken(res, refreshToken);

  res.status(201).json({
    user: user.id,
    email: user.email,
    username: user.username,
    token: accessToken,
    leagues: user.leagues,
  });
});

//Logout
router.post('/logout', async (req, res) => {
  res.clearCookie('tvrt', { path: '/refresh_token' });
  res.status(201).json('logged out');
});

// forgot password, send reset email
router.post('/resetPassword', async (req, res) => {
  // get user email
  const { email } = req.body;

  // add some more validation here so request does not get easily abused. repeatedly.

  //Check if user is in the database
  const user = await User.findOne({ email: email });
  if (!user) return res.status(400).send('Invalid request');

  // check if email is confirmed
  if (!user.confirmed)
    return res.status(400).send('Please verify email associated with account before trying again');

  // make token
  const resetToken = createPasswordResetToken(user);
  // increase token version to invalidate old tokens
  try {
    user.tokenVersion = user.tokenVersion += 1;
    user.tempToken = resetToken;
    await user.save();
  } catch (err) {
    res.status(400).send(err);
  }

  // for testing without wasting emails: comment out this sendPasswordResetEmail
  // console.log(`http://localhost:3000/auth/change/${resetToken}`);

  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (err) {
    res.status(400).send(err);
  }

  res.status(201).json({
    msg: 'An email with instructions on how to reset your password should arrive shortly.',
  });
});

// use token from email link to create new password.
router.post('/changePassword', async (req, res) => {
  const { token, password } = req.body;

  if (!token) {
    return res.status(400).send('Invalid request');
  }

  if (password.length < 6) return res.status(400).send('Password must be at least 6 characters');

  // validate token and get email from verify
  let payload = null;
  try {
    payload = verify(token, process.env.PASSWORD_RESET_TOKEN_SECRET);
  } catch (err) {
    console.log(err);
    return res
      .status(400)
      .send('make sure link is exactly copied over from email or try to reset again');
  }

  // token is valid and use userId stored in token
  const user = await User.findById(payload.userId);

  // make sure email from token links to an existing user
  if (!user) return res.status(400).send('User does not exist');

  // check if the user has already completed this proccess, and end it if they have
  if (user.tempToken !== token)
    return res
      .status(400)
      .send(
        'Make sure link from password reset email exactly matches link in address bar. If it does match, please try requesting a new link'
      );

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // save new password
  try {
    user.password = hashedPassword;
    user.tempToken = 'used';
    await user.save();
  } catch (err) {
    console.log(err);
  }

  res.status(200).send({ msg: 'Password successfully updated' });
});

// Resend verify email link to user
router.post('/resendConfirmation', async (req, res, next) => {
  const { email } = req.body;
  //Check if user is in the database
  const user = await User.findOne({ email: email });
  if (!user) return res.status(401).send('Invalid request');

  // check if email is already confirmed
  if (user.confirmed) return res.status(405).send('Email has already been confirmed');

  // make token
  let emailToken = createConfirmationEmailToken(email);

  // send email w/sendgrid
  try {
    await sendgridConfirmationEmail(user, emailToken);
  } catch (err) {
    console.log(err);
  }

  // add token to user
  try {
    user.tempToken = emailToken;
    await user.save();
  } catch (err) {
    res.status(400).send(err);
  }

  // for testing without sending an email.
  // console.log(`http://localhost:3000/auth/verify/${emailToken}`);

  res.status(200).json({
    msg:
      'Email sent. Please check your email and follow the link provided before attempting to sign in.',
  });
});

// require token and admin access
router.use(verifyToken);

// Get a user by id
router.get('/:uid', async (req, res, next) => {
  const userId = req.params.uid;
  try {
    const user = await User.findById(userId).select('-password').populate('leagues');
    res.json(user);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
