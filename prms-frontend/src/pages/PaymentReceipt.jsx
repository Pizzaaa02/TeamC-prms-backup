import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../api';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Printer,
  Building2,
  CalendarDays,
  Hash,
} from 'lucide-react';
import './PaymentReceipt.css';

function PaymentReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    async function loadReceipt() {
    try {
      const res = await apiClient.get(`/payments/${id}`);
      if (!cancelled) setReceipt(res.data?.data);
    } catch (e) {
      if (!cancelled) setError(e.response?.data?.error?.message || 'Unable to load payment');
    } finally {
      if (!cancelled) setLoading(false);
    }
    }
    loadReceipt();
    return () => { cancelled = true; };
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="receipt-loading">Loading receipt...</div>;
  if (error) return <div className="receipt-error" role="alert">{error} <button onClick={() => navigate(-1)}>Back</button></div>;
  if (!receipt) return null;

  const isPaid = receipt.status === 'PAID';

  return (
    <motion.div
      className="payment-receipt"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Back navigation */}
      <button className="receipt-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Receipt Card */}
      <div className="receipt-card">
        <div className="receipt-header">
          <div className="receipt-logo-section">
            <h1>PRMS</h1>
            <span>{isPaid ? 'Payment Receipt' : 'Payment Details'}</span>
          </div>
          <div className={`receipt-status ${isPaid ? 'paid' : 'pending'}`}>
            {isPaid ? (
              <>
                <CheckCircle size={18} /> Paid
              </>
            ) : (
              <>
                <Clock size={18} /> {receipt.status}
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="receipt-actions">
          <button className="receipt-action-btn" onClick={handlePrint}>
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>

        {/* Details */}
        <div className="receipt-details">
          <div className="receipt-row">
            <div className="receipt-label">Receipt Number</div>
            <div className="receipt-value receipt-ref">
              <Hash size={14} className="receipt-icon" />
              {receipt.id.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <div className="receipt-row">
            <div className="receipt-label">Amount</div>
            <div className="receipt-value receipt-amount">
              RM {Number(receipt.amount).toFixed(2)}
            </div>
          </div>

          {receipt.booking?.property && (
            <div className="receipt-row">
              <div className="receipt-label">Property</div>
              <div className="receipt-value">
                <Building2 size={14} className="receipt-icon" />
                {receipt.booking.property.title}
              </div>
            </div>
          )}

          <div className="receipt-row">
            <div className="receipt-label">Booking Period</div>
            <div className="receipt-value">
              <CalendarDays size={14} className="receipt-icon" />
              {receipt.booking?.start_date
                ? new Date(receipt.booking.start_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
              {' → '}
              {receipt.booking?.end_date
                ? new Date(receipt.booking.end_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
          </div>

          <div className="receipt-row">
            <div className="receipt-label">Due Date</div>
            <div className="receipt-value">
              {new Date(receipt.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {receipt.paid_at && (
            <div className="receipt-row">
              <div className="receipt-label">Date Paid</div>
              <div className="receipt-value">
                {new Date(receipt.paid_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}

          {receipt.reference && (
            <div className="receipt-row">
              <div className="receipt-label">Reference</div>
              <div className="receipt-value">{receipt.reference}</div>
            </div>
          )}

          {receipt.method && (
            <div className="receipt-row">
              <div className="receipt-label">Payment Method</div>
              <div className="receipt-value">{receipt.method}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="receipt-footer">
          <p>{receipt.method === 'simulation' || receipt.reference?.startsWith('SIM-') ? 'SIMULATION ONLY — no money was transferred.' : 'Payment record'}</p>
          {!isPaid && <p>This record is not proof of payment.</p>}
          <p className="receipt-tinymce">Contact support@prms.com for enquiries.</p>
        </div>
      </div>
    </motion.div>
  );
}

export default PaymentReceipt;
