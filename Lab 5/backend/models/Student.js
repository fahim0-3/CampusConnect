const mongoose = require("mongoose");
const Counter = require("./Counter");
const { EMAIL_REGEX } = require("../middleware/validateStudent");

/**
 * Student document.
 *
 * Fields are exactly the four from Lab 3 (name, email, course, semester) plus
 * the integer `id` that keeps the public JSON contract unchanged.
 *
 * Data-integrity constraint: `email` carries a unique index. A student's email
 * is the natural business key of the record, so two documents sharing one
 * address almost always means a duplicate submission rather than two people.
 * Enforcing it in the database (not only in the route handler) means the rule
 * still holds if a second service, a migration script, or a direct shell
 * insert ever writes to this collection.
 */
const studentSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Name is required and cannot be empty"],
      trim: true,
      minlength: [1, "Name is required and cannot be empty"]
    },
    email: {
      type: String,
      required: [true, "A valid email address is required (e.g. user@example.com)"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [EMAIL_REGEX, "A valid email address is required (e.g. user@example.com)"]
    },
    course: {
      type: String,
      required: [true, "Course is required and cannot be empty"],
      trim: true,
      minlength: [1, "Course is required and cannot be empty"]
    },
    semester: {
      type: Number,
      required: [true, "Semester must be a positive integer between 1 and 8"],
      min: [1, "Semester must be a positive integer between 1 and 8"],
      max: [8, "Semester must be a positive integer between 1 and 8"],
      validate: {
        validator: Number.isInteger,
        message: "Semester must be a positive integer between 1 and 8"
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      // Emit the same JSON shape Lab 3 emitted: id / name / email / course /
      // semester, with Mongo's internal _id hidden from every client.
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      }
    }
  }
);

// Assign the next integer id immediately before the first save.
studentSchema.pre("save", async function (next) {
  if (this.isNew && this.id === undefined) {
    try {
      this.id = await Counter.nextValue("studentId");
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Student", studentSchema);
