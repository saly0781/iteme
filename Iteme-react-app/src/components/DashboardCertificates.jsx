import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePrograms } from '../hooks/usePrograms'
import LoadingSpinner from './LoadingSpinner'

function DashboardCertificates() {
  const { user } = useAuth()
  const { programs, loading: programsLoading } = usePrograms()
  const [completed, setCompleted] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    supabase
      .from('enrollments')
      .select('program_id, enrolled_at')
      .eq('student_id', user.id)
      .eq('status', 'completed')
      .then(({ data }) => {
        setCompleted(data || [])
        setLoading(false)
      })
  }, [user])

  if (loading || programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-wide text-accent">
          Certificates
        </p>
        <h1 className="font-serif text-3xl font-semibold text-accent md:text-4xl">
          Your certificates
        </h1>
      </div>

      {completed.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-darker p-10 text-center">
          <i className="fa-solid fa-award mb-4 text-3xl text-muted"></i>
          <p className="mb-4 text-muted">
            You don't have any certificates yet. They'll appear here once you complete a
            program.
          </p>
          <Link
            to="/dashboard/programs"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-gray-800"
          >
            Browse Programs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {completed.map((record) => {
            const program = programs.find((p) => p.id === record.program_id)
            if (!program) return null

            return (
              <div
                key={program.id}
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-darker p-6"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <i className="fa-solid fa-award text-xl"></i>
                </div>

                <div className="flex-1">
                  <p className="font-serif text-lg font-semibold text-accent">{program.name}</p>
                  <p className="text-xs text-muted">Certificate of Completion</p>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:border-black/30"
                >
                  Download
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DashboardCertificates
