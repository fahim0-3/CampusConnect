const mongoose = require("mongoose");
const Counter = require("./Counter");

const userSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Name is required and cannot be empty"],
      trim: true
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      unique: true
    },
    role: {
      type: String,
      enum: ["student", "faculty", "staff", "admin"],
      default: "student"
    },
    department: {
      type: String,
      default: "Computer Science"
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      }
    }
  }
);

userSchema.pre("save", async function (next) {
  if (this.isNew && this.id === undefined) {
    try {
      this.id = await Counter.nextValue("userId");
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
