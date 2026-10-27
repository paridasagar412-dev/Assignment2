const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const Post = require("../models/Post");
const { protect } = require("../middleware/auth");

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: "Too many login attempts. Try again later." });

router.get("/", (req, res) => res.redirect("/posts"));
router.get("/posts", async (req, res, next) => {
  try {
    const posts = await Post.find({ published: true }).populate("author", "name").sort({ createdAt: -1 });
    res.render("posts", { posts });
  } catch (err) { next(err); }
});
router.get("/login", (req, res) => res.render("login", { error: "" }));
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", { error: "Email or password is incorrect." });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.cookie("token", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 1000
    });
    res.redirect("/dashboard");
  } catch (err) { next(err); }
});
router.get("/dashboard", protect, async (req, res, next) => {
  try {
    const posts = req.user.role === "admin"
      ? await Post.find().populate("author", "name").sort({ createdAt: -1 })
      : await Post.find({ author: req.user._id }).sort({ createdAt: -1 });
    res.render("dashboard", { user: req.user, posts });
  } catch (err) { next(err); }
});
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

module.exports = router;