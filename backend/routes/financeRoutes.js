const express = require('express');
const router = express.Router();
const {
  getTransactions,
  recordTransaction,
  verifyTransaction,
  reverseTransaction,
  getReceipt
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/transactions', protect, getTransactions);
router.post('/transactions', protect, authorize('admin', 'coordinator'), recordTransaction);
router.put('/transactions/:id/verify', protect, authorize('admin'), verifyTransaction);
router.post('/transactions/:id/reverse', protect, authorize('admin'), reverseTransaction);
router.get('/receipts/:receiptNumber', protect, getReceipt);

module.exports = router;
