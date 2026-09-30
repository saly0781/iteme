import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

function ProtectedRoute({ children }) {
  const { user, isStaff, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <i className="fa-solid fa-lock text-3xl text-muted"></i>
        <div>
          <h1 className="mb-2 font-serif text-xl font-semibold text-accent">
            This account isn't staff
          </h1>
          <p className="text-sm text-muted">
            The Iteme Hub staff console is only available to teacher and admin accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:scale-105 hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
