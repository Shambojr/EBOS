// ════════════════════════════════════════════════════════════
// EBOS — ProjectView (Stage 3 Redesign)
// Premium project module. All tabs. All forms. All business logic.
// Extracted from App.tsx to fix keyboard-dismissal on all project forms.
// ════════════════════════════════════════════════════════════
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProjectData } from '../hooks/useProjectData'
import { can, PROJECT_TABS } from '../lib/rbac'
import { colors as C_, space, radius as R, T, type as TY } from '../design/tokens'
import { fmtMoney, smartDate, daysLeft, isOverdue, projectHealth, getStatus, initials } from '../design/business'
import {
  toast, Sheet, FormGroup, RangeField, EmptyState, Badge, ProgressBar,
  BusinessEmptyState, EnterpriseList, HeroCard, StatGrid, KPITile,
} from '../design/components'
import type { Project, User, UserRole, Milestone } from '../types'

// ── Constants ─────────────────────────────────────────────────
const STAGES       = ['Tender','Planning','Procurement','Site Prep','Foundation','Civil Works','MGPS','HVAC','Electrical','Plumbing','Finishing','Testing','Commissioning','Handover']
const STAGE_EMOJIS = ['📋','📐','🛒','🚧','🏗','🧱','🔵','❄️','⚡','🔧','🎨','🧪','⚙️','🏁']
const MAT_STATUSES = ['Pending','Ordered','In Transit','Delivered','Partially Delivered','Delayed','Cancelled']
const DOC_TYPES    = ['Drawing','BOQ','Certificate','Contract','Report','Invoice','Photo','Approval','Other']
const LOG_TRADES   = ['Masons','Carpenters','Electricians','Plumbers','Welders','Helpers','Engineers','Others']
const MS_PRIORITIES= ['Low','Medium','High','Critical']
const EXP_CATS     = ['Materials','Labour','Equipment','Transport','Subcontract','Professional Fees','Admin','Other']
const DOC_ICONS: Record<string,string> = {
  Drawing:'📐', BOQ:'📊', Certificate:'📜', Contract:'📄',
  Report:'📋', Invoice:'🧾', Photo:'📸', Approval:'✅', Other:'📁'
}

// ── Color aliases ──────────────────────────────────────────────
const C = {
  navy:C_.brand, blue:C_.info, gold:C_.gold, white:'#fff',
  mist:C_.bgMuted, border:C_.border, ink:C_.textPrimary,
  body:C_.textPrimary, slate:C_.textSecondary, faint:C_.textTertiary,
  green:C_.success, greenBg:C_.successBg, amber:C_.warning, amberBg:C_.warningBg,
  red:C_.danger, redBg:C_.dangerBg, teal:C_.teal, tealBg:C_.tealBg,
}

// ── Style shorthands ──────────────────────────────────────────
const card      = T.card
const btnP      = T.btnPrimary
const btnG      = T.btnOutline
const btnD      = T.btnDanger
const fieldStyle= T.field
const fieldLabel= T.fieldLabel

function today() { return new Date().toISOString().split('T')[0] }
const fmtCur  = fmtMoney
const fmtDate = (d?: string | null) => smartDate(d, 'abs')

// ── Priority color ─────────────────────────────────────────────
const priorityColor: Record<string,[string,string]> = {
  Critical: [C_.dangerBg, C_.danger],
  High:     [C_.warningBg, C_.warning],
  Medium:   [C_.infoBg, C_.info],
  Low:      [C_.bgMuted, C_.textSecondary],
}

// ── Props ──────────────────────────────────────────────────────
interface ProjectViewProps {
  project: Project
  tab: string
  setTab: (t: string) => void
  sheet: string | null
  setSheet: (s: string | null) => void
  role: UserRole
  user: User
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export function ProjectView({ project, tab, setTab, sheet, setSheet, role, user }: ProjectViewProps) {
  const pd = useProjectData(project.id, user)
  const allowedTabs = PROJECT_TABS[role]

  const totalSpent = pd.expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const budget     = project.budget ?? 0
  const health     = projectHealth({ ...project, total_spent: totalSpent })
  const healthColor= health === 'green' ? C_.success : health === 'amber' ? C_.warning : C_.danger
  const healthLabel= health === 'green' ? 'On Track' : health === 'amber' ? 'At Risk' : 'Delayed'
  const dl         = daysLeft(project.end_date)

  // ── Form states ────────────────────────────────────────────
  const [msForm,  setMsForm]  = useState<any>({})
  const [logForm, setLogForm] = useState<any>({})
  const [matForm, setMatForm] = useState<any>({})
  const [expForm, setExpForm] = useState<any>({})
  const [docForm, setDocForm] = useState<any>({})
  const [boqForm, setBoqForm] = useState<any>({})
  const [editMs,  setEditMs]  = useState<string | null>(null)
  const [editMat, setEditMat] = useState<string | null>(null)
  const [editLog, setEditLog] = useState<string | null>(null)

  const save = async (fn: () => Promise<string | null>) => {
    const err = await fn()
    if (err) toast('Error: ' + err)
    else { toast('Saved ✓'); setSheet(null) }
  }

  // ── Tab bar ────────────────────────────────────────────────
  const TAB_LABELS: Record<string,string> = {
    overview:'Overview', stages:'Stages', milestones:'Milestones',
    logs:'Logs', materials:'Materials', expenses:'Expenses',
    boq:'BOQ', documents:'Docs', photos:'Photos',
  }

  return (
    <div style={{ flex:1, overflowY:'auto', paddingBottom:'80px' }}>

      {/* ── Hero Section ──────────────────────────────────── */}
      <div style={{ background: C.navy, padding:`${space[4]} ${space[4]} 0` }}>
        {/* Type + Health */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: space[2] }}>
          <span style={{ fontSize: TY.sizeXs, fontWeight: TY.weightSemibold, letterSpacing: TY.trackingWidest, textTransform:'uppercase', color:'rgba(255,255,255,.45)' }}>
            {project.type || 'Construction Project'}
          </span>
          <span style={{ padding:`${space[1]} ${space[2]}`, borderRadius: R.pill, fontSize: TY.sizeXs, fontWeight: TY.weightBold, background: health === 'green' ? '#f0fdf4' : health === 'amber' ? '#fffbeb' : '#fef2f2', color: healthColor }}>
            {healthLabel}
          </span>
        </div>
        {/* Name + Client */}
        <div style={{ fontSize: TY.size3xl, fontWeight: TY.weightBlack, color:'#fff', lineHeight:1.2, letterSpacing:'-0.02em', marginBottom:'3px' }}>
          {project.name}
        </div>
        <div style={{ fontSize: TY.sizeSm, color:'rgba(255,255,255,.5)', marginBottom: space[4] }}>
          {[project.client, project.location].filter(Boolean).join(' · ') || '—'}
        </div>
        {/* Progress bar */}
        <div style={{ height:'3px', background:'rgba(255,255,255,.15)', borderRadius: R.pill, overflow:'hidden', marginBottom: space[1] }}>
          <div style={{ height:'100%', width:`${project.progress}%`, background: health === 'green' ? '#34d399' : health === 'amber' ? '#fbbf24' : '#f87171', borderRadius: R.pill, transition:`width .6s ease` }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: space[4] }}>
          <span style={{ fontSize: TY.sizeSm, color:'rgba(255,255,255,.5)' }}>{project.progress}% complete</span>
          {dl !== null && <span style={{ fontSize: TY.sizeSm, color: dl < 0 ? '#f87171' : dl < 14 ? '#fbbf24' : 'rgba(255,255,255,.5)' }}>{dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}</span>}
        </div>
        {/* Tab bar inside hero */}
        <div data-no-swipe="true" style={{ display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch', marginBottom:'-1px' }}>
          {allowedTabs.filter(t => TAB_LABELS[t]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:`10px 14px`, border:'none', background:'transparent',
              fontSize: TY.sizeSm, fontWeight: tab===t ? TY.weightBold : TY.weightMedium,
              color: tab===t ? '#fff' : 'rgba(255,255,255,.45)',
              borderBottom:`2px solid ${tab===t ? '#fff' : 'transparent'}`,
              whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit',
              transition:`all .15s ease`, marginBottom:'-1px',
            }}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────── */}
      {(tab === 'overview' || tab === 'expenses') && (
        <div style={{ background:'#fff', borderBottom:`1px solid ${C.border}`, padding:`${space[3]} ${space[4]}` }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: space[2] }}>
            <KPITile label="Progress" value={`${project.progress}%`} accent={healthColor}/>
            <KPITile label="Budget"   value={budget ? fmtCur(budget) : '—'} accent={C_.gold}/>
            <KPITile label="Spent"    value={fmtCur(totalSpent)} alert={budget > 0 && totalSpent > budget}/>
            <KPITile label="Deadline" value={project.end_date ? smartDate(project.end_date, 'short') : '—'} alert={dl !== null && dl < 0}/>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: OVERVIEW
      ══════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ padding:`${space[4]} ${space[4]} ${space[5]}` }}>

