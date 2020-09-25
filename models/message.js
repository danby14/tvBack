const mongoose = require('mongoose');

const MessageSchema = mongoose.Schema(
  {
    reason: {
      type: String,
      required: true,
      enum: ['Bugs', 'Feedback', 'Suggestions', 'Add show', 'Show cancelled', 'Other'],
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Closed', 'In Progress'], default: 'Open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);
