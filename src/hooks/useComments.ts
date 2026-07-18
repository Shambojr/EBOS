// ════════════════════════════════════════════════════════════
// EBOS — useComments hook
// Polymorphic comments for tasks, logs, milestones, expenses
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Comment {
  id:          string
  entity_type: string
  entity_id:   string
  body:        string
  created_by:  string
  mentions:    string[]
  created_at:  string
  author?:     { id: string; full_name: string; role: string } | null
}

export function useComments(entityType: string, entityId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading,  setLoading]  = useState(false)

  const fetch = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, author:created_by(id, full_name, role)')
      .eq('entity_type', entityType)
      .eq('entity_id',   entityId)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
    setLoading(false)
  }, [entityType, entityId])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    if (!entityId) return
    const ch = supabase.channel(`comments-${entityType}-${entityId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'comments',
        filter: `entity_id=eq.${entityId}`,
      }, fetch)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [entityType, entityId, fetch])

  const addComment = async (
    body:      string,
    createdBy: string,
    mentions:  string[] = [],
    teamUsers: any[]    = [],
  ): Promise<string | null> => {
    const { error } = await supabase.from('comments').insert({
      entity_type: entityType,
      entity_id:   entityId,
      body,
      created_by:  createdBy,
      mentions,
    })
    if (error) return error.message

    // Notify mentioned users
    if (mentions.length > 0) {
      const author = teamUsers.find((u: any) => u.id === createdBy)
      const notifs = mentions.map(uid => ({
        user_id:  uid,
        title:    'You were mentioned',
        message:  `${author?.full_name || 'Someone'} mentioned you: "${body.slice(0, 80)}"`,
        type:     'mention',
        is_read:  false,
      }))
      await supabase.from('notifications').insert(notifs)
    }

    await fetch()
    return null
  }

  const deleteComment = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (!error) await fetch()
    return error?.message ?? null
  }

  return { comments, loading, addComment, deleteComment, refresh: fetch }
}
