require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const { getServiceRegistry } = require("./config/services");
const { createGatewayLogger } = require("./middleware/logger");

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 5000;
const registry = getServiceRegistry();

// Enable CORS for web clients
app.use(cors());

// Centralized request logging middleware
app.use(createGatewayLogger(registry));

// Helper for centralized error handling when downstream services are unreachable
function handleProxyError(err, req, res, serviceName, targetUrl) {
  console.error(`[GATEWAY ERROR] Downstream service '${serviceName}' unreachable at ${targetUrl}:`, err.message);

  if (!res.headersSent) {
    const statusCode = err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT" ? 503 : 502;
    res.status(statusCode).json({
      status: statusCode,
      error: statusCode === 503 ? "Service Unavailable" : "Bad Gateway",
      message: `Downstream ${serviceName} is unreachable or timed out at ${targetUrl}`,
      targetService: serviceName,
      targetUrl: `${targetUrl}${req.originalUrl}`,
      originalError: err.message,
      gateway: "CampusConnect API Gateway",
      timestamp: new Date().toISOString()
    });
  }
}

function makeProxy(prefix, targetUrl, serviceName) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    timeout: 5000,
    proxyTimeout: 5000,
    pathFilter: (path, req) => path.startsWith(prefix),
    on: {
      proxyReq: fixRequestBody,
      error: (err, req, res) => handleProxyError(err, req, res, serviceName, targetUrl)
    },
    onError: (err, req, res) => handleProxyError(err, req, res, serviceName, targetUrl)
  });
}

// ---------------------------------------------------------------------------
// 1. Gateway Health Check & Metadata (Handled by Gateway itself, not proxied)
// ---------------------------------------------------------------------------

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "api-gateway",
    status: "ok",
    role: "Single Entry Point / Reverse Proxy",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    serviceDiscovery: {
      type: "Configuration-Based",
      registry: {
        users: { target: registry.users.url, prefix: registry.users.prefix },
        products: { target: registry.products.url, prefix: registry.products.prefix },
        orders: { target: registry.orders.url, prefix: registry.orders.prefix }
      }
    }
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "CampusConnect API Gateway",
    version: "1.0.0",
    description: "Lab 7 - Centralized API Gateway & Service Discovery Layer",
    healthCheck: "/health",
    routes: {
      "/users": `Proxied to ${registry.users.name} (${registry.users.url})`,
      "/products": `Proxied to ${registry.products.name} (${registry.products.url})`,
      "/orders": `Proxied to ${registry.orders.name} (${registry.orders.url})`
    },
    documentation: "All client requests route through this gateway. Internal microservice ports are isolated within the Docker network."
  });
});

// ---------------------------------------------------------------------------
// 2. Reverse Proxy Routes (Configuration-Based Service Discovery)
// Registered at root with pathFilter so prefixes (/users, /products, /orders) are preserved
// ---------------------------------------------------------------------------

app.use(makeProxy(registry.users.prefix, registry.users.url, registry.users.name));
app.use(makeProxy(registry.products.prefix, registry.products.url, registry.products.name));
app.use(makeProxy(registry.orders.prefix, registry.orders.url, registry.orders.name));


// ---------------------------------------------------------------------------
// 3. Fallbacks
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} does not match any registered service on API Gateway`,
    availablePrefixes: [registry.users.prefix, registry.products.prefix, registry.orders.prefix, "/health"],
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error("[GATEWAY UNCAUGHT ERROR]:", err);
  if (!res.headersSent) {
    res.status(500).json({
      status: 500,
      error: "Internal Gateway Error",
      message: err.message || "An unexpected error occurred at the API Gateway",
      timestamp: new Date().toISOString()
    });
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log("===============================================================");
  console.log(` CampusConnect API Gateway running on port ${PORT}`);
  console.log(` - Public Gateway URL:  http://localhost:${PORT}`);
  console.log(` - Health Check:        http://localhost:${PORT}/health`);
  console.log(" - Service Routing Table (Config-driven):");
  console.log(`     /users/*    --> ${registry.users.url}`);
  console.log(`     /products/* --> ${registry.products.url}`);
  console.log(`     /orders/*   --> ${registry.orders.url}`);
  console.log("===============================================================");
});

module.exports = app;
