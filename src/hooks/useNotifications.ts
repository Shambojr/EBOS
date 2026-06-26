import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Notification } from '../types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)

  const fetch = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    const notifs = (data ?? []) as Notification[]
    setNotifications(notifs)
    setUnreadCount(notifs.filter(n => !n.is_read).length)
  }

  useEffect(() => { fetch() }, [userId])

  // Realtime: new notifications for this user
  useEffect(() => {
    if (!userId) return
    const ch = supabase.channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => fetch())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    if (!userId) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetch }
}
