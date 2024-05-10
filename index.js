require("dotenv").config();

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


