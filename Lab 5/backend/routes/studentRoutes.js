const express = require("express");
const mongoose = require("mongoose");

const Student = require("../models/Student");
const {
  validateStudentInput,
  validateStudentPatch
} = require("../middleware/validateStudent");

const router = express.Router();

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

const errorEnvelope = (status, error, message, extra = {}) => ({
  status,
  error,
  message,
  ...extra,
  timestamp: new Date().toISOString()
});

const notFound = (res, rawId) =>
  res
    .status(404)
    .json(errorEnvelope(404, "Not Found", `Student with ID ${rawId} not found`));

const badId = (res) =>
  res
    .status(400)
    .json(
      errorEnvelope(
        400,
        "Bad Request",
        "Student ID must be an integer or a 24-character MongoDB ObjectId"
      )
    );

/**
 * Resolves a path parameter to a Mongo filter.
 *
 * Lab 3 addressed students by integer id, so `/students/7` must keep working.
 * A 24-character hex ObjectId is accepted as well, because that is what a
 * client reading the collection straight from Atlas would see. Anything else
 * is a malformed identifier and gets 400, exactly as in Lab 3.
 */
function buildIdFilter(rawId) {
  if (/^\d+$/.test(rawId)) {
    return { id: Number(rawId) };
  }
  if (mongoose.Types.ObjectId.isValid(rawId) && String(rawId).length === 24) {
    return { _id: new mongoose.Types.ObjectId(rawId) };
  }
  return null;
}

/** Translates a Mongoose failure into the Lab 3 error envelope. */
function handleWriteError(err, res, next) {
  // Unique index violation on `email` (the chosen data-integrity constraint).
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || { email: 1 })[0];
    return res.status(409).json(
      errorEnvelope(409, "Conflict", "Duplicate value rejected by a database constraint", {
        errors: [
          {
            field,
            message: `A student with this ${field} already exists`
          }
        ]
      })
    );
  }

  // Schema-level validation, e.g. a value that bypassed the middleware.
  if (err && err.name === "ValidationError") {
    return res.status(400).json(
      errorEnvelope(400, "Bad Request", "Validation failed", {
        errors: Object.values(err.errors).map((e) => ({
          field: e.path,
          message: e.message
        }))
      })
    );
  }

  return next(err);
}

/* -------------------------------------------------------------------------
 * 1. GET /students - List all students
 * ---------------------------------------------------------------------- */
router.get("/", async (req, res, next) => {
  try {
    const { course, semester } = req.query;
    const filter = {};

    if (course) {
      // Case-insensitive exact match, matching Lab 3's toLowerCase() compare.
      filter.course = new RegExp(`^${escapeRegex(String(course))}$`, "i");
    }

    if (semester) {
      const sem = parseInt(semester, 10);
      if (!isNaN(sem)) {
        filter.semester = sem;
      }
    }

    const students = await Student.find(filter).sort({ id: 1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * 2. GET /students/:id - Get one student
 * ---------------------------------------------------------------------- */
router.get("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) return badId(res);

    const student = await Student.findOne(filter);
    if (!student) return notFound(res, req.params.id);

    res.status(200).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * 3. POST /students - Create a student
 * ---------------------------------------------------------------------- */
router.post("/", validateStudentInput, async (req, res, next) => {
  try {
    const { name, email, course, semester } = req.body;

    // `new` + `save` rather than `create` so the pre-save hook that allocates
    // the integer id always runs.
    const student = new Student({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      course: course.trim(),
      semester: parseInt(semester, 10)
    });

    await student.save();

    res
      .status(201)
      .location(`/students/${student.id}`)
      .json({
        success: true,
        message: "Student created successfully",
        data: student
      });
  } catch (err) {
    handleWriteError(err, res, next);
  }
});

/* -------------------------------------------------------------------------
 * 4. PUT /students/:id - Full replace
 * ---------------------------------------------------------------------- */
router.put("/:id", validateStudentInput, async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) return badId(res);

    const { name, email, course, semester } = req.body;

    const student = await Student.findOneAndUpdate(
      filter,
      {
        $set: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          course: course.trim(),
          semester: parseInt(semester, 10)
        }
      },
      { new: true, runValidators: true, context: "query" }
    );

    if (!student) return notFound(res, req.params.id);

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student
    });
  } catch (err) {
    handleWriteError(err, res, next);
  }
});

/* -------------------------------------------------------------------------
 * 5. PATCH /students/:id - Partial update
 * ---------------------------------------------------------------------- */
router.patch("/:id", validateStudentPatch, async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) return badId(res);

    const { name, email, course, semester } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (course !== undefined) updates.course = course.trim();
    if (semester !== undefined) updates.semester = parseInt(semester, 10);

    const student = await Student.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true, runValidators: true, context: "query" }
    );

    if (!student) return notFound(res, req.params.id);

    res.status(200).json({
      success: true,
      message: "Student partially updated successfully",
      data: student
    });
  } catch (err) {
    handleWriteError(err, res, next);
  }
});

/* -------------------------------------------------------------------------
 * 6. DELETE /students/:id - Delete a student
 * ---------------------------------------------------------------------- */
router.delete("/:id", async (req, res, next) => {
  try {
    const filter = buildIdFilter(req.params.id);
    if (!filter) return badId(res);

    const student = await Student.findOneAndDelete(filter);
    if (!student) return notFound(res, req.params.id);

    res.status(200).json({
      success: true,
      message: `Student with ID ${student.id} deleted successfully`,
      data: student
    });
  } catch (err) {
    next(err);
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;
