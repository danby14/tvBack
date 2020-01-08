const express = require('express');
const router = express.Router();
const Network = require('../models/Network');

//Get back all the networks
router.get('/', async (req, res) => {
  try {
    const networks = await Network.find();
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
