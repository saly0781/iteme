import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Admin-only feed of staff actions worth overseeing (currently just
// student blocks/unblocks — see block_student()/unblock_student() in
// migration_student_blocking.sql, which insert here whenever a
// non-admin staff member triggers one).
export function useNotifications(enabled) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(enabled)

  const refresh = useCallback(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    return supabase
      .from('notifications')
      .select('id, type, message, created_at, read')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('Could not load notifications:', error)
        setNotifications(data || [])
        setLoading(false)
      })
  }, [enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    if (error) console.error('Could not mark notifications read:', error)
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading, refresh, markAllRead }
}
