const mongoose = require('mongoose');

const UserSchema = mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    confirmed: { type: Boolean, default: false },
    password: { type: String, required: true, minlength: 6 },
    birthdate: { type: Date, required: true },
    gender: { type: String, required: true, enum: ['M', 'F', 'O', 'N/A'] },
    optIn: { type: Boolean, required: true },
    leagues: [{ type: mongoose.Types.ObjectId, required: true, ref: 'League' }],
    tempToken: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    role: { type: String, enum: ['admin', 'moderator', 'user'], default: 'user' },
    // leagueHistory: [{}] // (2018) Test League 1: 7th Place, (2019) Test League 1: 4th Place
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
