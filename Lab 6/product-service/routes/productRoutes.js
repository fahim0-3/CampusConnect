const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

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

// GET /products - list all products
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const products = await Product.find(filter).sort({ id: 1 });
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

// GET /products/:id - get product by ID
router.get("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Product ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const product = await Product.findOne(filter);
    if (!product) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `Product with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// POST /products - create new product
router.post("/", async (req, res, next) => {
  try {
    const { name, category, price, stock, description, id } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'name' is required and must be non-empty",
        timestamp: new Date().toISOString()
      });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'price' is required and must be a non-negative number",
        timestamp: new Date().toISOString()
      });
    }

    const productData = {
      name: name.trim(),
      category: category || "General",
      price: Number(price),
      stock: stock !== undefined ? Number(stock) : 10,
      description: description || ""
    };
    if (id !== undefined && Number.isInteger(Number(id))) {
      productData.id = Number(id);
    }

    const product = await Product.create(productData);

    res.setHeader("Location", `/products/${product.id}`);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /products/:id - update product
router.put("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Product ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const { name, category, price, stock, description } = req.body;
    const product = await Product.findOne(filter);
    if (!product) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `Product with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (price !== undefined && !isNaN(Number(price))) product.price = Number(price);
    if (stock !== undefined && !isNaN(Number(stock))) product.stock = Number(stock);
    if (description !== undefined) product.description = description;

    await product.save();
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id - delete product
router.delete("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Product ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const deleted = await Product.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `Product with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 200,
      message: `Product ${req.params.id} successfully deleted`,
      deletedProduct: deleted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
