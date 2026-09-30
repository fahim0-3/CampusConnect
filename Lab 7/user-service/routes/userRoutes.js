const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");

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

// GET /users - list all users
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;

    const users = await User.find(filter).sort({ id: 1 });
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id - get single user
router.get("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "User ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `User with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// POST /users - create a new user
router.post("/", async (req, res, next) => {
  try {
    const { name, email, role, department, id } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'name' is required and must be non-empty",
        timestamp: new Date().toISOString()
      });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "Field 'email' is required and must be a valid email address",
        timestamp: new Date().toISOString()
      });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({
        status: 409,
        error: "Conflict",
        message: `User with email '${email}' already exists`,
        timestamp: new Date().toISOString()
      });
    }

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || "student",
      department: department || "Computer Science"
    };
    if (id !== undefined && Number.isInteger(Number(id))) {
      userData.id = Number(id);
    }

    const user = await User.create(userData);

    res.setHeader("Location", `/users/${user.id}`);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /users/:id - update user
router.put("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "User ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const { name, email, role, department } = req.body;
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `User with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (department) user.department = department;

    await user.save();
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:id - delete user
router.delete("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) {
      return res.status(400).json({
        status: 400,
        error: "Bad Request",
        message: "User ID must be an integer or a 24-character ObjectId",
        timestamp: new Date().toISOString()
      });
    }

    const deleted = await User.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: `User with ID ${req.params.id} not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 200,
      message: `User ${req.params.id} successfully deleted`,
      deletedUser: deleted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
