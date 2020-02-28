const mongoose = require('mongoose');

const NetworkSchema = mongoose.Schema({
  network: { type: String, require: true },
  shows: [
    {
      _id: false,
      id: false,
      show: { type: String, require: true },
      finalResult: { type: Number, require: true, default: 0 }
    }
  ]
});

module.exports = mongoose.model('Network', NetworkSchema);
