import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../config/routes'
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Download,
  Loader,
  Plus,
  TrendingUp,
  Users,
  WalletCards,
  Wrench,
  Minus,
} from 'lucide-react'
import { bookingApi } from '../api/booking'
import { maintenanceApi } from '../api/maintenance'
import { propertyApi } from '../api/property'
import { adminApi } from '../api/admin'
import './LandlordDashboard.css'

function rowsFrom(response) {
  const payload = response?.data?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(response?.data)) return response.data
  return []
}

function LandlordDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(0)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    totalProperties: 0,
    activeProperties: 0,
    pendingBookings: 0,
    approvedBookings: 0,
    rejectedBookings: 0,
    cancelledBookings: 0,
    openTickets: 0,
    urgentTickets: 0,
  })
  const [approvals, setApprovals] = useState([])
  const [propertiesList, setPropertiesList] = useState([])
  const [revenueBars, setRevenueBars] = useState([])

  async function loadDashboard() {
    setLoading(true)
    let errCount = 0

    try {
      /* ---- Booking stats (pending / confirmed / cancelled counts) ---- */
      try {
        const res = await bookingApi.list({ limit: 100 })
        const bookings = rowsFrom(res)
        const pending = bookings.filter((b) => b.status === 'PENDING').length
        const confirmed = bookings.filter((b) => b.status === 'CONFIRMED').length
        const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length
        setStats((s) => ({ ...s, pendingBookings: pending, approvedBookings: confirmed, rejectedBookings: 0, cancelledBookings: cancelled }))

        /* Pending bookings become the approval queue */
        const pendingArr = bookings.filter((b) => b.status === 'PENDING').slice(0, 4)
        setApprovals(
          pendingArr.map((b) => ({
            id: b.id,
            name: b.user?.full_name ?? b.user?.email ?? 'Tenant',
            unit: b.property?.title ?? 'Property',
            time: timeAgo(b.created_at),
            initials: initialsOf(b.user),
            approving: false,
            approvalMsg: '',
            approvalMsgClass: '',
          }))
        )
      } catch {
        errCount++
      }

      /* ---- Property stats (occupancy, total/active) ---- */
      try {
        const propsRes = await propertyApi.myProperties()
        const props = rowsFrom(propsRes)
        const total = props.length
        const active = props.filter((p) => p.status === 'Active' || p.status === 'AVAILABLE').length
        const rate = total > 0 ? Math.round((active / total) * 100) : 0
        setStats((s) => ({ ...s, totalProperties: total, activeProperties: active, occupancyRate: rate }))

        /* Property summary — top 3 by revenue */
        const availableProperties = props.filter((p) => p.status === 'Active' || p.status === 'AVAILABLE')
        setPropertiesList(availableProperties)
      } catch {
        errCount++
      }

      /* ---- Maintenance stats (open tickets, urgent) ---- */
      try {
        const maintRes = await maintenanceApi.list({ limit: 100 })
        const tickets = rowsFrom(maintRes)
        const open = tickets.filter((m) => m.status === 'OPEN' || m.status === 'IN_PROGRESS').length
        const urgent = tickets.filter((m) => m.priority === 'HIGH').length
        setStats((s) => ({ ...s, openTickets: open, urgentTickets: urgent }))
      } catch {
        errCount++
      }

      /* ---- Revenue stats (dashboard endpoint) ---- */
      try {
        const dashRes = await adminApi.getDashboardStats()
        const dashboardData = dashRes?.data?.data ?? dashRes?.data
        if (dashboardData) {
          setStats((s) => ({ ...s, totalRevenue: dashboardData.totalRevenue ?? 0 }))

          /* Revenue bars from reporting endpoint */
          const revRes = await adminApi.getRevenueReport()
          const revData = revRes?.data?.data ?? revRes?.data
          if (revData && revData.payments) {
            const byMonth = computeRevenueByMonth(revData.payments)
            setRevenueBars(byMonth.slice(0, 9))
          }
        }
      } catch {
        errCount++
      }
    } finally {
      setErrors(errCount)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function handleApprove(bookingId, status) {
    /* Mark this approval in-flight */
    setApprovals((prev) =>
      prev.map((a) => (a.id === bookingId ? { ...a, approving: true, approvalMsg: '' } : a))
    )
    try {
      await bookingApi.updateStatus(bookingId, status)
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === bookingId
            ? {
                ...a,
                approving: false,
                approvalMsg: status === 'CONFIRMED' ? '✓ Booking confirmed' : '✗ Booking declined',
                approvalMsgClass: status === 'CONFIRMED' ? 'text-green-600' : 'text-red-600',
              }
            : a
        )
      )
      /* Remove after a short delay */
      setTimeout(() => {
        setApprovals((prev) => prev.filter((a) => a.id !== bookingId))
        setStats((s) => ({
          ...s,
          pendingBookings: Math.max(0, s.pendingBookings - 1),
          approvedBookings: status === 'CONFIRMED' ? s.approvedBookings + 1 : s.approvedBookings,
          rejectedBookings: status === 'CANCELLED' ? s.rejectedBookings + 1 : s.rejectedBookings,
        }))
      }, 1500)
    } catch {
      setApprovals((prev) =>
        prev.map((a) => (a.id === bookingId ? { ...a, approving: false, approvalMsg: 'Failed — try again' } : a))
      )
    }
  }

  /* ---- KPI Card helper ---- */
  function KpiCard({ icon: Icon, iconBg, label, value, sublabel, trend, trendDir }) {
    const TrendIcon =
      trendDir === 'up' ? (
        <ArrowUp size={14} className="text-status-success" />
      ) : trendDir === 'down' ? (
        <ArrowDown size={14} className="text-status-error" />
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
            <span className={`trend-pill ${trendDir === 'up' ? 'positive' : trendDir === 'down' ? 'negative' : 'neutral'}`}>
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

  function exportPortfolioCsv() {
    const header = 'Property,Location,Status,Monthly Rent'
    const rows = propertiesList.map((property) => [
      property.title || '',
      property.city || property.address || '',
      property.status || '',
      property.rent || 0,
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'landlord-portfolio.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="landlord-dashboard-page" data-customize-id="global.content">
      {/* Page title row */}
      <div className="landlord-page-title-row">
        <div>
          <h1>
            <span className="material-symbols-outlined brand-icon">home_repair_service</span>
            Portfolio Overview
          </h1>
          <p>Here's what's happening with your properties today.</p>
        </div>

        <div className="landlord-page-actions">
          <button type="button" className="btn-outline" onClick={exportPortfolioCsv} disabled={!propertiesList.length}>
            <Download size={18} />
            Export
          </button>
          <button
            type="button"
            className="btn-primary-solid"
            onClick={() => navigate(ROUTES.landlord.properties)}
          >
            <Plus size={18} />
            New Listing
          </button>
        </div>
      </div>

      {/* ---- KPI Cards ---- */}
      <section className="kpi-card-grid">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="kpi-card kpi-skeleton">
                <div className="skeleton-line skeleton-sm" />
                <div className="skeleton-line skeleton-lg" />
                <div className="skeleton-line skeleton-xs" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Revenue */}
            <KpiCard
              icon={WalletCards}
              iconBg="icon-purple"
              label="Total Revenue"
              value={`RM ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />

            {/* Occupancy */}
            <KpiCard
              icon={Users}
              iconBg="icon-blue"
              label="Available Properties"
              value={stats.activeProperties}
              sublabel={`${stats.occupancyRate}% of ${stats.totalProperties} properties`}
              trend={stats.occupancyRate >= 80 ? 'Ready' : 'Limited'}
              trendDir={stats.occupancyRate >= 80 ? 'up' : 'neutral'}
            />

            {/* Pending bookings */}
            <KpiCard
              icon={Bell}
              iconBg="icon-amber"
              label="Pending Bookings"
              value={stats.pendingBookings}
              sublabel={`${stats.approvedBookings} confirmed`}
              trend={`${stats.pendingBookings} awaiting`}
              trendDir={stats.pendingBookings > 0 ? 'up' : 'neutral'}
            />

            {/* Tickets */}
            <KpiCard
              icon={Wrench}
              iconBg="icon-rose"
              label="Open Tickets"
              value={stats.openTickets}
              sublabel={`${stats.urgentTickets} urgent`}
              trend={stats.urgentTickets > 0 ? `${stats.urgentTickets} high` : '0 high'}
              trendDir={stats.urgentTickets > 0 ? 'down' : 'up'}
            />
          </>
        )}
      </section>

      {/* ---- Revenue chart + Approval queue ---- */}
      <section className="dashboard-main-grid">
        {/* Revenue bar chart */}
        <div className="panel-card revenue-panel">
          <div className="panel-title">
            <div>
              <h3 className="panel-title-text">Revenue Growth</h3>
              <p className="panel-subtitle">Monthly performance comparison</p>
            </div>
            <div className="btn-ghost chart-period" aria-label="Revenue period: recent months">
              <TrendingUp size={16} />
              Recent Months
            </div>
          </div>

          <div className="bar-chart">
            {loading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div className="bar-item" key={i}>
                  <div className="bar skeleton-bar" />
                  <span>...</span>
                </div>
              ))
            ) : revenueBars.length === 0 ? (
              <div className="chart-empty">
                <TrendingUp size={32} className="text-text-secondary" />
                <p>No revenue data available</p>
              </div>
            ) : (
              revenueBars.map((bar) => (
                <div className="bar-item" key={bar.label}>
                  <div
                    className={`bar ${bar.active ? 'bar-active' : 'bar-default'}`}
                    style={{ height: `${bar.height}%` }}
                  />
                  <span className="bar-label">{bar.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending approvals from real data */}
        <div className="panel-card approval-panel">
          <div className="approval-header">
            <h3 className="panel-title-text">Pending Approvals</h3>
            {approvals.length > 0 && (
              <span className="approval-badge">{approvals.length} new</span>
            )}
          </div>
          <div className="approval-list custom-scrollbar">
            {loading ? (
              <p className="approval-empty-state">Loading...</p>
            ) : !approvals.length ? (
              <p className="approval-empty-state">No pending approvals — all caught up!</p>
            ) : (
              approvals.map((a) => (
                <div className="approval-card" key={a.id}>
                  <div className="approval-avatar">{a.initials}</div>
                  <div className="approval-info">
                    <div className="approval-name-row">
                      <h4>{a.name}</h4>
                      <span className="approval-time">{a.time}</span>
                    </div>
                    <p className="approval-unit">{a.unit}</p>
                    <div className="approval-actions">
                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApprove(a.id, 'CONFIRMED')}
                        disabled={a.approving !== undefined && a.approving}
                      >
                        {a.approving ? <Loader size={14} className="animate-spin" /> : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="btn-decline"
                        onClick={() => handleApprove(a.id, 'CANCELLED')}
                        disabled={a.approving !== undefined && a.approving}
                      >
                        {a.approving ? <Loader size={14} className="animate-spin" /> : 'Decline'}
                      </button>
                    </div>
                    <p className={a.approvalMsgClass} style={{ fontSize: '12px', marginTop: 4 }}>
                      {a.approvalMsg}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ---- Property summary from real data ---- */}
      {propertiesList.length > 0 && (
        <section className="property-summary">
          <h3 className="property-summary-title">
            <span className="material-symbols-outlined">apartment</span>
            Asset Summary
          </h3>
          <div className="property-summary-grid">
          {propertiesList.slice(0, 3).map((p) => (
            <div className="summary-card" key={p.id}>
              <div className="summary-image" style={{
                backgroundImage: `url(${p.main_image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=900&auto=format&fit=crop'})`
              }} />
              <div className="summary-body">
                <h4 className="summary-title">{p.title}</h4>
                <p className="summary-detail">{p.city || p.address || '—'} · {p.status}</p>
              </div>
              <span className="summary-price">RM {(p.rent || 0).toLocaleString()}</span>
            </div>
          ))}
          </div>
        </section>
      )}

      {/* Error indicator */}
      {errors > 1 && (
        <div className="dashboard-warn">
          ⚠ Some dashboard data may be incomplete ({errors}/4 endpoints failed)
        </div>
      )}
    </div>
  )
}

/* ---- Helpers ---- */
function initialsOf(user) {
  if (!user) return '??'
  const name = user.full_name ?? user.email ?? ''
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const now = new Date()
  const then = new Date(dateStr)
  const diff = (now - then) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function computeRevenueByMonth(payments) {
  if (!payments || !payments.length) return []
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const map = {}
  payments.forEach((p) => {
    const d = new Date(p.paid_at || p.created_at || Date.now())
    const key = months[d.getMonth()]
    map[key] = (map[key] || 0) + (p.amount || 0)
  })
  const max = Math.max(...Object.values(map), 1)
  return Object.entries(map).map(([label, value], idx) => ({
    label,
    value,
    height: Math.max(10, Math.round((value / max) * 100)),
    active: idx % 2 === 0,
  }))
}

export default LandlordDashboard
