const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const League = require('../models/league');
const User = require('../models/user');
const List = require('../models/monthlyList');
const verifyToken = require('../middleware/verifyToken');
const hasRole = require('../middleware/hasRole');

// require authorization
router.use(verifyToken);

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
    return {
      shows: network.shows.map(show => {
        if (show.finalResult === 0) {
          return '0';
        }
      }),
      network: i,
    };
  });

  // give default values for ability to toggle predictions
  const defaultToggles = listToUse.networks.map((network, i) => {
    return {
      shows: network.shows.map(show => {
        if (show.finalResult === 0) {
          return true;
        } else {
          return false;
        }
      }),
      network: i,
    };
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
    predictionEdits: defaultToggles,
    members: {
      memberId: req.userData.userId,
      predictions: defaultPredictions,
    },
    startDate: startDate,
    commissioner: req.userData.userId,
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
    return {
      shows: network.shows.map(show => {
        if (show === null) {
          return null;
        } else {
          return '0';
        }
      }),
      network: i,
    };
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    league.members.push({
      memberId: userId,
      predictions: defaultPredictions,
    });
    await league.save({ session: sess });
    user.leagues.push(leagueId);
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
    const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id', 404);
    return next(error);
  }

  let leagueMember = league.members.find(({ memberId }) => memberId[0].id === user.id);
  let otherMembers = league.members.filter(({ memberId }) => memberId[0].id !== user.id);

  if (!leagueMember) {
    const error = new HttpError('Not a member of this league', 404);
    return next(error);
  }

  // number of shows user just submitted predictions
  const newLength = predictions.shows.length;
  // number of shows for first other member that is not the user, unless there is only one user
  let prevLength;
  if (league.members.length > 1) {
    prevLength = otherMembers[0].predictions[currentNetwork].shows.length;
  } else {
    prevLength = newLength;
  }
  // difference in length between submitted predictions and other members predictions
  const difference = newLength - prevLength;

  try {
    if (difference > 0) {
      // new array filled with 0's or null's for other members to concat
      let differences = predictions.shows.slice(-difference);
      const addToOthers = await differences.map(diff => {
        return diff === null ? null : '0';
      });
      // Make other members predictions the same length as users submitted predictions if they are not already
      await otherMembers.map(
        member =>
          (member.predictions[currentNetwork].shows =
            member.predictions[currentNetwork].shows.concat(addToOthers))
      );
    } else {
      // to make mid season shows that were added out of order give other users 0's instead of nulls
      let oldPredictions = leagueMember.predictions[currentNetwork].shows;
      let newPredictions = predictions.shows;
      let mismatches = [];
      oldPredictions.map((show, i) => {
        if (show === null && newPredictions[i] !== null) {
          mismatches.push(i);
        }
      });
      if (mismatches.length > 0) {
        await otherMembers.map(
          member =>
            (member.predictions[currentNetwork].shows = member.predictions[
              currentNetwork
            ].shows.map((show, i) => {
              return mismatches.includes(i) ? '0' : show;
            }))
        );
      }
    }

    //update network predictions if they exist already, by replacing the old ones with an updated copy
    let predictionsCopy = [...leagueMember.predictions];
    let filteredDataSource = predictionsCopy.filter(item => {
      if (item.network === currentNetwork) {
        item.shows = predictions.shows;
      }
      return item;
    });
    leagueMember.predictions = filteredDataSource;

    await league.save();
  } catch (err) {
    res.json({ message: err.message });
    // const error = new HttpError('Something went wrong', 500);
    return next(error);
  }

  res.status(200).json({ league: league.toObject({ getters: true }) });
});

// Get list of all leagues per user
router.get('/:uid/leagues', async (req, res, next) => {
  const userId = req.params.uid;
  try {
    const user = await User.findById(userId).populate('leagues');
    res.json(user.leagues);
  } catch (err) {
    res.json({ message: err });
  }
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

// update prediction toggles and date
router.patch('/:lid/togglePredictions', async (req, res, next) => {
  const { startDate, predictionEdits } = req.body;
  const { userId } = req.userData;
  const leagueId = req.params.lid;

  // return next(res.status(500).send('Made it this far'));

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
  try {
    league.predictionEdits = predictionEdits;
    league.startDate = startDate;
    await league.save();
  } catch (err) {
    res.json({ message: err.message });
    return next(res.status(500).send('Something went wrong2.'));
  }

  res.status(200).json({
    'Predictions available': league.predictionEdits,
    'Make predictions by': league.startDate,
  });
});

// let commissioner change league password
router.patch('/:lid/changePassword', async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { userId } = req.userData;
  const leagueId = req.params.lid;

  let league;

  try {
    league = await League.findById(leagueId).populate('commissioner', 'username');
  } catch (err) {
    return next(res.status(500).send('Could not find league / Invalid id length'));
  }

  if (!league) {
    return next(res.status(404).send('Could not find league for this id.'));
  }

  const commissionerId = league.commissioner[0].id;

  if (commissionerId !== userId) {
    return next(res.status(403).send('Must be league commissioner to change league password.'));
  }

  if (league.password !== oldPassword) {
    return next(res.status(401).send('Wrong old Password'));
  }

  try {
    league.password = newPassword; // update league password
    await league.save();
  } catch (err) {
    console.log(err);
    return next(res.status(500).send({ message: err }));
  }

  res.status(200).json({ message: 'league password updated successfully' });
});

router.use(hasRole('admin'));

// Get list of all leagues (for testing)
router.get('/', async (req, res, next) => {
  try {
    const leagues = await League.find();
    res.json(leagues);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
