import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logger'
import { enqueue } from '../lib/offlineQueue'
import type { Project, User } from '../types'

export function useProjects(currentUser: User | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setProjects(data ?? [])
    setLoading(false)
  }, [])

  // Initial load
  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetch() // re-fetch on any project change
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const createProject = async (data: Partial<Project>) => {
    const payload = { ...data, created_by: currentUser?.id }
    const { data: row, error } = await supabase
      .from('projects').insert(payload).select().single()
    if (error) {
      // Queue for offline retry
      enqueue({ table: 'projects', op: 'insert', payload })
      return { data: null, error: error.message }
    }
    if (currentUser) {
      logActivity(currentUser, `Created project: ${data.name}`, {
        entityType: 'project', entityId: row.id, projectId: row.id,
      })
    }
    await fetch()
    return { data: row, error: null }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) {
      enqueue({ table: 'projects', op: 'update', payload: updates, rowId: id })
      return error.message
    }
    if (currentUser) {
      logActivity(currentUser, `Updated project: ${updates.name ?? id}`, {
        entityType: 'project', entityId: id, projectId: id,
      })
    }
    await fetch()
    return null
  }

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) return error.message
    if (currentUser) {
      logActivity(currentUser, `Deleted project: ${id}`, { entityType: 'project', entityId: id })
    }
    await fetch()
    return null
  }

  return { projects, loading, error, refetch: fetch, createProject, updateProject, deleteProject }
}
