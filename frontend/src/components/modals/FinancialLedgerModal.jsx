import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { IndianRupee, Receipt, CheckCircle2, AlertCircle, X, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

const FinancialLedgerModal = ({ isOpen, onClose }) => {
  const { user, isAdmin, isCoordinator } = useAuth();
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalCredits: 0, totalDebits: 0, netBalance: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    transactionType: 'Household Contribution Credit',
    direction: 'Credit',
    amountInr: 250,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/finance/transactions');
      if (res.data.success) {
        setTransactions(res.data.data);
        if (res.data.metrics) setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRecord = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setMsg('');
      const res = await api.post('/finance/transactions', {
        ...formData,
        amountInr: Number(formData.amountInr)
      });
      if (res.data.success) {
        setMsg(`Transaction logged: ${res.data.data.receiptNumber}`);
        setShowAddForm(false);
        fetchTransactions();
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to record entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id, status) => {
    try {
      const res = await api.put(`/finance/transactions/${id}/verify`, { status });
      if (res.data.success) {
        fetchTransactions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide">
                {language === 'ta' ? 'நிதி வெளிப்படைத்தன்மை பதிவேடு' : 'Financial Transparency & Receipt Ledger'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                {language === 'ta' ? 'அனைத்து கொடுப்பனவுகள் மற்றும் ரசீதுகளின் அதிகாரப்பூர்வ பதிவு' : 'Immutable community fund accounting & official receipts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-50 border-b border-slate-200/80 text-center">
          <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Inflow (Credits)</span>
            <span className="text-sm font-bold text-emerald-700">₹{metrics.totalCredits.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Operational Outflow</span>
            <span className="text-sm font-bold text-rose-700">₹{metrics.totalDebits.toLocaleString()}</span>
          </div>
          <div className="p-2.5 bg-white rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Net Community Balance</span>
            <span className="text-sm font-bold text-slate-900">₹{metrics.netBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Action button for Coordinator / Admin */}
        {(isAdmin || isCoordinator) && (
          <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white">
            <span className="text-xs font-bold text-slate-700">Financial Entries</span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {showAddForm ? 'Cancel Entry' : '+ Record Financial Entry'}
            </button>
          </div>
        )}

        {/* Add Entry Form */}
        {showAddForm && (
          <form onSubmit={handleRecord} className="p-4 bg-emerald-50/50 border-b border-emerald-100 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Type</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                >
                  <option value="Household Contribution Credit">Household Contribution Credit</option>
                  <option value="Maintenance & Repair Expense">Maintenance & Repair Expense</option>
                  <option value="Bio-Slurry Fertilizer Sale">Bio-Slurry Fertilizer Sale</option>
                  <option value="Operational Spare Parts">Operational Spare Parts</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Direction</label>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                >
                  <option value="Credit">Credit (Income / Contribution)</option>
                  <option value="Debit">Debit (Expenditure)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (₹ INR)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.amountInr}
                  onChange={(e) => setFormData({ ...formData, amountInr: e.target.value })}
                  className="w-full p-2 border rounded-xl font-bold"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold"
              >
                {submitting ? 'Recording...' : 'Commit to Ledger'}
              </button>
            </div>
          </form>
        )}

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No financial records found in this view.
            </div>
          ) : (
            transactions.map((t) => (
              <div
                key={t._id}
                className="p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition-all flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      t.direction === 'Credit'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {t.direction === 'Credit' ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{t.transactionType}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {t.receiptNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()} • Recorded by {t.recordedBy?.name || 'System'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      t.direction === 'Credit' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {t.direction === 'Credit' ? '+' : '-'}₹{t.amountInr.toLocaleString()}
                  </div>

                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.verificationStatus === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.verificationStatus === 'Pending Approval'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.verificationStatus}
                    </span>

                    {isAdmin && t.verificationStatus === 'Pending Approval' && (
                      <button
                        onClick={() => handleVerify(t._id, 'Approved')}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold ml-1"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Audited according to rural community cooperative standards.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialLedgerModal;
