// routes/chat.js

const express = require("express");
const {
  createChatRoom,
  getAllChatRoom,
  getSingleChat,
  sendSingleChat,
  updateMessageStatus,
} = require("../controller/chat");
const {
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const router = express.Router();
// Import Socket.IO and establish connection
const socketIo = require("socket.io");
const http = require("http");
const server = http.createServer();
const io = socketIo(server);

// Add this middleware to attach the io instance to the request object
router.use((req, res, next) => {
  req.io = io;
  next();
});

router.post("/createChatRoom", createChatRoom);
router.post("/getAllChatRoom", getAllChatRoom ,decodeToken,requireSignin ,checkError);

router.post(
  "/getSingleChat",
  // requireSignin,
  // checkError,
  // decodeToken,
  getSingleChat
);
router.post(
  "/sendSingleChat",
  requireSignin,
  checkError,
  decodeToken,
  sendSingleChat
);
router.post(
  "/updateMessageStatus",
  requireSignin,
  checkError,
  decodeToken,
  updateMessageStatus
);

module.exports = router;
