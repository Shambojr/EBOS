// ════════════════════════════════════════════════════════════
// EBOS Phase 2.0 – useWorkspace hook
// Tasks, Reminders, Activity, Notifications
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  assigned_by?: string
  priority: 'Critical' | 'High' | 'Normal' | 'Low'
  category: string
  project_id?: string
  due_date?: string
  status: 'Open' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled'
  completed_at?: string
  created_at: string
  updated_at: string
  // joined
  assignee?: { id: string; full_name: string; role: string } | null
  creator?: { id: string; full_name: string; role: string } | null
  project?: { id: string; name: string } | null
}

export interface Reminder {
  id: string
  title: string
  description?: string
  assigned_to?: string
  created_by?: string
  category: string
  priority: 'Critical' | 'High' | 'Normal' | 'Low'
  due_date: string
  repeat_type: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'
  is_complete: boolean
  completed_at?: string
  escalated: boolean
  project_id?: string
  created_at: string
  // joined
  assignee?: { id: string; full_name: string } | null
  creator?: { id: string; full_name: string } | null
  project?: { id: string; name: string } | null
}

export const TASK_CATEGORIES  = ['General','Finance','Site','Admin','Follow-up','Client','Vendor']
export const REMINDER_CATS    = ['General','GST','TDS','PF','ESI','Salary','Loan EMI','Vendor Payment','Insurance','Client Follow-up','Other']
export const PRIORITIES       = ['Critical','High','Normal','Low'] as const
export const TASK_STATUSES    = ['Open','In Progress','Waiting','Completed','Cancelled'] as const

export function useWorkspace(currentUser: User | null) {
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [activity,  setActivity]  = useState<any[]>([])
  const [teamUsers, setTeamUsers] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchAll = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)

    // Fetch team users for assignment dropdowns
    const { data: usersData } = await supabase.from('users').select('id,full_name,role').eq('is_active', true).order('full_name')
    if (usersData) setTeamUsers(usersData)

    const [t, r, a] = await Promise.all([
      supabase.from('tasks')
        .select('*, assignee:assigned_to(id,full_name,role), creator:assigned_by(id,full_name,role), project:project_id(id,name)')
        .or(`assigned_to.eq.${currentUser.id},assigned_by.eq.${currentUser.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('reminders')
        .select('*, assignee:assigned_to(id,full_name), creator:created_by(id,full_name), project:project_id(id,name)')
        .or(`assigned_to.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
        .order('due_date', { ascending: true }),
      supabase.from('activity_log')
        .select('*, user:user_id(id,full_name,role)')
        .order('created_at', { ascending: false })
        .limit(80),
    ])

    setTasks((t.data ?? []) as Task[])
    setReminders((r.data ?? []) as Reminder[])
    setActivity(a.data ?? [])
    setLoading(false)

    // Smart escalation: check overdue reminders and notify directors
    await escalateOverdueReminders(currentUser, r.data ?? [])
  }, [currentUser])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime for tasks
  useEffect(() => {
    if (!currentUser) return
    const ch = supabase.channel('workspace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUser, fetchAll])

  // ── TASK ACTIONS ──────────────────────────────────────────
  const addTask = async (data: Partial<Task>) => {
    const { error } = await supabase.from('tasks').insert({
      ...data,
      assigned_by: currentUser?.id,
      status: 'Open',
    })
    if (!error) {
      await fetchAll()
      // Notify assignee
      if (data.assigned_to && data.assigned_to !== currentUser?.id) {
        await supabase.from('notifications').insert({
          user_id: data.assigned_to,
          title: 'Task Assigned',
          message: `${currentUser?.full_name} assigned you: "${data.title}"`,
          type: 'task',
          is_read: false,
        })
      }
    }
    return error?.message ?? null
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    if (updates.status === 'Completed') payload.completed_at = new Date().toISOString()
    const { error } = await supabase.from('tasks').update(payload).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  // ── REMINDER ACTIONS ──────────────────────────────────────
  const addReminder = async (data: Partial<Reminder>) => {
    const { error } = await supabase.from('reminders').insert({
      ...data,
      created_by: currentUser?.id,
      is_complete: false,
      escalated: false,
    })
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const { error } = await supabase.from('reminders').update(updates).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  const completeReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').update({
      is_complete: true,
      completed_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  // ── DERIVED STATE ─────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]

  const myTasks        = tasks.filter(t => t.assigned_to === currentUser?.id && t.status !== 'Completed' && t.status !== 'Cancelled')
  const overdueTasks   = myTasks.filter(t => t.due_date && t.due_date < today)
  const todayReminders = reminders.filter(r => !r.is_complete && r.due_date === today)
  const overdueReminders = reminders.filter(r => !r.is_complete && r.due_date < today)
  const upcomingReminders = reminders.filter(r => !r.is_complete && r.due_date > today)

  return {
    tasks, reminders, activity, teamUsers, loading,
    myTasks, overdueTasks, todayReminders, overdueReminders, upcomingReminders,
    refetch: fetchAll,
    addTask, updateTask, deleteTask,
    addReminder, updateReminder, completeReminder, deleteReminder,
  }
}

// ── Smart Escalation ──────────────────────────────────────────
// Runs silently on every workspace open.
// If a reminder is >1 day overdue and not escalated, creates a director notification.
async function escalateOverdueReminders(user: User, reminders: any[]) {
  const today = new Date()
  const toEscalate = reminders.filter(r => {
    if (r.is_complete || r.escalated) return false
    const due = new Date(r.due_date + 'T00:00:00')
    const daysOver = Math.floor((today.getTime() - due.getTime()) / 864e5)
    return daysOver >= 1
  })
  if (!toEscalate.length) return

  // Get director IDs
  const { data: directors } = await supabase
    .from('users').select('id').eq('role', 'director')

  if (!directors?.length) return

  for (const r of toEscalate) {
    // Mark as escalated so we don't repeat
    await supabase.from('reminders').update({ escalated: true }).eq('id', r.id)

    // Notify all directors
    const notifs = directors.map((d: any) => ({
      user_id: d.id,
      title: 'Overdue Reminder',
      message: `"${r.title}" was due ${r.due_date} and has not been completed.`,
      type: 'reminder',
      is_read: false,
    }))
    await supabase.from('notifications').insert(notifs)
  }
}
