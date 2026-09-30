import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePrograms } from './usePrograms'

export function useEnrollment() {
  const { user } = useAuth()
  const { programs, loading: programsLoading } = usePrograms()
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) return

    return supabase
      .from('enrollments')
      .select(
        'program_id, session, status, approval_status, enrollment_type, application_fee_paid, color, enrolled_at'
      )
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Could not load enrollment:', error)
        setEnrollment(data)
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const program = enrollment ? programs.find((p) => p.id === enrollment.program_id) : null
  const color = enrollment?.color || program?.color || '#0F172A'

  return { enrollment, program, color, loading: loading || programsLoading, refresh }
}
