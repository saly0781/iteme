import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePrograms } from '../hooks/usePrograms'
import { useToast } from '../context/ToastContext'
import { SESSION_TYPES, sessionLabel } from '../data/sessions'
import LoadingSpinner from './LoadingSpinner'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function Schedule() {
  const toast = useToast()
  const { programs, loading: programsLoading } = usePrograms()
  const [programId, setProgramId] = useState('')
  const [session, setSession] = useState('morning')
  const [date, setDate] = useState(todayISO())
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  async function loadSessions() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('class_sessions')
      .select('id, program_id, session, session_date, topic')
      .order('session_date', { ascending: false })
      .limit(30)

    if (loadError) console.error('Could not load schedule:', loadError)
    setSessions(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (!programsLoading && programs.length > 0 && !programId) {
      setProgramId(programs[0].id)
    }
  }, [programsLoading, programs, programId])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const { error: insertError } = await supabase.from('class_sessions').upsert(
      { program_id: programId, session, session_date: date, topic: topic || null },
      { onConflict: 'program_id,session,session_date' }
    )

    setSaving(false)

    if (insertError) {
      const message = insertError.message || 'Could not add that class date.'
      setError(message)
      toast.error(message)
      return
    }

    setSuccess('Class date added.')
    setTopic('')
    toast.success('Class date added.')
    loadSessions()
  }

  async function handleDelete(id) {
    const { error: deleteError } = await supabase.from('class_sessions').delete().eq('id', id)
    if (deleteError) {
      console.error('Could not remove class date:', deleteError)
      toast.error(deleteError.message)
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    toast.success('Class date removed.')
  }

  if (programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Schedule</h1>
        <p className="text-sm text-slate-500">Add the class dates students will see on their dashboard.</p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid grid-cols-1 gap-4 rounded-3xl bg-[#F4F4F6] p-5 sm:grid-cols-4"
      >
        <Field label="Program">
          <select
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="input"
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Session">
          <select value={session} onChange={(e) => setSession(e.target.value)} className="input">
            {SESSION_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Topic (optional)">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Lighting basics"
            className="input"
          />
        </Field>

        <div className="sm:col-span-4">
          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
          {success && <p className="mb-3 text-sm font-medium text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={saving || !programId}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add class date'}
          </button>
        </div>
      </form>

      <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Recent & upcoming</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No class dates added yet.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const program = programs.find((p) => p.id === s.program_id)
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[#F4F4F6] p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: program?.color || '#0F172A' }}
                  ></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {program?.name || s.program_id} · {sessionLabel(s.session)}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {new Date(s.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {s.topic ? ` · ${s.topic}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  aria-label="Remove class date"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}

export default Schedule
