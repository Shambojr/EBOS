import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logger'
import type {
  Milestone, DailyLog, Material, Expense,
  BOQItem, Document, Photo, User
} from '../types'

export function useProjectData(projectId: string, currentUser: User | null) {
  const [milestones, setMilestones]   = useState<Milestone[]>([])
  const [logs, setLogs]               = useState<DailyLog[]>([])
  const [materials, setMaterials]     = useState<Material[]>([])
  const [expenses, setExpenses]       = useState<Expense[]>([])
  const [boq, setBOQ]                 = useState<BOQItem[]>([])
  const [documents, setDocuments]     = useState<Document[]>([])
  const [photos, setPhotos]           = useState<Photo[]>([])
  const [loading, setLoading]         = useState(true)

  const fetchAll = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const [ms, ls, mats, exps, bq, docs, phs] = await Promise.all([
      supabase.from('milestones').select('*, assignee:assignee_id(*)').eq('project_id', projectId).order('due_date'),
      supabase.from('daily_logs').select('*, logger:logged_by(*)').eq('project_id', projectId).order('log_date', { ascending: false }),
      supabase.from('materials').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*, payer:paid_by(*)').eq('project_id', projectId).order('expense_date', { ascending: false }),
      supabase.from('boq').select('*').eq('project_id', projectId).order('item_number'),
      supabase.from('documents').select('*, uploader:uploaded_by(*)').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('photos').select('*, uploader:uploaded_by(*)').eq('project_id', projectId).order('created_at', { ascending: false }),
    ])
    setMilestones((ms.data ?? []) as Milestone[])
    setLogs((ls.data ?? []) as DailyLog[])
    setMaterials((mats.data ?? []) as Material[])
    setExpenses((exps.data ?? []) as Expense[])
    setBOQ((bq.data ?? []) as BOQItem[])
    // Generate public URLs for documents with storage_path
    const docsWithUrls = (docs.data ?? []).map((d: any) => ({
      ...d,
      public_url: d.storage_path
        ? supabase.storage.from('documents').getPublicUrl(d.storage_path).data.publicUrl
        : null,
    }))
    setDocuments(docsWithUrls as Document[])
    // Generate public URLs for photos
    const photosWithUrls = (phs.data ?? []).map((p: any) => ({
      ...p,
      public_url: supabase.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl,
    }))
    setPhotos(photosWithUrls as Photo[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime for milestones and logs (most frequently updated)
  useEffect(() => {
    const ch = supabase.channel(`project-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs', filter: `project_id=eq.${projectId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials', filter: `project_id=eq.${projectId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `project_id=eq.${projectId}` }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [projectId, fetchAll])

  // ── MILESTONE ACTIONS ──────────────────────────────────────
  const addMilestone = async (data: Partial<Milestone>) => {
    const { error } = await supabase.from('milestones').insert({ ...data, project_id: projectId, created_by: currentUser?.id })
    if (!error && currentUser) logActivity(currentUser, `Added milestone: ${data.name}`, { entityType: 'milestone', projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
    const { error } = await supabase.from('milestones').update(updates).eq('id', id)
    if (!error && currentUser) logActivity(currentUser, `Updated milestone: ${updates.name ?? id}`, { entityType: 'milestone', entityId: id, projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from('milestones').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  const toggleMilestone = async (id: string, done: boolean) => {
    const updates: Partial<Milestone> = { done, pct: done ? 100 : undefined }
    if (done) updates.actual_date = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('milestones').update(updates).eq('id', id)
    if (!error && currentUser) {
      const m = milestones.find(x => x.id === id)
      logActivity(currentUser, `Milestone ${done ? 'completed' : 'reopened'}: ${m?.name}`, { entityType: 'milestone', entityId: id, projectId })
    }
    await fetchAll()
    return error?.message ?? null
  }

  // ── LOG ACTIONS ────────────────────────────────────────────
  const addLog = async (data: Partial<DailyLog>) => {
    const { error } = await supabase.from('daily_logs').insert({ ...data, project_id: projectId, logged_by: currentUser?.id })
    if (!error && currentUser) logActivity(currentUser, `Added daily log`, { entityType: 'daily_log', projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const updateLog = async (id: string, updates: Partial<DailyLog>) => {
    const { error } = await supabase.from('daily_logs').update(updates).eq('id', id)
    if (!error && currentUser) logActivity(currentUser, `Updated daily log`, { entityType: 'daily_log', entityId: id, projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('daily_logs').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // ── MATERIAL ACTIONS ───────────────────────────────────────
  const addMaterial = async (data: Partial<Material>) => {
    const { error } = await supabase.from('materials').insert({ ...data, project_id: projectId, created_by: currentUser?.id })
    if (!error && currentUser) logActivity(currentUser, `Added material: ${data.name}`, { entityType: 'material', projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const updateMaterial = async (id: string, updates: Partial<Material>) => {
    const { error } = await supabase.from('materials').update(updates).eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // ── EXPENSE ACTIONS ────────────────────────────────────────
  const addExpense = async (data: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').insert({ ...data, project_id: projectId, created_by: currentUser?.id })
    if (!error && currentUser) logActivity(currentUser, `Added expense: ${data.description} — ₹${data.amount}`, { entityType: 'expense', projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const { error } = await supabase.from('expenses').update(updates).eq('id', id)
    if (!error && currentUser) logActivity(currentUser, `Updated expense: ${updates.description ?? id}`, { entityType: 'expense', entityId: id, projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // ── BOQ ACTIONS ────────────────────────────────────────────
  const addBOQ = async (data: Partial<BOQItem>) => {
    const payload = { ...data, project_id: projectId, created_by: currentUser?.id, exec_qty: data.exec_qty ?? 0 }
    const { error } = await supabase.from('boq').insert(payload)
    await fetchAll()
    return error?.message ?? null
  }

  const updateBOQ = async (id: string, updates: Partial<BOQItem>) => {
    const { error } = await supabase.from('boq').update(updates).eq('id', id)
    if (!error) {
      // Recalculate project progress from BOQ
      const total = boq.reduce((s, r) => s + (r.amount ?? 0), 0)
      const exec  = boq.reduce((s, r) => {
        const v = r.id === id ? ((updates.exec_qty ?? r.exec_qty) * (r.rate ?? 0)) : (r.exec_value ?? 0)
        return s + v
      }, 0)
      if (total > 0) {
        await supabase.from('projects').update({ progress: Math.round(exec / total * 100) }).eq('id', projectId)
      }
    }
    await fetchAll()
    return error?.message ?? null
  }

  const deleteBOQ = async (id: string) => {
    const { error } = await supabase.from('boq').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // ── DOCUMENT ACTIONS ───────────────────────────────────────
  const addDocument = async (data: Partial<Document>, file?: File) => {
    let storagePath: string | null = null
    if (file) {
      const path = `${projectId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
      if (uploadErr) return uploadErr.message
      storagePath = path
    }
    const { error } = await supabase.from('documents').insert({
      ...data, project_id: projectId, uploaded_by: currentUser?.id,
      storage_path: storagePath ?? undefined,
    })
    if (!error && currentUser) logActivity(currentUser, `Linked document: ${data.name}`, { entityType: 'document', projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    // Don't try to write back generated fields
    const { public_url, uploader, ...safeUpdates } = updates as any
    const { error } = await supabase.from('documents').update(safeUpdates).eq('id', id)
    if (!error && currentUser) logActivity(currentUser, `Updated document: ${updates.name ?? id}`, { entityType: 'document', entityId: id, projectId })
    await fetchAll()
    return error?.message ?? null
  }

  const deleteDocument = async (id: string) => {
    const doc = documents.find(d => d.id === id)
    if (doc?.storage_path) {
      await supabase.storage.from('documents').remove([doc.storage_path])
    }
    const { error } = await supabase.from('documents').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // ── PHOTO ACTIONS ──────────────────────────────────────────
  // logId is optional: when provided, the photo is linked to that specific daily log entry.
  const addPhotos = async (files: File[], category = 'General', logId?: string) => {
    const uploads = files.map(async (file) => {
      const path = `${projectId}/${Date.now()}-${file.name}`
      // Compress image before upload
      const compressed = await compressImage(file, 800, 0.75)
      const { error: uploadErr } = await supabase.storage.from('photos').upload(path, compressed)
      if (uploadErr) return
      await supabase.from('photos').insert({
        project_id: projectId,
        log_id: logId ?? null,
        storage_path: path,
        name: file.name,
        category,
        photo_date: new Date().toISOString().split('T')[0],
        uploaded_by: currentUser?.id,
      })
    })
    await Promise.all(uploads)
    if (currentUser) logActivity(currentUser, `Uploaded ${files.length} photo(s)`, { entityType: 'photo', projectId })
    await fetchAll()
  }

  const deletePhoto = async (id: string) => {
    const photo = photos.find(p => p.id === id)
    if (photo?.storage_path) {
      await supabase.storage.from('photos').remove([photo.storage_path])
    }
    const { error } = await supabase.from('photos').delete().eq('id', id)
    await fetchAll()
    return error?.message ?? null
  }

  // Helper: photos attached to a specific log entry
  const photosForLog = (logId: string) => photos.filter(p => (p as any).log_id === logId)

  return {
    milestones, logs, materials, expenses, boq, documents, photos, loading,
    refetch: fetchAll,
    addMilestone, updateMilestone, deleteMilestone, toggleMilestone,
    addLog, updateLog, deleteLog,
    addMaterial, updateMaterial, deleteMaterial,
    addExpense, updateExpense, deleteExpense,
    addBOQ, updateBOQ, deleteBOQ,
    addDocument, updateDocument, deleteDocument,
    addPhotos, deletePhoto, photosForLog,
  }
}

// ── Image compression ──────────────────────────────────────────
async function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality)
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}
