const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const League = require('../models/league');
const User = require('../models/user');
const List = require('../models/monthlyList');
const verifyToken = require('../middleware/verifyToken');

// require authorization
router.use(verifyToken);

// Get list of all leagues (for testing)
router.get('/', async (req, res, next) => {
  try {
    const leagues = await League.find();
    res.json(leagues);
  } catch (err) {
    res.json({ message: err });
  }
});

// Create a league
router.post('/create', async (req, res, next) => {
  const { leagueName, password } = req.body;
  //members not used here due to auto using commissioner user id as first member

  // Check if league name is taken, when leagueName in model is set to unique:true
  const leagueExist = await League.findOne({ leagueName: req.body.leagueName });
  if (leagueExist) return res.status(400).send('League Name Not Available');

  // find most recent network bracket to use
  let listToUse;
  try {
    listToUse = await List.findOne().sort({ updated: -1 });
  } catch (err) {
    res.json({ message: err.message });
  }

  // give user a default prediction of 0 for all shows in all networks
  // so react doesn't complain about undefined predictions when viewing standings in frontend
  const defaultPredictions = listToUse.networks.map((network, i) => {
    return { shows: network.shows.map(show => 0), network: i };
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      'Creating league failed, please try again1',
      500
    );
    return next(error);
  }

  const createdLeague = new League({
    leagueName,
    password,
    listUsed: listToUse.id,
    // bracketEdits: req.body.bracketEdits,
    members: {
      memberId: req.userData.userId,
      username: user.username,
      predictions: defaultPredictions
    },
    // startDate: req.body.startDate,
    commissioner: { userId: req.userData.userId, username: user.username }
  });

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdLeague.save({ session: sess });
    // user.leagues.push(createdLeague);
    user.leagues.push({ leagueId: createdLeague, leagueName: leagueName });
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      `Creating league failed, please try again`,
      500
    );
    res.json({ message: err.message });
    return next(error);
  }
  res.status(201).json({ league: createdLeague });
});

// Join a league
// 1. determine where/when to add predictions and add that bracketId to user.brackets (maybe a separate patch/post to :lid)
router.patch('/:lid', async (req, res, next) => {
  const { leaguePassword } = req.body;
  const { userId } = req.userData;
  const leagueId = req.params.lid;

  let league;
  try {
    league = await League.findById(leagueId);
  } catch (err) {
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  if (!league) {
    const error = new HttpError('Could not find league for provided id', 404);
    return next(error);
  }

  if (leaguePassword !== league.password) {
    const error = new HttpError(
      'You do not have access to join this league, password',
      401
    );
    return next(error);
  }

  if (league.members.length > 9) {
    const error = new HttpError(
      'Could not add new member. League is full.',
      401
    );
    return next(error);
  }

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Joining league failed, please try again1',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  if (league.members.find(({ memberId }) => memberId === user.id)) {
    const error = new HttpError('User has already joined this league', 404);
    return next(error);
  }

  // give user a default prediction of 0 for all shows in all networks
  // so react doesn't complain about undefined predictions when viewing standings in frontend
  const defaultPredictions = league.members[0].predictions.map((network, i) => {
    return { shows: network.shows.map(show => 0), network: i };
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    league.members.push({
      memberId: userId,
      username: user.username,
      predictions: defaultPredictions
    });
    await league.save({ session: sess });
    user.leagues.push({ leagueId: leagueId, leagueName: league.leagueName });
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    res.json({ message: err.message });
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  res.status(200).json({ league: league.toObject({ getters: true }) });
});

// Get a league
router.get('/:lid', async (req, res, next) => {
  const leagueId = req.params.lid;
  try {
    const league = await League.findById(leagueId);
    res.json(league);
  } catch (err) {
    res.json({ message: err });
  }
});

// router.get('/', async (req, res, next) => {
//   try {
//     const leagues = await League.find();
//     res.json(leagues);
//   } catch (err) {
//     res.json({ message: err });
//   }
// });

// Make predictions
router.patch('/:lid/predictions', async (req, res, next) => {
  const { userId, predictions, currentNetwork } = req.body;
  const leagueId = req.params.lid;

  let league;
  try {
    league = await League.findById(leagueId);
  } catch (err) {
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  if (!league) {
    const error = new HttpError('Could not find league for provided id', 404);
    return next(error);
  }

  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      'Joining league failed, please try again1',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  let leagueMember = league.members.find(
    ({ memberId }) => memberId === user.id
  );

  if (!leagueMember) {
    const error = new HttpError('Not a member of this league', 404);
    return next(error);
  }

  // leagueMember.predictions = predictions;

  try {
    //check if network is in this members prediction array
    const checker = leagueMember.predictions.find(
      ({ network }) => network === currentNetwork
    );
    if (!checker) {
      // add individual network predictions if no network found
      leagueMember.predictions = [...leagueMember.predictions, predictions];
      // sort networks if predictions were made out of order by user
      leagueMember.predictions.sort((a, b) => {
        return a.network - b.network;
      });
    } else {
      //update network predictions if they exist already, by replacing the old ones with an updated copy
      let predictionsCopy = [...leagueMember.predictions];
      let filteredDataSource = predictionsCopy.filter(item => {
        if (item.network === currentNetwork) {
          item.shows = predictions.shows;
        }
        return item;
      });
      leagueMember.predictions = filteredDataSource;
    }

    await league.save();
  } catch (err) {
    const error = new HttpError('Something went wrong', 500);
    res.json({ message: err.message });
    return next(error);
  }

  res.status(200).json({ league: league.toObject({ getters: true }) });
});

module.exports = router;
