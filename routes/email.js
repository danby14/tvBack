const router = require('express').Router();
const sgMail = require('@sendgrid/mail');
const { verify } = require('jsonwebtoken');

const User = require('../models/user');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.send({ msg: 'invalid request' });
  }

  // validate token and get email from verify
  let payload = null;
  try {
    payload = verify(token, process.env.CONFIRMATION_EMAIL_TOKEN_SECRET);
  } catch (err) {
    console.log(err);
    return res.send({ msg: 'make sure link is exactly copied over or try confirming email again' });
  }

  // token is valid and we can send back an access token
  const user = await User.findOne({ email: payload.email });

  // Make sure email from token links to a real User
  if (!user) return res.status(400).send('User does not exist');

  if (user.tempToken !== token) return res.status(400).send('token already used');

  // Make user confirmed to be true
  try {
    user.confirmed = true;
    user.tempToken = 'used';
    await user.save();
  } catch (err) {
    console.log(err);
  }

  return res.send({
    msg: 'Email confirmed. You may now login.',
  });
});

// this was a test, real email verification is in auth register
// router.post('/', (req, res) => {
//   const msg = {
//     to: 'dan.buenger@gmail.com',
//     from: 'dan.buenger@gmail.com',
//     subject: 'Sending with Twilio SendGrid is Fun',
//     text: 'and not easy to do anywhere, even with Node.js',
//     html: '<strong>and easy to do anywhere, even with Node.js</strong>',
//   };

//   //ES8
//   (async () => {
//     try {
//       await sgMail.send(msg);
//     } catch (error) {
//       console.error(error);

//       if (error.response) {
//         console.error(error.response.body);
//       }
//     }
//   })();
//   res.send({ msg: msg });
// });

module.exports = router;
