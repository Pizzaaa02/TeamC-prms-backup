import { useState, useEffect, useCallback } from 'react';
import { bookingApi } from '../api/booking';

const ALL_TABS = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];

export default function LandlordBookings() {
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingApi.list({ status: tab.toUpperCase() });
      setBookings(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try { await bookingApi.confirm(id); load(); } catch (e) { alert(e.response?.data?.error?.message || 'Failed'); }
  };

  const reject = async (id) => {
    try { await bookingApi.reject(id); load(); } catch (e) { alert(e.response?.data?.error?.message || 'Failed'); }
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
              {t.charAt(0).toUpperCase() + t.slice(1)}
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
              {bookings.map(b => (
                <tr key={b._id || b.id}>
                  <td>{b.user?.full_name ?? b.user?.email}</td>
                  <td>{b.property?.title}</td>
                  <td>{new Date(b.start_date).toLocaleDateString()}</td>
                  <td>{new Date(b.end_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${(b.status||'').toLowerCase()}`}>{b.status}</span>
                  </td>
                  <td>RM {(b.totalAmount ?? b.property?.rent ?? 0).toLocaleString()}</td>
                  <td>
                    {b.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => approve(b._id || b.id)}>Approve</button>{' '}
                        <button className="btn btn-sm btn-danger" onClick={() => reject(b._id || b.id)}>Reject</button>
                      </>
                    )}
                    {b.status !== 'PENDING' && b.status !== 'CANCELLED' && (
                      <select value={(b.status || '')} onChange={e => handleStatusChange(b._id || b.id, e.target.value)} className="badge badge-warning">
                        <option value="CHECKED_IN">Checked in</option>
                        <option value="CHECKED_OUT">Checked out</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {!bookings.length && <tr><td colSpan={7}>No bookings found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
