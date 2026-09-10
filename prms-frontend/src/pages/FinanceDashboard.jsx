import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../api';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  CalendarDays,
  Filter,
  Download,
} from 'lucide-react';
import './FinanceDashboard.css';
import './TenantPayments.css';

function FinanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        apiClient.get('/payments/summary'),
        apiClient.get('/payments', { params: { page, limit: 10, status: statusFilter || undefined } }),
      ]);
      setSummary(summaryRes.data?.data);
      setPayments(paymentsRes.data?.data?.data ?? paymentsRes.data?.data ?? []);
      setPages(Math.max(1, paymentsRes.data?.pagination?.totalPages || 1));
    } catch (e) {
      setError(e.message || 'Failed to load finance data');
      console.error('Failed to load finance data', e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = statusFilter
    ? payments.filter((p) => p.status === statusFilter)
    : payments;

  function exportCsv() {
    const header = 'Date,Reference,Amount,Status,Method';
    const rows = filtered.map((p) =>
      [
        p.paid_at || p.due_date || '',
        p.reference || '',
        Number(p.amount || 0),
        p.status || '',
        p.method || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="finance-loading">Loading finance data...</div>;

  return (
    <div className="finance-dashboard">
      {error && <div className="alert alert-danger">{error} <button className="btn btn-sm" onClick={load}>Retry</button></div>}
      <div className="finance-header">
        <h1>Finance Overview</h1>
        <button className="finance-export-btn" title="Export" onClick={exportCsv}>
          <Download size={16} /> Export current page
        </button>
      </div>
      <p>University project payment simulation. Entries marked “simulation” do not represent money transfers.</p>

      {/* Summary Cards */}
      <div className="finance-cards">
        <motion.div
          className="finance-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="finance-card-icon total">
            <DollarSign size={20} />
          </div>
          <div className="finance-card-info">
            <span className="finance-card-label">Total Revenue</span>
            <span className="finance-card-value">RM {(summary?.totalRevenue ?? 0).toFixed(2)}</span>
          </div>
        </motion.div>

        <motion.div
          className="finance-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="finance-card-icon pending">
            <CalendarDays size={20} />
          </div>
          <div className="finance-card-info">
            <span className="finance-card-label">Pending</span>
            <span className="finance-card-value">RM {(summary?.pendingAmount ?? 0).toFixed(2)}</span>
          </div>
        </motion.div>

        <motion.div
          className="finance-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="finance-card-icon paid">
            <CreditCard size={20} />
          </div>
          <div className="finance-card-info">
            <span className="finance-card-label">Collected</span>
            <span className="finance-card-value">RM {(summary?.collectedAmount ?? 0).toFixed(2)}</span>
          </div>
        </motion.div>

        <motion.div
          className="finance-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="finance-card-icon trend">
            <TrendingUp size={20} />
          </div>
          <div className="finance-card-info">
            <span className="finance-card-label">Total Bookings</span>
            <span className="finance-card-value">{summary?.totalBookings ?? 0}</span>
          </div>
        </motion.div>
      </div>

      {/* Revenue Bar Chart Placeholder */}
      <div className="finance-chart-section">
        <h2>Revenue by Property</h2>
        <div className="finance-bars">
          {(summary?.byProperty ?? []).map((p, i) => (
            <div key={i} className="finance-bar-row">
              <span className="finance-bar-label">{p.property}</span>
              <div className="finance-bar-track">
                <div
                  className="finance-bar-fill"
                  style={{ width: `${((p.amount / Math.max(...(summary?.byProperty ?? []).map((x) => x.amount))) * 100) || 0}%` }}
                />
              </div>
              <span className="finance-bar-amount">RM {p.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="finance-payments-section">
        <div className="finance-payments-header">
          <h2>Payment History</h2>
          <div className="finance-filter">
            <Filter size={14} />
            <select aria-label="Payment status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="UNPAID">Unpaid</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 10).map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.paid_at || p.due_date).toLocaleDateString()}</td>
                  <td>{p.reference || '—'}</td>
                  <td>RM {Number(p.amount).toFixed(2)}</td>
                  <td>
                    <span className={`payment-status-badge ${p.status.toLowerCase()}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>{p.method || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="payment-pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

export default FinanceDashboard;
