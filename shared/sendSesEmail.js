let nodemailer = require('nodemailer');
let AWS = require('aws-sdk');
let hbs = require('nodemailer-express-handlebars')

const sendSesEmail = async (req,res) => {
  const { jwtId } = req.body;
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

  transporter.use('compile', hbs({
    viewEngine: {
      extName: '.hbs',
      partialsDir:"./shared/templates",
      layoutDir:"./shared/templates",
      defaultLayout:""
  },
    viewPath:'./shared/templates',
    extName: '.hbs'
  }))

  // send some mail
  await transporter.sendMail(
    {
      from: '"PredictTV Support" <support@predicttv.com>',
      to: 'dan.buenger@gmail.com',
      subject: 'Welcome to PredictTV',
      template: 'confirmation',
      context: {
        emailToken: jwtId
      }
    },
    (err, info) => {
      if(err){ console.log(err)
      res.status(err.statusCode).json({
        msg: err.message
      })
      } else {
        console.log(info.envelope);
        console.log(info.messageId);
        res.json({
          msg: 'message sent'
        })
      }
    }
  );
};

exports.sendSesEmail = sendSesEmail;
