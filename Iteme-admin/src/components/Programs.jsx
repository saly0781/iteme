import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { formatRWF } from '../data/programs'
import { SESSION_TYPES } from '../data/sessions'
import BottomSheet from './BottomSheet'
import IconField from './IconField'
import LoadingSpinner from './LoadingSpinner'

const levelOptions = [
  'Beginner',
  'Beginner to Intermediate',
  'Beginner to Advanced',
  'Intermediate',
  'Intermediate to Advanced',
  'Advanced',
]

const durationOptions = ['3 months', '6 months', '10 months', '12 months', '1 year', '2 years']

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const emptyForm = {
  id: null,
  name: '',
  color: '#2563EB',
  description: '',
  fee: '',
  duration: durationOptions[2],
  level: levelOptions[2],
  format: '',
  isOpen: true,
  startDate: '',
  endDate: '',
  nextIntakeDate: '',
  sessions: [],
  facultyId: '',
  facultyName: '',
  facultyTitle: '',
  ratingScore: '',
  ratingCount: '',
  outcomesText: '',
  skillsText: '',
  imageUrl: '',
}

function rowToForm(row, sessions) {
  return {
    id: row.id,
    name: row.name || '',
    color: row.color || '#2563EB',
    description: row.description || '',
    fee: row.fee ?? '',
    duration: row.duration || durationOptions[2],
    level: row.level || levelOptions[2],
    format: row.format || '',
    isOpen: row.is_open ?? true,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    nextIntakeDate: row.next_intake_date || '',
    sessions: (sessions || []).map((s) => ({
      session: s.session,
      time: s.time_label || '',
      limit: s.seat_limit ?? '',
    })),
    facultyId: '',
    facultyName: row.faculty_name || '',
    facultyTitle: row.faculty_title || '',
    ratingScore: row.rating_score ?? '',
    ratingCount: row.rating_count ?? '',
    outcomesText: (row.outcomes || []).join('\n'),
    skillsText: (row.skills || []).join(', '),
    imageUrl: row.image_url || '',
  }
}

function formToPayload(form) {
  return {
    name: form.name,
    color: form.color || null,
    description: form.description || null,
    fee: form.fee ? Number(form.fee) : null,
    duration: form.duration || null,
    level: form.level || null,
    format: form.format || null,
    is_open: form.isOpen,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    next_intake_date: form.nextIntakeDate || null,
    faculty_name: form.facultyName || null,
    faculty_title: form.facultyTitle || null,
    rating_score: form.ratingScore ? Number(form.ratingScore) : null,
    rating_count: form.ratingCount ? Number(form.ratingCount) : null,
    outcomes: form.outcomesText
      ? form.outcomesText.split('\n').map((s) => s.trim()).filter(Boolean)
      : [],
    skills: form.skillsText
      ? form.skillsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    image_url: form.imageUrl || null,
  }
}

