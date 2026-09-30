import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRWF, getTotals } from '../data/programs'
import { usePrograms } from '../hooks/usePrograms'
import LoadingSpinner from './LoadingSpinner'

function ProgramsPage() {
  const [query, setQuery] = useState('')
  const { programs, loading } = usePrograms()

  const filteredPrograms = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return programs

    return programs.filter(
      (program) =>
        program.name.toLowerCase().includes(q) ||
        program.description.toLowerCase().includes(q)
    )
  }, [query, programs])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <section className="container mx-auto px-6 pt-12 pb-24 md:px-12 md:pt-16 md:pb-32">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-wide text-accent">
          Programs
        </p>

        <h1 className="mb-6 font-serif text-4xl font-semibold leading-tight text-accent md:text-6xl">
          Choose your path
        </h1>

        <p className="text-lg leading-relaxed text-muted">
          Explore our core disciplines. Some programs are open for the
          current intake — others are full but accepting applications for
          the next one.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-lg">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs..."
            className="peer w-full rounded-full border border-black/10 bg-darker py-4 pl-12 pr-12 text-sm text-black outline-none transition-all duration-300 placeholder:text-muted focus:border-accent/40 focus:bg-white focus:shadow-xl focus:shadow-black/5"
          />

          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm text-muted transition-colors peer-focus:text-accent"></i>

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/10 text-muted transition-colors hover:bg-black hover:text-white"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>

        {query && (
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
            {filteredPrograms.length} {filteredPrograms.length === 1 ? 'program' : 'programs'} found
          </p>
        )}
      </div>

      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {filteredPrograms.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <i className="fa-solid fa-magnifying-glass text-2xl text-muted/50"></i>
          <p className="text-muted">
            No programs match "{query}". Try a different search.
          </p>
        </div>
      )}
    </section>
  )
}

function ProgramCard({ program }) {
  const { id, name, description, image, fee, isOpen, nextIntakeDate } = program
  const { applied, limit } = getTotals(program)
  const percentFilled = Math.min(Math.round((applied / limit) * 100), 100)
  const seatsLeft = Math.max(limit - applied, 0)

  return (
    <Link
      to={`/programs/${id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-darker transition-colors hover:border-black/30"
    >
      <div className="img-overlay relative aspect-[4/3] overflow-hidden">
        <img
          alt={name}
          src={image}
          className="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105"
        />

        <span
          className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            isOpen ? 'bg-white text-accent' : 'bg-black/75 text-white'
          }`}
        >
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-2 font-serif text-2xl font-semibold text-accent">
          {name}
        </h3>

        <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">
          {description}
        </p>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
            <span>{applied} applied</span>
            <span>{limit} seats needed</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${percentFilled}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-muted">
            {isOpen
              ? seatsLeft > 0
                ? `${seatsLeft} seats remaining`
                : 'Final seats — apply today'
              : `Intake full — next cohort starts ${nextIntakeDate}`}
          </p>
        </div>

        <div className="mb-5 flex items-baseline justify-between border-t border-black/10 pt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Tuition
          </span>

          <span className="font-serif text-lg font-bold text-accent">
            {formatRWF(fee)}
          </span>
        </div>

        <span
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
            isOpen
              ? 'bg-accent text-white group-hover:bg-gray-800'
              : 'border border-black/15 bg-white text-accent group-hover:border-black/30'
          }`}
        >
          View Program Details
          <i className="fa-solid fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i>
        </span>
      </div>
    </Link>
  )
}

export default ProgramsPage
