//refreshToken branch
const express = require('express');
const app = express();
require('dotenv/config');
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
const cookieParser = require('cookie-parser');
const cors = require('cors');
const port = 5000;

//Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:3000',
    // origin: 'http://192.168.1.126:3000', for testing site from network devices
    credentials: true,
  })
);

//Import Routes
const authRoute = require('./routes/auth');
const refreshTokenRoute = require('./routes/refresh_token');
const leaguesRoute = require('./routes/leagues');
const networksRoute = require('./routes/networks');
const monthlyListsRoute = require('./routes/monthlyLists');
const emailRoute = require('./routes/email');

//Route Middlewares
app.use('/user', authRoute);
app.use('/refresh_token', cookieParser());
app.use('/refresh_token', refreshTokenRoute);
app.use('/leagues', leaguesRoute);
app.use('/networks', networksRoute);
app.use('/monthlyLists', monthlyListsRoute);
app.use('/email', emailRoute);

//ROUTES
app.get('/', (req, res) => {
  res.send('we are on home');
});

//Connect to MongoDB Atlas Using Mongoose and Hide Login Credentials using DOTENV
mongoose.connect(
  process.env.DB_CONNECTION,
  { useUnifiedTopology: true, useNewUrlParser: true },
  () => console.log('connected to mongo atlas')
);

//Where we listen for server
app.listen(port, () => console.log(`server listening on port ${port}!`));
