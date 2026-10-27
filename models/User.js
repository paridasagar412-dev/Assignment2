const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  // New signups are normal customers. Set admin manually in the database when needed.
  role: { type: String, enum: ["customer", "user", "admin"], default: "customer" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);