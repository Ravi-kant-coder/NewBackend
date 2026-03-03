const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const connectDb = require("./config/db");
require("dotenv").config();

const authMiddleware = require("./middleware/authMiddleware");

const authRoute = require("./routes/authRoute");
const postRoute = require("./routes/postRoute");
const storyRoute = require("./routes/storyRoute");
const userRoute = require("./routes/userRoute");
const jobRoute = require("./routes/jobRoute");
const schoolRoute = require("./routes/schoolRoute");
const blogRoute = require("./routes/blogRoute");
const youTubeSyncRoute = require("./routes/youTubeSyncRoute");

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

/* ===================== ROUTES ===================== */

// Public auth routes
app.use("/auth", authRoute);

// Protected routes
app.use("/users", authMiddleware, postRoute);
app.use("/users", authMiddleware, storyRoute);
app.use("/users", authMiddleware, userRoute);
app.use("/candidates", authMiddleware, jobRoute);
app.use("/students", authMiddleware, schoolRoute);
app.use("/youtube", authMiddleware, youTubeSyncRoute);

// Blog routes (public GET, protected write handled inside route file)
app.use("/blogs", blogRoute);

// Other routes
app.use("/", require("./routes/videos"));

/* ===================== SERVER ===================== */

const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
