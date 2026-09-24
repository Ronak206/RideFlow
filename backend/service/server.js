const mongoose = require("mongoose");

async function connectToDB() {
  try {
    await mongoose
      .connect(process.env.MONGO_URI)
      .then(console.log("MongoDB Connected!!"));
  } catch (error) {
    console.error("Server startup error:", error);
  }
}

module.exports = { connectToDB };
