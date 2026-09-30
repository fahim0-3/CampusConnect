const mongoose = require("mongoose");
const Counter = require("./Counter");

const productSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },
    category: {
      type: String,
      default: "General"
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"]
    },
    stock: {
      type: Number,
      default: 10,
      min: [0, "Stock cannot be negative"]
    },
    description: {
      type: String,
      default: ""
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

productSchema.pre("save", async function (next) {
  if (this.isNew && this.id === undefined) {
    try {
      this.id = await Counter.nextValue("productId");
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
