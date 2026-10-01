import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePrograms } from '../hooks/usePrograms'
import { supabase } from '../lib/supabase'
import { SESSION_TYPES, sessionLabel } from '../data/sessions'
import logoIcon from '../assets/Iteme_logo.svg'
import LoadingSpinner from './LoadingSpinner'

const statusOptions = [
  { value: 'present', label: 'Present', className: 'bg-teal-600 text-white' },
  { value: 'late', label: 'Late', className: 'bg-amber-500 text-white' },
  { value: 'absent', label: 'Absent', className: 'bg-red-500 text-white' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Quoted/escaped per RFC 4180 so names or topics containing commas, quotes,
// or newlines don't break the column structure when opened in Excel.
function csvCell(value) {
  const str = String(value ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  // Leading BOM so Excel detects UTF-8 instead of mangling accented names.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function Attendance() {
  const { user } = useAuth()
  const toast = useToast()
  const { programs, loading: programsLoading } = usePrograms()

  const [programId, setProgramId] = useState('')
  const [session, setSession] = useState('morning')
  const [date, setDate] = useState(todayISO())
  const [topic, setTopic] = useState('')

  const [loading, setLoading] = useState(false)
  const [classSessionId, setClassSessionId] = useState(null)
  const [roster, setRoster] = useState([])
  const [error, setError] = useState('')

  async function loadRoster(programIdOverride) {
    const pid = programIdOverride || programId
    setError('')
    setLoading(true)
    setRoster([])
    setClassSessionId(null)

    try {
      const { data: classSession, error: sessionError } = await supabase
        .from('class_sessions')
        .upsert(
          { program_id: pid, session, session_date: date, topic: topic || null },
          { onConflict: 'program_id,session,session_date' }
        )
        .select()
        .single()

      if (sessionError) throw sessionError

      const { data: enrolled, error: enrolledError } = await supabase
        .from('enrollments')
        .select('student_id, profiles(full_name, email, student_code)')
        .eq('program_id', pid)
        .eq('session', session)
        .eq('status', 'active')
        .eq('approval_status', 'approved')

      if (enrolledError) throw enrolledError

      const { data: existing, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status')
        .eq('class_session_id', classSession.id)

      if (attendanceError) throw attendanceError

      const existingByStudent = Object.fromEntries((existing || []).map((a) => [a.student_id, a]))

      setClassSessionId(classSession.id)
      setRoster(
        (enrolled || []).map((row) => ({
          studentId: row.student_id,
          name: row.profiles?.full_name || 'Unknown student',
          email: row.profiles?.email,
          studentCode: row.profiles?.student_code || '',
          status: existingByStudent[row.student_id]?.status || 'unmarked',
        }))
      )
    } catch (err) {
      const message = err.message || 'Could not load the class roster.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (programsLoading || programs.length === 0) return
    const initialId = programs[0].id
    setProgramId(initialId)
    loadRoster(initialId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once, when programs first finish loading
  }, [programsLoading])

  async function markStudent(studentId, status) {
    setRoster((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)))

    const { error: markError } = await supabase.from('attendance').upsert(
      {
        class_session_id: classSessionId,
        student_id: studentId,
        status,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'class_session_id,student_id' }
    )

    if (markError) {
      console.error('Could not save attendance:', markError)
      setError('Could not save that mark — please try again.')
      toast.error('Could not save that mark — please try again.')
    }
  }

  const selectedProgram = programs.find((p) => p.id === programId)

  function exportRosterToExcel() {
    const programName = selectedProgram?.name || programId
    const rows = [
      [`${programName} — ${sessionLabel(session)} — ${date}${topic ? ` — ${topic}` : ''}`],
      [],
      ['#', 'Full Name', 'Student ID', 'Email', 'Status', 'Signature'],
      ...roster.map((s, i) => [
        i + 1,
        s.name,
        s.studentCode,
        s.email || '',
        s.status === 'unmarked' ? '' : s.status[0].toUpperCase() + s.status.slice(1),
        '',
      ]),
    ]
    downloadCsv(`attendance-${programId}-${session}-${date}.csv`, rows)
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
      <div className="mb-6 print:hidden">
        <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Attendance</h1>
        <p className="text-sm text-slate-500">Pick a class to mark who showed up.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-3xl bg-[#F4F4F6] p-5 sm:grid-cols-4 print:hidden">
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
          <button
            type="button"
            onClick={() => loadRoster()}
            disabled={!programId || loading}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Load class'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-red-600 print:hidden">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16 print:hidden">
          <LoadingSpinner />
        </div>
      ) : roster.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400 print:hidden">
          No approved students enrolled in {selectedProgram?.name || 'this program'}'s {session}{' '}
          session yet.
        </p>
      ) : (
        <>
          <div className="space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {roster.length} student{roster.length === 1 ? '' : 's'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-black/30"
                  title="Print a blank sheet to mark attendance by hand"
                >
                  <i className="fa-solid fa-print"></i>
                  Print
                </button>
                <button
                  type="button"
                  onClick={exportRosterToExcel}
                  className="flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-black/30"
                  title="Download as a spreadsheet to print and mark attendance by hand"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  Export to Excel
                </button>
              </div>
            </div>

            {roster.map((s) => (
              <div
                key={s.studentId}
                className="flex flex-col gap-3 rounded-3xl bg-[#F4F4F6] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{s.name}</p>
                  <p className="truncate text-xs text-slate-400">{s.email}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => markStudent(s.studentId, opt.value)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                        s.status === opt.value
                          ? opt.className
                          : 'border border-black/15 text-slate-500 hover:border-black/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Print-only view — the interactive roster above is hidden via
              print:hidden; this is hidden on screen and only shown by the
              browser's print stylesheet. */}
          <div className="hidden print:block">
            <div className="mb-6 flex items-center justify-between border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                <img src={logoIcon} alt="" className="h-12 w-12 object-contain" />
                <div>
                  <p className="font-serif text-lg font-bold text-black">ITEME HUB</p>
                  <p className="text-xs uppercase tracking-wide text-black/60">Attendance Sheet</p>
                </div>
              </div>
              <p className="text-xs text-black/60">Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <h1 className="mb-1 font-serif text-xl font-bold text-black">
              {selectedProgram?.name || programId}
            </h1>
            <p className="mb-5 text-sm text-black/70">
              {sessionLabel(session)} session · {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {topic ? ` · ${topic}` : ''}
            </p>

            <table className="w-full border-collapse text-sm text-black">
              <thead>
                <tr className="bg-black/5">
                  <th className="border border-black/40 px-3 py-2 text-left font-semibold">#</th>
                  <th className="border border-black/40 px-3 py-2 text-left font-semibold">Full Name</th>
                  <th className="border border-black/40 px-3 py-2 text-left font-semibold">Student ID</th>
                  <th className="border border-black/40 px-3 py-2 text-left font-semibold">Status</th>
                  <th className="border border-black/40 px-3 py-2 text-left font-semibold">Signature</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => (
                  <tr key={s.studentId} className={i % 2 === 1 ? 'bg-black/[0.03]' : ''}>
                    <td className="border border-black/40 px-3 py-2.5">{i + 1}</td>
                    <td className="border border-black/40 px-3 py-2.5">{s.name}</td>
                    <td className="border border-black/40 px-3 py-2.5 font-mono">{s.studentCode}</td>
                    <td className="border border-black/40 px-3 py-2.5">
                      {s.status === 'unmarked' ? '' : s.status[0].toUpperCase() + s.status.slice(1)}
                    </td>
                    <td className="border border-black/40 px-3 py-2.5"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-10 flex items-end justify-between text-sm text-black">
              <div className="w-56 border-t border-black pt-1 text-xs text-black/60">
                Teacher's signature
              </div>
              <p className="text-xs text-black/40">{roster.length} students</p>
            </div>
          </div>
        </>
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

export default Attendance
