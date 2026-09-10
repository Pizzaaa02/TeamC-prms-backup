import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../api/payment';
import Modal from '../components/Modal';
import './TenantPayments.css';

const STATUS_TABS = ['all', 'pending', 'unpaid', 'paid', 'failed', 'refunded'];
const money = (value) => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(value);
function paymentBlock(payment) {
  if (!['CONFIRMED', 'CHECKED_IN'].includes(payment.booking?.status)) return 'Booking is not eligible for payment.';
  const agreement = payment.booking?.rentalAgreement;
  if (agreement?.status !== 'ACTIVE' || !agreement.tenantSignature || !agreement.landlordSignature) return 'Both parties must sign the agreement first.';
  return '';
}

export default function TenantPayments() {
  const [tab, setTab] = useState('all');
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(null);
  const [outcome, setOutcome] = useState('success');
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentApi.list({ page, limit: 10, status: tab === 'all' ? undefined : tab });
      setPayments(res.data?.data || []);
      setPages(Math.max(1, res.data?.pagination?.totalPages || 1));
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Could not load payments.');
    } finally { setLoading(false); }
  }, [tab, page]);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (submitting || !selected) return;
    setSubmitting(true);
    setPaymentError('');
    try {
      const res = await paymentApi.simulate(selected.id, outcome);
      setMessage(res.data?.message || 'Simulation completed.');
      setSelected(null);
      await load();
    } catch (e) {
      setPaymentError(e.response?.data?.error?.message || 'Could not process the simulation. Please retry.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="page-shell tenant-payment-page">
      <div className="page-header"><h1 className="page-title">My Payments</h1></div>
      <p className="payment-demo-notice">Payment simulation for the university project. No money is transferred and no bank or card details are required.</p>
      {message && <p role="status" className="payment-demo-notice">{message}</p>}
      {error && <div role="alert">{error} <button onClick={load}>Retry</button></div>}
      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => <button key={t} aria-pressed={tab === t} className={tab === t ? 'active' : ''} onClick={() => { setTab(t); setPage(1); }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
        {loading ? <p role="status">Loading payments…</p> : (
          <div className="payment-table-scroll"><table className="table">
            <thead><tr><th>Property</th><th>Due date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{payments.map(p => {
              const payable = ['PENDING', 'UNPAID', 'FAILED'].includes(p.status);
              const blocked = paymentBlock(p);
              return <tr key={p.id}>
                <td>{p.booking?.property?.title || 'Property'}</td>
                <td>{new Date(p.due_date).toLocaleDateString('en-MY')}</td>
                <td>{money(p.amount)}</td>
                <td><span className={'payment-state payment-state-' + p.status.toLowerCase()}>{p.status}</span></td>
                <td><div className="payment-row-actions">
                  {payable && !blocked && <button className="btn btn-sm btn-primary" onClick={() => { setSelected(p); setOutcome('success'); setPaymentError(''); }}>{p.status === 'FAILED' ? 'Retry simulation' : 'Simulate payment'}</button>}
                  {payable && blocked && <span>{blocked} <Link to="/tenant/agreements">View agreements</Link></span>}
                  <Link to={'/tenant/payments/' + p.id} className="btn btn-sm btn-outline">{p.status === 'PAID' ? 'Receipt' : 'Details'}</Link>
                </div></td>
              </tr>;
            })}{!payments.length && <tr><td colSpan={5}>No payments found for this status.</td></tr>}</tbody>
          </table></div>
        )}
        <div className="payment-pagination">
          <button className="btn btn-sm" disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn btn-sm" disabled={loading || page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
      {selected && <Modal isOpen title="Simulate rental payment" onOpenChange={(open) => { if (!open && !submitting) setSelected(null); }}>
        <p>{selected.booking?.property?.title}</p>
        <p>Amount: <strong>{money(selected.amount)}</strong></p>
        <p>No money will be transferred.</p>
        <label htmlFor="simulation-outcome">Demo outcome</label>
        <select id="simulation-outcome" value={outcome} disabled={submitting} onChange={e => setOutcome(e.target.value)}>
          <option value="success">Successful payment</option><option value="failure">Failed payment (can retry)</option>
        </select>
        {paymentError && <p role="alert">{paymentError}</p>}
        <div className="payment-row-actions">
          <button className="btn btn-primary" disabled={submitting} onClick={submit}>{submitting ? 'Processing…' : 'Run simulation'}</button>
          <button className="btn btn-outline" disabled={submitting} onClick={() => setSelected(null)}>Cancel</button>
        </div>
      </Modal>}
    </div>
  );
}

