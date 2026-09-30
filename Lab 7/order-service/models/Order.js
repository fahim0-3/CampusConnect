const mongoose = require("mongoose");
const Counter = require("./Counter");

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true
    },
    userId: {
      type: Number,
      required: [true, "userId is required"]
    },
    productId: {
      type: Number,
      required: [true, "productId is required"]
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"]
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPED", "CANCELLED"],
      default: "CONFIRMED"
    },
    userSnapshot: {
      id: Number,
      name: String,
      email: String,
      role: String,
      department: String
    },
    productSnapshot: {
      id: Number,
      name: String,
      category: String,
      price: Number
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

orderSchema.pre("save", async function (next) {
  if (this.isNew && this.id === undefined) {
    try {
      this.id = await Counter.nextValue("orderId");
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
