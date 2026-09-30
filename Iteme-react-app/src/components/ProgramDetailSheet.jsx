import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { formatRWF } from '../data/programs'
import { sessionLabel, sessionIcon } from '../data/sessions'
import { usePrograms } from '../hooks/usePrograms'
import { useAuth } from '../context/AuthContext'
import { useEnrollments } from '../hooks/useEnrollments'
import BottomSheet from './BottomSheet'
import LoadingSpinner from './LoadingSpinner'

function ProgramDetailSheet() {
  const { detailProgramId, closeProgramDetail } = useAuth()

  return (
    <AnimatePresence>
      {detailProgramId && (
        <ProgramDetailContent programId={detailProgramId} onClose={closeProgramDetail} />
      )}
    </AnimatePresence>
  )
}

function ProgramDetailContent({ programId, onClose }) {
  const { requestApply } = useAuth()
  const { enrollments } = useEnrollments()
  const { programs, loading: programsLoading } = usePrograms()
  const [showEnrolledAlert, setShowEnrolledAlert] = useState(false)
  const program = programs.find((p) => p.id === programId)

  if (programsLoading) {
    return (
      <BottomSheet onClose={onClose}>
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      </BottomSheet>
    )
  }

  if (!program) return null

  const {
    name,
    description,
    image,
    fee,
    isOpen,
    startDate,
    endDate,
    nextIntakeDate,
    duration,
    level,
    format,
    rating,
    schedule,
    outcomes,
    skills,
    faculty,
  } = program

  const existingEnrollment = enrollments.find((e) => e.program_id === program.id)
  const blocked =
    existingEnrollment &&
    (existingEnrollment.approval_status === 'approved' ||
      existingEnrollment.approval_status === 'pending')

  function handleApply() {
    if (blocked) {
      setShowEnrolledAlert(true)
      return
    }
    onClose()
    requestApply(program.id)
  }

  return (
    <BottomSheet onClose={onClose} maxWidthClassName="sm:max-w-2xl">
      <div className="img-overlay -mx-6 -mt-6 mb-6 aspect-[16/9] overflow-hidden sm:-mx-8 sm:-mt-8 sm:rounded-t-3xl">
        <img alt={name} src={image} className="h-full w-full object-cover" />
      </div>

      <span
        className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          isOpen ? 'bg-accent text-white' : 'bg-black/10 text-muted'
        }`}
      >
        {isOpen ? 'Open for Applications' : 'Closed'}
      </span>

      <h1 className="mb-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">{name}</h1>

      <div className="mb-4 flex items-center gap-2">
        <StarRating score={rating.score} />
        <span className="text-sm font-semibold text-slate-900">{rating.score}</span>
        <span className="text-sm text-slate-400">({rating.count} reviews)</span>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-slate-500">{description}</p>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-2xl bg-darker p-4 sm:grid-cols-4">
        <Metric label="Level" value={level} />
        <Metric label="Duration" value={duration} />
        <Metric label="Format" value={format} />
        <Metric label="Starts" value={startDate} />
      </div>

      {!isOpen && (
        <div className="mb-6 rounded-2xl bg-darker p-4">
          <p className="text-sm font-semibold text-accent">
            <i className="fa-solid fa-calendar-days mr-2"></i>
            This intake is closed. Next intake begins {nextIntakeDate}.
          </p>
        </div>
      )}

      {outcomes.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            What you'll learn
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {outcomes.slice(0, 4).map((outcome) => (
              <div key={outcome} className="flex items-start gap-2">
                <i className="fa-solid fa-circle-check mt-0.5 text-xs text-accent"></i>
                <p className="text-sm leading-relaxed text-slate-600">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
            Skills you'll gain
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-darker px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
          Class Timetable
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(schedule).map(([sessionId, session]) => (
            <SessionRow
              key={sessionId}
              label={sessionLabel(sessionId)}
              icon={sessionIcon(sessionId)}
              session={session}
            />
          ))}
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-darker p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-sm font-bold text-white">
          {faculty.name
            .split(' ')
            .map((part) => part[0])
            .join('')}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{faculty.name}</p>
          <p className="truncate text-xs text-slate-400">{faculty.title}</p>
        </div>
      </div>

      <div className="mb-6 flex items-baseline justify-between border-t border-black/10 pt-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Tuition
        </span>
        <span className="font-serif text-2xl font-bold text-slate-900">{formatRWF(fee)}</span>
      </div>

      <div className={`inline-block w-full rounded-full ${isOpen && !blocked ? 'orbit-glow p-[2px]' : ''}`}>
        <button
          type="button"
          onClick={handleApply}
          className={`flex w-full items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-all ${
            blocked
              ? 'bg-slate-100 text-slate-500'
              : isOpen
                ? 'bg-accent text-white hover:scale-[1.02] hover:bg-gray-800'
                : 'border border-black/15 bg-white text-accent hover:border-black/30'
          }`}
        >
          {blocked
            ? existingEnrollment.approval_status === 'approved'
              ? 'Already Enrolled'
              : 'Application Pending'
            : isOpen
              ? 'Apply Now'
              : 'Apply for Next Intake'}
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </button>
      </div>

      {showEnrolledAlert &&
        existingEnrollment &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowEnrolledAlert(false)}
            />
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <i className="fa-solid fa-circle-check text-xl"></i>
              </div>
              <h3 className="mb-2 font-serif text-lg font-bold text-slate-900">
                {existingEnrollment.approval_status === 'approved'
                  ? "You're already enrolled"
                  : 'Application already pending'}
              </h3>
              <p className="mb-6 text-sm text-slate-500">
                {existingEnrollment.approval_status === 'approved'
                  ? `You're actively enrolled in ${name}. You can track it from your dashboard.`
                  : `Your application to ${name} is still pending approval — no need to apply again.`}
              </p>
              <button
                type="button"
                onClick={() => setShowEnrolledAlert(false)}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-gray-800"
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}
    </BottomSheet>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function StarRating({ score }) {
  const fullStars = Math.floor(score)
  const hasHalfStar = score - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5 text-accent">
      {Array.from({ length: fullStars }).map((_, index) => (
        <i key={`full-${index}`} className="fa-solid fa-star text-xs"></i>
      ))}
      {hasHalfStar && <i className="fa-solid fa-star-half-stroke text-xs"></i>}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <i key={`empty-${index}`} className="fa-regular fa-star text-xs"></i>
      ))}
    </div>
  )
}

function SessionRow({ label, icon, session }) {
  const { time, applied, limit } = session
  const seatsLeft = Math.max(limit - applied, 0)

  return (
    <div className="rounded-2xl bg-darker p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-accent">
          <i className={`fa-solid ${icon} text-xs`}></i>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-[11px] text-slate-400">{time}</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        {seatsLeft > 0 ? `${seatsLeft} seats remaining` : 'Full'}
      </p>
    </div>
  )
}

export default ProgramDetailSheet
