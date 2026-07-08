// ════════════════════════════════════════════════════════════
// EBOS Phase 2.0 – WorkspacePage
// Inbox · Tasks · Reminders · Activity
// ════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useWorkspace, TASK_CATEGORIES, REMINDER_CATS, PRIORITIES, TASK_STATUSES } from '../hooks/useWorkspace'
// notifications passed as props from App.tsx
import { colors as C_, space, radius as R, T, type as TY } from '../design/tokens'
import { Sheet, FormGroup, Badge, EmptyState } from '../design/components'
import { fmtMoney, smartDate } from '../design/business'
import { supabase } from '../lib/supabase'
import type { User, UserRole } from '../types'

// ── Style aliases ──────────────────────────────────────────────
const C = {
  navy:C_.brand, gold:C_.gold, white:'#fff',
  mist:C_.bgMuted, border:C_.border, ink:C_.textPrimary,
  slate:C_.textSecondary, green:C_.success, greenBg:C_.successBg,
  amber:C_.warning, amberBg:C_.warningBg, red:C_.danger, redBg:C_.dangerBg,
  teal:C_.teal, tealBg:C_.tealBg,
}
const card      = T.card
const btnP      = T.btnPrimary
const btnG      = T.btnOutline
const btnD      = T.btnDanger
const fieldStyle= T.field
const fieldLabel= T.fieldLabel

function today() { return new Date().toISOString().split('T')[0] }

const PRIORITY_COLOR: Record<string,[string,string]> = {
  Critical: [C_.dangerBg,  C_.danger],
  High:     [C_.warningBg, C_.warning],
  Normal:   [C_.infoBg,    C_.info],
  Low:      [C_.bgMuted,   C_.textSecondary],
}

// ── Props ──────────────────────────────────────────────────────
interface WorkspacePageProps {
  user: User
  role: UserRole
  ws: ReturnType<typeof useWorkspace>
  notifications: any[]
  markAllRead: () => void
  unreadCount: number
}

