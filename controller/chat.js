const ChatRoom = require("../models/chat/chatroom");
const Chat = require("../models/chat/chatMessages");
const User = require("../models/profile/user");
const { v4: uuidv4 } = require("uuid");
const { getMessaging } = require("firebase-admin/messaging")
// const clientId = `msdkjebjkwdsE12_local_${Math.random().toString(16).slice(3)}`;

// client.setMaxListeners(10000);
// const client = mqtt.connect("mqtt://test.mosquitto.org", {
//   clientId,
// });

// exports.createChatRoom = async (req, res) => {
//   try {
//     var { participants, lastMessage } = req.body;

//     console.log("Request Body:", req.body);

//     var findChatRoom = await ChatRoom.find({ participants: participants });

//     console.log("Existing Chat Rooms:", findChatRoom);

//     if (findChatRoom && findChatRoom.length > 0) {
//       console.log("Chat Room Already Exists");
//       return res.json({ chatRoom: findChatRoom[0] });
//     }

//     var chatroomID = uuidv4();

//     console.log("Creating new Chat Room with ID:", chatroomID);

//     var chatRoom = new ChatRoom({
//       chatroomID,
//       participants,
//       lastMessage,
//     });

//     console.log("New Chat Room Object:", chatRoom);

//     await chatRoom.save();

//     console.log("Chat Room Saved Successfully");

//     return res.json({ chatRoom });
//   } catch (err) {
//     console.error("Error:", err);
//     return res.status(400).json({ error: err.message });
//   }
// };
const SimplePeer = require('simple-peer'); // Make sure to install 'simple-peer' npm package

exports.createChatRoom = async (req, res) => {
  try {
    const { participants, lastMessage } = req.body;

    console.log("Request Body:", req.body);

    const existingChatRoom = await ChatRoom.findOne({ participants: participants });

    console.log("Existing Chat Room:", existingChatRoom);

    if (existingChatRoom) {
      console.log("Chat Room Already Exists");
      return res.json({ chatRoom: existingChatRoom });
    }

    const chatroomID = uuidv4();

    console.log("Creating new Chat Room with ID:", chatroomID);

    const newChatRoom = new ChatRoom({
      chatroomID,
      participants,
      lastMessage,
    });

    console.log("New Chat Room Object:", newChatRoom);

    await newChatRoom.save();

    console.log("Chat Room Saved Successfully");

    // Emit Socket.IO event to notify connected clients about the new chat room
    io.emit('chat room created', newChatRoom);

    // Establish WebRTC connections between participants
    establishWebRTCConnections(newChatRoom);

    return res.json({ chatRoom: newChatRoom });
  } catch (err) {
    console.error("Error:", err);
    return res.status(400).json({ error: err.message });
  }
};

function establishWebRTCConnections(chatRoom) {
  // For each pair of participants, initiate a WebRTC connection
  for (let i = 0; i < chatRoom.participants.length; i++) {
    for (let j = i + 1; j < chatRoom.participants.length; j++) {
      const participantA = chatRoom.participants[i];
      const participantB = chatRoom.participants[j];

      // Create a WebRTC peer for A
      const peerA = new SimplePeer({ initiator: true });

      peerA.on('signal', (signalA) => {
        // Send the signal to participant B
        io.to(participantB).emit('call-signal', { signal: signalA, targetUserId: participantA });
      });

      // Create a WebRTC peer for B
      const peerB = new SimplePeer();

      peerB.on('signal', (signalB) => {
        // Send the signal to participant A
        io.to(participantA).emit('call-signal', { signal: signalB, targetUserId: participantB });
      });

      // Establish WebRTC connection when both participants exchange signals
      peerA.on('connect', () => {
        console.log(`WebRTC connection established between ${participantA} and ${participantB}`);
      });

      peerB.on('connect', () => {
        console.log(`WebRTC connection established between ${participantA} and ${participantB}`);
      });

      // Handle incoming streams
      peerA.on('stream', (stream) => {
        // Broadcast the stream to both participants
        io.to(participantA).emit('remote-stream', { stream, sender: participantB });
        io.to(participantB).emit('remote-stream', { stream, sender: participantA });
      });

      peerB.on('stream', (stream) => {
        // Broadcast the stream to both participants
        io.to(participantA).emit('remote-stream', { stream, sender: participantB });
        io.to(participantB).emit('remote-stream', { stream, sender: participantA });
      });

      // Save the peer instances to close them later
      chatRoom.peers.push(peerA, peerB);
    }
  }
}



