const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendConfirmationEmail = (user, emailToken) => {
  const url = `http://localhost:3000/auth/verify/${emailToken}`;

  const msg = {
    to: `${user.email}`,
    from: 'dan.buenger@gmail.com',
    subject: 'Confirmation Email',
    html: `Confirmation Email <a href=${url}>${url}</a>`,
  };

  (async () => {
    try {
      await sgMail.send(msg);
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.error(error.response.body);
      }
    }
  })();
};

exports.sendConfirmationEmail = sendConfirmationEmail;
