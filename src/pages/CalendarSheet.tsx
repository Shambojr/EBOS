// ════════════════════════════════════════════════════════════
// EBOS Calendar Sheet
// Aggregates: reminders, tasks, project deadlines, receivables,
// payables, funding repayments — all in one monthly view
// ════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { colors as C_, space, radius as R, type as TY } from '../design/tokens'
import { Ico } from '../design/icons'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '../design/icons'

// ── Types ──────────────────────────────────────────────────────
interface CalEvent {
  date:  string   // YYYY-MM-DD
  title: string
  type:  'project' | 'milestone' | 'reminder' | 'task' | 'receivable' | 'payable' | 'funding'
  color: string
  sub?:  string
}

interface CalendarSheetProps {
  onClose:    () => void
  reminders:  any[]
  tasks:      any[]
  projects:   any[]
  userId:     string
}

// ── Color map ──────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  project:    '#7c3aed',
  reminder:   C_.warning,
  task:       C_.info,
  receivable: C_.success,
  payable:    C_.danger,
  funding:    '#8b5cf6',
}

const TYPE_LABEL: Record<string, string> = {
  project:    'Project Deadline',
  reminder:   'Reminder',
  task:       'Task',
  receivable: 'Receivable Due',
  payable:    'Payable Due',
  funding:    'Loan Repayment',
}

// ── Calendar helpers ──────────────────────────────────────────
const toKey  = (d: Date) => d.toISOString().split('T')[0]
const today  = () => toKey(new Date())
const padded = (n: number) => String(n).padStart(2,'0')

function monthKey(year: number, month: number) {
  return `${year}-${padded(month+1)}`
}

function daysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate() }

