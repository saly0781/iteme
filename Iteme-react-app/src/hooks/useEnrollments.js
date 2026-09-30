import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePrograms } from './usePrograms'

export function useEnrollments() {
  const { user } = useAuth()
  const { programs, loading: programsLoading } = usePrograms()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) return

    return supabase
      .from('enrollments')
      .select(
        'id, program_id, session, status, approval_status, enrollment_type, application_fee_paid, color, enrolled_at'
      )
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load enrollments:', error)
        setRows(data || [])
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const allEnrollments = useMemo(
    () =>
      rows.map((row) => {
        const program = programs.find((p) => p.id === row.program_id)
        return { ...row, program, color: row.color || program?.color || '#0F172A' }
      }),
    [rows, programs]
  )

  const enrollments = useMemo(
    () => allEnrollments.filter((e) => e.status === 'active'),
    [allEnrollments]
  )

  return { enrollments, allEnrollments, loading: loading || programsLoading, refresh }
}
