import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import {
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Minus,
  WalletCards,
  Wrench,
} from 'lucide-react'
import './TenantDashboard.css'
import { bookingApi } from '../api/booking'
import { maintenanceApi } from '../api/maintenance'
import { paymentApi } from '../api/payment'
import { favoritesApi } from '../api/favorites'

function TenantDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rentals, setRentals] = useState([])
  const [savedProperties, setSavedProperties] = useState([])
  const [payments, setPayments] = useState([])
  const [maintenance, setMaintenance] = useState([])

  useEffect(() => {
    localStorage.setItem('prmsDashboardPath', '/tenant')
    Promise.all([
      bookingApi.myBookings({ limit: 100 }), favoritesApi.getMyFavorites(),
      paymentApi.list({ limit: 100 }), maintenanceApi.mine(),
    ]).then(([bookingRes, favoriteRes, paymentRes, maintenanceRes]) => {
      const bookings = bookingRes.data?.data || []
      setRentals(bookings.filter((item) => ['CONFIRMED', 'CHECKED_IN'].includes(item.status)).map((item) => ({
        id: item.id, name: item.property?.title || 'Property', location: [item.property?.city, item.property?.state].filter(Boolean).join(', '),
      })))
      setSavedProperties((favoriteRes.data?.data || []).map((item) => ({
        id: item.id, propertyId: item.property?.id || item.property?._id, name: item.property?.title || 'Property', location: [item.property?.city, item.property?.state].filter(Boolean).join(', '),
        price: new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(item.property?.rent || 0) + ' / month',
        image: item.property?.images?.[0]?.url || '',
      })))
      setPayments((paymentRes.data?.data || []).map((item) => ({
        id: item.id, title: item.booking?.property?.title || item.type || 'Rental payment',
        date: new Date(item.due_date).toLocaleDateString('en-MY'), amount: new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }).format(item.amount),
        numericAmount: item.amount, dueDate: item.due_date, status: item.status,
      })))
      setMaintenance((maintenanceRes.data?.data || []).map((item) => ({
        id: item.id, title: item.title, desc: item.description, status: item.status.replaceAll('_', ' '), urgent: ['HIGH', 'URGENT'].includes(item.priority),
      })))
    }).finally(() => setLoading(false))
  }, [])

  const nextPayment = payments.filter((item) => item.status === 'PENDING').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]

  async function removeSavedProperty(property) {
    if (!property.propertyId) return
    await favoritesApi.removeFavorite({ propertyId: property.propertyId })
    setSavedProperties((current) => current.filter((item) => item.id !== property.id))
  }

  /* ---- KPI Card helper ---- */
  function KpiCard({ icon: Icon, iconBg, label, value, sublabel, trend, trendDir }) {
    const TrendIcon =
      trendDir === 'up' ? (
        <ArrowUp size={14} className="text-status-success" />
      ) : (
        <Minus size={14} className="text-text-secondary" />
      )

    return (
      <div className="kpi-card">
        <div className="kpi-card-top">
          <div className={`kpi-icon-wrap ${iconBg}`}>
            <Icon size={20} />
          </div>
          {trend && (
            <span className={`trend-pill ${trendDir === 'up' ? 'positive' : 'neutral'}`}>
              {TrendIcon}
              {trend}
            </span>
          )}
        </div>
        <div className="kpi-card-body">
          <span className="kpi-label">{label}</span>
          <div className="kpi-value">{value}</div>
          {sublabel && <span className="kpi-sublabel">{sublabel}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="tenant-dashboard-page" data-customize-id="global.content">
      {/* ---- Hero ---- */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">apartment</span>
            My Tenancy Hub
          </h1>
          <p>Here&apos;s what&apos;s happening with your rentals today.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-outline" onClick={() => navigate(ROUTES.tenant.maintenance)}>
            <Wrench size={18} />
            Requests
          </button>
          <button type="button" className="btn-primary-solid" onClick={() => navigate(ROUTES.tenant.payments)}>
            <WalletCards size={18} />
            Pay Now
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <section className="kpi-card-grid">
        {loading ? (
          <>
            {[1, 2, 3].map((n) => (
              <div key={n} className="kpi-card kpi-skeleton">
                <div className="skeleton-line skeleton-sm" />
                <div className="skeleton-line skeleton-lg" />
                <div className="skeleton-line skeleton-xs" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Next Payment */}
            <KpiCard
              icon={WalletCards}
              iconBg="icon-purple"
              label="Next Payment Due"
              value={nextPayment?.amount || 'RM 0.00'}
              sublabel={nextPayment ? `Due ${nextPayment.date}` : 'No pending payment'}
              trend={nextPayment ? 'Due soon' : 'Up to date'}
              trendDir="neutral"
            />

            {/* Active Rentals */}
            <KpiCard
              icon={Home}
              iconBg="icon-blue"
              label="Active Rentals"
              value={String(rentals.length)}
              sublabel={`Across ${new Set(rentals.map((item) => item.location)).size} locations`}
              trend={rentals.length ? 'Active' : 'No active lease'}
              trendDir="up"
            />

            {/* Maintenance */}
            <KpiCard
              icon={Wrench}
              iconBg="icon-rose"
              label="Maintenance"
              value={`${maintenance.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)).length} Open`}
              sublabel={`${maintenance.length} total requests`}
              trend="In progress"
              trendDir="neutral"
            />
          </>
        )}
      </section>

      {/* ---- Active Rentals panel ---- */}
      <section className="panel-card">
        <div className="panel-title">
          <div>
            <h3 className="panel-title-text">Active Rentals</h3>
            <p className="panel-subtitle">Your current lease agreements</p>
          </div>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => navigate(ROUTES.tenant.bookings)}
          >
            View All
          </button>
        </div>

        <div className="tenant-rental-list">
          {rentals.map((rental) => (
            <div className="tenant-rental-item" key={rental.id}>
              <div className="tenant-rental-dot" />
              <div>
                <strong>{rental.name}</strong>
                <p>{rental.location}</p>
              </div>
              <span className="status-badge active">Active</span>
            </div>
          ))}
          {!rentals.length && <p className="panel-subtitle">No active rentals.</p>}
        </div>
      </section>

      {/* ---- Saved Properties ---- */}
      <section className="saved-panel">
        <div className="saved-header">
          <div>
            <h3 className="panel-title-text">Saved Properties</h3>
            <p className="panel-subtitle">Properties you have on your watchlist</p>
          </div>
          <button
            type="button"
            className="btn-outline-sm"
            onClick={() => navigate(ROUTES.tenant.properties)}
          >
            View All
          </button>
        </div>

        <div className="saved-grid">
          {savedProperties.map((property) => (
            <article className="saved-card" key={property.id} onClick={() => property.propertyId && navigate(`/tenant/properties/${property.propertyId}`)}>
              {property.image ? <img src={property.image} alt={property.name} /> : <div className="saved-image-placeholder"><Home size={42} /></div>}

              <button type="button" className="heart-btn" aria-label={`Remove ${property.name} from saved properties`} onClick={(event) => { event.stopPropagation(); removeSavedProperty(property) }}>
                <Heart size={24} fill="currentColor" />
              </button>

              <div className="saved-overlay">
                <h4>{property.name}</h4>
                <p>{property.location}</p>
                <span>{property.price}</span>
              </div>
            </article>
          ))}
          {!savedProperties.length && <p className="panel-subtitle">No saved properties yet.</p>}
        </div>
      </section>

      {/* ---- Bottom grid: Payments + Maintenance ---- */}
      <section className="dashboard-main-grid">
        {/* Payment history */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Payment Activity</h3>
              <p className="panel-subtitle">Recent transactions and upcoming dues</p>
            </div>
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => navigate(ROUTES.tenant.payments)}
            >
              See All
            </button>
          </div>

          <div className="payment-list">
            {payments.map((payment) => (
              <div className="payment-item" key={payment.id}>
                <div className="payment-icon-sm">
                  <WalletCards size={22} />
                </div>

                <div className="payment-info">
                  <h4>{payment.title}</h4>
                  <p>
                    <CalendarDays size={12} className="payment-cal-icon" />
                    {payment.date}
                  </p>
                </div>

                <div className="payment-right">
                  <strong>{payment.amount}</strong>
                  <span
                    className={
                      payment.status === 'PAID'
                        ? 'status-badge paid'
                        : 'status-badge pending'
                    }
                  >
                    {payment.status === 'PAID' ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock size={12} />
                    )}
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
            {!payments.length && <p className="panel-subtitle">No payment activity.</p>}
          </div>
        </div>

        {/* Maintenance */}
        <div className="panel-card">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Maintenance Updates</h3>
              <p className="panel-subtitle">Open work orders and repair status</p>
            </div>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => navigate(ROUTES.tenant.maintenance)}
            >
              <Wrench size={16} />
              New Request
            </button>
          </div>

          <div className="maintenance-list">
            {maintenance.map((req) => (
              <div className="maintenance-item" key={req.id}>
                <div className={`maintenance-icon ${req.urgent ? 'urgent' : 'soft'}`}>
                  <Wrench size={22} />
                </div>

                <div className="maintenance-info">
                  <h4>{req.title}</h4>
                  <p>{req.desc}</p>
                  <span className={`status-badge ${req.urgent ? 'pending' : 'active'}`}>
                    {req.urgent ? (
                      <Clock size={12} />
                    ) : (
                      <CheckCircle2 size={12} />
                    )}
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
            {!maintenance.length && <p className="panel-subtitle">No maintenance requests.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

export default TenantDashboard
