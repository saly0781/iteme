import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import { usePendingApplicationsCount } from '../hooks/usePendingApplicationsCount'
import BottomSheet from './BottomSheet'
import logoIcon from '../assets/Iteme_logo.svg'

const allNavItems = [
  { label: 'Dashboard', icon: 'fa-house', to: '/', roles: ['teacher', 'admin', 'accountant'] },
  { label: 'Applications', icon: 'fa-inbox', to: '/applications', roles: ['teacher', 'admin'] },
  { label: 'Attendance', icon: 'fa-user-check', to: '/attendance', roles: ['teacher', 'admin'] },
  { label: 'Schedule', icon: 'fa-calendar-days', to: '/schedule', roles: ['teacher', 'admin'] },
  { label: 'Students', icon: 'fa-users', to: '/students', roles: ['teacher', 'admin', 'accountant'] },
  { label: 'Finance', icon: 'fa-sack-dollar', to: '/finance', roles: ['admin', 'accountant'] },
  { label: 'Team', icon: 'fa-user-tie', to: '/team', roles: ['admin'] },
  { label: 'Programs', icon: 'fa-clapperboard', to: '/programs', roles: ['admin'] },
]

const settingsItem = { label: 'Settings', icon: 'fa-gear', to: '/settings' }

function AdminLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { notifications, unreadCount, markAllRead } = useNotifications(profile?.role === 'admin')
  const pendingApplications = usePendingApplicationsCount(
    profile?.role === 'teacher' || profile?.role === 'admin'
  )

  const navItems = allNavItems.filter((item) => item.roles.includes(profile?.role))

  const allTabs = [...navItems, settingsItem]
  const bottomTabs = allTabs.length > 5 ? allTabs.slice(0, 4) : allTabs
  const moreTabs = allTabs.length > 5 ? allTabs.slice(4) : []

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function openNotifications() {
    setShowNotifications(true)
    markAllRead()
  }

  const initials = (profile?.full_name || 'A')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden shrink-0 flex-col overflow-y-auto rounded-3xl bg-black px-5 py-8 text-white lg:my-2 lg:ml-2 lg:flex lg:w-60 print:hidden">
          <Link to="/" className="mb-10 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
              <img src={logoIcon} alt="Iteme Hub" className="h-full w-full object-contain" />
            </div>
            <span className="font-serif text-lg font-bold text-white">Staff Console</span>
          </Link>

          <p className="mb-3 px-3 text-xs font-semibold text-white/40">Overview</p>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <SidebarLink
                key={item.label}
                item={item}
                active={location.pathname === item.to}
                badge={item.to === '/applications' ? pendingApplications : 0}
              />
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
            <SidebarLink item={settingsItem} active={location.pathname === settingsItem.to} />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-white/10 hover:text-red-300"
            >
              <i className="fa-solid fa-arrow-right-from-bracket w-4"></i>
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
          {/* Top bar (desktop) */}
          <div className="hidden items-center gap-4 border-b border-black/5 px-8 py-5 lg:flex print:hidden">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {profile?.role || 'staff'}
            </span>

            <div className="ml-auto flex items-center gap-3">
              {profile?.role === 'admin' && (
                <button
                  type="button"
                  onClick={openNotifications}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
                  aria-label="Notifications"
                >
                  <i className="fa-solid fa-bell"></i>
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
              )}
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-black/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {profile?.full_name || 'Staff'}
                </span>
              </Link>
            </div>
          </div>

          {/* Top bar (mobile) */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden print:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                <img src={logoIcon} alt="Iteme Hub" className="h-full w-full object-contain" />
              </div>
              <span className="font-serif text-base font-bold text-slate-900">Staff Console</span>
            </Link>

            <div className="flex items-center gap-2">
              {profile?.role === 'admin' && (
                <button
                  type="button"
                  onClick={openNotifications}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-black/5"
                  aria-label="Notifications"
                >
                  <i className="fa-solid fa-bell"></i>
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
              )}
              <Link
                to="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm"
              >
                {initials}
              </Link>
            </div>
          </div>

          <main className="flex-1 pb-24 lg:overflow-y-auto lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-black/5 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden print:hidden">
        {bottomTabs.map((item) => (
          <BottomNavLink
            key={item.label}
            item={item}
            active={location.pathname === item.to}
            badge={item.to === '/applications' ? pendingApplications : 0}
          />
        ))}
        {moreTabs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              moreTabs.some((item) => item.to === location.pathname) ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            <i className="fa-solid fa-ellipsis text-base"></i>
            More
          </button>
        )}
      </nav>

      <AnimatePresence>
        {showMore && (
          <BottomSheet onClose={() => setShowMore(false)} maxWidthClassName="sm:max-w-xs">
            <h2 className="mb-4 font-serif text-xl font-bold text-accent">More</h2>
            <div className="space-y-1">
              {moreTabs.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                    location.pathname === item.to
                      ? 'bg-darker text-accent'
                      : 'text-muted hover:bg-darker'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} w-5`}></i>
                  <span className="flex-1">{item.label}</span>
                  <NavBadge count={item.to === '/applications' ? pendingApplications : 0} />
                </Link>
              ))}
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications && (
          <BottomSheet onClose={() => setShowNotifications(false)}>
            <h2 className="mb-4 font-serif text-2xl font-bold text-accent">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">Nothing yet.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-2xl bg-darker p-3">
                    <p className="text-sm text-accent">{n.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(n.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavBadge({ count, className = '' }) {
  if (!count) return null
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function SidebarLink({ item, active, badge = 0 }) {
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      <i className={`fa-solid ${item.icon} w-4`}></i>
      <span className="flex-1">{item.label}</span>
      <NavBadge count={badge} />
    </Link>
  )
}

function BottomNavLink({ item, active, badge = 0 }) {
  return (
    <Link
      to={item.to}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
        active ? 'text-slate-900' : 'text-slate-400'
      }`}
    >
      <span className="relative">
        <i className={`fa-solid ${item.icon} text-base`}></i>
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        )}
      </span>
      {item.label}
    </Link>
  )
}

export default AdminLayout
