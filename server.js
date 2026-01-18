const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const connectDb = require("./config/db");
require("dotenv").config();

const authMiddleware = require("./middleware/authMiddleware");

// Import routes
const authRoute = require("./routes/authRoute");
const postRoute = require("./routes/postRoute");
const userRoute = require("./routes/userRoute");
const jobRoute = require("./routes/jobRoute");
const schoolRoute = require("./routes/schoolRoute");
const messageRoute = require("./routes/messageRoute");
const youTubeSyncRoute = require("./routes/youTubeSyncRoute");

const {
  saveMessage,
  deleteMessage,
  editMessage,
} = require("./controllers/messageController");

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
};
app.use(cors(corsOptions));

connectDb();

/* Serve all static files (including /public/free-classes)
   so old HTML, images, and audio files work directly */
app.use(express.static(path.join(__dirname, "public")));

/* Whitelist for /free-classes and its subpaths (no auth needed)
   Example: /free-classes/class1.html, /free-classes/images/img1.png */
app.get(/^\/free-classes(\/.*)?$/, (req, res, next) => {
  next(); // let Express static serve the file
});

// PUBLIC AUTH ROUTES (no middleware)
app.use("/auth", authRoute);

// Protected API routes (authMiddleware applied)
app.use("/users", authMiddleware, postRoute);
app.use("/users", authMiddleware, userRoute);
app.use("/candidates", authMiddleware, jobRoute);
app.use("/students", authMiddleware, schoolRoute);
app.use("/messages", authMiddleware, messageRoute);
app.use("/youtube", authMiddleware, youTubeSyncRoute);
app.use("/", require("./routes/videos"));

// ----------Yahan se Create HTTP + socket code shuru hota hai----------

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("join", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`✅ User ${userId} joined with socket ${socket.id}`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { sender, receiver, text } = data;
      const newMessage = await saveMessage({ sender, receiver, text });
      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("receiveMessage", newMessage);
      socket.emit("receiveMessage", newMessage);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
  });

  socket.on("editMessage", async (data) => {
    try {
      const updatedMessage = await editMessage(data);
      const { sender, receiver } = updatedMessage;
      const senderSocketId = onlineUsers.get(sender.toString());
      const receiverSocketId = onlineUsers.get(receiver.toString());
      if (senderSocketId)
        io.to(senderSocketId).emit("messageEdited", updatedMessage);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("messageEdited", updatedMessage);
    } catch (err) {
      console.error("❌ Error editing message:", err);
    }
  });

  socket.on("deleteMessage", async (data) => {
    try {
      const deletedMessage = await deleteMessage(data);
      const { sender, receiver } = deletedMessage;
      const senderSocketId = onlineUsers.get(sender.toString());
      const receiverSocketId = onlineUsers.get(receiver.toString());
      if (senderSocketId)
        io.to(senderSocketId).emit("messageDeleted", deletedMessage);
      if (receiverSocketId)
        io.to(receiverSocketId).emit("messageDeleted", deletedMessage);
    } catch (err) {
      console.error("❌ Error deleting message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () =>
  console.log(`MongoDB connected and Server listening on ${PORT}`),
);
