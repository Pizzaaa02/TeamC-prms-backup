import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CircleHelp, Mail, ShieldCheck } from 'lucide-react';
import PropTypes from 'prop-types';

const AgentSimplePage = ({ label }) => {
  const navigate = useNavigate();

  const agentPages = [
    { name: 'Dashboard', path: '/agent/dashboard' },
    { name: 'Assigned Properties', path: '/agent/properties' },
    { name: 'Bookings', path: '/agent/bookings' },
    { name: 'Maintenance', path: '/agent/maintenance' },
    { name: 'My Categories', path: '/agent/categories' },
  ];

  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="compliance-page" data-customize-id="global.content">
      <header className="compliance-heading"><CircleHelp /><div><h1>{label}</h1><p>Guidance for managing assigned properties, bookings and maintenance safely.</p></div></header>
      <section className="compliance-card">
        <label htmlFor="agent-help-search"><strong>Search help topics</strong></label>
        <input id="agent-help-search" className="form-input" type="search" placeholder="Search help topics..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <div className="quick-links-grid">
          {[
            { title: 'Assigned properties', text: 'Review the properties placed under your management.', icon: BookOpen, path: '/agent/properties' },
            { title: 'Privacy Center', text: 'Review access, consent and personal-data controls.', icon: ShieldCheck, path: '/agent/privacy' },
            { title: 'Maintenance queue', text: 'Track and update repair work assigned to you.', icon: Mail, path: '/agent/maintenance' },
          ].filter((topic) => `${topic.title} ${topic.text}`.toLowerCase().includes(searchTerm.toLowerCase())).map((topic) => {
            const Icon = topic.icon
            return <button key={topic.path} type="button" className="quick-link-btn" onClick={() => navigate(topic.path)}><Icon size={20} /><strong>{topic.title}</strong><span>{topic.text}</span></button>
          })}
        </div>
      </section>

          <section className="compliance-card">
            <h3>Quick Navigation</h3>
            <div className="quick-links-grid">
              {agentPages.map((page) => (
                <button
                  key={page.path}
                  className="quick-link-btn"
                  onClick={() => navigate(page.path)}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </section>
    </div>
  );
};

AgentSimplePage.propTypes = {
  label: PropTypes.string.isRequired,
};

export default AgentSimplePage;
