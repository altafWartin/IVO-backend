const express = require("express");
const {
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const {
  getProfile,
  sendFriendRequest,
  AddComment,
  GetComment,
  addQuestions,
  getFilterProfile,
  mediaUpload,
  coverUpload,
  profileUpload,
  addMCQ,
  answerMCQ,
  requestStatus,
  GetNotifications,
  replaceCover,
  getMCQByUsers,
  getRooms,
  getFriendRequest,
  uploadImage,
  giveThemPush,
  replaceImage,
  getSingleProfile,
  acceptFriendRequest,
  updateUserFields,
} = require("../controller/profile");
const router = express.Router();
const multer = require("multer");
const AWS = require("aws-sdk");

// Set up Multer to handle file uploads
const storage = multer.memoryStorage(); // Use memory storage for storing file buffers
const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Set the file size limit to 50MB (adjust as needed)
});

router.post("/getProfile", checkError, getProfile);
router.post("/getFilterProfile", checkError, getFilterProfile);
router.post("/sendFriendRequest", sendFriendRequest);
router.post("/giveThemPush", giveThemPush);
router.post("/requestStatus", requestStatus);
router.post("/getRooms", checkError, getRooms);
router.post("/acceptFriendRequest", acceptFriendRequest);
router.post("/addQuestions", addQuestions);
router.post("/addMCQ", addMCQ);
router.post("/get-mcq", getMCQByUsers);
router.post("/answerMCQ", answerMCQ);
router.post("/notifications", GetNotifications);
router.post("/uploadImage", upload.single("photo"), uploadImage);
router.post("/updateUserFields", updateUserFields);
router.post("/profileUpload", upload.single("photo"), profileUpload);
router.post("/updateProfilePicture", upload.single("newPhoto"), replaceImage);
router.post("/uploadCoverPhoto", upload.single("cover"), coverUpload);
router.post("/updateCoverPhoto", upload.single("newCover"), replaceCover);
router.post("/mediaUpload", upload.single("file"), mediaUpload);
router.post("/getSingleProfile", getSingleProfile);

module.exports = router;
