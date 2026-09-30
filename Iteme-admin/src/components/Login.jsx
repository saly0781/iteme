import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/Iteme_logo.svg'

function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left — brand panel */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-black lg:flex">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -top-10 -right-10 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full border border-white/10" />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5">
            <img src={logo} alt="Iteme Hub" className="h-full w-full object-contain" />
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-white">ITEME HUB</h1>
          <p className="text-sm text-white/60">Staff Console</p>
        </div>
      </div>

      {/* Right — sign-in form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h2 className="font-serif text-2xl font-bold text-accent">Welcome back</h2>
          <p className="mt-1 mb-8 text-sm text-muted">Sign in with your teacher or admin account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label
              htmlFor="login-email"
              className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3 transition-colors focus-within:border-black"
            >
              <i className="fa-solid fa-envelope text-muted"></i>
              <input
                id="login-email"
                type="email"
                required
                placeholder="Email address"
                className="w-full bg-transparent text-sm text-accent outline-none placeholder:text-muted"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label
              htmlFor="login-password"
              className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3 transition-colors focus-within:border-black"
            >
              <i className="fa-solid fa-lock text-muted"></i>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Password"
                className="w-full bg-transparent text-sm text-accent outline-none placeholder:text-muted"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
