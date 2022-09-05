const express = require('express');
const router = express.Router();
const Network = require('../models/network');
const axios = require('axios').default;
// import axios from 'axios';
const cheerio = require('cheerio');
// import * as cheerio from 'cheerio';

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

//Scrape new shows
router.get('/scraper', async (req, res) => {
  const { year } = req.body;
  const url = `https://ew.com/tv/${year}-tv-premiere-dates/`;

  let results = {
    JAN: [],
    FEB: [],
    MAR: [],
    APR: [],
    MAY: [],
    JUNE: [],
    JULY: [],
    AUG: [],
    SEPT: [],
    OCT: [],
    NOV: [],
    DEC: [],
  };

  try {
    const html = await axios.get(url);
    const $ = cheerio.load(html.data);
    // get from each div with classname paragraph, "these are the release days"
    $('div.paragraph').each((index, element) => {
      let shows = $(element).children('p').text();
      let regex = /(?<=SERIES PREMIERE:\s).*?\)/g;
      let matches = shows.match(regex);

      let date = $(element).find('strong').text();
      let months = Object.keys(results);

      for (let month of months) {
        if (date.includes(month)) {
          if (matches) {
            results[month].push({ date, newShows: matches });
          }
        }
      }
    });
    res.json(results);
  } catch (err) {
    res.json({ message: err, hmm: 'shh' });
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
