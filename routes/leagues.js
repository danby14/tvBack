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
  const { leagueName, password, startDate } = req.body;
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
    return next(res.status(500).send('Creating league failed, please try again1'));
    // const error = new HttpError('Creating league failed, please try again1', 500);
    // return next(error);
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
    startDate: startDate,
    commissioner: req.userData.userId
    // commissioner: { userId: req.userData.userId, userName: user.username }
  });

  // make sure user entered a date in the future
  if (new Date(startDate).getTime() <= new Date().getTime()) {
    return next(
      res
        .status(403)
        .send('Please pick a start date that is in the near future. Past dates are not allowed')
    );
  }

  if (!user) {
    return next(res.status(404).send('Could not find user for provided id'));
    // const error = new HttpError('Could not find user for provided id', 404);
    // return next(error);
  }

  if (user.leagues.length >= 2) {
    return next(
      res
        .status(403)
        .send(
          'Sorry, the current number of max leagues you can be in is 2. This number will increase each fall before new shows premiere'
        )
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdLeague.save({ session: sess });
    user.leagues.push(createdLeague);
    // user.leagues.push({ leagueId: createdLeague, leagueName: leagueName });
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(`Creating league failed, please try again`, 500);
    res.json({ message: err.message });
    return next(error);
  }
  res.status(201).json({ league: createdLeague });
});

// Join a league
router.patch('/:lid', async (req, res, next) => {
  const { leaguePassword } = req.body;
  const { userId } = req.userData;
  const leagueId = req.params.lid;

  let league;
  try {
    //league has to be the exact length of characters as all other leagues to not catch here
    league = await League.findById(leagueId);
  } catch (err) {
    return next(res.status(500).send('Request failed, possibly due to an inalid id length'));
    // res.json({ message: err });
    // const error = new HttpError('Something went wrong / Invalid League ID Length', 500);
    // return next(error);
  }

  if (!league) {
    return next(res.status(404).send('Could not find league for provided id'));
    // const error = new HttpError('Could not find league for provided id', 404);
    // return next(error);
  }

  if (leaguePassword !== league.password) {
    return next(res.status(401).send('Wrong password'));
    // const error = new HttpError('You do not have access to join this league, password', 401);
    // return next(error);
  }

  if (league.members.length > 9) {
    return next(res.status(401).send('Could not add new member. League is full.'));
    // const error = new HttpError('Could not add new member. League is full.', 401);
    // return next(error);
  }

  let user;

  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(res.status(500).send('Joining league failed, please try again.'));
    // const error = new HttpError('Joining league failed, please try again1', 500);
    // return next(error);
  }

  if (!user) {
    return next(res.status(404).send('Could not find user for provided id.'));
    // const error = new HttpError('Could not find user for provided id', 404);
    // return next(error);
  }

  if (user.leagues.length >= 2) {
    return next(
      res
        .status(403)
        .send(
          'Sorry, the current number of max leagues you can be in is 2. This number will increase each fall before new shows premiere'
        )
    );
  }

  if (league.members.find(({ memberId }) => memberId[0].toString() === user.id)) {
    return next(res.status(404).send('User has already joined this league.'));
    // const error = new HttpError('User has already joined this league.', 404);
    // return next(error);
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
      // username: user.username,
      predictions: defaultPredictions
    });
    await league.save({ session: sess });
    user.leagues.push(leagueId);
    // user.leagues.push({ leagueId: leagueId, leagueName: league.leagueName });
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    res.json({ message: err.message });
    return next(res.status(500).send('Something went wrong2.'));
    // const error = new HttpError('Something went wrong2', 500);
    // return next(error);
  }

  res.status(200).json({ league: league.toObject({ getters: true }) });
});

// Get a league
router.get('/:lid', async (req, res, next) => {
  const leagueId = req.params.lid;
  try {
    const league = await League.findById(leagueId).populate('members.memberId', 'username');
    res.json(league);
  } catch (err) {
    res.json({ message: err });
  }
});

