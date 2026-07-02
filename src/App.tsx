import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useProjects } from './hooks/useProjects'
import { useNotifications } from './hooks/useNotifications'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { LoginPage } from './pages/LoginPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { DirectorOffice } from './pages/DirectorOffice'
import { can, PROJECT_TABS, NAV_TABS } from './lib/rbac'
import { useProjectData } from './hooks/useProjectData'
import { supabase } from './lib/supabase'
import { logActivity } from './lib/logger'
import { LOGO_NAVY } from './assets/logo'
import { colors as C_, space, radius as R, shadow, text as TT, T, type as TY, motion as MO, iconSize } from './design/tokens'
import { toast, Sheet, FormGroup, RangeField, EmptyState, HealthBadge, Badge, SyncIndicator, Avatar, ProgressBar, EnterpriseCard, KPITile, StatGrid, HeroCard, ConfirmDialog, ListRow, ActivityItem, FormSection, PageHeader } from './design/components'
import type { Project, Milestone, UserRole } from './types'

// ── Helpers ────────────────────────────────────────────────────
function uid() { return crypto.randomUUID() }
function today() { return new Date().toISOString().split('T')[0] }
function fmtDate(d?: string | null) { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtCur(n?: number | null) { if (!n) return '₹0'; if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr'; if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L'; if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K'; return '₹' + n.toLocaleString('en-IN') }
function initials(n?: string) { return (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }
function isOverdue(d?: string | null) { return d ? new Date(d + 'T00:00:00') < new Date() : false }
function daysLeft(d?: string | null) { if (!d) return null; return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 864e5) }
function fmtAgo(ts: string) { const s = (Date.now() - new Date(ts).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago' }
function projectHealth(p: Project) { const sp = p.total_spent ?? 0; const b = p.budget ?? 0; const hasOverdue = false; if (b && sp > b) return 'red'; if (b && sp > b * 0.85) return 'amber'; const dl = daysLeft(p.end_date); if (dl !== null && dl < 7 && p.progress < 90) return 'amber'; return 'green' }
const STAGES = ['Tender','Planning','Procurement','Site Prep','Foundation','Civil Works','MGPS','HVAC','Electrical','Plumbing','Finishing','Testing','Commissioning','Handover']
const STAGE_ICONS = ['📋','📐','🛒','🚧','🏗','🧱','🔵','❄️','⚡','🔧','🎨','🧪','⚙️','🏁']
const EXP_CATS = ['Materials','Labour','Equipment','Transport','Professional Fees','Subcontract','GST','Misc']
const MAT_STATUSES = ['Pending','Ordered','In Transit','Delivered','Partially Delivered','Delayed','Cancelled']
const DOC_TYPES = ['Drawing','BOQ','Certificate','Contract','Report','Invoice','Photo','Approval','Other']
const LOG_TRADES = ['Masons','Carpenters','Electricians','Plumbers','Welders','Helpers','Engineers','Others']
const MS_PRIORITIES = ['Low','Medium','High','Critical']
const PROJ_TYPES = ['MOT (Modular OT)','MGPS','HVAC','Civil','Electrical','Plumbing','Combined','Renovation']

// ── Design system aliases (consumed from ./design/tokens) ──────
// C = semantic color shorthand (backwards compatible)
const C = {
  navy:    C_.brand,      navyL:   C_.brandLight,  navyD:   C_.brandDark,
  blue:    C_.info,       gold:    C_.gold,         white:   '#fff',
  ash:     C_.bgApp,      mist:    C_.bgMuted,      border:  C_.border,
  border2: C_.divider,    ink:     C_.textPrimary,  body:    C_.textPrimary,
  slate:   C_.textSecondary, faint: C_.textTertiary,
  green:   C_.success,    greenBg: C_.successBg,    amber:   C_.warning,
  amberBg: C_.warningBg,  red:    C_.danger,        redBg:   C_.dangerBg,
  teal:    C_.teal,       tealBg:  C_.tealBg,
}
const SF        = { fontFamily:"'Inter',system-ui,sans-serif", fontSize:'15px', color: C.ink }
const goldRule  = T.goldRule
const btnPrimary= T.btnPrimary
const btnGhost  = T.btnOutline
const btnDanger = T.btnDanger
const fieldStyle= T.field
const fieldLabel= T.fieldLabel
const card      = T.card

// HealthBadge, Badge, SyncIndicator imported from ./design/components

// toast imported from ./design/components

// Sheet imported from ./design/components

// FormGroup imported from ./design/components

// RangeField imported from ./design/components

// EmptyState imported from ./design/components

// ── Main Inner App (after auth) ────────────────────────────────
function InnerApp() {
  const { user, signOut } = useAuth()
  const { status: syncStatus, pending } = useOnlineStatus()
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id)
  const { projects, loading: projLoading, createProject, updateProject, deleteProject } = useProjects(user?.profile ?? null)
  const [view, setView] = useState<'home' | 'projects' | 'project' | 'logs' | 'activity' | 'more' | 'users' | 'finance'>('home')
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [tab, setTab] = useState('overview')
  const [sheet, setSheet] = useState<string | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const role = user!.profile.role as UserRole
  const navTabs = NAV_TABS[role]

  const goProject = (p: Project) => { setActiveProject(p); setTab('overview'); setView('project') }
  const goBack = () => { setActiveProject(null); setView('projects') }

  // ── SWIPE GESTURES ─────────────────────────────────────────
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const MAIN_ORDER = ['home', 'projects', 'finance'] as const
  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-no-swipe]')) { touchRef.current = null; return }
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    touchRef.current = null
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (view === 'home' || view === 'projects' || view === 'finance') {
      const idx = MAIN_ORDER.indexOf(view as any)
      const next = dx < 0 ? idx + 1 : idx - 1
      if (next >= 0 && next < MAIN_ORDER.length) setView(MAIN_ORDER[next])
    } else if (view === 'project' && activeProject) {
      const allowedTabs = PROJECT_TABS[role]
      const idx = allowedTabs.indexOf(tab)
      const next = dx < 0 ? idx + 1 : idx - 1
      if (next >= 0 && next < allowedTabs.length) setTab(allowedTabs[next])
    }
  }

  // ── TOP BAR ────────────────────────────────────────────────
  const TopBar = () => (
    <div style={{ height:'52px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px 0 16px', position:'sticky', top:0, zIndex:30, flexShrink:0 }}>
      {/* Left */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0 }}>
        {view === 'project' ? (
          <button onClick={goBack} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'14px', fontWeight:600, color: C.navy, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', minWidth:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeProject?.name}</span>
          </button>
        ) : (
          <img src={LOGO_NAVY} alt="Ease Builders" style={{ height:'28px', width:'auto', display:'block' }}/>
        )}
      </div>
      {/* Right */}
      <div style={{ display:'flex', alignItems:'center', gap:'2px' }}>
        {view === 'project' && activeProject && (
          <button onClick={() => { setProjForm({ ...activeProject }); setEditProjId(activeProject.id); setSheet('edit-project') }}
            style={{ padding:'6px 10px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'13px', fontWeight:600, color: C.slate, borderRadius:'8px' }}>Edit</button>
        )}
        {/* Online dot */}
        <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'6px 8px' }}>
          <div style={{ width:'7px', height:'7px', borderRadius:'50%', background: syncStatus === 'online' ? C.green : syncStatus === 'offline' ? C.red : C.amber }}/>
        </div>
        {/* Notifications */}
        <button onClick={() => setShowNotifs(true)}
          style={{ width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', borderRadius:'10px', position:'relative' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && <span style={{ position:'absolute', top:'7px', right:'7px', width:'6px', height:'6px', borderRadius:'50%', background: C.red }}/>}
        </button>
        {/* Avatar → profile sheet */}
        <button onClick={() => setShowProfile(true)}
          style={{ width:'32px', height:'32px', borderRadius:'10px', background: C.navy, color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'12px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', marginLeft:'2px' }}>
          {initials(user?.profile.full_name)}
        </button>
      </div>
    </div>
  )

  // ── BOTTOM NAV ─────────────────────────────────────────────
  const NAV_ICONS: Record<string, JSX.Element> = {
    home:     <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    projects: <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    logs:     <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    finance:  <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M6 3h12M6 8h12M6 13h6a6 6 0 0 0 0-10"/><path d="M6 21l6-8H6"/></svg>,
    activity: <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    more:     <svg viewBox="0 0 24 24" style={{width:22,height:22,stroke:'currentColor',strokeWidth:1.8,fill:'none',strokeLinecap:'round',strokeLinejoin:'round'}}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>,
  }
  const BottomNav = () => (
    <nav style={{ height:'64px', background:'#fff', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', paddingBottom:'env(safe-area-inset-bottom,0px)', position:'sticky', bottom:0, zIndex:30, flexShrink:0 }}>
      {navTabs.map((t, i) => {
        if (i === Math.floor(navTabs.length / 2)) {
          return (
            <div key="fab" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
              <button
                onClick={() => view === 'project' ? setSheet('quick-add') : setSheet('new-project')}
                style={{ width:'50px', height:'50px', background: C.navy, color:'#fff', borderRadius:'16px', border:'none', fontSize:'24px', cursor:'pointer', marginTop:'-18px', boxShadow:'0 4px 16px rgba(30,58,74,.35)', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform 0.12s ease' }}
                onTouchStart={e=>(e.currentTarget.style.transform='scale(.93)')}
                onTouchEnd={e=>(e.currentTarget.style.transform='scale(1)')}
              >＋</button>
            </div>
          )
        }
        const isActive = view === t.key
        return (
          <div key={t.key} onClick={() => setView(t.key as any)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', padding:'6px 0', cursor:'pointer', WebkitTapHighlightColor:'transparent' as any }}>
            <div style={{ padding:'4px 10px', borderRadius:'10px', background: isActive ? C.mist : 'transparent', transition:'background 0.15s ease', color: isActive ? C.navy : C.slate }}>
              {NAV_ICONS[t.key]}
            </div>
            <span style={{ fontSize:'10px', fontWeight: isActive ? 700 : 500, color: isActive ? C.navy : C.slate, transition:'color 0.15s ease' }}>{t.label}</span>
          </div>
        )
      })}
    </nav>
  )

  // ── NOTIFICATION PANEL ─────────────────────────────────────
  const NotifPanel = () => showNotifs ? (
    <Sheet title="Notifications" onClose={() => setShowNotifs(false)}
      footer={notifications.length > 0 ? <button onClick={markAllRead} style={{ ...btnPrimary, flex:1 }}>Mark all read</button> : undefined}>
      {!notifications.length ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 24px', textAlign:'center' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'16px', background: C.mist, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ fontSize:'16px', fontWeight:700, color: C.navy, marginBottom:'6px' }}>All caught up</div>
          <div style={{ fontSize:'13px', color: C.slate, lineHeight:1.6 }}>No new notifications right now.</div>
        </div>
      ) : notifications.map(n => (
        <div key={n.id} onClick={() => setShowNotifs(false)}
          style={{ display:'flex', gap:'12px', padding:'14px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer', opacity: n.is_read ? 0.55 : 1 }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: n.is_read ? 'transparent' : C.amber, marginTop:'5px', flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color: C.amber, marginBottom:'3px' }}>{n.type.replace(/_/g,' ')}</div>
            <div style={{ fontSize:'14px', fontWeight:600, color: C.navy, marginBottom:'3px' }}>{n.title}</div>
            <div style={{ fontSize:'13px', color: C.slate, lineHeight:1.5 }}>{n.message}</div>
          </div>
        </div>
      ))}
    </Sheet>
  ) : null

  // ── PROFILE SHEET ──────────────────────────────────────────
  const ProfileSheet = () => showProfile ? (
    <Sheet title="Account" onClose={() => setShowProfile(false)}>
      <div style={{ display:'flex', gap:'14px', alignItems:'center', padding:'4px 0 20px' }}>
        <div style={{ width:'52px', height:'52px', borderRadius:'16px', background: C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, flexShrink:0 }}>
          {initials(user?.profile.full_name)}
        </div>
        <div>
          <div style={{ fontSize:'17px', fontWeight:700, color: C.navy }}>{user?.profile.full_name}</div>
          <div style={{ fontSize:'13px', color: C.slate, marginTop:'2px' }}>{user?.email}</div>
          <div style={{ display:'inline-block', marginTop:'6px', padding:'2px 10px', borderRadius:'99px', background: C.mist, fontSize:'11px', fontWeight:600, color: C.slate, textTransform:'capitalize' }}>
            {role.replace(/_/g,' ')}
          </div>
        </div>
      </div>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:'16px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>App</div>
        <div style={{ fontSize:'12px', color: C.slate, lineHeight:1.8 }}>
          Ease Builders Site Manager<br/>
          Secured by Supabase · Real-time sync
        </div>
      </div>
      <div style={{ marginTop:'24px' }}>
        <button onClick={() => { setShowProfile(false); signOut() }}
          style={{ ...btnDanger, width:'100%', justifyContent:'center', height:'44px' }}>
          Sign Out
        </button>
      </div>
    </Sheet>
  ) : null

  // ── PROJECT DATA LOADER ────────────────────────────────────
  const ProjectView = ({ project }: { project: Project }) => {
    const pd = useProjectData(project.id, user?.profile ?? null)
    const allowedTabs = PROJECT_TABS[role]
    const totalSpent = pd.expenses.reduce((s, e) => s + e.amount, 0)
    const budget = project.budget ?? 0
    const health = projectHealth({ ...project, total_spent: totalSpent })

    // form states
    const [msForm, setMsForm]     = useState<any>({})
    const [logForm, setLogForm]   = useState<any>({})
    const [matForm, setMatForm]   = useState<any>({})
    const [expForm, setExpForm]   = useState<any>({})
    const [docForm, setDocForm]   = useState<any>({})
    const [boqForm, setBoqForm]   = useState<any>({})
    const [editMs, setEditMs]     = useState<string | null>(null)
    const [editMat, setEditMat]   = useState<string | null>(null)
    const [editLog, setEditLog]   = useState<string | null>(null)



    const save = async (fn: () => Promise<string | null>) => {
      const err = await fn()
      if (err) toast('Error: ' + err)
      else { toast('Saved ✓'); setSheet(null) }
    }

    return (
      <div style={{ flex:1, overflowY:'auto', paddingBottom:'80px' }}>
        {/* Tabs */}
        <div style={{ position:'sticky', top:0, zIndex:20, background:'#fff', borderBottom:`1px solid ${C.border}` }}>
          <div data-no-swipe="true" style={{ overflowX:'auto', display:'flex', padding:'0 8px', WebkitOverflowScrolling:'touch' }}>
            {allowedTabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:'10px 12px', fontSize:'13px', fontWeight: tab===t ? 600 : 500, color: tab===t ? C.blue : C.slate, border:'none', background:'none', borderBottom:`2px solid ${tab===t ? C.blue : 'transparent'}`, whiteSpace:'nowrap', cursor:'pointer', fontFamily:'inherit', transition:'color .15s', marginBottom:'-1px' }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* TAB: OVERVIEW */}
        {tab === 'overview' && (
          <div>
            <div style={{ height:'8px' }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', padding:'0 16px' }}>
              {[
                {label:'Progress', value:`${project.progress}%`, color:'blue'},
                {label:'Budget', value: fmtCur(budget) || '—', color:'gold'},
                {label:'Spent', value: fmtCur(totalSpent), color: budget && totalSpent > budget ? 'red' : 'green'},
                {label:'Deadline', value: fmtDate(project.end_date), color:'blue'},
              ].map(s => (
                <div key={s.label} style={{ ...card, padding:'14px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background: s.color==='gold'?C.gold:s.color==='green'?C.green:s.color==='red'?C.red:C.blue, borderRadius:'12px 0 0 12px' }}/>
                  <div style={{ fontSize:'10px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'6px', paddingLeft:'6px' }}>{s.label}</div>
                  <div style={{ fontSize:'18px', fontWeight:800, color: C.navy, letterSpacing:'-0.02em', paddingLeft:'6px' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ height:'16px' }}/>
            <div style={{ padding:'0 16px' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.1em', textTransform:'uppercase' }}>Project Details</div>
              <div style={{ width:'28px', height:'2.5px', background: C.gold, borderRadius:'2px', marginTop:'5px', marginBottom:'12px' }}/>
              <div style={{ ...card }}>
                <div style={{ padding:'14px 16px' }}>
                  {([['Type', project.type],['Client', project.client],['Location', project.location],['Stage', project.stage],['Start', fmtDate(project.start_date)],['End', fmtDate(project.end_date)]] as [string,string|undefined][]).map(([k,v]) => (
                    <div key={k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:'11px', fontWeight:700, color: C.slate, textTransform:'uppercase', letterSpacing:'.06em' }}>{k}</span>
                      <span style={{ fontSize:'13px', fontWeight:600 }}>{v || '—'}</span>
                    </div>
                  ))}
                  {project.notes && <div style={{ marginTop:'12px', padding:'10px', background: C.mist, borderRadius:'6px', borderLeft:`3px solid ${C.gold}`, fontSize:'13px', color: C.body, lineHeight:1.6 }}>{project.notes}</div>}
                </div>
              </div>
            </div>
            <div style={{ height:'16px' }}/>
            {pd.logs.slice(0,3).map(l => (
              <div key={l.id} style={{ ...card, margin:'0 16px 8px' }}>
                <div style={{ background: C.mist, padding:'11px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: C.blue, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>{initials(l.logger?.full_name)}</div>
                    <div><div style={{ fontSize:'13px', fontWeight:600 }}>{l.logger?.full_name || '—'}</div><div style={{ fontSize:'11px', color: C.slate }}>{fmtDate(l.log_date)}</div></div>
                  </div>
                </div>
                <div style={{ padding:'12px 14px', fontSize:'13px', color: C.body, lineHeight:1.6 }}>{l.site_update?.slice(0,120)}{l.site_update?.length > 120 ? '…' : ''}</div>
              </div>
            ))}
            <div style={{ height:'20px' }}/>
          </div>
        )}

        {/* TAB: STAGES */}
        {tab === 'stages' && (
          <div style={{ padding:'16px' }}>
            <div style={{ overflowX:'auto', paddingBottom:'8px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', minWidth:'max-content', padding:'14px 0', gap:0 }}>
                {STAGES.map((s, i) => {
                  const si = STAGES.indexOf(project.stage || '')
                  const done = i < si, active = i === si
                  return (
                    <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', minWidth:'64px', position:'relative' }}>
                      {i > 0 && <div style={{ position:'absolute', right:'calc(100% - 28px)', top:'18px', width:'36px', height:'2px', background: i <= si ? C.blue : C.border }}/>}
                      <div onClick={async () => {
                        await supabase.from('projects').update({ stage: s, progress: Math.max(project.progress, Math.round((i+1)/STAGES.length*100)) }).eq('id', project.id)
                        toast(`Stage: ${s}`)
                      }} style={{ width:'36px', height:'36px', borderRadius:'50%', border:`2px solid ${active ? C.navy : done ? C.blue : C.border}`, background: active ? C.navy : done ? C.blue : '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', cursor:'pointer', color: (active||done) ? '#fff' : C.slate, zIndex:1, position:'relative' }}>
                        {done ? '✓' : STAGE_ICONS[i]}
                      </div>
                      <div style={{ fontSize:'9px', fontWeight:600, color: active ? C.navy : done ? C.blue : C.slate, textAlign:'center', maxWidth:'64px' }}>{s}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: MILESTONES */}
        {tab === 'milestones' && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
              <button style={btnPrimary} onClick={() => { setMsForm({}); setEditMs(null); setSheet('milestone') }}>＋ Add</button>
            </div>
            {!pd.milestones.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
                title="No Milestones Yet"
                body="Track key project checkpoints and deadlines."
                ctaLabel="+ Add First Milestone"
                onCta={() => { setMsForm({}); setEditMs(null); setSheet('milestone') }}
              />
            )}
            <div style={{ ...card }}>
              {pd.milestones.map(m => {
                const over = !m.done && isOverdue(m.due_date)
                return (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
                    <div onClick={() => pd.toggleMilestone(m.id, !m.done)}
                      style={{ width:'22px', height:'22px', borderRadius:'5px', border:`2px solid ${m.done ? C.green : over ? C.red : C.border2}`, background: m.done ? C.green : 'transparent', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                      {m.done ? '✓' : ''}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:500, textDecoration: m.done ? 'line-through' : 'none', color: m.done ? C.slate : C.ink }}>{m.name}</div>
                      <div style={{ fontSize:'11px', color: over ? C.red : C.slate, marginTop:'2px' }}>{over ? '⚠ Overdue · ' : ''}{fmtDate(m.due_date)}{m.assignee ? ' · ' + m.assignee.full_name : ''}</div>
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: C.blue }}>{m.pct}%</div>
                    <button onClick={() => { setMsForm({ ...m, due_date: m.due_date ?? '', assignee_id: m.assignee_id ?? '', priority: m.priority, pct: m.pct, notes: m.notes ?? '' }); setEditMs(m.id); setSheet('milestone') }} style={{ ...btnGhost, border:'none', padding:'4px 8px', fontSize:'13px' }}>✎</button>
                    <button onClick={() => { if(confirm('Delete this milestone?')) pd.deleteMilestone(m.id) }} style={{ ...btnGhost, border:'none', padding:'4px 8px', fontSize:'13px', color: C.red }}>✕</button>
                  </div>
                )
              })}
            </div>

            {sheet === 'milestone' && (
              <Sheet title={editMs ? 'Edit Milestone' : 'Add Milestone'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => editMs ? pd.updateMilestone(editMs, msForm) : pd.addMilestone(msForm))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button></>}>
                <FormGroup label="Name *"><input className="eb-field" style={fieldStyle} value={msForm.name||''} onChange={e=>setMsForm((f:any)=>({...f,name:e.target.value}))} placeholder="Milestone name"/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <FormGroup label="Due Date"><input style={fieldStyle} type="date" value={msForm.due_date||''} onChange={e=>setMsForm((f:any)=>({...f,due_date:e.target.value}))}/></FormGroup>
                  <FormGroup label="Priority"><select style={{...fieldStyle, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 13px center',paddingRight:'36px',appearance:'none'}} value={msForm.priority||'Medium'} onChange={e=>setMsForm((f:any)=>({...f,priority:e.target.value}))}>{MS_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></FormGroup>
                </div>
                <RangeField label="Completion %" id="ms-pct" value={msForm.pct??0} onChange={v=>setMsForm((f:any)=>({...f,pct:v}))}/>
                <FormGroup label="Notes"><textarea style={{...fieldStyle, minHeight:'60px', resize:'vertical'}} value={msForm.notes||''} onChange={e=>setMsForm((f:any)=>({...f,notes:e.target.value}))}/></FormGroup>
              </Sheet>
            )}
          </div>
        )}

        {/* TAB: LOGS */}
        {tab === 'logs' && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
              <button style={btnPrimary} onClick={() => { setLogForm({ log_date: today(), labour: {} }); setEditLog(null); setSheet('log') }}>＋ Log</button>
            </div>
            {!pd.logs.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                title="No Logs Yet"
                body="Record daily site activity."
                ctaLabel="+ Add First Log"
                onCta={() => { setLogForm({ log_date: today(), labour: {} }); setSheet('log') }}
              />
            )}
            {pd.logs.map(l => {
              const logPhotos = pd.photosForLog(l.id)
              return (
              <div key={l.id} style={{ ...card, marginBottom:'14px' }}>
                <div style={{ background: C.mist, padding:'13px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <div style={{ width:'32px', height:'32px', borderRadius:'10px', background: C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700 }}>{initials(l.logger?.full_name)}</div>
                    <div><div style={{ fontSize:'14px', fontWeight:700 }}>{l.logger?.full_name || '—'}</div><div style={{ fontSize:'12px', color: C.slate }}>{fmtDate(l.log_date)}</div></div>
                  </div>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    {l.day_progress != null && <Badge label={`${l.day_progress}%`} color="blue"/>}
                    <button onClick={() => { setLogForm({ ...l, log_date: l.log_date, labour: l.labour ?? {} }); setEditLog(l.id); setSheet('log') }} style={{ ...btnGhost, border:'none', padding:'4px 8px', fontSize:'13px' }}>✎</button>
                    <button onClick={() => { if(confirm('Delete this log?')) pd.deleteLog(l.id) }} style={btnDanger}>✕</button>
                  </div>
                </div>
                <div style={{ padding:'16px' }}>
                  {l.achievements && <div style={{ marginBottom:'10px' }}><div style={{ fontSize:'10px', fontWeight:700, color: C.slate, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'4px' }}>Achievements</div><div style={{ fontSize:'13px', color: C.body, lineHeight:1.6 }}>{l.achievements}</div></div>}
                  <div style={{ fontSize:'14px', color: C.body, lineHeight:1.6 }}>{l.site_update}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'10px' }}>
                    {l.weather && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'5px 10px', background: C.mist, borderRadius:'99px', fontSize:'11px', color: C.slate, border:`1px solid ${C.border}` }}>🌤 {l.weather}</span>}
                    {Object.values(l.labour || {}).reduce((a:number, v:any) => a+Number(v), 0) > 0 && <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'5px 10px', background: C.mist, borderRadius:'99px', fontSize:'11px', color: C.slate, border:`1px solid ${C.border}` }}>👷 {Object.values(l.labour||{}).reduce((a:number,v:any)=>a+Number(v),0)}</span>}
                    {l.client_visit && <span style={{ padding:'5px 10px', background:'#eff6ff', borderRadius:'99px', fontSize:'11px', color: C.blue, border:`1px solid #bfdbfe` }}>👤 Client Visit</span>}
                    {l.safety_issues && <span style={{ padding:'5px 10px', background: C.redBg, borderRadius:'99px', fontSize:'11px', color: C.red, border:'1px solid #fecaca' }}>🦺 Safety Issue</span>}
                  </div>
                  {l.next_plan && <div style={{ marginTop:'10px', padding:'10px', background: C.tealBg, borderRadius:'10px', borderLeft:`3px solid ${C.teal}`, fontSize:'12px' }}><div style={{ fontSize:'10px', fontWeight:700, color: C.slate, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'2px' }}>Tomorrow</div>{l.next_plan}</div>}

                  {/* Photo thumbnails attached to this log */}
                  {logPhotos.length > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px', marginTop:'12px' }}>
                      {logPhotos.map(ph => (
                        <div key={ph.id} style={{ aspectRatio:'1', background: C.mist, borderRadius:'10px', overflow:'hidden', position:'relative', cursor:'pointer' }}>
                          <img src={ph.public_url} alt={ph.name||''} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onClick={() => window.open(ph.public_url, '_blank')}/>
                          <button onClick={() => { if(confirm('Delete photo?')) pd.deletePhoto(ph.id) }} style={{ position:'absolute', top:'3px', right:'3px', width:'18px', height:'18px', borderRadius:'50%', background:'rgba(220,38,38,.85)', color:'#fff', border:'none', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Camera / Gallery buttons */}
                  <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                    <label style={{ ...btnGhost, cursor:'pointer' }}>
                      📷 Camera
                      <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files, 'General', l.id) }}/>
                    </label>
                    <label style={{ ...btnGhost, cursor:'pointer' }}>
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
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => editLog ? pd.updateLog(editLog, logForm) : pd.addLog({ ...logForm, logged_by: user!.id }))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>{editLog ? 'Save Changes' : 'Save Log'}</button></>}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <FormGroup label="Date"><input style={fieldStyle} type="date" value={logForm.log_date||today()} onChange={e=>setLogForm((f:any)=>({...f,log_date:e.target.value}))}/></FormGroup>
                  <FormGroup label="Weather"><select style={{...fieldStyle,appearance:'none'}} value={logForm.weather||''} onChange={e=>setLogForm((f:any)=>({...f,weather:e.target.value}))}><option value="">—</option>{['Clear','Partly Cloudy','Cloudy','Light Rain','Heavy Rain','Hot','Windy'].map(w=><option key={w}>{w}</option>)}</select></FormGroup>
                </div>
                <FormGroup label="Achievements Today"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.achievements||''} onChange={e=>setLogForm((f:any)=>({...f,achievements:e.target.value}))} placeholder="What was accomplished?"/></FormGroup>
                <FormGroup label="Site Update *"><textarea style={{...fieldStyle,resize:'vertical'}} value={logForm.site_update||''} onChange={e=>setLogForm((f:any)=>({...f,site_update:e.target.value}))} placeholder="Work done, decisions, observations…"/></FormGroup>
                <RangeField label="Day Progress %" id="log-pct" value={logForm.day_progress??0} onChange={v=>setLogForm((f:any)=>({...f,day_progress:v}))}/>
                <FormGroup label="Labour by Trade">
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                    {LOG_TRADES.map(t => <input key={t} style={{...fieldStyle, padding:'8px 10px', marginBottom:0}} type="number" placeholder={t} value={logForm.labour?.[t]||''} onChange={e=>setLogForm((f:any)=>({...f,labour:{...f.labour,[t]:Number(e.target.value)||0}}))}/>)}
                  </div>
                </FormGroup>
                <FormGroup label="Issues / Problems"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.issues||''} onChange={e=>setLogForm((f:any)=>({...f,issues:e.target.value}))}/></FormGroup>
                <FormGroup label="Tomorrow's Plan"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={logForm.next_plan||''} onChange={e=>setLogForm((f:any)=>({...f,next_plan:e.target.value}))}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <FormGroup label="Client Visit"><select style={{...fieldStyle,appearance:'none'}} value={logForm.client_visit?'1':''} onChange={e=>setLogForm((f:any)=>({...f,client_visit:e.target.value==='1'}))}><option value="">No</option><option value="1">Yes</option></select></FormGroup>
                  <FormGroup label="Safety Issues"><select style={{...fieldStyle,appearance:'none'}} value={logForm.safety_issues?'1':''} onChange={e=>setLogForm((f:any)=>({...f,safety_issues:e.target.value==='1'}))}><option value="">No</option><option value="1">Yes</option></select></FormGroup>
                </div>
              </Sheet>
            )}
          </div>
        )}

        {/* TAB: MATERIALS */}
        {tab === 'materials' && can(role,'materials') && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
              <button style={btnPrimary} onClick={() => { setMatForm({}); setEditMat(null); setSheet('material') }}>＋ Add</button>
            </div>
            {!pd.materials.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
                title="No Materials"
                body="Track procurement and deliveries."
                ctaLabel="+ Add Material"
                onCta={() => { setMatForm({}); setEditMat(null); setSheet('material') }}
              />
            )}
            {pd.materials.map(m => (
              <div key={m.id} style={{ ...card, marginBottom:'10px' }}>
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{m.name}</div>
                    <Badge label={m.status} color={m.status==='Delivered'?'green':m.status==='Delayed'||m.status==='Cancelled'?'red':'amber'}/>
                  </div>
                  <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', fontSize:'12px', color: C.slate }}>
                    <span>Ordered: <strong>{m.qty_ordered} {m.unit}</strong></span>
                    <span>Rcvd: <strong style={{color:C.green}}>{m.qty_received}</strong></span>
                    <span>ETA: <strong>{fmtDate(m.delivery_eta)}</strong></span>
                    {m.supplier && <span>Supplier: <strong>{m.supplier}</strong></span>}
                  </div>
                  <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
                    <button onClick={() => { setMatForm({...m}); setEditMat(m.id); setSheet('material') }} style={btnGhost}>Edit</button>
                    <button onClick={() => pd.deleteMaterial(m.id)} style={btnDanger}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {sheet === 'material' && (
              <Sheet title={editMat ? 'Edit Material' : 'Add Material'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => editMat ? pd.updateMaterial(editMat, matForm) : pd.addMaterial(matForm))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button></>}>
                <FormGroup label="Item Name *"><input style={fieldStyle} value={matForm.name||''} onChange={e=>setMatForm((f:any)=>({...f,name:e.target.value}))} placeholder="e.g. Medical Oxygen Pipeline SS 316L"/></FormGroup>
                <FormGroup label="Specification"><input style={fieldStyle} value={matForm.spec||''} onChange={e=>setMatForm((f:any)=>({...f,spec:e.target.value}))}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
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

        {/* TAB: EXPENSES */}
        {tab === 'expenses' && can(role,'expenses') && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              <div style={{ ...card, padding:'14px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background: C.gold, borderRadius:'12px 0 0 12px' }}/>
                <div style={{ fontSize:'10px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'6px', paddingLeft:'6px' }}>Spent</div>
                <div style={{ fontSize:'18px', fontWeight:800, color: C.navy, paddingLeft:'6px' }}>{fmtCur(totalSpent)}</div>
              </div>
              <div style={{ ...card, padding:'14px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background: budget && totalSpent > budget ? C.red : C.green, borderRadius:'12px 0 0 12px' }}/>
                <div style={{ fontSize:'10px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'6px', paddingLeft:'6px' }}>Remaining</div>
                <div style={{ fontSize:'18px', fontWeight:800, color: budget && totalSpent > budget ? C.red : C.green, paddingLeft:'6px' }}>{budget ? fmtCur(budget - totalSpent) : '—'}</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
              <button style={btnPrimary} onClick={() => { setExpForm({ expense_date: today(), payment_status: 'Pending' }); setSheet('expense') }}>＋ Add</button>
            </div>
            <div style={{ ...card }}>
              {!pd.expenses.length && <div style={{ padding:'32px', textAlign:'center', color: C.slate }}>No expenses yet.</div>}
              {pd.expenses.map(e => (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</div>
                    <div style={{ fontSize:'11px', color: C.slate, marginTop:'2px' }}>{fmtDate(e.expense_date)} · {e.category} · {e.vendor || '—'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:700, fontSize:'14px', color: C.navy }}>{fmtCur(e.amount)}</div>
                    <Badge label={e.payment_status} color={e.payment_status==='Paid'?'green':e.payment_status==='Partial'?'amber':'red'}/>
                  </div>
                  <button onClick={() => { setExpForm({...e}); setSheet('expense-edit-'+e.id) }} style={{ ...btnGhost, padding:'4px 8px', fontSize:'12px' }}>✎</button>
                  <button onClick={() => pd.deleteExpense(e.id)} style={btnDanger}>✕</button>
                </div>
              ))}
            </div>
            {(sheet === 'expense' || sheet?.startsWith('expense-edit-')) && (
              <Sheet title={sheet === 'expense' ? 'Add Expense' : 'Edit Expense'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'expense' ? pd.addExpense(expForm) : pd.updateExpense(expForm.id, expForm))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button></>}>
                <FormGroup label="Description *"><input style={fieldStyle} value={expForm.description||''} onChange={e=>setExpForm((f:any)=>({...f,description:e.target.value}))}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <FormGroup label="Amount (₹) *"><input style={fieldStyle} type="number" value={expForm.amount||''} onChange={e=>setExpForm((f:any)=>({...f,amount:Number(e.target.value)}))}/></FormGroup>
                  <FormGroup label="Date"><input style={fieldStyle} type="date" value={expForm.expense_date||today()} onChange={e=>setExpForm((f:any)=>({...f,expense_date:e.target.value}))}/></FormGroup>
                  <FormGroup label="Category"><select style={{...fieldStyle,appearance:'none'}} value={expForm.category||EXP_CATS[0]} onChange={e=>setExpForm((f:any)=>({...f,category:e.target.value}))}>{EXP_CATS.map(c=><option key={c}>{c}</option>)}</select></FormGroup>
                  <FormGroup label="Payment Status"><select style={{...fieldStyle,appearance:'none'}} value={expForm.payment_status||'Pending'} onChange={e=>setExpForm((f:any)=>({...f,payment_status:e.target.value}))}>{['Paid','Pending','Partial'].map(s=><option key={s}>{s}</option>)}</select></FormGroup>
                  <FormGroup label="Vendor"><input style={fieldStyle} value={expForm.vendor||''} onChange={e=>setExpForm((f:any)=>({...f,vendor:e.target.value}))}/></FormGroup>
                  <FormGroup label="Bill Ref"><input style={fieldStyle} value={expForm.bill_ref||''} onChange={e=>setExpForm((f:any)=>({...f,bill_ref:e.target.value}))}/></FormGroup>
                  <FormGroup label="GST (₹)"><input style={fieldStyle} type="number" value={expForm.gst_amount||''} onChange={e=>setExpForm((f:any)=>({...f,gst_amount:Number(e.target.value)}))}/></FormGroup>
                </div>
              </Sheet>
            )}
          </div>
        )}

        {/* TAB: BOQ */}
        {tab === 'boq' && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginBottom:'12px' }}>
              <label style={{ ...btnGhost, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px' }}>
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
              <button style={btnPrimary} onClick={() => { setBoqForm({ exec_qty: 0 }); setSheet('boq') }}>＋ Add</button>
            </div>
            <div data-no-swipe="true" style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'520px', background:'#fff', border:`1px solid ${C.border}`, borderRadius:'12px', overflow:'hidden', boxShadow:'0 1px 3px rgba(13,33,68,.07)' }}>
                <thead>
                  <tr style={{ background: C.mist }}>
                    {['#','Description','Unit','Qty','Rate','Amount','Exec%',''].map(h => <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:'10px', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color: C.slate, borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {pd.boq.map((r, i) => {
                    const pct = r.qty ? Math.round((r.exec_qty/r.qty)*100) : 0
                    return (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'11px 12px', fontSize:'13px', color: C.body }}>{i+1}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', color: C.body }}><strong>{r.description}</strong>{r.spec && <div style={{ fontSize:'11px', color: C.slate }}>{r.spec}</div>}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', color: C.body }}>{r.unit}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', color: C.body }}>{r.qty}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', color: C.body }}>{fmtCur(r.rate)}</td>
                        <td style={{ padding:'11px 12px', fontSize:'13px', fontWeight:600, color: C.body }}>{fmtCur(r.amount)}</td>
                        <td style={{ padding:'11px 12px' }}>
                          <div style={{ height:'5px', background: C.mist, borderRadius:'99px', overflow:'hidden', minWidth:'50px' }}>
                            <div style={{ height:'100%', background: C.blue, borderRadius:'99px', width:`${pct}%` }}/>
                          </div>
                          <div style={{ fontSize:'11px', color: C.slate, marginTop:'4px' }}>{pct}%</div>
                        </td>
                        <td style={{ padding:'11px 12px', whiteSpace:'nowrap' }}>
                          <button onClick={() => { setBoqForm({...r}); setSheet('boq-edit-'+r.id) }} style={{ ...btnGhost, padding:'4px 8px', fontSize:'12px' }}>✎</button>
                          <button onClick={() => { if(confirm('Delete this BOQ item?')) pd.deleteBOQ(r.id) }} style={{ ...btnGhost, padding:'4px 8px', fontSize:'12px', color: C.red, marginLeft:'4px' }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                  {pd.boq.length > 0 && (
                    <tr style={{ background: C.mist }}>
                      <td colSpan={5} style={{ padding:'11px 12px', fontWeight:700, fontSize:'13px', color: C.navy }}>TOTAL</td>
                      <td style={{ padding:'11px 12px', fontWeight:700, fontSize:'13px', color: C.navy }}>{fmtCur(pd.boq.reduce((s,r)=>s+(r.amount??0),0))}</td>
                      <td style={{ padding:'11px 12px', fontWeight:700, fontSize:'13px', color: C.navy }}>{pd.boq.reduce((s,r)=>s+(r.amount??0),0) > 0 ? Math.round(pd.boq.reduce((s,r)=>s+(r.exec_value??0),0)/pd.boq.reduce((s,r)=>s+(r.amount??0),0)*100)+'%' : ''}</td>
                      <td/>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {!pd.boq.length && <div style={{ textAlign:'center', padding:'40px', color: C.slate }}>No BOQ items.<br/><br/><strong>CSV format:</strong> Description, Spec, Unit, Qty, Rate</div>}
            {(sheet === 'boq' || sheet?.startsWith('boq-edit-')) && (
              <Sheet title={sheet === 'boq' ? 'Add BOQ Item' : 'Edit BOQ Item'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'boq' ? pd.addBOQ(boqForm) : pd.updateBOQ(boqForm.id, boqForm))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button></>}>
                <FormGroup label="Description *"><input style={fieldStyle} value={boqForm.description||''} onChange={e=>setBoqForm((f:any)=>({...f,description:e.target.value}))}/></FormGroup>
                <FormGroup label="Specification"><textarea style={{...fieldStyle,minHeight:'60px',resize:'vertical'}} value={boqForm.spec||''} onChange={e=>setBoqForm((f:any)=>({...f,spec:e.target.value}))}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <FormGroup label="Unit"><input style={fieldStyle} value={boqForm.unit||''} onChange={e=>setBoqForm((f:any)=>({...f,unit:e.target.value}))}/></FormGroup>
                  <FormGroup label="Quantity"><input style={fieldStyle} type="number" value={boqForm.qty||''} onChange={e=>setBoqForm((f:any)=>({...f,qty:Number(e.target.value)}))}/></FormGroup>
                  <FormGroup label="Rate (₹)"><input style={fieldStyle} type="number" value={boqForm.rate||''} onChange={e=>setBoqForm((f:any)=>({...f,rate:Number(e.target.value)}))}/></FormGroup>
                  <FormGroup label="Executed Qty"><input style={fieldStyle} type="number" value={boqForm.exec_qty||0} onChange={e=>setBoqForm((f:any)=>({...f,exec_qty:Number(e.target.value)}))}/></FormGroup>
                </div>
              </Sheet>
            )}
          </div>
        )}

        {/* TAB: DOCUMENTS */}
        {tab === 'documents' && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'12px' }}>
              <button style={btnPrimary} onClick={() => { setDocForm({ type:'Other', approval_status:'Draft' }); setSheet('document') }}>＋ Link</button>
            </div>
            {!pd.documents.length && (
              <EmptyState
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>}
                title="No Documents"
                body="Link drawings, certificates and contracts."
                ctaLabel="+ Link Document"
                onCta={() => { setDocForm({ type:'Other', approval_status:'Draft' }); setSheet('document') }}
              />
            )}
            <div style={{ ...card }}>
              {pd.documents.map(d => {
                const icons: Record<string,string> = { Drawing:'📐', BOQ:'📊', Certificate:'📜', Contract:'📄', Report:'📋', Invoice:'🧾', Photo:'📸', Approval:'✅', Other:'📁' }
                return (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom:`1px solid ${C.border}` }}>
                    <div onClick={() => { const url = d.external_url || d.public_url; if (url) window.open(url, '_blank') }} style={{ display:'flex', alignItems:'center', gap:'12px', flex:1, minWidth:0, cursor: d.external_url || d.public_url ? 'pointer' : 'default' }}>
                      <div style={{ width:'40px', height:'40px', borderRadius:'6px', background: C.mist, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{icons[d.type] || '📁'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
                        <div style={{ fontSize:'11px', color: C.slate, marginTop:'2px' }}>{d.type} · Rev {d.revision || '—'} · {d.uploader?.full_name || '—'}</div>
                      </div>
                      {(d.external_url || d.public_url) && <span style={{ fontSize:'12px', fontWeight:600, color: C.blue, flexShrink:0 }}>Open ↗</span>}
                    </div>
                    <button onClick={() => { setDocForm({...d}); setSheet('document-edit-'+d.id) }} style={{ ...btnGhost, padding:'4px 8px', fontSize:'12px' }}>✎</button>
                    <button onClick={() => pd.deleteDocument(d.id)} style={btnDanger}>✕</button>
                  </div>
                )
              })}
            </div>
            {(sheet === 'document' || sheet?.startsWith('document-edit-')) && (
              <Sheet title={sheet === 'document' ? 'Link Document' : 'Edit Document'} onClose={() => setSheet(null)}
                footer={<><button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button><button onClick={() => save(() => sheet === 'document' ? pd.addDocument(docForm) : pd.updateDocument(docForm.id, docForm))} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button></>}>
                <FormGroup label="Document Name *"><input style={fieldStyle} value={docForm.name||''} onChange={e=>setDocForm((f:any)=>({...f,name:e.target.value}))}/></FormGroup>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
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

        {/* TAB: PHOTOS */}
        {tab === 'photos' && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginBottom:'12px' }}>
              <label style={{ ...btnGhost, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px' }}>
                📷 Camera
                <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files) }}/>
              </label>
              <label style={{ ...btnPrimary, cursor:'pointer' }}>
                🖼 Gallery
                <input type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e => { const files = Array.from(e.target.files||[]); if(files.length) pd.addPhotos(files) }}/>
              </label>
            </div>
            {!pd.photos.length && <div style={{ textAlign:'center', padding:'40px', color: C.slate }}>No photos yet.</div>}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'3px' }}>
              {pd.photos.map(ph => (
                <div key={ph.id} style={{ aspectRatio:'1', background: C.mist, borderRadius:'6px', overflow:'hidden', position:'relative', cursor:'pointer' }}>
                  <img src={ph.public_url} alt={ph.name||''} loading="lazy" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onClick={() => window.open(ph.public_url, '_blank')}/>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(transparent,rgba(13,33,68,.7))', color:'#fff', fontSize:'9px', padding:'6px 5px 4px', fontWeight:500 }}>{ph.category}</div>
                  <button onClick={() => { if(confirm('Delete photo?')) pd.deletePhoto(ph.id) }} style={{ position:'absolute', top:'4px', right:'4px', width:'22px', height:'22px', borderRadius:'50%', background:'rgba(220,38,38,.85)', color:'#fff', border:'none', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Add sheet */}
        {sheet === 'quick-add' && (
          <Sheet title="Quick Add" onClose={() => setSheet(null)}>
            {[['📝','Daily Log','log'],['📋','Milestone','milestone'],['📦','Material','material'],['💰','Expense','expense'],['📁','Document','document'],['📊','BOQ Item','boq']].filter(([,,k]) => {
              const map: Record<string,string> = { log:'logs', milestone:'milestones', material:'materials', expense:'expenses' }
              return !map[k] || can(role, map[k] as any)
            }).map(([ic,lbl,k]) => (
              <div key={k} onClick={() => { setSheet(k); setLogForm({ log_date: today(), labour: {} }); setMsForm({}); setMatForm({}); setExpForm({ expense_date: today() }); setDocForm({ type:'Other', approval_status:'Draft' }); setBoqForm({ exec_qty:0 }) }}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'6px', background: C.mist, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>{ic}</div>
                <div style={{ fontWeight:600 }}>{lbl}</div>
              </div>
            ))}
          </Sheet>
        )}
      </div>
    )
  }

  // ── PROJECT FORM STATE ─────────────────────────────────────
  const [projForm, setProjForm] = useState<any>({})
  const [editProjId, setEditProjId] = useState<string|null>(null)
  // ProjectSheet JSX is inlined in the return below (avoids remount on every keystroke)

  // ── HOME VIEW ──────────────────────────────────────────────
  const HomeView = () => (
    <div style={{ paddingBottom:'80px' }}>
      <div style={{ padding:'20px 16px 4px' }}>
        <div style={{ fontSize:'26px', fontWeight:800, color: C.navy, letterSpacing:'-0.025em', lineHeight:1.2 }}>Command Center</div>
        <div style={{ fontSize:'13px', color: C.slate, marginTop:'4px' }}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
      {!projects.length ? (
        <EmptyState
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
          title="No Projects Yet"
          body="Create your first construction project to start tracking milestones, logs, materials and expenses."
          ctaLabel="＋ Create First Project"
          onCta={() => { setProjForm({}); setEditProjId(null); setSheet('new-project') }}
        />
      ) : (
        <div>
          <StatGrid tiles={[
            {label:'Active',  value:String(projects.filter(p=>p.status==='Active').length)},
            {label:'Delayed', value:String(projects.filter(p=>projectHealth(p)==='red').length), alert:projects.filter(p=>projectHealth(p)==='red').length>0},
            {label:'Budget',  value:fmtCur(projects.reduce((s,p)=>s+(p.budget??0),0)), accent:C.gold},
            {label:'Pending', value:'0'},
          ]}/>
          <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.1em', textTransform:'uppercase', padding:'0 16px', marginBottom:'8px' }}>Project Health</div>
          <div style={{ width:'28px', height:'2.5px', background: C.gold, borderRadius:'2px', margin:'0 0 12px 16px' }}/>
          <div style={{ padding:'0 16px' }}>
            {projects.map(p => {
              const h = projectHealth(p)
              return (
                <div key={p.id} style={{ ...card, marginBottom:'10px', cursor:'pointer' }} onClick={() => goProject(p)}>
                  <div style={{ height:'4px', background: h==='green'?C.green:h==='amber'?C.amber:C.red }}/>
                  <div style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:'12px', color: C.slate, marginTop:'2px' }}>{p.client} · {p.location}</div>
                      </div>
                      <HealthBadge h={h}/>
                    </div>
                    <div style={{ height:'5px', background: C.mist, borderRadius:'99px', overflow:'hidden' }}>
                      <div style={{ height:'100%', background: h==='green'?C.green:h==='amber'?C.amber:C.red, borderRadius:'99px', width:`${p.progress}%`, transition:'width .5s' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px', fontSize:'11px', color: C.slate }}>
                      <span>{p.progress}% complete</span>
                      <span>{p.budget ? fmtCur(p.total_spent ?? 0) + ' / ' + fmtCur(p.budget) : ''}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // ── PROJECTS LIST ──────────────────────────────────────────
  const ProjectsView = () => (
    <div style={{ padding:'16px', paddingBottom:'80px' }}>
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'26px', fontWeight:800, color: C.navy, letterSpacing:'-0.025em', lineHeight:1.2 }}>Projects</div>
        <div style={{ fontSize:'13px', color: C.slate, marginTop:'3px' }}>Construction sites and progress</div>
      </div>
      {projLoading && (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {[1,2].map(i => <div key={i} style={{ height:'140px', background: C.mist, borderRadius:'16px', animation:'ebPulse 1.5s ease-in-out infinite' }}/>)}
          <style>{`@keyframes ebPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      )}
      {!projLoading && !projects.length && (
        <EmptyState
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
          title="No Projects"
          body="Add your first construction project to start tracking progress."
          ctaLabel="＋ Create Project"
          onCta={() => { setProjForm({}); setEditProjId(null); setSheet('new-project') }}
        />
      )}
      {projects.map(p => {
        const h = projectHealth(p)
        return (
          <div key={p.id} style={{ ...card, marginBottom:'12px' }}>
            <div style={{ height:'4px', background: h==='green'?C.green:h==='amber'?C.amber:C.red }}/>
            <div onClick={() => goProject(p)} style={{ cursor:'pointer' }}>
              <div style={{ background: C.navy, padding:'14px 16px' }}>
                <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.45)', marginBottom:'4px' }}>{p.type || 'Construction'}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:'17px', fontWeight:800, color:'#fff', lineHeight:1.25 }}>{p.name}</div>
                    <div style={{ fontSize:'12px', color:'rgba(255,255,255,.55)', marginTop:'3px' }}>{p.client || '—'}</div>
                  </div>
                  <HealthBadge h={h}/>
                </div>
              </div>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'12px' }}>
                  <span style={{ fontSize:'12px', color: C.slate }}>📍 {p.location || '—'}</span>
                  <span style={{ fontSize:'12px', color: C.slate }}>📅 {fmtDate(p.end_date)}</span>
                  {p.stage && <span style={{ fontSize:'12px', color: C.slate }}>{STAGE_ICONS[STAGES.indexOf(p.stage)] || ''} {p.stage}</span>}
                </div>
                <div style={{ height:'5px', background: C.mist, borderRadius:'99px', overflow:'hidden', marginBottom:'6px' }}>
                  <div style={{ height:'100%', background: h==='green'?C.green:h==='amber'?C.amber:C.red, borderRadius:'99px', width:`${p.progress}%` }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color: C.slate }}>
                  <span>{p.progress}% complete</span>
                  {p.budget && <span>{fmtCur(p.total_spent ?? 0)} of {fmtCur(p.budget)}</span>}
                </div>
              </div>
            </div>
            <div style={{ padding:'0 16px 14px' }}>
              <button onClick={() => { setProjForm({ ...p }); setEditProjId(p.id); setSheet('edit-project') }} style={{ ...btnGhost, width:'100%', justifyContent:'center' }}>✎ Edit Project</button>
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── LOGS GLOBAL ────────────────────────────────────────────
  const LogsView = () => (
    <div style={{ padding:'20px 16px', paddingBottom:'80px' }}>
      <div style={{ fontSize:'26px', fontWeight:800, color: C.navy, letterSpacing:'-0.025em', lineHeight:1.2 }}>Site Logs</div>
      <div style={{ fontSize:'13px', color: C.slate, marginTop:'3px', marginBottom:'24px' }}>Daily activity across all projects</div>
      <EmptyState
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        title="Navigate to a Project"
        body="Open any project and tap the Logs tab to add or view daily site updates."
      />
    </div>
  )

  // ── MORE ───────────────────────────────────────────────────
  const MoreView = () => (
    <div style={{ padding:'20px 16px', paddingBottom:'80px' }}>
      <div style={{ fontSize:'26px', fontWeight:800, color: C.navy, letterSpacing:'-0.025em', lineHeight:1.2 }}>More</div>
      <div style={{ fontSize:'13px', color: C.slate, marginTop:'3px', marginBottom:'24px' }}>Settings and account</div>

      {/* Profile card */}
      <div style={{ ...card, padding:'16px', marginBottom:'20px', cursor:'pointer' }} onClick={() => setShowProfile(true)}>
        <div style={{ display:'flex', gap:'14px', alignItems:'center' }}>
          <div style={{ width:'48px', height:'48px', borderRadius:'14px', background: C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', fontWeight:700, flexShrink:0 }}>
            {initials(user?.profile.full_name)}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'16px', fontWeight:700, color: C.navy }}>{user?.profile.full_name}</div>
            <div style={{ fontSize:'12px', color: C.slate, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
            <div style={{ display:'inline-block', marginTop:'5px', padding:'2px 9px', borderRadius:'99px', background: C.mist, fontSize:'10px', fontWeight:700, color: C.slate, textTransform:'uppercase', letterSpacing:'.06em' }}>
              {role.replace(/_/g,' ')}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px', paddingLeft:'4px' }}>Management</div>
      <div style={{ ...card, marginBottom:'20px' }}>
        {can(role,'userManagement') && (
          <div style={{ display:'flex', gap:'14px', alignItems:'center', padding:'14px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }} onClick={() => setView('users')}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: C.mist, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'15px', fontWeight:600, color: C.navy }}>User Management</div>
              <div style={{ fontSize:'12px', color: C.slate, marginTop:'1px' }}>Create and manage team accounts</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        )}
        <div style={{ display:'flex', gap:'14px', alignItems:'center', padding:'14px 16px', cursor:'pointer' }} onClick={() => setShowProfile(true)}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: C.redBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'15px', fontWeight:600, color: C.red }}>Sign Out</div>
            <div style={{ fontSize:'12px', color: C.slate, marginTop:'1px' }}>You'll need to sign in again</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign:'center', fontSize:'11px', color: C.faint, lineHeight:1.8 }}>
        Ease Builders Pvt. Ltd. · Site Manager<br/>
        Secured by Supabase · Real-time sync enabled
      </div>
    </div>
  )

  return (
    <div style={{ ...SF, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background: C.ash, maxWidth:'540px', margin:'0 auto' }}>
      <TopBar/>
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch' as any }}>
        {view === 'home'    && <HomeView/>}
        {view === 'projects'&& <ProjectsView/>}
        {view === 'project' && activeProject && <ProjectView project={activeProject}/>}
        {view === 'logs'    && <LogsView/>}
        {view === 'finance' && <DirectorOffice currentUser={user!.profile} projects={projects}/>}
        {view === 'more'    && <MoreView/>}
        {view === 'users'   && <><div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px' }}><button onClick={()=>setView('more')} style={{ ...btnGhost, fontSize:'13px' }}>← Back</button></div><UserManagementPage/></>}
      </div>
      <BottomNav/>
      <NotifPanel/>
      <ProfileSheet/>
      {/* ProjectSheet inlined — avoids remount/keyboard-dismiss on each keystroke */}
      {(sheet === 'new-project' || sheet === 'edit-project') && (
        <Sheet title={editProjId ? 'Edit Project' : 'New Project'} onClose={() => setSheet(null)}
          footer={<>
            {editProjId && <button onClick={async () => { if(confirm('Delete project?')) { await deleteProject(editProjId); setSheet(null); toast('Deleted') } }} style={btnDanger}>Delete</button>}
            <button onClick={() => setSheet(null)} style={{ ...btnGhost, flex:0 }}>Cancel</button>
            <button onClick={async () => {
              let err: string | null = null
              if (editProjId) err = await updateProject(editProjId, projForm)
              else { const r = await createProject(projForm); err = r.error }
              if (err) toast('Error: ' + err)
              else { setSheet(null); toast('Saved ✓') }
            }} style={{ ...btnPrimary, flex:1, justifyContent:'center' }}>Save</button>
          </>}>
          <FormGroup label="Project Name *"><input style={fieldStyle} value={projForm.name||''} onChange={e=>setProjForm((f:any)=>({...f,name:e.target.value}))} placeholder="e.g. MOT Upgrade – Kottathara"/></FormGroup>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <FormGroup label="Client"><input style={fieldStyle} value={projForm.client||''} onChange={e=>setProjForm((f:any)=>({...f,client:e.target.value}))}/></FormGroup>
            <FormGroup label="Location"><input style={fieldStyle} value={projForm.location||''} onChange={e=>setProjForm((f:any)=>({...f,location:e.target.value}))}/></FormGroup>
            <FormGroup label="Type"><select style={{...fieldStyle,appearance:'none'}} value={projForm.type||PROJ_TYPES[0]} onChange={e=>setProjForm((f:any)=>({...f,type:e.target.value}))}>{PROJ_TYPES.map(t=><option key={t}>{t}</option>)}</select></FormGroup>
            <FormGroup label="Status"><select style={{...fieldStyle,appearance:'none'}} value={projForm.status||'Active'} onChange={e=>setProjForm((f:any)=>({...f,status:e.target.value}))}>{['Active','On Hold','Completed'].map(s=><option key={s}>{s}</option>)}</select></FormGroup>
            <FormGroup label="Start Date"><input style={fieldStyle} type="date" value={projForm.start_date||''} onChange={e=>setProjForm((f:any)=>({...f,start_date:e.target.value}))}/></FormGroup>
            <FormGroup label="Deadline"><input style={fieldStyle} type="date" value={projForm.end_date||''} onChange={e=>setProjForm((f:any)=>({...f,end_date:e.target.value}))}/></FormGroup>
            <FormGroup label="Budget (₹)"><input style={fieldStyle} type="number" value={projForm.budget||''} onChange={e=>setProjForm((f:any)=>({...f,budget:Number(e.target.value)}))}/></FormGroup>
          </div>
          <FormGroup label="Stage"><select style={{...fieldStyle,appearance:'none'}} value={projForm.stage||''} onChange={e=>setProjForm((f:any)=>({...f,stage:e.target.value}))}><option value="">—</option>{STAGES.map(s=><option key={s}>{s}</option>)}</select></FormGroup>
          <RangeField label="Progress" id="proj-prog" value={projForm.progress??0} onChange={v=>setProjForm((f:any)=>({...f,progress:v}))}/>
          <FormGroup label="Notes"><textarea style={{...fieldStyle,minHeight:'80px',resize:'vertical'}} value={projForm.notes||''} onChange={e=>setProjForm((f:any)=>({...f,notes:e.target.value}))}/></FormGroup>
        </Sheet>
      )}
    </div>
  )
}

// ── ROOT ───────────────────────────────────────────────────────
function App() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#1e3a4a', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <img src={LOGO_NAVY} alt="Ease Builders" style={{ height:'48px', width:'auto', display:'block', margin:'0 auto 20px', filter:'brightness(0) invert(1)', opacity:0.9 }}/>
        <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'rgba(255,255,255,.5)', animation:`ebDot 1.2s ease-in-out ${i*0.2}s infinite` }}/>
          ))}
        </div>
        <style>{`@keyframes ebDot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  )
  if (!user) return <LoginPage/>
  return <InnerApp/>
}

export default function Root() {
  return (
    <AuthProvider>
      <App/>
    </AuthProvider>
  )
}
