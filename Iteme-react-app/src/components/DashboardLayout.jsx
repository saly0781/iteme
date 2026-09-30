import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoIcon from '../assets/Iteme_logo.svg'

const navItems = [
  { label: 'Dashboard', icon: 'fa-house', to: '/dashboard' },
  { label: 'Programs', icon: 'fa-graduation-cap', to: '/dashboard/programs' },
  { label: 'E-Classes', icon: 'fa-chalkboard-user', to: '/dashboard/classes' },
  { label: 'Certificates', icon: 'fa-award', to: '/dashboard/certificates' },
]

const settingsItem = { label: 'Settings', icon: 'fa-gear', to: '/dashboard/settings' }

function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const initials = (profile?.full_name || 'S')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
        {/* Sidebar (desktop) */}
        <aside className="hidden shrink-0 flex-col overflow-y-auto rounded-3xl bg-black px-5 py-8 text-white lg:my-2 lg:ml-2 lg:flex lg:w-60">
          <Link to="/dashboard" className="mb-10 flex items-center gap-2 px-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
              <img src={logoIcon} alt="Iteme Hub" className="h-full w-full object-contain" />
            </div>
            <span className="font-serif text-lg font-bold text-white">Iteme Hub</span>
          </Link>

          <p className="mb-3 px-3 text-xs font-semibold text-white/40">Overview</p>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <SidebarLink key={item.label} item={item} active={location.pathname === item.to} />
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
          <div className="hidden items-center gap-4 border-b border-black/5 px-8 py-5 lg:flex">
            <div className="relative max-w-md flex-1">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
              <input
                type="text"
                placeholder="Search your course..."
                className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                aria-label="Notifications"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-slate-500 transition-colors hover:text-slate-900"
              >
                <i className="fa-regular fa-bell"></i>
              </button>

              <Link
                to="/dashboard/settings"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-black/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {profile?.full_name || 'Student'}
                </span>
              </Link>
            </div>
          </div>

          {/* Top bar (mobile) */}
          <div className="flex items-center justify-between px-4 py-3 lg:hidden">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm">
                <img src={logoIcon} alt="Iteme Hub" className="h-full w-full object-contain" />
              </div>
              <span className="font-serif text-base font-bold text-slate-900">Iteme Hub</span>
            </Link>

            <Link
              to="/dashboard/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-sm"
            >
              {initials}
            </Link>
          </div>

          <main className="flex-1 pb-24 lg:overflow-y-auto lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center border-t border-black/5 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        {[...navItems, settingsItem].map((item) => (
          <BottomNavLink key={item.label} item={item} active={location.pathname === item.to} />
        ))}
      </nav>
    </div>
  )
}

function SidebarLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-white/50 hover:bg-white/10 hover:text-white'
      }`}
    >
      <i className={`fa-solid ${item.icon} w-4`}></i>
      {item.label}
    </Link>
  )
}

function BottomNavLink({ item, active }) {
  return (
    <Link
      to={item.to}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
        active ? 'text-slate-900' : 'text-slate-400'
      }`}
    >
      <i className={`fa-solid ${item.icon} text-base`}></i>
      {item.label}
    </Link>
  )
}

export default DashboardLayout
