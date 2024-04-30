require("dotenv").config();

// Install the required dependencies:
// npm install express socket.io

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
    
const app = express();
const server = http.createServer(app);     
// const io = socketIo(server);

const cors = require("cors");
const mongoose = require("mongoose");
const sls = require("serverless-http");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

const socketIO = require("socket.io");  
const bodyParser = require("body-parser"); // Import body-parser middleware 




app.use(bodyParser.json());

// for FCM
process.env.GOOGLE_APPLICATION_CREDENTIALS;

// for FCM
initializeApp({
  credential: applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

mongoose
  .connect(process.env.DATABASE_CLOUD)
  .then((res) => {
    console.log("Database connected");
  })
  .catch((error) => {
    console.log(error);
  });

app.use(express.json({ limit: "50mb" }));
// cors
if (process.env.NODE_ENV == "development") {
  app.use(cors({ origin: `${process.env.CLIENT_URL}` }));
}

const userRoutes = require("./routes/user");
const profileRoutes = require("./routes/profile");
const chatRoutes = require("./routes/chat");

app.use("/api", userRoutes);
app.use("/api", profileRoutes);
app.use("/api", chatRoutes);

// server.js


app.use(cors({
  origin: 'http://localhost:3000'
}));








const port =  7000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



app.get("/", async (req, res, next) => {
  res
    .status(200)
    .send(`This is IVO project working at port ${port} !!!!!!!!!`);
});

console.log("home page");





// otp
// Account SID

// AC5dc32628e38c2686a63c46b93d86e3ec

// Auth Token

// d0f327b0f02338f119789c2138246507



const accountSid = 'AC5dc32628e38c2686a63c46b93d86e3ec';
const authToken = 'd0f327b0f02338f119789c2138246507';
const client = require('twilio')(accountSid, authToken);

// client.messages
//     .create({
//         body: 'hello ',
//         to: '+91 8937865552'
//     })
//     .then(message => console.log(message.sid))
//   .done();
    


// Twilio Credentials
// const accountSid = 'YOUR_TWILIO_ACCOUNT_SID';
// const authToken = 'YOUR_TWILIO_AUTH_TOKEN';
// const client = twilio(accountSid, authToken);

// Generate random OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

// In-memory storage for OTPs (Replace this with a persistent storage in a production environment)
const otps = {};

// Send OTP via SMS
function sendOTPviaSMS(phoneNumber, otp) {
    return client.messages.create({
        body: `Your OTP for verification is: ${otp}`,
        to: phoneNumber,
        from: '+1 910 557 9362'
    });
}

// Verify OTP
function verifyOTP(phoneNumber, otp) {
    return otps[phoneNumber] === otp;
}

app.use(bodyParser.json());

// Request for OTP
app.post('/request-otp', (req, res) => {
    const { phoneNumber } = req.body;
    const otp = generateOTP();
    otps[phoneNumber] = otp;

    sendOTPviaSMS(phoneNumber, otp)
        .then(() => {
            res.status(200).send("OTP sent successfully!");
        })
        .catch(err => {
            console.error("Error sending OTP:", err);
            res.status(500).send("Failed to send OTP.");
        });
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;
  const isValid = verifyOTP(phoneNumber, otp);
  
    if (isValid) {
        res.status(200).send("OTP verified successfully!");
    } else {
        res.status(400).send("Invalid OTP. Please try again.");
    }
});