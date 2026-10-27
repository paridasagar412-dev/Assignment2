const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "shipped", "cancelled"], default: "pending" },
  items: [{ bookTitle: String, quantity: { type: Number, min: 1, default: 1 } }]
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);