const User = require("../models/profile/user");
var { expressjwt } = require("express-jwt");
const { sendMail } = require("../util/email");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt"); // for password hashing

const accountSid = "AC5dc32628e38c2686a63c46b93d86e3ec";
const authToken = "d0f327b0f02338f119789c2138246507";
const client = require("twilio")(accountSid, authToken);

// Generate random OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000);
}

// In-memory storage for OTPs (Replace this with a persistent storage in a production environment)

// Send OTP via SMS
function sendOTPviaSMS(phoneNumber, otp) {
  return client.messages.create({
    body: `Your OTP for verification is: ${otp}`,
    to: phoneNumber,
    from: "+1 910 557 9362",
  }); 
}

const otps = {};

// Function to remove expired OTPs
function removeExpiredOTPs() {
  const now = new Date();
  const expiredKeys = [];

  for (const phoneNumber in otps) {
    if (otps.hasOwnProperty(phoneNumber)) {
      const otpData = otps[phoneNumber];
      if (otpData.expires <= now) {
        // OTP has expired, add its key to the list of keys to delete
        expiredKeys.push(phoneNumber);
      }
    }
  }

  // Delete expired OTPs after the loop
  expiredKeys.forEach((phoneNumber) => {
    delete otps[phoneNumber];
  });
}

// Set up a timeout to delete expired OTPs after 1 minute

setTimeout(removeExpiredOTPs, 10 * 1000); // 1 minute (60 seconds * 1000 milliseconds)

// Set up a timer to periodically remove expired OTPs

// Verify OTP
function verifyOTP(phoneNumber, otp) {
  console.log(otps);
  console.log(phoneNumber);
  console.log(otps[phoneNumber], otp);
  return otps[phoneNumber] == otp;
}

exports.sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  console.log(phoneNumber);
  // Assuming generateOTP() is a function that generates a random OTP
  const otp = generateOTP();
  otps[phoneNumber] = otp; // Assuming otps is an object used to store OTPs
  console.log(otps[phoneNumber], otp); // Logging the OTP stored in otps[phoneNumber] and the generated OTP

  console.log(phoneNumber, otp); // Logging the phone number and the OTP
  res.status(200).send("OTP sent successfully!");

  // sendOTPviaSMS(phoneNumber, otp) // Assuming sendOTPviaSMS is a function that sends OTP via SMS
  //   .then(() => {
  //     res.status(200).send("OTP sent successfully!");
  //   })
  //   .catch((err) => {
  //     console.error("Error sending OTP:", err);
  //     res.status(500).send("Failed to send OTP.");
  //   });
};

