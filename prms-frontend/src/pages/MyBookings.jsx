import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../config/imageHelper';
import { bookingApi } from '../api/booking';
import Modal from '../components/Modal';
import './SharedPageShell.css';

const ALL_TABS = ['active', 'upcoming', 'past', 'cancelled'];

function formatDate(date) {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(amount) {
  const value = Number(amount);
  if (Number.isNaN(value)) return amount ? `RM ${amount}` : 'N/A';
  return new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', minimumFractionDigits: 2 }).format(value);
}

function formatStatus(status) {
  if (!status) return 'Unknown';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// The real BookingStatus enum is PENDING/CONFIRMED/CHECKED_IN/CHECKED_OUT/
// CANCELLED - there's no single status that means "active" or "upcoming"
// on its own, so those two tabs combine status with the booking's real
// dates. Also: bookingApi.list() is the admin/landlord-only endpoint (a
// Tenant gets a 403 from it) - myBookings() is the one scoped to the
// caller's own bookings, and it doesn't take a status filter server-side,
// so filtering happens here after fetching everything.
function matchesTab(booking, tab) {
  const status = (booking.status || '').toUpperCase();
  if (tab === 'cancelled') return status === 'CANCELLED';
  if (status === 'CANCELLED') return false;

  const now = new Date();
  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);

  if (tab === 'past') return status === 'CHECKED_OUT' || (!Number.isNaN(end.getTime()) && end < now);
  if (tab === 'upcoming') return status === 'PENDING' || (status === 'CONFIRMED' && !Number.isNaN(start.getTime()) && start > now);
  // 'active'
  return status === 'CHECKED_IN' || (status === 'CONFIRMED' && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= now && now <= end);
}

export default function MyBookings() {
  const [tab, setTab] = useState('active');
  const [allBookings, setAllBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingApi.myBookings();
      setAllBookings(res.data?.data || []);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error?.message || e.message || 'Failed to load bookings');
      console.error(e);
      setAllBookings([]);
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bookings = allBookings.filter(b => matchesTab(b, tab));

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
        {loading ? <p>Loading...</p> : bookings.length > 0 ? (
          <div className="booking-property-grid">
            {bookings.map(b => (
              <div key={b._id || b.id} className="booking-property-card" onClick={() => setSelected(b)} style={{ cursor: 'pointer' }}>
                <div className="booking-property-card-header">
                  <img className="booking-property-card-img" src={getImageUrl(b.property?.images?.[0]?.url) || '/placeholder.png'} alt={b.property?.title || 'Booked property'} />
                  <span className={`shell-status-badge status-${(b.status || 'unknown').toLowerCase()}`}>{formatStatus(b.status)}</span>
                </div>
                <h3>{b.property?.title || b.property?.name || 'Property'}</h3>
                <p>{formatDate(b.start_date)} → {formatDate(b.end_date)}</p>
                <p className="price">{formatAmount(b.totalAmount ?? b.monthlyRate)}</p>
                <div className="card-footer">
                  <button type="button" className="btn-text" onClick={e => { e.stopPropagation(); setSelected(b); }}>View Details</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bookings-empty-state">
            <p>No bookings found for this category.</p>
            <Link to="/tenant/properties" className="btn btn-primary">Browse Properties</Link>
          </div>
        )}
      </div>

      {selected && (
        <Modal
          isOpen={!!selected}
          onOpenChange={open => { if (!open) setSelected(null); }}
          title="Booking Details"
          footer={<button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>}
        >
          <p><strong>Property:</strong> {selected.property?.title || selected.property?.name || 'N/A'}</p>
          <p><strong>Status:</strong> {formatStatus(selected.status)}</p>
          <p><strong>Check In:</strong> {formatDate(selected.start_date)}</p>
          <p><strong>Check Out:</strong> {formatDate(selected.end_date)}</p>
          <p><strong>Amount:</strong> {formatAmount(selected.totalAmount ?? selected.monthlyRate)}</p>
        </Modal>
      )}
    </div>
  );
}
