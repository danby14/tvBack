const mongoose = require('mongoose');

const MonthlyListSchema = mongoose.Schema({
  updated: { type: Date, default: Date.now },
  networks: Array
});

module.exports = mongoose.model('MonthlyLists', MonthlyListSchema);