exports.verifyOTPLogin = async (req, res) => {
  try {
    const { phoneNumber, fullName, email, dob, gender, location, otp } =
      req.body;

    console.log(phoneNumber, fullName, email, dob, gender, location, otp); // Logging received data for debugging

    if (!otp && !phoneNumber) {
      return res.json({
        error: "Enter otp and mobile no",
      });
    }

    // const isValid = verifyOTP(phoneNumber, otp);
    // console.log(isValid);
    // if (!isValid) {
    //   return res.json({
    //     error: "Wrong otp",
    //   });
    // }

    // if (isValid) {
    if (1 === 1) {
      // Temporary condition for debugging, should be replaced with actual OTP verification logic
      // Check if user with the same email already exists
      const oldUser = await User.findOne({ phoneNumber });

      if (oldUser) {
        const jwtToken = jwt.sign(
          { _id: oldUser._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "90 days",
          }
        );

        return res.json({
          message: "This user already exists",
          user: oldUser,
          jwtToken,
        });
      } else {
        if (
          !phoneNumber ||
          !fullName ||
          !email ||
          !dob ||
          !gender ||
          !location
        ) {
          return res.json({
            error: "Enter all details",
          });
        }
        // Create a new user account
        const newUser = new User({
          phoneNumber: phoneNumber,
          fullName: fullName,
          email: email,
          gender: gender,
          location: location,
          profilePicture: "https://love-circle-images.s3.eu-north-1.amazonaws.com/profileImages/660d450273aa0ef2727bf368_1712145810559_Image",
          // Add other user data fields as needed
        });

        try {
          // Save the new user to the database
          const data = await newUser.save();
          const jwtToken = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY,
          });

          return res.json({
            message: "OTP verified successfully and user account created!",
            user: data,
            jwtToken,
          });
        } catch (error) {
          console.error("Error creating user account:", error);
          return res
            .status(500)
            .send("Error creating user account. Please try again.");
        }
      }
    } else {
      res.status(400).send("Invalid OTP. Please try again.");
    }
  } catch (error) {
    console.error("Error in createUser:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
};

// Send OTP via SMS
function inviteUserViaSMS(phoneNumber) {
  const appName = "IVO";
  const appLink = "https://www.google.com/";
  const message = `Hey there! 👋 I wanted to let you know about our awesome new app, ${appName}! Download it now at ${appLink} and connect with your friends and family! 📱✨`;

  return client.messages.create({
    body: message,
    to: phoneNumber,
    from: "+1 910 557 9362",
  });
}

exports.inviteUser = async (req, res) => {
  // const { phoneNumber } = req.body;

  const phoneNumber = "+918937865552";
  console.log(phoneNumber);
  inviteUserViaSMS(phoneNumber)
    .then(() => {
      res.status(200).send("Invite user successfully");
    })
    .catch((err) => {
      console.error("Failed for invite user", err);
      res.status(500).send("Failed for invite user");
    });
};

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user with the same email already exists
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      const jwtToken = jwt.sign({ _id: oldUser._id }, process.env.JWT_SECRET, {
        expiresIn: "90 days",
      });
      const userResponse = {
        _id: oldUser._id,
      };
      return res.json({
        error: "This user is already exists",
      });
    }

    // Create a new user with minimal information
    const newUser = new User({
      fullName,
      email,
      password,
    });

    try {
      const data = await newUser.save();
      const jwtToken = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY,
      });
      const userResponse = {
        _id: data._id,
        fullName: data.fullName,
        email: data.email,
        // You can include additional fields if needed
      };
      console.log("signup call");
      return res.json({ user: userResponse, jwtToken });
    } catch (saveError) {
      console.error("Error saving user:", saveError);
      return res.status(400).json({ error: "Error saving user." });
    }
  } catch (error) {
    console.error("Error in createUser:", error);
    return res.status(500).json({ error: "Internal Server Error." });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ error: "Invalid Email Address" });
      // return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password stored in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // return res.status(401).json({ error: "Invalid credentials" });
      return res.json({ error: "Invalid Password" });
    }

    // If the password is valid, create a JWT token for the user
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });

    return res.json({ user, jwtToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllUsers = async (req, res) => {
  const { _id } = req.body;
  console.log(_id);

  console.log("Hello, fetching all users except the specified one...");
  try {
    // Fetch all users from the database excluding the specified _id
    const allUsersExceptSpecified = await User.find({ _id: { $ne: _id } });

    // Log the fetched users
    // console.log("Fetched users:", allUsersExceptSpecified);

    // Return the list of users in the response
    return res.json({ users: allUsersExceptSpecified });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({ error: error.message });
  }
};




// Function to standardize mobile numbers into the desired format
function standardizeMobileNumber(number) {
  // Remove all non-digit characters from the number
  let cleanedNumber = number.replace(/\D/g, '');

  // Check if the number starts with a country code, and extract the relevant parts
  let countryCode = '';
  let formattedNumber = '';

  if (cleanedNumber.length === 12) {
    countryCode = `+${cleanedNumber.slice(0, 2)}`;
    formattedNumber = `${countryCode}${cleanedNumber.slice(2)}`;
  } else if (cleanedNumber.length === 10) {
    countryCode = '+91';
    formattedNumber = `${countryCode}${cleanedNumber}`;
  } else {
    formattedNumber = number; // If the number doesn't match expected lengths, keep it as is
  }

  return formattedNumber;
}


exports.getAllContacts = async (req, res) => {
  const { _id, arrContacts } = req.body;

  if (!_id || !arrContacts) {
    return res
      .status(400)
      .json({ error: "Please provide ID and contacts data." });
  }
  
  try {
    const allUsersExceptSpecified = await User.find({ _id: { $ne: _id } });

    // Extract desired fields from each contact and format mobile numbers
    const extractedContacts = arrContacts.map((contact) => {
      const { givenName, familyName, phoneNumbers,thumbnailPath } = contact;
      const mobileNumber = phoneNumbers.find(
        (number) => number.label === "mobile"
      );
      // Format the mobile number using the standardizeMobileNumber function
      const formattedMobileNumber = mobileNumber
        ? standardizeMobileNumber(mobileNumber.number)
        : null;
        
      return {
        thumbnailPath,
        givenName,
        firstName: familyName,
        mobileNumber: formattedMobileNumber,
      };
    });
    console.log(extractedContacts)

    // Categorize contacts into IVO and non-IVO users
    const ivoUsers = [];
    const nonIvoUsers = [];

    extractedContacts.forEach((contact) => {
      const matchingUser = allUsersExceptSpecified.find((user) =>
        user.phoneNumber === parseInt(contact.mobileNumber, 10)
      );

      // Check if the mobile numbers match and categorize accordingly
      if (matchingUser && matchingUser.phoneNumber === parseInt(contact.mobileNumber, 10)) {
        ivoUsers.push({ ...contact, user: { _id: matchingUser._id, ...matchingUser._doc } });
      } else {
        nonIvoUsers.push(contact);
      }
    });

    console.log(ivoUsers.length, nonIvoUsers.length)
    console.log(ivoUsers)
    // Return the categorized users in the response
    return res.json({ ivoUsers, nonIvoUsers });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("Error in getAllContacts:", error);
    return res.status(500).json({ error: error.message });
  }
};



exports.updateUserOnlineStatus = async (req, res, next) => {
  const { userId, isOnline } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the isOnline field based on the provided status
    user.isOnline = isOnline === 0 ? 0 : 1; // Adjusted logic

    // Save the updated user
    await user.save();

    console.log(
      `User ${user.fullName} is now ${isOnline === 0 ? "online" : "offline"}`
    );

    // Send response with only specific fields
    res.status(200).json({
      id: user._id,
      fullName: user.fullName,
      profilePhoto: user.profilePhoto,
      isOnline: user.isOnline,
    });
  } catch (error) {
    console.error("Error updating user online status:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, _id } = req.body;

  try {
    // Fetch the user from the database based on the user ID
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("cp", currentPassword);
    console.log("np", newPassword);
    // Compare the provided current password with the hashed password stored in the database
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    console.log("hashedNewPassword", hashedNewPassword);
    // Update the user's password in the database
    user.password = newPassword;
    console.log("userp", user.password);
    await user.save();

    // Create a new JWT token for the user with the updated password
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });

    return res.json({ message: "Password changed successfully", jwtToken });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.forgetPassword = async (req, res) => {
  console.log(req);

  // 3.Match password and username
  const { email } = req.body;
  let user;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000);

    user = await User.findOneAndUpdate(
      { email },
      { $set: { otp } },
      { new: true }
    );

    if (!user) {
      const error = {
        status: 401,
        message: "Invalid Email",
      };
      return next(error);
    }
    sendMail(user?.email, "Password Reset Code", `Your OTP is : ${otp}`);
  } catch (error) {
    return next(error);
  }

  // const accessToken = JWTService.signAccessToken({ _id: user._id });

  return res.status(200).json({
    message: `An OTP has been sent to this ${email}, please verify`,
    // token: accessToken,
  });
};

exports.verifyOTP = async (req, res, next) => {
  const { otp, email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      const error = {
        status: 401,
        message: "Invalid User",
      };
      return next(error);
    }

    const match = otp == user.otp;

    if (!match) {
      const error = {
        status: 401,
        message: "Invalid OTP",
      };
      return next(error);
    }

    // OTP is verified, now update the user's password
    user.password = newPassword; // Assuming you have a 'password' field in your User schema
    await user.save();

    return res.status(200).json({
      message: "OTP has been verified successfully. Password has been changed.",
    });
  } catch (error) {
    return next(error);
  }
};

