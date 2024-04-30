const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const questionSchema = mongoose.Schema(
  {
    user1: { type: ObjectId, ref: 'User', required: true }, // User 1 ObjectId
    user2: { type: ObjectId, ref: 'User', required: true }, // User 2 ObjectId
    questions: [
      {
        question: { type: String, required: true },
        answer: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
