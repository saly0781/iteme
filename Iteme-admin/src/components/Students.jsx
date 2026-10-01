import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAllEnrollments } from '../hooks/useAllEnrollments'
import { usePrograms } from '../hooks/usePrograms'
import { supabase } from '../lib/supabase'
import { formatRWF } from '../data/programs'
import { sessionLabel } from '../data/sessions'
import BottomSheet from './BottomSheet'
import IconField from './IconField'
import LoadingSpinner from './LoadingSpinner'

const paymentMethods = ['mobile_money', 'card', 'cash', 'bank_transfer']

const approvalDot = {
  pending: 'bg-amber-400',
  approved: 'bg-teal-500',
  rejected: 'bg-red-400',
}

const tabs = ['Active', 'Blocked', 'All']

const educationLevelOptions = [
  "O' Level",
  'Advanced Level',
  "Diploma or Bachelor's Degree",
  "Master's Degree",
  'Other',
]

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DEFAULT_STUDENT_PASSWORD = '000000'

function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-6)
}

function emptyStudentForm() {
  return {
    full_name: '',
    email: '',
    phone: '',
    id_passport: '',
    residence: '',
    education_level: '',
    bio: '',
    password: DEFAULT_STUDENT_PASSWORD,
  }
}

function emptyEnrollForm() {
  return {
    programId: '',
    session: '',
    markPaid: false,
    amount: '',
    method: 'mobile_money',
  }
}

