import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Lightweight count-only query (head: true returns no rows) for the red
// badge on the Applications nav item — refetches whenever the admin
// navigates, so approving/rejecting on the Applications page clears it
// without needing a realtime subscription.
export function usePendingApplicationsCount(enabled) {
  const location = useLocation()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!enabled) {
      setCount(0)
      return
    }
    return supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .then(({ count: c, error }) => {
        if (error) {
          console.error('Could not load pending applications count:', error)
          return
        }
        setCount(c || 0)
      })
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh, location.pathname])

  return count
}
