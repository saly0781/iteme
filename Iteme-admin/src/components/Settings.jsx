import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

function Settings() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || '')
    setPhone(profile.phone || '')
  }, [profile])

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!fullName.trim()) {
      setProfileError('Please enter your name.')
      return
    }

    setProfileSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setProfileSuccess('Your info has been updated.')
      toast.success('Your info has been updated.')
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.'
      setProfileError(message)
      toast.error(message)
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess('Your password has been updated.')
      toast.success('Your password has been updated.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.'
      setPasswordError(message)
      toast.error(message)
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
        <p className="text-sm text-slate-500">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-5 rounded-3xl bg-[#F4F4F6] p-6 md:p-8"
        >
          <h2 className="font-serif text-xl font-semibold text-slate-900">Profile</h2>

          <Field label="Full name" htmlFor="settings-fullName">
            <input
              id="settings-fullName"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="Phone number" htmlFor="settings-phone">
            <input
              id="settings-phone"
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          {profileError && <p className="text-sm font-medium text-red-600">{profileError}</p>}
          {profileSuccess && (
            <p className="text-sm font-medium text-green-600">{profileSuccess}</p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="w-full rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
          >
            {profileSaving ? 'Saving...' : 'Save changes'}
          </button>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-5 rounded-3xl bg-[#F4F4F6] p-6 md:p-8"
        >
          <h2 className="font-serif text-xl font-semibold text-slate-900">Change password</h2>

          <Field label="New password" htmlFor="settings-newPassword">
            <input
              id="settings-newPassword"
              type="password"
              className="input"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>

          <Field label="Confirm new password" htmlFor="settings-confirmPassword">
            <input
              id="settings-confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          {passwordError && <p className="text-sm font-medium text-red-600">{passwordError}</p>}
          {passwordSuccess && (
            <p className="text-sm font-medium text-green-600">{passwordSuccess}</p>
          )}

          <button
            type="submit"
            disabled={passwordSaving}
            className="w-full rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
          >
            {passwordSaving ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="mt-8 lg:hidden">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-black/15 px-6 py-3 text-sm font-semibold text-accent transition-colors hover:border-black/30"
        >
          <i className="fa-solid fa-arrow-right-from-bracket"></i>
          Log out
        </button>
      </div>
    </div>
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

export default Settings