// Returns 0=Mon … 6=Sun offset for first day
function startOffset(y: number, m: number) {
  const d = new Date(y, m, 1).getDay()  // 0=Sun
  return d === 0 ? 6 : d - 1
}

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ══════════════════════════════════════════════════════════════
export function CalendarSheet({ onClose, reminders, tasks, projects, userId }: CalendarSheetProps) {
  const now     = new Date()
  const [year,  setYear]    = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth())
  const [sel,   setSel]     = useState(today())
  const [fin,   setFin]     = useState<any>({ receivables:[], payables:[], funding:[] })
  const [events, setEvents] = useState<CalEvent[]>([])

  // Fetch finance data once
  useEffect(() => {
    async function load() {
      const [r, p, f] = await Promise.all([
        supabase.from('receivables').select('expected_date, client_name, bill_number, status').neq('status','Paid'),
        supabase.from('payables').select('due_date, supplier_name, invoice_number, status').neq('status','Paid'),
        supabase.from('funding').select('repayment_date, source_name, status').neq('status','Repaid'),
      ])
      setFin({ receivables: r.data??[], payables: p.data??[], funding: f.data??[] })
    }
    load()
  }, [])

  // Aggregate all events
  useEffect(() => {
    const ev: CalEvent[] = []

    // Project deadlines
    projects.filter(p => p.end_date).forEach(p => ev.push({
      date: p.end_date!, title: p.name, type:'project', color: TYPE_COLOR.project, sub: `${p.progress}% complete`
    }))

    // Reminders
    reminders.filter(r => !r.is_complete && r.due_date).forEach(r => ev.push({
      date: r.due_date, title: r.title, type:'reminder', color: TYPE_COLOR.reminder, sub: r.category
    }))

    // Tasks
    tasks.filter(t => t.due_date && t.status !== 'Completed').forEach(t => ev.push({
      date: t.due_date!, title: t.title, type:'task', color: TYPE_COLOR.task, sub: t.status
    }))

    // Finance
    fin.receivables.filter((r:any) => r.expected_date).forEach((r:any) => ev.push({
      date: r.expected_date, title: r.client_name, type:'receivable', color: TYPE_COLOR.receivable, sub: `Bill ${r.bill_number}`
    }))
    fin.payables.filter((p:any) => p.due_date).forEach((p:any) => ev.push({
      date: p.due_date, title: p.supplier_name, type:'payable', color: TYPE_COLOR.payable, sub: p.invoice_number||''
    }))
    fin.funding.filter((f:any) => f.repayment_date).forEach((f:any) => ev.push({
      date: f.repayment_date, title: f.source_name, type:'funding', color: TYPE_COLOR.funding, sub: 'Loan repayment'
    }))

    setEvents(ev)
  }, [reminders, tasks, projects, fin])

  // Navigate months
  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11) } else setMonth(m=>m-1) }
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0) } else setMonth(m=>m+1) }

  // Events by date key
  const byDate: Record<string, CalEvent[]> = {}
  events.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e) })

  // Selected day events
  const selEvents = byDate[sel] ?? []

  // Calendar grid
  const offset = startOffset(year, month)
  const days   = daysInMonth(year, month)
  const cells  = Array.from({ length: offset + days }, (_, i) => i < offset ? null : i - offset + 1)
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = today()

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:500,
      display:'flex', flexDirection:'column',
      background:'rgba(0,0,0,.4)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Sheet */}
      <div style={{
        marginTop:'auto', background:'#fff',
        borderRadius:'20px 20px 0 0',
        maxHeight:'92vh', display:'flex', flexDirection:'column',
        boxShadow:'0 -4px 24px rgba(0,0,0,.12)',
      }}>
        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
          <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:C_.border }}/>
        </div>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:`${space[3]} ${space[4]}` }}>
          <div style={{ fontSize:'18px', fontWeight:800, color:C_.textPrimary, letterSpacing:'-0.01em' }}>Calendar</div>
          <button onClick={onClose} style={{ width:'32px', height:'32px', borderRadius:'50%', background:C_.bgMuted, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C_.textSecondary }}>
            <Ico icon={XMarkIcon} size={16}/>
          </button>
        </div>

        {/* Month navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:`0 ${space[4]} ${space[3]}` }}>
          <button onClick={prevMonth} style={{ width:'34px', height:'34px', borderRadius:'10px', background:C_.bgMuted, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C_.textSecondary }}>
            <Ico icon={ChevronLeftIcon} size={18}/>
          </button>
          <div style={{ fontSize:'16px', fontWeight:700, color:C_.textPrimary }}>
            {MONTHS[month]} {year}
          </div>
          <button onClick={nextMonth} style={{ width:'34px', height:'34px', borderRadius:'10px', background:C_.bgMuted, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C_.textSecondary }}>
            <Ico icon={ChevronRightIcon} size={18}/>
          </button>
        </div>

        {/* Day labels */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:`0 ${space[3]}` }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:'11px', fontWeight:700, color:C_.textTertiary, padding:'4px 0' }}>
              {d[0]}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:`0 ${space[3]}`, gap:'2px' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`}/>
            const dateKey = `${year}-${padded(month+1)}-${padded(day)}`
            const isToday = dateKey === todayStr
            const isSel   = dateKey === sel
            const evs     = byDate[dateKey] ?? []
            const hasEvs  = evs.length > 0

            // Unique colors for dots (max 3)
            const dotColors = [...new Set(evs.map(e => e.color))].slice(0, 3)

            return (
              <div key={dateKey} onClick={() => setSel(dateKey)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center',
                  padding:'6px 2px', borderRadius:'10px', cursor:'pointer',
                  background: isSel ? C_.brand : isToday ? C_.bgMuted : 'transparent',
                  transition:'background .1s ease',
                }}>
                <span style={{
                  fontSize:'14px', fontWeight: isToday || isSel ? 700 : 400,
                  color: isSel ? '#fff' : isToday ? C_.brand : C_.textPrimary,
                  lineHeight:1.4,
                }}>
                  {day}
                </span>
                {/* Event dots */}
                <div style={{ display:'flex', gap:'2px', marginTop:'3px', height:'5px', alignItems:'center' }}>
                  {dotColors.map((col, di) => (
                    <div key={di} style={{ width:'4px', height:'4px', borderRadius:'50%', background: isSel ? 'rgba(255,255,255,.7)' : col, flexShrink:0 }}/>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ height:'1px', background:C_.border, margin:`${space[3]} 0 0` }}/>

        {/* Selected day events */}
        <div style={{ flex:1, overflowY:'auto', padding:`${space[3]} ${space[4]} ${space[5]}` }}>
          <div style={{ fontSize:'12px', fontWeight:700, color:C_.textSecondary, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:space[2] }}>
            {sel === todayStr ? 'Today' : new Date(sel+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
            {selEvents.length > 0 && ` · ${selEvents.length} item${selEvents.length>1?'s':''}`}
          </div>

          {selEvents.length === 0 && (
            <div style={{ textAlign:'center', padding:`${space[5]} 0`, color:C_.textTertiary, fontSize:'14px' }}>
              Nothing scheduled
            </div>
          )}

          {selEvents.map((e, i) => (
            <div key={i} style={{
              display:'flex', gap:space[3], alignItems:'flex-start',
              padding:`${space[3]} 0`,
              borderBottom: i < selEvents.length-1 ? `1px solid ${C_.border}` : 'none',
            }}>
              <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:e.color, flexShrink:0, marginTop:'4px' }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'14px', fontWeight:600, color:C_.textPrimary }}>{e.title}</div>
                <div style={{ fontSize:'12px', color:C_.textSecondary, marginTop:'2px' }}>
                  {TYPE_LABEL[e.type]}{e.sub ? ` · ${e.sub}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
