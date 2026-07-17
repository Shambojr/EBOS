import { useState } from 'react'
import { useFinance, calcInterestAccrued, calcMonthlyInterest } from '../hooks/useFinance'
import { supabase } from '../lib/supabase'
import { generateReceipt, shareOrDownload } from '../lib/generateReceipt'
import { LOGO_NAVY } from '../assets/logo'
import {
  Ico, VAULT_ICON_MAP,
  CalendarDaysIcon, ClockIcon, ArrowTrendingUpIcon, TagIcon,
  PaperClipIcon, EyeIcon, EyeSlashIcon, XMarkIcon, CameraIcon, PhotoIcon,
  ExclamationTriangleIcon, PencilIcon, ClipboardDocumentCheckIcon,
} from '../design/icons'
import { colors as C_, space, radius as R, shadow, text as TT, T, type as TY, motion as MO } from '../design/tokens'
import { fmtMoney, smartDate, getStatus } from '../design/business'
import { Sheet, StatusBadge, KPITile, StatGrid } from '../design/components'
import type { User, Project } from '../types'
import type {
  Funding, Receivable, Payable, CashBookEntry,
  BankAccount, FundingCategory, InterestType, BillStatus, PayableStatus
} from '../types/finance'

// ── Design system aliases ─────────────────────────────────────
const C = {
  navy:C_.brand, navyL:C_.brandLight, navyD:C_.brandDark, blue:C_.info, gold:C_.gold, white:'#fff',
  ash:C_.bgApp, mist:C_.bgMuted, border:C_.border, border2:C_.divider,
  ink:C_.textPrimary, body:C_.textPrimary, slate:C_.textSecondary, faint:C_.textTertiary,
  green:C_.success, greenBg:C_.successBg, amber:C_.warning, amberBg:C_.warningBg,
  red:C_.danger, redBg:C_.dangerBg, teal:C_.teal, tealBg:C_.tealBg,
}
const card      = T.card
const btnP      = T.btnPrimary
const btnG      = T.btnOutline
const btnD      = T.btnDanger
const fieldStyle= T.field
const fieldLabel= T.fieldLabel
const goldRule  = T.goldRule

// fmtMoney, smartDate imported from ../design/business
const fmtCur  = fmtMoney
const fmtDate = (d?: string | null) => smartDate(d, 'abs')
function today() { return new Date().toISOString().split('T')[0] }

type FinModule = 'dashboard'|'funding'|'receivables'|'payables'|'cashbook'|'banks'|'forecast'|'profitability'|'timeline'|'credentials'

