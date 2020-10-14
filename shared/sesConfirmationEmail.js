let nodemailer = require('nodemailer');
let AWS = require('aws-sdk');
let hbs = require('nodemailer-express-handlebars');

const sesConfirmationEmail = async (req, res, user, emailToken) => {
  // configure AWS SDK
  AWS.config.update({
    accessKeyId: process.env.SES_ACCESS_KEY,
    secretAccessKey: process.env.SES_SECRET_KEY,
    region: 'us-east-2',
  });

  // create Nodemailer SES transporter
  let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: '2010-12-01',
    }),
  });

  transporter.use(
    'compile',
    hbs({
      viewEngine: {
        extName: '.hbs',
        partialsDir: './shared/templates',
        layoutDir: './shared/templates',
        defaultLayout: '',
      },
      viewPath: './shared/templates',
      extName: '.hbs',
    })
  );

  // send some mail
  await transporter.sendMail(
    {
      from: '"PredictTV Support" <support@predicttv.com>',
      to: `${user.email}`,
      subject: 'Welcome to PredictTV',
      template: 'confirmation',
      context: {
        emailToken: emailToken,
      },
    },
    (err, info) => {
      if (err) {
        console.log('failed to send confirmation email', err.statusCode);
        res.status(500).json('Something went wrong.');
      } else {
        // save user to database
        user.save();
        console.log(info.envelope);
        res.status(201).json({
          user: user.id,
          email: user.email,
          username: user.username,
          msg:
            'Verification email sent. Please check your email and follow the link provided before attempting to sign in. Thank you.',
        });
      }
    }
  );
};

exports.sesConfirmationEmail = sesConfirmationEmail;
