// ─────────────────────────────────────────────────────────────
// Offline Queue — persists failed mutations in localStorage
// and retries when connectivity is restored.
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabase'

const QUEUE_KEY = 'eb4_offline_queue'

export type QueuedOp = {
  id: string
  table: string
  op: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  rowId?: string
  timestamp: number
  retries: number
}

function loadQueue(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch { return [] }
}

function saveQueue(q: QueuedOp[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export function enqueue(op: Omit<QueuedOp, 'id' | 'timestamp' | 'retries'>) {
  const q = loadQueue()
  q.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now(), retries: 0 })
  saveQueue(q)
}

export function queueLength() { return loadQueue().length }

export async function flushQueue(onProgress?: (remaining: number) => void) {
  const q = loadQueue()
  if (!q.length) return
  const failed: QueuedOp[] = []
  for (const item of q) {
    try {
      if (item.op === 'insert') {
        const { error } = await supabase.from(item.table).insert(item.payload)
        if (error) throw error
      } else if (item.op === 'update' && item.rowId) {
        const { error } = await supabase.from(item.table).update(item.payload).eq('id', item.rowId)
        if (error) throw error
      } else if (item.op === 'delete' && item.rowId) {
        const { error } = await supabase.from(item.table).delete().eq('id', item.rowId)
        if (error) throw error
      }
    } catch {
      item.retries++
      if (item.retries < 5) failed.push(item)
    }
    onProgress?.(failed.length)
  }
  saveQueue(failed)
}

// Auto-flush when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue())
}
