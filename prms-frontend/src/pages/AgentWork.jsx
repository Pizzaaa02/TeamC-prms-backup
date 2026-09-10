import { useEffect, useState } from 'react';
import { agentApi } from '../api/agents';
import './Compliance.css';

export default function AgentWork({ mode }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { (mode === 'properties' ? agentApi.getMyProperties() : agentApi.getMyBookings()).then((r) => setItems(r.data?.data || [])).finally(() => setLoading(false)); }, [mode]);
  const properties = mode === 'properties' ? items.map((x) => x.property || x) : [];
  return <div className="compliance-page"><header className="compliance-heading"><div><h1>{mode === 'properties' ? 'Assigned Properties' : 'Assigned Bookings'}</h1><p>Live records assigned to your Agent account.</p></div></header><section className="compliance-card">{loading ? <p>Loading…</p> : <div className="responsive-table"><table><thead><tr>{mode === 'properties' ? <><th>Property</th><th>Location</th><th>Rent</th><th>Status</th></> : <><th>Tenant</th><th>Property</th><th>Dates</th><th>Status</th></>}</tr></thead><tbody>{mode === 'properties' ? properties.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.city}, {p.state}</td><td>RM {p.rent?.toLocaleString()}</td><td>{p.status}</td></tr>) : items.map((b) => <tr key={b.id}><td>{b.user?.full_name || b.user?.email}</td><td>{b.property?.title}</td><td>{new Date(b.start_date).toLocaleDateString()} – {new Date(b.end_date).toLocaleDateString()}</td><td>{b.status}</td></tr>)}{!items.length && <tr><td colSpan="4">No assigned records.</td></tr>}</tbody></table></div>}</section></div>;
}
