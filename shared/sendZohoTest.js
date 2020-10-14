let nodemailer = require('nodemailer');
let hbs = require('nodemailer-express-handlebars');

// const sendZohoTest = async (req,res) => {
const sendZohoTest = async (req, res, user, emailToken) => {
  // const {email,jwtId } = req.body;
  const zohoUsername = process.env.ZOHO_USERNAME;
  const zohoPassword = process.env.ZOHO_PASSWORD;

  // create Nodemailer SES transporter
  let transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    secure: true,
    port: 465,
    auth: {
      user: zohoUsername,
      pass: 'zohoPassword',
    },
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

  const mailOptions = {
    from: '"PredictTV Support" <support@predicttv.com>',
    to: `${user.email}`,
    subject: 'Welcome to PredictTV',
    template: 'confirmation',
    context: {
      emailToken: emailToken,
    },
  };

  await transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      res.status(500).json('Something went wrong.');
    } else {
      // save user to database
      user.save();
      console.log('sent email 123', info.envelope);
      res.status(201).json({
        user: user.id,
        email: user.email,
        username: user.username,
        msg:
          'Verification email sent. Please check your email and follow the link provided before attempting to sign in. Thank you.',
      });
    }
  });
};

exports.sendZohoTest = sendZohoTest;
