import { useState } from 'react'
import { useFinance, calcInterestAccrued, calcMonthlyInterest } from '../hooks/useFinance'
import type { User, Project } from '../types'
import type {
  Funding, Receivable, Payable, CashBookEntry,
  BankAccount, FundingCategory, InterestType, BillStatus, PayableStatus
} from '../types/finance'

// ── SHARED STYLE TOKENS (match existing app) ─────────────────
const C = {
  navy:'#0d2144', blue:'#1a4b8f', gold:'#c9943a', white:'#fff',
  ash:'#f5f7fb', mist:'#eef1f7', border:'#e2e8f3', border2:'#cdd6e8',
  ink:'#1e293b', body:'#374151', slate:'#64748b', faint:'#94a3b8',
  green:'#16a34a', greenBg:'#f0fdf4', amber:'#d97706', amberBg:'#fffbeb',
  red:'#dc2626', redBg:'#fef2f2', teal:'#0891b2', tealBg:'#f0f9ff',
}
const card = { background:'#fff', border:`1px solid ${C.border}`, borderRadius:'12px', boxShadow:'0 1px 3px rgba(13,33,68,.07)', overflow:'hidden' }
const btnP = { padding:'9px 16px', background:C.blue, color:'#fff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:'6px' } as const
const btnG = { padding:'7px 12px', background:'transparent', color:C.slate, border:`1.5px solid ${C.border}`, borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' } as const
const btnD = { padding:'6px 10px', background:C.redBg, color:C.red, border:'1.5px solid #fecaca', borderRadius:'6px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' } as const
const fieldStyle = { width:'100%', padding:'11px 13px', border:`1.5px solid ${C.border}`, borderRadius:'6px', fontSize:'14px', color:C.ink, background:'#fff', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }
const fieldLabel = { display:'block' as const, fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase' as const, marginBottom:'6px' }
const goldRule = { width:'28px', height:'2.5px', background:C.gold, borderRadius:'2px', marginTop:'5px' }

function fmtCur(n?: number | null) { if(!n)return'₹0'; if(n>=1e7)return'₹'+(n/1e7).toFixed(2)+'Cr'; if(n>=1e5)return'₹'+(n/1e5).toFixed(2)+'L'; if(n>=1000)return'₹'+(n/1000).toFixed(1)+'K'; return'₹'+Math.round(n).toLocaleString('en-IN') }
function fmtDate(d?: string | null) { if(!d)return'—'; return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }
function today() { return new Date().toISOString().split('T')[0] }

type FinModule = 'dashboard'|'funding'|'receivables'|'payables'|'cashbook'|'banks'|'forecast'|'profitability'|'timeline'

// ── SHEET COMPONENT ──────────────────────────────────────────
function Sheet({ title, children, onClose, footer }: { title:string; children:React.ReactNode; onClose:()=>void; footer?:React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(13,33,68,.5)', zIndex:100, display:'flex', alignItems:'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', width:'100%', borderRadius:'16px 16px 0 0', maxHeight:'92vh', display:'flex', flexDirection:'column', fontFamily:"'Inter',system-ui,sans-serif", animation:'slideUp .22s ease-out' }}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ width:'36px', height:'4px', background:C.border2, borderRadius:'2px', margin:'10px auto 0' }}/>
        <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div><div style={{ fontSize:'17px', fontWeight:700, color:C.navy }}>{title}</div><div style={goldRule}/></div>
          <button onClick={onClose} style={{ width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:C.slate, fontSize:'18px', cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>{children}</div>
        {footer && <div style={{ padding:'12px 16px 28px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'10px', flexShrink:0, background:'#fff' }}>{footer}</div>}
      </div>
    </div>
  )
}

function FG({ label:lbl, children }: { label:string; children:React.ReactNode }) {
  return <div style={{ marginBottom:'14px' }}><label style={fieldLabel}>{lbl}</label>{children}</div>
}
function Grid2({ children }: { children:React.ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>{children}</div>
}

// ── STATUS BADGES ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string,[string,string]> = {
    Active:['#eff6ff',C.blue], 'Partially Repaid':['#fffbeb',C.amber], Closed:['#f0fdf4',C.green], Overdue:[C.redBg,C.red],
    Draft:[C.mist,C.slate], Submitted:['#eff6ff',C.blue], Approved:['#f0fdf4',C.green],
    'Partially Paid':['#fffbeb',C.amber], Paid:['#f0fdf4',C.green],
    Pending:[C.mist,C.slate], Disputed:[C.redBg,C.red],
  }
  const [bg, color] = map[status] ?? [C.mist, C.slate]
  return <span style={{ padding:'3px 8px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background:bg, color }}>{status}</span>
}

// ── SUMMARY CARD ─────────────────────────────────────────────
function SumCard({ label, value, sub, accent, alert }: { label:string; value:string; sub?:string; accent?:string; alert?:boolean }) {
  return (
    <div style={{ ...card, padding:'14px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background:alert?C.red:accent??C.blue, borderRadius:'12px 0 0 12px' }}/>
      <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'6px', paddingLeft:'6px' }}>{label}</div>
      <div style={{ fontSize:'18px', fontWeight:800, color:alert?C.red:C.navy, letterSpacing:'-0.02em', paddingLeft:'6px' }}>{value}</div>
      {sub && <div style={{ fontSize:'11px', color:C.slate, marginTop:'4px', paddingLeft:'6px' }}>{sub}</div>}
    </div>
  )
}

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
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null)

  function sf(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })) }
  function gv(key: string) { return form[key] ?? '' }

  async function save(fn: () => Promise<string | null>) {
    const err = await fn()
    if (err) alert('Error: ' + err)
    else { setSheet(null); setForm({}); setEditId(null) }
  }

  const MODULES: { key: FinModule; label: string; icon: string }[] = [
    { key:'dashboard',      label:'Dashboard',     icon:'⚡' },
    { key:'funding',        label:'Funding',       icon:'💰' },
    { key:'receivables',    label:'Receivables',   icon:'📥' },
    { key:'payables',       label:'Payables',      icon:'📤' },
    { key:'cashbook',       label:'Cash Book',     icon:'📒' },
    { key:'banks',          label:'Bank Accounts', icon:'🏦' },
    { key:'forecast',       label:'Cash Flow',     icon:'📈' },
    { key:'profitability',  label:'Profitability', icon:'📊' },
    { key:'timeline',       label:'Timeline',      icon:'🗓' },
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
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <SumCard label="Cash & Bank" value={fmtCur(s.cashPosition)} sub={`${fin.accounts.length} accounts`} accent={C.blue}/>
          <SumCard label="Net 30-Day" value={fmtCur(s.netCashProjection)} sub="projected balance" accent={s.netCashProjection < 0 ? C.red : C.green} alert={s.netCashProjection < 0}/>
          <SumCard label="Receivables" value={fmtCur(s.outstandingReceivables)} sub={s.overdueReceivables > 0 ? `${fmtCur(s.overdueReceivables)} overdue` : 'All current'} accent={C.teal}/>
          <SumCard label="Payables" value={fmtCur(s.outstandingPayables)} sub={s.overduePayables > 0 ? `${fmtCur(s.overduePayables)} overdue` : 'All current'} alert={s.overduePayables > 0} accent={C.amber}/>
          <SumCard label="Total Funding" value={fmtCur(s.totalActiveFunding)} sub="outstanding principal" accent={C.navy}/>
          <SumCard label="Interest/Month" value={fmtCur(s.interestDueThisMonth)} sub="across all loans" alert={s.interestDueThisMonth > 50000} accent={C.red}/>
        </div>

        {/* Cash flow 30-day summary */}
        <div style={{ ...card, padding:'14px', marginBottom:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:700, color:C.navy, marginBottom:'12px' }}>30-Day Cash Flow Snapshot</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'4px' }}>Expected In</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:C.green }}>{fmtCur(s.expectedInflowThirtyDays)}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'4px' }}>Expected Out</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:C.red }}>{fmtCur(s.expectedOutflowThirtyDays)}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'10px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'4px' }}>Net Position</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:s.netCashProjection >= 0 ? C.green : C.red }}>{fmtCur(s.netCashProjection)}</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(s.overdueReceivables > 0 || s.overduePayables > 0 || s.overdueFunding > 0) && (
          <div style={{ marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:'8px' }}>⚠ Financial Alerts</div>
            {s.overdueReceivables > 0 && <div style={{ padding:'10px 12px', background:C.redBg, borderLeft:`3px solid ${C.red}`, borderRadius:'0 6px 6px 0', marginBottom:'6px', fontSize:'13px', cursor:'pointer' }} onClick={() => setMod('receivables')}>Overdue receivables: <strong>{fmtCur(s.overdueReceivables)}</strong> — clients haven't paid</div>}
            {s.overduePayables > 0 && <div style={{ padding:'10px 12px', background:C.amberBg, borderLeft:`3px solid ${C.amber}`, borderRadius:'0 6px 6px 0', marginBottom:'6px', fontSize:'13px', cursor:'pointer' }} onClick={() => setMod('payables')}>Overdue payables: <strong>{fmtCur(s.overduePayables)}</strong> — vendors waiting</div>}
            {s.overdueFunding > 0 && <div style={{ padding:'10px 12px', background:C.redBg, borderLeft:`3px solid ${C.red}`, borderRadius:'0 6px 6px 0', marginBottom:'6px', fontSize:'13px', cursor:'pointer' }} onClick={() => setMod('funding')}>Overdue loan repayments: <strong>{fmtCur(s.overdueFunding)}</strong></div>}
          </div>
        )}

        {/* Bank accounts quick view */}
        {fin.accounts.length > 0 && (
          <div style={{ ...card, marginBottom:'16px' }}>
            <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}`, fontSize:'13px', fontWeight:700, color:C.navy }}>Bank Accounts</div>
            {fin.accounts.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 14px', borderBottom:`1px solid ${C.border}` }}>
                <div><div style={{ fontSize:'13px', fontWeight:600 }}>{a.name}</div><div style={{ fontSize:'11px', color:C.slate }}>{a.bank_name} · {a.account_type}</div></div>
                <div style={{ fontSize:'15px', fontWeight:800, color: a.current_balance >= 0 ? C.navy : C.red }}>{fmtCur(a.current_balance)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming payments this week */}
        {(() => {
          const week = new Date(); week.setDate(week.getDate() + 7)
          const upcoming = [
            ...fin.receivables.filter(r => r.expected_date && new Date(r.expected_date) <= week && r.status !== 'Paid').map(r => ({ label: `Receive: ${r.client_name}`, amount: r.balance ?? 0, date: r.expected_date!, dir: 'in' as const })),
            ...fin.payables.filter(p => p.due_date && new Date(p.due_date) <= week && p.status !== 'Paid').map(p => ({ label: `Pay: ${p.supplier_name}`, amount: p.outstanding ?? 0, date: p.due_date!, dir: 'out' as const })),
          ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          if (!upcoming.length) return null
          return (
            <div style={{ ...card, marginBottom:'16px' }}>
              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}`, fontSize:'13px', fontWeight:700, color:C.navy }}>This Week's Commitments</div>
              {upcoming.map((u, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                  <div><div style={{ fontSize:'13px', fontWeight:500 }}>{u.label}</div><div style={{ fontSize:'11px', color:C.slate }}>{fmtDate(u.date)}</div></div>
                  <div style={{ fontSize:'14px', fontWeight:700, color: u.dir === 'in' ? C.green : C.red }}>{u.dir === 'in' ? '+' : '-'}{fmtCur(u.amount)}</div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    )

    // ── FUNDING ───────────────────────────────────────────────
    if (mod === 'funding') return (
      <div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
          <button style={btnP} onClick={() => { setForm({ interest_type:'None', interest_rate:0, status:'Active' }); setEditId(null); setSheet('funding') }}>＋ Add Funding</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <SumCard label="Total Borrowed" value={fmtCur(fin.funding.reduce((s,f)=>s+f.amount_received,0))} accent={C.navy}/>
          <SumCard label="Outstanding" value={fmtCur(s.totalActiveFunding)} accent={C.amber}/>
          <SumCard label="Interest/Month" value={fmtCur(s.interestDueThisMonth)} accent={C.red}/>
          <SumCard label="Active Loans" value={String(fin.funding.filter(f=>f.status==='Active'||f.status==='Partially Repaid').length)} accent={C.blue}/>
        </div>
        {!fin.funding.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No funding records yet.</div>}
        {fin.funding.map(f => {
          const outstanding = f.amount_received - f.amount_repaid
          const interest = calcInterestAccrued(f)
          return (
            <div key={f.id} style={{ ...card, marginBottom:'12px' }}>
              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                  <div style={{ flex:1 }}><div style={{ fontSize:'14px', fontWeight:700 }}>{f.source_name}</div><div style={{ fontSize:'11px', color:C.slate, marginTop:'2px' }}>{f.category} · {f.lender_name || '—'}</div></div>
                  <StatusBadge status={f.status}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginTop:'10px' }}>
                  <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Received</div><div style={{ fontSize:'14px', fontWeight:700, color:C.navy, marginTop:'2px' }}>{fmtCur(f.amount_received)}</div></div>
                  <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Outstanding</div><div style={{ fontSize:'14px', fontWeight:700, color:outstanding>0?C.red:C.green, marginTop:'2px' }}>{fmtCur(outstanding)}</div></div>
                  <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Interest Accrued</div><div style={{ fontSize:'14px', fontWeight:700, color:C.amber, marginTop:'2px' }}>{fmtCur(interest)}</div></div>
                </div>
                <div style={{ marginTop:'10px', display:'flex', gap:'8px', flexWrap:'wrap', fontSize:'12px', color:C.slate }}>
                  <span>Received: {fmtDate(f.date_received)}</span>
                  {f.repayment_date && <span style={{ color:(f.days_overdue??0)>0?C.red:C.slate }}>Due: {fmtDate(f.repayment_date)}{(f.days_overdue??0)>0?` (${f.days_overdue}d overdue)`:f.days_remaining!==null&&f.days_remaining!==undefined?` (${f.days_remaining}d left)`:''}</span>}
                  {f.interest_type !== 'None' && <span>Rate: {f.interest_rate}% {f.interest_type} → {fmtCur(calcMonthlyInterest(f))}/mo</span>}
                </div>
                {f.notes && <div style={{ marginTop:'8px', fontSize:'12px', color:C.slate, padding:'8px', background:C.mist, borderRadius:'6px' }}>{f.notes}</div>}
              </div>
              <div style={{ padding:'10px 14px', display:'flex', gap:'8px' }}>
                <button style={btnP} onClick={() => { setSelectedFunding(f); setForm({ principal:0, interest:0 }); setSheet('repay') }}>Record Repayment</button>
                <button style={btnG} onClick={() => { setForm({ ...f, date_received:f.date_received, repayment_date:f.repayment_date??'' }); setEditId(f.id); setSheet('funding') }}>Edit</button>
                <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteFunding(f.id) }}>Delete</button>
              </div>
            </div>
          )
        })}

        {/* Funding Sheet */}
        {sheet === 'funding' && (
          <Sheet title={editId ? 'Edit Funding' : 'Add Funding'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateFunding(editId, form) : fin.addFunding(form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
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
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addRepayment(selectedFunding.id, { ...form, payment_date: form.payment_date || today() }))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Record</button></>}>
            <div style={{ ...card, padding:'12px', marginBottom:'14px', background:C.mist }}>
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
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
          <button style={btnP} onClick={() => { setForm({ bill_date:today(), retention_pct:0, gst_amount:0, status:'Draft' }); setEditId(null); setSheet('receivable') }}>＋ Add Bill</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <SumCard label="Total Outstanding" value={fmtCur(s.outstandingReceivables)} accent={C.teal}/>
          <SumCard label="Overdue" value={fmtCur(s.overdueReceivables)} alert={s.overdueReceivables > 0} accent={C.red}/>
          <SumCard label="Expected (30d)" value={fmtCur(s.expectedInflowThirtyDays)} accent={C.green}/>
          <SumCard label="Bills Count" value={String(fin.receivables.filter(r=>r.status!=='Paid').length)} accent={C.blue}/>
        </div>
        {!fin.receivables.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No receivables yet.</div>}
        {fin.receivables.map(r => (
          <div key={r.id} style={{ ...card, marginBottom:'12px' }}>
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <div><div style={{ fontSize:'14px', fontWeight:700 }}>{r.client_name}</div><div style={{ fontSize:'11px', color:C.slate }}>Bill {r.bill_number} · {(r as any).project?.name || '—'}</div></div>
                <StatusBadge status={r.status}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', margin:'10px 0' }}>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Bill Amount</div><div style={{ fontSize:'14px', fontWeight:700, color:C.navy, marginTop:'2px' }}>{fmtCur(r.bill_amount)}</div></div>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Received</div><div style={{ fontSize:'14px', fontWeight:700, color:C.green, marginTop:'2px' }}>{fmtCur(r.amount_received)}</div></div>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Balance</div><div style={{ fontSize:'14px', fontWeight:700, color:(r.balance??0)>0?C.red:C.green, marginTop:'2px' }}>{fmtCur(r.balance)}</div></div>
              </div>
              <div style={{ fontSize:'12px', color:C.slate, display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <span>Bill: {fmtDate(r.bill_date)}</span>
                {r.submitted_date && <span>Submitted: {fmtDate(r.submitted_date)}</span>}
                {r.expected_date && <span style={{ color:(r.delay_days??0)>0?C.red:C.slate }}>Expected: {fmtDate(r.expected_date)}{(r.delay_days??0)>0?` (${r.delay_days}d late)`:''}</span>}
                {r.retention_pct > 0 && <span>Retention: {r.retention_pct}%</span>}
                {r.gst_amount > 0 && <span>GST: {fmtCur(r.gst_amount)}</span>}
              </div>
              {r.remarks && <div style={{ marginTop:'8px', fontSize:'12px', color:C.slate }}>{r.remarks}</div>}
            </div>
            <div style={{ padding:'10px 14px', display:'flex', gap:'8px', borderTop:`1px solid ${C.border}` }}>
              {r.status !== 'Paid' && <button style={btnP} onClick={() => { setSelectedReceivable(r); setForm({ amount:r.balance, payment_date:today() }); setSheet('recv-pay') }}>Record Payment</button>}
              <button style={btnG} onClick={() => { setForm({ ...r, bill_date:r.bill_date, submitted_date:r.submitted_date??'', expected_date:r.expected_date??'', project_id:r.project_id }); setEditId(r.id); setSheet('receivable') }}>Edit</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteReceivable(r.id) }}>Delete</button>
            </div>
          </div>
        ))}

        {sheet === 'receivable' && (
          <Sheet title={editId ? 'Edit Bill' : 'Add Running Bill'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateReceivable(editId, form) : fin.addReceivable(form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
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
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addReceivablePayment(selectedReceivable.id, form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Record</button></>}>
            <div style={{ ...card, padding:'12px', marginBottom:'14px', background:C.mist }}>
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
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
          <button style={btnP} onClick={() => { setForm({ invoice_date:today(), status:'Pending' }); setEditId(null); setSheet('payable') }}>＋ Add Payable</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <SumCard label="Total Payable" value={fmtCur(s.outstandingPayables)} accent={C.amber}/>
          <SumCard label="Overdue" value={fmtCur(s.overduePayables)} alert={s.overduePayables > 0}/>
          <SumCard label="Due This Week" value={fmtCur(fin.payables.filter(p=>{const d=p.due_date&&new Date(p.due_date);const w=new Date();w.setDate(w.getDate()+7);return d&&d<=w&&p.status!=='Paid';}).reduce((s,p)=>s+(p.outstanding??0),0))} accent={C.teal}/>
          <SumCard label="Vendors" value={String(new Set(fin.payables.filter(p=>p.status!=='Paid').map(p=>p.supplier_name)).size)} accent={C.blue}/>
        </div>
        {!fin.payables.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No payables yet.</div>}
        {fin.payables.map(p => (
          <div key={p.id} style={{ ...card, marginBottom:'12px' }}>
            <div style={{ padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <div><div style={{ fontSize:'14px', fontWeight:700 }}>{p.supplier_name}</div><div style={{ fontSize:'11px', color:C.slate }}>{p.invoice_number ? `Inv: ${p.invoice_number}` : '—'} · {(p as any).project?.name || 'No project'}</div></div>
                <StatusBadge status={p.status}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', margin:'10px 0' }}>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Invoice</div><div style={{ fontSize:'14px', fontWeight:700, color:C.navy, marginTop:'2px' }}>{fmtCur(p.amount)}</div></div>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Paid</div><div style={{ fontSize:'14px', fontWeight:700, color:C.green, marginTop:'2px' }}>{fmtCur(p.amount_paid)}</div></div>
                <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>Outstanding</div><div style={{ fontSize:'14px', fontWeight:700, color:(p.outstanding??0)>0?C.red:C.green, marginTop:'2px' }}>{fmtCur(p.outstanding)}</div></div>
              </div>
              <div style={{ fontSize:'12px', color:C.slate, display:'flex', gap:'12px', flexWrap:'wrap' }}>
                <span>Invoice: {fmtDate(p.invoice_date)}</span>
                {p.due_date && <span style={{ color:(p.days_overdue??0)>0?C.red:C.slate }}>Due: {fmtDate(p.due_date)}{(p.days_overdue??0)>0?` (${p.days_overdue}d overdue)`:''}</span>}
                {p.po_number && <span>PO: {p.po_number}</span>}
              </div>
              {p.remarks && <div style={{ marginTop:'8px', fontSize:'12px', color:C.slate }}>{p.remarks}</div>}
            </div>
            <div style={{ padding:'10px 14px', display:'flex', gap:'8px', borderTop:`1px solid ${C.border}` }}>
              {p.status !== 'Paid' && <button style={btnP} onClick={() => { setSelectedPayable(p); setForm({ amount:p.outstanding, payment_date:today() }); setSheet('pay-pay') }}>Record Payment</button>}
              <button style={btnG} onClick={() => { setForm({ ...p, invoice_date:p.invoice_date, due_date:p.due_date??'' }); setEditId(p.id); setSheet('payable') }}>Edit</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deletePayable(p.id) }}>Delete</button>
            </div>
          </div>
        ))}

        {sheet === 'payable' && (
          <Sheet title={editId ? 'Edit Payable' : 'Add Vendor Payable'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updatePayable(editId, form) : fin.addPayable(form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
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
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addPayablePayment(selectedPayable.id, form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Record</button></>}>
            <div style={{ ...card, padding:'12px', marginBottom:'14px', background:C.mist }}>
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
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
          <button style={btnP} onClick={() => { setForm({ txn_date:today(), txn_type:'Debit' }); setSheet('cash-entry') }}>＋ Add Entry</button>
        </div>
        {/* Running total */}
        <div style={{ ...card, padding:'14px', marginBottom:'16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', textAlign:'center' }}>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>Total In</div><div style={{ fontSize:'16px', fontWeight:800, color:C.green }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Credit').reduce((s,e)=>s+e.amount,0))}</div></div>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>Total Out</div><div style={{ fontSize:'16px', fontWeight:800, color:C.red }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Debit').reduce((s,e)=>s+e.amount,0))}</div></div>
            <div><div style={{ fontSize:'10px', color:C.slate, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>Net</div><div style={{ fontSize:'16px', fontWeight:800, color:C.navy }}>{fmtCur(fin.cashBook.filter(e=>e.txn_type==='Credit').reduce((s,e)=>s+e.amount,0) - fin.cashBook.filter(e=>e.txn_type==='Debit').reduce((s,e)=>s+e.amount,0))}</div></div>
          </div>
        </div>
        {!fin.cashBook.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No cash book entries yet.</div>}
        <div style={{ ...card }}>
          {fin.cashBook.map(e => (
            <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'11px 14px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: e.txn_type==='Credit'?C.green:C.red, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'13px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                <div style={{ fontSize:'11px', color:C.slate, marginTop:'2px' }}>{fmtDate(e.txn_date)} · {e.category}{(e as any).project?.name?' · '+(e as any).project.name:''}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'14px', fontWeight:700, color: e.txn_type==='Credit'?C.green:C.red }}>{e.txn_type==='Credit'?'+':'-'}{fmtCur(e.amount)}</div>
                {e.reference && <div style={{ fontSize:'10px', color:C.slate }}>{e.reference}</div>}
              </div>
              <button onClick={() => { if(confirm('Delete?')) fin.deleteCashEntry(e.id) }} style={btnD}>✕</button>
            </div>
          ))}
        </div>

        {sheet === 'cash-entry' && (
          <Sheet title="Add Cash Book Entry" onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => fin.addCashEntry(form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
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
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
          <button style={btnP} onClick={() => { setForm({ account_type:'Current', opening_balance:0, current_balance:0 }); setEditId(null); setSheet('bank') }}>＋ Add Account</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
          <SumCard label="Total Balance" value={fmtCur(s.totalBankBalance)} accent={C.blue}/>
          <SumCard label="Accounts" value={String(fin.accounts.length)} accent={C.navy}/>
        </div>
        {!fin.accounts.length && <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No bank accounts added yet.</div>}
        {fin.accounts.map(a => (
          <div key={a.id} style={{ ...card, marginBottom:'12px' }}>
            <div style={{ padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:700 }}>{a.name}</div>
                  <div style={{ fontSize:'12px', color:C.slate, marginTop:'2px' }}>{a.bank_name} · {a.account_type}</div>
                  {a.account_number && <div style={{ fontSize:'12px', color:C.slate }}>A/C: ••••{a.account_number.slice(-4)}</div>}
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'20px', fontWeight:800, color: a.current_balance >= 0 ? C.navy : C.red }}>{fmtCur(a.current_balance)}</div>
                  <div style={{ fontSize:'11px', color:C.slate }}>Opening: {fmtCur(a.opening_balance)}</div>
                </div>
              </div>
              {a.notes && <div style={{ marginTop:'8px', fontSize:'12px', color:C.slate }}>{a.notes}</div>}
            </div>
            <div style={{ padding:'10px 14px', display:'flex', gap:'8px', borderTop:`1px solid ${C.border}` }}>
              <button style={btnG} onClick={() => { setForm({ ...a }); setEditId(a.id); setSheet('bank') }}>Edit</button>
              <button style={btnD} onClick={() => { if(confirm('Delete?')) fin.deleteAccount(a.id) }}>Delete</button>
            </div>
          </div>
        ))}

        {sheet === 'bank' && (
          <Sheet title={editId ? 'Edit Account' : 'Add Bank Account'} onClose={() => setSheet(null)}
            footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editId ? fin.updateAccount(editId, form) : fin.addAccount(form))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
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
            {[7,30,90].map(d => <button key={d} onClick={() => setForecastDays(d)} style={{ ...forecastDays===d?btnP:btnG }}>{d} Days</button>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'16px' }}>
            <SumCard label="Expected In" value={fmtCur(totalIn)} accent={C.green}/>
            <SumCard label="Expected Out" value={fmtCur(totalOut)} accent={C.red}/>
            <SumCard label="Net" value={fmtCur(totalIn-totalOut)} accent={(totalIn-totalOut)>=0?C.blue:C.red} alert={(totalIn-totalOut)<0}/>
          </div>
          {!forecast.filter(d=>d.items.length>0).length
            ? <div style={{ textAlign:'center', padding:'40px', color:C.slate }}>No scheduled events in the next {forecastDays} days.<br/>Add receivables, payables, and funding with due dates to see the forecast.</div>
            : forecast.filter(d => d.items.length > 0).map((day, i) => (
              <div key={day.date} style={{ ...card, marginBottom:'10px' }}>
                <div style={{ padding:'10px 14px', background:C.mist, borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontSize:'13px', fontWeight:700 }}>{day.label}</div>
                  <div style={{ fontSize:'12px' }}>
                    {day.inflow > 0 && <span style={{ color:C.green, marginRight:'12px' }}>+{fmtCur(day.inflow)}</span>}
                    {day.outflow > 0 && <span style={{ color:C.red, marginRight:'12px' }}>-{fmtCur(day.outflow)}</span>}
                    <span style={{ fontWeight:700, color:C.navy }}>Balance: {fmtCur(day.closingBalance)}</span>
                  </div>
                </div>
                {day.items.map((item, j) => (
                  <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:`1px solid ${C.border}`, fontSize:'13px' }}>
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
            <div style={{ padding:'12px 14px', background:C.redBg, borderLeft:`3px solid ${C.red}`, borderRadius:'0 8px 8px 0', marginTop:'12px', fontSize:'13px' }}>
              ⚠ <strong>Cash shortfall projected</strong> — balance goes negative within {forecastDays} days. Review payables or accelerate receivables.
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
            <div key={p.project_id} style={{ ...card, marginBottom:'12px' }}>
              <div style={{ height:'4px', background: p.profit_pct >= 15 ? C.green : p.profit_pct >= 5 ? C.amber : C.red }}/>
              <div style={{ padding:'14px' }}>
                <div style={{ fontSize:'14px', fontWeight:700, marginBottom:'12px' }}>{p.project_name}</div>
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
                    <div key={String(label)}>
                      <div style={{ fontSize:'9px', fontWeight:700, color:C.slate, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>{label}</div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:String(color) }}>{value}</div>
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
                <div style={{ fontSize:'11px', color:C.slate, marginBottom:'2px' }}>{fmtDate(e.date)}</div>
                <div style={{ ...card, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:'10px', fontWeight:700, color:e.color, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'2px' }}>{e.type}</div>
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

    return null
  }

  // ── MAIN RENDER ──────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", fontSize:'14px', color:C.ink, paddingBottom:'80px' }}>
      {/* Header */}
      <div style={{ padding:'16px 16px 0' }}>
        <div style={{ fontSize:'22px', fontWeight:800, color:C.navy, letterSpacing:'-0.025em' }}>Director Office</div>
        <div style={{ width:'32px', height:'3px', background:C.gold, borderRadius:'2px', marginTop:'6px' }}/>
        <div style={{ fontSize:'12px', color:C.slate, marginTop:'4px' }}>Financial Command Center · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>

      {/* Module tabs */}
      <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', display:'flex', padding:'12px 8px 0', borderBottom:`1px solid ${C.border}`, marginBottom:'16px', position:'sticky', top:'52px', zIndex:20, background:'#fff' }}>
        {MODULES.map(m => (
          <button key={m.key} onClick={() => setMod(m.key)}
            style={{ padding:'8px 12px', fontSize:'12px', fontWeight:mod===m.key?700:500, color:mod===m.key?C.blue:C.slate, border:'none', background:'none', borderBottom:`2px solid ${mod===m.key?C.blue:'transparent'}`, whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', marginBottom:'-1px', transition:'color .15s', display:'flex', alignItems:'center', gap:'5px' }}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {/* Module content */}
      <div style={{ padding:'0 16px' }}>
        {renderModule()}
      </div>
    </div>
  )
}
