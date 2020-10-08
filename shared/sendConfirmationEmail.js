const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendConfirmationEmail = (user, emailToken) => {
  const msg = {
    to: `${user.email}`,
    from: { email: 'support@predicttv.com', name: 'PredictTV Support' },
    templateId: 'd-52e8be4bc13c4e5cb6dfcb33b4dac55e',
    dynamic_template_data: {
      emailToken: emailToken,
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

exports.sendConfirmationEmail = sendConfirmationEmail;
