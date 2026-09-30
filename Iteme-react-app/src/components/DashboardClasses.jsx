import { Link } from 'react-router-dom'
import { useEnrollment } from '../hooks/useEnrollment'
import LoadingSpinner from './LoadingSpinner'

function DashboardClasses() {
  const { enrollment, program, loading } = useEnrollment()

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">E-Classes</p>
        <h1 className="font-serif text-3xl font-semibold text-accent md:text-4xl">
          {program ? `${program.name} curriculum` : 'Your classes'}
        </h1>
      </div>

      {!enrollment || !program ? (
        <div className="rounded-2xl border border-black/10 bg-darker p-10 text-center">
          <p className="mb-4 text-muted">
            You're not enrolled in a program yet. Apply to one to unlock its classes here.
          </p>
          <Link
            to="/dashboard/programs"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-gray-800"
          >
            Browse Programs
          </Link>
        </div>
      ) : (
        <>
          {enrollment.approval_status !== 'approved' && (
            <div className="mb-6 rounded-2xl border border-black/10 bg-darker p-5">
              <p className="text-sm font-semibold text-accent">
                <i className="fa-solid fa-lock mr-2"></i>
                Classes unlock once your application is approved.
              </p>
              <p className="mt-1 text-sm text-muted">
                You can preview the curriculum below in the meantime.
              </p>
            </div>
          )}

          <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-darker">
            {program.modules.map((module, index) => {
              const locked = enrollment.approval_status !== 'approved'

              return (
                <div key={module.title} className="flex items-start gap-4 p-6">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      locked ? 'bg-black/5 text-muted' : 'bg-accent text-white'
                    }`}
                  >
                    {locked ? <i className="fa-solid fa-lock text-xs"></i> : index + 1}
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

                  {!locked && (
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold text-accent shadow-sm transition-colors hover:bg-black/5"
                    >
                      Open
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardClasses
