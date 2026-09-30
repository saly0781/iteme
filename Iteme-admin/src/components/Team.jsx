import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import BottomSheet from './BottomSheet'
import IconField from './IconField'
import LoadingSpinner from './LoadingSpinner'

const roleBadge = {
  admin: 'bg-slate-900 text-white',
  accountant: 'bg-teal-100 text-teal-700',
  teacher: 'bg-blue-100 text-blue-700',
}

function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6)
}

function Team() {
  const toast = useToast()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'teacher',
    password: randomPassword(),
    salary: '',
    title: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  function loadStaff() {
    setLoading(true)
    return supabase
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .in('role', ['teacher', 'accountant', 'admin'])
      .order('role')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) console.error('Could not load team:', error)
        setStaff(data || [])
        setLoading(false)
      })
  }

  useEffect(() => {
    loadStaff()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.full_name || !form.email || !form.password) {
      setError('Full name, email, and password are required.')
      return
    }

    setSaving(true)
    const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
      body: {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        password: form.password,
        title: form.title,
      },
    })

    if (invokeError || data?.error) {
      setSaving(false)
      const message = data?.error || invokeError.message || 'Could not create the account.'
      setError(message)
      toast.error(message)
      return
    }

    if (form.salary) {
      const { error: salaryError } = await supabase.from('fixed_expenses').insert({
        label: `${form.full_name} — salary`,
        category: 'salaries',
        amount: Number(form.salary),
        profile_id: data.id,
      })
      if (salaryError) {
        console.error('Could not record salary as a fixed expense:', salaryError)
        toast.error("Account created, but the salary couldn't be recorded — add it from Finance.")
      }
    }

    setSaving(false)
    setCreated({ email: form.email, password: form.password })
    setForm({
      full_name: '',
      email: '',
      phone: '',
      role: 'teacher',
      password: randomPassword(),
      salary: '',
      title: '',
    })
    setShowForm(false)
    toast.success(`${form.full_name} was added as a ${form.role}.`)
    loadStaff()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Team</h1>
          <p className="text-sm text-slate-500">{staff.length} staff accounts</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('')
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-gray-800"
        >
          <i className="fa-solid fa-user-plus"></i>
          Add team member
        </button>
      </div>

      {created && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-teal-50 p-5">
          <i className="fa-solid fa-circle-check mt-0.5 text-teal-600"></i>
          <div>
            <p className="mb-2 text-sm font-semibold text-teal-800">
              Account created. Share these credentials with them now — the password won't be shown again.
            </p>
            <p className="text-sm text-teal-900">
              <span className="font-semibold">Email:</span> {created.email}
            </p>
            <p className="text-sm text-teal-900">
              <span className="font-semibold">Password:</span> {created.password}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <BottomSheet onClose={() => setShowForm(false)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">New team member</h2>
            <p className="mb-6 text-sm text-muted">Create a teacher or accountant account.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <IconField icon="fa-user" placeholder="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <IconField icon="fa-envelope" type="email" placeholder="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <IconField icon="fa-phone" placeholder="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />

              <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-user-tag text-muted"></i>
                <select
                  className="w-full bg-transparent text-sm text-accent outline-none"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="teacher">Teacher</option>
                  <option value="accountant">Accountant</option>
                </select>
              </label>

              <IconField
                icon="fa-id-badge"
                placeholder="Title (e.g. Lead Cinematography Instructor · 12 years)"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />

              <IconField
                icon="fa-money-bill"
                type="number"
                min="1"
                placeholder="Monthly salary (RWF, optional)"
                value={form.salary}
                onChange={(v) => setForm({ ...form, salary: v })}
              />

              <div className="flex gap-2">
                <div className="flex-1">
                  <IconField icon="fa-key" placeholder="Temporary password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: randomPassword() })}
                  className="shrink-0 rounded-lg border border-black/15 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-darker"
                >
                  <i className="fa-solid fa-arrows-rotate"></i>
                </button>
              </div>

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-user-plus"></i>
                {saving ? 'Creating...' : 'Create account'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      {staff.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No staff accounts yet.</p>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-3xl bg-[#F4F4F6] p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{s.full_name}</p>
                <p className="truncate text-xs text-slate-500">
                  {s.email}
                  {s.phone ? ` · ${s.phone}` : ''}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  roleBadge[s.role] || 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Team
