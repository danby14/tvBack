const router = require('express').Router();
const User = require('../models/user');
const Dummy = require('../models/dummy');
// const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { registerValidation, loginValidation } = require('../validation');
const {
  createAccessToken,
  createRefreshToken,
  createConfirmationEmailToken,
} = require('../shared/makeTokens');
const { sendRefreshToken } = require('../shared/sendRefreshToken');
const { sendConfirmationEmail } = require('../shared/sendConfirmationEmail');

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
  try {
    await user.save();
  } catch (err) {
    res.status(400).send(err);
  }

  // send email verification link
  try {
    await sendConfirmationEmail(user, emailToken);
  } catch (err) {
    console.log(err);
  }

  // Create and assign jwt access token
  // let accessToken = createAccessToken(user);

  // Create and assign jwt refresh token
  // let refreshToken = createRefreshToken(user);

  // sendRefreshToken(res, refreshToken);

  res.status(201).json({
    user: user.id,
    email: user.email,
    username: user.username,
    msg: 'Please check your email to confirm your email address.',
  });
  // res.status(201).json({
  //   user: user.id,
  //   email: user.email,
  //   username: user.username,
  //   token: accessToken,
  //   leagues: user.leagues,
  // });
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
router.get('/logout', async (req, res) => {
  res.clearCookie('tvrt', { path: '/refresh_token' });
  res.status(201).json('logged out');
});

//Get back all Users
router.get('/register', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.json({ message: err });
  }
});

// Get list of all leagues per user (for testing)
router.get('/:uid', async (req, res, next) => {
  const userId = req.params.uid;
  try {
    const user = await User.findById(userId).select('-password').populate('leagues');
    res.json(user);
  } catch (err) {
    res.json({ message: err });
  }
});

// Get list of all leagues per user (for testing)
router.get('/:uid/leagues', async (req, res, next) => {
  const userId = req.params.uid;
  try {
    const user = await User.findById(userId).populate('leagues');
    res.json(user.leagues);
  } catch (err) {
    res.json({ message: err });
  }
});

// Delete a league from a user (for testing)
router.delete('/:uid/leagues/remove', async (req, res, next) => {
  const userId = req.params.uid;
  const { lg } = req.body;

  let user;
  try {
    user = await User.findById(userId);
    // res.status(200).json({ userInputLg: lg, lgFrmUserDb: user.leagues });
    // res.json(user.leagues);
  } catch (err) {
    res.json({ message: err });
  }

  try {
    // console.log('user', user);
    user.leagues.pull(lg);
    user.save();
    res.status(200).json({ userInputLg: lg, lgFrmUserDb: user.leagues });
  } catch (err) {
    res.json({ message: err });
  }
});

// Make a dummy (for testing)
router.post('/tester', async (req, res, next) => {
  //Create a New Dummy
  const dummy = new Dummy({
    name: req.body.name,
    userId: req.body.userId,
    leagues: req.body.leagues,
  });
  try {
    await dummy.save();
  } catch (err) {
    res.status(400).send(err);
  }

  res.status(201).json({
    dummy: dummy.id,
    name: dummy.name,
    user: dummy.userId,
    leagues: dummy.leagues,
  });
});

// Get list of dummys with league info populated (for testing)
router.get('/tester/:did', async (req, res, next) => {
  const dummyId = req.params.did;
  try {
    const dummy = await Dummy.findById(dummyId);
    // const dummy = await Dummy.findById(dummyId).populate('leagues');
    res.json(dummy);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
