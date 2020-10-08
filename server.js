//refreshToken branch
const express = require('express');
const app = express();
require('dotenv/config');
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');

const port = process.env.PORT || 5001;

//Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(helmet());
const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: `${CORS_ORIGIN}`,
    credentials: true,
  })
);

app.use(morgan('common'));

//Import Routes
const authRoute = require('./routes/auth');
const refreshTokenRoute = require('./routes/refresh_token');
const leaguesRoute = require('./routes/leagues');
const networksRoute = require('./routes/networks');
const monthlyListsRoute = require('./routes/monthlyLists');
const emailRoute = require('./routes/email');
const adminRoute = require('./routes/admin');

//Route Middlewares
app.use('/user', authRoute);
app.use('/refresh_token', cookieParser());
app.use('/refresh_token', refreshTokenRoute);
app.use('/leagues', leaguesRoute);
app.use('/networks', networksRoute);
app.use('/monthlyLists', monthlyListsRoute);
app.use('/email', emailRoute);
app.use('/admin', adminRoute);
app.use(function (err, req, res, next) {
  res.status(500).send(err);
});

//ROUTES
app.get('/', (req, res) => {
  res.send('©PredictTV');
});

//Connect to MongoDB Atlas Using Mongoose and Hide Login Credentials using DOTENV
mongoose.connect(
  process.env.DB_CONNECTION,
  { useUnifiedTopology: true, useNewUrlParser: true },
  () => console.log('connected to mongo atlas')
);

//Where we listen for server
app.listen(port, () => console.log(`server listening on port ${port}!`));
