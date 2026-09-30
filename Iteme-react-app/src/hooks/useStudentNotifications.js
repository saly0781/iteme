import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Only undismissed notifications — once dismissed they drop out of the
// dashboard card entirely (staff can still see the full history in the
// admin console, which reads student_notifications without this filter).
export function useStudentNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) return

    return supabase
      .from('student_notifications')
      .select('id, type, message, sent_by, created_at, seen_at, dismissed_at, profiles!sent_by(full_name)')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Could not load notifications:', error)
        setNotifications(data || [])
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function markSeen(id) {
    await supabase.rpc('mark_notification_seen', { notification_id: id })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.seen_at ? { ...n, seen_at: new Date().toISOString() } : n))
    )
  }

  async function dismiss(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const { error } = await supabase.rpc('dismiss_notification', { notification_id: id })
    if (error) {
      console.error('Could not dismiss notification:', error)
      refresh()
    }
  }

  return { notifications, loading, refresh, markSeen, dismiss }
}
