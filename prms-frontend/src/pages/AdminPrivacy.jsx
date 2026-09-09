import { useCallback, useEffect, useState } from 'react';
import { privacyApi } from '../api/privacy';
import './Compliance.css';

export default function AdminPrivacy() {
  const [requests, setRequests] = useState([]);
  const [breaches, setBreaches] = useState([]);
  const [message, setMessage] = useState('');
  const [incident, setIncident] = useState({ title: '', description: '', affectedRecords: 0 });
  const load = useCallback(async () => {
    const [requestRes, breachRes] = await Promise.all([privacyApi.allRequests(), privacyApi.breaches()]);
    setRequests(requestRes.data?.data || []);
    setBreaches(breachRes.data?.data || []);
  }, []);
  useEffect(() => { load().catch(() => setMessage('Unable to load privacy operations.')); }, [load]);

  const resolve = async (id, status) => {
    await privacyApi.updateRequest(id, status, status === 'COMPLETED' ? 'Request completed by the privacy administrator.' : 'Request is being reviewed.');
    setMessage('Privacy request updated.');
    await load();
  };
  const addIncident = async (event) => {
    event.preventDefault();
    await privacyApi.createBreach({ ...incident, affectedRecords: Number(incident.affectedRecords) });
    setIncident({ title: '', description: '', affectedRecords: 0 });
    setMessage('Incident recorded for assessment and notification tracking.');
    await load();
  };
  const cleanup = async () => {
    const result = await privacyApi.retentionCleanup();
    setMessage(`Retention cleanup completed: ${result.data?.data?.notificationsDeleted || 0} notifications and ${result.data?.data?.auditLogsDeleted || 0} audit records removed.`);
  };

  return <div className="compliance-page">
    <header className="compliance-hero"><p className="eyebrow">PDPA operations</p><h1>Privacy administration</h1><p>Track data-subject requests, incidents and configured retention controls.</p></header>
    {message && <div className="compliance-message" role="status">{message}</div>}
    <section className="compliance-card"><div className="compliance-card-heading"><h2>Data-subject requests</h2><span>{requests.length} total</span></div>
      <div className="compliance-table-wrap"><table><thead><tr><th>Requester</th><th>Type</th><th>Status</th><th>Submitted</th><th>Action</th></tr></thead><tbody>
        {requests.map((item) => <tr key={item.id}><td>{item.user?.email || item.userId}</td><td>{item.type.replaceAll('_', ' ')}</td><td>{item.status}</td><td>{new Date(item.createdAt).toLocaleDateString('en-MY')}</td><td><button className="btn btn-sm btn-outline" onClick={() => resolve(item.id, 'IN_PROGRESS')}>Review</button> <button className="btn btn-sm btn-primary" onClick={() => resolve(item.id, 'COMPLETED')}>Complete</button></td></tr>)}
        {!requests.length && <tr><td colSpan="5">No requests submitted.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="compliance-grid"><form className="compliance-card" onSubmit={addIncident}><h2>Record a data incident</h2><label>Incident title<input required value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} /></label><label>Description<textarea required rows="4" value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} /></label><label>Potentially affected records<input type="number" min="0" value={incident.affectedRecords} onChange={(e) => setIncident({ ...incident, affectedRecords: e.target.value })} /></label><button className="btn btn-primary" type="submit">Record incident</button></form>
      <section className="compliance-card"><h2>Retention and incidents</h2><p>Apply the documented default retention windows to expired notifications and audit records.</p><button className="btn btn-outline" onClick={cleanup}>Run retention cleanup</button><h3>Incident register</h3><ul className="compliance-list">{breaches.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.status} · {item.affectedRecords} records</span></li>)}{!breaches.length && <li>No incidents recorded.</li>}</ul></section>
    </section>
  </div>;
}
