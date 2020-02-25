const router = require('express').Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { registerValidation, loginValidation } = require('../validation');

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

  //Create a New User
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: hashedPassword,
    birthdate: req.body.birthdate,
    gender: req.body.gender,
    optIn: req.body.optIn
  });
  try {
    // const savedUser = await user.save();
    await user.save();
    // res.send({ user: user._id });
  } catch (err) {
    res.status(400).send(err);
  }

  //Create and assign a jwt
  let token;
  try {
    token = jwt.sign({ user: user.id, username: user.username }, process.env.TOKEN_SECRET, {
      expiresIn: '1h'
    });
  } catch (err) {
    console.log(err);
  }

  res.status(201).json({
    user: user.id,
    email: user.email,
    username: user.username,
    token: token,
    leagues: user.leagues
  });
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

  //Create and assign a jwt
  let token;
  try {
    token = jwt.sign({ user: user.id, username: user.username }, process.env.TOKEN_SECRET, {
      expiresIn: '1h'
    });
  } catch (err) {
    console.log(err);
  }

  // res.header('auth-token', token).send({ token });
  // console.log(res);
  res.status(201).json({
    user: user.id,
    email: user.email,
    username: user.username,
    token: token,
    leagues: user.leagues
  });
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
    const user = await User.findById(userId).select('-password');
    res.json(user);
  } catch (err) {
    res.json({ message: err });
  }
});

// Get list of all leagues per user (for testing)
router.get('/:uid/leagues', async (req, res, next) => {
  const userId = req.params.uid;
  try {
    const user = await User.findById(userId);
    res.json(user.leagues);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
