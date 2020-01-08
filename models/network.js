const mongoose = require('mongoose');

const NetworkSchema = mongoose.Schema({
  network: {
    name: { type: String, require: true },
    shows: { type: Array, require: true }
  }
});

module.exports = mongoose.model('Networks', NetworkSchema);
