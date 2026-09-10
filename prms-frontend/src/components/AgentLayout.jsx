import { useState } from 'react'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CircleHelp,
  LogOut,
  Search,
} from 'lucide-react'
import PageTransition from './PageTransition'
import { useAuth } from '../contexts/AuthContext'
import { buildNavItems, resolveActivePage } from './NavigationConfig'
import NotificationDropdown from './NotificationDropdown'
import ProfileDropdown from './ProfileDropdown'
import ThemeSwitcher from './ThemeSwitcher'
import './AgentLayout.css'

function getTopbarTitle(activePage) {
  const titles = {
    dashboard: 'Agent Dashboard',
    notifications: 'Notification Center',
    properties: 'Assigned Properties',
    bookings: 'Bookings',
    maintenance: 'Maintenance',
    categories: 'Property Categories',
    reports: 'Assignment Reports',
    finance: 'Portfolio Overview',
    customizer: 'Website Customizer',
    privacy: 'Privacy Center',
    profile: 'Profile',
    settings: 'Settings',
    finance: 'Finance',
    reports: 'Reports',
    help: 'Help Center',
  }
  return titles[activePage] || 'Agent Dashboard'
}

function AgentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  const navItems = buildNavItems(user?.role || 'Agent')
  const activePage = resolveActivePage(location.pathname, user?.role || 'Agent')

  function safeNavigate(path) {
    if (location.pathname !== path) navigate(path)
  }

  function handleSearch(event) {
    event.preventDefault()
    const query = searchTerm.trim()
    if (!query) return
    navigate(`/agent/properties?search=${encodeURIComponent(query)}`)
  }

  function handleLogout() {
    logout(navigate)
  }

  return (
    <main className="agent-layout-shell" data-customize-id="global.page">
      <aside className="agent-layout-sidebar" data-customize-id="global.sidebar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.key
          return (
            <motion.button
              type="button"
              key={item.key}
              className={`agent-layout-side-btn ${isActive ? 'active' : ''}`}
              onClick={() => safeNavigate(item.path)}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              whileTap={{ scale: 0.96 }}
            >
              <Icon size={25} />
              <span>{item.label}</span>
            </motion.button>
          )
        })}

        <div className="agent-layout-side-spacer"></div>

        <motion.button
          type="button"
          className={`agent-layout-side-btn ${activePage === 'help' ? 'active' : ''}`}
          onClick={() => safeNavigate('/agent/help')}
          title="Help"
          aria-label="Help"
          aria-current={activePage === 'help' ? 'page' : undefined}
          whileTap={{ scale: 0.96 }}
        >
          <CircleHelp size={24} />
          <span>Help</span>
        </motion.button>

        <motion.button
          type="button"
          className="agent-layout-side-btn logout"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          whileTap={{ scale: 0.96 }}
        >
          <LogOut size={24} />
          <span>Logout</span>
        </motion.button>
      </aside>

      <section className="agent-layout-main" data-customize-id="global.content">
        <header className="agent-layout-topbar" data-customize-id="global.header">
          <button type="button" className="agent-layout-brand" onClick={() => safeNavigate('/agent')} data-customize-id="global.brand" aria-label="Go to Agent dashboard">
            <h2 data-customize-id="global.brand.title">PRMS</h2>
            <span></span>
            <p data-customize-id="global.brand.subtitle">{getTopbarTitle(activePage)}</p>
          </button>

          <form className="agent-layout-search" data-customize-id="global.search" onSubmit={handleSearch}>
            <Search size={22} />
            <input
              type="search"
              placeholder="Search assigned properties..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search assigned properties"
            />
          </form>

          <div className="agent-layout-top-actions" data-customize-id="global.top-actions">
            <NotificationDropdown />
            <ThemeSwitcher />

            <motion.button
              type="button"
              className="agent-layout-avatar"
              whileHover={{ scale: 1.08 }}
              style={{ cursor: 'pointer' }}
              onClick={() => safeNavigate('/agent/profile')}
              aria-label="Open Agent profile"
            >
              {profileImgUrl ? (
                <img
                  src={profileImgUrl}
                  alt={user?.full_name || 'Agent'}
                  className="agent-layout-avatar-img"
                />
              ) : (
                initials
              )}
            </motion.button>
          </div>
        </header>

        <div className="agent-layout-content" data-customize-id="global.body">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </section>
    </main>
  )
}

export default AgentLayout
