import { useState, useEffect, useCallback } from 'react';
import { bookingApi } from '../api/booking';
import './SharedPageShell.css';

// Real BookingStatus enum: PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT/CANCELLED.
// Tab keys stay lowercase for display, mapped to the real enum value below.
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

export default function LandlordBookings() {
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.landlordBookings();
      setBookings(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleBookings = bookings.filter((b) => (b.status || '').toUpperCase() === tab.toUpperCase());

  const approve = async (id) => {
    try { await bookingApi.update(id, { status: 'CONFIRMED' }); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const reject = async (id) => {
    try { await bookingApi.update(id, { status: 'CANCELLED' }); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleStatusChange = async (id, val) => {
    try { await bookingApi.update(id, { status: val }); load(); } catch (e) { alert(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Bookings</h1>
        <p>Manage tenant requests for your properties.</p>
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
                <tr key={b._id || b.id}>
                  <td>{b.user?.full_name ?? b.user?.email}</td>
                  <td>{b.property?.title}</td>
                  <td>{formatDate(b.start_date)}</td>
                  <td>{formatDate(b.end_date)}</td>
                  <td>
                    <span className={`shell-status-badge status-${(b.status||'').toLowerCase()}`}>{b.status}</span>
                  </td>
                  <td>{formatAmount(b.totalAmount)}</td>
                  <td>
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => approve(b._id || b.id)}>Approve</button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => reject(b._id || b.id)}>Reject</button>
                      </>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <select value={(b.status || '')} onChange={e => handleStatusChange(b._id || b.id, e.target.value)} className="shell-badge shell-badge-warning">
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="CHECKED_IN">Active</option>
                        <option value="CHECKED_OUT">Completed</option>
                      </select>
                    )}
                    {b.status === 'CHECKED_IN' && (
                      <select value={(b.status || '')} onChange={e => handleStatusChange(b._id || b.id, e.target.value)} className="shell-badge shell-badge-warning">
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