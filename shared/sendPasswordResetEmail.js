const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = (user, resetToken) => {
  const msg = {
    to: `${user.email}`,
    from: { email: 'support@predicttv.com', name: 'PredictTV Support' },
    templateId: 'd-7e09c8ca63a747d2a3a7038f64b85abd',
    dynamic_template_data: {
      username: user.username,
      resetToken: resetToken,
    },
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
