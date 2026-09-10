import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Building2, CalendarDays, Download, WalletCards } from 'lucide-react'
import { agentApi } from '../api/agents'
import './Compliance.css'

export default function AgentPortfolio({ mode = 'reports' }) {
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([agentApi.getMyProperties(), agentApi.getMyBookings()])
      .then(([propertyRes, bookingRes]) => {
        setProperties((propertyRes.data?.data || []).map((entry) => entry.property || entry))
        setBookings(bookingRes.data?.data || [])
      })
      .catch((requestError) => setError(requestError.message || 'Unable to load assigned portfolio'))
      .finally(() => setLoading(false))
  }, [])

  const rented = properties.filter((property) => property.status === 'RENTED')
  const activeBookings = bookings.filter((booking) => ['CONFIRMED', 'CHECKED_IN'].includes(booking.status))
  const monthlyRent = rented.reduce((sum, property) => sum + (property.rent || 0), 0)
  const title = mode === 'finance' ? 'Assigned Portfolio Overview' : 'Assignment Reports'
  const Icon = mode === 'finance' ? WalletCards : BarChart3

  const propertyRows = useMemo(() => properties.map((property) => ({
    id: property.id,
    title: property.title,
    location: [property.city, property.state].filter(Boolean).join(', ') || property.address || '—',
    rent: property.rent || 0,
    status: property.status || 'UNKNOWN',
  })), [properties])

  function exportCsv() {
    const rows = [['Property', 'Location', 'Monthly rent', 'Status'], ...propertyRows.map((row) => [row.title, row.location, row.rent, row.status])]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `agent-${mode}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="compliance-page">
      <header className="compliance-heading">
        <Icon />
        <div><h1>{title}</h1><p>Only properties and bookings assigned to your Agent account are shown.</p></div>
        <button type="button" className="compliance-primary" onClick={exportCsv} disabled={loading || !propertyRows.length}><Download size={16} /> Export CSV</button>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}
      <section className="kpi-card-grid">
        <article className="kpi-card"><Building2 /><span className="kpi-label">Assigned Properties</span><strong className="kpi-value">{properties.length}</strong></article>
        <article className="kpi-card"><CalendarDays /><span className="kpi-label">Active Bookings</span><strong className="kpi-value">{activeBookings.length}</strong></article>
        <article className="kpi-card"><Building2 /><span className="kpi-label">Rented Properties</span><strong className="kpi-value">{rented.length}</strong></article>
        <article className="kpi-card"><WalletCards /><span className="kpi-label">Assigned Monthly Rent</span><strong className="kpi-value">RM {monthlyRent.toLocaleString()}</strong></article>
      </section>

      <section className="compliance-card">
        <h2>Assigned property summary</h2>
        {loading ? <p>Loading…</p> : (
          <div className="responsive-table"><table><thead><tr><th>Property</th><th>Location</th><th>Monthly Rent</th><th>Status</th></tr></thead><tbody>
            {propertyRows.map((row) => <tr key={row.id}><td>{row.title}</td><td>{row.location}</td><td>RM {row.rent.toLocaleString()}</td><td><span className={`status-badge status-${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}
            {!propertyRows.length && <tr><td colSpan="4">No properties assigned.</td></tr>}
          </tbody></table></div>
        )}
      </section>
    </div>
  )
}
