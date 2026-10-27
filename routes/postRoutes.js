const express = require("express");
const mongoose = require("mongoose");
const { body, validationResult } = require("express-validator");
const Post = require("../models/Post");
const { protect } = require("../middleware/auth");
const { upload, deleteImage } = require("../middleware/upload");

const router = express.Router();
router.use(protect);

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
}
function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
function canManage(post, user) {
  return post.author.toString() === user._id.toString() || user.role === "admin";
}
function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).slice(0, 10);
  if (typeof tags === "string" && tags.trim()) return tags.split(",").map(t => t.trim()).filter(Boolean).slice(0, 10);
  return [];
}

router.post("/", body("title").trim().isLength({ min: 1, max: 160 }),
  body("content").trim().isLength({ min: 1, max: 20000 }), validate,
  async (req, res, next) => {
    try {
      const post = await Post.create({
        title: req.body.title,
        content: req.body.content,
        tags: parseTags(req.body.tags),
        published: req.body.published === true || req.body.published === "true",
        author: req.user._id
      });
      res.status(201).json({ success: true, post });
    } catch (err) { next(err); }
  }
);

router.get("/", async (req, res, next) => {
  try {
    const posts = await Post.find({ author: req.user._id }).populate("author", "name email").sort({ createdAt: -1 });
    res.json({ success: true, count: posts.length, posts });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid post ID." });
    const post = await Post.findById(req.params.id).populate("author", "name");
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.author._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You cannot view this post." });
    }
    res.json({ success: true, post });
  } catch (err) { next(err); }
});

router.put("/:id", body("title").optional().trim().isLength({ min: 1, max: 160 }),
  body("content").optional().trim().isLength({ min: 1, max: 20000 }), validate,
  async (req, res, next) => {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid post ID." });
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ success: false, message: "Post not found." });
      if (!canManage(post, req.user)) return res.status(403).json({ success: false, message: "Not allowed to update this post." });
      if (req.body.title !== undefined) post.title = req.body.title;
      if (req.body.content !== undefined) post.content = req.body.content;
      if (req.body.tags !== undefined) post.tags = parseTags(req.body.tags);
      if (req.body.published !== undefined) post.published = req.body.published === true || req.body.published === "true";
      await post.save();
      res.json({ success: true, message: "Post updated.", post });
    } catch (err) { next(err); }
  }
);

router.delete("/:id", async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid post ID." });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (!canManage(post, req.user)) return res.status(403).json({ success: false, message: "Not allowed to delete this post." });
    deleteImage(post.image);
    await post.deleteOne();
    res.json({ success: true, message: "Post deleted." });
  } catch (err) { next(err); }
});

router.post("/:id/image", (req, res, next) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid post ID." });
  next();
}, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose an image file using field name 'image'." });
    const post = await Post.findById(req.params.id);
    if (!post) {
      deleteImage(`/uploads/${req.file.filename}`);
      return res.status(404).json({ success: false, message: "Post not found." });
    }
    if (!canManage(post, req.user)) {
      deleteImage(`/uploads/${req.file.filename}`);
      return res.status(403).json({ success: false, message: "Not allowed to change this post image." });
    }
    deleteImage(post.image);
    post.image = `/uploads/${req.file.filename}`;
    await post.save();
    res.json({ success: true, message: "Image uploaded.", image: post.image, post });
  } catch (err) { next(err); }
});

module.exports = router;