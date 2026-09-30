import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Live replacement for the old static data/programs.js array. Shape is kept
// identical (id/name/color/image/fee/duration/schedule/faculty) so existing
// consumers barely change — only the source moved from a bundled file to
// the database.
export function usePrograms() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return Promise.all([
      supabase.from('programs').select('*').eq('active', true).order('created_at'),
      supabase.from('program_sessions').select('program_id, session, time_label, seat_limit'),
    ]).then(([programsRes, sessionsRes]) => {
      if (programsRes.error) console.error('Could not load programs:', programsRes.error)
      if (sessionsRes.error) console.error('Could not load program sessions:', sessionsRes.error)

      const sessionsByProgram = {}
      ;(sessionsRes.data || []).forEach((row) => {
        ;(sessionsByProgram[row.program_id] ||= []).push(row)
      })

      setPrograms((programsRes.data || []).map((row) => mapProgram(row, sessionsByProgram)))
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { programs, loading, refresh }
}

export function mapProgram(row, sessionsByProgram = {}) {
  const sessions = sessionsByProgram[row.id] || []

  return {
    id: row.id,
    name: row.name,
    color: row.color || '#0b0b0b',
    image: row.image_url || null,
    fee: Number(row.fee) || 0,
    duration: row.duration || '',
    description: row.description || '',
    level: row.level || '',
    format: row.format || '',
    isOpen: row.is_open,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    nextIntakeDate: row.next_intake_date || '',
    schedule: Object.fromEntries(
      sessions.map((s) => [s.session, { time: s.time_label || '', limit: s.seat_limit || 0 }])
    ),
    faculty: { name: row.faculty_name || '', title: row.faculty_title || '' },
    outcomes: row.outcomes || [],
    skills: row.skills || [],
    modules: row.modules || [],
    testimonials: row.testimonials || [],
    rating: { score: row.rating_score, count: row.rating_count },
  }
}
