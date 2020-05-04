const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = (user, resetToken) => {
  const url = `http://localhost:3000/auth/change/${resetToken}`;

  const msg = {
    to: `${user.email}`,
    from: 'dan.buenger@gmail.com',
    subject: 'Reset your password',
    html: `Link to reset your password:
    <a href=${url}>${url}</a>
    
    Please click the link or copy and paste the entire address into a web browser.

    If you did not request this password reset, please disregard this email.`,
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

exports.sendPasswordResetEmail = sendPasswordResetEmail;
