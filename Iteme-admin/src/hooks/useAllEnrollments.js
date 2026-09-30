import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { usePrograms } from './usePrograms'

// Staff-only: reads every student's enrollments (not scoped to the current
// user like the student app's hooks). Requires the "Staff can read all
// enrollments" / "...read all profiles" RLS policies — see
// supabase/migration_admin_access.sql and migration_finance.sql in the
// student app's repo.
export function useAllEnrollments() {
  const { programs, loading: programsLoading } = usePrograms()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return supabase
      .from('enrollments')
      .select(
        'id, student_id, program_id, session, status, approval_status, enrollment_type, application_fee_paid, payment_method, household_income, scholarship_reason, enrolled_at, completed_at, fee, profiles(full_name, email, phone, student_code, id_passport)'
      )
      .order('enrolled_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load enrollments:', error)
        setRows(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enrollments = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        program: programs.find((p) => p.id === row.program_id),
      })),
    [rows, programs]
  )

  return { enrollments, loading: loading || programsLoading, refresh }
}
