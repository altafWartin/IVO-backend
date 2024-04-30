// models/comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imageUrl: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
