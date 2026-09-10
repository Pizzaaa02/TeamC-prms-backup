import { useState, useEffect, useCallback } from 'react';
import { bookingApi } from '../api/booking';
import './SharedPageShell.css';

const ALL_TABS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const TAB_LABELS = { pending: 'Pending', confirmed: 'Confirmed', checked_in: 'Active', checked_out: 'Completed', cancelled: 'Cancelled' };

function formatAmount(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ? `RM ${amount}` : 'N/A';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(value);
}

function formatDate(date) {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AgentBookings() {
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.assigned();
      setBookings(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleBookings = bookings.filter((b) => (b.status || '').toUpperCase() === tab.toUpperCase());

  const approve = async (id) => {
    try { await bookingApi.confirm(id); load(); } catch (e) { alert(e.response?.data?.error?.message || 'Failed'); }
  };

  const reject = async (id) => {
    try { await bookingApi.reject(id); load(); } catch (e) { alert(e.response?.data?.error?.message || 'Failed'); }
  };

  const handleStatusChange = async (id, val) => {
    try { await bookingApi.update(id, { status: val }); load(); } catch (e) { alert(e.response?.data?.error?.message || 'Failed'); }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <p>Requests on properties assigned to you.</p>
      </div>

      <div className="card-table">
        <div className="status-filter">
          {ALL_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Property</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.map(b => (
                <tr key={b.id}>
                  <td>{b.user?.full_name ?? b.user?.email}</td>
                  <td>{b.property?.title}</td>
                  <td>{formatDate(b.start_date)}</td>
                  <td>{formatDate(b.end_date)}</td>
                  <td>
                    <span className={`shell-status-badge status-${(b.status || '').toLowerCase()}`}>{b.status}</span>
                  </td>
                  <td>{formatAmount(b.totalAmount)}</td>
                  <td>
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => approve(b.id)}>Approve</button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => reject(b.id)}>Reject</button>
                      </>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)} className="shell-badge shell-badge-warning">
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CHECKED_IN">Active</option>
                        <option value="CHECKED_OUT">Completed</option>
                      </select>
                    )}
                    {b.status === 'CHECKED_IN' && (
                      <select value={b.status} onChange={e => handleStatusChange(b.id, e.target.value)} className="shell-badge shell-badge-warning">
                        <option value="CHECKED_IN">Active</option>
                        <option value="CHECKED_OUT">Completed</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleBookings.length && <tr><td colSpan={7}>No bookings found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
