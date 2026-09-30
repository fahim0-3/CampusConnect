require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { connectDatabase } = require("./config/db");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
const PORT = process.env.PORT || process.env.ORDER_SERVICE_PORT || 3003;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://user-service:3001";
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://product-service:3002";

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
    service: "CampusConnect Order Service",
    version: "1.0.0",
    responsibility: "Create and retrieve Orders; validate referenced User and Product data through APIs",
    port: PORT,
    dependencies: {
      userServiceUrl: USER_SERVICE_URL,
      productServiceUrl: PRODUCT_SERVICE_URL
    },
    endpoints: {
      "GET /health": "Service health and DB connection status",
      "GET /orders": "List all orders",
      "GET /orders/:id": "Get order by ID",
      "POST /orders": "Create new order (validates user and product via REST APIs)"
    },
    database: "order_db (Order-owned)"
  });
});

// Health check
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const state = states[mongoose.connection.readyState] || "unknown";

  res.status(state === "connected" ? 200 : 503).json({
    service: "order-service",
    status: state === "connected" ? "ok" : "degraded",
    database: {
      state,
      name: mongoose.connection.name || "order_db",
      host: mongoose.connection.host || null
    },
    dependencies: {
      userServiceUrl: USER_SERVICE_URL,
      productServiceUrl: PRODUCT_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
});

// Resource routes
app.use("/orders", orderRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found on Order Service`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Order Service Error]:", err);
  res.status(500).json({
    status: 500,
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    timestamp: new Date().toISOString()
  });
});

async function start() {
  try {
    await connectDatabase("order_db");

    app.listen(PORT, () => {
      console.log("====================================================");
      console.log(` CampusConnect Order Service running on port ${PORT}`);
      console.log(` - Base URL:        http://localhost:${PORT}/orders`);
      console.log(` - Health:          http://localhost:${PORT}/health`);
      console.log(` - User Service:    ${USER_SERVICE_URL}`);
      console.log(` - Product Service: ${PRODUCT_SERVICE_URL}`);
      console.log(" - Database:        order_db (Order-owned)");
      console.log("====================================================");
    });
  } catch (err) {
    console.error("[Order Service] Failed to start:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
