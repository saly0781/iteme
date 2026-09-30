import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

function ProtectedRoute({ children }) {
  const { user, profile, loading, signOut, openSignup } = useAuth()
  const [blockedBy, setBlockedBy] = useState(null)

  useEffect(() => {
    if (!loading && !user) {
      openSignup()
    }
  }, [loading, user, openSignup])

  useEffect(() => {
    if (!profile?.blocked_by) {
      setBlockedBy(null)
      return
    }
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', profile.blocked_by)
      .single()
      .then(({ data }) => setBlockedBy(data))
  }, [profile?.blocked_by])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
        <i className="fa-solid fa-lock text-3xl text-muted"></i>
        <p className="text-muted">Create an account or log in to continue.</p>
        <button
          type="button"
          onClick={openSignup}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-gray-800"
        >
          Get Started
        </button>
      </div>
    )
  }

  if (profile?.blocked_at) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 px-6 py-24 text-center">
        <i className="fa-solid fa-ban text-3xl text-red-500"></i>
        <h1 className="font-serif text-2xl font-semibold text-accent">
          Your account has been blocked
        </h1>
        <p className="max-w-md text-muted">
          {blockedBy
            ? `Blocked by ${blockedBy.full_name} (${blockedBy.role})`
            : 'Blocked by a staff member'}
          {profile.block_reason ? ` — ${profile.block_reason}` : '.'}
        </p>
        <p className="max-w-md text-sm text-muted">
          If you think this is a mistake, contact Iteme Hub staff to have it reviewed.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 rounded-full border border-black/15 px-6 py-2.5 text-sm font-medium text-accent transition-colors hover:border-black/30"
        >
          Sign out
        </button>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
