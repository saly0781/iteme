import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ApplyButton from './ApplyButton'
import { useAuth } from '../context/AuthContext'
import { useIsDesktop } from '../hooks/useIsDesktop'
import logoIcon from '../assets/Iteme_logo.svg'

const navLinks = [{ href: '#faculty', label: 'E-Classes' }]

function AccountIcon({ user, openSignup, className = '' }) {
  const sharedClassName = `flex h-9 w-9 items-center justify-center rounded-full text-accent transition-colors hover:bg-black/5 ${className}`

  if (user) {
    return (
      <Link to="/dashboard" aria-label="Dashboard" className={sharedClassName}>
        <i className="fa-solid fa-circle-user text-base"></i>
      </Link>
    )
  }

  return (
    <button type="button" onClick={openSignup} aria-label="Create Account" className={sharedClassName}>
      <i className="fa-solid fa-circle-user text-base"></i>
    </button>
  )
}


function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isDesktop = useIsDesktop()
  const { user, openSignup } = useAuth()

  const showFullPill = isHome || isDesktop

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center px-6">
      <motion.div
        layout
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`flex items-center overflow-hidden rounded-full border border-black/10 bg-white/90 shadow-lg backdrop-blur-md ${
          showFullPill ? 'self-center' : 'self-end'
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {showFullPill ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex w-full max-w-fit items-center gap-12 px-6 py-3"
            >
              {/* Logo */}
              <Link
                className="group flex items-center gap-3"
                to="/"
              >
                <div className="h-6 w-6 overflow-hidden rounded-lg">
                  <img
                    src={logoIcon}
                    alt="Creative Studio Logo"
                    className="h-full w-full object-cover"
                  />
                </div>

                <span className="text-lg font-bold tracking-tight text-accent transition-colors group-hover:text-muted">
                  iTEME HUB
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
                <Link
                  className="text-light transition-colors hover:text-accent"
                  to="/programs"
                >
                  Programs
                </Link>

                <Link
                  className="text-light transition-colors hover:text-accent"
                  to="/student-work"
                >
                  Student Work
                </Link>

                <a
                  className="text-light transition-colors hover:text-accent"
                  href="#faculty"
                >
                  E-Classes
                </a>

                <ApplyButton className="px-4 py-1.5 text-sm" />

                <AccountIcon user={user} openSignup={openSignup} />
              </nav>

              {/* Mobile Menu Button + Account Icon */}
              <div className="flex items-center gap-1 md:hidden">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-accent hover:text-muted focus:outline-none"
                  type="button"
                  aria-label={isOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen((open) => !open)}
                >
                  <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                </button>

                <AccountIcon user={user} openSignup={openSignup} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="compact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-1 p-1.5"
            >
              <Link
                to="/"
                aria-label="Home"
                className="flex h-9 w-9 items-center justify-center rounded-full text-accent transition-colors hover:bg-black/5"
              >
                <i className="fa-solid fa-house text-sm"></i>
              </Link>

              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-accent transition-colors hover:bg-black/5"
                type="button"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
              >
                <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'} text-sm`}></i>
              </button>

              <AccountIcon user={user} openSignup={openSignup} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`mt-3 w-[calc(100vw-3rem)] max-w-xs rounded-2xl border border-black/10 bg-white/95 p-5 shadow-lg backdrop-blur-md md:hidden ${
              isHome ? '' : 'self-end'
            }`}
          >
            <nav className="flex flex-col gap-5 text-sm font-semibold">
              <Link
                className="text-light transition-colors hover:text-accent"
                to="/programs"
                onClick={() => setIsOpen(false)}
              >
                Programs
              </Link>

              <Link
                className="text-light transition-colors hover:text-accent"
                to="/student-work"
                onClick={() => setIsOpen(false)}
              >
                Student Work
              </Link>

              {navLinks.map((link) => (
                <a
                  key={link.href}
                  className="text-light transition-colors hover:text-accent"
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <ApplyButton
                className="px-4 py-2"
                fullWidth
                onClick={() => setIsOpen(false)}
              />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
