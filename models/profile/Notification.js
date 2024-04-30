// models/notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  body: String,
  imageUrl: String,
  commenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commenterName: String, // Include commenter's name directly
  likedID: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likedName: String, // Include commenter's name directly
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
