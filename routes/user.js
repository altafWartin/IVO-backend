const express = require("express");
const {
  sendOTP,
  verityOTP,
  inviteUser,
  loginUser,
  getAllUsers,
  verifyOTPLogin,
  createUser,
  getAllContacts,
  userExists,
  refreshToken,
  changePassword,
  updateUserOnlineStatus,
  forgetPassword,
  verifyOTP,
  updateAdditionalDetails,
  requireSignin,
  checkError,
  decodeToken,
} = require("../controller/user");
const router = express.Router();

router.post("/sendOTP", sendOTP);
router.post("/verifyOTPLogin", verifyOTPLogin);
// router.post("/verifyOTP", verifyOTP);
router.post("/inviteUser", inviteUser);
router.post("/createUser", createUser);
router.post("/loginUser", loginUser);
router.post("/updateUserOnlineStatus", updateUserOnlineStatus);

// router.post("/changePassword", changePassword);
// router.post("/forgetPassword", forgetPassword);
router.post("/getAllProfiles", getAllUsers, decodeToken, requireSignin);
router.post("/getAllContacts", getAllContacts, decodeToken, requireSignin);
router.post("/userExists", userExists);
router.post("/refreshToken", refreshToken);


module.exports = router;