          {/* Project Details */}
          <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C.slate, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>Project Details</div>
          <div style={{ ...card, marginBottom: space[4] }}>
            {([
              ['Type',     project.type],
              ['Client',   project.client],
              ['Location', project.location],
              ['Stage',    project.stage],
              ['Start',    fmtDate(project.start_date)],
              ['End',      fmtDate(project.end_date)],
            ] as [string,string|undefined][]).map(([k,v],i,arr) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:`${space[3]} ${space[4]}`, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: TY.sizeSm, color: C.slate, fontWeight: TY.weightMedium }}>{k}</span>
                <span style={{ fontSize: TY.sizeSm, fontWeight: TY.weightSemibold, color: C.ink, textAlign:'right', maxWidth:'60%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v || '—'}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {project.notes && (
            <div style={{ padding: space[4], background: C_.tealBg, borderRadius: R.lg, borderLeft:`3px solid ${C_.teal}`, marginBottom: space[4], fontSize: TY.sizeSm, color: C.body, lineHeight: TY.lineRelaxed }}>
              <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C_.teal, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[1] }}>Notes</div>
              {project.notes}
            </div>
          )}

          {/* Upcoming Milestones (up to 3) */}
          {pd.milestones.filter(m => !m.done).length > 0 && (
            <div style={{ marginBottom: space[4] }}>
              <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C.slate, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>Upcoming Milestones</div>
              <div style={{ ...card }}>
                {pd.milestones.filter(m => !m.done).slice(0,3).map((m, i, arr) => {
                  const over = isOverdue(m.due_date)
                  return (
                    <div key={m.id} style={{ display:'flex', gap: space[3], padding:`${space[3]} ${space[4]}`, borderBottom: i < arr.length-1 ? `1px solid ${C.border}` : 'none', alignItems:'center' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius: R.pill, background: over ? C_.danger : C_.warning, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize: TY.sizeSm, fontWeight: TY.weightSemibold, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                        <div style={{ fontSize: TY.sizeSm, color: over ? C_.danger : C.slate, marginTop:'2px' }}>{over ? 'Overdue · ' : ''}{fmtDate(m.due_date)}</div>
                      </div>
                      <div style={{ fontSize: TY.sizeSm, fontWeight: TY.weightBold, color: C_.info }}>{m.pct ?? 0}%</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Logs (up to 2) */}
          {pd.logs.slice(0,2).length > 0 && (
            <div>
              <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C.slate, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>Recent Activity</div>
              {pd.logs.slice(0,2).map(l => (
                <div key={l.id} style={{ ...card, marginBottom: space[2], padding:`${space[3]} ${space[4]}` }}>
                  <div style={{ display:'flex', gap: space[2], alignItems:'center', marginBottom: space[2] }}>
                    <div style={{ width:'28px', height:'28px', borderRadius: R.md, background: C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: TY.sizeXs, fontWeight: TY.weightBold, flexShrink:0 }}>
                      {initials(l.logger?.full_name)}
                    </div>
                    <div>
                      <div style={{ fontSize: TY.sizeSm, fontWeight: TY.weightSemibold }}>{l.logger?.full_name || '—'}</div>
                      <div style={{ fontSize: TY.sizeSm, color: C.slate }}>{fmtDate(l.log_date)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: TY.sizeSm, color: C.body, lineHeight: TY.lineRelaxed }}>{(l.site_update||'').slice(0,140)}{(l.site_update||'').length > 140 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: STAGES
      ══════════════════════════════════════════════════════ */}
      {tab === 'stages' && (
        <div style={{ padding: space[4] }}>
          <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C.slate, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[4] }}>
            Tap a stage to mark progress
          </div>
          {/* Vertical stage list — better on mobile than horizontal scroll */}
          <div style={{ ...card }}>
            {STAGES.map((s, i) => {
              const si     = STAGES.indexOf(project.stage || '')
              const done   = i < si
              const active = i === si
              return (
                <div key={s} onClick={async () => {
                  await supabase.from('projects').update({ stage: s, progress: Math.max(project.progress, Math.round((i+1)/STAGES.length*100)) }).eq('id', project.id)
                  toast(`Stage: ${s}`)
                }} style={{ display:'flex', gap: space[3], padding:`${space[3]} ${space[4]}`, borderBottom: i < STAGES.length-1 ? `1px solid ${C.border}` : 'none', alignItems:'center', cursor:'pointer' }}>
                  {/* Step indicator */}
                  <div style={{ width:'32px', height:'32px', borderRadius: R.md, border:`2px solid ${active ? C.navy : done ? C_.success : C.border}`, background: active ? C.navy : done ? C_.success : '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: TY.sizeMd, flexShrink:0, color: (active||done) ? '#fff' : C.slate }}>
                    {done ? '✓' : STAGE_EMOJIS[i]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: active ? TY.weightBold : TY.weightMedium, color: active ? C.navy : done ? C_.success : C.slate }}>
                      {s}
                    </div>
                    {active && <div style={{ fontSize: TY.sizeSm, color: C.navy, marginTop:'1px', fontWeight: TY.weightSemibold }}>Current Stage</div>}
                  </div>
                  {active && <div style={{ width:'8px', height:'8px', borderRadius: R.pill, background: C.navy }}/>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: MILESTONES
      ══════════════════════════════════════════════════════ */}
      {tab === 'milestones' && (
        <div style={{ padding: space[4] }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: space[3] }}>
            <button style={btnP} onClick={() => { setMsForm({}); setEditMs(null); setSheet('milestone') }}>＋ Add</button>
          </div>

          {!pd.milestones.length && <BusinessEmptyState.NoProjects onCta={() => { setMsForm({}); setEditMs(null); setSheet('milestone') }} ctaLabel="＋ Add First Milestone"/>}

          {pd.milestones.length > 0 && (() => {
            const overdue   = pd.milestones.filter(m => !m.done && isOverdue(m.due_date))
            const upcoming  = pd.milestones.filter(m => !m.done && !isOverdue(m.due_date))
            const completed = pd.milestones.filter(m => m.done)

            const MilestoneRow = ({ m, onEdit, onDelete, onToggle }: { m: Milestone & { assignee?: any }; onEdit: (m: any) => void; onDelete: (id: string) => void; onToggle: (id: string, done: boolean) => void }) => {
              const over = !m.done && isOverdue(m.due_date)
              const [pc, tc] = priorityColor[m.priority || 'Medium'] ?? priorityColor.Medium
              return (
                <div style={{ display:'flex', gap: space[3], padding:`${space[3]} ${space[4]}`, borderBottom:`1px solid ${C.border}`, alignItems:'center' }}>
                  {/* Checkbox */}
                  <div onClick={() => onToggle(m.id, !m.done)} style={{ width:'22px', height:'22px', borderRadius:'6px', border:`2px solid ${m.done ? C_.success : over ? C_.danger : C.border}`, background: m.done ? C_.success : 'transparent', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all .15s' }}>
                    {m.done && <span style={{ fontSize:'12px', fontWeight:700 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightSemibold, textDecoration: m.done ? 'line-through' : 'none', color: m.done ? C.slate : C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                    <div style={{ display:'flex', gap: space[2], marginTop:'3px', flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize: TY.sizeSm, color: over ? C_.danger : C.slate }}>{over ? '⚠ ' : ''}{fmtDate(m.due_date)}</span>
                      {m.priority && <span style={{ padding:`1px ${space[2]}`, borderRadius: R.pill, fontSize: TY.sizeXs, fontWeight: TY.weightBold, background: pc, color: tc }}>{m.priority}</span>}
                      {m.assignee && <span style={{ fontSize: TY.sizeXs, color: C.slate }}>{m.assignee.full_name}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: TY.sizeSm, fontWeight: TY.weightBold, color: C_.info, marginRight: space[1] }}>{m.pct ?? 0}%</div>
                  <button onClick={() => onEdit(m)} style={{ ...btnG, padding:`${space[1]} ${space[2]}`, fontSize: TY.sizeSm, height:'32px' }}>Edit</button>
                  <button onClick={() => onDelete(m.id)} style={{ ...btnD, height:'32px', padding:`0 ${space[2]}` }}>✕</button>
                </div>
              )
            }

            return (
              <>
                {overdue.length > 0 && (
                  <div style={{ marginBottom: space[4] }}>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C_.danger, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>⚠ Overdue · {overdue.length}</div>
                    <div style={{ ...card, border:`1px solid ${C_.dangerBg}` }}>{overdue.map(m => <MilestoneRow key={m.id} m={m} onEdit={(x)=>{ setMsForm({ ...x, due_date: x.due_date ?? '', assignee_id: x.assignee_id ?? '', priority: x.priority, pct: x.pct, notes: x.notes ?? '' }); setEditMs(x.id); setSheet('milestone') }} onDelete={(id)=>{ if(confirm('Delete?')) pd.deleteMilestone(id) }} onToggle={pd.toggleMilestone}/>)}</div>
                  </div>
                )}
                {upcoming.length > 0 && (
                  <div style={{ marginBottom: space[4] }}>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C.slate, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>Upcoming · {upcoming.length}</div>
                    <div style={{ ...card }}>{upcoming.map(m => <MilestoneRow key={m.id} m={m} onEdit={(x)=>{ setMsForm({ ...x, due_date: x.due_date ?? '', assignee_id: x.assignee_id ?? '', priority: x.priority, pct: x.pct, notes: x.notes ?? '' }); setEditMs(x.id); setSheet('milestone') }} onDelete={(id)=>{ if(confirm('Delete?')) pd.deleteMilestone(id) }} onToggle={pd.toggleMilestone}/>)}</div>
                  </div>
                )}
                {completed.length > 0 && (
                  <div>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C_.success, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom: space[2] }}>Completed · {completed.length}</div>
                    <div style={{ ...card, opacity: 0.7 }}>{completed.map(m => <MilestoneRow key={m.id} m={m} onEdit={(x)=>{ setMsForm({ ...x, due_date: x.due_date ?? '', assignee_id: x.assignee_id ?? '', priority: x.priority, pct: x.pct, notes: x.notes ?? '' }); setEditMs(x.id); setSheet('milestone') }} onDelete={(id)=>{ if(confirm('Delete?')) pd.deleteMilestone(id) }} onToggle={pd.toggleMilestone}/>)}</div>
                  </div>
                )}
              </>
            )
          })()}

          {sheet === 'milestone' && (
            <Sheet title={editMs ? 'Edit Milestone' : 'Add Milestone'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editMs ? pd.updateMilestone(editMs, msForm) : pd.addMilestone(msForm))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
              <FormGroup label="Name *"><input style={fieldStyle} value={msForm.name||''} onChange={e=>setMsForm((f:any)=>({...f,name:e.target.value}))} placeholder="Milestone name"/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Due Date"><input style={fieldStyle} type="date" value={msForm.due_date||''} onChange={e=>setMsForm((f:any)=>({...f,due_date:e.target.value}))}/></FormGroup>
                <FormGroup label="Priority"><select style={{...fieldStyle,appearance:'none'}} value={msForm.priority||'Medium'} onChange={e=>setMsForm((f:any)=>({...f,priority:e.target.value}))}>{MS_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormGroup>
              </div>
              <RangeField label="Completion %" id="ms-pct" value={msForm.pct??0} onChange={v=>setMsForm((f:any)=>({...f,pct:v}))}/>
              <FormGroup label="Notes"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={msForm.notes||''} onChange={e=>setMsForm((f:any)=>({...f,notes:e.target.value}))}/></FormGroup>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: LOGS
      ══════════════════════════════════════════════════════ */}
      {tab === 'logs' && (
        <div style={{ padding: space[4] }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: space[3] }}>
            <button style={btnP} onClick={() => { setLogForm({ log_date: today(), labour: {} }); setEditLog(null); setSheet('log') }}>＋ Log</button>
          </div>

          {!pd.logs.length && <BusinessEmptyState.NoLogs onCta={() => { setLogForm({ log_date: today(), labour: {} }); setSheet('log') }} ctaLabel="＋ Add First Log"/>}

          {pd.logs.map(l => {
            const logPhotos    = pd.photosForLog(l.id)
            const labourTotal  = Object.values(l.labour || {}).reduce((a: number, v: any) => a + Number(v), 0)
            return (
              <div key={l.id} style={{ ...card, marginBottom: space[3] }}>
                {/* Log header */}
                <div style={{ display:'flex', gap: space[3], alignItems:'center', padding:`${space[3]} ${space[4]}`, borderBottom:`1px solid ${C.border}`, background: C.mist }}>
                  <div style={{ width:'34px', height:'34px', borderRadius: R.md, background: C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: TY.sizeXs, fontWeight: TY.weightBold, flexShrink:0 }}>
                    {initials(l.logger?.full_name)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightBold, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.logger?.full_name || '—'}</div>
                    <div style={{ fontSize: TY.sizeSm, color: C.slate }}>{fmtDate(l.log_date)}</div>
                  </div>
                  <div style={{ display:'flex', gap: space[1], alignItems:'center', flexShrink:0 }}>
                    {l.day_progress != null && <Badge label={`${l.day_progress}%`} color="blue"/>}
                    <button onClick={() => { setLogForm({ ...l, log_date: l.log_date, labour: l.labour ?? {} }); setEditLog(l.id); setSheet('log') }} style={{ ...btnG, height:'30px', padding:`0 ${space[2]}`, fontSize: TY.sizeSm }}>Edit</button>
                    <button onClick={() => { if(confirm('Delete log?')) pd.deleteLog(l.id) }} style={{ ...btnD, height:'30px', padding:`0 ${space[2]}` }}>✕</button>
                  </div>
                </div>

                {/* Log body */}
                <div style={{ padding:`${space[3]} ${space[4]}` }}>
                  {l.achievements && (
                    <div style={{ marginBottom: space[3], padding: space[3], background: C_.successBg, borderRadius: R.md, borderLeft:`3px solid ${C_.success}` }}>
                      <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C_.success, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Achievements</div>
                      <div style={{ fontSize: TY.sizeSm, color: C.body, lineHeight: TY.lineRelaxed }}>{l.achievements}</div>
                    </div>
                  )}

                  {l.site_update && <div style={{ fontSize: TY.sizeLg, color: C.body, lineHeight: TY.lineRelaxed, marginBottom: space[3] }}>{l.site_update}</div>}

                  {/* Chips */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap: space[1] }}>
                    {l.weather && <span style={{ padding:`${space[1]} ${space[2]}`, background: C.mist, borderRadius: R.pill, fontSize: TY.sizeSm, color: C.slate, border:`1px solid ${C.border}` }}>🌤 {l.weather}</span>}
                    {labourTotal > 0 && <span style={{ padding:`${space[1]} ${space[2]}`, background: C.mist, borderRadius: R.pill, fontSize: TY.sizeSm, color: C.slate, border:`1px solid ${C.border}` }}>👷 {labourTotal} workers</span>}
                    {l.client_visit && <span style={{ padding:`${space[1]} ${space[2]}`, background: C_.infoBg, borderRadius: R.pill, fontSize: TY.sizeSm, color: C_.info, border:`1px solid #bfdbfe` }}>👤 Client Visit</span>}
                    {l.safety_issues && <span style={{ padding:`${space[1]} ${space[2]}`, background: C_.dangerBg, borderRadius: R.pill, fontSize: TY.sizeSm, color: C_.danger, border:`1px solid #fecaca` }}>🦺 Safety Issue</span>}
                  </div>

                  {l.next_plan && (
                    <div style={{ marginTop: space[3], padding: space[3], background: C_.tealBg, borderRadius: R.md, borderLeft:`3px solid ${C_.teal}` }}>
                      <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color: C_.teal, textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Tomorrow</div>
                      <div style={{ fontSize: TY.sizeSm, color: C.body, lineHeight: TY.lineRelaxed }}>{l.next_plan}</div>
                    </div>
                  )}

                  {/* Photo thumbnails */}
                  {logPhotos.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: space[1], marginTop: space[3] }}>
                      {logPhotos.map(ph => (
                        <div key={ph.id} style={{ aspectRatio:'1', background: C.mist, borderRadius: R.md, overflow:'hidden', position:'relative', cursor:'pointer' }}>
                          <img src={ph.public_url} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onClick={() => window.open(ph.public_url, '_blank')}/>
                          <button onClick={() => { if(confirm('Delete photo?')) pd.deletePhoto(ph.id) }} style={{ position:'absolute', top:'3px', right:'3px', width:'18px', height:'18px', borderRadius:'50%', background:'rgba(220,38,38,.85)', color:'#fff', border:'none', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Camera / Gallery */}
                  <div style={{ display:'flex', gap: space[2], marginTop: space[3] }}>
                    <label style={{ ...btnG, cursor:'pointer', height:'36px', flex:1 }}>
                      📷 Camera
                      <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files, 'General', l.id) }}/>
                    </label>
                    <label style={{ ...btnG, cursor:'pointer', height:'36px', flex:1 }}>
                      🖼 Gallery
                      <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files, 'General', l.id) }}/>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}

          {sheet === 'log' && (
            <Sheet title={editLog ? 'Edit Site Log' : 'Daily Site Log'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editLog ? pd.updateLog(editLog, logForm) : pd.addLog({ ...logForm, logged_by: user.id }))} style={{ ...btnP, flex:1, justifyContent:'center' }}>{editLog ? 'Save Changes' : 'Save Log'}</button></>}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Date"><input style={fieldStyle} type="date" value={logForm.log_date||today()} onChange={e=>setLogForm((f:any)=>({...f,log_date:e.target.value}))}/></FormGroup>
                <FormGroup label="Weather"><select style={{...fieldStyle,appearance:'none'}} value={logForm.weather||''} onChange={e=>setLogForm((f:any)=>({...f,weather:e.target.value}))}><option value="">—</option>{['Clear','Partly Cloudy','Cloudy','Light Rain','Heavy Rain','Hot','Windy'].map(w=><option key={w}>{w}</option>)}</select></FormGroup>
              </div>
              <FormGroup label="Achievements Today"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.achievements||''} onChange={e=>setLogForm((f:any)=>({...f,achievements:e.target.value}))} placeholder="What was accomplished?"/></FormGroup>
              <FormGroup label="Site Update *"><textarea style={{...fieldStyle,resize:'vertical'}} value={logForm.site_update||''} onChange={e=>setLogForm((f:any)=>({...f,site_update:e.target.value}))} placeholder="Work done, decisions, observations…"/></FormGroup>
              <RangeField label="Day Progress %" id="log-pct" value={logForm.day_progress??0} onChange={v=>setLogForm((f:any)=>({...f,day_progress:v}))}/>
              <FormGroup label="Labour by Trade">
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[2] }}>
                  {LOG_TRADES.map(t => <input key={t} style={{...fieldStyle,padding:'8px 10px'}} type="number" placeholder={t} value={logForm.labour?.[t]||''} onChange={e=>setLogForm((f:any)=>({...f,labour:{...f.labour,[t]:Number(e.target.value)||0}}))}/>)}
                </div>
              </FormGroup>
              <FormGroup label="Issues / Problems"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.issues||''} onChange={e=>setLogForm((f:any)=>({...f,issues:e.target.value}))}/></FormGroup>
              <FormGroup label="Tomorrow's Plan"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.next_plan||''} onChange={e=>setLogForm((f:any)=>({...f,next_plan:e.target.value}))}/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Client Visit"><select style={{...fieldStyle,appearance:'none'}} value={logForm.client_visit?'1':''} onChange={e=>setLogForm((f:any)=>({...f,client_visit:e.target.value==='1'}))}><option value="">No</option><option value="1">Yes</option></select></FormGroup>
                <FormGroup label="Safety Issues"><select style={{...fieldStyle,appearance:'none'}} value={logForm.safety_issues?'1':''} onChange={e=>setLogForm((f:any)=>({...f,safety_issues:e.target.value==='1'}))}><option value="">No</option><option value="1">Yes</option></select></FormGroup>
              </div>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: MATERIALS
      ══════════════════════════════════════════════════════ */}
      {tab === 'materials' && can(role,'materials') && (
        <div style={{ padding: space[4] }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: space[3] }}>
            <button style={btnP} onClick={() => { setMatForm({}); setEditMat(null); setSheet('material') }}>＋ Add</button>
          </div>

          {!pd.materials.length && <BusinessEmptyState.NoMaterials onCta={() => { setMatForm({}); setEditMat(null); setSheet('material') }} ctaLabel="＋ Add Material"/>}

          {pd.materials.map(m => {
            const rcvd    = m.qty_received ?? 0
            const ordered = m.qty_ordered ?? 0
            const pct     = ordered > 0 ? Math.round((rcvd / ordered) * 100) : 0
            const sc      = getStatus(m.status || 'Pending')
            return (
              <div key={m.id} style={{ ...card, marginBottom: space[3] }}>
                <div style={{ padding:`${space[3]} ${space[4]}` }}>
                  {/* Header */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: space[3] }}>
                    <div style={{ flex:1, minWidth:0, marginRight: space[2] }}>
                      <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightBold, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                      {m.spec && <div style={{ fontSize: TY.sizeSm, color: C.slate, marginTop:'2px' }}>{m.spec}</div>}
                    </div>
                    <span style={{ padding:`${space[1]} ${space[2]}`, borderRadius: R.pill, fontSize: TY.sizeXs, fontWeight: TY.weightBold, background: sc.bg, color: sc.color, flexShrink:0 }}>{m.status}</span>
                  </div>

                  {/* Delivery progress */}
                  {ordered > 0 && (
                    <div style={{ marginBottom: space[3] }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom: space[1] }}>
                        <span style={{ fontSize: TY.sizeSm, color: C.slate }}>Received</span>
                        <span style={{ fontSize: TY.sizeSm, fontWeight: TY.weightBold, color: C.ink }}>{rcvd} / {ordered} {m.unit}</span>
                      </div>
                      <ProgressBar value={pct} color={pct >= 100 ? C_.success : C_.info}/>
                    </div>
                  )}

                  {/* Info chips */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap: space[1], marginBottom: space[3] }}>
                    {m.supplier && <span style={{ fontSize: TY.sizeSm, color: C.slate, padding:`${space[1]} ${space[2]}`, background: C.mist, borderRadius: R.pill }}>🏭 {m.supplier}</span>}
                    {m.delivery_eta && <span style={{ fontSize: TY.sizeSm, color: C.slate, padding:`${space[1]} ${space[2]}`, background: C.mist, borderRadius: R.pill }}>📅 ETA: {fmtDate(m.delivery_eta)}</span>}
                    {m.po_number && <span style={{ fontSize: TY.sizeSm, color: C.slate, padding:`${space[1]} ${space[2]}`, background: C.mist, borderRadius: R.pill }}>PO: {m.po_number}</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap: space[2] }}>
                    <button onClick={() => { setMatForm({...m}); setEditMat(m.id); setSheet('material') }} style={{ ...btnG, height:'34px', flex:1 }}>Edit</button>
                    <button onClick={() => pd.deleteMaterial(m.id)} style={{ ...btnD, height:'34px' }}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}

          {sheet === 'material' && (
            <Sheet title={editMat ? 'Edit Material' : 'Add Material'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => editMat ? pd.updateMaterial(editMat, matForm) : pd.addMaterial(matForm))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
              <FormGroup label="Item Name *"><input style={fieldStyle} value={matForm.name||''} onChange={e=>setMatForm((f:any)=>({...f,name:e.target.value}))} placeholder="e.g. Medical Oxygen Pipeline SS 316L"/></FormGroup>
              <FormGroup label="Specification"><input style={fieldStyle} value={matForm.spec||''} onChange={e=>setMatForm((f:any)=>({...f,spec:e.target.value}))}/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Qty Ordered"><input style={fieldStyle} type="number" value={matForm.qty_ordered||''} onChange={e=>setMatForm((f:any)=>({...f,qty_ordered:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Unit"><input style={fieldStyle} value={matForm.unit||''} onChange={e=>setMatForm((f:any)=>({...f,unit:e.target.value}))} placeholder="m, kg, nos"/></FormGroup>
                <FormGroup label="Rate (₹)"><input style={fieldStyle} type="number" value={matForm.rate||''} onChange={e=>setMatForm((f:any)=>({...f,rate:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Qty Received"><input style={fieldStyle} type="number" value={matForm.qty_received||0} onChange={e=>setMatForm((f:any)=>({...f,qty_received:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Supplier"><input style={fieldStyle} value={matForm.supplier||''} onChange={e=>setMatForm((f:any)=>({...f,supplier:e.target.value}))}/></FormGroup>
                <FormGroup label="PO Number"><input style={fieldStyle} value={matForm.po_number||''} onChange={e=>setMatForm((f:any)=>({...f,po_number:e.target.value}))}/></FormGroup>
                <FormGroup label="ETA"><input style={fieldStyle} type="date" value={matForm.delivery_eta||''} onChange={e=>setMatForm((f:any)=>({...f,delivery_eta:e.target.value}))}/></FormGroup>
                <FormGroup label="Status"><select style={{...fieldStyle,appearance:'none'}} value={matForm.status||'Pending'} onChange={e=>setMatForm((f:any)=>({...f,status:e.target.value}))}>{MAT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormGroup>
              </div>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: EXPENSES
      ══════════════════════════════════════════════════════ */}
      {tab === 'expenses' && can(role,'expenses') && (
        <div style={{ padding: space[4] }}>
          {/* Budget hero */}
          {budget > 0 && (
            <div style={{ ...card, marginBottom: space[4], background: C.navy, border:'none' }}>
              <div style={{ padding:`${space[4]} ${space[4]} ${space[3]}` }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: space[3], marginBottom: space[3] }}>
                  <div>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Budget</div>
                    <div style={{ fontSize: TY.size2xl, fontWeight: TY.weightBlack, color:'#fff' }}>{fmtCur(budget)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Spent</div>
                    <div style={{ fontSize: TY.size2xl, fontWeight: TY.weightBlack, color: totalSpent > budget ? '#f87171' : '#fff' }}>{fmtCur(totalSpent)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Left</div>
                    <div style={{ fontSize: TY.size2xl, fontWeight: TY.weightBlack, color: totalSpent > budget ? '#f87171' : '#34d399' }}>{fmtCur(budget - totalSpent)}</div>
                  </div>
                </div>
                <div style={{ height:'4px', background:'rgba(255,255,255,.15)', borderRadius: R.pill, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100, budget > 0 ? (totalSpent/budget)*100 : 0)}%`, background: totalSpent > budget ? '#f87171' : totalSpent > budget*0.85 ? '#fbbf24' : '#34d399', borderRadius: R.pill, transition:'width .6s ease' }}/>
                </div>
                <div style={{ fontSize: TY.sizeSm, color:'rgba(255,255,255,.45)', marginTop: space[1] }}>
                  {budget > 0 ? Math.round((totalSpent/budget)*100) : 0}% of budget used
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: space[3] }}>
            <button style={btnP} onClick={() => { setExpForm({ expense_date: today(), payment_status: 'Pending' }); setSheet('expense') }}>＋ Add</button>
          </div>

          {!pd.expenses.length && <BusinessEmptyState.NoExpenses onCta={() => { setExpForm({ expense_date: today(), payment_status: 'Pending' }); setSheet('expense') }} ctaLabel="＋ Add Expense"/>}

          <div style={{ ...card }}>
            {pd.expenses.map((e, i) => {
              const sc = getStatus(e.payment_status || 'Pending')
              return (
                <div key={e.id} style={{ display:'flex', gap: space[3], padding:`${space[3]} ${space[4]}`, borderBottom: i < pd.expenses.length-1 ? `1px solid ${C.border}` : 'none', alignItems:'center' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightSemibold, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                    <div style={{ fontSize: TY.sizeSm, color: C.slate, marginTop:'2px' }}>{fmtDate(e.expense_date)} · {e.category}{e.vendor ? ` · ${e.vendor}` : ''}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightBold, color: C.ink, marginBottom:'3px' }}>{fmtCur(e.amount)}</div>
                    <span style={{ padding:`1px ${space[2]}`, borderRadius: R.pill, fontSize: TY.sizeXs, fontWeight: TY.weightBold, background: sc.bg, color: sc.color }}>{e.payment_status}</span>
                  </div>
                  <button onClick={() => { setExpForm({...e}); setSheet('expense-edit-'+e.id) }} style={{ ...btnG, height:'30px', padding:`0 ${space[2]}`, fontSize: TY.sizeSm }}>Edit</button>
                  <button onClick={() => pd.deleteExpense(e.id)} style={{ ...btnD, height:'30px', padding:`0 ${space[2]}` }}>✕</button>
                </div>
              )
            })}
          </div>

          {(sheet === 'expense' || sheet?.startsWith('expense-edit-')) && (
            <Sheet title={sheet === 'expense' ? 'Add Expense' : 'Edit Expense'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'expense' ? pd.addExpense(expForm) : pd.updateExpense(expForm.id, expForm))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
              <FormGroup label="Description *"><input style={fieldStyle} value={expForm.description||''} onChange={e=>setExpForm((f:any)=>({...f,description:e.target.value}))}/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Amount (₹) *"><input style={fieldStyle} type="number" value={expForm.amount||''} onChange={e=>setExpForm((f:any)=>({...f,amount:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Date"><input style={fieldStyle} type="date" value={expForm.expense_date||today()} onChange={e=>setExpForm((f:any)=>({...f,expense_date:e.target.value}))}/></FormGroup>
                <FormGroup label="Category"><select style={{...fieldStyle,appearance:'none'}} value={expForm.category||EXP_CATS[0]} onChange={e=>setExpForm((f:any)=>({...f,category:e.target.value}))}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></FormGroup>
                <FormGroup label="Payment Status"><select style={{...fieldStyle,appearance:'none'}} value={expForm.payment_status||'Pending'} onChange={e=>setExpForm((f:any)=>({...f,payment_status:e.target.value}))}>{['Paid','Pending','Partial'].map(s=><option key={s}>{s}</option>)}</select></FormGroup>
                <FormGroup label="Vendor"><input style={fieldStyle} value={expForm.vendor||''} onChange={e=>setExpForm((f:any)=>({...f,vendor:e.target.value}))}/></FormGroup>
                <FormGroup label="Bill Ref"><input style={fieldStyle} value={expForm.bill_ref||''} onChange={e=>setExpForm((f:any)=>({...f,bill_ref:e.target.value}))}/></FormGroup>
              </div>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: BOQ
      ══════════════════════════════════════════════════════ */}
      {tab === 'boq' && (
        <div style={{ padding: space[4] }}>
          {/* BOQ Summary */}
          {pd.boq.length > 0 && (() => {
            const total    = pd.boq.reduce((s,r) => s + (r.amount ?? 0), 0)
            const execVal  = pd.boq.reduce((s,r) => s + (r.exec_value ?? 0), 0)
            const execPct  = total > 0 ? Math.round(execVal/total*100) : 0
            return (
              <div style={{ ...card, marginBottom: space[4], background: C.navy, border:'none' }}>
                <div style={{ padding:`${space[4]} ${space[4]} ${space[3]}` }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3], marginBottom: space[3] }}>
                    <div>
                      <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>BOQ Value</div>
                      <div style={{ fontSize: TY.size2xl, fontWeight: TY.weightBlack, color:'#fff' }}>{fmtCur(total)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: TY.sizeXs, fontWeight: TY.weightBold, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing: TY.trackingWide, marginBottom:'3px' }}>Executed</div>
                      <div style={{ fontSize: TY.size2xl, fontWeight: TY.weightBlack, color:'#34d399' }}>{fmtCur(execVal)}</div>
                    </div>
                  </div>
                  <div style={{ height:'4px', background:'rgba(255,255,255,.15)', borderRadius: R.pill, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${execPct}%`, background:'#34d399', borderRadius: R.pill }}/>
                  </div>
                  <div style={{ fontSize: TY.sizeSm, color:'rgba(255,255,255,.45)', marginTop: space[1] }}>{execPct}% executed · {pd.boq.length} items</div>
                </div>
              </div>
            )
          })()}

          <div style={{ display:'flex', gap: space[2], justifyContent:'flex-end', marginBottom: space[3] }}>
            <label style={{ ...btnG, cursor:'pointer', height:'44px' }}>
              📁 CSV
              <input type="file" accept=".csv" style={{ display:'none' }} onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                const text = await file.text()
                const lines = text.split('\n').filter(l=>l.trim())
                for (const [i, line] of lines.entries()) {
                  if (i===0 && line.toLowerCase().includes('desc')) continue
                  const cols = line.split(',').map(c=>c.trim().replace(/^["']|["']$/g,''))
                  if (!cols[0]) continue
                  await pd.addBOQ({ description:cols[0], spec:cols[1], unit:cols[2], qty:Number(cols[3]||0), rate:Number(cols[4]||0), exec_qty:0 })
                }
                toast('BOQ imported ✓')
              }}/>
            </label>
            <button style={btnP} onClick={() => { setBoqForm({ exec_qty: 0 }); setSheet('boq') }}>＋ Add</button>
          </div>

          {!pd.boq.length && <BusinessEmptyState.NoBOQ onCta={() => { setBoqForm({ exec_qty:0 }); setSheet('boq') }} ctaLabel="＋ Add Item"/>}

          {/* BOQ as cards on mobile — no horizontal scroll */}
          {pd.boq.map((r, i) => {
            const pct = r.qty ? Math.round((r.exec_qty/r.qty)*100) : 0
            return (
              <div key={r.id} style={{ ...card, marginBottom: space[2] }}>
                <div style={{ padding:`${space[3]} ${space[4]}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: space[2] }}>
                    <div style={{ flex:1, marginRight: space[2] }}>
                      <div style={{ fontSize: TY.sizeSm, color: C.slate, fontWeight: TY.weightBold, marginBottom:'1px' }}>#{i+1}</div>
                      <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightSemibold }}>{r.description}</div>
                      {r.spec && <div style={{ fontSize: TY.sizeSm, color: C.slate }}>{r.spec}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightBold, color: C.ink }}>{fmtCur(r.amount)}</div>
                      <div style={{ fontSize: TY.sizeSm, color: C.slate }}>{r.qty} {r.unit} @ {fmtCur(r.rate)}</div>
                    </div>
                  </div>
                  <div style={{ marginBottom: space[2] }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ fontSize: TY.sizeSm, color: C.slate }}>Executed</span>
                      <span style={{ fontSize: TY.sizeSm, fontWeight: TY.weightBold, color: C_.info }}>{r.exec_qty} / {r.qty} {r.unit} · {pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={C_.info}/>
                  </div>
                  <div style={{ display:'flex', gap: space[2] }}>
                    <button onClick={() => { setBoqForm({...r}); setSheet('boq-edit-'+r.id) }} style={{ ...btnG, height:'32px', flex:1 }}>Edit</button>
                    <button onClick={() => { if(confirm('Delete?')) pd.deleteBOQ(r.id) }} style={{ ...btnD, height:'32px' }}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}

          {(sheet === 'boq' || sheet?.startsWith('boq-edit-')) && (
            <Sheet title={sheet === 'boq' ? 'Add BOQ Item' : 'Edit BOQ Item'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'boq' ? pd.addBOQ(boqForm) : pd.updateBOQ(boqForm.id, boqForm))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
              <FormGroup label="Description *"><input style={fieldStyle} value={boqForm.description||''} onChange={e=>setBoqForm((f:any)=>({...f,description:e.target.value}))}/></FormGroup>
              <FormGroup label="Specification"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={boqForm.spec||''} onChange={e=>setBoqForm((f:any)=>({...f,spec:e.target.value}))}/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Unit"><input style={fieldStyle} value={boqForm.unit||''} onChange={e=>setBoqForm((f:any)=>({...f,unit:e.target.value}))}/></FormGroup>
                <FormGroup label="Quantity"><input style={fieldStyle} type="number" value={boqForm.qty||''} onChange={e=>setBoqForm((f:any)=>({...f,qty:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Rate (₹)"><input style={fieldStyle} type="number" value={boqForm.rate||''} onChange={e=>setBoqForm((f:any)=>({...f,rate:Number(e.target.value)}))}/></FormGroup>
                <FormGroup label="Executed Qty"><input style={fieldStyle} type="number" value={boqForm.exec_qty||0} onChange={e=>setBoqForm((f:any)=>({...f,exec_qty:Number(e.target.value)}))}/></FormGroup>
              </div>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: DOCUMENTS
      ══════════════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <div style={{ padding: space[4] }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: space[3] }}>
            <button style={btnP} onClick={() => { setDocForm({ type:'Other', approval_status:'Draft' }); setSheet('document') }}>＋ Link</button>
          </div>

          {!pd.documents.length && <BusinessEmptyState.NoDocuments onCta={() => { setDocForm({ type:'Other', approval_status:'Draft' }); setSheet('document') }} ctaLabel="＋ Link Document"/>}

          <div style={{ ...card }}>
            {pd.documents.map((d, i) => {
              const sc = getStatus(d.approval_status || 'Draft')
              return (
                <div key={d.id} style={{ display:'flex', gap: space[3], padding:`${space[3]} ${space[4]}`, borderBottom: i < pd.documents.length-1 ? `1px solid ${C.border}` : 'none', alignItems:'center' }}>
                  {/* Icon */}
                  <div onClick={() => { const url = d.external_url || d.public_url; if (url) window.open(url, '_blank') }} style={{ width:'40px', height:'40px', borderRadius: R.md, background: C.mist, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0, cursor: d.external_url || d.public_url ? 'pointer' : 'default' }}>
                    {DOC_ICONS[d.type] || '📁'}
                  </div>
                  <div style={{ flex:1, minWidth:0, cursor: d.external_url || d.public_url ? 'pointer' : 'default' }} onClick={() => { const url = d.external_url || d.public_url; if (url) window.open(url, '_blank') }}>
                    <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightSemibold, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                    <div style={{ display:'flex', gap: space[2], marginTop:'3px', flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize: TY.sizeXs, color: C.slate }}>{d.type}</span>
                      {d.revision && <span style={{ fontSize: TY.sizeXs, color: C.slate }}>Rev {d.revision}</span>}
                      <span style={{ padding:`1px ${space[2]}`, borderRadius: R.pill, fontSize: TY.sizeXs, fontWeight: TY.weightBold, background: sc.bg, color: sc.color }}>{d.approval_status}</span>
                    </div>
                  </div>
                  <button onClick={() => { setDocForm({...d}); setSheet('document-edit-'+d.id) }} style={{ ...btnG, height:'30px', padding:`0 ${space[2]}`, fontSize: TY.sizeSm }}>Edit</button>
                  <button onClick={() => pd.deleteDocument(d.id)} style={{ ...btnD, height:'30px', padding:`0 ${space[2]}` }}>✕</button>
                </div>
              )
            })}
          </div>

          {(sheet === 'document' || sheet?.startsWith('document-edit-')) && (
            <Sheet title={sheet === 'document' ? 'Link Document' : 'Edit Document'} onClose={() => setSheet(null)}
              footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'document' ? pd.addDocument(docForm) : pd.updateDocument(docForm.id, docForm))} style={{ ...btnP, flex:1, justifyContent:'center' }}>Save</button></>}>
              <FormGroup label="Document Name *"><input style={fieldStyle} value={docForm.name||''} onChange={e=>setDocForm((f:any)=>({...f,name:e.target.value}))}/></FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: space[3] }}>
                <FormGroup label="Doc Number"><input style={fieldStyle} value={docForm.doc_number||''} onChange={e=>setDocForm((f:any)=>({...f,doc_number:e.target.value}))}/></FormGroup>
                <FormGroup label="Revision"><input style={fieldStyle} value={docForm.revision||''} onChange={e=>setDocForm((f:any)=>({...f,revision:e.target.value}))} placeholder="Rev A"/></FormGroup>
                <FormGroup label="Type"><select style={{...fieldStyle,appearance:'none'}} value={docForm.type||'Other'} onChange={e=>setDocForm((f:any)=>({...f,type:e.target.value}))}>{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormGroup>
                <FormGroup label="Approval"><select style={{...fieldStyle,appearance:'none'}} value={docForm.approval_status||'Draft'} onChange={e=>setDocForm((f:any)=>({...f,approval_status:e.target.value}))}>{['Draft','Submitted','Approved','Rejected','Superseded'].map(s=><option key={s}>{s}</option>)}</select></FormGroup>
              </div>
              <FormGroup label="Drive / OneDrive / Dropbox URL"><input style={fieldStyle} type="url" value={docForm.external_url||''} onChange={e=>setDocForm((f:any)=>({...f,external_url:e.target.value}))} placeholder="https://…"/></FormGroup>
              <FormGroup label="Notes"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={docForm.notes||''} onChange={e=>setDocForm((f:any)=>({...f,notes:e.target.value}))}/></FormGroup>
            </Sheet>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: PHOTOS
      ══════════════════════════════════════════════════════ */}
      {tab === 'photos' && (
        <div style={{ padding: space[4] }}>
          <div style={{ display:'flex', gap: space[2], justifyContent:'flex-end', marginBottom: space[3] }}>
            <label style={{ ...btnG, cursor:'pointer', height:'44px' }}>
              📷 Camera
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files) }}/>
            </label>
            <label style={{ ...btnP, cursor:'pointer', height:'44px' }}>
              🖼 Gallery
              <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files) }}/>
            </label>
          </div>

          {!pd.photos.length && (
            <EmptyState
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
              title="No Photos Yet"
              body="Capture site progress, deliveries and installations."
            />
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'2px' }}>
            {pd.photos.map(ph => (
              <div key={ph.id} style={{ aspectRatio:'1', background: C.mist, overflow:'hidden', position:'relative', cursor:'pointer' }}>
                <img src={ph.public_url} alt="" loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onClick={() => window.open(ph.public_url, '_blank')}/>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(0,0,0,.6))', color:'#fff', fontSize:'9px', padding:'12px 6px 4px', fontWeight: TY.weightMedium }}>
                  {ph.category}
                </div>
                <button onClick={() => { if(confirm('Delete photo?')) pd.deletePhoto(ph.id) }} style={{ position:'absolute', top:'4px', right:'4px', width:'22px', height:'22px', borderRadius:'50%', background:'rgba(220,38,38,.85)', color:'#fff', border:'none', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          QUICK ADD SHEET
      ══════════════════════════════════════════════════════ */}
      {sheet === 'quick-add' && (
        <Sheet title="Quick Add" onClose={() => setSheet(null)}>
          {[
            { ic:'📝', lbl:'Daily Log',   key:'log',      perm:'logs'        },
            { ic:'📋', lbl:'Milestone',   key:'milestone',perm:'milestones'  },
            { ic:'📦', lbl:'Material',    key:'material', perm:'materials'   },
            { ic:'💰', lbl:'Expense',     key:'expense',  perm:'expenses'    },
            { ic:'📁', lbl:'Document',    key:'document', perm:''            },
            { ic:'📊', lbl:'BOQ Item',    key:'boq',      perm:''            },
          ].filter(x => !x.perm || can(role, x.perm as any)).map(x => (
            <div key={x.key} onClick={() => {
              setLogForm({ log_date: today(), labour: {} })
              setMsForm({})
              setMatForm({})
              setExpForm({ expense_date: today() })
              setDocForm({ type:'Other', approval_status:'Draft' })
              setBoqForm({ exec_qty: 0 })
              setSheet(x.key)
            }} style={{ display:'flex', alignItems:'center', gap: space[3], padding:`${space[3]} 0`, borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
              <div style={{ width:'40px', height:'40px', borderRadius: R.md, background: C.mist, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>{x.ic}</div>
              <div style={{ fontSize: TY.sizeLg, fontWeight: TY.weightSemibold }}>{x.lbl}</div>
              <div style={{ marginLeft:'auto' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))}
        </Sheet>
      )}
    </div>
  )
}