function Students() {
  const { user, isAdmin, isTeacher, isFinance } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const canEnroll = isAdmin || isTeacher
  const toast = useToast()
  const { enrollments, loading: enrollmentsLoading, refresh: refreshEnrollments } = useAllEnrollments()
  const { programs, loading: programsLoading } = usePrograms()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('Active')
  const [selectedId, setSelectedId] = useState(null)
  const detailRef = useRef(null)

  const [enrollTarget, setEnrollTarget] = useState(null)
  const [enrollForm, setEnrollForm] = useState(emptyEnrollForm())
  const [enrollSaving, setEnrollSaving] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyStudentForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)

  const [blockTarget, setBlockTarget] = useState(null)
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [studentPayments, setStudentPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [resetting, setResetting] = useState(false)

  const [studentNotifications, setStudentNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifyTarget, setNotifyTarget] = useState(null)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyAsSystem, setNotifyAsSystem] = useState(false)
  const [notifySaving, setNotifySaving] = useState(false)
  const [notifyError, setNotifyError] = useState('')

  function loadStudents() {
    setLoading(true)
    return supabase
      .from('profiles')
      .select(
        'id, full_name, email, phone, student_code, id_passport, residence, education_level, bio, blocked_at, blocked_by, block_reason, created_at'
      )
      .eq('role', 'student')
      .order('full_name')
      .then(async ({ data, error }) => {
        if (error) {
          console.error('Could not load students:', error)
          setStudents([])
          setLoading(false)
          return
        }

        const blockerIds = [...new Set((data || []).map((s) => s.blocked_by).filter(Boolean))]
        let blockers = {}
        if (blockerIds.length > 0) {
          const { data: blockerRows } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', blockerIds)
          blockers = Object.fromEntries((blockerRows || []).map((b) => [b.id, b]))
        }

        setStudents((data || []).map((s) => ({ ...s, blocker: blockers[s.blocked_by] || null })))
        setLoading(false)
      })
  }

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (location.state?.openAddStudent && isAdmin) {
      setFormError('')
      setShowForm(true)
      // Clear the nav state so refreshing or going back doesn't reopen it.
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire once on arrival, not on every navigate/isAdmin identity change
  }, [location.state])

  useEffect(() => {
    const enrollmentIds = enrollments.filter((e) => e.student_id === selectedId).map((e) => e.id)
    if (!selectedId || enrollmentIds.length === 0) {
      setStudentPayments([])
      return
    }
    setPaymentsLoading(true)
    supabase
      .from('payments')
      .select('id, enrollment_id, amount, method, note, paid_at')
      .in('enrollment_id', enrollmentIds)
      .order('paid_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load payments:', error)
        setStudentPayments(data || [])
        setPaymentsLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enrollments is a stable-ish array from the hook; re-derive only on selection change
  }, [selectedId])

  function loadNotifications(studentId) {
    if (!studentId) {
      setStudentNotifications([])
      return
    }
    setNotifLoading(true)
    supabase
      .from('student_notifications')
      .select('id, type, message, sent_by, created_at, seen_at, dismissed_at, profiles!sent_by(full_name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load notifications:', error)
        setStudentNotifications(data || [])
        setNotifLoading(false)
      })
  }

  useEffect(() => {
    loadNotifications(selectedId)
  }, [selectedId])

  function selectStudent(id) {
    setSelectedId(id)
    // On mobile the detail panel renders below the list, off-screen —
    // bring it into view instead of leaving the tap looking like a no-op.
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleAddStudent(e) {
    e.preventDefault()
    setFormError('')

    if (!form.full_name || !form.email || !form.password) {
      setFormError('Full name, email, and password are required.')
      return
    }

    setSaving(true)
    const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
      body: { ...form, role: 'student' },
    })
    setSaving(false)

    if (invokeError || data?.error) {
      const message = data?.error || invokeError.message || 'Could not create the account.'
      setFormError(message)
      toast.error(message)
      return
    }

    setCreated({ email: form.email, password: form.password })
    setForm(emptyStudentForm())
    setShowForm(false)
    toast.success(`${form.full_name} was added as a student.`)
    loadStudents()
  }

  function openEnroll(student) {
    setEnrollTarget(student)
    setEnrollForm(emptyEnrollForm())
    setEnrollError('')
  }

  async function handleEnrollSubmit(e) {
    e.preventDefault()
    setEnrollError('')

    if (!enrollForm.programId || !enrollForm.session) {
      setEnrollError('Pick a program and a session.')
      return
    }
    if (enrollForm.markPaid && !enrollForm.amount) {
      setEnrollError('Enter the amount paid.')
      return
    }

    setEnrollSaving(true)

    const { data: enrollment, error: enrollError_ } = await supabase
      .from('enrollments')
      .insert({
        student_id: enrollTarget.id,
        program_id: enrollForm.programId,
        session: enrollForm.session,
        status: 'active',
        approval_status: 'approved',
        application_fee_paid: false,
        enrollment_type: 'full',
      })
      .select()
      .single()

    if (enrollError_) {
      setEnrollSaving(false)
      setEnrollError(enrollError_.message)
      toast.error(enrollError_.message)
      return
    }

    if (enrollForm.markPaid) {
      const { data: userData } = await supabase.auth.getUser()
      const { error: paymentError } = await supabase.from('payments').insert({
        enrollment_id: enrollment.id,
        amount: Number(enrollForm.amount),
        method: enrollForm.method,
        recorded_by: userData?.user?.id,
      })

      if (paymentError) {
        setEnrollSaving(false)
        setEnrollError(paymentError.message)
        toast.error(`Enrolled, but the payment could not be recorded: ${paymentError.message}`)
        return
      }
    }

    setEnrollSaving(false)
    const programName = programs.find((p) => p.id === enrollForm.programId)?.name || 'the program'
    toast.success(
      enrollForm.markPaid
        ? `${enrollTarget.full_name} was enrolled in ${programName} and marked as paid.`
        : `${enrollTarget.full_name} was enrolled in ${programName}.`
    )
    setEnrollTarget(null)
    refreshEnrollments()
  }

  async function handleRemoveEnrollment() {
    setRemoving(true)
    // RLS would silently delete 0 rows (not an error) if this were ever
    // blocked, so success has to be checked via the returned row.
    const { data, error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', removeTarget.id)
      .select()
    setRemoving(false)

    if (error || !data || data.length === 0) {
      toast.error(error?.message || 'Could not remove that program.')
      return
    }

    toast.success(`Removed ${removeTarget.program?.name || 'that program'}.`)
    setRemoveTarget(null)
    refreshEnrollments()
  }

  async function handleResetPassword() {
    setResetting(true)
    const newPassword = randomPassword()
    const { data, error: invokeError } = await supabase.functions.invoke('reset-password', {
      body: { user_id: resetTarget.id, password: newPassword },
    })
    setResetting(false)

    if (invokeError || data?.error) {
      toast.error(data?.error || invokeError.message || 'Could not reset the password.')
      return
    }

    setResetResult({ full_name: resetTarget.full_name, password: newPassword })
    setResetTarget(null)
    toast.success(`Password reset for ${resetTarget.full_name}.`)
  }

  function openNotify(student) {
    setNotifyTarget(student)
    setNotifyMessage('')
    setNotifyAsSystem(false)
    setNotifyError('')
  }

  async function handleSendNotification(e) {
    e.preventDefault()
    setNotifyError('')

    if (!notifyMessage.trim()) {
      setNotifyError('Write a message first.')
      return
    }

    setNotifySaving(true)
    const { error } = await supabase.from('student_notifications').insert({
      student_id: notifyTarget.id,
      sent_by: notifyAsSystem ? null : user.id,
      type: notifyAsSystem ? 'system' : 'staff',
      message: notifyMessage.trim(),
    })
    setNotifySaving(false)

    if (error) {
      setNotifyError(error.message)
      toast.error(error.message)
      return
    }

    toast.success(`Notification sent to ${notifyTarget.full_name}.`)
    setNotifyTarget(null)
    if (selectedId === notifyTarget.id) loadNotifications(selectedId)
  }

  async function handleDeleteNotification(id) {
    const { error } = await supabase.from('student_notifications').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    setStudentNotifications((prev) => prev.filter((n) => n.id !== id))
    toast.success('Notification deleted.')
  }

  async function handleBlockSubmit(e) {
    e.preventDefault()
    setBlockSaving(true)
    const { error } = await supabase.rpc('block_student', {
      target_id: blockTarget.id,
      reason: blockReason || null,
    })
    setBlockSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`${blockTarget.full_name} was blocked.`)
    setBlockTarget(null)
    setBlockReason('')
    loadStudents()
  }

  async function handleUnblock(student) {
    const { error } = await supabase.rpc('unblock_student', { target_id: student.id })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`${student.full_name} was unblocked.`)
    loadStudents()
  }

  async function handleDeleteConfirm() {
    if (deleteConfirmName.trim() !== deleteTarget.full_name.trim()) {
      toast.error('Name does not match — nothing was deleted.')
      return
    }

    setDeleting(true)
    const { data, error: invokeError } = await supabase.functions.invoke('delete-student', {
      body: { user_id: deleteTarget.id },
    })
    setDeleting(false)

    if (invokeError || data?.error) {
      toast.error(data?.error || invokeError.message || 'Could not delete this account.')
      return
    }

    toast.success(`${deleteTarget.full_name} was permanently deleted.`)
    if (selectedId === deleteTarget.id) setSelectedId(null)
    setDeleteTarget(null)
    setDeleteConfirmName('')
    loadStudents()
  }

  if (loading || enrollmentsLoading || programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  const byTab = isAdmin
    ? students.filter((s) => {
        if (tab === 'Active') return !s.blocked_at
        if (tab === 'Blocked') return !!s.blocked_at
        return true
      })
    : students.filter((s) => !s.blocked_at)

  const filtered = byTab.filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.student_code?.includes(q)
    )
  })

  const selectedStudent = students.find((s) => s.id === selectedId) || null
  const selectedEnrollments = selectedStudent
    ? enrollments.filter((e) => e.student_id === selectedStudent.id)
    : []
  const completedEnrollments = selectedEnrollments.filter((e) => e.status === 'completed')
  const totalFee = selectedEnrollments.reduce((sum, e) => sum + (Number(e.fee) || 0), 0)
  const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalBalance = totalFee - totalPaid

  const enrollTargetEnrollments = enrollTarget
    ? enrollments.filter((e) => e.student_id === enrollTarget.id)
    : []
  const enrollablePrograms = programs.filter(
    (p) => !enrollTargetEnrollments.some((e) => e.program_id === p.id)
  )

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Students</h1>
        <p className="text-sm text-slate-500">{students.length} registered students</p>
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

      {resetResult && (
        <div className="mb-6 flex items-start gap-3 rounded-3xl bg-teal-50 p-5">
          <i className="fa-solid fa-key mt-0.5 text-teal-600"></i>
          <div>
            <p className="mb-2 text-sm font-semibold text-teal-800">
              Password reset for {resetResult.full_name}. Share it with them now — it won't be shown
              again.
            </p>
            <p className="text-sm text-teal-900">
              <span className="font-semibold">New password:</span> {resetResult.password}
            </p>
          </div>
        </div>
      )}

      {isAdmin && (
        <AnimatePresence>
          {showForm && (
            <BottomSheet onClose={() => setShowForm(false)} maxWidthClassName="sm:max-w-lg">
              <h2 className="mb-1 font-serif text-2xl font-bold text-accent">New student</h2>
              <p className="mb-6 text-sm text-muted">Create a student account manually.</p>

              <form onSubmit={handleAddStudent} className="space-y-3">
                <IconField icon="fa-user" placeholder="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
                <IconField icon="fa-envelope" type="email" placeholder="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <IconField icon="fa-phone" placeholder="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <IconField icon="fa-id-card" placeholder="ID or passport number (optional)" value={form.id_passport} onChange={(v) => setForm({ ...form, id_passport: v })} />
                <IconField icon="fa-location-dot" placeholder="Place of residence (optional)" value={form.residence} onChange={(v) => setForm({ ...form, residence: v })} />

                <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3 transition-colors focus-within:border-black">
                  <i className="fa-solid fa-graduation-cap text-muted"></i>
                  <select
                    className="w-full bg-transparent text-sm text-accent outline-none"
                    value={form.education_level}
                    onChange={(e) => setForm({ ...form, education_level: e.target.value })}
                  >
                    <option value="">Level of education (optional)</option>
                    {educationLevelOptions.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>

                <textarea
                  placeholder="About the student (optional)"
                  rows={2}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="input"
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

                {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
                >
                  <i className="fa-solid fa-user-graduate"></i>
                  {saving ? 'Creating...' : 'Create account'}
                </button>
              </form>
            </BottomSheet>
          )}
        </AnimatePresence>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_480px]">
        {/* ── Roster ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="sticky top-0 z-10 -mx-4 bg-white px-4 pb-3 pt-0 md:-mx-8 md:px-8 lg:mx-0 lg:px-0">
            {isAdmin && (
              <div className="flex items-center gap-5 border-b border-black/5 text-sm">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
                      tab === t
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="relative mt-3 max-w-sm">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
              <input
                type="text"
                placeholder="Search by name, email, or Student ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-black/10 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>
          </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">No students found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((student) => {
              const theirEnrollments = enrollments.filter((e) => e.student_id === student.id)
              const active = student.id === selectedId

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student.id)}
                  className={`w-full rounded-3xl p-4 text-left transition-colors ${
                    active ? 'bg-slate-900' : 'bg-[#F4F4F6] hover:bg-black/5'
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                        {student.full_name}
                      </p>
                      {student.student_code && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${
                            active ? 'bg-white/15 text-white/70' : 'bg-white text-slate-500'
                          }`}
                        >
                          #{student.student_code}
                        </span>
                      )}
                      {student.blocked_at && (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className={`shrink-0 text-xs ${active ? 'text-white/50' : 'text-slate-400'}`}>
                      {student.phone}
                    </p>
                  </div>
                  <p className={`mb-3 text-xs ${active ? 'text-white/60' : 'text-slate-500'}`}>
                    {student.email}
                  </p>

                  {theirEnrollments.length === 0 ? (
                    <p className={`text-xs ${active ? 'text-white/40' : 'text-slate-400'}`}>
                      Not enrolled in any program yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {theirEnrollments.map((e) => (
                        <span
                          key={e.id}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            active ? 'bg-white/10 text-white' : 'bg-white text-slate-700'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              approvalDot[e.approval_status] || approvalDot.pending
                            }`}
                          ></span>
                          {e.program?.name || e.program_id}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
        </div>

        {/* ── Detail panel (right sidebar) ─────────────────────────── */}
        <div
          ref={detailRef}
          className="lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-9rem)] lg:flex-col lg:border-l lg:border-black/5 lg:pl-6"
        >
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setFormError('')
                setShowForm(true)
              }}
              className="mb-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-gray-800"
            >
              <i className="fa-solid fa-user-graduate"></i>
              Add student
            </button>
          )}

          {!selectedStudent ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-[#F4F4F6] p-8 text-center lg:min-h-0 lg:flex-1">
              <i className="fa-solid fa-user mb-3 text-2xl text-slate-300"></i>
              <p className="text-sm text-slate-400">Select a student to see their full details.</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-[#F4F4F6] lg:relative lg:min-h-0 lg:flex-1 lg:overflow-hidden">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-8 rounded-t-3xl bg-gradient-to-b from-[#F4F4F6] to-transparent lg:block"></div>
              <div className="p-5 lg:h-full lg:overflow-y-auto">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-slate-900">
                  {selectedStudent.full_name}
                </h2>
                {selectedStudent.student_code && (
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide text-slate-500">
                    #{selectedStudent.student_code}
                  </span>
                )}
                {selectedStudent.blocked_at && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                    Blocked
                  </span>
                )}
              </div>

              {selectedStudent.created_at && (
                <p className="mb-3 text-xs text-slate-400">
                  Joined {formatDate(selectedStudent.created_at)}
                </p>
              )}

              {selectedStudent.blocked_at && (
                <p className="mb-3 text-xs text-red-600">
                  Blocked by{' '}
                  {selectedStudent.blocker
                    ? `${selectedStudent.blocker.full_name} (${selectedStudent.blocker.role})`
                    : 'a staff member'}
                  {selectedStudent.block_reason ? ` — ${selectedStudent.block_reason}` : ''}
                </p>
              )}

              <div className="mb-4 space-y-2 rounded-2xl bg-white p-4">
                <DetailRow icon="fa-envelope" label="Email" value={selectedStudent.email} />
                <DetailRow icon="fa-phone" label="Phone" value={selectedStudent.phone} />
                <DetailRow icon="fa-id-card" label="ID/Passport" value={selectedStudent.id_passport} />
                <DetailRow icon="fa-location-dot" label="Residence" value={selectedStudent.residence} />
                <DetailRow
                  icon="fa-graduation-cap"
                  label="Education"
                  value={selectedStudent.education_level}
                />
                {selectedStudent.bio && (
                  <DetailRow icon="fa-comment" label="About" value={selectedStudent.bio} />
                )}
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Programs
              </p>
              {selectedEnrollments.length > 0 && totalFee > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatRWF(totalFee)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-600">{formatRWF(totalPaid)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Paid</p>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${totalBalance > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      {formatRWF(Math.max(totalBalance, 0))}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Owing</p>
                  </div>
                </div>
              )}
              {selectedEnrollments.length === 0 ? (
                <p className="mb-4 text-xs text-slate-400">Not enrolled in any program yet.</p>
              ) : (
                <div className="mb-3 space-y-2">
                  {selectedEnrollments.map((e) => {
                    const fee = Number(e.fee) || 0
                    const paid = studentPayments
                      .filter((p) => p.enrollment_id === e.id)
                      .reduce((sum, p) => sum + Number(p.amount), 0)
                    const balance = fee - paid

                    return (
                      <div key={e.id} className="rounded-2xl bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  approvalDot[e.approval_status] || approvalDot.pending
                                }`}
                              ></span>
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {e.program?.name || e.program_id}
                              </p>
                            </div>
                            <p className="truncate text-xs text-slate-400">
                              {sessionLabel(e.session)} · {e.approval_status} · enrolled{' '}
                              {formatDate(e.enrolled_at)}
                            </p>
                          </div>
                          {canEnroll && (
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(e)}
                              aria-label="Remove program"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          )}
                        </div>

                        {fee > 0 && (
                          <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/5 pt-2 text-xs">
                            <span className="text-slate-400">
                              Total {formatRWF(fee)} · Paid {formatRWF(paid)}
                            </span>
                            <span className={balance > 0 ? 'font-semibold text-red-500' : 'font-semibold text-teal-600'}>
                              {balance > 0 ? `${formatRWF(balance)} owing` : 'Paid in full'}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {canEnroll && (
                <button
                  type="button"
                  onClick={() => openEnroll(selectedStudent)}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-black/5"
                >
                  <i className="fa-solid fa-graduation-cap"></i>
                  Add program
                </button>
              )}

              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Certificates
              </p>
              {completedEnrollments.length === 0 ? (
                <p className="mb-4 text-xs text-slate-400">
                  No certificates yet — awarded when a program is marked completed.
                </p>
              ) : (
                <div className="mb-4 space-y-2">
                  {completedEnrollments.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <i className="fa-solid fa-award text-sm"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          Certificate of Completion — {e.program?.name || e.program_id}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          Issued {formatDate(e.completed_at || e.enrolled_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Payment history
              </p>
              {paymentsLoading ? (
                <div className="mb-4 flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : studentPayments.length === 0 ? (
                <p className="mb-4 text-xs text-slate-400">No payments recorded yet.</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {studentPayments.map((p) => {
                    const program = selectedEnrollments.find((e) => e.id === p.enrollment_id)?.program
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {formatRWF(Number(p.amount))}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {program?.name || 'Unknown program'} · {p.method.replace('_', ' ')} ·{' '}
                            {formatDate(p.paid_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Notifications sent
                </p>
                {canEnroll && (
                  <button
                    type="button"
                    onClick={() => openNotify(selectedStudent)}
                    className="text-xs font-semibold text-accent underline underline-offset-4"
                  >
                    <i className="fa-solid fa-paper-plane mr-1"></i>
                    Send
                  </button>
                )}
              </div>
              {notifLoading ? (
                <div className="mb-4 flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : studentNotifications.length === 0 ? (
                <p className="mb-4 text-xs text-slate-400">No notifications sent yet.</p>
              ) : (
                <div className="mb-4 space-y-2">
                  {studentNotifications.map((n) => {
                    const checkColor = n.dismissed_at
                      ? 'text-green-500'
                      : n.seen_at
                        ? 'text-blue-500'
                        : 'text-slate-400'
                    const checkLabel = n.dismissed_at ? 'Dismissed' : n.seen_at ? 'Seen' : 'Delivered'

                    return (
                      <div key={n.id} className="rounded-2xl bg-white p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              n.type === 'system'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {n.type === 'system' ? 'System' : n.profiles?.full_name || 'Staff'}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <i
                              className={`fa-solid fa-check-double text-xs ${checkColor}`}
                              title={checkLabel}
                              aria-label={checkLabel}
                            ></i>
                            <button
                              type="button"
                              onClick={() => handleDeleteNotification(n.id)}
                              aria-label="Delete notification"
                              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <i className="fa-solid fa-trash text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-900">{n.message}</p>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          Sent {formatDate(n.created_at)} · Seen{' '}
                          {n.seen_at ? formatDate(n.seen_at) : 'not yet'} · Dismissed{' '}
                          {n.dismissed_at ? formatDate(n.dismissed_at) : 'not yet'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-black/10 pt-4">
                {selectedStudent.blocked_at ? (
                  <button
                    type="button"
                    onClick={() => handleUnblock(selectedStudent)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-black/5"
                  >
                    <i className="fa-solid fa-lock-open"></i>
                    Unblock
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBlockTarget(selectedStudent)
                      setBlockReason('')
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-black/5"
                  >
                    <i className="fa-solid fa-ban"></i>
                    Block
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setResetTarget(selectedStudent)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-black/5"
                  >
                    <i className="fa-solid fa-key"></i>
                    Reset password
                  </button>
                )}
              </div>

              {isAdmin && (
                <div className="mt-2 border-t border-black/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(selectedStudent)
                      setDeleteConfirmName('')
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <i className="fa-solid fa-trash"></i>
                    Delete permanently
                  </button>
                </div>
              )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden h-8 rounded-b-3xl bg-gradient-to-t from-[#F4F4F6] to-transparent lg:block"></div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {enrollTarget && (
          <BottomSheet onClose={() => setEnrollTarget(null)} maxWidthClassName="sm:max-w-lg">
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">
              Add program for {enrollTarget.full_name}
            </h2>
            <p className="mb-6 text-sm text-muted">
              Enrolls them directly — no application review needed since you're adding it yourself.
            </p>

            <form onSubmit={handleEnrollSubmit} className="space-y-3">
              <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-clapperboard text-muted"></i>
                <select
                  className="w-full bg-transparent text-sm text-accent outline-none"
                  value={enrollForm.programId}
                  onChange={(e) => {
                    const programId = e.target.value
                    const program = programs.find((p) => p.id === programId)
                    setEnrollForm({
                      ...enrollForm,
                      programId,
                      session: '',
                      amount: program?.fee ? String(program.fee) : enrollForm.amount,
                    })
                  }}
                >
                  <option value="">Select program...</option>
                  {enrollablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              {enrollTargetEnrollments.length > 0 && enrollablePrograms.length < programs.length && (
                <p className="pl-1 text-xs text-muted">
                  Already enrolled in {enrollTargetEnrollments.length === programs.length ? 'every' : 'some'} program
                  {enrollTargetEnrollments.length > 1 ? 's' : ''} — a student can't be enrolled in the same
                  program twice. Remove it from their profile first to re-add it.
                </p>
              )}

              {enrollForm.programId && (
                <p className="pl-1 text-xs text-muted">
                  Fee: {formatRWF(programs.find((p) => p.id === enrollForm.programId)?.fee || 0)}
                </p>
              )}

              {enrollForm.programId && (
                <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                  <i className="fa-solid fa-clock text-muted"></i>
                  <select
                    className="w-full bg-transparent text-sm text-accent outline-none"
                    value={enrollForm.session}
                    onChange={(e) => setEnrollForm({ ...enrollForm, session: e.target.value })}
                  >
                    <option value="">Select session...</option>
                    {Object.keys(programs.find((p) => p.id === enrollForm.programId)?.schedule || {}).map(
                      (sessionId) => (
                        <option key={sessionId} value={sessionId}>
                          {sessionLabel(sessionId)}
                        </option>
                      )
                    )}
                  </select>
                  {Object.keys(programs.find((p) => p.id === enrollForm.programId)?.schedule || {})
                    .length === 0 && (
                    <span className="shrink-0 text-xs text-red-600">No sessions set up yet</span>
                  )}
                </label>
              )}

              {isFinance && (
                <>
                  <label className="flex items-center gap-2 text-sm font-medium text-accent">
                    <input
                      type="checkbox"
                      checked={enrollForm.markPaid}
                      onChange={(e) => setEnrollForm({ ...enrollForm, markPaid: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Mark as paid
                  </label>

                  {enrollForm.markPaid && (
                    <>
                      <IconField
                        icon="fa-money-bill"
                        type="number"
                        min="1"
                        placeholder="Amount paid (RWF)"
                        value={enrollForm.amount}
                        onChange={(v) => setEnrollForm({ ...enrollForm, amount: v })}
                      />
                      <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                        <i className="fa-solid fa-credit-card text-muted"></i>
                        <select
                          className="w-full bg-transparent text-sm text-accent outline-none"
                          value={enrollForm.method}
                          onChange={(e) => setEnrollForm({ ...enrollForm, method: e.target.value })}
                        >
                          {paymentMethods.map((m) => (
                            <option key={m} value={m}>
                              {m.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </>
              )}

              {enrollError && <p className="text-sm font-medium text-red-600">{enrollError}</p>}

              <button
                type="submit"
                disabled={enrollSaving || enrollablePrograms.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-graduation-cap"></i>
                {enrollSaving ? 'Saving...' : 'Add program'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {removeTarget && (
          <BottomSheet onClose={() => setRemoveTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-red-600">Remove program</h2>
            <p className="mb-6 text-sm text-muted">
              This removes {selectedStudent?.full_name} from{' '}
              <span className="font-semibold text-accent">{removeTarget.program?.name}</span>, along
              with any payment history recorded against it. This cannot be undone.
            </p>

            <button
              type="button"
              onClick={handleRemoveEnrollment}
              disabled={removing}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-red-700 disabled:opacity-60"
            >
              <i className="fa-solid fa-xmark"></i>
              {removing ? 'Removing...' : 'Remove program'}
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetTarget && (
          <BottomSheet onClose={() => setResetTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">
              Reset password for {resetTarget.full_name}
            </h2>
            <p className="mb-6 text-sm text-muted">
              This immediately replaces their current password with a new one. You'll need to share
              it with them yourself — it won't be emailed or shown again after this.
            </p>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
            >
              <i className="fa-solid fa-key"></i>
              {resetting ? 'Resetting...' : 'Generate new password'}
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notifyTarget && (
          <BottomSheet onClose={() => setNotifyTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">
              Send notification to {notifyTarget.full_name}
            </h2>
            <p className="mb-6 text-sm text-muted">
              Shows on their dashboard until they dismiss it. You'll see when it was sent, seen, and
              dismissed.
            </p>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <textarea
                placeholder="Message"
                rows={4}
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                className="input"
              />

              {isAdmin && (
                <label className="flex items-center gap-2 text-sm font-medium text-accent">
                  <input
                    type="checkbox"
                    checked={notifyAsSystem}
                    onChange={(e) => setNotifyAsSystem(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Send as system notification (not attributed to you)
                </label>
              )}

              {notifyError && <p className="text-sm font-medium text-red-600">{notifyError}</p>}

              <button
                type="submit"
                disabled={notifySaving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-paper-plane"></i>
                {notifySaving ? 'Sending...' : 'Send notification'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {blockTarget && (
          <BottomSheet onClose={() => setBlockTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">Block {blockTarget.full_name}</h2>
            <p className="mb-6 text-sm text-muted">
              They won't be able to use their account until unblocked. They'll see who blocked them and why.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-3">
              <textarea
                placeholder="Reason (shown to the student)"
                rows={3}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="input"
              />

              <button
                type="submit"
                disabled={blockSaving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-red-700 disabled:opacity-60"
              >
                <i className="fa-solid fa-ban"></i>
                {blockSaving ? 'Blocking...' : 'Block student'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <BottomSheet onClose={() => setDeleteTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-red-600">Permanently delete</h2>
            <p className="mb-6 text-sm text-muted">
              This deletes {deleteTarget.full_name}'s account, enrollments, attendance, and payment
              history forever. This cannot be undone. Type their full name to confirm.
            </p>

            <div className="space-y-3">
              <IconField
                icon="fa-triangle-exclamation"
                placeholder={deleteTarget.full_name}
                value={deleteConfirmName}
                onChange={setDeleteConfirmName}
              />

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting || deleteConfirmName.trim() !== deleteTarget.full_name.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-red-700 disabled:opacity-40"
              >
                <i className="fa-solid fa-trash"></i>
                {deleting ? 'Deleting...' : 'Delete forever'}
              </button>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 text-sm">
      <i className={`fa-solid ${icon} mt-0.5 w-4 shrink-0 text-slate-400`}></i>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-slate-900">{value}</p>
      </div>
    </div>
  )
}

export default Students
