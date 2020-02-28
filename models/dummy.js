const mongoose = require('mongoose');

const DummySchema = mongoose.Schema({
  name: { type: String, required: true },
  userId: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
  leagues: [{ type: mongoose.Types.ObjectId, required: true, ref: 'League' }]
});

module.exports = mongoose.model('Dummy', DummySchema);
