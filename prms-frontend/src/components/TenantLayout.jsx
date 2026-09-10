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
import './TenantLayout.css'

function getTopbarTitle(activePage) {
  const titles = {
    dashboard: 'My Tenancy Hub',
    notifications: 'Notification Center',
    properties: 'Browse Properties',
    bookings: 'My Bookings',
    payments: 'Payments',
    maintenance: 'Maintenance',
    messages: 'Messages',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help Center',
  }
  return titles[activePage] || 'Tenant Portal'
}

function TenantLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  const role = user?.role || 'Tenant'
  const navItems = buildNavItems(role)
  const activePage = resolveActivePage(location.pathname, role)

  function safeNavigate(path) {
    if (location.pathname !== path) navigate(path)
  }

  function handleLogout() {
    logout(navigate)
  }

  function handleSearch(event) {
    event.preventDefault()
    const query = searchTerm.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <main className="tenant-layout-shell" data-customize-id="global.page">
      <aside className="tenant-layout-sidebar" data-customize-id="global.sidebar">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.key
          return (
            <motion.button
              type="button"
              key={item.key}
              className={`tenant-layout-side-btn ${isActive ? 'active' : ''}`}
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

        <div className="tenant-layout-side-spacer"></div>

        <motion.button
          type="button"
          className={`tenant-layout-side-btn ${activePage === 'help' ? 'active' : ''}`}
          onClick={() => safeNavigate('/tenant/help')}
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
          className="tenant-layout-side-btn logout"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          whileTap={{ scale: 0.96 }}
        >
          <LogOut size={24} />
          <span>Logout</span>
        </motion.button>
      </aside>

      <section className="tenant-layout-main" data-customize-id="global.content">
        <header className="tenant-layout-topbar" data-customize-id="global.header">
          <button type="button" className="tenant-layout-brand" onClick={() => safeNavigate('/tenant')} data-customize-id="global.brand" aria-label="Go to tenant dashboard">
            <h2 data-customize-id="global.brand.title">PRMS</h2>
            <span></span>
            <p data-customize-id="global.brand.subtitle">{getTopbarTitle(activePage)}</p>
          </div>

          <form className="tenant-layout-search" data-customize-id="global.search" onSubmit={handleSearch}>
            <Search size={22} />
            <input
              type="search"
              placeholder="Search properties..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search properties"
            />
          </form>

          <div className="tenant-layout-actions" data-customize-id="global.top-actions">
            <NotificationDropdown />
            <ThemeSwitcher />
            <ProfileDropdown prefix="/tenant" />
          </div>
        </header>

        <div className="tenant-layout-content" data-customize-id="global.body">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
      </section>
    </main>
  )
}

export default TenantLayout
