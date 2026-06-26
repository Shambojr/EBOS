import { supabase } from './supabase'
import type { User } from '../types'

export async function logActivity(
  user: User,
  action: string,
  opts?: {
    entityType?: string
    entityId?: string
    projectId?: string
    details?: Record<string, unknown>
  }
) {
  try {
    await supabase.from('activity_log').insert({
      user_id: user.id,
      user_name: user.full_name,
      user_role: user.role,
      action,
      entity_type: opts?.entityType,
      entity_id: opts?.entityId,
      project_id: opts?.projectId,
      details: opts?.details ?? {},
      device: navigator.userAgent.slice(0, 200),
    })
  } catch {
    // Never throw — logging should never break the UI
  }
}

export async function notifyUsers(
  userIds: string[],
  type: string,
  title: string,
  message: string,
  projectId?: string
) {
  if (!userIds.length) return
  try {
    await supabase.from('notifications').insert(
      userIds.map(uid => ({ user_id: uid, type, title, message, project_id: projectId }))
    )
  } catch { /* silent */ }
}
