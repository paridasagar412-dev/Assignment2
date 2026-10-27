const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Q6: customer can cancel own unshipped order; admin can cancel any unshipped order.
router.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });

    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Forbidden: you cannot cancel this order." });
    }
    if (order.status === "shipped") {
      return res.status(400).json({ success: false, message: "A shipped order cannot be cancelled." });
    }

    order.status = "cancelled";
    await order.save();
    res.json({ success: true, message: "Order cancelled.", order });
  } catch (err) { next(err); }
});

module.exports = router;