import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import BottomSheet from './BottomSheet'

function AuthSheet() {
  const { authSheet, closeAuthSheet, openLogin, openSignup } = useAuth()

  return (
    <AnimatePresence>
      {authSheet && (
        <BottomSheet onClose={closeAuthSheet}>
          {authSheet === 'login' ? (
            <LoginForm onSwitchToSignup={openSignup} />
          ) : (
            <SignupForm onSwitchToLogin={openLogin} />
          )}
        </BottomSheet>
      )}
    </AnimatePresence>
  )
}

function LoginForm({ onSwitchToSignup }) {
  const { signIn } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError('Please enter your email, phone, or Student ID and your password.')
      return
    }

    setSubmitting(true)

    try {
      await signIn({ identifier: identifier.trim(), password })
    } catch (err) {
      setError(err.message || 'Could not log in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault()
    setResetError('')

    if (!resetIdentifier.trim()) {
      setResetError('Enter your email, phone, or Student ID.')
      return
    }

    setResetSubmitting(true)

    const { error: rpcError } = await supabase.rpc('request_password_reset', {
      identifier: resetIdentifier.trim(),
    })

    setResetSubmitting(false)

    if (rpcError) {
      setResetError('Something went wrong. Please try again.')
      return
    }

    setResetSent(true)
  }

  if (mode === 'reset') {
    return (
      <>
        <div className="mb-6 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
            Student Account
          </p>
          <h1 className="font-serif text-2xl font-semibold leading-tight text-accent">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-muted">
            We'll notify an admin, who will reach out to help reset it.
          </p>
        </div>

        {resetSent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted">
              If that account exists, an admin has been notified and will reach out to help you
              reset your password.
            </p>
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setResetSent(false)
                setResetIdentifier('')
              }}
              className="w-full rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800"
            >
              Back to log in
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleResetSubmit}>
            <Field label="Email, phone, or Student ID" htmlFor="reset-identifier">
              <input
                id="reset-identifier"
                type="text"
                className="input"
                placeholder="jane@example.com"
                value={resetIdentifier}
                onChange={(e) => setResetIdentifier(e.target.value)}
              />
            </Field>

            {resetError && <p className="text-sm font-medium text-red-600">{resetError}</p>}

            <button
              type="submit"
              disabled={resetSubmitting}
              className="w-full rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
            >
              {resetSubmitting ? 'Sending...' : 'Send reset request'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full rounded-full border border-black/15 px-8 py-4 text-base font-semibold text-accent transition-colors hover:bg-darker"
            >
              Back to log in
            </button>
          </form>
        )}
      </>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
          Student Account
        </p>
        <h1 className="font-serif text-2xl font-semibold leading-tight text-accent">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted">Log in to see your program and attendance.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email, phone, or Student ID" htmlFor="login-identifier">
          <input
            id="login-identifier"
            type="text"
            className="input"
            placeholder="jane@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            className="input"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button
          type="button"
          onClick={() => setMode('reset')}
          className="text-sm font-semibold text-accent underline underline-offset-4"
        >
          Forgot password?
        </button>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>

        <button
          type="button"
          onClick={onSwitchToSignup}
          className="w-full rounded-full border border-black/15 px-8 py-4 text-base font-semibold text-accent transition-colors hover:bg-darker"
        >
          Create an account
        </button>
      </form>
    </>
  )
}

const conflictLabels = {
  email: 'email',
  phone: 'phone number',
  id_passport: 'ID/passport number',
}

function describeConflicts(conflicts) {
  const labels = conflicts.map((c) => conflictLabels[c] || c)
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

const educationLevelOptions = [
  "O' Level",
  'Advanced Level',
  "Diploma or Bachelor's Degree",
  "Master's Degree",
  'Other',
]

function SignupForm({ onSwitchToLogin }) {
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [idPassport, setIdPassport] = useState('')
  const [residence, setResidence] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!fullName.trim() || !email.trim() || !password || !phone.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)

    try {
      const { data: conflicts, error: conflictError } = await supabase.rpc('check_signup_conflicts', {
        p_email: email.trim(),
        p_phone: phone.trim(),
        p_id_passport: idPassport.trim() || null,
      })

      if (conflictError) throw conflictError

      if (conflicts?.length > 0) {
        setError(`An account with this ${describeConflicts(conflicts)} already exists.`)
        return
      }

      await signUp({ email, password, fullName, phone, idPassport, residence, educationLevel, bio })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
          Student Account
        </p>
        <h1 className="font-serif text-2xl font-semibold leading-tight text-accent">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted">
          You'll choose your program and session right after.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Full name" htmlFor="signup-fullName">
          <input
            id="signup-fullName"
            type="text"
            className="input"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>

        <Field label="Email address" htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            className="input"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Phone number" htmlFor="signup-phone">
          <input
            id="signup-phone"
            type="tel"
            className="input"
            placeholder="+250 700 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="signup-password">
          <input
            id="signup-password"
            type="password"
            className="input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="ID or passport number (optional)" htmlFor="signup-idPassport">
          <input
            id="signup-idPassport"
            type="text"
            className="input"
            value={idPassport}
            onChange={(e) => setIdPassport(e.target.value)}
          />
        </Field>

        <Field label="Place of residence (optional)" htmlFor="signup-residence">
          <input
            id="signup-residence"
            type="text"
            className="input"
            value={residence}
            onChange={(e) => setResidence(e.target.value)}
          />
        </Field>

        <Field label="Level of education (optional)" htmlFor="signup-educationLevel">
          <select
            id="signup-educationLevel"
            className="input"
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          >
            <option value="">Select a level...</option>
            {educationLevelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tell us about yourself (optional)" htmlFor="signup-bio">
          <textarea
            id="signup-bio"
            rows={3}
            className="input"
            placeholder="Briefly introduce yourself and share your passion"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full rounded-full border border-black/15 px-8 py-4 text-base font-semibold text-accent transition-colors hover:bg-darker"
        >
          Already have an account? Log in
        </button>
      </form>
    </>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-accent">
        {label}
      </label>
      {children}
    </div>
  )
}

export default AuthSheet
