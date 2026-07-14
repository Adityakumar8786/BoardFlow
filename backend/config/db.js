// backend/config/db.js
// Purpose: Establishes and exports a single MongoDB connection using Mongoose.
// Why a separate file: keeps connection logic isolated from server.js (separation of concerns).

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
