const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const chatSchema = mongoose.Schema(
  {
    // user: { type: ObjectId, ref: "User", required: true },
    chatroomID: { type: String },
    participants: [{ type: ObjectId, ref: "User" }],
    lastMessage: { type: String },
    messageBy: { type: ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("chatrooms", chatSchema);
