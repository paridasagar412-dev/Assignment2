const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." }
});

function validationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}

function makeToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

router.post("/register", authLimiter,
  body("name").trim().isLength({ min: 2, max: 80 }),
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  validationError,
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ success: false, message: "Email already registered." });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password: hashedPassword });
      res.status(201).json({
        success: true,
        message: "Registration successful.",
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) { next(err); }
  }
);

router.post("/login", authLimiter,
  body("email").trim().isEmail().normalizeEmail(),
  body("password").isString().notEmpty(),
  validationError,
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: req.body.email }).select("+password");
      if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid email or password." });
      }
      const token = makeToken(user);
      res.json({
        success: true,
        message: "Login successful.",
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) { next(err); }
  }
);

router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role }
  });
});

module.exports = router;