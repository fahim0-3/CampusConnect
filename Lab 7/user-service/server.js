require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { connectDatabase } = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;

app.use(cors());
app.use(express.json());

// JSON error handling
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: "Request body is not valid JSON",
      timestamp: new Date().toISOString()
    });
  }
  next(err);
});

// Service root metadata
app.get("/", (req, res) => {
  res.json({
    service: "CampusConnect User Service",
    version: "1.0.0",
    responsibility: "Create, retrieve, update and delete User resources",
    port: PORT,
    endpoints: {
      "GET /health": "Service health and DB connection status",
      "GET /users": "List all users",
      "GET /users/:id": "Get user by ID",
      "POST /users": "Create new user",
      "PUT /users/:id": "Update existing user",
      "DELETE /users/:id": "Delete user by ID"
    },
    database: "user_db (User-owned)"
  });
});

// Health check
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const state = states[mongoose.connection.readyState] || "unknown";

  res.status(state === "connected" ? 200 : 503).json({
    service: "user-service",
    status: state === "connected" ? "ok" : "degraded",
    database: {
      state,
      name: mongoose.connection.name || "user_db",
      host: mongoose.connection.host || null
    },
    timestamp: new Date().toISOString()
  });
});

// Resource routes
app.use("/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found on User Service`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[User Service Error]:", err);
  res.status(500).json({
    status: 500,
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    timestamp: new Date().toISOString()
  });
});

async function seedInitialData() {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("[User Service] Seeding initial user data...");
      await User.create([
        {
          id: 101,
          name: "Alice Johnson",
          email: "alice.johnson@campus.edu",
          role: "student",
          department: "Computer Science"
        },
        {
          id: 102,
          name: "Bob Smith",
          email: "bob.smith@campus.edu",
          role: "student",
          department: "Information Technology"
        }
      ]);
      console.log("[User Service] Initial user data seeded successfully.");
    }
  } catch (err) {
    console.warn("[User Service] Seed check warning:", err.message);
  }
}

async function start() {
  try {
    await connectDatabase("user_db");
    await seedInitialData();

    app.listen(PORT, () => {
      console.log("====================================================");
      console.log(` CampusConnect User Service running on port ${PORT}`);
      console.log(` - Base URL:  http://localhost:${PORT}/users`);
      console.log(` - Health:    http://localhost:${PORT}/health`);
      console.log(" - Database:  user_db (User-owned)");
      console.log("====================================================");
    });
  } catch (err) {
    console.error("[User Service] Failed to start:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
