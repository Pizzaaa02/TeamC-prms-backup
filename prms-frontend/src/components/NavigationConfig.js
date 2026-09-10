// Central navigation configuration by role (ADMIN-002, TECH-005)
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  WalletCards,
  Wrench,
  MessageCircle,
  Settings,
  CircleHelp,
  Users,
  FileText,
  Tag,
  BarChart3,
  Bell,
  ShieldCheck,
} from 'lucide-react'

const roleRoutes = {
  Tenant:    { prefix: '/tenant',   pages: ['dashboard', 'notifications', 'properties', 'bookings', 'payments', 'maintenance', 'messages', 'settings'] },
  Landlord:  { prefix: '/landlord', pages: ['dashboard', 'notifications', 'properties', 'bookings', 'finance', 'heatmap', 'categories', 'maintenance', 'messages', 'settings'] },
  Agent:     { prefix: '/agent',    pages: ['dashboard', 'notifications', 'properties', 'bookings', 'maintenance', 'categories', 'reports', 'finance', 'settings'] },
  Admin:     { prefix: '/admin',    pages: ['dashboard', 'notifications', 'users', 'properties', 'bookings', 'finance', 'maintenance', 'messages', 'reports', 'categories', 'audit-logs', 'settings'] },
}

const pageMeta = {
  dashboard:    { label: 'Dashboard',       icon: LayoutDashboard },
  notifications:{ label: 'Notifications',   icon: Bell },
  properties:   { label: 'Properties',      icon: Building2 },
  bookings:     { label: 'Bookings',        icon: CalendarDays },
  payments:     { label: 'Payments',        icon: WalletCards },
  finance:      { label: 'Finance',         icon: WalletCards },
  heatmap:      { label: 'Heatmap',         icon: BarChart3 },
  maintenance:  { label: 'Maintenance',     icon: Wrench },
  messages:     { label: 'Messages',        icon: MessageCircle },
  settings:     { label: 'Settings',        icon: Settings },
  categories:   { label: 'Categories',      icon: Tag },
  users:        { label: 'Users',           icon: Users },
  reports:      { label: 'Reports',         icon: FileText },
  customizer:   { label: 'Customizer',      icon: Settings },
  help:         { label: 'Help',            icon: CircleHelp },
  'audit-logs': { label: 'Audit Logs',      icon: ShieldCheck },
}

/** Build sidebar nav items for a given role */
export function buildNavItems(role) {
  const entry = roleRoutes[role] || roleRoutes.Tenant
  return entry.pages.map((p) => ({
    key: p,
    label: pageMeta[p]?.label || p,
    icon: pageMeta[p]?.icon || LayoutDashboard,
    path: p === 'dashboard' ? entry.prefix : `${entry.prefix}/${p}`,
  }))
}

/** Determine active page key from pathname and role prefix */
export function resolveActivePage(pathname, role) {
  const entry = roleRoutes[role] || roleRoutes.Tenant
  const prefix = entry.prefix
  if (pathname === prefix) return 'dashboard'
  for (const p of entry.pages) {
    if (pathname.includes(`${prefix}/${p}`)) return p
  }
  if (pathname.includes(`${prefix}/help`)) return 'help'
  return 'dashboard'
}

export { roleRoutes, pageMeta }
