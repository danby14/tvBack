const mongoose = require('mongoose');

const LeagueSchema = mongoose.Schema(
  {
    commissioner: {
      userId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'User'
      },
      username: { type: String }
    },
    leagueName: { type: String, required: true, unique: false },
    password: { type: String, required: true, minlength: 6 },
    listUsed: { type: String, required: true },
    // bracketEdits: { type: Array },
    members: [
      {
        _id: false,
        id: false,
        memberId: { type: String },
        username: { type: String },
        predictions: { type: Array }
      }
    ]
    // startDate: { type: Date },
    // standings: { type: Array },
    // results: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leagues', LeagueSchema);
