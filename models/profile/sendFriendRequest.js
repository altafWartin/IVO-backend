const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const sendFriendRequest = mongoose.Schema({
  requestSenderID: { type: ObjectId, ref: "User", required: true, index: true },
  requestReceiverID: { type: ObjectId, ref: "User", required: true, index: true }, // the one who like ID
  status: { type: Number }, // 0 means liked, 1 means not disliked
});

module.exports = mongoose.model("sendFriendRequest", sendFriendRequest);
