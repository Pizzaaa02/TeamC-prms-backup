import {
  useState,
  useEffect,
} from 'react';

import Modal from '../components/Modal';
import { maintenanceApi } from '../api/maintenance';
import { propertyApi } from '../api/property';

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];

export default function MaintenanceForm({ onSuccess, initialData }) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(
    initialData || {
      title: '',
      description: '',
      priority: 'medium',
      propertyId: '',
      contactMethod: 'phone',
      files: [],
    }
  );
  const [properties, setProperties] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    propertyApi.list({ limit: 100 })
      .then((res) => setProperties(res.data?.data || []))
      .catch(() => setProperties([]));
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const valid = () => {
    if (step === 0) return !!form.title && !!form.description;
    if (step === 2) return !!form.propertyId;
    return true;
  };

  const next = () => { if (valid()) setStep(step + 1); };
  const prev = () => setStep(step - 1);

  const submit = async () => {
    setUploading(true);
    try {
      const data = { title: form.title, description: form.description, priority: form.priority.toUpperCase(), propertyId: form.propertyId };
      const res = await maintenanceApi.createTicket(data);
      onSuccess?.(res.data.data);
      setOpen(false);
    } catch (e) { alert(e.response?.data?.message || 'Failed to create ticket'); }
    finally { setUploading(false); }
  };

  const handleFile = (e) => {
    set('files', Array.from(e.target.files));
  };

  const steps = [
    { label: 'Details', icon: '📝' },
    { label: 'Photos', icon: '📷' },
    { label: 'Location', icon: '📍' },
  ];

  if (!open) return null;

  return (
    <Modal isOpen={open} onOpenChange={setOpen} title="Maintenance Ticket">
      {/* Steps */}
      <div className="step-progress">
        {steps.map((s, i) => (
          <div key={i} className={i === step ? 'active' : ''}>{s.icon} {s.label}</div>
        ))}
      </div>

      {/* Step 0 */}
      {step === 0 && (
        <>
          <input type="text" className="input" placeholder="Title" value={form.title} onChange={e => set('title', e.target.value)} />
          <textarea className="input" placeholder="Describe the issue" value={form.description} onChange={e => set('description', e.target.value)} rows={4} />
          <label>Priority</label>
          <div className="flex gap-2">
            {PRIORITY_ORDER.map(p => (
              <span key={p} role="button" className={form.priority === p ? `btn btn-sm btn-primary` : 'badge'} onClick={() => set('priority', p)}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <>
          <input type="file" className="input" accept="image/*" multiple onChange={handleFile} />
          {form.files.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {form.files.map((f, i) => (
                <img key={i} src={URL.createObjectURL(f)} alt="preview" width={80} height={80} style={{ objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <>
          <select className="input" value={form.propertyId} onChange={e => set('propertyId', e.target.value)}>
            <option value="">Select property…</option>
            {properties.map(p => (<option key={p._id || p.id} value={p._id || p.id}>{p.title}</option>))}
          </select>
          <select className="input mt-2" value={form.contactMethod} onChange={e => set('contactMethod', e.target.value)}>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="in-app">In-app chat</option>
          </select>
        </>
      )}

      <div className="footer flex gap-2 justify-between mt-4">
        <div>
          {step > 0 && <button className="btn btn-outline" onClick={prev}>← Back</button>}
        </div>
        <div>
          {step < 2 && <button className="btn btn-primary" disabled={!valid()} onClick={next}>Next →</button>}
          {step === 2 && <button className="btn btn-primary" disabled={!valid() || uploading} onClick={submit}>{uploading ? 'Submitting…' : 'Submit'}</button>}
        </div>
      </div>
    </Modal>
  );
}
