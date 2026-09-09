import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import MaintenanceForm from '../components/MaintenanceForm';
import { maintenanceApi } from '../api/maintenance';

const STATUS_TABS = ['all', 'open', 'in_progress', 'resolved', 'closed'];

export default function TenantMaintenance() {
  const [tab, setTab] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await maintenanceApi.mine();
      const all = res.data?.data || [];
      setTickets(tab === 'all' ? all : all.filter((ticket) => ticket.status === tab.toUpperCase()));
    } catch (e) { setError(e.message || 'Failed to load tickets'); console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Maintenance</h1>
        <button className="btn btn-primary" onClick={() => setFormOpen(true)}>+ New Request</button>
      </div>

      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-danger mt-2">{error} <button className="btn btn-sm" onClick={load}>Retry</button></div>}
        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Property</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{t.property?.title || 'N/A'}</td>
                  <td><span className={`status-badge status-${t.priority ?? 'medium'}`}>{t.priority ?? 'medium'}</span></td>
                  <td><span className={`status-badge status-${(t.status || '').toLowerCase()}`}>{t.status}</span></td>
                  <td>{new Date(t.createdAt || t.created_at).toLocaleDateString()}</td>
                  <td><button className="btn btn-sm btn-outline" onClick={() => setSelected(t)}>View</button></td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No maintenance tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <Modal isOpen={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} title="Ticket Detail">
          <p>{selected.description}</p>
          <p><strong>Priority:</strong> {selected.priority} | <strong>Status:</strong> {selected.status}</p>
          <div className="notes mt-2">
            <h4>Notes</h4>
            {(selected.notes || []).map((n, i) => (
              <div key={i} className="note-item">{n.note || n.message}</div>
            ))}
          </div>
        </Modal>
      )}

      {/* Create Form */}
      {formOpen && <MaintenanceForm onSuccess={() => { setFormOpen(false); load(); }} />}
    </div>
  );
}
