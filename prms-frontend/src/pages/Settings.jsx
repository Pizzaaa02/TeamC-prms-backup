import { useNavigate } from 'react-router-dom'
import { useSettings } from '../contexts/SettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../config/routes'
import {
  Bell,
  Building2,
  Settings as SettingsIcon,
  ShieldCheck,
} from 'lucide-react'
import './Settings.css'

function getProfilePath(role) {
  if (!role) return ROUTES.admin.profile
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.profile
  if (lower.includes('landlord')) return ROUTES.landlord.profile
  if (lower.includes('tenant')) return ROUTES.tenant.profile
  if (lower.includes('agent')) return ROUTES.agent.profile
  return ROUTES.admin.profile
}

function getAuditLogsPath(role) {
  if (!role) return ROUTES.admin.auditLogs
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.auditLogs
  // Audit logs are admin-only; other roles see the admin path
  return ROUTES.admin.auditLogs
}

function getNotificationsPath(role) {
  if (!role) return ROUTES.admin.notifications
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.notifications
  return ROUTES.admin.notifications
}

function getCustomizerPath(role) {
  if (!role) return ROUTES.admin.customizer
  const lower = role.toLowerCase()
  if (lower.includes('admin')) return ROUTES.admin.customizer
  if (lower.includes('landlord')) return ROUTES.landlord.customizer
  if (lower.includes('tenant')) return ROUTES.tenant.customizer
  return ROUTES.admin.customizer
}

function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const profilePath = getProfilePath(user?.role)
  const auditLogsPath = getAuditLogsPath(user?.role)
  const customizerPath = getCustomizerPath(user?.role)
  const notificationsPath = getNotificationsPath(user?.role)

  return (
    <div className="admin-content" data-customize-id="global.content">
      <div className="admin-title-row">
        <div>
          <h1>Settings</h1>
          <p>Manage account preferences, security, notifications, and system options.</p>
        </div>
      </div>

      <section className="settings-grid">
        <div className="settings-card">
          <div className="settings-card-icon purple">
            <SettingsIcon size={28} />
          </div>

          <h2>Account Settings</h2>
          <p>Update profile details, email address, contact number, and password.</p>

          <button type="button" onClick={() => navigate(profilePath)}>Manage Account</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon blue">
            <Bell size={28} />
          </div>

          <h2>Notification Settings</h2>
          <p>Control alerts for rent, bookings, maintenance updates, and reminders.</p>

          <button type="button" onClick={() => navigate(notificationsPath)}>Manage Notifications</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon red">
            <ShieldCheck size={28} />
          </div>

          <h2>Security Settings</h2>
          <p>Review login activity, enable verification, and manage session access.</p>

          <button type="button" onClick={() => navigate(auditLogsPath)}>Manage Security</button>
        </div>

        <div className="settings-card">
          <div className="settings-card-icon green">
            <Building2 size={28} />
          </div>

          <h2>System Preferences</h2>
          <p>Adjust dashboard layout, property display, language, and system theme.</p>

          <button type="button" onClick={() => navigate(customizerPath)}>Manage Preferences</button>
        </div>
      </section>
    </div>
  )
}

export default Settings
