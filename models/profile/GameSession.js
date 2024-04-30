const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  questions: [{ type: String }],
  answers: [{ type: String }],
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = GameSession;
