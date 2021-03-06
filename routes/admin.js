const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const User = require('../models/user');

const verifyToken = require('../middleware/verifyToken');
const hasRole = require('../middleware/hasRole');

//Send a message through contact us (not currently using this, switched to zoho via nodemailer in email route)
router.post('/contact', async (req, res) => {
  const { reason, name, email, subject, message } = req.body;
  const newMessage = new Message({
    reason: reason,
    name: name,
    email: email,
    subject: subject,
    message: message,
  });

  try {
    await newMessage.save();
    res.json({ msg: 'Your message has been sent. Thank you.' });
  } catch (err) {
    res.status(400).send(err);
  }
});

// require token and admin access
router.use(verifyToken);
router.use(hasRole('admin'));

//Get back all messages from contact us form
router.get('/messages', async (req, res) => {
  const { userId, role } = req.userData;
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (err) {
    res.json({ message: err });
  }
});

//Get back all Users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
