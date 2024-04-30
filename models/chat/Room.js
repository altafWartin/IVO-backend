const mongoose = require('mongoose');


const roomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['pending', 'open', 'closed'],
    default: 'pending',
  },
  // Other room properties
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
