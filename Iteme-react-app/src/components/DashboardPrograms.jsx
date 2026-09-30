import { useEnrollments } from '../hooks/useEnrollments'
import { usePrograms } from '../hooks/usePrograms'
import DashboardProgramCard from './DashboardProgramCard'
import LoadingSpinner from './LoadingSpinner'

function DashboardPrograms() {
  const { enrollments, loading: enrollmentsLoading } = useEnrollments()
  const { programs, loading: programsLoading } = usePrograms()

  if (enrollmentsLoading || programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  const enrolledProgramIds = new Set(enrollments.map((e) => e.program_id))

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">Programs</p>
        <h1 className="font-serif text-3xl font-semibold text-accent md:text-4xl">
          Explore programs
        </h1>
        <p className="mt-2 text-muted">
          Browse all programs — you can apply to more than one at a time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {programs.map((program) => (
          <DashboardProgramCard
            key={program.id}
            program={program}
            isEnrolled={enrolledProgramIds.has(program.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default DashboardPrograms