// Sheet, FG, Grid2 imported from ../design/components
function FG({ label:lbl, children }: { label:string; children:React.ReactNode }) {
  return <div style={{ marginBottom:'16px' }}><label style={fieldLabel}>{lbl}</label>{children}</div>
}
function Grid2({ children }: { children:React.ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>{children}</div>
}

// StatusBadge imported from ../design/components


// ══════════════════════════════════════════════════════════════
// MAIN DIRECTOR OFFICE COMPONENT
// ══════════════════════════════════════════════════════════════
interface DirectorOfficeProps {
  currentUser: User
  projects: Project[]
}

export function DirectorOffice({ currentUser, projects }: DirectorOfficeProps) {
  const fin = useFinance(currentUser)
  const [mod, setMod] = useState<FinModule>('dashboard')
  const [sheet, setSheet] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [forecastDays, setForecastDays] = useState(30)
  const [selectedFunding, setSelectedFunding] = useState<Funding | null>(null)
  const [repayHistory,   setRepayHistory]     = useState<Record<string, any[]>>({})
  const [expandedRepay,  setExpandedRepay]    = useState<Record<string, boolean>>({})

  const loadRepayHistory = async (fundingId: string) => {
    const { data } = await supabase
      .from('funding_repayments')
      .select('*')
      .eq('funding_id', fundingId)
      .order('payment_date', { ascending: false })
    setRepayHistory(h => ({ ...h, [fundingId]: data ?? [] }))
  }

  const toggleRepayHistory = async (fundingId: string) => {
    await loadRepayHistory(fundingId)
    setExpandedRepay(e => ({ ...e, [fundingId]: !e[fundingId] }))
  }
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null)
  const [billPhotoFile, setBillPhotoFile] = useState<File | null>(null)
  const [billPhotoPreview, setBillPhotoPreview] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<any[]>([])
  const [showPass, setShowPass] = useState<Record<string,boolean>>({})

  function sf(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })) }
  function gv(key: string) { return form[key] ?? '' }

  async function save(fn: () => Promise<string | null>) {
    const err = await fn()
    if (err) alert('Error: ' + err)
    else { setSheet(null); setForm({}); setEditId(null) }
  }

  const MODULES: { key: FinModule; label: string }[] = [
    { key:'dashboard',     label:'Dashboard' },
    { key:'funding',       label:'Funding' },
    { key:'receivables',   label:'Receivables' },
    { key:'payables',      label:'Payables' },
    { key:'cashbook',      label:'Cash Book' },
    { key:'banks',         label:'Bank Accounts' },
    { key:'forecast',      label:'Cash Flow' },
    { key:'profitability', label:'Profitability' },
    { key:'timeline',      label:'Timeline' },
    { key:'credentials',   label:'Credentials' },
  ]

  const s = fin.summary

  // ── FUNDING INTEREST CALCULATION ───────────────────────────
  const FUNDING_CATS: FundingCategory[] = ['Gold Loan','Personal Loan','Relative Loan','Friend Loan','Bank Loan','Overdraft','Director Contribution','Client Advance','Vendor Credit']
  const INT_TYPES: InterestType[] = ['None','Monthly','Annual','Flat']
  const BILL_STATUSES: BillStatus[] = ['Draft','Submitted','Approved','Partially Paid','Paid','Overdue']
  const PAY_STATUSES: PayableStatus[] = ['Pending','Partially Paid','Paid','Overdue','Disputed']
  const CASH_CATS = ['Labour Payment','Material Purchase','Office Expense','Transport','Professional Fee','Salary','Rent','Loan Repayment','Interest','Advance','Petty Cash','Other']

  // ── PROFITABILITY ───────────────────────────────────────────
  function calcProfitability() {
    return projects.map(p => {
      const totalExp = (p as any).expenses?.reduce((s: number, e: any) => s + Number(e.amount || 0), 0) ?? 0
      const matCost  = (p as any).expenses?.filter((e: any) => e.category === 'Materials').reduce((s: number, e: any) => s + Number(e.amount || 0), 0) ?? 0
      const labCost  = (p as any).expenses?.filter((e: any) => e.category === 'Labour').reduce((s: number, e: any) => s + Number(e.amount || 0), 0) ?? 0
      const boqTotal = (p as any).boq?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) ?? p.budget ?? 0
      const boqExec  = (p as any).boq?.reduce((s: number, r: any) => s + Number(r.exec_value || 0), 0) ?? 0
      const cashRcvd = fin.receivables.filter(r => r.project_id === p.id && r.status === 'Paid').reduce((s, r) => s + r.amount_received, 0)
      const outstanding = fin.receivables.filter(r => r.project_id === p.id && r.status !== 'Paid').reduce((s, r) => s + (r.balance ?? 0), 0)
      const gross = boqExec - totalExp
      return {
        project_id: p.id, project_name: p.name,
        contract_value: boqTotal, work_done_value: boqExec,
        total_expenses: totalExp, material_cost: matCost, labour_cost: labCost,
        gross_profit: gross, profit_pct: boqExec > 0 ? (gross / boqExec * 100) : 0,
        cash_received: cashRcvd, outstanding_amount: outstanding,
        forecast_profit: (boqTotal - totalExp),
      }
    })
  }

  // ── TIMELINE ────────────────────────────────────────────────
  function buildTimeline() {
    const events: { date: string; type: string; desc: string; amount: number; dir: 'in'|'out'; color: string }[] = []
    fin.receivables.forEach(r => {
      if (r.expected_date) events.push({ date: r.expected_date, type: 'Receivable', desc: `${r.client_name} — Bill ${r.bill_number}`, amount: r.balance ?? 0, dir: 'in', color: C.green })
    })
    fin.payables.forEach(p => {
      if (p.due_date) events.push({ date: p.due_date, type: 'Payable', desc: `${p.supplier_name} — ${p.invoice_number ?? ''}`, amount: p.outstanding ?? 0, dir: 'out', color: C.red })
    })
    fin.funding.forEach(f => {
      if (f.repayment_date) events.push({ date: f.repayment_date, type: 'Loan Repayment', desc: f.source_name, amount: (f.outstanding ?? 0) + (f.monthly_interest ?? 0), dir: 'out', color: C.amber })
      events.push({ date: f.date_received, type: 'Funding Received', desc: f.source_name, amount: f.amount_received, dir: 'in', color: C.blue })
    })
    fin.cashBook.forEach(e => {
      events.push({ date: e.txn_date, type: e.txn_type, desc: e.description, amount: e.amount, dir: e.txn_type === 'Credit' ? 'in' : 'out', color: e.txn_type === 'Credit' ? C.green : C.red })
    })
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // ── RENDER MODULE ────────────────────────────────────────────
  function renderModule() {
    if (fin.loading) return <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>Loading financial data…</div>

    // ── DASHBOARD ─────────────────────────────────────────────
    if (mod === 'dashboard') return (
      <div>
        {/* KPI tiles */}
        <StatGrid tiles={[
          {label:'Receivables',    value:fmtCur(s.outstandingReceivables), sub: s.overdueReceivables > 0 ? `${fmtCur(s.overdueReceivables)} overdue` : 'All current', alert: s.overdueReceivables > 0, onClick: () => setMod('receivables')},
          {label:'Payables',       value:fmtCur(s.outstandingPayables),    sub: s.overduePayables > 0 ? `${fmtCur(s.overduePayables)} overdue` : 'All current', alert: s.overduePayables > 0, onClick: () => setMod('payables')},
          {label:'Active Funding', value:fmtCur(s.totalActiveFunding),     sub:'outstanding principal', onClick: () => setMod('funding')},
          {label:'Interest/Month', value:fmtCur(s.interestDueThisMonth),   sub:'across all loans', alert: s.interestDueThisMonth > 50000},
        ]}/>

        {/* Financial Alerts */}
        {(s.overdueReceivables > 0 || s.overduePayables > 0 || s.overdueFunding > 0) && (
          <div style={{ marginBottom:space[4] }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:space[2] }}>Financial Alerts</div>
            {s.overdueReceivables > 0 && (
              <div onClick={() => setMod('receivables')} style={{ display:'flex', gap:space[3], alignItems:'center', padding:`${space[3]} ${space[4]}`, background:C_.dangerBg, borderLeft:`3px solid ${C_.danger}`, borderRadius:`0 ${R.lg} ${R.lg} 0`, marginBottom:space[2], cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C_.danger} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:C_.danger }}>Overdue Receivables</div>
                  <div style={{ fontSize:'12px', color:C_.danger, opacity:0.75 }}>{fmtCur(s.overdueReceivables)} from clients · Tap to review</div>
                </div>
              </div>
            )}
            {s.overduePayables > 0 && (
              <div onClick={() => setMod('payables')} style={{ display:'flex', gap:space[3], alignItems:'center', padding:`${space[3]} ${space[4]}`, background:C_.warningBg, borderLeft:`3px solid ${C_.warning}`, borderRadius:`0 ${R.lg} ${R.lg} 0`, marginBottom:space[2], cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C_.warning} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:C_.warning }}>Overdue Payables</div>
                  <div style={{ fontSize:'12px', color:C_.warning, opacity:0.75 }}>{fmtCur(s.overduePayables)} owed to vendors · Tap to review</div>
                </div>
              </div>
            )}
            {s.overdueFunding > 0 && (
              <div onClick={() => setMod('funding')} style={{ display:'flex', gap:space[3], alignItems:'center', padding:`${space[3]} ${space[4]}`, background:C_.dangerBg, borderLeft:`3px solid ${C_.danger}`, borderRadius:`0 ${R.lg} ${R.lg} 0`, marginBottom:space[2], cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C_.danger} strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:600, color:C_.danger }}>Loan Repayment Overdue</div>
                  <div style={{ fontSize:'12px', color:C_.danger, opacity:0.75 }}>{fmtCur(s.overdueFunding)} outstanding · Tap to review</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bank Accounts */}
        {fin.accounts.length > 0 && (
          <div style={{ marginBottom:space[4] }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:space[2] }}>Bank Accounts</div>
            <div style={{ ...card }}>
              {fin.accounts.map((a, i) => (
                <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:`${space[3]} ${space[4]}`, borderBottom: i < fin.accounts.length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:600, color:C.ink }}>{a.name}</div>
                    <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{a.bank_name} · {a.account_type}</div>
                  </div>
                  <div style={{ fontSize:'18px', fontWeight:800, color: a.current_balance >= 0 ? C.navy : C_.danger, letterSpacing:'-0.02em' }}>{fmtCur(a.current_balance)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Week Commitments */}
        {(() => {
          const week = new Date(); week.setDate(week.getDate() + 7)
          const upcoming = [
            ...fin.receivables.filter(r => r.expected_date && new Date(r.expected_date) <= week && r.status !== 'Paid').map(r => ({ label: r.client_name, sub:`Bill ${r.bill_number}`, amount: r.balance ?? 0, date: r.expected_date!, dir: 'in' as const })),
            ...fin.payables.filter(p => p.due_date && new Date(p.due_date) <= week && p.status !== 'Paid').map(p => ({ label: p.supplier_name, sub: p.invoice_number ?? 'Invoice', amount: p.outstanding ?? 0, date: p.due_date!, dir: 'out' as const })),
          ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          if (!upcoming.length) return null
          return (
            <div style={{ marginBottom:space[4] }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:space[2] }}>This Week's Commitments</div>
              <div style={{ ...card }}>
                {upcoming.map((u, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:`${space[3]} ${space[4]}`, borderBottom: i < upcoming.length-1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display:'flex', gap:space[3], alignItems:'center' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:R.pill, background: u.dir === 'in' ? C_.success : C_.danger, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize:'14px', fontWeight:500, color:C.ink }}>{u.dir === 'in' ? '↓ ' : '↑ '}{u.label}</div>
                        <div style={{ fontSize:'12px', color:C.slate }}>{u.sub} · {fmtDate(u.date)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize:'15px', fontWeight:700, color: u.dir === 'in' ? C_.success : C_.danger }}>{u.dir === 'in' ? '+' : '-'}{fmtCur(u.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    )

    // ── FUNDING ───────────────────────────────────────────────
    if (mod === 'funding') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
          {fin.funding.length > 0 && <button style={btnP} onClick={() => { setForm({ interest_type:'None', interest_rate:0, status:'Active' }); setEditId(null); setSheet('funding') }}>＋ Add Funding</button>}
        </div>
        <StatGrid tiles={[
          {label:'Total Borrowed',  value:fmtCur(fin.funding.reduce((s,f)=>s+f.amount_received,0)), accent:C_.info},
          {label:'Outstanding',     value:fmtCur(s.totalActiveFunding), alert:s.totalActiveFunding>0},
          {label:'Interest/Month',  value:fmtCur(s.interestDueThisMonth), alert:s.interestDueThisMonth>50000},
          {label:'Active Loans',    value:String(fin.funding.filter(f=>f.status==='Active'||f.status==='Partially Repaid').length)},
        ]}/>
        {!fin.funding.length && (
          <div style={{ textAlign:'center', padding:'40px' }}>
            <div style={{ color:C.slate, marginBottom:'12px' }}>No funding records yet.</div>
            <button style={btnP} onClick={() => { setForm({ interest_type:'None', interest_rate:0, status:'Active' }); setEditId(null); setSheet('funding') }}>＋ Add First Funding Record</button>
          </div>
        )}
        {fin.funding.map(f => {
          const outstanding = f.amount_received - f.amount_repaid
          const interest = calcInterestAccrued(f)
          const repaidPct = f.amount_received > 0 ? Math.round((f.amount_repaid/f.amount_received)*100) : 0
          const isOD = (f.days_overdue ?? 0) > 0
          return (
            <div key={f.id} style={{ ...card, marginBottom:space[3], border: isOD ? `1px solid ${C_.danger}` : `1px solid ${C_.border}` }}>
              {isOD && <div style={{ height:'3px', background:C_.danger }}/>}
              <div style={{ padding:`${space[3]} ${space[4]}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[3] }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:C.ink }}>{f.source_name}</div>
                    <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{f.category}{f.lender_name ? ` · ${f.lender_name}` : ''}</div>
                  </div>
                  <StatusBadge status={f.status}/>
                </div>
                <div style={{ marginBottom:space[3] }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:space[1] }}>
                    <span style={{ fontSize:'12px', color:C.slate }}>Repaid: {fmtCur(f.amount_repaid)}</span>
                    <span style={{ fontSize:'12px', fontWeight:700, color:C_.success }}>{repaidPct}%</span>
                  </div>
                  <div style={{ height:'4px', background:C_.bgMuted, borderRadius:R.pill, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${repaidPct}%`, background:C_.success, borderRadius:R.pill }}/>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:space[2], marginBottom:space[3] }}>
                  <div style={{ padding:space[3], background: outstanding>0 ? C_.dangerBg : C_.successBg, borderRadius:R.md }}>
                    <div style={{ fontSize:'9px', color: outstanding>0 ? C_.danger : C_.success, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Outstanding</div>
                    <div style={{ fontSize:'16px', fontWeight:800, color: outstanding>0 ? C_.danger : C_.success }}>{fmtCur(outstanding)}</div>
                  </div>
                  <div style={{ padding:space[3], background:C_.warningBg, borderRadius:R.md }}>
                    <div style={{ fontSize:'9px', color:C_.warning, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Interest</div>
                    <div style={{ fontSize:'16px', fontWeight:800, color:C_.warning }}>{fmtCur(interest)}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:space[3], flexWrap:'wrap', fontSize:'12px', color:C.slate }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><Ico icon={CalendarDaysIcon} size={14}/>{fmtDate(f.date_received)}</span>
                  {f.repayment_date && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color: isOD ? C_.danger : C.slate }}><Ico icon={ClockIcon} size={14}/>Due: {fmtDate(f.repayment_date)}{isOD ? ` (${f.days_overdue}d late)` : f.days_remaining != null ? ` (${f.days_remaining}d left)` : ''}</span>}
                  {f.interest_type !== 'None' && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><Ico icon={ArrowTrendingUpIcon} size={14}/>{f.interest_rate}% {f.interest_type}</span>}
                </div>
                {f.notes && <div style={{ marginTop:space[2], fontSize:'12px', color:C.slate, padding:space[2], background:C.mist, borderRadius:R.md }}>{f.notes}</div>}

                {/* Repayment history toggle */}
                <div style={{ marginTop:space[3] }}>
                  <button
                    onClick={async () => {
                      await toggleRepayHistory(f.id)
                      
                    }}
                    style={{ ...btnG, width:'100%', justifyContent:'space-between', height:'36px', fontSize:'13px' }}>
                    <span>Repayment History{f.amount_repaid > 0 ? ` · ${fmtCur(f.amount_repaid)} paid` : ''}</span>
                    <span style={{ fontSize:'12px' }}>{expandedRepay[f.id] ? 'Hide' : 'History'}</span>
                  </button>
                  {expandedRepay[f.id] && (
                    <div style={{ marginTop:space[2], borderRadius:R.md, border:`1px solid ${C_.border}`, overflow:'hidden' }}>
                      {!(repayHistory[f.id]?.length) ? (
                        <div style={{ padding:space[3], textAlign:'center', color:C.slate, fontSize:'13px' }}>No repayments recorded yet</div>
                      ) : (
                        <>
                          {/* Header */}
                          <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr 1fr', background:C_.bgMuted, padding:`${space[1]} ${space[3]}`, borderBottom:`1px solid ${C_.border}` }}>
                            {['Date','Principal','Interest','Total'].map(h => (
                              <div key={h} style={{ fontSize:'10px', fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'.06em', textAlign:'right' }}>{h}</div>
                            ))}
                          </div>
                          {/* Rows */}
                          {repayHistory[f.id].map((r: any, i: number) => (
                            <div key={r.id} style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr 1fr', padding:`${space[2]} ${space[3]}`, borderBottom: i < repayHistory[f.id].length-1 ? `1px solid ${C_.border}` : 'none', background: i%2===1 ? C_.bgMuted : '#fff', alignItems:'center' }}>
                              <div style={{ fontSize:'12px', color:C.slate }}>{fmtDate(r.payment_date)}</div>
                              <div style={{ fontSize:'13px', fontWeight:600, color:C.navy, textAlign:'right' }}>{fmtCur(r.principal||0)}</div>
                              <div style={{ fontSize:'13px', color:C_.warning, textAlign:'right' }}>{fmtCur(r.interest||0)}</div>
                              <div style={{ fontSize:'13px', fontWeight:700, color:C.ink, textAlign:'right' }}>{fmtCur((r.principal||0)+(r.interest||0))}</div>
                            </div>
                          ))}
                          {/* Running total */}
                          <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 1fr 1fr', padding:`${space[2]} ${space[3]}`, background:C.navy }}>
                            <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,.5)', textTransform:'uppercase' }}>Total</div>
                            <div style={{ fontSize:'13px', fontWeight:700, color:'#fff', textAlign:'right' }}>{fmtCur(repayHistory[f.id].reduce((s:number,r:any)=>s+(r.principal||0),0))}</div>
                            <div style={{ fontSize:'13px', fontWeight:700, color:'#fbbf24', textAlign:'right' }}>{fmtCur(repayHistory[f.id].reduce((s:number,r:any)=>s+(r.interest||0),0))}</div>
                            <div style={{ fontSize:'13px', fontWeight:800, color:'#fff', textAlign:'right' }}>{fmtCur(f.amount_repaid)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Installment history */}
              {expandedRepay[f.id] && (
                <div style={{ borderTop:`1px solid ${C_.border}`, padding:`${space[3]} ${space[4]}` }}>
                  <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:space[2] }}>
                    Installments · {(repayHistory[f.id]??[]).length} payment{(repayHistory[f.id]??[]).length!==1?'s':''}
                  </div>
                  {(repayHistory[f.id]??[]).length === 0 ? (
                    <div style={{ fontSize:'13px', color:C.slate, textAlign:'center', padding:`${space[2]} 0` }}>No repayments recorded yet</div>
                  ) : (repayHistory[f.id]??[]).map((r: any, i: number) => (
                    <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:`${space[2]} 0`, borderBottom: i < (repayHistory[f.id]??[]).length-1 ? `1px solid ${C_.border}` : 'none' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600, color:C.ink }}>{fmtDate(r.payment_date)}</div>
                        {r.notes && <div style={{ fontSize:'11px', color:C.slate, marginTop:'2px' }}>{r.notes}</div>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:'14px', fontWeight:700, color:C_.success }}>{fmtCur(r.principal)}</div>
                        {r.interest > 0 && <div style={{ fontSize:'11px', color:C_.warning }}>+ {fmtCur(r.interest)} interest</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding:`${space[2]} ${space[4]} ${space[3]}`, display:'flex', gap:space[2], borderTop:`1px solid ${C_.divider}` }}>
                <button style={{ ...btnP, flex:1 }} onClick={() => { setSelectedFunding(f); setForm({ principal:0, interest:0 }); setSheet('repay') }}>Record Repayment</button>
                <button style={btnG} onClick={() => toggleRepayHistory(f.id)}>{expandedRepay[f.id] ? 'Hide' : 'History'}</button>
                <button style={btnG} onClick={() => { setForm({ ...f, date_received:f.date_received, repayment_date:f.repayment_date??'' }); setEditId(f.id); setSheet('funding') }}>Edit</button>
                <button style={btnG} onClick={async () => {
                  const blob = await generateReceipt({ docType:'FUNDING RECEIPT', refNumber:`FR-${f.id.slice(-6).toUpperCase()}`, partyLabel:'SOURCE', partyName:f.source_name, category:f.category+(f.lender_name?` · ${f.lender_name}`:''), date:f.date_received, dueDate:f.repayment_date, status:f.status, notes:f.notes, logoSrc:LOGO_NAVY, fields:[
                    {label:'Amount Received', value:fmtCur(f.amount_received), bold:true},
                    {label:'Amount Repaid',   value:fmtCur(f.amount_repaid)},
                    {label:'Outstanding',     value:fmtCur(f.amount_received-f.amount_repaid), bold:true, accent:(f.amount_received-f.amount_repaid)>0?C_.danger:C_.success},
                    {label:'Interest Type',   value:f.interest_type==='None'?'None':`${f.interest_rate}% ${f.interest_type}`},
                    {label:'Days Remaining',  value:f.days_remaining!=null?`${f.days_remaining} days`:(f.days_overdue??0)>0?`${f.days_overdue} days overdue`:'—'},
                  ]})
                  await shareOrDownload(blob, `funding-${f.source_name.replace(/\s+/g,'-')}.png`, 'Funding Receipt')
                }}>Share</button>
                <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteFunding(f.id) }}>Delete</button>
              </div>
            </div>
          )
        })}

        {/* Funding Sheet */}
        {sheet === 'funding' && (
          <Sheet title={editId ? 'Edit Funding' : 'Add Funding'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateFunding(editId, form) : fin.addFunding(form))} style={{ ...btnP, flex:1 }}>Save</button></>}>
            <FG label="Source Name *"><input style={fieldStyle} value={gv('source_name')} onChange={e => sf('source_name',e.target.value)} placeholder="e.g. SBI Gold Loan, Raghunath Contribution"/></FG>
            <Grid2>
              <FG label="Category"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('category')||''} onChange={e => sf('category',e.target.value)}><option value="">—</option>{FUNDING_CATS.map(c=><option key={c}>{c}</option>)}</select></FG>
              <FG label="Lender Name"><input style={fieldStyle} value={gv('lender_name')} onChange={e => sf('lender_name',e.target.value)}/></FG>
              <FG label="Lender Phone"><input style={fieldStyle} value={gv('lender_phone')} onChange={e => sf('lender_phone',e.target.value)}/></FG>
              <FG label="Amount Received (₹) *"><input style={fieldStyle} type="number" value={gv('amount_received')} onChange={e => sf('amount_received',Number(e.target.value))}/></FG>
              <FG label="Date Received"><input style={{ ...fieldStyle }} type="date" value={gv('date_received')||today()} onChange={e => sf('date_received',e.target.value)}/></FG>
              <FG label="Repayment Date"><input style={fieldStyle} type="date" value={gv('repayment_date')||''} onChange={e => sf('repayment_date',e.target.value)}/></FG>
              <FG label="Interest Type"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('interest_type')||'None'} onChange={e => sf('interest_type',e.target.value)}>{INT_TYPES.map(t=><option key={t}>{t}</option>)}</select></FG>
              <FG label="Interest Rate (%)"><input style={fieldStyle} type="number" step="0.01" value={gv('interest_rate')||0} onChange={e => sf('interest_rate',Number(e.target.value))}/></FG>
              <FG label="Bank Account"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('bank_account_id')||''} onChange={e => sf('bank_account_id',e.target.value)}><option value="">—</option>{fin.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FG>
              <FG label="Status"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('status')||'Active'} onChange={e => sf('status',e.target.value)}>{['Active','Partially Repaid','Closed','Overdue'].map(s=><option key={s}>{s}</option>)}</select></FG>
            </Grid2>
            <FG label="Notes"><textarea style={{ ...fieldStyle, minHeight:'60px', resize:'vertical' }} value={gv('notes')||''} onChange={e => sf('notes',e.target.value)}/></FG>
          </Sheet>
        )}

        {/* Repayment Sheet */}
        {sheet === 'repay' && selectedFunding && (
          <Sheet title={`Repay: ${selectedFunding.source_name}`} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(async () => {
                const err = await fin.addRepayment(selectedFunding.id, { ...form, payment_date: form.payment_date || today() })
                if (!err) await loadRepayHistory(selectedFunding.id)
                return err
              })} style={{ ...btnP, flex:1 }}>Record</button></>}>
            <div style={{ padding:'12px 14px', marginBottom:'16px', background:C.mist, borderRadius:'12px' }}>
              <div style={{ fontSize:'12px', color:C.slate }}>Outstanding: <strong style={{ color:C.navy }}>{fmtCur(selectedFunding.amount_received - selectedFunding.amount_repaid)}</strong> · Interest Accrued: <strong style={{ color:C.amber }}>{fmtCur(calcInterestAccrued(selectedFunding))}</strong></div>
            </div>
            <Grid2>
              <FG label="Payment Date"><input style={fieldStyle} type="date" value={gv('payment_date')||today()} onChange={e => sf('payment_date',e.target.value)}/></FG>
              <FG label="Principal (₹)"><input style={fieldStyle} type="number" value={gv('principal')||0} onChange={e => sf('principal',Number(e.target.value))}/></FG>
              <FG label="Interest (₹)"><input style={fieldStyle} type="number" value={gv('interest')||0} onChange={e => sf('interest',Number(e.target.value))}/></FG>
              <FG label="Bank Account"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('bank_account_id')||''} onChange={e => sf('bank_account_id',e.target.value)}><option value="">Cash</option>{fin.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FG>
            </Grid2>
            <FG label="Notes"><input style={fieldStyle} value={gv('notes')||''} onChange={e => sf('notes',e.target.value)}/></FG>
          </Sheet>
        )}
      </div>
    )

    // ── RECEIVABLES ───────────────────────────────────────────
    if (mod === 'receivables') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
          {fin.receivables.length > 0 && <button style={btnP} onClick={() => { setForm({ bill_date:today(), retention_pct:0, gst_amount:0, status:'Draft' }); setEditId(null); setBillPhotoFile(null); setBillPhotoPreview(null); setSheet('receivable') }}>＋ Add Bill</button>}
        </div>
        <StatGrid tiles={[
          {label:'Outstanding',    value:fmtCur(s.outstandingReceivables), alert:s.overdueReceivables>0},
          {label:'Overdue',        value:fmtCur(s.overdueReceivables), alert:s.overdueReceivables>0},
          {label:'Expected (30d)', value:fmtCur(s.expectedInflowThirtyDays), accent:C_.success},
          {label:'Open Bills',     value:String(fin.receivables.filter(r=>r.status!=='Paid').length)},
        ]}/>
        {!fin.receivables.length && (
          <div style={{ textAlign:'center', padding:'40px' }}>
            <div style={{ color:C.slate, marginBottom:'12px' }}>No receivables yet.</div>
            <button style={btnP} onClick={() => { setForm({ bill_date:today(), retention_pct:0, gst_amount:0, status:'Draft' }); setEditId(null); setBillPhotoFile(null); setBillPhotoPreview(null); setSheet('receivable') }}>＋ Add First Bill</button>
          </div>
        )}
        {fin.receivables.map(r => {
          const collectedPct = r.bill_amount > 0 ? Math.round((r.amount_received/r.bill_amount)*100) : 0
          const isOD = (r.delay_days ?? 0) > 0
          return (
          <div key={r.id} style={{ ...card, marginBottom:space[3], border: isOD ? `1px solid ${C_.danger}` : `1px solid ${C_.border}` }}>
            {isOD && <div style={{ height:'3px', background:C_.danger }}/>}
            <div style={{ padding:`${space[3]} ${space[4]}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[3] }}>
                <div style={{ flex:1, minWidth:0, marginRight:space[2] }}>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.client_name}</div>
                  <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>Bill {r.bill_number}{(r as any).project?.name ? ` · ${(r as any).project.name}` : ''}</div>
                </div>
                <StatusBadge status={r.status}/>
              </div>
              {/* Collection progress */}
              <div style={{ marginBottom:space[3] }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:space[1] }}>
                  <span style={{ fontSize:'12px', color:C.slate }}>Collected: {fmtCur(r.amount_received)} of {fmtCur(r.bill_amount)}</span>
                  <span style={{ fontSize:'12px', fontWeight:700, color:C_.success }}>{collectedPct}%</span>
                </div>
                <div style={{ height:'4px', background:C_.bgMuted, borderRadius:R.pill, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${collectedPct}%`, background:C_.success, borderRadius:R.pill }}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:space[2], marginBottom:space[3] }}>
                <div style={{ padding:space[3], background:C_.bgMuted, borderRadius:R.md }}>
                  <div style={{ fontSize:'9px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Bill Amount</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:C.navy }}>{fmtCur(r.bill_amount)}</div>
                </div>
                <div style={{ padding:space[3], background:(r.balance??0)>0 ? C_.dangerBg : C_.successBg, borderRadius:R.md }}>
                  <div style={{ fontSize:'9px', color:(r.balance??0)>0?C_.danger:C_.success, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Balance</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:(r.balance??0)>0?C_.danger:C_.success }}>{fmtCur(r.balance)}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:space[3], flexWrap:'wrap', fontSize:'12px', color:C.slate }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><Ico icon={CalendarDaysIcon} size={14}/>Bill: {fmtDate(r.bill_date)}</span>
                {r.expected_date && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color:isOD?C_.danger:C.slate }}><Ico icon={ClockIcon} size={14}/>Expected: {fmtDate(r.expected_date)}{isOD?` (${r.delay_days}d late)`:''}</span>}
                {r.retention_pct > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><Ico icon={TagIcon} size={14}/>Retention: {r.retention_pct}%</span>}
              </div>
              {r.remarks && <div style={{ marginTop:space[2], fontSize:'12px', color:C.slate }}>{r.remarks}</div>}
              {(r as any).bill_photo_path && (
                <div style={{ marginTop:space[3] }}>
                  <img src={`https://yvllrkopqcmiynofayif.supabase.co/storage/v1/object/public/photos/${(r as any).bill_photo_path}`} alt="Bill scan"
                    style={{ width:'100%', maxHeight:'160px', objectFit:'cover', borderRadius:R.lg, cursor:'pointer', border:`1px solid ${C.border}` }}
                    onClick={() => window.open(`https://yvllrkopqcmiynofayif.supabase.co/storage/v1/object/public/photos/${(r as any).bill_photo_path}`, '_blank')}/>
                  <button onClick={() => { if(confirm('Remove bill scan?')) fin.removeBillPhoto(r.id) }} style={{ background:'none', border:'none', color:C_.danger, fontSize:'11px', cursor:'pointer', padding:`${space[1]} 0`, textDecoration:'underline' }}>Remove scan</button>
                </div>
              )}
            </div>
            <div style={{ padding:`${space[2]} ${space[4]} ${space[3]}`, display:'flex', gap:space[2], flexWrap:'wrap', borderTop:`1px solid ${C_.divider}` }}>
              {r.status !== 'Paid' && <button style={{ ...btnP, flex:1 }} onClick={() => { setSelectedReceivable(r); setForm({ amount:r.balance, payment_date:today() }); setSheet('recv-pay') }}>Record Payment</button>}
              <button style={btnG} onClick={() => { setForm({ ...r, bill_date:r.bill_date, submitted_date:r.submitted_date??'', expected_date:r.expected_date??'', project_id:r.project_id }); setEditId(r.id); setBillPhotoFile(null); setBillPhotoPreview(null); setSheet('receivable') }}>Edit</button>
              <button style={btnG} onClick={async () => {
                const blob = await generateReceipt({ docType:'RECEIVABLE STATEMENT', refNumber:`Bill ${r.bill_number}`, partyLabel:'CLIENT', partyName:r.client_name, projectName:(r as any).project?.name, date:r.bill_date, dueDate:r.expected_date, status:r.status, notes:r.remarks, logoSrc:LOGO_NAVY, fields:[
                  {label:'Bill Amount',     value:fmtCur(r.bill_amount), bold:true},
                  {label:'Amount Received', value:fmtCur(r.amount_received)},
                  {label:'Balance Due',     value:fmtCur(r.balance??0), bold:true, accent:(r.balance??0)>0?C_.danger:C_.success},
                  {label:'Retention',       value:r.retention_pct>0?`${r.retention_pct}%`:'None'},
                  {label:'GST',             value:r.gst_amount>0?fmtCur(r.gst_amount):'—'},
                ]})
                await shareOrDownload(blob, `bill-${r.bill_number}-${r.client_name.replace(/\s+/g,'-')}.png`, 'Receivable Statement')
              }}>Share</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteReceivable(r.id) }}>Delete</button>
            </div>
          </div>
          )
        })}

        {sheet === 'receivable' && (
          <Sheet title={editId ? 'Edit Bill' : 'Add Running Bill'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(async () => { const err = editId ? await fin.updateReceivable(editId, form, billPhotoFile) : await fin.addReceivable(form, billPhotoFile); setBillPhotoFile(null); setBillPhotoPreview(null); return err })} style={{ ...btnP, flex:1 }}>Save</button></>}>
            <FG label="Bill Scan (optional)">
              {billPhotoPreview ? (
                <div style={{ position:'relative', marginBottom:'10px' }}>
                  <img src={billPhotoPreview} alt="Bill preview" style={{ width:'100%', maxHeight:'180px', objectFit:'cover', borderRadius:'12px', border:`1px solid ${C.border}` }}/>
                  <button onClick={() => { setBillPhotoFile(null); setBillPhotoPreview(null) }} style={{ position:'absolute', top:'8px', right:'8px', background:'rgba(220,38,38,.9)', color:'#fff', border:'none', borderRadius:'8px', padding:'5px 10px', fontSize:'12px', cursor:'pointer' }}>Remove</button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:'8px' }}>
                  <label style={{ ...btnG, cursor:'pointer', flex:1 }}>
                    <Ico icon={CameraIcon} size={16}/> Camera
                    <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setBillPhotoFile(f); setBillPhotoPreview(URL.createObjectURL(f)) } }}/>
                  </label>
                  <label style={{ ...btnG, cursor:'pointer', flex:1 }}>
                    <Ico icon={PhotoIcon} size={16}/> Gallery
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setBillPhotoFile(f); setBillPhotoPreview(URL.createObjectURL(f)) } }}/>
                  </label>
                </div>
              )}
            </FG>
            <Grid2>
              <FG label="Project"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('project_id')||''} onChange={e => { sf('project_id',e.target.value); sf('client_name', projects.find(p=>p.id===e.target.value)?.client||gv('client_name')) }}><option value="">—</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FG>
              <FG label="Client Name *"><input style={fieldStyle} value={gv('client_name')||''} onChange={e => sf('client_name',e.target.value)}/></FG>
              <FG label="Bill Number *"><input style={fieldStyle} value={gv('bill_number')||''} onChange={e => sf('bill_number',e.target.value)} placeholder="RB-001"/></FG>
              <FG label="Bill Amount (₹) *"><input style={fieldStyle} type="number" value={gv('bill_amount')||''} onChange={e => sf('bill_amount',Number(e.target.value))}/></FG>
              <FG label="Bill Date"><input style={fieldStyle} type="date" value={gv('bill_date')||today()} onChange={e => sf('bill_date',e.target.value)}/></FG>
              <FG label="Submitted Date"><input style={fieldStyle} type="date" value={gv('submitted_date')||''} onChange={e => sf('submitted_date',e.target.value)}/></FG>
              <FG label="Expected Payment"><input style={fieldStyle} type="date" value={gv('expected_date')||''} onChange={e => sf('expected_date',e.target.value)}/></FG>
              <FG label="Retention %"><input style={fieldStyle} type="number" step="0.01" value={gv('retention_pct')||0} onChange={e => sf('retention_pct',Number(e.target.value))}/></FG>
              <FG label="GST Amount (₹)"><input style={fieldStyle} type="number" value={gv('gst_amount')||0} onChange={e => sf('gst_amount',Number(e.target.value))}/></FG>
              <FG label="Status"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('status')||'Draft'} onChange={e => sf('status',e.target.value)}>{BILL_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FG>
            </Grid2>
            <FG label="Remarks"><textarea style={{ ...fieldStyle, minHeight:'60px', resize:'vertical' }} value={gv('remarks')||''} onChange={e => sf('remarks',e.target.value)}/></FG>
          </Sheet>
        )}

        {sheet === 'recv-pay' && selectedReceivable && (
          <Sheet title={`Payment: ${selectedReceivable.client_name}`} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addReceivablePayment(selectedReceivable.id, form))} style={{ ...btnP, flex:1 }}>Record</button></>}>
            <div style={{ padding:'12px 14px', marginBottom:'16px', background:C.mist, borderRadius:'12px' }}>
              <div style={{ fontSize:'12px', color:C.slate }}>Balance due: <strong style={{ color:C.red }}>{fmtCur(selectedReceivable.balance)}</strong></div>
            </div>
            <Grid2>
              <FG label="Payment Date"><input style={fieldStyle} type="date" value={gv('payment_date')||today()} onChange={e => sf('payment_date',e.target.value)}/></FG>
              <FG label="Amount (₹) *"><input style={fieldStyle} type="number" value={gv('amount')||''} onChange={e => sf('amount',Number(e.target.value))}/></FG>
              <FG label="Bank Account"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('bank_account_id')||''} onChange={e => sf('bank_account_id',e.target.value)}><option value="">Cash</option>{fin.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FG>
              <FG label="Reference / Cheque No."><input style={fieldStyle} value={gv('reference')||''} onChange={e => sf('reference',e.target.value)}/></FG>
            </Grid2>
            <FG label="Notes"><input style={fieldStyle} value={gv('notes')||''} onChange={e => sf('notes',e.target.value)}/></FG>
          </Sheet>
        )}
      </div>
    )

    // ── PAYABLES ──────────────────────────────────────────────
    if (mod === 'payables') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
          <button style={btnP} onClick={() => { setForm({ invoice_date:today(), status:'Pending' }); setEditId(null); setSheet('payable') }}>＋ Add Payable</button>
        </div>
        <StatGrid tiles={[
          {label:'Total Payable',  value:fmtCur(s.outstandingPayables), alert:s.overduePayables>0},
          {label:'Overdue',        value:fmtCur(s.overduePayables), alert:s.overduePayables>0},
          {label:'Due This Week',  value:fmtCur(fin.payables.filter(p=>{const d=p.due_date&&new Date(p.due_date);const w=new Date();w.setDate(w.getDate()+7);return d&&d<=w&&p.status!=='Paid';}).reduce((s,p)=>s+(p.outstanding??0),0)), accent:C_.warning},
          {label:'Vendors',        value:String(new Set(fin.payables.filter(p=>p.status!=='Paid').map(p=>p.supplier_name)).size)},
        ]}/>
        {!fin.payables.length && (
          <div style={{ textAlign:'center', padding:'40px' }}>
            <div style={{ color:C.slate, marginBottom:'12px' }}>No payables yet.</div>
            <button style={btnP} onClick={() => { setForm({ invoice_date:today(), status:'Pending' }); setEditId(null); setSheet('payable') }}>＋ Add First Payable</button>
          </div>
        )}
        {fin.payables.map(p => {
          const paidPct = p.amount > 0 ? Math.round((p.amount_paid/p.amount)*100) : 0
          const isOD = (p.days_overdue ?? 0) > 0
          return (
          <div key={p.id} style={{ ...card, marginBottom:space[3], border: isOD ? `1px solid ${C_.danger}` : `1px solid ${C_.border}` }}>
            {isOD && <div style={{ height:'3px', background:C_.danger }}/>}
            <div style={{ padding:`${space[3]} ${space[4]}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[3] }}>
                <div style={{ flex:1, minWidth:0, marginRight:space[2] }}>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.supplier_name}</div>
                  <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{p.invoice_number ? `Inv: ${p.invoice_number}` : '—'}{(p as any).project?.name ? ` · ${(p as any).project.name}` : ''}</div>
                </div>
                <StatusBadge status={p.status}/>
              </div>
              <div style={{ marginBottom:space[3] }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:space[1] }}>
                  <span style={{ fontSize:'12px', color:C.slate }}>Paid: {fmtCur(p.amount_paid)} of {fmtCur(p.amount)}</span>
                  <span style={{ fontSize:'12px', fontWeight:700, color:C_.success }}>{paidPct}%</span>
                </div>
                <div style={{ height:'4px', background:C_.bgMuted, borderRadius:R.pill, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${paidPct}%`, background:C_.success, borderRadius:R.pill }}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:space[2], marginBottom:space[3] }}>
                <div style={{ padding:space[3], background:C_.bgMuted, borderRadius:R.md }}>
                  <div style={{ fontSize:'9px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Invoice</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:C.navy }}>{fmtCur(p.amount)}</div>
                </div>
                <div style={{ padding:space[3], background:(p.outstanding??0)>0 ? C_.dangerBg : C_.successBg, borderRadius:R.md }}>
                  <div style={{ fontSize:'9px', color:(p.outstanding??0)>0?C_.danger:C_.success, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'3px' }}>Outstanding</div>
                  <div style={{ fontSize:'16px', fontWeight:800, color:(p.outstanding??0)>0?C_.danger:C_.success }}>{fmtCur(p.outstanding)}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:space[3], flexWrap:'wrap', fontSize:'12px', color:C.slate }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px' }}><Ico icon={CalendarDaysIcon} size={14}/>Invoice: {fmtDate(p.invoice_date)}</span>
                {p.due_date && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', color:isOD?C_.danger:C.slate }}><Ico icon={ClockIcon} size={14}/>Due: {fmtDate(p.due_date)}{isOD?` (${p.days_overdue}d late)`:''}</span>}
                {p.po_number && <span>PO: {p.po_number}</span>}
              </div>
              {p.remarks && <div style={{ marginTop:space[2], fontSize:'12px', color:C.slate }}>{p.remarks}</div>}
            </div>
            <div style={{ padding:`${space[2]} ${space[4]} ${space[3]}`, display:'flex', gap:space[2], flexWrap:'wrap', borderTop:`1px solid ${C_.divider}` }}>
              {p.status !== 'Paid' && <button style={{ ...btnP, flex:1 }} onClick={() => { setSelectedPayable(p); setForm({ amount:p.outstanding, payment_date:today() }); setSheet('pay-pay') }}>Record Payment</button>}
              <button style={btnG} onClick={() => { setForm({ ...p, invoice_date:p.invoice_date, due_date:p.due_date??'' }); setEditId(p.id); setSheet('payable') }}>Edit</button>
              <button style={btnG} onClick={async () => {
                const blob = await generateReceipt({ docType:'PAYABLE VOUCHER', refNumber:p.invoice_number?`Inv: ${p.invoice_number}`:`PV-${p.id.slice(-6).toUpperCase()}`, partyLabel:'SUPPLIER', partyName:p.supplier_name, projectName:(p as any).project?.name, date:p.invoice_date, dueDate:p.due_date, status:p.status, notes:p.remarks, logoSrc:LOGO_NAVY, fields:[
                  {label:'Invoice Amount', value:fmtCur(p.amount), bold:true},
                  {label:'Amount Paid',   value:fmtCur(p.amount_paid)},
                  {label:'Outstanding',   value:fmtCur(p.outstanding??0), bold:true, accent:(p.outstanding??0)>0?C_.danger:C_.success},
                  {label:'PO Number',     value:p.po_number||'—'},
                ]})
                await shareOrDownload(blob, `payable-${p.supplier_name.replace(/\s+/g,'-')}.png`, 'Payable Voucher')
              }}>Share</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deletePayable(p.id) }}>Delete</button>
            </div>
          </div>
          )
        })}

        {sheet === 'payable' && (
          <Sheet title={editId ? 'Edit Payable' : 'Add Vendor Payable'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updatePayable(editId, form) : fin.addPayable(form))} style={{ ...btnP, flex:1 }}>Save</button></>}>
            <FG label="Supplier Name *"><input style={fieldStyle} value={gv('supplier_name')||''} onChange={e => sf('supplier_name',e.target.value)}/></FG>
            <Grid2>
              <FG label="Project"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('project_id')||''} onChange={e => sf('project_id',e.target.value)}><option value="">—</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FG>
              <FG label="Invoice Number"><input style={fieldStyle} value={gv('invoice_number')||''} onChange={e => sf('invoice_number',e.target.value)}/></FG>
              <FG label="Invoice Date"><input style={fieldStyle} type="date" value={gv('invoice_date')||today()} onChange={e => sf('invoice_date',e.target.value)}/></FG>
              <FG label="Due Date"><input style={fieldStyle} type="date" value={gv('due_date')||''} onChange={e => sf('due_date',e.target.value)}/></FG>
              <FG label="Amount (₹) *"><input style={fieldStyle} type="number" value={gv('amount')||''} onChange={e => sf('amount',Number(e.target.value))}/></FG>
              <FG label="PO Number"><input style={fieldStyle} value={gv('po_number')||''} onChange={e => sf('po_number',e.target.value)}/></FG>
              <FG label="Status"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('status')||'Pending'} onChange={e => sf('status',e.target.value)}>{PAY_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FG>
            </Grid2>
            <FG label="Remarks"><textarea style={{ ...fieldStyle, minHeight:'60px', resize:'vertical' }} value={gv('remarks')||''} onChange={e => sf('remarks',e.target.value)}/></FG>
          </Sheet>
        )}

        {sheet === 'pay-pay' && selectedPayable && (
          <Sheet title={`Pay: ${selectedPayable.supplier_name}`} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addPayablePayment(selectedPayable.id, form))} style={{ ...btnP, flex:1 }}>Record</button></>}>
            <div style={{ padding:'12px 14px', marginBottom:'16px', background:C.mist, borderRadius:'12px' }}>
              <div style={{ fontSize:'12px', color:C.slate }}>Outstanding: <strong style={{ color:C.red }}>{fmtCur(selectedPayable.outstanding)}</strong></div>
            </div>
            <Grid2>
              <FG label="Payment Date"><input style={fieldStyle} type="date" value={gv('payment_date')||today()} onChange={e => sf('payment_date',e.target.value)}/></FG>
              <FG label="Amount (₹) *"><input style={fieldStyle} type="number" value={gv('amount')||''} onChange={e => sf('amount',Number(e.target.value))}/></FG>
              <FG label="Bank Account"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('bank_account_id')||''} onChange={e => sf('bank_account_id',e.target.value)}><option value="">Cash</option>{fin.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FG>
              <FG label="Reference"><input style={fieldStyle} value={gv('reference')||''} onChange={e => sf('reference',e.target.value)}/></FG>
            </Grid2>
          </Sheet>
        )}
      </div>
    )

    // ── CASH BOOK ─────────────────────────────────────────────
    if (mod === 'cashbook') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
          <button style={btnP} onClick={() => { setForm({ txn_date:today(), txn_type:'Debit' }); setEditId(null); setSheet('cash-entry') }}>＋ Add Entry</button>
        </div>
        {/* Running total */}
        <div style={{ ...card, padding:'16px', marginBottom:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', textAlign:'center' }}>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', marginBottom:'5px' }}>Total In</div><div style={{ fontSize:'17px', fontWeight:800, color:C.green }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Credit').reduce((s,e)=>s+e.amount,0))}</div></div>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', marginBottom:'5px' }}>Total Out</div><div style={{ fontSize:'17px', fontWeight:800, color:C.red }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Debit').reduce((s,e)=>s+e.amount,0))}</div></div>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', marginBottom:'5px' }}>Net</div><div style={{ fontSize:'17px', fontWeight:800, color:C.navy }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Credit').reduce((s,e)=>s+e.amount,0) - fin.cashBook.filter(e=>e.txn_type==='Debit').reduce((s,e)=>s+e.amount,0))}</div></div>
          </div>
        </div>
        {!fin.cashBook.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No cash book entries yet.</div>}
        <div style={{ ...card }}>
          {fin.cashBook.map(e => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: e.txn_type==='Credit'?C.green:C.red, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'14px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{fmtDate(e.txn_date)} · {e.category}{(e as any).project?.name?' · '+(e as any).project.name:''}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'15px', fontWeight:700, color: e.txn_type==='Credit'?C.green:C.red }}>{e.txn_type==='Credit'?'+':'-'}{fmtCur(e.amount)}</div>
                {e.reference && <div style={{ fontSize:'10px', color:C.slate }}>{e.reference}</div>}
              </div>
              <button onClick={() => { setForm({ ...e, txn_date:e.txn_date, project_id:e.project_id??'', bank_account_id:e.bank_account_id??'' }); setEditId(e.id); setSheet('cash-entry') }} style={{ ...btnG, padding:'6px 10px' , display:'flex', alignItems:'center' }}><Ico icon={PencilIcon} size={14}/></button>
              <button onClick={() => { if(confirm('Delete?')) fin.deleteCashEntry(e.id) }} style={btnD}><Ico icon={XMarkIcon} size={16}/></button>
            </div>
          ))}
        </div>

        {sheet === 'cash-entry' && (
          <Sheet title={editId ? 'Edit Cash Book Entry' : 'Add Cash Book Entry'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateCashEntry(editId, form) : fin.addCashEntry(form))} style={{ ...btnP, flex:1 }}>Save</button></>}>
            <Grid2>
              <FG label="Date"><input style={fieldStyle} type="date" value={gv('txn_date')||today()} onChange={e => sf('txn_date',e.target.value)}/></FG>
              <FG label="Type"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('txn_type')||'Debit'} onChange={e => sf('txn_type',e.target.value)}>{['Credit','Debit','Transfer'].map(t=><option key={t}>{t}</option>)}</select></FG>
              <FG label="Category"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('category')||''} onChange={e => sf('category',e.target.value)}><option value="">—</option>{CASH_CATS.map(c=><option key={c}>{c}</option>)}</select></FG>
              <FG label="Amount (₹) *"><input style={fieldStyle} type="number" value={gv('amount')||''} onChange={e => sf('amount',Number(e.target.value))}/></FG>
              <FG label="Project"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('project_id')||''} onChange={e => sf('project_id',e.target.value)}><option value="">—</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FG>
              <FG label="Bank Account"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('bank_account_id')||''} onChange={e => sf('bank_account_id',e.target.value)}><option value="">Cash</option>{fin.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></FG>
              <FG label="Reference"><input style={fieldStyle} value={gv('reference')||''} onChange={e => sf('reference',e.target.value)}/></FG>
            </Grid2>
            <FG label="Description *"><input style={fieldStyle} value={gv('description')||''} onChange={e => sf('description',e.target.value)} placeholder="e.g. Labour payment — Kottathara site"/></FG>
          </Sheet>
        )}
      </div>
    )

    // ── BANK ACCOUNTS ─────────────────────────────────────────
    if (mod === 'banks') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
          {fin.accounts.length > 0 && <button style={btnP} onClick={() => { setForm({ account_type:'Current', opening_balance:0, current_balance:0 }); setEditId(null); setSheet('bank') }}>＋ Add Account</button>}
        </div>
        <StatGrid tiles={[
          {label:'Total Balance', value:fmtCur(s.totalBankBalance), accent:s.totalBankBalance>=0?C_.success:C_.danger},
          {label:'Accounts',      value:String(fin.accounts.length)},
        ]}/>
        {!fin.accounts.length && (
          <div style={{ textAlign:'center', padding:'40px' }}>
            <div style={{ color:C.slate, marginBottom:'12px' }}>No bank accounts added yet.</div>
            <button style={btnP} onClick={() => { setForm({ account_type:'Current', opening_balance:0, current_balance:0 }); setEditId(null); setSheet('bank') }}>＋ Add First Account</button>
          </div>
        )}
        {fin.accounts.map(a => (
          <div key={a.id} style={{ ...card, marginBottom:space[3] }}>
            <div style={{ padding:`${space[3]} ${space[4]}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[2] }}>
                <div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.ink }}>{a.name}</div>
                  <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{a.bank_name} · {a.account_type}</div>
                  {a.account_number && <div style={{ fontSize:'12px', color:C.slate }}>••••{a.account_number.slice(-4)}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'22px', fontWeight:800, letterSpacing:'-0.02em', color: a.current_balance >= 0 ? C.navy : C_.danger }}>{fmtCur(a.current_balance)}</div>
                  <div style={{ fontSize:'11px', color:C.slate, marginTop:'2px' }}>Opening: {fmtCur(a.opening_balance)}</div>
                </div>
              </div>
              {a.notes && <div style={{ fontSize:'12px', color:C.slate, padding:space[2], background:C.mist, borderRadius:R.md }}>{a.notes}</div>}
            </div>
            <div style={{ padding:`${space[2]} ${space[4]} ${space[3]}`, display:'flex', gap:space[2], borderTop:`1px solid ${C_.divider}` }}>
              <button style={btnG} onClick={() => { setForm({ ...a }); setEditId(a.id); setSheet('bank') }}>Edit</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteAccount(a.id) }}>Delete</button>
            </div>
          </div>
        ))}

        {sheet === 'bank' && (
          <Sheet title={editId ? 'Edit Account' : 'Add Bank Account'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateAccount(editId, form) : fin.addAccount(form))} style={{ ...btnP, flex:1 }}>Save</button></>}>
            <FG label="Account Name *"><input style={fieldStyle} value={gv('name')||''} onChange={e => sf('name',e.target.value)} placeholder="e.g. SBI Current A/C, Canara OD"/></FG>
            <Grid2>
              <FG label="Bank Name *"><input style={fieldStyle} value={gv('bank_name')||''} onChange={e => sf('bank_name',e.target.value)}/></FG>
              <FG label="Account Type"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('account_type')||'Current'} onChange={e => sf('account_type',e.target.value)}>{['Current','Savings','Overdraft','Cash'].map(t=><option key={t}>{t}</option>)}</select></FG>
              <FG label="Account Number"><input style={fieldStyle} value={gv('account_number')||''} onChange={e => sf('account_number',e.target.value)}/></FG>
              <FG label="IFSC Code"><input style={fieldStyle} value={gv('ifsc')||''} onChange={e => sf('ifsc',e.target.value)}/></FG>
              <FG label="Opening Balance (₹)"><input style={fieldStyle} type="number" value={gv('opening_balance')||0} onChange={e => sf('opening_balance',Number(e.target.value))}/></FG>
              <FG label="Current Balance (₹)"><input style={fieldStyle} type="number" value={gv('current_balance')||0} onChange={e => sf('current_balance',Number(e.target.value))}/></FG>
            </Grid2>
            <FG label="Notes"><textarea style={{ ...fieldStyle, minHeight:'60px', resize:'vertical' }} value={gv('notes')||''} onChange={e => sf('notes',e.target.value)}/></FG>
          </Sheet>
        )}
      </div>
    )

    // ── CASH FLOW FORECAST ────────────────────────────────────
    if (mod === 'forecast') {
      const forecast = fin.buildForecast(forecastDays)
      const totalIn = forecast.reduce((s,d)=>s+d.inflow,0)
      const totalOut = forecast.reduce((s,d)=>s+d.outflow,0)
      return (
        <div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
            {[7,30,90].map(d => <button key={d} onClick={() => setForecastDays(d)} style={{ ...(forecastDays===d?btnP:btnG) }}>{d} Days</button>)}
          </div>
          <StatGrid tiles={[
            {label:'Expected In',  value:fmtCur(totalIn),  accent:C_.success},
            {label:'Expected Out', value:fmtCur(totalOut), alert:true},
            {label:'Net',          value:fmtCur(totalIn-totalOut), alert:(totalIn-totalOut)<0, accent:(totalIn-totalOut)>=0?C_.success:undefined},
          ]}/>
          {!forecast.filter(d=>d.items.length>0).length
            ? <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No scheduled events in the next {forecastDays} days.<br/>Add receivables, payables, and funding with due dates to see the forecast.</div>
            : forecast.filter(d => d.items.length > 0).map((day, i) => (
              <div key={day.date} style={{ ...card, marginBottom:'12px' }}>
                <div style={{ padding:'12px 16px', background:C.mist, borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontSize:'14px', fontWeight:700 }}>{day.label}</div>
                  <div style={{ fontSize:'12px' }}>
                    {day.inflow > 0 && <span style={{ color:C.green, marginRight:'12px' }}>+{fmtCur(day.inflow)}</span>}
                    {day.outflow > 0 && <span style={{ color:C.red, marginRight:'12px' }}>-{fmtCur(day.outflow)}</span>}
                    <span style={{ fontWeight:700, color:C.navy }}>Balance: {fmtCur(day.closingBalance)}</span>
                  </div>
                </div>
                {day.items.map((item, j) => (
                  <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'11px 16px', borderBottom:`1px solid ${C.border}`, fontSize:'13px' }}>
                    <div>
                      <span style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color: item.direction==='in'?C.green:C.red, marginRight:'8px' }}>{item.type}</span>
                      {item.description}
                    </div>
                    <div style={{ fontWeight:600, color: item.direction==='in'?C.green:C.red, whiteSpace:'nowrap', marginLeft:'12px' }}>
                      {item.direction==='in'?'+':'-'}{fmtCur(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ))
          }
          {/* Warning if balance goes negative */}
          {forecast.some(d => d.closingBalance < 0) && (
            <div style={{ padding:'14px 16px', background:C.redBg, borderLeft:`3px solid ${C.red}`, borderRadius:'0 14px 14px 0', marginTop:'14px', fontSize:'13px' }}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'4px'}}><Ico icon={ExclamationTriangleIcon} size={14}/><strong>Cash shortfall projected</strong></span>{' — balance goes negative within '}{forecastDays}{' days. Review payables or accelerate receivables.'}
            </div>
          )}
        </div>
      )
    }

    // ── PROFITABILITY ─────────────────────────────────────────
    if (mod === 'profitability') {
      const profits = calcProfitability()
      return (
        <div>
          {!profits.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No projects found.</div>}
          {profits.map(p => (
            <div key={p.project_id} style={{ ...card, marginBottom:'14px' }}>
              <div style={{ height:'4px', background: p.profit_pct >= 15 ? C.green : p.profit_pct >= 5 ? C.amber : C.red }}/>
              <div style={{ padding:'16px' }}>
                <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'14px' }}>{p.project_name}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
                  {[
                    ['Contract Value', fmtCur(p.contract_value), C.navy],
                    ['Work Done', fmtCur(p.work_done_value), C.blue],
                    ['Total Expenses', fmtCur(p.total_expenses), C.amber],
                    ['Material Cost', fmtCur(p.material_cost), C.slate],
                    ['Labour Cost', fmtCur(p.labour_cost), C.slate],
                    ['Gross Profit', fmtCur(p.gross_profit), p.gross_profit >= 0 ? C.green : C.red],
                    ['Profit %', p.profit_pct.toFixed(1)+'%', p.profit_pct >= 15 ? C.green : p.profit_pct >= 5 ? C.amber : C.red],
                    ['Cash Received', fmtCur(p.cash_received), C.green],
                    ['Outstanding', fmtCur(p.outstanding_amount), C.teal],
                  ].map(([label, value, color]) => (
                    <div key={String(label)} style={{ padding:'10px', background:C.mist, borderRadius:'10px', textAlign:'center' }}>
                      <div style={{ fontSize:'9px', fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>{label}</div>
                      <div style={{ fontSize:'13px', fontWeight:800, color:String(color) }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // ── TIMELINE ──────────────────────────────────────────────
    if (mod === 'timeline') {
      const events = buildTimeline()
      return (
        <div>
          {!events.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No financial events yet.</div>}
          <div style={{ position:'relative', paddingLeft:'32px' }}>
            <div style={{ position:'absolute', left:'10px', top:0, bottom:0, width:'2px', background:C.border }}/>
            {events.slice(0, 50).map((e, i) => (
              <div key={i} style={{ position:'relative', marginBottom:'16px' }}>
                <div style={{ position:'absolute', left:'-26px', top:'4px', width:'12px', height:'12px', borderRadius:'50%', background:e.color, border:`2px solid #fff`, boxShadow:`0 0 0 2px ${C.border}` }}/>
                <div style={{ fontSize:'11px', color:C.slate, marginBottom:'4px' }}>{fmtDate(e.date)}</div>
                <div style={{ ...card, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'10px', fontWeight:700, color:e.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>{e.type}</div>
                      <div style={{ fontSize:'13px', fontWeight:500 }}>{e.desc}</div>
                    </div>
                    <div style={{ fontSize:'14px', fontWeight:700, color:e.dir==='in'?C.green:C.red, marginLeft:'12px', whiteSpace:'nowrap' }}>
                      {e.dir==='in'?'+':'-'}{fmtCur(e.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // ── CREDENTIALS ──────────────────────────────────────────
    if (mod === 'credentials') {
      const CRED_CATS = ['General','Government Portal','Client Portal','Vendor Portal','Banking','Email','Other']

      const loadCreds = async () => {
        const { data } = await supabase.from('vault_credentials').select('*').order('category').order('name')
        if (data) setCredentials(data)
      }
      // Load once on mount - credentials.length===0 check prevents re-fetch while data exists
      // This is safe because setCredentials triggers re-render, not loadCreds again

      const saveCred = async () => {
                if (editId) {
          const { error } = await supabase.from('vault_credentials').update(form).eq('id', editId)
          if (error) { alert('Error: ' + error.message); return }
        } else {
          const { error } = await supabase.from('vault_credentials').insert({ ...form, created_by: currentUser.id })
          if (error) { alert('Error: ' + error.message); return }
        }
        setSheet(null); setForm({}); setEditId(null)
        loadCreds()
      }

      const deleteCred = async (id: string) => {
                if (!confirm('Delete this credential?')) return
        await supabase.from('vault_credentials').delete().eq('id', id)
        loadCreds()
      }

      // Group by category
      const grouped = credentials.reduce((acc: any, c: any) => {
        const cat = c.category || 'General'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(c)
        return acc
      }, {})

      return (
        <div>
          <div style={{ padding:'12px 0 4px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:'13px', color:C.slate }}>Director-only · Not visible to team</div>
            <button style={btnP} onClick={() => { setForm({ category:'General' }); setEditId(null); setSheet('cred') }}>＋ Add</button>
          </div>

          {credentials.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px', textAlign:'center' }}>
              <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div style={{ fontSize:'16px', fontWeight:700, color:C.navy, marginBottom:'6px' }}>No Credentials Saved</div>
              <div style={{ fontSize:'13px', color:C.slate, lineHeight:1.6, marginBottom:'20px' }}>Store portal logins, vendor credentials and client access details securely.</div>
              <button style={btnP} onClick={() => { setForm({ category:'General' }); setEditId(null); setSheet('cred') }}>＋ Add First Credential</button>
            </div>
          )}

          {Object.entries(grouped).map(([cat, creds]: [string, any]) => (
            <div key={cat} style={{ marginBottom:'20px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px', paddingLeft:'2px' }}>{cat}</div>
              <div style={{ ...card }}>
                {(creds as any[]).map((c: any, i: number) => (
                  <div key={c.id} style={{ padding:'14px 16px', borderBottom: i < creds.length-1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                      <div>
                        <div style={{ fontSize:'15px', fontWeight:700, color:C.navy }}>{c.name}</div>
                        {c.url && <div style={{ fontSize:'12px', color:C.teal, marginTop:'2px', cursor:'pointer' }} onClick={() => window.open(c.url.startsWith('http') ? c.url : 'https://'+c.url, '_blank')}>{c.url} ↗</div>}
                      </div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button style={btnG} onClick={() => { setForm({...c}); setEditId(c.id); setSheet('cred') }}>Edit</button>
                        <button style={btnD} onClick={() => deleteCred(c.id)}><Ico icon={XMarkIcon} size={16}/></button>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      {c.username && (
                        <div style={{ padding:'10px 12px', background:C.mist, borderRadius:'10px' }}>
                          <div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>Username</div>
                          <div style={{ fontSize:'13px', fontWeight:600, color:C.navy, display:'flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.username}</span>
                            <button onClick={() => { navigator.clipboard.writeText(c.username); alert('Copied!') }}
                              style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', color:C.slate, display:'flex', alignItems:'center' }}><Ico icon={ClipboardDocumentCheckIcon} size={16}/></button>
                          </div>
                        </div>
                      )}
                      {c.password && (
                        <div style={{ padding:'10px 12px', background:C.mist, borderRadius:'10px' }}>
                          <div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>Password</div>
                          <div style={{ fontSize:'13px', fontWeight:600, color:C.navy, display:'flex', alignItems:'center', gap:'6px' }}>
                            <span style={{ flex:1, letterSpacing: showPass[c.id] ? 'normal' : '0.15em' }}>
                              {showPass[c.id] ? c.password : '••••••••'}
                            </span>
                            <button onClick={() => setShowPass(p => ({...p, [c.id]: !p[c.id]}))}
                              style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', color:C.slate, fontSize:'12px' }}>
                              {showPass[c.id] ? <Ico icon={EyeSlashIcon} size={16}/> : <Ico icon={EyeIcon} size={16}/>}
                            </button>
                            <button onClick={() => { navigator.clipboard.writeText(c.password); alert('Copied!') }}
                              style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', color:C.slate, display:'flex', alignItems:'center' }}><Ico icon={ClipboardDocumentCheckIcon} size={16}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                    {c.notes && <div style={{ marginTop:'8px', fontSize:'12px', color:C.slate, padding:'8px 10px', background:C.mist, borderRadius:'8px', lineHeight:1.5 }}>{c.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {sheet === 'cred' && (
            <Sheet title={editId ? 'Edit Credential' : 'Add Credential'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={saveCred} style={{ ...btnP, flex:1 }}>Save</button></>}>
              <FG label="Name *"><input style={fieldStyle} value={gv('name')||''} onChange={e => sf('name',e.target.value)} placeholder="e.g. NHM Kerala Portal"/></FG>
              <FG label="Category"><select style={{ ...fieldStyle, appearance:'none' }} value={gv('category')||'General'} onChange={e => sf('category',e.target.value)}>{CRED_CATS.map(c=><option key={c}>{c}</option>)}</select></FG>
              <FG label="URL"><input style={fieldStyle} value={gv('url')||''} onChange={e => sf('url',e.target.value)} placeholder="https://..." type="url"/></FG>
              <FG label="Username / Email"><input style={fieldStyle} value={gv('username')||''} onChange={e => sf('username',e.target.value)} autoComplete="off"/></FG>
              <FG label="Password"><input style={fieldStyle} value={gv('password')||''} onChange={e => sf('password',e.target.value)} type="text" autoComplete="new-password"/></FG>
              <FG label="Notes"><textarea style={{ ...fieldStyle, minHeight:'70px', resize:'vertical' }} value={gv('notes')||''} onChange={e => sf('notes',e.target.value)} placeholder="Any additional access details..."/></FG>
            </Sheet>
          )}
        </div>
      )
    }

    return null
  }

  // ── MAIN RENDER ──────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'15px', color:C.ink, paddingBottom:'80px' }}>
      {/* Navy Hero Header */}
      <div style={{ background: C.navy, padding:`${space[4]} ${space[4]} 0` }}>
        <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:space[1] }}>
          Director's Vault
        </div>
        <div style={{ fontSize:'28px', fontWeight:800, color:'#fff', letterSpacing:'-0.025em', lineHeight:1.1, marginBottom:'3px' }}>
          {fmtCur(s.cashPosition)}
        </div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,.45)', marginBottom:space[4] }}>
          Cash position · {fin.accounts.length} account{fin.accounts.length===1?'':'s'} · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
        </div>
        {/* 30-day strip */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:space[2], marginBottom:space[4] }}>
          {[
            ['30-Day In',  fmtCur(s.expectedInflowThirtyDays),  '#34d399'],
            ['30-Day Out', fmtCur(s.expectedOutflowThirtyDays), '#f87171'],
            ['Net',        fmtCur(s.netCashProjection),          s.netCashProjection >= 0 ? '#34d399' : '#f87171'],
          ].map(([lbl,val,col]) => (
            <div key={lbl as string} style={{ background:'rgba(255,255,255,.07)', borderRadius:R.md, padding:space[3] }}>
              <div style={{ fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'3px' }}>{lbl}</div>
              <div style={{ fontSize:'15px', fontWeight:800, color: col as string }}>{val}</div>
            </div>
          ))}
        </div>
        {/* Module tabs inside hero */}
        <div data-no-swipe="true" style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', display:'flex', marginBottom:'-1px' }}>
          {MODULES.map(m => (
            <button key={m.key} onClick={() => setMod(m.key)}
              style={{ padding:`${space[2]} ${space[3]}`, fontSize:'12px', fontWeight:mod===m.key?700:500, color:mod===m.key?'#fff':'rgba(255,255,255,.4)', border:'none', background:'transparent', borderBottom:`2px solid ${mod===m.key?'#fff':'transparent'}`, whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', marginBottom:'-1px', transition:'color .15s' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Module content */}
      <div style={{ padding:`${space[4]} ${space[4]} 0` }}>
        {renderModule()}
      </div>
    </div>
  )
}
