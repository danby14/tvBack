const mongoose = require('mongoose');

const UserSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    birthdate: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['M', 'F', 'O', 'N/A'] },
    optIn: { type: Boolean, required: true },
    leagues: [
      {
        _id: false,
        id: false,
        leagueId: {
          type: mongoose.Types.ObjectId,
          required: true,
          ref: 'League'
        },
        leagueName: { type: String, required: true }
      }
    ],
    // leagues: [{ type: mongoose.Types.ObjectId, required: true, ref: 'League' }], !!!works if above does not
    leagueHistory: [{}] // (2018) Test League 1: 7th Place, (2019) Test League 1: 4th Place
  },
  { timestamps: true }
);

module.exports = mongoose.model('Users', UserSchema);

members: [
  {
    _id: false,
    id: false,
    memberId: { type: String },
    predictions: { type: Array }
  }
];