// ════════════════════════════════════════════════════════════
export function WorkspacePage({ user, role, ws, notifications, markAllRead, unreadCount }: WorkspacePageProps) {
  // all data received as props — no hooks called here
  const [tab,   setTab]   = useState<'inbox'|'tasks'|'reminders'|'activity'>('inbox')
  const [sheet, setSheet] = useState<string | null>(null)
  const [form,  setForm]  = useState<any>({})

  function sf(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }
  function gv(k: string) { return form[k] ?? '' }

  const todayStr = today()
  // ── TAB BAR ───────────────────────────────────────────────
  const TABS = [
    { key:'inbox',     label:'Inbox',     badge: unreadCount },
    { key:'tasks',     label:'Tasks',     badge: ws.overdueTasks.length },
    { key:'reminders', label:'Reminders', badge: ws.overdueReminders.length },
    { key:'activity',  label:'Activity',  badge: 0 },
  ]

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:'80px' }}>
      {/* Navy hero */}
      <div style={{ background: C.navy, padding:`${space[4]} ${space[4]} 0` }}>
        <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:space[1] }}>Workspace</div>
        <div style={{ fontSize:'26px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', marginBottom:space[1] }}>
          {ws.myTasks.length > 0 ? `${ws.myTasks.length} open task${ws.myTasks.length>1?'s':''}` : 'All clear'}
        </div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,.45)', marginBottom:space[4] }}>
          {ws.todayReminders.length > 0 ? `${ws.todayReminders.length} reminder${ws.todayReminders.length>1?'s':''} due today` : 'No reminders due today'}
        </div>
        {/* Quick stats */}
        {(ws.overdueTasks.length > 0 || ws.overdueReminders.length > 0) && (
          <div style={{ display:'flex', gap:space[2], marginBottom:space[4] }}>
            {ws.overdueTasks.length > 0 && <span style={{ padding:`${space[1]} ${space[2]}`, background:'rgba(220,38,38,.2)', color:'#fca5a5', borderRadius:R.pill, fontSize:TY.sizeXs, fontWeight:700 }}>⚠ {ws.overdueTasks.length} overdue task{ws.overdueTasks.length>1?'s':''}</span>}
            {ws.overdueReminders.length > 0 && <span style={{ padding:`${space[1]} ${space[2]}`, background:'rgba(217,119,6,.2)', color:'#fcd34d', borderRadius:R.pill, fontSize:TY.sizeXs, fontWeight:700 }}>🔔 {ws.overdueReminders.length} overdue reminder{ws.overdueReminders.length>1?'s':''}</span>}
          </div>
        )}
        {/* Tabs */}
        <div data-no-swipe="true" style={{ display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch', marginBottom:'-1px' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{ position:'relative', padding:`${space[2]} ${space[3]}`, fontSize:'12px', fontWeight:tab===t.key?700:500, color:tab===t.key?'#fff':'rgba(255,255,255,.45)', border:'none', background:'transparent', borderBottom:`2px solid ${tab===t.key?'#fff':'transparent'}`, whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', marginBottom:'-1px', transition:'color .15s' }}>
              {t.label}
              {t.badge > 0 && <span style={{ position:'absolute', top:'6px', right:'4px', width:'16px', height:'16px', borderRadius:R.pill, background:C_.danger, color:'#fff', fontSize:'9px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{t.badge > 9 ? '9+' : t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:`${space[4]} ${space[4]} 0` }}>

        {/* ══════════════════════════════════════════════════════
            INBOX
        ══════════════════════════════════════════════════════ */}
        {tab === 'inbox' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:space[3] }}>
              <div style={{ fontSize:TY.sizeSm, color:C.slate }}>{unreadCount} unread</div>
              {unreadCount > 0 && <button onClick={markAllRead} style={{ ...btnG, height:'32px', fontSize:TY.sizeSm }}>Mark all read</button>}
            </div>

            {!notifications.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
                title="Inbox is empty"
                body="Task assignments, overdue reminders and project updates will appear here."
              />
            )}

            {notifications.map(n => (
              <div key={n.id} style={{ ...card, marginBottom:space[2], opacity: n.is_read ? 0.6 : 1 }}>
                <div style={{ padding:`${space[3]} ${space[4]}`, display:'flex', gap:space[3], alignItems:'flex-start' }}>
                  <div style={{ width:'8px', height:'8px', borderRadius:R.pill, background: n.is_read ? 'transparent' : C_.danger, marginTop:'5px', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:TY.sizeSm, fontWeight:TY.weightBold, color: n.type==='reminder'?C_.warning:n.type==='task'?C_.info:C_.textSecondary, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:'2px' }}>{n.type || 'Notification'}</div>
                    <div style={{ fontSize:TY.sizeLg, fontWeight:TY.weightSemibold, color:C.ink, marginBottom:'2px' }}>{n.title}</div>
                    <div style={{ fontSize:TY.sizeMd, color:C.slate, lineHeight:TY.lineRelaxed }}>{n.message}</div>
                    <div style={{ fontSize:TY.sizeSm, color:C.slate, marginTop:space[1] }}>{smartDate(n.created_at, 'ago')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TASKS
        ══════════════════════════════════════════════════════ */}
        {tab === 'tasks' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:space[3] }}>
              <button style={btnP} onClick={() => { setForm({ priority:'Normal', category:'General', status:'Open' }); setSheet('task') }}>＋ Add Task</button>
            </div>

            {!ws.tasks.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                title="No Tasks"
                body="Assign tasks to yourself or team members. Track status and priority."
                ctaLabel="＋ Create First Task"
                onCta={() => { setForm({ priority:'Normal', category:'General', status:'Open' }); setSheet('task') }}
              />
            )}

            {/* Group by status */}
            {(['Open','In Progress','Waiting'] as const).map(status => {
              const group = ws.tasks.filter((t: any) => t.status === status)
              if (!group.length) return null
              return (
                <div key={status} style={{ marginBottom:space[4] }}>
                  <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C.slate, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>{status} · {group.length}</div>
                  <div style={{ ...card }}>
                    {group.map((t: any, i: number) => {
                      const isOverdue = t.due_date && t.due_date < todayStr
                      const [pbg, pc] = PRIORITY_COLOR[t.priority] ?? PRIORITY_COLOR.Normal
                      return (
                        <div key={t.id} style={{ padding:`${space[3]} ${space[4]}`, borderBottom: i < group.length-1 ? `1px solid ${C.border}` : 'none' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[1] }}>
                            <div style={{ flex:1, minWidth:0, marginRight:space[2] }}>
                              <div style={{ fontSize:TY.sizeLg, fontWeight:TY.weightSemibold, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                              {t.description && <div style={{ fontSize:TY.sizeSm, color:C.slate, marginTop:'2px', lineHeight:TY.lineRelaxed }}>{t.description.slice(0,100)}{t.description.length>100?'…':''}</div>}
                            </div>
                            <span style={{ padding:`1px ${space[2]}`, borderRadius:R.pill, fontSize:TY.sizeXs, fontWeight:TY.weightBold, background:pbg, color:pc, flexShrink:0 }}>{t.priority}</span>
                          </div>
                          <div style={{ display:'flex', gap:space[2], flexWrap:'wrap', alignItems:'center', marginTop:space[2] }}>
                            {t.assignee && <span style={{ fontSize:TY.sizeSm, color:C.slate }}>→ {t.assignee.full_name}</span>}
                            {t.creator && t.creator.id !== t.assignee?.id && <span style={{ fontSize:TY.sizeSm, color:C.slate }}>by {t.creator.full_name}</span>}
                            {t.due_date && <span style={{ fontSize:TY.sizeSm, color: isOverdue ? C_.danger : C.slate }}>📅 {smartDate(t.due_date)}{isOverdue ? ' ⚠' : ''}</span>}
                            {t.project && <span style={{ fontSize:TY.sizeSm, color:C.slate }}>📁 {t.project.name}</span>}
                          </div>
                          <div style={{ display:'flex', gap:space[2], marginTop:space[2] }}>
                            <button onClick={() => ws.updateTask(t.id, { status:'Completed' })} style={{ ...btnP, height:'32px', flex:1, fontSize:TY.sizeSm }}>✓ Complete</button>
                            <button onClick={() => { setForm({ ...t, due_date:t.due_date??'', project_id:t.project_id??'', assigned_to:t.assigned_to??'' }); setSheet('task-edit-'+t.id) }} style={{ ...btnG, height:'32px', fontSize:TY.sizeSm }}>Edit</button>
                            <button onClick={() => { if(confirm('Delete task?')) ws.deleteTask(t.id) }} style={{ ...btnD, height:'32px' }}>✕</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Completed */}
            {ws.tasks.filter((t: any)=>t.status==='Completed').length > 0 && (
              <div>
                <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C_.success, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>Completed · {ws.tasks.filter((t: any)=>t.status==='Completed').length}</div>
                <div style={{ ...card, opacity:0.6 }}>
                  {ws.tasks.filter((t: any)=>t.status==='Completed').slice(0,5).map((t: any, i: number, arr: any[]) => (
                    <div key={t.id} style={{ padding:`${space[3]} ${space[4]}`, borderBottom: i<arr.length-1?`1px solid ${C.border}`:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:TY.sizeLg, fontWeight:TY.weightMedium, textDecoration:'line-through', color:C.slate, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                        <div style={{ fontSize:TY.sizeSm, color:C.slate }}>{t.completed_at ? smartDate(t.completed_at, 'ago') : ''}</div>
                      </div>
                      <button onClick={() => { if(confirm('Delete?')) ws.deleteTask(t.id) }} style={{ ...btnD, height:'28px', fontSize:TY.sizeSm, marginLeft:space[2] }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Sheet */}
            {(sheet === 'task' || sheet?.startsWith('task-edit-')) && (
              <Sheet title={sheet === 'task' ? 'New Task' : 'Edit Task'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={async () => {
                  const err = sheet === 'task' ? await ws.addTask(form) : await ws.updateTask(form.id, form)
                  if (err) alert('Error: ' + err)
                  else setSheet(null)
                }} style={{ ...btnP, flex:1 }}>Save</button></>}>
                <FormGroup label="Title *"><input style={fieldStyle} value={gv('title')} onChange={e=>sf('title',e.target.value)} placeholder="What needs to be done?" autoFocus/></FormGroup>
                <FormGroup label="Description"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={gv('description')} onChange={e=>sf('description',e.target.value)}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:space[3] }}>
                  <FormGroup label="Assign To"><select style={{...fieldStyle,appearance:'none'}} value={gv('assigned_to')} onChange={e=>sf('assigned_to',e.target.value)}>
                    <option value="">— Unassigned</option>
                    <option value={user.id}>{user.full_name} (Me)</option>
                    {ws.teamUsers.filter((u: any) => u.id !== user.id).map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace(/_/g,' ')})</option>)}
                    {ws.teamUsers.filter((u: any) => u.id !== user.id).map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace(/_/g,' ')})</option>)}
                  </select></FormGroup>
                  <FormGroup label="Priority"><select style={{...fieldStyle,appearance:'none'}} value={gv('priority')||'Normal'} onChange={e=>sf('priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormGroup>
                  <FormGroup label="Category"><select style={{...fieldStyle,appearance:'none'}} value={gv('category')||'General'} onChange={e=>sf('category',e.target.value)}>{TASK_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></FormGroup>
                  <FormGroup label="Status"><select style={{...fieldStyle,appearance:'none'}} value={gv('status')||'Open'} onChange={e=>sf('status',e.target.value)}>{TASK_STATUSES.map(s=><option key={s}>{s}</option>)}</select></FormGroup>
                  <FormGroup label="Due Date"><input style={fieldStyle} type="date" value={gv('due_date')} onChange={e=>sf('due_date',e.target.value)}/></FormGroup>
                </div>
              </Sheet>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            REMINDERS
        ══════════════════════════════════════════════════════ */}
        {tab === 'reminders' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:space[3] }}>
              <button style={btnP} onClick={() => { setForm({ priority:'Normal', category:'General', repeat_type:'None', due_date:today() }); setSheet('reminder') }}>＋ Add Reminder</button>
            </div>

            {!ws.reminders.filter((r: any)=>!r.is_complete).length && !ws.reminders.filter((r: any)=>r.is_complete).length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
                title="No Reminders"
                body="Create reminders for GST, EMIs, vendor payments, client follow-ups and more."
                ctaLabel="＋ Create First Reminder"
                onCta={() => { setForm({ priority:'Normal', category:'General', repeat_type:'None', due_date:today() }); setSheet('reminder') }}
              />
            )}

            {/* Overdue */}
            {ws.overdueReminders.length > 0 && (
              <div style={{ marginBottom:space[4] }}>
                <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C_.danger, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>⚠ Overdue · {ws.overdueReminders.length}</div>
                <div style={{ ...card, border:`1px solid ${C_.danger}` }}>
                  {ws.overdueReminders.map((r: any, i: number) => <ReminderRow key={r.id} r={r} i={i} total={ws.overdueReminders.length} ws={ws} setForm={setForm} setSheet={setSheet} user={user}/>)}
                </div>
              </div>
            )}

            {/* Today */}
            {ws.todayReminders.length > 0 && (
              <div style={{ marginBottom:space[4] }}>
                <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C_.warning, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>Due Today · {ws.todayReminders.length}</div>
                <div style={{ ...card, border:`1px solid ${C_.warning}` }}>
                  {ws.todayReminders.map((r: any, i: number) => <ReminderRow key={r.id} r={r} i={i} total={ws.todayReminders.length} ws={ws} setForm={setForm} setSheet={setSheet} user={user}/>)}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {ws.upcomingReminders.length > 0 && (
              <div style={{ marginBottom:space[4] }}>
                <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C.slate, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>Upcoming · {ws.upcomingReminders.length}</div>
                <div style={{ ...card }}>
                  {ws.upcomingReminders.map((r: any, i: number) => <ReminderRow key={r.id} r={r} i={i} total={ws.upcomingReminders.length} ws={ws} setForm={setForm} setSheet={setSheet} user={user}/>)}
                </div>
              </div>
            )}

            {/* Completed */}
            {ws.reminders.filter((r: any)=>r.is_complete).length > 0 && (
              <div>
                <div style={{ fontSize:TY.sizeXs, fontWeight:TY.weightBold, color:C_.success, textTransform:'uppercase', letterSpacing:TY.trackingWide, marginBottom:space[2] }}>Done · {ws.reminders.filter((r: any)=>r.is_complete).length}</div>
                <div style={{ ...card, opacity:0.55 }}>
                  {ws.reminders.filter((r: any)=>r.is_complete).slice(0,5).map((r: any, i: number, arr: any[]) => (
                    <div key={r.id} style={{ padding:`${space[3]} ${space[4]}`, borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:TY.sizeLg, fontWeight:TY.weightMedium, textDecoration:'line-through', color:C.slate }}>{r.title}</div>
                        <div style={{ fontSize:TY.sizeSm, color:C.slate }}>{r.completed_at ? smartDate(r.completed_at,'ago') : ''}</div>
                      </div>
                      <button onClick={() => ws.deleteReminder(r.id)} style={{ ...btnD, height:'28px' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminder Sheet */}
            {(sheet === 'reminder' || sheet?.startsWith('reminder-edit-')) && (
              <Sheet title={sheet === 'reminder' ? 'New Reminder' : 'Edit Reminder'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnG, flex:0 }}>Cancel</button><button onClick={async () => {
                  const payload = { ...form, assigned_to: form.assigned_to || user.id }
                  const err = sheet === 'reminder' ? await ws.addReminder(payload) : await ws.updateReminder(form.id, payload)
                  if (err) alert('Error: ' + err)
                  else setSheet(null)
                }} style={{ ...btnP, flex:1 }}>Save</button></>}>
                <FormGroup label="Title *"><input style={fieldStyle} value={gv('title')} onChange={e=>sf('title',e.target.value)} placeholder="e.g. GST Payment — July" autoFocus/></FormGroup>
                <FormGroup label="Description"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={gv('description')} onChange={e=>sf('description',e.target.value)} placeholder="Details, reference numbers…"/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:space[3] }}>
                  <FormGroup label="Category"><select style={{...fieldStyle,appearance:'none'}} value={gv('category')||'General'} onChange={e=>sf('category',e.target.value)}>{REMINDER_CATS.map(c=><option key={c}>{c}</option>)}</select></FormGroup>
                  <FormGroup label="Priority"><select style={{...fieldStyle,appearance:'none'}} value={gv('priority')||'Normal'} onChange={e=>sf('priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormGroup>
                  <FormGroup label="Due Date *"><input style={fieldStyle} type="date" value={gv('due_date')||today()} onChange={e=>sf('due_date',e.target.value)}/></FormGroup>
                  <FormGroup label="Repeat"><select style={{...fieldStyle,appearance:'none'}} value={gv('repeat_type')||'None'} onChange={e=>sf('repeat_type',e.target.value)}>{['None','Daily','Weekly','Monthly','Quarterly','Yearly'].map(r=><option key={r}>{r}</option>)}</select></FormGroup>
                </div>
                <FormGroup label="Assign To">
                  <select style={{...fieldStyle,appearance:'none'}} value={gv('assigned_to')||user.id} onChange={e=>sf('assigned_to',e.target.value)}>
                    <option value="">— Unassigned</option>
                    <option value={user.id}>{user.full_name} (Me)</option>
                    {ws.teamUsers.filter((u: any) => u.id !== user.id).map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace(/_/g,' ')})</option>)}
                    {ws.teamUsers.filter((u: any) => u.id !== user.id).map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.role.replace(/_/g,' ')})</option>)}
                  </select>
                </FormGroup>
              </Sheet>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ACTIVITY
        ══════════════════════════════════════════════════════ */}
        {tab === 'activity' && (
          <div>
            {!ws.activity.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                title="No Activity Yet"
                body="Team activity across all projects and modules will appear here."
              />
            )}
            {ws.activity.map((a: any, i: number) => (
              <div key={a.id} style={{ display:'flex', gap:space[3], marginBottom:space[3], alignItems:'flex-start' }}>
                {/* Avatar */}
                <div style={{ width:'32px', height:'32px', borderRadius:R.md, background:C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:TY.sizeXs, fontWeight:TY.weightBold, flexShrink:0 }}>
                  {(a.user?.full_name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:TY.sizeLg, color:C.ink, lineHeight:TY.lineRelaxed }}>
                    <strong style={{ fontWeight:TY.weightSemibold }}>{a.user?.full_name || 'System'}</strong>{' '}
                    {a.action}
                  </div>
                  {a.entity_type && <div style={{ fontSize:TY.sizeSm, color:C_.info, marginTop:'2px' }}>{a.entity_type.replace(/_/g,' ')}</div>}
                  <div style={{ fontSize:TY.sizeSm, color:C.slate, marginTop:'2px' }}>{smartDate(a.created_at,'ago')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Reminder row component ─────────────────────────────────────
function ReminderRow({ r, i, total, ws, setForm, setSheet, user }: any) {
  const REPEAT_ICONS: Record<string,string> = { Daily:'↻', Weekly:'↻', Monthly:'↻', Quarterly:'↻', Yearly:'↻', None:'' }
  const [pbg, pc] = ({ Critical:[C_.dangerBg,C_.danger], High:[C_.warningBg,C_.warning], Normal:[C_.infoBg,C_.info], Low:[C_.bgMuted,C_.textSecondary] } as Record<string,[string,string]>)[r.priority] ?? [C_.bgMuted, C_.textSecondary]

  return (
    <div style={{ padding:`${space[3]} ${space[4]}`, borderBottom: i<total-1?`1px solid ${C_.border}`:'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:space[1] }}>
        <div style={{ flex:1, minWidth:0, marginRight:space[2] }}>
          <div style={{ fontSize:TY.sizeLg, fontWeight:TY.weightSemibold, color:C_.textPrimary, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {REPEAT_ICONS[r.repeat_type] && <span style={{ color:C_.info, marginRight:'4px' }}>{REPEAT_ICONS[r.repeat_type]}</span>}
            {r.title}
          </div>
          {r.description && <div style={{ fontSize:TY.sizeSm, color:C_.textSecondary, marginTop:'2px' }}>{r.description}</div>}
          <div style={{ display:'flex', gap:space[2], marginTop:space[1], flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:TY.sizeSm, color:C_.textSecondary }}>📅 {smartDate(r.due_date)}</span>
            <span style={{ padding:`1px ${space[2]}`, fontSize:TY.sizeXs, fontWeight:TY.weightBold, background:pbg, color:pc, borderRadius:'99px' }}>{r.priority}</span>
            {r.repeat_type !== 'None' && <span style={{ fontSize:TY.sizeSm, color:C_.info }}>{r.repeat_type}</span>}
            {r.category !== 'General' && <span style={{ fontSize:TY.sizeSm, color:C_.textSecondary }}>{r.category}</span>}
            {r.assignee && r.assignee.id !== user.id && <span style={{ fontSize:TY.sizeSm, color:C_.textSecondary }}>→ {r.assignee.full_name}</span>}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:space[2], marginTop:space[2] }}>
        <button onClick={() => ws.completeReminder(r.id)} style={{ ...T.btnPrimary, height:'32px', flex:1, fontSize:TY.sizeSm }}>✓ Done</button>
        <button onClick={() => { setForm({ ...r, due_date:r.due_date, assigned_to:r.assigned_to??'' }); setSheet('reminder-edit-'+r.id) }} style={{ ...T.btnOutline, height:'32px', fontSize:TY.sizeSm }}>Edit</button>
        <button onClick={() => { if(confirm('Delete?')) ws.deleteReminder(r.id) }} style={{ ...T.btnDanger, height:'32px' }}>✕</button>
      </div>
    </div>
  )
}
