import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import './Compliance.css';

export default function PrivacyNotice() {
  return <main className="compliance-public">
    <article className="compliance-card notice-document">
      <header><ShieldCheck size={38} /><div><h1>PRMS Personal Data Protection Notice</h1><p>Version 2026-09-03 · Malaysia</p></div></header>
      <section><h2>Who controls your data</h2><p>Property Rental Management System (PRMS) is the data controller for information processed through this academic property-rental platform. Privacy enquiries may be sent to <a href="mailto:privacy@prms.local">privacy@prms.local</a>.</p></section>
      <section><h2>Data and purposes</h2><p>We process account details, contact information, property and booking records, payments, messages, maintenance requests, uploaded documents, preferences, security logs and consent records. We use them only to provide rental services, authenticate users, process authorised transactions, provide support, maintain security and satisfy legal obligations.</p></section>
      <section><h2>Disclosure and transfers</h2><p>Data is disclosed only to authorised rental parties, essential service providers and public authorities where required by law. Production deployment must document every processor and any transfer outside Malaysia before it is enabled.</p></section>
      <section><h2>Retention and security</h2><p>Notifications are scheduled for deletion after 365 days and audit records after 730 days unless a legal obligation requires longer retention. PRMS uses access control, encrypted transport, password hashing, audit records and purpose-based access restrictions.</p></section>
      <section><h2>Your choices and rights</h2><p>You may access and correct your information, withdraw optional consent, object to direct marketing, request restriction or erasure, and obtain a portable JSON copy through the Privacy Centre. Some records may need to be retained for contractual or legal reasons.</p></section>
      <section><h2>Data breaches</h2><p>Suspected personal-data breaches are recorded, assessed and escalated for notification to the Malaysian Personal Data Protection Commissioner and affected people where required.</p></section>
      <div className="notice-actions"><Link to="/">Return home</Link><Link to="/login" className="primary-link">Sign in</Link></div>
    </article>
  </main>;
}
