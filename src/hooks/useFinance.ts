import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/logger'
import type { User } from '../types'
import type {
  BankAccount, Funding, FundingRepayment,
  Receivable, ReceivablePayment,
  Payable, PayablePayment,
  CashBookEntry, RecurringExpense,
  FinancialSummary, CashFlowForecast, ProjectProfitability
} from '../types/finance'

// ── INTEREST CALCULATIONS ────────────────────────────────────
export function calcInterestAccrued(f: Funding): number {
  if (f.interest_type === 'None' || !f.interest_rate) return 0
  const outstanding = f.amount_received - f.amount_repaid
  if (outstanding <= 0) return 0
  const days = Math.max(0, (Date.now() - new Date(f.date_received).getTime()) / 864e5)
  if (f.interest_type === 'Monthly') return outstanding * (f.interest_rate / 100) * (days / 30)
  if (f.interest_type === 'Annual')  return outstanding * (f.interest_rate / 100) * (days / 365)
  if (f.interest_type === 'Flat')    return f.amount_received * (f.interest_rate / 100)
  return 0
}

export function calcMonthlyInterest(f: Funding): number {
  if (f.interest_type === 'None' || !f.interest_rate) return 0
  const outstanding = f.amount_received - f.amount_repaid
  if (outstanding <= 0) return 0
  if (f.interest_type === 'Monthly') return outstanding * (f.interest_rate / 100)
  if (f.interest_type === 'Annual')  return outstanding * (f.interest_rate / 100) / 12
  if (f.interest_type === 'Flat')    return f.amount_received * (f.interest_rate / 100) / 12
  return 0
}

