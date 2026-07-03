process.env.TZ = process.env.TZ || "Asia/Kolkata"; // hospital-local time for all Date math

require("dotenv").config();

const app = require("../app");
const connectDB = require("../config/db");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      statusCode: STATUS.INTERNAL_SERVER_ERROR,
      message: MESSAGES.COMMON.DB_CONNECTION_FAILED
    });
  }
}

module.exports = handler;