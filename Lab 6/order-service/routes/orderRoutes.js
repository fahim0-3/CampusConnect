const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");

const router = express.Router();

function buildIdFilter(rawId) {
  if (/^\d+$/.test(rawId)) {
    return { id: Number(rawId) };
  }
  if (mongoose.Types.ObjectId.isValid(rawId) && String(rawId).length === 24) {
    return { _id: new mongoose.Types.ObjectId(rawId) };
  }
  return null;
}

/**
 * Helper to perform inter-service GET with timeout and error handling.
 * Returns { ok: true, data } or throws an object with { status, error, message, service }.
 */
async function fetchService(url, serviceName, resourceId, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      const err = new Error(`${serviceName} resource with ID ${resourceId} not found`);
      err.status = 404;
      err.service = serviceName;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`${serviceName} returned status ${response.status}`);
      err.status = 503;
      err.service = serviceName;
      throw err;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.status === 404) {
      throw err;
    }

    // Network error / timeout / unreachable -> 503 Service Unavailable
    const error503 = new Error(
      `${serviceName} is unavailable or unreachable at ${url} (${err.name === "AbortError" ? "Request Timeout" : err.message})`
    );
    error503.status = 503;
    error503.service = serviceName;
    error503.originalError = err.message;
    throw error503;
  }
}

// GET /orders - list all orders
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = Number(req.query.userId);
    if (req.query.productId) filter.productId = Number(req.query.productId);
    if (req.query.status) filter.status = req.query.status;

    const orders = await Order.find(filter).sort({ id: -1 });
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id - get order by ID
router.get("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Order ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `Order with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
});

// POST /orders - create new order with inter-service verification
router.post("/", async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;

    // 1. Validate request body
    if (userId === undefined || userId === null || isNaN(Number(userId))) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'userId' is required and must be a valid number",
        timestamp: new Date().toISOString()
      });
    }

    if (productId === undefined || productId === null || isNaN(Number(productId))) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'productId' is required and must be a valid number",
        timestamp: new Date().toISOString()
      });
    }

    const orderQty = quantity !== undefined ? Number(quantity) : 1;
    if (!Number.isInteger(orderQty) || orderQty <= 0) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'quantity' must be a positive integer >= 1",
        timestamp: new Date().toISOString()
      });
    }

    const userServiceUrl = process.env.USER_SERVICE_URL || "http://user-service:3001";
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || "http://product-service:3002";
    const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 3000;

    // 2. Inter-Service Call: Validate User
    const userTargetUrl = `${userServiceUrl}/users/${userId}`;
    console.log(`[Order Service] Verifying user via: GET ${userTargetUrl}`);
    let userData;
    try {
      userData = await fetchService(userTargetUrl, "User Service", userId, timeoutMs);
    } catch (err) {
      return res.status(err.status || 503).json({
        status: err.status || 503,
        error: err.status === 404 ? "Not Found" : "Service Unavailable",
        message: err.message,
        targetService: "User Service",
        targetUrl: userTargetUrl,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Inter-Service Call: Validate Product
    const productTargetUrl = `${productServiceUrl}/products/${productId}`;
    console.log(`[Order Service] Verifying product via: GET ${productTargetUrl}`);
    let productData;
    try {
      productData = await fetchService(productTargetUrl, "Product Service", productId, timeoutMs);
    } catch (err) {
      return res.status(err.status || 503).json({
        status: err.status || 503,
        error: err.status === 404 ? "Not Found" : "Service Unavailable",
        message: err.message,
        targetService: "Product Service",
        targetUrl: productTargetUrl,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Calculate total amount
    const unitPrice = Number(productData.price);
    const totalAmount = Number((unitPrice * orderQty).toFixed(2));

    // 5. Create Order in order_db
    const newOrder = await Order.create({
      userId: Number(userId),
      productId: Number(productId),
      quantity: orderQty,
      unitPrice,
      totalAmount,
      status: "CONFIRMED",
      userSnapshot: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department
      },
      productSnapshot: {
        id: productData.id,
        name: productData.name,
        category: productData.category,
        price: productData.price
      }
    });

    console.log(`[Order Service] Order #${newOrder.id} created successfully for User #${userId} and Product #${productId}`);

    res.setHeader("Location", `/orders/${newOrder.id}`);
    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
