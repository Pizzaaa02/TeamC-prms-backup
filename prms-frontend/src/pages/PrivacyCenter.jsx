import { useCallback, useEffect, useState } from 'react';
import { Download, ShieldCheck, Send } from 'lucide-react';
import { privacyApi } from '../api/privacy';
import './Compliance.css';

const requestOptions = [
  ['ACCESS', 'Access my personal data'], ['CORRECTION', 'Correct inaccurate data'], ['WITHDRAW_CONSENT', 'Withdraw consent'],
  ['ERASURE', 'Request erasure'], ['RESTRICT_PROCESSING', 'Restrict processing'], ['OBJECT_DIRECT_MARKETING', 'Stop direct marketing'],
];

export default function PrivacyCenter() {
  const [consents, setConsents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [type, setType] = useState('ACCESS');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const [c, r] = await Promise.all([privacyApi.consents(), privacyApi.myRequests()]);
    setConsents(c.data?.data || []); setRequests(r.data?.data || []);
  }, []);
  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [load]);

  const latestMarketing = consents.find((item) => item.purpose === 'direct_marketing')?.granted || false;
  async function toggleMarketing() { await privacyApi.recordConsent('direct_marketing', !latestMarketing); await load(); }
  async function exportData() {
    const res = await privacyApi.exportData();
    const blob = new Blob([JSON.stringify(res.data?.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'prms-personal-data.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function submit(e) { e.preventDefault(); await privacyApi.submitRequest(type, details); setDetails(''); setMessage('Your request has been submitted.'); await load(); }

  return <div className="compliance-page">
    <header className="compliance-heading"><ShieldCheck /><div><h1>Privacy Centre</h1><p>Manage consent and exercise your personal-data rights.</p></div></header>
    {message && <div className="compliance-message" role="status">{message}</div>}
    <div className="compliance-grid">
      <section className="compliance-card"><h2>Consent preferences</h2><div className="preference-row"><div><strong>Direct marketing</strong><p>Optional product announcements and promotions.</p></div><button onClick={toggleMarketing} className={latestMarketing ? 'toggle-on' : ''} aria-pressed={latestMarketing}>{latestMarketing ? 'Allowed' : 'Declined'}</button></div><p className="fine-print">Essential processing required to provide your account and rental services cannot be disabled while the account is active.</p></section>
      <section className="compliance-card"><h2>Download your information</h2><p>Receive the personal information associated with your account in JSON format.</p><button className="compliance-primary" onClick={exportData}><Download size={17}/> Download my data</button></section>
    </div>
    <section className="compliance-card"><h2>Submit a privacy request</h2><form className="privacy-form" onSubmit={submit}><select value={type} onChange={(e) => setType(e.target.value)}>{requestOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what you need (do not include passwords or payment credentials)."/><button className="compliance-primary"><Send size={17}/> Submit request</button></form></section>
    <section className="compliance-card"><h2>Request history</h2><div className="responsive-table"><table><thead><tr><th>Request</th><th>Status</th><th>Submitted</th><th>Response</th></tr></thead><tbody>{requests.map((r) => <tr key={r.id}><td>{r.type.replaceAll('_', ' ')}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleDateString()}</td><td>{r.response || 'Pending review'}</td></tr>)}{!requests.length && <tr><td colSpan="4">No requests submitted.</td></tr>}</tbody></table></div></section>
  </div>;
}
