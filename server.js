//refreshToken branch
const express = require('express');
const app = express();
require('dotenv/config');
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
const cors = require('cors');
const port = 5000;

//Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//Import Routes
const authRoute = require('./routes/auth');
const leaguesRoute = require('./routes/leagues');
const networksRoute = require('./routes/networks');
const monthlyListsRoute = require('./routes/monthlyLists');

//Route Middlewares
app.use('/user', authRoute);
app.use('/leagues', leaguesRoute);
app.use('/networks', networksRoute);
app.use('/monthlyLists', monthlyListsRoute);

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
