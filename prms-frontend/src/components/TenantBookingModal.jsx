import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X, Loader2, CalendarDays } from 'lucide-react';
import { bookingApi } from '../api';
import './TenantBookingModal.css';

/**
 * TenantBookingModal – lets tenants pick start/end dates, check for
 * date overlaps with existing bookings, and confirm a new booking.
 *
 * Props
 * -----
 *   property  – Property object (must have `id` and `title`)
 *   isOpen    – Boolean controlling visibility
 *   onClose   – () => void  callback to close the modal
 */
function TenantBookingModal({ property, isOpen, onClose }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overlapResult, setOverlapResult] = useState(null); // null | { hasOverlap, conflictCount }
  const [submitResult, setSubmitResult] = useState(null);   // null | { success: boolean, message: string }

  /* ---- Check availability against existing bookings ---- */
  async function handleCheckAvailability() {
    if (!startDate || !endDate) return;
    if (endDate <= startDate) {
      setOverlapResult({ hasOverlap: false, error: 'Check-out must be after check-in.' });
      return;
    }
    setChecking(true);
    setOverlapResult(null);
    setSubmitResult(null);
    try {
      const res = await bookingApi.checkOverlap({
        propertyId: property.id,
        startDate,
        endDate,
      });
      setOverlapResult(res?.data?.data ?? res?.data);
    } catch (err) {
      setOverlapResult({
        hasOverlap: false,
        error: err.response?.data?.error?.message || 'Failed to check availability',
      });
    } finally {
      setChecking(false);
    }
  }

  /* ---- Submit confirmed booking ---- */
  async function handleConfirmBooking() {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await bookingApi.create({
        propertyId: property.id,
        start_date: startDate,
        end_date: endDate,
      });
      setSubmitResult({
        success: true,
        message: 'Booking request submitted successfully!',
        booking: res?.data?.data ?? res?.data,
      });
      /* Auto-close after short delay */
      setTimeout(() => {
        resetAndClose();
      }, 2500);
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err.response?.data?.error?.message || 'Failed to submit booking request',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setStartDate('');
    setEndDate('');
    setOverlapResult(null);
    setSubmitResult(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="tenant-booking-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && resetAndClose()}
        >
          <motion.div
            className="tenant-booking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-booking-title"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Close button */}
            <button
              type="button"
              className="tenant-booking-close"
              onClick={resetAndClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {/* Success result */}
            {submitResult?.success ? (
              <div className="tenant-booking-result">
                <CheckCircle2 size={48} className="tenant-booking-success-icon" />
                <h2>Booking Submitted!</h2>
                <p>{submitResult.message}</p>
              </div>
            ) : submitResult?.success === false ? (
              <div className="tenant-booking-result">
                <AlertTriangle size={48} className="tenant-booking-error-icon" />
                <h2>Booking Failed</h2>
                <p>{submitResult.message}</p>
              </div>
            ) : (
              /* ---- Booking form ---- */
              <>
                <h2 className="tenant-booking-title" id="tenant-booking-title">
                  <CalendarDays size={22} />
                  Book this property
                </h2>
                <p className="tenant-booking-property-name">
                  {property?.title || 'Property'}
                </p>

                {/* Date pickers */}
                <div className="tenant-booking-dates">
                  <label className="tenant-booking-field">
                    <span>Check-in</span>
                    <input
                      type="date"
                      min={todayStr}
                      max={maxDate}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>

                  <label className="tenant-booking-field">
                    <span>Check-out</span>
                    <input
                      type="date"
                      min={startDate || todayStr}
                      max={maxDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>

                {/* Check Availability button */}
                <button
                  type="button"
                  className="tenant-booking-check-btn"
                  onClick={handleCheckAvailability}
                  disabled={checking || !startDate || !endDate}
                >
                  {checking ? (
                    <>
                      <Loader2 size={18} className="spin" /> Checking…
                    </>
                  ) : (
                    'Check Availability'
                  )}
                </button>

                {/* Overlap / availability result */}
                {overlapResult && (
                  <motion.div
                    className={`tenant-booking-availability ${
                      overlapResult.error
                        ? 'tenant-booking-availability--error'
                        : overlapResult.hasOverlap
                          ? 'tenant-booking-availability--overlap'
                          : 'tenant-booking-availability--ok'
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {overlapResult.error && (
                      <div>
                        <AlertTriangle size={18} />
                        <span>{overlapResult.error}</span>
                      </div>
                    )}

                    {overlapResult.hasOverlap && (
                      <div className="tenant-booking-availability-content">
                        <div className="tenant-booking-availability-header">
                          <AlertTriangle size={20} />
                          <strong>Date(s) already booked</strong>
                        </div>
                        <p>
                          Those dates conflict with an existing reservation. Please choose another date range.
                        </p>
                      </div>
                    )}

                    {!overlapResult.hasOverlap && !overlapResult.error && (
                      <div className="tenant-booking-availability-content">
                        <CheckCircle2 size={20} />
                        <strong>Dates available!</strong>
                      </div>
                    )}

                    {/* Confirm booking – only when dates are free */}
                    {!overlapResult.hasOverlap && !overlapResult.error && (
                      <button
                        type="button"
                        className="tenant-booking-confirm-btn"
                        onClick={handleConfirmBooking}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={18} className="spin" /> Submitting…
                          </>
                        ) : (
                          'Confirm Booking'
                        )}
                      </button>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TenantBookingModal;