exports.getAllChatRoom = async (req, res) => {
  var { id } = req.body;
  var chatRoom = await ChatRoom.find({ participants: { $all: [id] } })
    .populate("participants", "_id images name isOnline updatedAt")
    .sort({ updatedAt: -1 });
  if (chatRoom) {
    // var chat = await Chat.findOne({ recieveID: id, status: "SENT" });
    // if (chat) {
      // getIO(req).emit('chatRoomUpdate', { chatRoom });

    await Chat.updateMany(
      { recieveID: id, status: "SENT" },
      { status: "DELIVERED" }
    );
    // }

    // var age = getAge(profile.dob);
    return res.json({ chatRoom });
  } else {
    return res.status(400).json({ failed: true, chatRoom });
  }
};

exports.getSingleChat = async (req, res) => {
  var { chatroomID, page, limit = 20, targetID } = req.body;

  var chat = await Chat.find({
    chatroomID: chatroomID,
  })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });
  if (chat) {
    // var age = getAge(profile.dob);
    // getIO(req).to(chatroomID).emit('newMessage', { chat });

    await Chat.updateMany(
      {
        $or: [
          { senderID: targetID, status: "SENT" },
          { senderID: targetID, status: "DELIVERED" },
        ],
      },
      { status: "SEEN" }
    );
    return res.json({ chat });
  } else {
    return res.status(400).json({ failed: true, chat });
  }
};

exports.sendSingleChat = (req, res) => {
  var { senderID, msg, messageID, chatroomID, status, recieveID } = req.body;
  status = "SENT";
  var chat = new Chat({
    senderID,
    msg,
    messageID,
    chatroomID,
    status,
    recieveID,
  });

  chat
    .save()
    .then(async (chat) => {
      var sender = await User.findOne({ _id: senderID })
      var user = await User.findOne({ _id: recieveID });
      const receivedToken = user.device_tokens;
      const senderName = sender.name;

      for (let i = 0; i < receivedToken.length; i++) {
        const message = {
          notification: {
            title: senderName,
            body: msg,
            // imageUrl: 'https://media.istockphoto.com/id/178640157/photo/halloween-monster.jpg?s=612x612&w=0&k=20&c=8bXRPczSeB9Vmi4sZHHRUUO7wgfDpwEkniuO-_puhRs=',
          },
          android: {
            notification: {
              icon: 'launcher_icon',
              color: '#7e55c3',
              default_sound: true,
              priority: "high",
            }
          },
          data: {
            context: "likes"
          },
          token: receivedToken[i],
        };

        getMessaging()
          .send(message)
          .then((response) => {
            // res.status(200).json({
            //   message: "Successfully sent message",
            //   token: receivedToken,
            // });
            console.log("Successfully sent message:", response);
          })
          .catch(async (error) => {
            // remove deleted token
            await User.findOneAndUpdate(
              { _id: recieveID },
              { $pull: { device_tokens: receivedToken[i] } }
            );
            // console.log("remove :- " + receivedToken[i]);
            // res.status(400);
            // res.send(error);
            console.log("Error sending message:", error);
          });
      }

      await ChatRoom.findOneAndUpdate(
        { _id: chatroomID },
        { lastMessage: msg, messageBy: senderID }
      );

      // Emit Socket.IO event to notify connected clients about the new message
      getIO(req).to(chatroomID).emit('newMessage', { chat });


      return res.json(chat);
      // update chatroom and if user is online send MQTT, if offline then send push notificiation
      // var params = {
      //   _id: chat._id,
      //   senderID: senderID,
      //   msg: msg,
      //   messageID: messageID,
      //   chatroomID: chatroomID,
      //   status: status,
      //   recieveID: recieveID,
      //   data: "addMessage",
      //   createdAt: chat.createdAt,
      //   updatedAt: chat.updatedAt,
      // };
      // var buffer = new Buffer(params);
      // var string = Buffer.from(JSON.stringify(params)).toString("base64");
      // client.on("connect", async function () {
      // const client = mqtt.connect("mqtt://test.mosquitto.org", {
      //   clientId,
      //   clean: false,
      // });
      // client.connect();
      // await client.publish(recieveID, string, {
      //   qos: 1,
      // });
      // console.log("Called " + recieveID);
      // client.end();
      // response.on("connect", async function () {
      //   console.log("Called " + recieveID);
      // });
      // });
    })
    .catch((err) => {
      return res.status(400).json({ error: err });
    });
};

exports.updateMessageStatus = async (req, res) => {
  var { _id, status } = req.body;
  var chat = await Chat.findOneAndUpdate({ _id, _id }, { status: status });
  if (chat) {
    // var params = {
    //   _id: chat._id,
    //   messageID: chat.messageID,
    //   status: status,
    //   data: "updateStatus",
    // };
    // var string = Buffer.from(JSON.stringify(params)).toString("base64");
    // var sender = chat.senderID.toString();

    //  client.publish(sender, string, {
    //   qos: 1,
    // });
    // client.end();
    // console.log("Called update STATUS " + sender);
    return res.json(chat);
  }
};
