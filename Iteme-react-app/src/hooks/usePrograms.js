import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import pic2 from '../assets/pic2.jpg'

function formatDisplayDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function mapProgram(row, seatCounts, sessionsByProgram) {
  const sessions = sessionsByProgram[row.id] || []

  return {
    id: row.id,
    name: row.name,
    color: row.color || '#0F172A',
    description: row.description || '',
    image: row.image_url || pic2,
    fee: Number(row.fee) || 0,
    isOpen: row.is_open ?? true,
    startDate: formatDisplayDate(row.start_date),
    endDate: formatDisplayDate(row.end_date),
    nextIntakeDate: formatDisplayDate(row.next_intake_date),
    duration: row.duration || '',
    level: row.level || '',
    format: row.format || '',
    rating: { score: Number(row.rating_score) || 0, count: Number(row.rating_count) || 0 },
    schedule: Object.fromEntries(
      sessions.map((s) => [
        s.session,
        {
          time: s.time_label || '',
          applied: seatCounts[`${row.id}:${s.session}`] || 0,
          limit: s.seat_limit || 0,
        },
      ])
    ),
    outcomes: row.outcomes || [],
    skills: row.skills || [],
    modules: row.modules || [],
    testimonials: row.testimonials || [],
    faculty: { name: row.faculty_name || '', title: row.faculty_title || '' },
  }
}

// Live replacement for the old static data/programs.js array. Shape is kept
// identical so existing consumers barely change — only the source moved
// from a bundled file to the database.
export function usePrograms() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return Promise.all([
      supabase.from('programs').select('*').eq('active', true).order('created_at'),
      supabase.from('program_sessions').select('program_id, session, time_label, seat_limit'),
      supabase.rpc('program_seat_counts'),
    ]).then(([programsRes, sessionsRes, seatsRes]) => {
      if (programsRes.error) console.error('Could not load programs:', programsRes.error)
      if (sessionsRes.error) console.error('Could not load program sessions:', sessionsRes.error)
      if (seatsRes.error) console.error('Could not load seat counts:', seatsRes.error)

      const seatCounts = {}
      ;(seatsRes.data || []).forEach((row) => {
        seatCounts[`${row.program_id}:${row.session}`] = Number(row.applied)
      })

      const sessionsByProgram = {}
      ;(sessionsRes.data || []).forEach((row) => {
        ;(sessionsByProgram[row.program_id] ||= []).push(row)
      })

      setPrograms(
        (programsRes.data || []).map((row) => mapProgram(row, seatCounts, sessionsByProgram))
      )
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { programs, loading, refresh }
}
