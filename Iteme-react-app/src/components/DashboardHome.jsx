import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useEnrollments } from '../hooks/useEnrollments'
import { usePrograms } from '../hooks/usePrograms'
import { usePayments } from '../hooks/usePayments'
import { useStudentNotifications } from '../hooks/useStudentNotifications'
import { supabase } from '../lib/supabase'
import { colorChoices, formatRWF } from '../data/programs'
import { sessionLabel } from '../data/sessions'
import BottomSheet from './BottomSheet'
import LoadingSpinner from './LoadingSpinner'

const courseTabs = ['All Programs', 'Open', 'Closed']

// Students can remove their own enrollment within this window (matches the
// "Students can remove their own recent enrollment" RLS policy) — after it
// closes, only staff can remove it from the admin console.
const SELF_REMOVE_WINDOW_DAYS = 14

function canSelfRemove(enrolledAt) {
  const enrolled = new Date(enrolledAt)
  if (Number.isNaN(enrolled.getTime())) return false
  const days = (Date.now() - enrolled.getTime()) / (1000 * 60 * 60 * 24)
  return days < SELF_REMOVE_WINDOW_DAYS
}

const approvalBadge = {
  pending: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Active Program', className: 'bg-teal-100 text-teal-700' },
  rejected: { label: 'Not Approved', className: 'bg-red-100 text-red-700' },
}

function formatShortDate(dateString) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function isSameCalendarDay(a, b) {
  return (
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  )
}

