// models/Challenge.js
const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    publicKey: {
      type: String,
      required: true,
      unique: true, // Ensures only one challenge per wallet
      index: true,
    },
    nonce: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // TTL: auto-delete after 300 seconds (5 minutes)
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model('Challenge', challengeSchema);
