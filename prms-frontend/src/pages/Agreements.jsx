import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, Printer, ShieldCheck } from 'lucide-react';
import { agreementApi } from '../api/agreements';
import { useAuth } from '../contexts/AuthContext';
import './Compliance.css';

const labelStatus = (value) => (value || '').replaceAll('_', ' ');

export default function Agreements() {
  const { user } = useAuth();
  const role = user?.role || 'Tenant';
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [signature, setSignature] = useState('');
  const [consented, setConsented] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = role === 'Tenant' ? await agreementApi.mine() : await agreementApi.list();
      setItems(res.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load agreements');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const alreadySigned = role === 'Tenant' ? selected?.tenantSignature : selected?.landlordSignature;
  const missingSignature = selected && (!selected.tenantSignature || !selected.landlordSignature);
  const awaitingSignatures = selected?.status === 'DRAFT' || (selected?.status === 'ACTIVE' && missingSignature);
  const canSign = awaitingSignatures && selected?.booking?.status === 'CONFIRMED' && ['Tenant', 'Landlord'].includes(role) && !alreadySigned;

  async function sign() {
    if (!selected || !signature.trim() || !consented) return;
    setSigning(true);
    setError('');
    try {
      const res = await agreementApi.sign(selected.id, signature.trim());
      const updated = res.data?.data;
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setSignature('');
      setConsented(false);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to sign agreement');
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="compliance-page">
      <header className="compliance-heading">
        <FileSignature />
        <div>
          <h1>Rental Agreements</h1>
          <p>{role === 'Tenant' ? 'Review and sign agreements for your approved bookings.' : role === 'Landlord' ? 'Review and sign agreements for your properties.' : 'Supervise platform rental agreements in read-only mode.'}</p>
        </div>
      </header>

      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-sm" onClick={load}>Retry</button></div>}

      <section className="compliance-card">
        {loading ? <p className="agreement-loading"><Loader2 className="spin" size={18} /> Loading agreements…</p> : (
          <div className="agreement-list">
            {items.map((agreement) => (
              <button key={agreement.id} className={`agreement-row ${selected?.id === agreement.id ? 'agreement-row--selected' : ''}`} onClick={() => { setSelected(agreement); setSignature(''); setConsented(false); }}>
                <span>
                  <strong>{agreement.property.title}</strong>
                  <small>{new Date(agreement.booking.start_date).toLocaleDateString('en-MY')} – {new Date(agreement.booking.end_date).toLocaleDateString('en-MY')}</small>
                  {role !== 'Tenant' && <small>Tenant: {agreement.tenant?.full_name || agreement.tenant?.email}</small>}
                </span>
                <b className={`agreement-status agreement-status--${agreement.status.toLowerCase()}`}>{labelStatus(agreement.status)}</b>
              </button>
            ))}
            {!items.length && <p>No rental agreements yet. An agreement is generated when a landlord approves a booking.</p>}
          </div>
        )}
      </section>

      {selected && (
        <section className="compliance-card agreement-document" aria-labelledby="agreement-title">
          <div className="agreement-toolbar">
            <div>
              <h2 id="agreement-title">{selected.property.title}</h2>
              <small>Agreement reference: {selected.id}</small>
            </div>
            <button type="button" onClick={() => window.print()}><Printer size={16} /> Print for physical signing</button>
          </div>

          <div className="agreement-terms">{selected.terms}</div>
          <dl className="agreement-meta">
            <dt>Status</dt><dd>{labelStatus(selected.status)}</dd>
            <dt>Generated</dt><dd>{new Date(selected.generated_at).toLocaleString('en-MY')}</dd>
            <dt>Tenant signature</dt><dd>{selected.tenantSignature || 'Awaiting signature'}</dd>
            <dt>Landlord signature</dt><dd>{selected.landlordSignature || 'Awaiting signature'}</dd>
            {selected.accepted_at && <><dt>Activated</dt><dd>{new Date(selected.accepted_at).toLocaleString('en-MY')}</dd></>}
          </dl>

          {selected.status === 'ACTIVE' && !missingSignature && (
            <div className="agreement-complete"><CheckCircle2 size={20} /> Both parties have signed. This agreement is active.</div>
          )}

          {awaitingSignatures && alreadySigned && (
            <div className="agreement-waiting"><ShieldCheck size={20} /> Your signature is recorded. Waiting for the other party.</div>
          )}

          {selected.status === 'ACTIVE' && missingSignature && <p>Earlier agreement record: a party's signature is still missing. Both signatures are required before payment.</p>}

          {canSign && (
            <div className="signature-box">
              <label htmlFor="agreement-signature">Type your full legal name</label>
              <input id="agreement-signature" autoComplete="name" maxLength={120} value={signature} onChange={(event) => setSignature(event.target.value)} />
              <label className="agreement-consent">
                <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
                <span>I confirm this name is my electronic signature and I agree to the rental terms shown above.</span>
              </label>
              <button type="button" disabled={signing || !signature.trim() || !consented} onClick={sign} className="compliance-primary">
                {signing ? <><Loader2 size={17} className="spin" /> Signing…</> : `Sign as ${role}`}
              </button>
              <p className="fine-print">Prefer paper? Use “Print for physical signing.” A physically signed copy should be retained by both parties.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
