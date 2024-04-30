const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;


const acceptFriendRequest = mongoose.Schema({
    requestReceiverID: { type: ObjectId, ref: "User", required: true, index: true }, //own ID
    requestSenderID: { type: ObjectId, ref: "User", required: true, index: true }, // the one who like ID
    status: { type: Number } // 0 means Accepted, 1 means Declined
});

module.exports = mongoose.model("acceptFriendRequest", acceptFriendRequest);
