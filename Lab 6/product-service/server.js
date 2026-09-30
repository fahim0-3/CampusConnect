require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { connectDatabase } = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const Product = require("./models/Product");

const app = express();
const PORT = process.env.PORT || process.env.PRODUCT_SERVICE_PORT || 3002;

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
    service: "CampusConnect Product Service",
    version: "1.0.0",
    responsibility: "Manage Product resources used by the application",
    port: PORT,
    endpoints: {
      "GET /health": "Service health and DB connection status",
      "GET /products": "List all products",
      "GET /products/:id": "Get product by ID",
      "POST /products": "Create new product",
      "PUT /products/:id": "Update existing product",
      "DELETE /products/:id": "Delete product by ID"
    },
    database: "product_db (Product-owned)"
  });
});

// Health check
app.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const state = states[mongoose.connection.readyState] || "unknown";

  res.status(state === "connected" ? 200 : 503).json({
    service: "product-service",
    status: state === "connected" ? "ok" : "degraded",
    database: {
      state,
      name: mongoose.connection.name || "product_db",
      host: mongoose.connection.host || null
    },
    timestamp: new Date().toISOString()
  });
});

// Resource routes
app.use("/products", productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found on Product Service`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Product Service Error]:", err);
  res.status(500).json({
    status: 500,
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    timestamp: new Date().toISOString()
  });
});

async function seedInitialData() {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("[Product Service] Seeding initial product data...");
      await Product.create([
        {
          id: 501,
          name: "Cloud Computing & SOA Textbook",
          category: "Books",
          price: 49.99,
          stock: 30,
          description: "Required textbook for Web Services & SOA Laboratory"
        },
        {
          id: 502,
          name: "CampusConnect University Hoodie",
          category: "Merchandise",
          price: 29.99,
          stock: 50,
          description: "Official CampusConnect navy blue embroidered hoodie"
        }
      ]);
      console.log("[Product Service] Initial product data seeded successfully.");
    }
  } catch (err) {
    console.warn("[Product Service] Seed check warning:", err.message);
  }
}

async function start() {
  try {
    await connectDatabase("product_db");
    await seedInitialData();

    app.listen(PORT, () => {
      console.log("====================================================");
      console.log(` CampusConnect Product Service running on port ${PORT}`);
      console.log(` - Base URL:  http://localhost:${PORT}/products`);
      console.log(` - Health:    http://localhost:${PORT}/health`);
      console.log(" - Database:  product_db (Product-owned)");
      console.log("====================================================");
    });
  } catch (err) {
    console.error("[Product Service] Failed to start:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
