import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { faq, formatRWF } from '../data/programs'
import { sessionLabel, sessionIcon } from '../data/sessions'
import { usePrograms } from '../hooks/usePrograms'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

function ProgramDetail() {
  const { id } = useParams()
  const { requestApply } = useAuth()
  const { programs, loading: programsLoading } = usePrograms()
  const program = programs.find((p) => p.id === id)
  const heroApplyRef = useRef(null)
  const [showFloatingApply, setShowFloatingApply] = useState(false)

  useEffect(() => {
    const target = heroApplyRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingApply(!entry.isIntersecting),
      { threshold: 0 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [id])

  if (programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  if (!program) {
    return (
      <section className="container mx-auto px-6 py-24 text-center md:px-12 md:py-32">
        <h1 className="mb-4 font-serif text-3xl font-semibold text-accent">
          Program not found
        </h1>
        <Link to="/programs" className="text-accent underline underline-offset-4">
          Back to Programs
        </Link>
      </section>
    )
  }

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
    modules,
    faculty,
    testimonials,
  } = program

  return (
    <>
    <section className="container mx-auto px-6 pt-12 pb-24 md:px-12 md:pt-16 md:pb-32">
      <Link
        to="/programs"
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-accent"
      >
        <i className="fa-solid fa-arrow-left text-xs"></i>
        Back to Programs
      </Link>

      {/* Hero */}
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="img-overlay aspect-[4/3] w-full self-start overflow-hidden rounded-2xl border border-black/10 md:aspect-[4/5] md:max-w-sm">
          <img alt={name} src={image} className="h-full w-full object-cover grayscale" />
        </div>

        <div>
          <span
            className={`mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              isOpen ? 'bg-accent text-white' : 'bg-black/10 text-muted'
            }`}
          >
            {isOpen ? 'Open for Applications' : 'Closed'}
          </span>

          <h1 className="mb-3 font-serif text-4xl font-semibold leading-tight text-accent md:text-5xl">
            {name}
          </h1>

          <div className="mb-5 flex items-center gap-2">
            <StarRating score={rating.score} />
            <span className="text-sm font-semibold text-accent">{rating.score}</span>
            <span className="text-sm text-muted">({rating.count} reviews)</span>
          </div>

          <p className="mb-8 text-lg leading-relaxed text-muted">{description}</p>

          {/* Metrics */}
          <div className="mb-8 grid grid-cols-2 gap-6 border-y border-black/10 py-6 sm:grid-cols-4">
            <Metric label="Level" value={level} />
            <Metric label="Duration" value={duration} />
            <Metric label="Format" value={format} />
            <Metric label="Starts" value={startDate} />
          </div>

          {!isOpen && (
            <div className="mb-8 rounded-xl border border-black/10 bg-darker p-5">
              <p className="text-sm font-semibold text-accent">
                <i className="fa-solid fa-calendar-days mr-2"></i>
                This intake is closed. Next intake begins {nextIntakeDate}.
              </p>
            </div>
          )}

          <div className="mb-8 flex items-baseline justify-between border-b border-black/10 pb-6">
            <span className="text-sm font-semibold uppercase tracking-wide text-muted">
              Tuition
            </span>
            <span className="font-serif text-2xl font-bold text-accent">
              {formatRWF(fee)}
            </span>
          </div>

          <div
            className={`inline-block w-full rounded-full md:w-auto ${
              isOpen ? 'orbit-glow p-[2px]' : ''
            }`}
          >
            <button
              type="button"
              ref={heroApplyRef}
              onClick={() => requestApply(program.id)}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-all md:w-auto ${
                isOpen
                  ? 'bg-accent text-white hover:scale-[1.02] hover:bg-gray-800'
                  : 'border border-black/15 bg-white text-accent hover:border-black/30'
              }`}
            >
              {isOpen ? 'Apply Now' : 'Apply for Next Intake'}
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      {/* What you'll learn */}
      {outcomes.length > 0 && (
        <div className="mt-20">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
            What you'll learn
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {outcomes.map((outcome) => (
              <div key={outcome} className="flex items-start gap-3">
                <i className="fa-solid fa-circle-check mt-1 text-accent"></i>
                <p className="text-sm leading-relaxed text-muted">{outcome}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
            Skills you'll gain
          </h2>

          <div className="flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-black/10 bg-darker px-4 py-2 text-sm font-medium text-accent"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timetable */}
      <div className="mt-16">
        <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
          Class Timetable
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Object.entries(schedule).map(([sessionId, session]) => (
            <SessionCard
              key={sessionId}
              label={sessionLabel(sessionId)}
              icon={sessionIcon(sessionId)}
              session={session}
            />
          ))}
        </div>
      </div>

      {/* Curriculum */}
      {modules.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
            Curriculum — {modules.length} modules
          </h2>

          <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-darker">
            {modules.map((module, index) => (
              <div key={module.title} className="flex items-start gap-4 p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-accent">
                  {index + 1}
                </span>

                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-accent">{module.title}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {module.duration}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{module.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Faculty */}
      <div className="mt-16">
        <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
          Meet your instructor
        </h2>

        <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-darker p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-lg font-bold text-white">
            {faculty.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </div>

          <div>
            <p className="font-serif text-lg font-semibold text-accent">{faculty.name}</p>
            <p className="text-sm text-muted">{faculty.title}</p>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
            What students say
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl border border-black/10 bg-darker p-6"
              >
                <i className="fa-solid fa-quote-left mb-3 text-accent/40"></i>
                <p className="mb-4 text-sm leading-relaxed text-muted">
                  "{testimonial.quote}"
                </p>
                <p className="text-sm font-semibold text-accent">{testimonial.name}</p>
                <p className="text-xs text-muted">{testimonial.cohort}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="mb-6 font-serif text-2xl font-semibold text-accent">
          Frequently asked questions
        </h2>

        <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-darker">
          {faq.map((item) => (
            <details key={item.question} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-accent">
                {item.question}
                <i className="fa-solid fa-chevron-down text-xs text-muted transition-transform group-open:rotate-180"></i>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-black/10 bg-darker p-10 text-center">
        <h2 className="font-serif text-2xl font-semibold text-accent">
          Ready to start {name}?
        </h2>

        <div className={`inline-block rounded-full ${isOpen ? 'orbit-glow p-[2px]' : ''}`}>
          <button
            type="button"
            onClick={() => requestApply(program.id)}
            className={`flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-medium transition-all ${
              isOpen
                ? 'bg-accent text-white hover:scale-[1.02] hover:bg-gray-800'
                : 'border border-black/15 bg-white text-accent hover:border-black/30'
            }`}
          >
            {isOpen ? 'Apply Now' : 'Apply for Next Intake'}
            <i className="fa-solid fa-arrow-right text-xs"></i>
          </button>
        </div>
      </div>
    </section>

    {createPortal(
      <AnimatePresence>
        {showFloatingApply && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className={`inline-block rounded-full ${isOpen ? 'orbit-glow p-[2px]' : ''}`}>
              <button
                type="button"
                onClick={() => requestApply(program.id)}
                className={`flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-medium shadow-xl transition-all ${
                  isOpen
                    ? 'bg-accent text-white hover:bg-gray-800'
                    : 'border border-black/15 bg-white text-accent hover:border-black/30'
                }`}
              >
                {isOpen ? 'Apply Now' : 'Apply for Next Intake'}
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-semibold text-accent">{value}</p>
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

function SessionCard({ label, icon, session }) {
  const { time, applied, limit } = session
  const percent = Math.min(Math.round((applied / limit) * 100), 100)
  const seatsLeft = Math.max(limit - applied, 0)

  return (
    <div className="rounded-2xl border border-black/10 bg-darker p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent">
          <i className={`fa-solid ${icon}`}></i>
        </div>

        <div>
          <p className="font-serif text-lg font-semibold text-accent">{label}</p>
          <p className="text-xs text-muted">{time}</p>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
        <span>{applied} enrolled</span>
        <span>{limit} limit</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted">
        {seatsLeft > 0 ? `${seatsLeft} seats remaining` : 'Full'}
      </p>
    </div>
  )
}

export default ProgramDetail