function DashboardHome() {
  const { user, profile, openProgramDetail } = useAuth()
  const {
    enrollments,
    allEnrollments,
    loading: enrollmentsLoading,
    refresh: refreshEnrollments,
  } = useEnrollments()
  const { programs, loading: programsLoading } = usePrograms()
  const { payments, loading: paymentsLoading } = usePayments()
  const { notifications, markSeen, dismiss } = useStudentNotifications()

  const [attendance, setAttendance] = useState([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [scheduleRows, setScheduleRows] = useState([])
  const [tab, setTab] = useState(courseTabs[0])
  const [openColorFor, setOpenColorFor] = useState(null)
  const [showAllEnrollments, setShowAllEnrollments] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const scrollerRef = useRef(null)

  useEffect(() => {
    if (!user) return

    supabase
      .from('attendance')
      .select('status, class_sessions(session_date, session, program_id, topic)')
      .eq('student_id', user.id)
      .order('marked_at', { ascending: false })
      .then(({ data }) => {
        setAttendance(data || [])
        setAttendanceLoading(false)
      })
  }, [user])

  useEffect(() => {
    // Viewing the dashboard with a notification visible counts as "seen" —
    // no explicit click required.
    notifications.forEach((n) => {
      if (!n.seen_at) markSeen(n.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire when the notification list itself changes, not on every markSeen identity change
  }, [notifications])

  useEffect(() => {
    if (enrollments.length === 0) {
      setScheduleRows([])
      return
    }

    const sessionByProgram = Object.fromEntries(enrollments.map((e) => [e.program_id, e.session]))

    supabase
      .from('class_sessions')
      .select('program_id, session, session_date')
      .in('program_id', enrollments.map((e) => e.program_id))
      .then(({ data, error }) => {
        if (error) {
          console.error('Could not load class schedule:', error)
          setScheduleRows([])
          return
        }
        setScheduleRows((data || []).filter((row) => row.session === sessionByProgram[row.program_id]))
      })
  }, [enrollments])

  const loading = attendanceLoading || enrollmentsLoading || programsLoading

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  const presentCount = attendance.filter((a) => a.status === 'present').length
  const totalMarked = attendance.filter((a) => a.status !== 'unmarked').length
  const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 0

  const today = new Date()
  const isSameDay = (dateString) => {
    const d = new Date(dateString)
    return (
      !Number.isNaN(d.getTime()) &&
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  }

  const todayClasses = enrollments
    .filter((e) => e.program && e.approval_status === 'approved')
    .filter((e) =>
      scheduleRows.some((row) => row.program_id === e.program_id && isSameDay(row.session_date))
    )
    .map((e) => ({ program: e.program, color: e.color, session: e.session }))

  const colorByProgram = Object.fromEntries(enrollments.map((e) => [e.program_id, e.color]))
  const legendItems = enrollments
    .filter((e) => e.program)
    .map((e) => ({ id: e.program_id, name: e.program.name, color: e.color }))

  const scheduleEvents = enrollments
    .filter((e) => e.program && e.approval_status === 'approved')
    .flatMap((e) => {
      const { applied, limit } = e.program.schedule[e.session]
      const seatsPercent = limit > 0 ? Math.round((applied / limit) * 100) : 0

      return scheduleRows
        .filter((row) => row.program_id === e.program_id)
        .map((row) => ({
          key: `${e.program_id}-${row.session_date}`,
          program: e.program,
          color: e.color,
          session: e.session,
          date: new Date(row.session_date),
          seatsPercent,
        }))
    })
    .filter((event) => !Number.isNaN(event.date.getTime()))

  const appliedCount = allEnrollments.length
  const completedCount = allEnrollments.filter((e) => e.status === 'completed').length

  const enrolledProgramIds = new Set(enrollments.map((e) => e.program_id))

  const otherPrograms = programs.filter((p) => !enrolledProgramIds.has(p.id))

  const filteredPrograms = programs.filter((p) => {
    if (tab === 'Open') return p.isOpen
    if (tab === 'Closed') return !p.isOpen
    return true
  })

  function scrollBy(amount) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  function attendanceStatsFor(programId) {
    const rows = attendance.filter((a) => a.class_sessions?.program_id === programId)
    const present = rows.filter((a) => a.status === 'present').length
    const marked = rows.filter((a) => a.status !== 'unmarked').length
    return marked > 0 ? Math.round((present / marked) * 100) : 0
  }

  async function handleColorPick(programId, c) {
    setOpenColorFor(null)
    if (!user) return

    await supabase
      .from('enrollments')
      .update({ color: c })
      .eq('student_id', user.id)
      .eq('program_id', programId)
      .eq('status', 'active')

    refreshEnrollments()
  }

  async function handleRemoveEnrollment() {
    setRemoving(true)
    setRemoveError('')
    // RLS silently deletes 0 rows (not an error) once the 2-week window has
    // closed, so success has to be checked via the returned row, not just
    // the absence of an error.
    const { data, error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', removeTarget.id)
      .select()
    setRemoving(false)

    if (error || !data || data.length === 0) {
      setRemoveError('Could not remove this program — it may be outside the 2-week window. Contact staff for help.')
      return
    }

    setRemoveTarget(null)
    refreshEnrollments()
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-6 space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 rounded-3xl bg-amber-50 p-4 sm:p-5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <i className={`fa-solid ${n.type === 'system' ? 'fa-circle-info' : 'fa-bell'}`}></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      {n.type === 'system' ? 'System notification' : n.profiles?.full_name || 'Staff'}
                    </p>
                    <p className="text-sm text-slate-900">{n.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    aria-label="Dismiss notification"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-500 transition-colors hover:bg-amber-100"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hero */}
          <div className="mb-6 flex flex-row items-center justify-between gap-3 rounded-3xl bg-[#F4F4F6] p-4 sm:gap-6 sm:p-8">
            <div>
              <h1 className="mb-0.5 font-serif text-lg font-bold text-slate-900 sm:mb-2 sm:text-3xl">
                Hello {profile?.full_name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="text-xs text-slate-500 sm:text-base">
                {enrollments.length > 0
                  ? "It's good to see you progressing..."
                  : 'Choose a program below to start your journey.'}
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm sm:h-20 sm:w-20 sm:text-4xl">
              👋
            </div>
          </div>

          {/* Today's class */}
          {todayClasses.length > 0 && <TodayClassStack classes={todayClasses} />}

          {/* Stat cards — mobile/tablet only, shown here right after the hero */}
          <div className="mb-6 xl:hidden">
            <StatCards appliedCount={appliedCount} completedCount={completedCount} />
          </div>

          {/* Your programs */}
          {enrollments.length > 0 && (
            <div className="mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-slate-900">Your Programs</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {enrollments.length} enrolled
                </span>
              </div>

              <div className="space-y-3">
                {(showAllEnrollments ? enrollments : enrollments.slice(0, 2)).map((e) => {
                  if (!e.program) return null

                  return (
                    <EnrolledProgramRow
                      key={e.program_id}
                      enrollment={e}
                      program={e.program}
                      color={e.color}
                      attendancePercent={attendanceStatsFor(e.program_id)}
                      colorPickerOpen={openColorFor === e.program_id}
                      onToggleColorPicker={() =>
                        setOpenColorFor((v) => (v === e.program_id ? null : e.program_id))
                      }
                      onCloseColorPicker={() => setOpenColorFor(null)}
                      onPickColor={(c) => handleColorPick(e.program_id, c)}
                      onRequestRemove={() => {
                        setRemoveError('')
                        setRemoveTarget(e)
                      }}
                    />
                  )
                })}
              </div>

              {enrollments.length > 2 && (
                <button
                  type="button"
                  onClick={() => setShowAllEnrollments((v) => !v)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-black/10 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-black/20 hover:text-slate-900"
                >
                  {showAllEnrollments ? (
                    <>
                      Show less <i className="fa-solid fa-chevron-up text-[10px]"></i>
                    </>
                  ) : (
                    <>
                      Show {enrollments.length - 2} more{' '}
                      <i className="fa-solid fa-chevron-down text-[10px]"></i>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Recent watch → Explore programs */}
          {otherPrograms.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-slate-900">Explore Programs</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollBy(-320)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollBy(320)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-slate-500 transition-colors hover:text-slate-900"
                  >
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </button>
                </div>
              </div>

              <div ref={scrollerRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                {otherPrograms.map((p) => (
                  <div key={p.id} className="w-[260px] shrink-0">
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl">
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-900">
                        {p.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <p className="mb-2 text-sm font-semibold leading-snug text-slate-900">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
                          {p.faculty.name[0]}
                        </div>
                        <span className="text-xs text-slate-400">{p.faculty.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openProgramDetail(p.id)}
                        className="text-xs font-semibold text-slate-900 underline underline-offset-2"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Programs list */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-slate-900">Programs</h2>
            </div>

            <div className="mb-4 flex items-center gap-5 border-b border-black/5 text-sm">
              {courseTabs.map((t) => (
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

            <div className="space-y-3">
              {filteredPrograms.map((p) => {
                const isEnrolled = enrolledProgramIds.has(p.id)

                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl bg-[#F4F4F6] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        <img src={p.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">by {p.faculty.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <i className="fa-regular fa-clock"></i>
                        {p.duration}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <i className="fa-solid fa-star text-amber-400"></i>
                        {p.rating.score}
                      </span>

                      {isEnrolled ? (
                        <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700">
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openProgramDetail(p.id)}
                          className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-black/30"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────── */}
        <div className="min-w-0">
          {/* Stat cards — desktop only, mobile/tablet shows these right after the hero */}
          <div className="mb-6 hidden xl:block">
            <StatCards appliedCount={appliedCount} completedCount={completedCount} />
          </div>

          {/* Statistics */}
          <div className="mb-6 rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-slate-900">Your statistics</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Attendance
              </span>
            </div>

            <AttendanceLineChart attendance={attendance} />
          </div>

          {/* Calendar */}
          <div className="mb-6 rounded-3xl bg-[#F4F4F6] p-5">
            <MiniCalendar
              highlightDate={enrollments[0]?.program?.startDate}
              scheduleRows={scheduleRows}
              colorByProgram={colorByProgram}
              legendItems={legendItems}
            />
          </div>

          {/* Class schedule */}
          {scheduleEvents.length > 0 && (
            <ClassScheduleTimeline events={scheduleEvents} />
          )}

          {/* Payment history */}
          <div className="mb-6 rounded-3xl bg-[#F4F4F6] p-5">
            <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Payment History</h2>

            {paymentsLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            ) : payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {formatRWF(Number(p.amount))}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {p.program?.name || 'Unknown program'} · {p.method.replace('_', ' ')} ·{' '}
                        {formatShortDate(p.paid_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Faculty */}
          <div className="rounded-3xl bg-[#F4F4F6] p-5">
            <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">
              Meet the Faculty
            </h2>

            <div className="space-y-4">
              {programs.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {p.faculty.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {p.faculty.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">{p.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {removeTarget && (
          <BottomSheet onClose={() => setRemoveTarget(null)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">Remove program</h2>
            <p className="mb-6 text-sm text-muted">
              This removes you from{' '}
              <span className="font-semibold text-accent">{removeTarget.program?.name}</span>. You
              can only do this within {SELF_REMOVE_WINDOW_DAYS} days of enrolling — after that,
              contact staff. This cannot be undone.
            </p>

            {removeError && <p className="mb-4 text-sm font-medium text-red-600">{removeError}</p>}

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
    </div>
  )
}

function TodayClassStack({ classes }) {
  const [index, setIndex] = useState(0)
  const multiple = classes.length > 1
  const activeIndex = Math.min(index, classes.length - 1)
  const current = classes[activeIndex]

  useEffect(() => {
    if (!multiple) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % classes.length)
    }, 5000)
    return () => clearInterval(id)
  }, [multiple, classes.length])

  if (!current) return null

  return (
    <div className="relative mb-6">
      {multiple && (
        <div
          className="absolute inset-0 translate-y-3 scale-[0.94] rounded-3xl opacity-30"
          style={{ backgroundColor: classes[(activeIndex + 1) % classes.length].color }}
        ></div>
      )}
      {classes.length > 2 && (
        <div
          className="absolute inset-0 translate-y-6 scale-[0.88] rounded-3xl opacity-15"
          style={{ backgroundColor: classes[(activeIndex + 2) % classes.length].color }}
        ></div>
      )}

      <div style={{ perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.program.id}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            style={{ backgroundColor: current.color }}
            className="relative z-10 flex items-center gap-4 rounded-3xl p-5 text-white"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <i className="fa-solid fa-calendar-day text-lg"></i>
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/70">
                Today's class
                {multiple && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                    {activeIndex + 1}/{classes.length}
                  </span>
                )}
              </p>
              <p className="truncate font-serif text-lg font-bold">{current.program.name}</p>
              <p className="flex items-center gap-1.5 text-sm text-white/80">
                <i className="fa-regular fa-clock"></i>
                {current.program.schedule[current.session].time}
                <span className="text-white/50">·</span>
                {sessionLabel(current.session)} session
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {multiple && (
        <div className="mt-2 flex justify-center gap-1.5">
          {classes.map((c, i) => (
            <button
              key={c.program.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${c.program.name}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-5' : 'w-1.5 bg-slate-300'
              }`}
              style={i === activeIndex ? { backgroundColor: c.color } : undefined}
            ></button>
          ))}
        </div>
      )}
    </div>
  )
}

const PILL_WIDTHS = [92, 74, 84, 64]

const dateRowVariants = {
  enter: (dir) => ({ x: dir > 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -36 : 36, opacity: 0 }),
}

function ClassScheduleTimeline({ events }) {
  const today = new Date()
  const [weekOffset, setWeekOffset] = useState(0)
  const [direction, setDirection] = useState(0)

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - 3 + i + weekOffset * 6)
    return d
  })

  const todayIndex = days.findIndex((d) => isSameCalendarDay(d, today))
  const colWidth = 100 / days.length
  const [selectedIndex, setSelectedIndex] = useState(Math.max(todayIndex, 0))

  useEffect(() => {
    setSelectedIndex(Math.max(todayIndex, 0))
  }, [weekOffset])

  function goToWeek(step) {
    setDirection(step)
    setWeekOffset((o) => o + step)
  }

  const selectedDay = days[selectedIndex]
  const dayEvents = events.filter((e) => isSameCalendarDay(e.date, selectedDay))

  const itemHeight = 62
  const verticalStep = 72
  const topPad = 20
  const trackHeight =
    dayEvents.length > 0 ? topPad + (dayEvents.length - 1) * verticalStep + itemHeight + 20 : 110

  return (
    <div className="mb-6 rounded-3xl bg-[#F4F4F6] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-slate-900">Class Schedule</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
            {days[0].toLocaleDateString('en-US', { month: 'long' })}
          </span>
          <button
            type="button"
            onClick={() => goToWeek(-1)}
            aria-label="Previous dates"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-900"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            type="button"
            onClick={() => goToWeek(1)}
            aria-label="Next dates"
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-900"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <motion.div
        className="relative overflow-hidden"
        animate={{ height: trackHeight }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
      >
        {/* Dashed vertical column grid */}
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
          {days.map((_, i) => (
            <div
              key={i}
              className={i < days.length - 1 ? 'border-r border-dashed border-slate-200' : ''}
            ></div>
          ))}
        </div>

        {/* Today target line */}
        {todayIndex !== -1 && (
          <div
            className="absolute inset-y-0 border-r-2 border-dashed border-slate-900/40"
            style={{ left: `${(todayIndex + 0.5) * colWidth}%` }}
          >
            <div className="absolute top-0 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 border-slate-900 bg-white">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-900"></span>
            </div>
          </div>
        )}

        {/* Selected day's classes, big + unequal widths */}
        {dayEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
            No classes on {formatShortDate(selectedDay)}
          </div>
        ) : (
          dayEvents.map((e, i) => {
            const width = PILL_WIDTHS[i % PILL_WIDTHS.length]
            const alignRight = i % 2 === 1
            const leftPercent = alignRight ? 100 - width : 0
            const initials = e.program.faculty.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')

            return (
              <div
                key={e.key}
                className="absolute flex items-center justify-between gap-3 rounded-[22px] px-4 shadow-sm"
                style={{
                  top: topPad + i * verticalStep,
                  left: `${leftPercent}%`,
                  width: `${width}%`,
                  height: itemHeight,
                  backgroundColor: `${e.color}26`,
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-slate-900">
                    {e.program.name} Class
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {e.program.schedule[e.session].time}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">{e.seatsPercent}%</span>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
                    style={{ backgroundColor: e.color }}
                  >
                    {initials}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </motion.div>

      {/* Clickable dates row */}
      <div className="mt-3 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={weekOffset}
            custom={direction}
            variants={dateRowVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="grid text-center"
            style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
          >
            {days.map((d, i) => {
              const dayIsToday = isSameCalendarDay(d, today)
              const isSelected = i === selectedIndex
              const hasClass = events.some((e) => isSameCalendarDay(e.date, d))

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className="flex flex-col items-center gap-1 py-1"
                >
                  <span
                    className={`text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'font-bold text-slate-900'
                        : dayIsToday
                          ? 'font-semibold text-slate-700'
                          : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {formatShortDate(d)}
                  </span>
                  <span
                    className={`h-1 w-1 rounded-full ${hasClass ? 'bg-slate-900' : 'bg-transparent'}`}
                  ></span>
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function EnrolledProgramRow({
  enrollment,
  program,
  color,
  attendancePercent,
  colorPickerOpen,
  onToggleColorPicker,
  onCloseColorPicker,
  onPickColor,
  onRequestRemove,
}) {
  const removable = canSelfRemove(enrollment.enrolled_at)

  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl bg-[#F4F4F6] p-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          <img src={program.image} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900">{program.name}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                (approvalBadge[enrollment.approval_status] || approvalBadge.pending).className
              }`}
            >
              {(approvalBadge[enrollment.approval_status] || approvalBadge.pending).label}
            </span>
          </div>
          <p className="truncate text-xs text-slate-400">by {program.faculty.name}</p>
          {removable ? (
            <button
              type="button"
              onClick={onRequestRemove}
              className="mt-1 text-xs font-semibold text-red-500 underline underline-offset-2"
            >
              Remove program
            </button>
          ) : (
            <p className="mt-1 text-xs text-slate-400">
              Past the 2-week removal window — contact staff to remove
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onToggleColorPicker}
            aria-label="Change program color"
            title="Change program color"
            className="h-6 w-6 rounded-full shadow-sm ring-2 ring-white transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          ></button>

          {colorPickerOpen && (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={onCloseColorPicker}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div className="absolute right-0 top-8 z-50 grid w-40 grid-cols-4 gap-2 rounded-2xl bg-white p-3 shadow-xl">
                {colorChoices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onPickColor(c)}
                    aria-label={`Use color ${c}`}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <i className="fa-solid fa-check text-[10px] text-white"></i>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <CircularProgress percent={attendancePercent} />
      </div>
    </div>
  )
}

function StatCards({ appliedCount, completedCount }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-3xl bg-[#F4F4F6] p-5">
        <p className="mb-1 font-serif text-3xl font-bold text-slate-900">{appliedCount}</p>
        <p className="text-sm text-slate-400">Programs applied</p>
      </div>
      <div className="rounded-3xl bg-[#F4F4F6] p-5">
        <p className="mb-1 font-serif text-3xl font-bold text-slate-900">{completedCount}</p>
        <p className="text-sm text-slate-400">Programs completed</p>
      </div>
    </div>
  )
}

function CircularProgress({ percent, size = 48 }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(percent, 0), 100)
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEEEF1" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0F172A"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-900">
        {clamped}%
      </span>
    </div>
  )
}

function AttendanceLineChart({ attendance }) {
  const recent = [...attendance]
    .filter((r) => r.class_sessions?.session_date)
    .sort((a, b) => new Date(a.class_sessions.session_date) - new Date(b.class_sessions.session_date))
    .slice(-6)

  if (recent.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-slate-400">
        <i className="fa-solid fa-chart-line mb-2 text-2xl text-slate-200"></i>
        No attendance data yet
      </div>
    )
  }

  const width = 340
  const height = 170
  const padTop = 14
  const padBottom = 26
  const padLeft = 54
  const padRight = 10
  const plotWidth = width - padLeft - padRight

  const yLevels = [
    { label: 'Present', value: 1 },
    { label: 'Late', value: 0.5 },
    { label: 'Absent', value: 0 },
  ]

  const valueFor = (status) => (status === 'present' ? 1 : status === 'late' ? 0.5 : 0)
  const yFor = (value) => height - padBottom - value * (height - padTop - padBottom)

  const points = recent.map((r, i) => {
    const x =
      recent.length === 1
        ? padLeft + plotWidth / 2
        : padLeft + (i / (recent.length - 1)) * plotWidth
    return { x, y: yFor(valueFor(r.status)), status: r.status, date: r.class_sessions.session_date }
  })

  // Smooth the line with cubic Bezier segments (control points at each
  // segment's horizontal midpoint) instead of straight lines between points.
  function buildSmoothPath(pts) {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const midX = (p0.x + p1.x) / 2
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }

  const pathD = buildSmoothPath(points)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Y axis gridlines + labels */}
      {yLevels.map((level) => {
        const y = yFor(level.value)
        return (
          <g key={level.label}>
            <line
              x1={padLeft}
              y1={y}
              x2={width - padRight}
              y2={y}
              stroke="#EEEEF1"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft - 8}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="9"
              fill="#94A3B8"
            >
              {level.label}
            </text>
          </g>
        )
      })}

      {/* X axis line */}
      <line
        x1={padLeft}
        y1={height - padBottom}
        x2={width - padRight}
        y2={height - padBottom}
        stroke="#E2E8F0"
        strokeWidth="1"
      />

      {/* Curved attendance line */}
      <path
        d={pathD}
        fill="none"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points + x axis (date) labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="7" fill="none" stroke="#0F172A" strokeWidth="1" opacity="0.15" />
          <circle cx={p.x} cy={p.y} r="4" fill="#0F172A" />
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#94A3B8">
            {formatShortDate(p.date)}
          </text>
        </g>
      ))}
    </svg>
  )
}

function MiniCalendar({ highlightDate, scheduleRows = [], colorByProgram = {}, legendItems = [] }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const highlight = highlightDate ? new Date(highlightDate) : null

  const cells = [...Array(firstDayOfWeek).fill(null), ...Array(daysInMonth).keys()].map((d) =>
    d === null ? null : d + 1
  )

  function isToday(d) {
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  function isHighlight(d) {
    if (!highlight || Number.isNaN(highlight.getTime())) return false
    return (
      d === highlight.getDate() && month === highlight.getMonth() && year === highlight.getFullYear()
    )
  }

  function programsFor(d) {
    if (d === null) return []
    const seen = new Set()
    const list = []

    for (const row of scheduleRows) {
      const rd = new Date(row.session_date)
      if (
        Number.isNaN(rd.getTime()) ||
        rd.getDate() !== d ||
        rd.getMonth() !== month ||
        rd.getFullYear() !== year ||
        seen.has(row.program_id)
      ) {
        continue
      }
      seen.add(row.program_id)
      list.push({ id: row.program_id, color: colorByProgram[row.program_id] || '#0F172A' })
    }

    return list
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="font-semibold text-slate-300">
            {d}
          </span>
        ))}

        {cells.map((d, index) => {
          const dayPrograms = programsFor(d)
          const single = dayPrograms.length === 1
          const multi = dayPrograms.length > 1
          const todayDay = d !== null && isToday(d)

          return (
            <div key={index} className="mx-auto flex flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                  d === null
                    ? ''
                    : todayDay
                      ? 'font-bold text-white'
                      : isHighlight(d)
                        ? 'bg-teal-100 font-semibold text-teal-700'
                        : single || multi
                          ? 'font-bold text-slate-900'
                          : 'text-slate-600'
                }`}
                style={
                  todayDay
                    ? single
                      ? { backgroundColor: '#0F172A', boxShadow: `0 0 0 3px ${dayPrograms[0].color}` }
                      : { backgroundColor: '#0F172A' }
                    : single
                      ? {
                          backgroundColor: `${dayPrograms[0].color}33`,
                          boxShadow: `inset 0 0 0 2px ${dayPrograms[0].color}`,
                        }
                      : undefined
                }
              >
                {d || ''}
              </span>
              {multi && (
                <div className="flex items-center gap-0.5">
                  {dayPrograms.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    ></span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        {highlight && !Number.isNaN(highlight.getTime()) && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
            Program start date
          </p>
        )}
        {legendItems.map((item) => (
          <p key={item.id} className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
            {item.name} class days
          </p>
        ))}
      </div>
    </div>
  )
}

export default DashboardHome
