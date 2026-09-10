import { useEffect, useState } from 'react';
import { FileSignature, Printer } from 'lucide-react';
import { agreementApi } from '../api/agreements';
import './Compliance.css';

export default function Agreements() {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [signature, setSignature] = useState('');
  const load = async () => { const res = await agreementApi.mine(); setItems(res.data?.data || []); };
  useEffect(() => { load(); }, []);
  async function accept() { await agreementApi.accept(selected.id, signature); setSignature(''); setSelected(null); await load(); }
  return <div className="compliance-page"><header className="compliance-heading"><FileSignature/><div><h1>Rental Agreements</h1><p>Review and accept agreements generated from approved bookings.</p></div></header><section className="compliance-card"><div className="agreement-list">{items.map((a) => <button key={a.id} className="agreement-row" onClick={() => setSelected(a)}><span><strong>{a.property.title}</strong><small>{new Date(a.booking.start_date).toLocaleDateString()} – {new Date(a.booking.end_date).toLocaleDateString()}</small></span><b>{a.status}</b></button>)}{!items.length && <p>No rental agreements yet. An agreement is generated when a landlord approves your booking.</p>}</div></section>{selected && <section className="compliance-card agreement-document"><div className="agreement-toolbar"><h2>{selected.property.title}</h2><button onClick={() => window.print()}><Printer size={16}/> Print</button></div><p>{selected.terms}</p><dl><dt>Status</dt><dd>{selected.status}</dd><dt>Generated</dt><dd>{new Date(selected.generated_at).toLocaleString()}</dd></dl>{selected.status === 'DRAFT' && <div className="signature-box"><label>Type your full legal name to accept</label><input value={signature} onChange={(e) => setSignature(e.target.value)} /><button disabled={!signature.trim()} onClick={accept} className="compliance-primary">Accept agreement</button></div>}</section>}</div>;
}
