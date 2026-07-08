require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const medicalRecordRoutes = require("./routes/medicalRecordRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const nodeRoutes = require("./routes/nodeRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const patientAuthRoutes = require("./routes/patientAuthRoutes");
const patientSelfRoutes = require("./routes/patientSelfRoutes");
const mongoose = require("mongoose");

const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const { sendSuccess } = require("./utils/apiResponse");
const STATUS = require("./constants/statusCodes");
const MESSAGES = require("./constants/messages");

const app = express();

// Trust the single reverse proxy so req.ip and rate limiting use the real client IP from X-Forwarded-For
app.set("trust proxy", 1);

// Used for secure HTTP headers
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Middleware which logs requests
app.use(morgan("dev"));

// Read JSON data sent from frontend/Postman
app.use(express.json());

// Parse cookies (httpOnly refresh token for the staff web app)
app.use(cookieParser());

app.get("/api/db-status", (req, res) =>
  sendSuccess(res, STATUS.OK, MESSAGES.COMMON.DB_STATUS_RETRIEVED, {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    dbName: mongoose.connection.name,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/nodes", nodeRoutes);
app.use("/api/permissions", permissionRoutes);

// Patient-facing app (mobile) routes
app.use("/api/patient/auth", patientAuthRoutes);
app.use("/api/patient", patientSelfRoutes);

// Default route
app.get("/", (req, res) =>
  sendSuccess(res, STATUS.OK, MESSAGES.COMMON.API_RUNNING)
);

// Health endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// Unknown routes -> JSON 404 envelope
app.use(notFound);

// Global error handler; must stay the last middleware
app.use(errorHandler);

module.exports = app;