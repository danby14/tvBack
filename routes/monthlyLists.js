const express = require('express');
const router = express.Router();
const Network = require('../models/Network');
const MonthlyList = require('../models/monthlyList');

//Get back all the networks
router.get('/', async (req, res) => {
  try {
    const networks = await MonthlyList.find();
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

//Get back all the networks
router.get('/:lid', async (req, res) => {
  const listId = req.params.lid;
  try {
    const networks = await MonthlyList.findById(listId);
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

//Submit an Updated List of Netowrks Automatically
router.post('/autoUpdate', async (req, res) => {
  let networks;
  try {
    networks = await Network.find();
  } catch (err) {
    res.json({ message: err });
  }

  const monthlyList = new MonthlyList({
    networks: networks
  });
  try {
    const savedMonthlyList = await monthlyList.save();
    res.json(savedMonthlyList);
  } catch (err) {
    res.json({ messsage: err });
  }
});

module.exports = router;