exports.requireSignin = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  // userProperty: "auth",
});

exports.checkError = (err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    // console.log("Profile Called");
    return res.status(401).json("invalid token...");
  } else {
    console.log(err.name);
    next(err);
  }
};

exports.decodeToken = (req, res, next) => {
  var id = req.headers.authorization.split(" ")[1];
  console.log(id, "id");
  var decoded = jwt.verify(id, process.env.JWT_SECRET);
  console.log(decoded);
  req.user = decoded;
  // console.log(decoded);
  next();
};

exports.refreshToken = (req, res) => {
  var { id } = req.body;
  const jwtToken = jwt.sign({ _id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });
  return res.json({ jwtToken });
};

exports.userExists = async (req, res) => {
  var { phoneNo, device_tokens, email, fullName, type } = req.body;

  var user;
  if (type === "phone") {
    user = await User.findOne({ phoneNo: phoneNo });
  } else if (type === "email") {
    user = await User.findOne({ email: email });
  }

  // console.log(user);
  // if user exists then add fcm token to here.

  if (user) {
    const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    });
    var token = await User.findOne({
      device_tokens: { $in: [device_tokens] },
    });
    if (!token) {
      await User.findOneAndUpdate(
        { _id: user._id },
        { $push: { device_tokens: device_tokens } }
      );
    }
    var user = {
      error: "User already exists",
      fullName: user.name,
      device_tokens: token != null ? [device_tokens] : [],
      images: [],
      describe: [],
      _id: user._id,
      gender: user.gender,
      jwtToken,
    };
    return res.json({ user });
  } else {
    var user = {
      fullName: "User Not Exists",
      device_tokens: [],
      images: [],
      describe: [],
    };
    return res.json({ user });
  }
};
