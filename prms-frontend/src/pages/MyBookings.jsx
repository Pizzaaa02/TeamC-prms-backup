import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../config/imageHelper';
import { bookingApi } from '../api/booking';
import Modal from '../components/Modal';

const ALL_TABS = ['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

export default function MyBookings() {
  const [tab, setTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.myBookings();
      const all = res.data?.data || [];
      setBookings(tab === 'all' ? all : all.filter((booking) => booking.status === tab.toUpperCase()));
    } catch (e) { setError(e.message || 'Failed to load bookings'); console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const withdraw = async () => {
    if (!selected || !window.confirm('Withdraw this pending booking request?')) return;
    setCancelling(true);
    setError('');
    try {
      await bookingApi.cancel(selected.id || selected._id);
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to withdraw booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <Link to="/tenant/properties" className="btn btn-primary">+ Book New Property</Link>
      </div>

      <div className="card-table">
        <div className="status-filter">
          {ALL_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-danger mt-2">{error} <button className="btn btn-sm" onClick={load}>Retry</button></div>}
        {loading ? <p>Loading...</p> : (
          <div className="property-grid">
            {bookings.map(b => (
              <article key={b._id || b.id} className="property-card" onClick={() => setSelected(b)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelected(b); }}>
                <div className="property-card-header">
                  <img className="property-card-img" src={getImageUrl(b.property?.images?.[0]?.url) || '/placeholder.png'} alt="" />
                  <span className={`status-badge status-${b.status.toLowerCase()}`}>{b.status}</span>
                </div>
                <h3>{b.property?.title || 'Property'}</h3>
                <p>{new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}</p>
                <p className="price">RM {(b.totalAmount ?? b.property?.rent ?? 0).toLocaleString()}</p>
                <div className="card-footer">
                  <span className="btn-text" onClick={e => { e.stopPropagation(); setSelected(b); }}>View Details</span>
                </div>
              </article>
            ))}
            {!bookings.length && <p>No bookings found for this status.</p>}
          </div>
        )}
      </div>
      {selected && (
        <Modal isOpen onOpenChange={(open) => { if (!open) setSelected(null); }} title="Booking details">
          <h3>{selected.property?.title || 'Property'}</h3>
          <p><strong>Status:</strong> {selected.status?.replaceAll('_', ' ')}</p>
          <p><strong>Stay:</strong> {new Date(selected.start_date).toLocaleDateString('en-MY')} – {new Date(selected.end_date).toLocaleDateString('en-MY')}</p>
          <p><strong>Total:</strong> RM {(selected.totalAmount ?? selected.property?.rent ?? 0).toLocaleString()}</p>
          {selected.status === 'PENDING' && (
            <button type="button" className="btn btn-danger" onClick={withdraw} disabled={cancelling}>
              {cancelling ? 'Withdrawing…' : 'Withdraw Request'}
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
