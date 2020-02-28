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

//Update a network
router.post('/new', async (req, res) => {
  const { network, shows } = req.body;
  const newNetwork = new Network({
    network: network,
    shows: shows
  });

  try {
    const savedNetwork = await newNetwork.save();
    res.json(savedNetwork);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