function Programs() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [sessionsByProgram, setSessionsByProgram] = useState({})
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function loadPrograms() {
    setLoading(true)
    return Promise.all([
      supabase.from('programs').select('*').order('active', { ascending: false }).order('created_at'),
      supabase.from('program_sessions').select('program_id, session, time_label, seat_limit'),
      supabase.from('profiles').select('id, full_name, title').eq('role', 'teacher').order('full_name'),
    ]).then(([programsRes, sessionsRes, teachersRes]) => {
      if (programsRes.error) console.error('Could not load programs:', programsRes.error)
      if (sessionsRes.error) console.error('Could not load program sessions:', sessionsRes.error)
      if (teachersRes.error) console.error('Could not load teachers:', teachersRes.error)

      const byProgram = {}
      ;(sessionsRes.data || []).forEach((row) => {
        ;(byProgram[row.program_id] ||= []).push(row)
      })

      setRows(programsRes.data || [])
      setSessionsByProgram(byProgram)
      setTeachers(teachersRes.data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadPrograms()
  }, [])

  function openNew() {
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(row) {
    const matchedTeacher = teachers.find((t) => t.full_name === row.faculty_name)
    setForm({ ...rowToForm(row, sessionsByProgram[row.id]), facultyId: matchedTeacher?.id || '' })
    setError('')
    setShowForm(true)
  }

  function addSessionRow() {
    const used = new Set(form.sessions.map((s) => s.session))
    const next = SESSION_TYPES.find((s) => !used.has(s.id))
    if (!next) return
    setForm((f) => ({ ...f, sessions: [...f.sessions, { session: next.id, time: '', limit: '' }] }))
  }

  function updateSessionRow(index, patch) {
    setForm((f) => ({
      ...f,
      sessions: f.sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function removeSessionRow(index) {
    setForm((f) => ({ ...f, sessions: f.sessions.filter((_, i) => i !== index) }))
  }

  function handleFacultyChange(teacherId) {
    const teacher = teachers.find((t) => t.id === teacherId)
    setForm((f) => ({
      ...f,
      facultyId: teacherId,
      facultyName: teacher?.full_name || '',
      facultyTitle: teacher?.title || '',
    }))
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')

    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ''))}${file.name.match(/\.[^.]+$/)?.[0] || ''}`
    const { error: uploadError } = await supabase.storage.from('program-images').upload(path, file)

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      toast.error(`Image upload failed: ${uploadError.message}`)
      return
    }

    const { data } = supabase.storage.from('program-images').getPublicUrl(path)
    setForm((f) => ({ ...f, imageUrl: data.publicUrl }))
    setUploading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name) {
      setError('Program name is required.')
      return
    }

    setSaving(true)
    const payload = formToPayload(form)
    const programId = form.id || slugify(form.name)

    const { error: saveError } = form.id
      ? await supabase.from('programs').update(payload).eq('id', form.id)
      : await supabase.from('programs').insert({ ...payload, id: programId, active: true })

    if (saveError) {
      setSaving(false)
      setError(saveError.message)
      toast.error(saveError.message)
      return
    }

    // Replace this program's sessions wholesale — simplest way to keep
    // program_sessions in sync with a form that can add/edit/remove rows.
    const { error: deleteSessionsError } = await supabase
      .from('program_sessions')
      .delete()
      .eq('program_id', programId)

    if (deleteSessionsError) {
      setSaving(false)
      setError(deleteSessionsError.message)
      toast.error(deleteSessionsError.message)
      return
    }

    if (form.sessions.length > 0) {
      const { error: sessionsError } = await supabase.from('program_sessions').insert(
        form.sessions.map((s) => ({
          program_id: programId,
          session: s.session,
          time_label: s.time || null,
          seat_limit: s.limit ? Number(s.limit) : null,
        }))
      )

      if (sessionsError) {
        setSaving(false)
        setError(sessionsError.message)
        toast.error(sessionsError.message)
        return
      }
    }

    setSaving(false)
    toast.success(form.id ? `${form.name} was updated.` : `${form.name} was created.`)
    setShowForm(false)
    loadPrograms()
  }

  async function toggleActive(row) {
    const { error: toggleError } = await supabase
      .from('programs')
      .update({ active: !row.active })
      .eq('id', row.id)
    if (toggleError) {
      console.error('Could not update program status:', toggleError)
      toast.error(toggleError.message)
      return
    }
    toast.success(row.active ? `${row.name} was archived.` : `${row.name} was restored.`)
    loadPrograms()
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
          <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Programs</h1>
          <p className="text-sm text-slate-500">{rows.length} programs in the catalog</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-gray-800"
        >
          <i className="fa-solid fa-clapperboard"></i>
          Add program
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-4 rounded-3xl bg-[#F4F4F6] p-4">
            {row.image_url ? (
              <img src={row.image_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
            ) : (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white"
                style={{ backgroundColor: row.color || '#0b0b0b' }}
              >
                <i className="fa-solid fa-clapperboard"></i>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-slate-900">{row.name}</p>
                {!row.active && (
                  <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Archived
                  </span>
                )}
                {row.active && !row.is_open && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Closed
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {row.fee ? formatRWF(Number(row.fee)) : 'No fee set'} · {row.duration || 'No duration set'}
                {row.faculty_name ? ` · ${row.faculty_name}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition-colors hover:text-slate-900"
                aria-label="Edit program"
              >
                <i className="fa-solid fa-pen text-xs"></i>
              </button>
              <button
                type="button"
                onClick={() => toggleActive(row)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 transition-colors hover:text-red-600"
                aria-label={row.active ? 'Archive program' : 'Restore program'}
              >
                <i className={`fa-solid ${row.active ? 'fa-box-archive' : 'fa-rotate-left'} text-xs`}></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <BottomSheet onClose={() => setShowForm(false)} maxWidthClassName="sm:max-w-lg">
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">
              {form.id ? 'Edit program' : 'New program'}
            </h2>
            <p className="mb-6 text-sm text-muted">
              This is what students see and what schedule/attendance pickers use.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <div className="mb-3 flex items-center gap-4">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: form.color || '#0b0b0b' }}
                    >
                      <i className="fa-solid fa-image"></i>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-darker">
                    <i className="fa-solid fa-upload"></i>
                    {uploading ? 'Uploading...' : 'Upload cover photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <SectionLabel>Basics</SectionLabel>
              <IconField icon="fa-clapperboard" placeholder="Program name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-palette text-muted"></i>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-6 w-10 cursor-pointer bg-transparent"
                />
                <span className="text-sm text-muted">Brand color for this program</span>
              </div>
              <textarea
                placeholder="Description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
              />
              <div className="grid grid-cols-2 gap-3">
                <IconField icon="fa-money-bill" type="number" min="1" placeholder="Fee (RWF)" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} />
                <SelectField icon="fa-location-dot" value={form.format} onChange={(v) => setForm({ ...form, format: v })} placeholder="Format (free text)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  icon="fa-hourglass-half"
                  value={form.duration}
                  onChange={(v) => setForm({ ...form, duration: v })}
                  options={durationOptions}
                />
                <SelectField
                  icon="fa-layer-group"
                  value={form.level}
                  onChange={(v) => setForm({ ...form, level: v })}
                  options={levelOptions}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-accent">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                  className="h-4 w-4"
                />
                Open for applications
              </label>

              <SectionLabel>Dates</SectionLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField icon="fa-calendar" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} label="Start date" />
                <DateField icon="fa-calendar" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} label="End date" />
              </div>
              <DateField
                icon="fa-calendar-plus"
                value={form.nextIntakeDate}
                onChange={(v) => setForm({ ...form, nextIntakeDate: v })}
                label="Next intake date (optional)"
              />

              <SectionLabel>Schedule</SectionLabel>
              {form.sessions.length === 0 && (
                <p className="text-sm text-muted">No sessions added yet — students can't apply until at least one is set.</p>
              )}
              <div className="space-y-3">
                {form.sessions.map((s, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                    <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                      <i className={`fa-solid ${SESSION_TYPES.find((t) => t.id === s.session)?.icon || 'fa-clock'} text-muted`}></i>
                      <select
                        className="w-full bg-transparent text-sm text-accent outline-none"
                        value={s.session}
                        onChange={(e) => updateSessionRow(index, { session: e.target.value })}
                      >
                        {SESSION_TYPES.filter(
                          (t) => t.id === s.session || !form.sessions.some((row) => row.session === t.id)
                        ).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <IconField
                      icon="fa-clock"
                      placeholder="Time (e.g. 8:00 AM – 12:00 PM)"
                      value={s.time}
                      onChange={(v) => updateSessionRow(index, { time: v })}
                    />
                    <IconField
                      icon="fa-users"
                      type="number"
                      min="1"
                      placeholder="Capacity"
                      value={s.limit}
                      onChange={(v) => updateSessionRow(index, { limit: v })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSessionRow(index)}
                      aria-label="Remove session"
                      className="flex h-11 w-11 shrink-0 items-center justify-center justify-self-start rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:justify-self-auto"
                    >
                      <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
              {form.sessions.length < SESSION_TYPES.length && (
                <button
                  type="button"
                  onClick={addSessionRow}
                  className="flex items-center gap-2 text-sm font-semibold text-accent"
                >
                  <i className="fa-solid fa-plus"></i>
                  Add session
                </button>
              )}

              <SectionLabel>Faculty</SectionLabel>
              {teachers.length === 0 ? (
                <p className="text-sm text-muted">
                  No teacher accounts yet — add one from the Team page first.
                </p>
              ) : (
                <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                  <i className="fa-solid fa-user text-muted"></i>
                  <select
                    className="w-full bg-transparent text-sm text-accent outline-none"
                    value={form.facultyId}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                  >
                    <option value="">Select instructor...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {form.facultyTitle && <p className="pl-1 text-xs text-muted">{form.facultyTitle}</p>}

              <SectionLabel>Rating (optional)</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <IconField icon="fa-star" type="number" min="0" placeholder="Score (e.g. 4.8)" value={form.ratingScore} onChange={(v) => setForm({ ...form, ratingScore: v })} />
                <IconField icon="fa-comment" type="number" min="0" placeholder="Review count" value={form.ratingCount} onChange={(v) => setForm({ ...form, ratingCount: v })} />
              </div>

              <SectionLabel>What students will learn</SectionLabel>
              <textarea
                placeholder="One outcome per line"
                rows={4}
                value={form.outcomesText}
                onChange={(e) => setForm({ ...form, outcomesText: e.target.value })}
                className="input"
              />
              <textarea
                placeholder="Skills, comma separated"
                rows={2}
                value={form.skillsText}
                onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
                className="input"
              />

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={saving || uploading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-clapperboard"></i>
                {saving ? 'Saving...' : form.id ? 'Save changes' : 'Create program'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{children}</p>
}

function SelectField({ icon, value, onChange, options, placeholder }) {
  if (!options) {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
        <i className={`fa-solid ${icon} text-muted`}></i>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-accent outline-none placeholder:text-muted"
        />
      </label>
    )
  }
  return (
    <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
      <i className={`fa-solid ${icon} text-muted`}></i>
      <select
        className="w-full bg-transparent text-sm text-accent outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

function DateField({ icon, value, onChange, label }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
        <i className={`fa-solid ${icon} text-muted`}></i>
        <input
          type="date"
          title={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-accent outline-none"
        />
      </label>
    </div>
  )
}

export default Programs
