const mongoose = require('mongoose');

const LeagueSchema = mongoose.Schema(
  {
    commissioner: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
    // commissioner: {
    //   userId: [
    //     {
    //       type: mongoose.Types.ObjectId,
    //       required: true,
    //       ref: 'User'
    //     }
    //   ],
    //   username: { type: String }
    // },
    leagueName: { type: String, required: true, unique: false },
    password: { type: String, required: true, minlength: 6 },
    listUsed: { type: String, required: true },
    // bracketEdits: { type: Array },
    members: [
      {
        _id: false,
        id: false,
        memberId: [{ type: mongoose.Types.ObjectId, required: true, ref: 'User' }],
        // memberId: { type: String },
        // username: { type: String },
        // predictions: [
        //   {
        //     _id: false,
        //     id: false,
        //     network: { type: String, require: true },
        //     shows: { type: Array, require: true }
        //   }
        // ]
        predictions: [{ _id: false, id: false, network: Number, shows: Array }]
      }
    ]
    // startDate: { type: Date },
    // standings: { type: Array },
    // results: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('League', LeagueSchema);
