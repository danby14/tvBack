const router = require('express').Router();
const { verify } = require('jsonwebtoken');
const nodeMailer = require('nodemailer');

const User = require('../models/user');

// after user clicks on link in verfication email sent to them
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

// contact form - nodemailer with zoho
router.post('/contact', async (req, res, next) => {
  const { reason, email, username, subject, message } = req.body;
  const zohoUsername = process.env.ZOHO_USERNAME;
  const zohoPassword = process.env.ZOHO_PASSWORD;

  let transporter = nodeMailer.createTransport({
    host: 'smtp.zoho.com',
    secure: true,
    port: 465,
    auth: {
      user: zohoUsername,
      pass: zohoPassword,
    },
  });

  const mailOptions = {
    from: 'noreply@predicttv.com', // sender address
    to: 'support@predicttv.com',
    replyTo: `${email}`,
    subject: `Contact form - ${reason}`, // Subject line
    html: `<h3>Email: </h3><p>${email}</p>
    <h3>Username: </h3><p>${username}</p>
    <h3>Subject: </h3><p>${subject}</p>
    <h3>Message: </h3><p>${message}</p>`,
  };

  await transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err.response);
      return next({ msg: 'Something went wrong. Please try again later.' });
    } else {
      return res.send({
        msg: 'Message sent. Thank you.',
      });
    }
  });
});

module.exports = router;