// ── MAIN HOOK ────────────────────────────────────────────────
export function useFinance(currentUser: User | null) {
  const [accounts, setAccounts]     = useState<BankAccount[]>([])
  const [funding, setFunding]       = useState<Funding[]>([])
  const [repayments, setRepayments] = useState<FundingRepayment[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [payables, setPayables]     = useState<Payable[]>([])
  const [cashBook, setCashBook]     = useState<CashBookEntry[]>([])
  const [recurring, setRecurring]   = useState<RecurringExpense[]>([])
  const [loading, setLoading]       = useState(true)

  const fetchAll = useCallback(async () => {
    if (!currentUser) return
    setLoading(true)
    const role = currentUser.role
    const isDir = role === 'director'
    const isAcc = role === 'accountant'

    const p = <T,>(q: PromiseLike<T>) => Promise.resolve(q)
    const empty = () => Promise.resolve({ data: [] as any[] })

    let queries: Promise<any>[]

    if (isDir) {
      queries = [
        p(supabase.from('bank_accounts').select('*').order('created_at')),
        p(supabase.from('funding').select('*').order('date_received', { ascending: false })),
        p(supabase.from('funding_repayments').select('*').order('payment_date', { ascending: false })),
        p(supabase.from('recurring_expenses').select('*').order('due_day')),
      ]
    } else {
      queries = [empty(), empty(), empty(), empty()]
    }

    if (isDir || isAcc) {
      queries.push(
        p(supabase.from('receivables').select('*, project:project_id(name)').order('bill_date', { ascending: false })),
        p(supabase.from('payables').select('*, project:project_id(name)').order('invoice_date', { ascending: false })),
        p(supabase.from('cash_book').select('*, project:project_id(name)').order('txn_date', { ascending: false }).limit(200)),
      )
    } else {
      queries.push(empty(), empty(), empty())
    }

    const [accs, fund, repay, recur, recv, pay, cash] = await Promise.all(queries)

    setAccounts(accs.data ?? [])
    setFunding((fund.data ?? []).map((f: Funding) => ({
      ...f,
      outstanding: f.amount_received - f.amount_repaid,
      interest_accrued: calcInterestAccrued(f),
      monthly_interest: calcMonthlyInterest(f),
      days_remaining: f.repayment_date ? Math.ceil((new Date(f.repayment_date).getTime() - Date.now()) / 864e5) : null,
      days_overdue: f.repayment_date && new Date(f.repayment_date) < new Date()
        ? Math.floor((Date.now() - new Date(f.repayment_date).getTime()) / 864e5) : 0,
    })))
    setRepayments(repay.data ?? [])
    setRecurring(recur.data ?? [])
    setReceivables((recv.data ?? []).map((r: Receivable) => ({
      ...r,
      balance: r.bill_amount - r.amount_received,
      delay_days: r.expected_date && new Date(r.expected_date) < new Date() && r.status !== 'Paid'
        ? Math.floor((Date.now() - new Date(r.expected_date).getTime()) / 864e5) : 0,
    })))
    setPayables((pay.data ?? []).map((p: Payable) => ({
      ...p,
      outstanding: p.amount - p.amount_paid,
      days_overdue: p.due_date && new Date(p.due_date) < new Date() && p.status !== 'Paid'
        ? Math.floor((Date.now() - new Date(p.due_date).getTime()) / 864e5) : 0,
    })))
    setCashBook(cash.data ?? [])
    setLoading(false)
  }, [currentUser])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funding' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receivables' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payables' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_book' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  // ── COMPUTED SUMMARY ────────────────────────────────────────
  const summary: FinancialSummary = (() => {
    const today = new Date()
    const thirtyDays = new Date(today.getTime() + 30 * 864e5)
    const totalBankBalance = accounts.reduce((s, a) => s + a.current_balance, 0)
    const outstandingReceivables = receivables
      .filter(r => r.status !== 'Paid')
      .reduce((s, r) => s + (r.balance ?? 0), 0)
    const outstandingPayables = payables
      .filter(p => p.status !== 'Paid')
      .reduce((s, p) => s + (p.outstanding ?? 0), 0)
    const totalActiveFunding = funding
      .filter(f => f.status === 'Active' || f.status === 'Partially Repaid')
      .reduce((s, f) => s + (f.outstanding ?? 0), 0)
    const interestDueThisMonth = funding
      .filter(f => f.status === 'Active' || f.status === 'Partially Repaid')
      .reduce((s, f) => s + (f.monthly_interest ?? 0), 0)
    const expectedInflowThirtyDays = receivables
      .filter(r => r.expected_date && new Date(r.expected_date) <= thirtyDays && r.status !== 'Paid')
      .reduce((s, r) => s + (r.balance ?? 0), 0)
    const expectedOutflowThirtyDays = payables
      .filter(p => p.due_date && new Date(p.due_date) <= thirtyDays && p.status !== 'Paid')
      .reduce((s, p) => s + (p.outstanding ?? 0), 0)
    return {
      cashPosition: totalBankBalance,
      totalBankBalance,
      outstandingReceivables,
      outstandingPayables,
      totalActiveFunding,
      interestDueThisMonth,
      expectedInflowThirtyDays,
      expectedOutflowThirtyDays,
      netCashProjection: totalBankBalance + expectedInflowThirtyDays - expectedOutflowThirtyDays,
      overdueReceivables: receivables.filter(r => (r.delay_days ?? 0) > 0).reduce((s, r) => s + (r.balance ?? 0), 0),
      overduePayables: payables.filter(p => (p.days_overdue ?? 0) > 0).reduce((s, p) => s + (p.outstanding ?? 0), 0),
      overdueFunding: funding.filter(f => (f.days_overdue ?? 0) > 0).reduce((s, f) => s + (f.outstanding ?? 0), 0),
    }
  })()

  // ── CASH FLOW FORECAST ──────────────────────────────────────
  function buildForecast(days: number): CashFlowForecast[] {
    const result: CashFlowForecast[] = []
    let runningBalance = accounts.reduce((s, a) => s + a.current_balance, 0)
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const items: CashFlowForecast['items'] = []
      // Receivables expected on this date
      receivables.filter(r => r.expected_date === dateStr && r.status !== 'Paid').forEach(r => {
        items.push({ type: 'receivable', description: `${r.client_name} — Bill ${r.bill_number}`, amount: r.balance ?? 0, direction: 'in', reference_id: r.id })
      })
      // Payables due on this date
      payables.filter(p => p.due_date === dateStr && p.status !== 'Paid').forEach(p => {
        items.push({ type: 'payable', description: `${p.supplier_name} — ${p.invoice_number ?? ''}`, amount: p.outstanding ?? 0, direction: 'out', reference_id: p.id })
      })
      // Funding repayments due
      funding.filter(f => f.repayment_date === dateStr && (f.outstanding ?? 0) > 0).forEach(f => {
        items.push({ type: 'funding_repayment', description: `Repay: ${f.source_name}`, amount: (f.outstanding ?? 0) + (f.monthly_interest ?? 0), direction: 'out', reference_id: f.id })
      })
      // Recurring expenses on this day of month
      recurring.filter(r => r.is_active && r.due_day === d.getDate()).forEach(r => {
        items.push({ type: 'recurring', description: r.name, amount: r.amount, direction: 'out' })
      })
      const inflow = items.filter(x => x.direction === 'in').reduce((s, x) => s + x.amount, 0)
      const outflow = items.filter(x => x.direction === 'out').reduce((s, x) => s + x.amount, 0)
      runningBalance += inflow - outflow
      if (items.length > 0 || i === 0 || i === 6 || i === 29 || i === days - 1) {
        result.push({ date: dateStr, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), inflow, outflow, closingBalance: runningBalance, items })
      }
    }
    return result
  }

  // ── BANK ACCOUNT ACTIONS ────────────────────────────────────
  const addAccount = async (data: Partial<BankAccount>) => {
    const { error } = await supabase.from('bank_accounts').insert({ ...data, created_by: currentUser?.id })
    if (!error) { await fetchAll(); logActivity(currentUser!, `Bank account added: ${data.name}`) }
    return error?.message ?? null
  }
  const updateAccount = async (id: string, data: Partial<BankAccount>) => {
    const { error } = await supabase.from('bank_accounts').update(data).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  // ── FUNDING ACTIONS ─────────────────────────────────────────
  const addFunding = async (data: Partial<Funding>) => {
    const { error } = await supabase.from('funding').insert({ ...data, created_by: currentUser?.id, amount_repaid: 0, interest_paid: 0 })
    if (!error) { await fetchAll(); logActivity(currentUser!, `Funding added: ${data.source_name} — ₹${data.amount_received}`) }
    return error?.message ?? null
  }
  const updateFunding = async (id: string, data: Partial<Funding>) => {
    const { error } = await supabase.from('funding').update(data).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const deleteFunding = async (id: string) => {
    const { error } = await supabase.from('funding').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const addRepayment = async (fundingId: string, data: Partial<FundingRepayment>) => {
    const { error } = await supabase.from('funding_repayments').insert({ ...data, funding_id: fundingId, created_by: currentUser?.id })
    if (!error) {
      // Update funding outstanding
      const f = funding.find(x => x.id === fundingId)
      if (f) {
        await supabase.from('funding').update({
          amount_repaid: (f.amount_repaid) + (data.principal ?? 0),
          interest_paid: (f.interest_paid) + (data.interest ?? 0),
        }).eq('id', fundingId)
      }
      await fetchAll()
    }
    return error?.message ?? null
  }

  // ── RECEIVABLE ACTIONS ──────────────────────────────────────
  const uploadBillPhoto = async (file: File): Promise<string | null> => {
    const compressed = await compressImageFile(file, 1000, 0.75)
    const path = `bills/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('photos').upload(path, compressed)
    if (error) return null
    return path
  }

  const addReceivable = async (data: Partial<Receivable>, billPhotoFile?: File | null) => {
    let bill_photo_path: string | undefined
    if (billPhotoFile) {
      const path = await uploadBillPhoto(billPhotoFile)
      if (path) bill_photo_path = path
    }
    const { error } = await supabase.from('receivables').insert({ ...data, bill_photo_path, created_by: currentUser?.id, amount_received: 0 })
    if (!error) { await fetchAll(); logActivity(currentUser!, `Receivable added: ${data.bill_number}`) }
    return error?.message ?? null
  }
  const updateReceivable = async (id: string, data: Partial<Receivable>, billPhotoFile?: File | null) => {
    const updates: any = { ...data }
    if (billPhotoFile) {
      const path = await uploadBillPhoto(billPhotoFile)
      if (path) updates.bill_photo_path = path
    }
    const { error } = await supabase.from('receivables').update(updates).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const removeBillPhoto = async (id: string) => {
    const r = receivables.find(x => x.id === id) as any
    if (r?.bill_photo_path) {
      await supabase.storage.from('photos').remove([r.bill_photo_path])
    }
    const { error } = await supabase.from('receivables').update({ bill_photo_path: null }).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const deleteReceivable = async (id: string) => {
    const { error } = await supabase.from('receivables').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const addReceivablePayment = async (receivableId: string, data: Partial<ReceivablePayment>) => {
    const { error } = await supabase.from('receivable_payments').insert({ ...data, receivable_id: receivableId, created_by: currentUser?.id })
    if (!error) {
      const r = receivables.find(x => x.id === receivableId)
      if (r) {
        const newReceived = r.amount_received + (data.amount ?? 0)
        const newStatus: any = newReceived >= r.bill_amount ? 'Paid' : 'Partially Paid'
        await supabase.from('receivables').update({ amount_received: newReceived, status: newStatus }).eq('id', receivableId)
      }
      await fetchAll()
    }
    return error?.message ?? null
  }

  // ── PAYABLE ACTIONS ─────────────────────────────────────────
  const addPayable = async (data: Partial<Payable>) => {
    const { error } = await supabase.from('payables').insert({ ...data, created_by: currentUser?.id, amount_paid: 0 })
    if (!error) { await fetchAll(); logActivity(currentUser!, `Payable added: ${data.supplier_name}`) }
    return error?.message ?? null
  }
  const updatePayable = async (id: string, data: Partial<Payable>) => {
    const { error } = await supabase.from('payables').update(data).eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const deletePayable = async (id: string) => {
    const { error } = await supabase.from('payables').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const addPayablePayment = async (payableId: string, data: Partial<PayablePayment>) => {
    const { error } = await supabase.from('payable_payments').insert({ ...data, payable_id: payableId, created_by: currentUser?.id })
    if (!error) {
      const p = payables.find(x => x.id === payableId)
      if (p) {
        const newPaid = p.amount_paid + (data.amount ?? 0)
        const newStatus: any = newPaid >= p.amount ? 'Paid' : 'Partially Paid'
        await supabase.from('payables').update({ amount_paid: newPaid, status: newStatus }).eq('id', payableId)
      }
      await fetchAll()
    }
    return error?.message ?? null
  }

  // ── CASH BOOK ACTIONS ───────────────────────────────────────
  const addCashEntry = async (data: Partial<CashBookEntry>) => {
    const { error } = await supabase.from('cash_book').insert({ ...data, created_by: currentUser?.id })
    if (!error) { await fetchAll(); logActivity(currentUser!, `Cash entry: ${data.description} — ₹${data.amount}`) }
    return error?.message ?? null
  }
  const updateCashEntry = async (id: string, data: Partial<CashBookEntry>) => {
    const { error } = await supabase.from('cash_book').update(data).eq('id', id)
    if (!error) { await fetchAll(); logActivity(currentUser!, `Cash entry updated: ${data.description ?? id}`) }
    return error?.message ?? null
  }
  const deleteCashEntry = async (id: string) => {
    const { error } = await supabase.from('cash_book').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  // ── RECURRING ACTIONS ───────────────────────────────────────
  const addRecurring = async (data: Partial<RecurringExpense>) => {
    const { error } = await supabase.from('recurring_expenses').insert({ ...data, created_by: currentUser?.id })
    if (!error) await fetchAll()
    return error?.message ?? null
  }
  const deleteRecurring = async (id: string) => {
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (!error) await fetchAll()
    return error?.message ?? null
  }

  return {
    accounts, funding, repayments, receivables, payables, cashBook, recurring, loading,
    summary, buildForecast, refetch: fetchAll,
    addAccount, updateAccount, deleteAccount,
    addFunding, updateFunding, deleteFunding, addRepayment,
    addReceivable, updateReceivable, deleteReceivable, addReceivablePayment, removeBillPhoto,
    addPayable, updatePayable, deletePayable, addPayablePayment,
    addCashEntry, updateCashEntry, deleteCashEntry,
    addRecurring, deleteRecurring,
  }
}


// ── Image compression helper (mirrors useProjectData's compressImage) ──
async function compressImageFile(file: File, maxWidth: number, quality: number): Promise<Blob> {
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