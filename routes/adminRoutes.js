const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Q5: only admin accounts can access inventory data.
// Replace the sample array with a Book model/database query for a full bookstore app.
router.get("/inventory", protect, adminOnly, (req, res) => {
  const inventory = [
    { book: "Sample Book A", stock: 12, sold: 8 },
    { book: "Sample Book B", stock: 5, sold: 15 }
  ];
  res.json({ success: true, inventory });
});

module.exports = router;