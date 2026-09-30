import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { usePrograms } from './usePrograms'

// RLS ("Students can read their own payments") already scopes this to the
// current user's own payments — no student_id filter needed client-side.
export function usePayments() {
  const { user } = useAuth()
  const { programs, loading: programsLoading } = usePrograms()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) return

    return supabase
      .from('payments')
      .select('id, amount, method, note, paid_at, enrollment_id, enrollments(program_id)')
      .order('paid_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load payments:', error)
        setRows(data || [])
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const payments = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        program: programs.find((p) => p.id === row.enrollments?.program_id),
      })),
    [rows, programs]
  )

  return { payments, loading: loading || programsLoading, refresh }
}
