const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const chatSchema = mongoose.Schema(
  {
    senderID: { type: ObjectId, ref: "User", required: true },
    recieveID: { type: ObjectId, ref: "User", required: true, index: true },
    msg: { type: String, required: true },
    seen: { type: Boolean, default: false },
    messageID: { type: String },
    status: { type: String },
    chatroomID: {
      type: ObjectId,
      ref: "chatrooms",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("chatMessages", chatSchema);
