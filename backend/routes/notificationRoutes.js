const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// Get notifications
router.get('/', protect, async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const villageId = req.user.village ? req.user.village._id || req.user.village : null;

    const query = {
      $or: [
        { recipient: req.user._id },
        { targetRole: 'all' },
        { targetRole: userRole }
      ]
    };

    if (villageId) {
      query.$or.push({ village: villageId });
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('plant', 'plantName plantCode');

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/mark-all-read', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
