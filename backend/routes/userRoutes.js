const express = require('express');
const router = express.Router();
const { getUsers, updateUser, adminResetPassword, getAuditLogs } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin'), getUsers);
router.get('/audit-logs', protect, authorize('admin'), getAuditLogs);
router.put('/:id', protect, authorize('admin'), updateUser);
router.put('/:id/reset-password', protect, authorize('admin'), adminResetPassword);

module.exports = router;
