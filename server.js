const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const connectDb = require("./config/db");
require("dotenv").config();
const subscriptionRoute = require("./routes/subscriptionRoute");
const authMiddleware = require("./middleware/authMiddleware");
const authRoute = require("./routes/authRoute");
const postRoute = require("./routes/postRoute");
const storyRoute = require("./routes/storyRoute");
const userRoute = require("./routes/userRoute");
const jobRoute = require("./routes/jobRoute");
const schoolRoute = require("./routes/schoolRoute");
const blogRoute = require("./routes/blogRoute");
const youTubeSyncRoute = require("./routes/youTubeSyncRoute");
const coursePageRoutes = require("./routes/coursePageRoutes");
const passport = require("./controllers/googleController");
const helmet = require("helmet");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

const allowedOrigins = [
  "https://nihongomax.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

connectDb();

/* ===================== ROUTES ===================== */

app.use("/auth", authRoute);
app.use("/users", postRoute);
app.use("/users", storyRoute);
app.use("/users", authMiddleware, userRoute);
app.use("/candidates", authMiddleware, jobRoute);
app.use("/students", authMiddleware, schoolRoute);
app.use("/youtube", youTubeSyncRoute);
app.use("/api/blogs", blogRoute);
app.use("/api/subscriptions", subscriptionRoute);
app.use("/api/course-pages", coursePageRoutes);

// Admin
app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
});

app.use("/", require("./routes/videos"));

/* ===================== SERVER ===================== */

const server = http.createServer(app);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
