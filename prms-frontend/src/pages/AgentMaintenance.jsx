import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';

const STATUS_TABS = ['open', 'in_progress', 'resolved', 'closed'];

export default function AgentMaintenance() {
  const [tab, setTab] = useState('open');
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.list({ status: tab.toUpperCase() });
      setTickets(res.data?.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    try { await maintenanceApi.updateStatus(id, status); load(); } catch (e) { alert('Failed'); }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Maintenance Queue</h1>
      </div>

      <div className="card-table">
        <div className="status-filter">
          {STATUS_TABS.map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Property</th><th>Tenant</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.id}>
                  <td>{t.title}</td>
                  <td>{t.property?.title || 'N/A'}</td>
                  <td>{t.createdBy?.full_name ?? t.createdBy?.email}</td>
                  <td><span className={`status-badge status-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`status-badge status-${(t.status||'').toLowerCase()}`}>{t.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => setSelected(t)}>Detail</button>
                    {t.status === 'OPEN' && <button className="btn btn-sm btn-primary ml-1" onClick={() => updateStatus(t.id, 'IN_PROGRESS')}>Start work</button>}
                    {!['RESOLVED', 'CLOSED'].includes(t.status) && <button className="btn btn-sm btn-success ml-1" onClick={() => updateStatus(t.id, 'RESOLVED')}>Mark Resolved</button>}
                  </td>
                </tr>
              ))}
              {!tickets.length && <tr><td colSpan={6}>No tickets.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal isOpen={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }} title="Ticket Detail">
          <h3>{selected.title}</h3>
          <p>{selected.description}</p>
          <p><strong>Priority:</strong> {selected.priority} | <strong>Status:</strong> {selected.status}</p>
        </Modal>
      )}
    </div>
  );
}
