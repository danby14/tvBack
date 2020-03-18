const mongoose = require('mongoose');

const LeagueSchema = mongoose.Schema(
  {
    commissioner: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
    leagueName: { type: String, required: true, unique: false },
    password: { type: String, required: true, minlength: 6 },
    listUsed: { type: String, required: true },
    // bracketEdits: { type: Array },
    members: [
      {
        memberId: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
        predictions: [{ _id: false, id: false, network: Number, shows: Array }]
      }
    ],
    startDate: { type: Date, required: true }
    // standings: { type: Array },
    // results: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('League', LeagueSchema);
