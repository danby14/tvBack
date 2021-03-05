# PredictTV Server

Backend for the PredictTV frontend which can be found at https://github.com/danby14/tvFront.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What you need to have installed before trying to run.

```
node

```

Accounts and information you need to set up.

```
mongodb atlas: username and password
sendgrid account: need api key
zoho mail: username and password
amazon ses: access key, secret key, region

```

**Now update your .env file to use your information and fill in all other remianing values.**

### Installing

```
npm install
```

## Built With

- [node](https://nodejs.org/en/) - JavaScript runtime built on Chrome's V8 JavaScript engine
- [express](https://github.com/expressjs/express) - Fast, unopinionated, minimalist web framework for node
- [mongoose](https://mongoosejs.com/) - Elegant mongodb object modeling for node.js
- [nodemailer](https://nodemailer.com/about/) - Email sending in node
- [sendgrid](https://sendgrid.com/) - Reliable email delivery at scale
- [aws-sdk](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-an-email-using-sdk.html) - To send an email using the Amazon SES API
- [bcrypt](https://www.npmjs.com/package/bcryptjs) - To encode passwords with a secret key before sending them to the database
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - Encode, decode, and validate JWTs to verify users and allow/deny what they have access to
- [dotenv](https://www.npmjs.com/package/dotenv) - Make .env file with your private environment variables and don't share this with anyone, make sure it added to your .gitignore
- [morgan](https://www.npmjs.com/package/morgan) - HTTP request logger middleware for node.js to keep track of all server activity in the console
- [helmet](https://www.npmjs.com/package/helmet) - Helps secure your Express apps by setting various HTTP headers.
