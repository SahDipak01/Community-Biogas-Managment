const FinancialTransaction = require('../models/FinancialTransaction');
const Household = require('../models/Household');
const BiogasPlant = require('../models/BiogasPlant');
const AuditLog = require('../models/AuditLog');

// @desc    Get financial ledger transactions
// @route   GET /api/finance/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { status, type, villageId, householdId } = req.query;
    const query = {};

    if (req.user.role === 'household') {
      const hh = await Household.findOne({ user: req.user._id });
      if (hh) query.household = hh._id;
    } else if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') query.verificationStatus = status;
    if (type && type !== 'all') query.transactionType = type;
    if (householdId) query.household = householdId;

    const transactions = await FinancialTransaction.find(query)
      .populate('household', 'householdCode headOfFamily contactPhone')
      .populate('biogasPlant', 'plantName plantCode')
      .populate('village', 'name district state')
      .populate('recordedBy', 'name role')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    const totalCredits = transactions
      .filter((t) => t.direction === 'Credit' && t.verificationStatus !== 'Reversed')
      .reduce((s, t) => s + t.amountInr, 0);

    const totalDebits = transactions
      .filter((t) => t.direction === 'Debit' && t.verificationStatus !== 'Reversed')
      .reduce((s, t) => s + t.amountInr, 0);

    res.json({
      success: true,
      count: transactions.length,
      metrics: {
        totalCredits,
        totalDebits,
        netBalance: totalCredits - totalDebits,
        pendingApprovalCount: transactions.filter((t) => t.verificationStatus === 'Pending Approval').length
      },
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a new financial entry
// @route   POST /api/finance/transactions
// @access  Private (Coordinator, Admin)
const recordTransaction = async (req, res, next) => {
  try {
    const {
      villageId,
      householdId,
      biogasPlantId,
      transactionType,
      direction,
      amountInr,
      notes,
      supportingDocumentUrl
    } = req.body;

    const vid = villageId || (req.user.village?._id || req.user.village);
    if (!vid) {
      return res.status(400).json({ success: false, message: 'Village ID is required' });
    }

    const count = await FinancialTransaction.countDocuments();
    const transactionNumber = `TXN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const txn = await FinancialTransaction.create({
      transactionNumber,
      receiptNumber,
      village: vid,
      household: householdId || null,
      biogasPlant: biogasPlantId || null,
      transactionType,
      direction,
      amountInr: Number(amountInr),
      notes: notes || '',
      supportingDocumentUrl: supportingDocumentUrl || '',
      recordedBy: req.user._id,
      verificationStatus: req.user.role === 'admin' ? 'Approved' : 'Pending Approval',
      isVerified: req.user.role === 'admin',
      approvedBy: req.user.role === 'admin' ? req.user._id : null
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'FINANCIAL_TRANSACTION_RECORDED',
      entityType: 'FinancialTransaction',
      entityId: txn._id.toString(),
      summary: `Logged ${direction} of ₹${amountInr} for ${transactionType} (${receiptNumber})`,
      metadata: { transactionNumber, receiptNumber, amountInr, direction, transactionType }
    });

    res.status(201).json({
      success: true,
      message: 'Financial transaction recorded in ledger',
      data: txn
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a transaction
// @route   PUT /api/finance/transactions/:id/verify
// @access  Private (Admin only)
const verifyTransaction = async (req, res, next) => {
  try {
    const { status, approvalNotes } = req.body;
    const txn = await FinancialTransaction.findById(req.params.id);

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    txn.verificationStatus = status; // 'Approved' or 'Rejected'
    txn.isVerified = status === 'Approved';
    txn.approvedBy = req.user._id;
    txn.approvalNotes = approvalNotes || '';

    await txn.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'FINANCIAL_TRANSACTION_VERIFIED',
      entityType: 'FinancialTransaction',
      entityId: txn._id.toString(),
      summary: `Admin set status of ${txn.receiptNumber} to ${status}`,
      metadata: { status, receiptNumber: txn.receiptNumber, amount: txn.amountInr }
    });

    res.json({
      success: true,
      message: `Transaction ${status}`,
      data: txn
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create an auditable reversal for an erroneous transaction
// @route   POST /api/finance/transactions/:id/reverse
// @access  Private (Admin only)
const reverseTransaction = async (req, res, next) => {
  try {
    const { reversalReason } = req.body;
    const origTxn = await FinancialTransaction.findById(req.params.id);

    if (!origTxn) {
      return res.status(404).json({ success: false, message: 'Original transaction not found' });
    }

    if (origTxn.verificationStatus === 'Reversed') {
      return res.status(400).json({ success: false, message: 'Transaction is already reversed' });
    }

    origTxn.verificationStatus = 'Reversed';
    await origTxn.save();

    const count = await FinancialTransaction.countDocuments();
    const revTxnNumber = `REV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const revReceiptNumber = `RCP-REV-${String(count + 1).padStart(5, '0')}`;

    // Create opposite direction adjustment entry
    const reversalTxn = await FinancialTransaction.create({
      transactionNumber: revTxnNumber,
      receiptNumber: revReceiptNumber,
      village: origTxn.village,
      household: origTxn.household,
      biogasPlant: origTxn.biogasPlant,
      transactionType: origTxn.transactionType,
      direction: origTxn.direction === 'Credit' ? 'Debit' : 'Credit',
      amountInr: origTxn.amountInr,
      isVerified: true,
      verificationStatus: 'Approved',
      recordedBy: req.user._id,
      approvedBy: req.user._id,
      isReversal: true,
      reversalOfTransaction: origTxn._id,
      reversalReason: reversalReason || 'Administrative accounting correction',
      notes: `Reversal of transaction ${origTxn.transactionNumber}: ${reversalReason || 'Correction'}`
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'FINANCIAL_REVERSAL_EXECUTED',
      entityType: 'FinancialTransaction',
      entityId: reversalTxn._id.toString(),
      summary: `Executed audit reversal of ${origTxn.receiptNumber} with ${revReceiptNumber}`,
      metadata: { originalTxn: origTxn.transactionNumber, amount: origTxn.amountInr, reversalReason }
    });

    res.json({
      success: true,
      message: 'Transaction reversed with auditable counter-entry',
      data: reversalTxn
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single receipt details
// @route   GET /api/finance/receipts/:receiptNumber
// @access  Private
const getReceipt = async (req, res, next) => {
  try {
    const txn = await FinancialTransaction.findOne({ receiptNumber: req.params.receiptNumber })
      .populate('household', 'householdCode headOfFamily contactPhone')
      .populate('village', 'name district state')
      .populate('biogasPlant', 'plantName plantCode')
      .populate('recordedBy', 'name role')
      .populate('approvedBy', 'name role');

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({
      success: true,
      data: txn
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  recordTransaction,
  verifyTransaction,
  reverseTransaction,
  getReceipt
};
