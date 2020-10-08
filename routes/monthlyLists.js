const express = require('express');
const router = express.Router();
const Network = require('../models/network');
const MonthlyList = require('../models/monthlyList');

const verifyToken = require('../middleware/verifyToken');
const hasRole = require('../middleware/hasRole');

//Get back all the monthly lists
router.get('/', async (req, res) => {
  try {
    const networks = await MonthlyList.find();
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

//Get back a specific monthly list by list id
router.get('/:lid', async (req, res) => {
  const listId = req.params.lid;
  try {
    const networks = await MonthlyList.findById(listId);
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

// require token and admin access
router.use(verifyToken);
router.use(hasRole('admin'));

//Add new show to a monthly list
router.patch('/:lid/addShow', async (req, res, next) => {
  const listId = req.params.lid;
  const { show, finalResult, networkNumber } = req.body;

  let list;
  try {
    list = await MonthlyList.findById(listId);
  } catch (err) {
    return next(res.status(500).send('Could not find list / Invalid id length'));
  }

  list.networks[networkNumber].shows.push({ finalResult: finalResult, show: show });

  try {
    // have to use markModified here since its a mixed array or something along those lines
    list.markModified('networks');
    await list.save();
    res.status(500).send(list);
    // res.status(500).send(list.networks);
  } catch (err) {
    res.json({ message: err.message });
    return next(res.status(500).send('Something went wrong2.'));
  }
});

//Submit an Updated List of Networks Automatically (only use at beginning of season, after all the networks are updated)
router.post('/autoUpdate', async (req, res) => {
  let networks;
  try {
    networks = await Network.find();
  } catch (err) {
    res.json({ message: err });
  }

  const monthlyList = new MonthlyList({
    networks: networks,
  });
  try {
    await monthlyList.save();
    res.json(monthlyList);
  } catch (err) {
    res.json({ messsage: err });
  }
});

//Get back all the networks and find a show to update
router.get('/result/:show', async (req, res) => {
  const show = req.params.show;
  try {
    const finder = await MonthlyList.networks.find();
    res.json(finder);
    console.log(show);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
