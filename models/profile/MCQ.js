const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const mcqSchema = new mongoose.Schema(
  {
    user1: { type: ObjectId, ref: "User", required: true }, // User 1 ObjectId
    user2: { type: ObjectId, ref: "User", required: true }, // User 2 ObjectId
    score: { type: Number, default: 0 }, // Score out of 10
    questions: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: String, required: true },
        user2Answer: { type: String, default: "" }, // User2's answer
      },
    ],
  },
  { timestamps: true }
);

const MCQ = mongoose.model("MCQ", mcqSchema);

module.exports = MCQ;

