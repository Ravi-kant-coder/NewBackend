const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connection established");
  } catch (error) {
    console.error("error connecting to database", error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
