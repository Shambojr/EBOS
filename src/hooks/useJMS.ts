// ════════════════════════════════════════════════════════════
// EBOS — useJMS hook
// Manages JMS items and measurement rows per project
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface JMSItem {
  id:          string
  project_id:  string
  boq_item_no: string
  description: string
  unit:        string
  jms_ref?:    string
  remarks?:    string
  sort_order:  number
  created_at:  string
}

export interface JMSRow {
  id:           string
  jms_item_id:  string
  location?:    string
  is_deduction: boolean
  no:           number
  length?:      number
  breadth?:     number
  depth_weight?: number
  remarks?:     string
  sort_order:   number
}

// ── Quantity calculator ───────────────────────────────────────
export function calcQty(row: Partial<JMSRow>, unit: string): number {
  const no     = row.no           ?? 1
  const sets   = row.is_deduction ? -1 : 1
  const L      = row.length       ?? 0
  const B      = row.breadth      ?? 0
  const DW     = row.depth_weight ?? 0

  switch (unit) {
    case 'cum':        return no * sets * L * B * DW
    case 'sqm':        return no * sets * L * B
    case 'kg':         return no * sets * L * DW  // DW = weight/mtr
    case 'rmt': case 'm': return no * sets * L
    case 'no': case 'each': case 'set': case 'lot': return no * sets
    default:           return no * sets * L * (B || 1)
  }
}

export function totalQty(rows: JMSRow[], unit: string): number {
  return rows.reduce((sum, r) => sum + calcQty(r, unit), 0)
}

// ── Units and their required fields ──────────────────────────
export const UNITS = ['sqm','cum','kg','rmt','m','no','each','set','lot','lm','RM']

export function fieldsForUnit(unit: string): { L: boolean; B: boolean; DW: boolean; dwLabel: string } {
  switch (unit) {
    case 'cum':           return { L: true,  B: true,  DW: true,  dwLabel: 'Depth (m)' }
    case 'sqm':           return { L: true,  B: true,  DW: false, dwLabel: '' }
    case 'kg':            return { L: true,  B: false, DW: true,  dwLabel: 'Wt/mtr (kg)' }
    case 'rmt': case 'm': case 'lm': case 'RM':
                          return { L: true,  B: false, DW: false, dwLabel: '' }
    default:              return { L: false, B: false, DW: false, dwLabel: '' }
  }
}

// ── Hook ──────────────────────────────────────────────────────
export function useJMS(projectId: string, userId: string) {
  const [items,   setItems]   = useState<JMSItem[]>([])
  const [rows,    setRows]    = useState<Record<string, JMSRow[]>>({}) // keyed by jms_item_id
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jms_items')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at')
    setItems(data ?? [])
    setLoading(false)
  }, [projectId])

  const fetchRows = useCallback(async (itemId: string) => {
    const { data } = await supabase
      .from('jms_rows')
      .select('*')
      .eq('jms_item_id', itemId)
      .order('sort_order')
      .order('created_at')
    setRows(r => ({ ...r, [itemId]: data ?? [] }))
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  // ── JMS Item CRUD ─────────────────────────────────────────
  const addItem = async (data: Partial<JMSItem>): Promise<string | null> => {
    const { error } = await supabase.from('jms_items').insert({
      ...data,
      project_id: projectId,
      created_by: userId,
      sort_order: items.length,
    })
    if (!error) await fetchItems()
    return error?.message ?? null
  }

  const updateItem = async (id: string, data: Partial<JMSItem>): Promise<string | null> => {
    const { error } = await supabase.from('jms_items').update(data).eq('id', id)
    if (!error) await fetchItems()
    return error?.message ?? null
  }

  const deleteItem = async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('jms_items').delete().eq('id', id)
    if (!error) { await fetchItems(); setRows(r => { const n = {...r}; delete n[id]; return n }) }
    return error?.message ?? null
  }

  // ── JMS Row CRUD ──────────────────────────────────────────
  const addRow = async (itemId: string, data: Partial<JMSRow>): Promise<string | null> => {
    const existing = rows[itemId] ?? []
    const { error } = await supabase.from('jms_rows').insert({
      ...data,
      jms_item_id:  itemId,
      is_deduction: data.is_deduction ?? false,
      no:           data.no ?? 1,
      sort_order:   existing.length,
    })
    if (!error) await fetchRows(itemId)
    return error?.message ?? null
  }

  const updateRow = async (itemId: string, rowId: string, data: Partial<JMSRow>): Promise<string | null> => {
    const { error } = await supabase.from('jms_rows').update(data).eq('id', rowId)
    if (!error) await fetchRows(itemId)
    return error?.message ?? null
  }

  const deleteRow = async (itemId: string, rowId: string): Promise<string | null> => {
    const { error } = await supabase.from('jms_rows').delete().eq('id', rowId)
    if (!error) await fetchRows(itemId)
    return error?.message ?? null
  }

  return {
    items, rows, loading,
    fetchRows, fetchItems,
    addItem, updateItem, deleteItem,
    addRow, updateRow, deleteRow,
  }
}
