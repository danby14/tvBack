const express = require('express');
const router = express.Router();
const Network = require('../models/network');

const verifyToken = require('../middleware/verifyToken');
const hasRole = require('../middleware/hasRole');

//Get back all the networks
router.get('/', async (req, res) => {
  try {
    const networks = await Network.find();
    res.json(networks);
  } catch (err) {
    res.json({ message: err });
  }
});

// require token and admin access
router.use(verifyToken);
router.use(hasRole('admin'));

//add a network
router.post('/new', async (req, res) => {
  const { network, shows } = req.body;
  const newNetwork = new Network({
    network: network,
    shows: shows,
  });

  try {
    const savedNetwork = await newNetwork.save();
    res.json(savedNetwork);
  } catch (err) {
    res.json({ message: err });
  }
});

module.exports = router;
