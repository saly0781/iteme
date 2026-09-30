import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEnrollment } from '../hooks/useEnrollment'
import { supabase } from '../lib/supabase'
import { colorChoices } from '../data/programs'

const educationLevelOptions = [
  "O' Level",
  'Advanced Level',
  "Diploma or Bachelor's Degree",
  "Master's Degree",
  'Other',
]

function DashboardSettings() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { enrollment, program, color, loading: enrollmentLoading, refresh: refreshEnrollment } =
    useEnrollment()
  const navigate = useNavigate()

  const [selectedColor, setSelectedColor] = useState('')
  const [colorSaving, setColorSaving] = useState(false)
  const [colorError, setColorError] = useState('')
  const [colorSuccess, setColorSuccess] = useState('')

  useEffect(() => {
    if (color) setSelectedColor(color)
  }, [color])

  async function handleColorSave() {
    setColorError('')
    setColorSuccess('')
    setColorSaving(true)

    try {
      const { error } = await supabase
        .from('enrollments')
        .update({ color: selectedColor })
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (error) throw error

      await refreshEnrollment()
      setColorSuccess('Your class color has been updated.')
    } catch (err) {
      setColorError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setColorSaving(false)
    }
  }

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [idPassport, setIdPassport] = useState('')
  const [residence, setResidence] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [bio, setBio] = useState('')
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
    setEmail(profile.email || '')
    setPhone(profile.phone || '')
    setIdPassport(profile.id_passport || '')
    setResidence(profile.residence || '')
    setEducationLevel(profile.education_level || '')
    setBio(profile.bio || '')
  }, [profile])

  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setProfileError('Please fill in all fields.')
      return
    }

    setProfileSaving(true)

    try {
      const emailChanged = email.trim() !== user.email

      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({ email: email.trim() })
        if (authError) throw authError
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          id_passport: idPassport.trim() || null,
          residence: residence.trim() || null,
          education_level: educationLevel || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (profileErr) throw profileErr

      await refreshProfile()
      setProfileSuccess(
        emailChanged
          ? 'Saved. Check your new email inbox to confirm the change.'
          : 'Your info has been updated.'
      )
    } catch (err) {
      setProfileError(err.message || 'Something went wrong. Please try again.')
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
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">Settings</p>
        <h1 className="font-serif text-3xl font-semibold text-accent md:text-4xl">
          Account settings
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Profile info */}
        <form
          onSubmit={handleProfileSubmit}
          className="space-y-5 rounded-2xl border border-black/10 bg-darker p-6 md:p-8"
        >
          <h2 className="font-serif text-xl font-semibold text-accent">Profile information</h2>

          {profile?.student_code && (
            <div>
              <p className="mb-2 block text-sm font-semibold text-accent">Student ID</p>
              <p className="input cursor-default select-all bg-black/5 font-mono tracking-wide text-muted">
                {profile.student_code}
              </p>
            </div>
          )}

          <Field label="Full name" htmlFor="settings-fullName">
            <input
              id="settings-fullName"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>

          <Field label="Email address" htmlFor="settings-email">
            <input
              id="settings-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          <Field label="ID or passport number" htmlFor="settings-idPassport">
            <input
              id="settings-idPassport"
              type="text"
              className="input"
              value={idPassport}
              onChange={(e) => setIdPassport(e.target.value)}
            />
          </Field>

          <Field label="Place of residence" htmlFor="settings-residence">
            <input
              id="settings-residence"
              type="text"
              className="input"
              value={residence}
              onChange={(e) => setResidence(e.target.value)}
            />
          </Field>

          <Field label="Level of education" htmlFor="settings-educationLevel">
            <select
              id="settings-educationLevel"
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

          <Field label="About you" htmlFor="settings-bio">
            <textarea
              id="settings-bio"
              rows={3}
              className="input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
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

        {/* Password */}
        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-5 rounded-2xl border border-black/10 bg-darker p-6 md:p-8"
        >
          <h2 className="font-serif text-xl font-semibold text-accent">Change password</h2>

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

      {/* Class color */}
      {!enrollmentLoading && enrollment && program && (
        <div className="mt-8 space-y-5 rounded-2xl border border-black/10 bg-darker p-6 md:p-8 lg:max-w-md">
          <div>
            <h2 className="font-serif text-xl font-semibold text-accent">Class color</h2>
            <p className="mt-1 text-sm text-muted">
              Shown on your dashboard calendar for {program.name} class days. Pick your own, or
              keep the default.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {colorChoices.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                aria-label={`Use color ${c}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                  selectedColor === c ? 'ring-2 ring-accent ring-offset-2' : ''
                }`}
                style={{ backgroundColor: c }}
              >
                {selectedColor === c && <i className="fa-solid fa-check text-xs text-white"></i>}
              </button>
            ))}
          </div>

          {colorError && <p className="text-sm font-medium text-red-600">{colorError}</p>}
          {colorSuccess && <p className="text-sm font-medium text-green-600">{colorSuccess}</p>}

          <button
            type="button"
            onClick={handleColorSave}
            disabled={colorSaving || selectedColor === color}
            className="rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
          >
            {colorSaving ? 'Saving...' : 'Save color'}
          </button>
        </div>
      )}

      {/* Sign out — sidebar already has this on desktop, mobile needs it here */}
      <div className="mt-8 md:hidden">
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

export default DashboardSettings