// Make predictions
router.patch('/:lid/predictions', async (req, res, next) => {
  const { userId, predictions, currentNetwork } = req.body;
  const leagueId = req.params.lid;

  let league;
  try {
    league = await League.findById(leagueId).populate('members.memberId');
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
    const error = new HttpError('Joining league failed, please try again1', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  let leagueMember = league.members.find(({ memberId }) => memberId[0].id === user.id);

  if (!leagueMember) {
    const error = new HttpError('Not a member of this league', 404);
    return next(error);
  }

  // leagueMember.predictions = predictions;

  try {
    //check if network is in this members prediction array
    const checker = leagueMember.predictions.find(({ network }) => network === currentNetwork);
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

// delete a league and leagueId from each user
router.delete('/removeLeague/:lid', async (req, res, next) => {
  // const lgId = req.params.lid;
  const { leagueName, leagueId, leaguePassword, lidChecker } = req.body;

  let league;

  try {
    league = await League.findById(leagueId)
      .populate('commissioner', 'username')
      .populate('members.memberId');
  } catch (err) {
    return next(res.status(500).send('Could not find league / Invalid id length'));
    // const error = new HttpError('Could not find league', 500);
    // return next(error);
  }

  if (!league) {
    return next(res.status(404).send('Could not find league for this id.'));
    // const error = new HttpError('Could not find league for this id', 404);
    // return next(error);
  }

  if (league.leagueName !== leagueName) {
    return next(
      res.status(401).send('League name must match exactly. Case sensitive and all spaces included')
    );
    // const error = new HttpError('Wrong League Name', 401);
    // return next(error);
  }

  const commissionerId = league.commissioner[0].id;

  if (commissionerId !== req.userData.userId) {
    return next(res.status(401).send('Must be league commissioner to delete a league.'));
    // const error = new HttpError('Must be league commissioner to delete a league', 401);
    // return next(error);
  }

  if (league.password !== leaguePassword) {
    return next(res.status(401).send('Wrong Password'));
    // const error = new HttpError('Wrong Password', 401);
    // return next(error);
  }

  if (lidChecker !== leagueId) {
    return next(res.status(401).send(`Can only delete ${lidChecker} from this page.`));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await league.remove({ session: sess });
    let members = league.members.map(member => {
      return member.memberId[0];
    });
    for (const member of members) {
      member.leagues.pull(leagueId);
      await member.save({ session: sess });
    }
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(res.status(500).send({ message: err }));
    // const error = new HttpError('Could not delete league', 500);
    // return next(error);
  }

  res.status(200).json({ message: 'League Deleted' });
});

// Delete an individual user from a league
router.delete('/removeUser/:lid', async (req, res, next) => {
  const { leagueName, leagueId, leaguePassword, userToDel } = req.body;

  let league;

  try {
    league = await League.findById(leagueId)
      .populate('commissioner', 'username')
      .populate('members.memberId');
  } catch (err) {
    return next(res.status(500).send('Could not find league / Invalid id length'));
    // const error = new HttpError('Could not find league', 500);
    // return next(error);
  }

  if (!league) {
    return next(res.status(404).send('Could not find league for this id.'));
    // const error = new HttpError('Could not find league for this id', 404);
    // return next(error);
  }

  // console.log('league', league);

  if (league.leagueName !== leagueName) {
    return next(
      res.status(401).send('League name must match exactly. Case sensitive and all spaces included')
    );
    // const error = new HttpError('Wrong League Name', 401);
    // return next(error);
  }

  const commissionerId = league.commissioner[0].id;

  if (commissionerId !== req.userData.userId) {
    return next(res.status(403).send('Must be league commissioner to remove a user.'));
    // const error = new HttpError('Must be league commissioner to delete a league', 401);
    // return next(error);
  }

  if (league.password !== leaguePassword) {
    return next(res.status(401).send('Wrong Password'));
    // const error = new HttpError('Wrong Password', 401);
    // return next(error);
  }

  const memberName = league.members.find(({ memberId }) => memberId[0].username === userToDel);

  if (!memberName) {
    return next(res.status(404).send('User not found'));
  }

  const foundUserId = memberName.memberId[0].id;

  if (foundUserId === commissionerId) {
    return next(
      res
        .status(405)
        .send(
          'Can not remove commissioner from league. Must transfer commissioner duties to another league user or Delete the entire league'
        )
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    const foundMemberId = memberName._id;
    league.members.pull(foundMemberId); // remove member from league
    await league.save({ session: sess });
    memberName.memberId[0].leagues.pull(leagueId); // remove league from user
    await memberName.memberId[0].save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    return next(res.status(500).send({ message: err }));
    // const error = new HttpError('Could not delete league', 500);
    // return next(error);
  }

  res.status(200).json({ message: `${userToDel} removed from league` });
});

// Join a league
router.patch('/:lid/upDate', async (req, res, next) => {
  const { startDate } = req.body;
  const { userId } = req.userData;
  const leagueId = req.params.lid;

  console.log(new Date(startDate).toISOString());

  let league;
  try {
    //league has to be the exact length of characters as all other leagues to not catch here
    league = await League.findById(leagueId);
  } catch (err) {
    return next(res.status(500).send('Request failed, possibly due to an inalid id length2'));
  }

  if (!league) {
    return next(res.status(404).send('Could not find league for provided id2'));
  }

  if (userId !== league.commissioner[0].toString()) {
    return next(res.status(403).send('Must be league commissioner to make this change.'));
  }
  console.log(typeof league._id);
  console.log(typeof leagueId);
  // updateOne({"_id" : ObjectId(leagueId)}, {$set: { "my_test_key4" : 4}})
  try {
    // await league.updateOne({ _id: ObjectId(leagueId) }, { $set: { startDate: startDate } });
    // console.log('lg strtdt', await league.startDate.updateOne(startDate));
    league.startDate = startDate;
    await league.save();
    console.log('it worked');
  } catch (err) {
    res.json({ message: err.message });
    return next(res.status(500).send('Something went wrong2.'));
  }

  res.status(200).json({ 'Start date changed to': league.startDate });
});

module.exports = router;
