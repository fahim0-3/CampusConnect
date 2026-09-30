require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const yaml = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const mongoose = require("mongoose");

const { connectDatabase } = require("./config/db");
const studentRoutes = require("./routes/studentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------
 * CORS
 *
 * The React dev server runs on http://localhost:5173 while this API runs on
 * http://localhost:5000. Two different ports are two different origins, so
 * without this middleware the browser blocks every fetch() the React client
 * makes. Allowed origins come from CORS_ORIGINS in .env; requests with no
 * Origin header (Postman, curl, the Android app) are always permitted because
 * the same-origin policy is a browser rule, not an HTTP rule.
 * ---------------------------------------------------------------------- */
const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["Location"]
  })
);

app.use(express.json());

// Reject malformed JSON bodies with the same 400 envelope as field validation.
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

/* -------------------------------------------------------------------------
 * Service metadata and health
 * ---------------------------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({
    name: "Student Management REST API",
    version: "2.0.0",
    description: "Lab 4 - RESTful Web Service backed by MongoDB Atlas",
    storage: "MongoDB Atlas (Mongoose)",
    documentation: "/api-docs",
    endpoints: {
      "GET /students": "List all students (supports ?course= and ?semester=)",
      "GET /students/:id": "Get student by ID",
      "POST /students": "Create a new student",
      "PUT /students/:id": "Full update of a student",
      "PATCH /students/:id": "Partial update of a student",
      "DELETE /students/:id": "Delete a student by ID"
    }
  });
});

app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const state = states[mongoose.connection.readyState] || "unknown";

  res.status(state === "connected" ? 200 : 503).json({
    status: state === "connected" ? "ok" : "degraded",
    database: {
      state,
      name: mongoose.connection.name || null,
      host: mongoose.connection.host || null
    },
    timestamp: new Date().toISOString()
  });
});

/* -------------------------------------------------------------------------
 * Swagger UI
 * ---------------------------------------------------------------------- */
const openApiPath = path.join(__dirname, "openapi.yaml");
if (fs.existsSync(openApiPath)) {
  const swaggerDocument = yaml.load(openApiPath);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get("/openapi.json", (req, res) => res.json(swaggerDocument));
}

/* -------------------------------------------------------------------------
 * Resource routes
 * ---------------------------------------------------------------------- */
app.use("/students", studentRoutes);

/* -------------------------------------------------------------------------
 * Fallbacks
 * ---------------------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: 500,
    error: "Internal Server Error",
    message: "An unexpected error occurred on the server",
    timestamp: new Date().toISOString()
  });
});

/* -------------------------------------------------------------------------
 * Startup
 *
 * The database connection is established before the HTTP listener opens, so
 * the service never accepts a request it cannot fulfil.
 * ---------------------------------------------------------------------- */
async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log("====================================================");
      console.log(` Express Student REST API (Lab 4) running on port ${PORT}`);
      console.log(` - API Base URL:  http://localhost:${PORT}/students`);
      console.log(` - Swagger UI:    http://localhost:${PORT}/api-docs`);
      console.log(` - Health check:  http://localhost:${PORT}/health`);
      console.log(` - CORS origins:  ${allowedOrigins.join(", ")}`);
      console.log(" - Storage:       MongoDB Atlas (persistent)");
      console.log("====================================================");
    });
  } catch (err) {
    console.error("Failed to start the API:", err.message);
    console.error(
      "Check that MONGODB_URI in .env is correct and that your current IP is on the Atlas Network Access list."
    );
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
