// ════════════════════════════════════════════════════════════
// EBOS Phase 2 — useMessages hook
// Direct messages between users + one chat thread per project
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

export interface ChatUser {
  id: string
  full_name: string
  role: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
  sender?: ChatUser | null
}

export interface Conversation {
  id: string
  type: 'direct' | 'project'
  project_id?: string | null
  title?: string | null
  last_message_at: string
  otherUser?: ChatUser | null
  projectName?: string | null
  lastMessage?: ChatMessage | null
  unreadCount: number
}

const EPOCH = '1970-01-01T00:00:00Z'

export function useMessages(currentUser: User | null) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [teamUsers, setTeamUsers]         = useState<ChatUser[]>([])
  const [loading, setLoading]             = useState(true)

  const [activeId, setActiveId]     = useState<string | null>(null)
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  // ── Fetch conversation list (with last message + unread count) ──
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)

    const { data: usersData } = await supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name')
    setTeamUsers((usersData ?? []) as ChatUser[])

    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUser.id)

    const convIds = (myParts ?? []).map(p => p.conversation_id)
    if (!convIds.length) { setConversations([]); setLoading(false); return }

    const { data: convs } = await supabase
      .from('conversations')
      .select('*, project:project_id(id,name)')
      .in('id', convIds)
      .order('last_message_at', { ascending: false })

    const list = convs ?? []
    const directIds = list.filter(c => c.type === 'direct').map(c => c.id)

    let otherByConv: Record<string, ChatUser> = {}
    if (directIds.length) {
      const { data: others } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user:user_id(id,full_name,role)')
        .in('conversation_id', directIds)
        .neq('user_id', currentUser.id)
      ;(others ?? []).forEach((o: any) => { otherByConv[o.conversation_id] = o.user })
    }

    const enriched = await Promise.all(list.map(async (c: any) => {
      const lastReadAt = myParts?.find(p => p.conversation_id === c.id)?.last_read_at ?? EPOCH
      const [lastMsgRes, unreadRes] = await Promise.all([
        supabase.from('messages').select('*, sender:sender_id(id,full_name)').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', c.id).neq('sender_id', currentUser.id).gt('created_at', lastReadAt),
      ])
      const conv: Conversation = {
        id: c.id,
        type: c.type,
        project_id: c.project_id,
        title: c.title,
        last_message_at: c.last_message_at,
        otherUser: c.type === 'direct' ? (otherByConv[c.id] ?? null) : null,
        projectName: c.type === 'project' ? (c.project?.name ?? c.title ?? 'Project chat') : null,
        lastMessage: lastMsgRes.data?.[0] ?? null,
        unreadCount: unreadRes.count ?? 0,
      }
      return conv
    }))

    enriched.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
    setConversations(enriched)
    setLoading(false)
  }, [currentUser])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // ── Realtime: new messages / new participant rows ──
  useEffect(() => {
    if (!currentUser) return
    const ch = supabase.channel(`messages-${currentUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const row = payload.new as ChatMessage
        if (row.conversation_id === activeIdRef.current) {
          setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row])
          markRead(row.conversation_id)
        }
        fetchConversations()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_participants' }, () => fetchConversations())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, fetchConversations])

  // ── Mark a conversation read ──
  const markRead = async (conversationId: string) => {
    if (!currentUser) return
    await supabase.from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId).eq('user_id', currentUser.id)
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c))
  }

  // ── Open a thread ──
  const openConversation = async (conversationId: string) => {
    setActiveId(conversationId)
    setMsgLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id,full_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as ChatMessage[])
    setMsgLoading(false)
    await markRead(conversationId)
  }

  const closeConversation = () => { setActiveId(null); setMessages([]) }

  // ── Find or create a direct conversation with another user ──
  const startDirect = async (otherUserId: string): Promise<string | null> => {
    if (!currentUser) return null

    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id, conversation:conversation_id(type)')
      .eq('user_id', currentUser.id)
    const myDirectIds = (myConvs ?? []).filter((c: any) => c.conversation?.type === 'direct').map((c: any) => c.conversation_id)

    if (myDirectIds.length) {
      const { data: match } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', myDirectIds)
        .limit(1)
      if (match?.length) return match[0].conversation_id
    }

    const { data: newConv, error } = await supabase
      .from('conversations').insert({ type: 'direct', created_by: currentUser.id }).select().single()
    if (error || !newConv) return null

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: currentUser.id },
      { conversation_id: newConv.id, user_id: otherUserId },
    ])
    await fetchConversations()
    return newConv.id
  }

  // ── Find or create the chat thread for a project ──
  // Every active team member is a participant — EBOS doesn't track
  // granular per-project membership, so project threads are company-wide.
  const openProjectThread = async (projectId: string): Promise<string | null> => {
    if (!currentUser) return null

    const { data: existing } = await supabase
      .from('conversations').select('id').eq('project_id', projectId).eq('type', 'project').maybeSingle()

    let convId = existing?.id as string | undefined

    const { data: activeUsers } = await supabase.from('users').select('id').eq('is_active', true)
    const allIds = (activeUsers ?? []).map((u: any) => u.id)

    if (!convId) {
      const { data: newConv, error } = await supabase
        .from('conversations').insert({ type: 'project', project_id: projectId, created_by: currentUser.id }).select().single()
      if (error || !newConv) return null
      convId = newConv.id
      if (allIds.length) {
        await supabase.from('conversation_participants').insert(allIds.map(id => ({ conversation_id: convId, user_id: id })))
      }
    } else {
      // Sync in any team members added since the thread was created
      const { data: existingParts } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', convId)
      const have = new Set((existingParts ?? []).map((p: any) => p.user_id))
      const missing = allIds.filter(id => !have.has(id))
      if (missing.length) {
        await supabase.from('conversation_participants').insert(missing.map(id => ({ conversation_id: convId, user_id: id })))
      }
    }

    await fetchConversations()
    return convId ?? null
  }

  // ── Send a message ──
  const sendMessage = async (conversationId: string, body: string) => {
    if (!currentUser || !body.trim()) return null
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: currentUser.id, body: body.trim() })
      .select('*, sender:sender_id(id,full_name)').single()
    if (!error && data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as ChatMessage])
      fetchConversations()
    }
    return error?.message ?? null
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return {
    conversations, teamUsers, loading, totalUnread,
    activeId, messages, msgLoading,
    openConversation, closeConversation, startDirect, openProjectThread, sendMessage,
    refetch: fetchConversations,
  }
}
