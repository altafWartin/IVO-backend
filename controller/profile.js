const User = require("../models/profile/user");
const Room = require("../models/chat/Room");
const MCQ = require('../models/profile/MCQ'); // Import the MCQ model


const sendFriendRequest = require("../models/profile/sendFriendRequest");
// const sendFriendRequest = require("../models/profile/sendFriendRequest");

const Notification = require("../models/profile/Notification");

var crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const { uploadFile, deleteFile } = require("../s3");
const ChatRoom = require("../models/chat/chatroom");
const Chat = require("../models/chat/chatMessages");
const { getMessaging } = require("firebase-admin/messaging");

exports.getProfile = async (req, res) => {
  var { gender } = req.body;
  // console.log(profileID);

  var profile = await User.find({ gender: gender })
    .populate(
      "basic_Info",
      "sun_sign cuisine political_views looking_for personality first_date drink smoke religion fav_pastime"
    )
    .select("name images height live dob gender")
    .limit(20);

  if (profile) {
    // var age = getAge(profile.dob);
    return res.json({ profile });
  } else {
    return res.status(400).json({ failed: true, profile });
  }
};

exports.getFilterProfile = async (req, res) => {
  try {
    const { gender, location, distance, minAge, maxAge } = req.body;

    let query = {};

    if (gender) {
      query.gender = gender;
    }

    if (location && distance) {
      const [longitude, latitude] = location.split(",").map(parseFloat);

      query.loc = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: parseFloat(distance) * 1000,
        },
      };
    }

    if (minAge || maxAge) {
      query.dob = {};

      if (minAge) {
        const minBirthYear = new Date().getFullYear() - parseInt(minAge, 10);
        query.dob.$gte = new Date(`${minBirthYear}-01-01T00:00:00.000Z`);
      }

      if (maxAge) {
        const maxBirthYear = new Date().getFullYear() - parseInt(maxAge, 10);
        query.dob.$lte = new Date(`${maxBirthYear}-12-31T23:59:59.999Z`);
      }
    }

    const filteredUsers = await User.find(query);

    // res.json({ data: filteredUsers });
    return res.json({ users: filteredUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// // sendFriendRequest route handler

exports.sendFriendRequest = async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    console.log("Sender ID:", senderId);
    console.log("Receiver ID:", receiverId);

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    console.log("Sender:", sender);
    console.log("Receiver:", receiver);

    if (!sender || !receiver) {
      console.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    // Check if sender and receiver have already sent requests to each other
    const senderSent = sender.friends.includes(receiverId);
    const receiverSent = receiver.friends.includes(senderId);

    console.log("Sender sent request:", senderSent);
    console.log("Receiver sent request:", receiverSent);

    if (senderSent && receiverSent) {
      // Check if there's already a room for these users
      const existingRoom = await Room.findOne({
        participants: { $all: [senderId, receiverId] }
      });

      if (existingRoom) {
        console.log("Room already exists for these users:", existingRoom);
        return res.status(200).json({ message: "Room already exists", room: existingRoom });
      }

      // Create a room for the participants
      const room = new Room({
        participants: [senderId, receiverId],
        status: "pending",
      });
      await room.save();

      console.log("Room created:", room);

      res.status(200).json({ message: "Friend request sent successfully", room });
    } else {
      // If not both have sent requests to each other, update friend lists only
      sender.friends.push(receiverId);
      receiver.friends.push(senderId);

      await sender.save();
      await receiver.save();

      console.log("Friend lists updated for sender and receiver");
      res.status(200).json({ message: "Friend request sent successfully" });
    }
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.giveThemPush = async (req, res) => {
  const { userID1, userID2 } = req.body;

  try {
    const user1 = await User.findById(userID1);
    const user2 = await User.findById(userID2);

    if (!user1 || !user2) {
      console.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    // Create a room for the participants
    const user1Data = {
      _id: user1._id,
      fullName: user1.fullName,
      profilePicture: user1.profilePicture,
    };

    const user2Data = {
      _id: user2._id,
      fullName: user2.fullName,
      profilePicture: user2.profilePicture,
    };

    const room = new Room({
      participants: [user1Data, user2Data], // Include participants' names and profile pictures
      status: "pending",
    });
    await room.save();

    console.log("Room created:", room);

    res.status(200).json({ message: "Room created successfully", room });
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.requestStatus = async (req, res) => {
  const { roomId, status } = req.body;


  try {
    // Find the room by roomId
    const room = await Room.findById(roomId);

    if (!room) {
      console.error("Room not found");
      return res.status(404).json({ error: "Room not found" });
    }

    // Update the room's status based on the status parameter
    if (status === "open" || status === "closed") {
      room.status = status;
      await room.save();

      console.log("Room status changed:", room);

      res
        .status(200)
        .json({ message: `Room status changed to ${status}`, room });
    } else {
      console.error("Invalid status");
      res.status(400).json({ error: "Invalid status" });
    }
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRooms = async (req, res) => {
  const { receiverId } = req.body;
  console.log("Receiver ID:", receiverId);

  try {
    // Find all rooms where the receiverId is included in participants
    const rooms = await Room.find({ participants: receiverId }).populate(
      "participants",
      "fullName profilePicture"
    );

    console.log("Rooms found:", rooms);

    if (!rooms || rooms.length === 0) {
      console.error("No rooms found for the receiver");
      return res.status(404).json({ error: "No rooms found for the receiver" });
    }

    // Check and update status for rooms older than 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    console.log("Seven days ago:", sevenDaysAgo);

    const roomsToUpdate = rooms.filter(
      (room) => room.createdAt < sevenDaysAgo && room.status === "pending"
    );
    console.log("Rooms to update:", roomsToUpdate);

    if (roomsToUpdate.length > 0) {
      for (const room of roomsToUpdate) {
        room.status = "closed"; // Update the status directly
        await room.save(); // Save the updated room
      }
      console.log("Rooms updated to 'closed':", roomsToUpdate);
    }

    // Construct the response with participants' names and profile pictures
    const updatedRooms = rooms.map((room) => ({
      _id: room._id,
      participants: room.participants.map((participant) => ({
        _id: participant._id,
        fullName: participant.fullName,
        profilePicture: participant.profilePicture,
      })),
      status: room.status,
    }));

    res.status(200).json({ rooms: updatedRooms });
  } catch (error) {
    console.error("Internal server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add MCQ
exports.addMCQ = async (req, res) => {
  try {
    const { user1, user2, question, options, correctAnswer } = req.body;
    const mcq = await MCQ.findOneAndUpdate(
      { user1, user2 },
      { $push: { questions: { question, options, correctAnswer } } },
      { new: true, upsert: true }
    );
    res.status(201).json({ message: "Question added successfully", mcq });
  } catch (error) {
    res.status(400).json({ error: "Failed to add question" });
  }
};

// Answer MCQ and Calculate Score
exports.answerMCQ = async (req, res) => {
  try {
    const { user1, user2, questionIndex, user2Answer } = req.body;
    const mcq = await MCQ.findOne({ user1, user2 });
    if (!mcq) {
      return res.status(404).json({ error: "MCQ session not found" });
    }

    if (mcq.questions[questionIndex]) {
      mcq.questions[questionIndex].user2Answer = user2Answer;

      // Calculate Score
      let score = 0;
      mcq.questions.forEach((question) => {
        if (question.correctAnswer === question.user2Answer) {
          score++;
        }
      });
      mcq.score = (score / mcq.questions.length) * 10; // Calculate score out of 10
    }

    await mcq.save();
    res.status(200).json({ message: "Answer recorded successfully", mcq });
  } catch (error) {
    res.status(400).json({ error: "Failed to record answer" });
  }
};

// Get MCQ Questions and Options by User IDs
exports.getMCQByUsers = async (req, res) => {
  // Your getMCQByUsers logic here
  try {
    const { user1, user2 } = req.body;
    const mcq = await MCQ.findOne({ user1, user2 });
    if (!mcq) {
      return res.status(404).json({ error: "MCQ session not found" });
    }
    res.status(200).json({ mcq });
  } catch (error) {
    res.status(400).json({ error: "Failed to fetch MCQ session" });
  }
};

//Accept friendRequest
exports.acceptFriendRequest = async (req, res) => {
  try {
    var { requestReceiverID, requestSenderID, status, requestID } = req.body;
    console.log(requestReceiverID, requestSenderID, status, requestID);

    if (!requestReceiverID || !requestSenderID || !status || !requestID) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    if (status == 1) {
      // declined and delete from Like_Dislike_Requested
      // Check for Request Existence
      var existingRequest = await sendFriendRequest.findById(requestID);
      if (!existingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Delete the request using requestID
      var deleteRequestResult = await sendFriendRequest.deleteOne({
        _id: requestID,
      });

      console.log(" Reject and Delete Request Result:", deleteRequestResult);

      return res.json({
        success: true,
        message: "Request rejected successfully.",
      });
    } else {
      // Accepted then create chatroom and delete from Like_Dislike_Requested
      var participants = [requestReceiverID, requestSenderID];
      // console.log("Participants:", participants);

      var findChatRoom = await ChatRoom.find({ participants: participants });

      // console.log("Find Chat Room:", findChatRoom.toString());

      var chatroomID = uuidv4();
      var lastMessage = "Hey, I liked your profile too...";

      var chatRoom = new ChatRoom({
        chatroomID,
        participants,
        lastMessage,
      });

      await chatRoom.save();

      // Create Message to chat
      status = "SENT";
      var senderID = requestReceiverID;
      var recieveID = requestSenderID;
      var msg = lastMessage;
      var messageID = chatroomID;

      var chat = new Chat({
        senderID,
        msg,
        messageID,
        chatroomID: chatRoom._id,
        status,
        recieveID,
      });

      await chat.save();

      // Check for Request Existence
      var existingRequest = await sendFriendRequest.findById(requestID);
      if (!existingRequest) {
        return res.status(404).json({ error: "Request not found" });
      }

      const userProfileToUpdate = await User.findById(requestSenderID);

      if (!userProfileToUpdate) {
        return res.status(404).json({ error: "Profile not found" });
      } else {
        // Extract relevant information
        const { _id, fullName, profilePhoto } = userProfileToUpdate;

        // Add the user ID, name, and profilePicture to the friend's friend list
        const updateUser = {
          friendId: _id.toString(), // Convert ObjectId to string
          name: fullName || "", // Handle undefined values
          profilePicture: profilePhoto || "", // Handle undefined values
        };

        try {
          // Debugging: Print updateUser object
          console.log("updateUser:", updateUser);

          await User.findByIdAndUpdate(requestReceiverID, {
            $push: { friends: updateUser },
          });
          console.log("Friends list updated successfully!");
        } catch (error) {
          console.error("Error updating friends list:", error.message);
          // Handle the error appropriately (e.g., send an error response)
        }
      }

      const SenderProfileToUpdate = await User.findById(requestReceiverID);

      if (!userProfileToUpdate) {
        return res.status(404).json({ error: "Profile not found" });
      } else {
        // Extract relevant information
        const { _id, fullName, profilePhoto } = SenderProfileToUpdate;

        // Add the user ID, name, and profilePicture to the friend's friend list
        const updateSender = {
          friendId: _id.toString(), // Convert ObjectId to string
          name: fullName || "", // Handle undefined values
          profilePicture: profilePhoto || "", // Handle undefined values
        };

        try {
          // Debugging: Print updateUser object
          console.log("updateUser:", updateSender);

          await User.findByIdAndUpdate(requestSenderID, {
            $push: { friends: updateSender },
          });
          console.log("Friends list updated successfully!");
        } catch (error) {
          console.error("Error updating friends list:", error.message);
          // Handle the error appropriately (e.g., send an error response)
        }
      }

      // Delete the request using requestID
      var deleteRequestResult = await sendFriendRequest.deleteOne({
        _id: requestID,
      });

      // console.log("Accept and Delete Request Result:", deleteRequestResult);

      return res.json({
        success: true,
        message: "Request accepted successfully.",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEYS,
  secretAccessKey: process.env.AWS_SECRET_KEYS,
  region: process.env.AWS_BUCKET_REGION,
});

// exports.uploadImage = async (req, res) => {
//   try {
//     const { id } = req.body;
//     const photo = req.file;

//     console.log("Received image upload request for user:", id, photo);

//     if (!id) {
//       console.log("id is not provided");
//       return res.json("id is not provided");
//     }

//     if (!photo || !photo.buffer) {
//       console.log("Photo data is not provided");
//       return res.json("Photo data is not provided");
//     }

//     const params = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `images/${id}_${Date.now()}_${photo.originalname}`,
//       Body: photo.buffer,
//     };

//     const uploadResult = await s3.upload(params).promise();
//     console.log("Image uploaded to AWS S3:", uploadResult);

//     // Update the user's document with the image URL
//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       { $push: { images: uploadResult.Location } }, // Assuming 'images' is an array field in your User model
//       { new: true }
//     );

//     if (updatedUser) {
//       console.log("User profile updated:", updatedUser);
//       return res.json({
//         message: 'Image uploaded and user profile updated successfully',
//         imageUrl: uploadResult.Location,
//         profile: updatedUser,
//       });
//     } else {
//       console.log("findOneAndUpdate not working");
//       return res.json("findOneAndUpdate not working");
//     }
//   } catch (error) {
//     console.error("Error uploading image:", error);
//     return res.status(500).json("Internal Server Error");
//   }
// };

exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.body;
    const photo = req.file;
    console.log("Received image upload request for user:", id, photo);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!photo || !photo.buffer) {
      console.log("Photo data is not provided");
      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${id}_${Date.now()}_${photo.originalname}`,
      Body: photo.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $push: { images: uploadResult.Location } },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated:", updatedUser);
        return res.json({
          message: "Image uploaded and user profile updated successfully",
          imageUrl: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading image to AWS S3:", uploadError);
      return res.status(500).json({ error: "Error uploading image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};

// Assuming you have the necessary imports and setup for multer, AWS SDK, and Mongoose

// Add this function to handle profile image uploads
exports.profileUpload = async (req, res) => {
  try {
    const { id } = req.body;
    const photo = req.file;
    console.log("Received profile image upload request for user:", id, photo);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!photo || !photo.buffer) {
      console.log("Photo data is not provided");
      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `profileImages/${id}_${Date.now()}_${photo.originalname}`,
      Body: photo.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Profile Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the profile image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { profilePhoto: uploadResult.Location },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated with profile image:", updatedUser);
        return res.json({
          message:
            "Profile Image uploaded and user profile updated successfully",
          profileImageUrl: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading profile image to AWS S3:", uploadError);
      return res
        .status(500)
        .json({ error: "Error uploading profile image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing profile image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};

exports.replaceImage = async (req, res) => {
  try {
    const { id } = req.body;
    const newPhoto = req.file;

    if (!id || !newPhoto) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    console.log(
      "Uploading new profile image to AWS S3 and updating the server"
    );
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `profileImages/${id}_${Date.now()}_${newPhoto.originalname}`,
      Body: newPhoto.buffer,
    };

    const uploadResult = await s3.upload(params).promise();

    if (!uploadResult || !uploadResult.Location) {
      console.error("Error uploading profile image to AWS S3");
      return res
        .status(500)
        .json({ error: "Error uploading profile image to AWS S3" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profilePhoto: uploadResult.Location },
      { new: true }
    );

    if (!updatedUser) {
      console.log("Error updating user profile");
      return res.status(500).json({ error: "Error updating user profile" });
    }

    console.log("User profile updated successfully:", updatedUser);
    return res.json({
      message: "Profile image uploaded and user profile updated successfully",
      profilePhoto: uploadResult.Location,
      profile: updatedUser,
    });
  } catch (error) {
    console.error("Error processing profile image replace request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.coverUpload = async (req, res) => {
  try {
    const { id } = req.body;
    const cover = req.file;
    console.log("Received profile image upload request for user:", id, cover);

    if (!id) {
      console.log("id is not provided");
      return res.status(400).json({ error: "id is not provided" });
    }

    if (!cover || !cover.buffer) {
      console.log("Photo data is not provided.......");

      return res.status(400).json({ error: "Photo data is not provided" });
    }

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `coverPhoto/${id}_${Date.now()}_${cover.originalname}`,
      Body: cover.buffer,
    };

    try {
      // Attempt S3 upload
      const uploadResult = await s3.upload(params).promise();
      console.log("Profile Image uploaded to AWS S3:", uploadResult);

      // Attempt to update the user's document with the profile image URL
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { coverPhoto: uploadResult.Location },
        { new: true }
      );

      if (updatedUser) {
        console.log("User profile updated with profile image:", updatedUser);
        return res.json({
          message:
            "Profile Image uploaded and user profile updated successfully",
          coverPhoto: uploadResult.Location,
          profile: updatedUser,
        });
      } else {
        console.log("findOneAndUpdate not working");
        return res.status(500).json({ error: "findOneAndUpdate not working" });
      }
    } catch (uploadError) {
      console.error("Error uploading profile image to AWS S3:", uploadError);
      return res
        .status(500)
        .json({ error: "Error uploading profile image to AWS S3" });
    }
  } catch (error) {
    console.error("Error processing profile image upload request:", error);
    return res.status(500).json("Internal Server Error");
  }
};

exports.replaceCover = async (req, res) => {
  try {
    const { id } = req.body;
    const newCover = req.file;

    if (!id || !newCover) {
      console.log("Invalid request parameters");
      return res.status(400).json({ error: "Invalid request parameters" });
    }

    console.log(
      "Uploading new profile image to AWS S3 and updating the server"
    );
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `coverPhoto/${id}_${Date.now()}_${newCover.originalname}`,
      Body: newCover.buffer,
    };

    const uploadResult = await s3.upload(params).promise();

    if (!uploadResult || !uploadResult.Location) {
      console.error("Error uploading profile image to AWS S3");
      return res
        .status(500)
        .json({ error: "Error uploading profile image to AWS S3" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { coverPhoto: uploadResult.Location },
      { new: true }
    );

    if (!updatedUser) {
      console.log("Error updating user profile");
      return res.status(500).json({ error: "Error updating user profile" });
    }

    console.log("User profile updated successfully:", updatedUser);
    return res.json({
      message: "Profile image uploaded and user profile updated successfully",
      coverPhoto: uploadResult.Location,
      profile: updatedUser,
    });
  } catch (error) {
    console.error("Error processing profile image replace request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
});

// Function to check if a string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

// controller/profile.js (or wherever you retrieve notifications)
exports.GetNotifications = async (req, res) => {
  const { userId } = req.body;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: "desc" })
      // .populate('commenterId', 'name') // Populate commenterId with 'name' field
      .exec();

    return res.json({ notifications });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// controller/profile.js
const Comment = require("../models/profile/comment"); // Adjust the path accordingly

// ... other imports ...

exports.AddComment = async (req, res) => {
  const { userId, commenterId, imageUrl, text } = req.body;

  try {
    const newComment = new Comment({
      userId,
      commenterId,
      imageUrl,
      text,
    });

    const savedComment = await newComment.save();

    // Create a new notification for the user whose image received a comment
    const newNotification = new Notification({
      userId,
      commenterId,
      imageUrl,
      title: "New Comment",
      body: `some one commented on your image: ${text}`,
    });

    await newNotification.save(); // Save the notification to the database

    return res.json({ comment: savedComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.GetComment = async (req, res) => {
  const { userId, imageUrl } = req.body;

  try {
    const comments = await Comment.find({ userId, imageUrl }).sort({
      createdAt: "desc",
    });

    return res.json({ comments });
  } catch (error) {
    console.error("Error retrieving comments:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getSingleProfile = async (req, res) => {
  const { _id } = req.body;

  try {
    if (!_id) {
      console.log("Error: Missing or invalid user ID");
      return res.status(400).json({ error: "Missing or invalid user ID" });
    }

    const profile = await User.findOne({ _id });

    if (!profile) {
      console.log("Profile not found");
      return res
        .status(404)
        .json({ failed: true, message: "Profile not found" });
    }

    return res.status(200).json(profile); // Return the profile data
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const MAX_QUESTIONS = 10;

exports.addQuestions = async (req, res) => {
  try {
    // Extract the user ID and question from the request body
    const { userId, question } = req.body;

    // Validate if the user ID and question are provided and are in the correct format
    if (
      !userId ||
      !question ||
      typeof userId !== "string" ||
      typeof question !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "Invalid user ID or question format." });
    }

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if the user has already reached the maximum limit of questions
    if (user.questions.length >= MAX_QUESTIONS) {
      return res.status(400).json({
        error: `Maximum allowed questions (${MAX_QUESTIONS}) reached.`,
      });
    }

    // Add the question to the user's questions array
    user.questions.push({ question });

    // Save the updated user
    await user.save();

    res.json({ message: "Question saved successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};
// exports.addQuestions = async (req, res) => {
//   try {
//     const { question, userId } = req.body;

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     user.questions.push(question);
//     await user.save();

//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

exports.updateUserFields = async (req, res) => {
  try {
    const {
      _id,
      fullName,
      dob,
      email,
      gender,
      location,
      job,
      company,
      college,
      about,
    } = req.body;

    console.log("Received update user fields request with ID:", _id);

    // Check if _id is missing or invalid
    if (!_id) {
      console.log("Error: Missing or invalid user ID");
      return res.status(400).json({ error: "Missing or invalid user ID" });
    }

    // Update fields
    const update = {
      fullName,
      dob,
      gender,
      email,
      location,
      job,
      company,
      college,
      about,
      // Add any other fields you want to update here
    };

    const filter = { _id };

    // Update user in the database
    const user = await User.findOneAndUpdate(filter, update, { new: true });

    // Check if user is not found
    if (!user) {
      console.log("Error: User not found");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User updated successfully:", user);
    return res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    // Handle error appropriately
    console.error("Error processing update user fields request:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// exports.updateUserFields = async (req, res) => {
//   const { _id, fullName, dob, gender, location, job, company, college, about } = req.body;

//   // Access uploaded files
//   const profilePhotoFile = req.files.profilePhoto[0];
//   const coverPhotoFile = req.files.coverPhoto[0];

//   // Update fields
//   const update = {
//     fullName,
//     dob,
//     gender,
//     location,
//     job,
//     company,
//     college,
//     about,
//     // Add any other fields you want to update here
//   };

//   // Check if profilePhoto and coverPhoto files are uploaded
//   if (req.files && req.files.profilePhoto && req.files.coverPhoto) {
//     // Upload profilePhoto to S3 and update the user document
//     console.log("profilePhoto")
//     const profilePhotoParams = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `profileImages/${_id}_${Date.now()}_profilePhoto_${req.files.profilePhoto[0].originalname}`,
//       Body: req.files.profilePhoto[0].buffer,
//     };

//     try {
//       const profilePhotoUploadResult = await s3.upload(profilePhotoParams).promise();
//       update.profilePhoto = profilePhotoUploadResult.Location;
//     } catch (profilePhotoUploadError) {
//       console.error("Error uploading profile photo to AWS S3:", profilePhotoUploadError);
//       return res.status(500).json({ error: "Error uploading profile photo to AWS S3" });
//     }

//     // Upload coverPhoto to S3 and update the user document
//     const coverPhotoParams = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `profileImages/${_id}_${Date.now()}_coverPhoto_${req.files.coverPhoto[0].originalname}`,
//       Body: req.files.coverPhoto[0].buffer,
//     };

//     try {
//       const coverPhotoUploadResult = await s3.upload(coverPhotoParams).promise();
//       update.coverPhoto = coverPhotoUploadResult.Location;
//     } catch (coverPhotoUploadError) {
//       console.error("Error uploading cover photo to AWS S3:", coverPhotoUploadError);
//       return res.status(500).json({ error: "Error uploading cover photo to AWS S3" });
//     }
//   }

//   const filter = { _id: _id };

//   try {
//     // Update user in the database
//     const user = await User.findOneAndUpdate(filter, update, { new: true });

//     return res.json({ user });
//   } catch (error) {
//     // Handle error appropriately
//     console.error(error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };
