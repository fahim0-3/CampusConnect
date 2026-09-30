const mongoose = require("mongoose");

/**
 * Atomic sequence generator.
 *
 * Lab 3 exposed students through a small integer `id` (1, 2, 3 ...) and Lab 4
 * is explicitly not allowed to redesign the resource. MongoDB's native `_id`
 * is a 24-character ObjectId, so this collection reproduces the Lab 3
 * identifier: one document per sequence, incremented with a single atomic
 * findOneAndUpdate so two concurrent POSTs can never receive the same id.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

counterSchema.statics.nextValue = async function (sequenceName) {
  const counter = await this.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model("Counter", counterSchema);
