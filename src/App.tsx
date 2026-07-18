// EBOS Site Manager — Stage 3 complete
import { useState, useEffect, useRef } from 'react'
import React from 'react'
import {
  HomeIcon, BuildingOffice2Icon, ClipboardDocumentListIcon, CurrencyRupeeIcon,
  EllipsisHorizontalIcon, CheckIcon, BellIcon, BellAlertIcon, CalendarDaysIcon, MapPinIcon,
  ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon, ArrowRightOnRectangleIcon,
  UsersIcon, CameraIcon, KeyIcon, XMarkIcon, Ico, ChatBubbleLeftRightIcon,
} from './design/icons'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useProjects } from './hooks/useProjects'
import { useNotifications } from './hooks/useNotifications'
import { useMessages } from './hooks/useMessages'
import { useWorkspace } from './hooks/useWorkspace'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { LoginPage } from './pages/LoginPage'
import { UserManagementPage } from './pages/UserManagementPage'
import { DirectorOffice } from './pages/DirectorOffice'
import { ProjectView } from './pages/ProjectView'
import { WorkspacePage } from './pages/WorkspacePage'
import { LockScreen } from './pages/LockScreen'
import { CalendarSheet } from './pages/CalendarSheet'
import { MessagesSheet } from './pages/MessagesSheet'
import { usePinLock } from './hooks/usePinLock'
import { can, PROJECT_TABS, NAV_TABS } from './lib/rbac'
import { useProjectData } from './hooks/useProjectData'
import { supabase } from './lib/supabase'
import { logActivity } from './lib/logger'
import { LOGO_NAVY } from './assets/logo'
import { colors as C_, space, radius as R, shadow, text as TT, T, type as TY, motion as MO, iconSize } from './design/tokens'
import { fmtMoney, smartDate, daysLeft as dLeft, isOverdue as isOD, projectHealth as calcHealth, initials as bInitials } from './design/business'
import { toast, Sheet, FormGroup, RangeField, EmptyState, HealthBadge, Badge, Avatar, StatGrid } from './design/components'
import type { Project, Milestone, UserRole } from './types'

// ── Helpers ────────────────────────────────────────────────────
// Currency, date, health: imported from ./design/business
function uid() { return crypto.randomUUID() }
function today() { return new Date().toISOString().split('T')[0] }
const fmtDate = (d?: string | null) => smartDate(d, 'abs')
const fmtCur  = fmtMoney
const initials = bInitials
const isOverdue = isOD
const daysLeft  = dLeft
function fmtAgo(ts: string) { return smartDate(ts, 'ago') }
function projectHealth(p: Project) { return calcHealth(p) }
const PROJ_TYPES = ['MOT (Modular OT)','MGPS','HVAC','Civil','Electrical','Plumbing','Combined','Renovation']
const STAGES     = ['Tender','Planning','Procurement','Site Prep','Foundation','Civil Works','MGPS','HVAC','Electrical','Plumbing','Finishing','Testing','Commissioning','Handover']
const EXP_CATS = ['Materials','Labour','Equipment','Transport','Professional Fees','Subcontract','GST','Misc']

// ── Project type accent colors — subtle identity, never decorative ──
const TYPE_ACCENT: Record<string, string> = {
  'Civil':           '#64748b',
  'MOT (Modular OT)':'#7c3aed',
  'MGPS':            '#2563eb',
  'HVAC':            '#7c3aed',
  'Electrical':      '#ea580c',
  'Plumbing':        '#0284c7',
  'Renovation':      '#d97706',
  'Interior':        '#0d9488',
  'Combined':        '#1e3a4a',
}

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







// ── Main Inner App (after auth) ────────────────────────────────
function InnerApp() {
  const { user, signOut } = useAuth()
  const { status: syncStatus, pending } = useOnlineStatus()
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id)
  const msgs = useMessages(user?.profile ?? null)
  const ws = useWorkspace(user?.profile ?? null)
  const { projects, loading: projLoading, createProject, updateProject, deleteProject } = useProjects(user?.profile ?? null)
  const [view, setView] = useState<'home' | 'projects' | 'project' | 'workspace' | 'activity' | 'more' | 'users' | 'finance'>('home')
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [tab, setTab] = useState('overview')
  const [sheet, setSheet] = useState<string | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const role = user!.profile.role as UserRole
  const navTabs = NAV_TABS[role]
  const pinLock = usePinLock()
  const [showPinSetup, setShowPinSetup] = React.useState(false)
  const [showCalendar, setShowCalendar] = React.useState(false)

  const goProject = (p: Project) => { setActiveProject(p); setTab('overview'); setView('project') }
  const goBack = () => { setActiveProject(null); setView('projects') }

  // ── SWIPE GESTURES — document-level to work inside scrollable views ─
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const viewRef  = useRef(view)
  const tabRef   = useRef(tab)
  viewRef.current = view
  tabRef.current  = tab

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-no-swipe]')) { touchRef.current = null; return }
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onEnd = (e: TouchEvent) => {
      if (!touchRef.current) return
      const dx = e.changedTouches[0].clientX - touchRef.current.x
      const dy = e.changedTouches[0].clientY - touchRef.current.y
      touchRef.current = null
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const cur = viewRef.current
      const curTab = tabRef.current
      const order = NAV_TABS[role].map(t => t.key)
      if (cur === 'project') {
        const tabs = PROJECT_TABS[role]
        const idx = tabs.indexOf(curTab)
        const next = dx < 0 ? idx + 1 : idx - 1
        if (next >= 0 && next < tabs.length) setTab(tabs[next])
      } else {
        const idx = order.indexOf(cur)
        const next = dx < 0 ? idx + 1 : idx - 1
        if (next >= 0 && next < order.length) setView(order[next] as any)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend',   onEnd)
    }
  }, [role])

  // ── TOP BAR ────────────────────────────────────────────────
  const TopBar = () => (
    <div style={{ height:'68px', background:'#fff', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px 0 16px', position:'sticky', top:0, zIndex:30, flexShrink:0 }}>
      {/* Left */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:1, minWidth:0 }}>
        {view === 'project' ? (
          <button onClick={goBack} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'14px', fontWeight:600, color: C.navy, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', minWidth:0 }}>
            <Ico icon={ChevronLeftIcon} size={20}/>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{activeProject?.name}</span>
          </button>
        ) : (
          <img src={LOGO_NAVY} alt="Ease Builders" style={{ height:'40px', width:'auto', display:'block' }}/>
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
        {/* Messages */}
        <button onClick={() => setShowMessages(true)}
          style={{ width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', borderRadius:'10px', position:'relative', color: C.slate }}>
          <Ico icon={ChatBubbleLeftRightIcon} size={20}/>
          {msgs.totalUnread > 0 && <span style={{ position:'absolute', top:'7px', right:'7px', width:'6px', height:'6px', borderRadius:'50%', background: C.red }}/>}
        </button>
        {/* Notifications */}
        <button onClick={() => setShowNotifs(true)}
          style={{ width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', borderRadius:'10px', position:'relative', color: C.slate }}>
          <Ico icon={BellIcon} size={20}/>
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
    home:      <Ico icon={HomeIcon} size={24}/>,
    projects:  <Ico icon={BuildingOffice2Icon} size={24}/>,
    logs:      <Ico icon={ClipboardDocumentListIcon} size={24}/>,
    workspace: <Ico icon={CheckIcon} size={24}/>,
    finance:   <Ico icon={CurrencyRupeeIcon} size={24}/>,
    activity:  <Ico icon={ClipboardDocumentListIcon} size={24}/>,
    more:      <Ico icon={EllipsisHorizontalIcon} size={24}/>,
  }
  const BottomNav = () => {
    return (
      <nav style={{ height:'64px', background:'#fff', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', paddingBottom:'env(safe-area-inset-bottom,0px)', position:'sticky', bottom:0, zIndex:30, flexShrink:0 }}>
        {navTabs.map(t => {
          const isActive = view === t.key
          return (
            <div key={t.key} onClick={() => setView(t.key as any)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', padding:'6px 0', cursor:'pointer', WebkitTapHighlightColor:'transparent' as any }}>
              <div style={{ padding:'4px 8px', borderRadius:'10px', background: isActive ? C.mist : 'transparent', transition:'background 0.15s ease', color: isActive ? C.navy : C.slate }}>
                {NAV_ICONS[t.key]}
              </div>
              <span style={{ fontSize:'9px', fontWeight: isActive ? 700 : 500, color: isActive ? C.navy : C.slate, transition:'color 0.15s ease' }}>{t.label}</span>
            </div>
          )
        })}
      </nav>
    )
  }

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

  // ── PROFILE SHEET — premium, photo upload, PIN ─────────────
  const avatarUrl = `https://yvllrkopqcmiynofayif.supabase.co/storage/v1/object/public/photos/avatars/${user?.profile?.id}`
  const [photoTs, setPhotoTs] = React.useState(Date.now())

  const uploadAvatar = async (file: File) => {
    const { supabase } = await import('./lib/supabase')
    const buf = await file.arrayBuffer()
    await supabase.storage.from('photos').upload(`avatars/${user?.profile?.id}`, buf, { contentType: file.type, upsert: true })
    setPhotoTs(Date.now())
  }

  const ProfileSheet = () => showProfile ? (
    <Sheet title="" onClose={() => setShowProfile(false)}>
      {/* Hero photo area */}
      <div style={{ margin:'-24px -24px 0', position:'relative', height:'220px', background:`linear-gradient(135deg, ${C.navy} 0%, #1a3a5c 100%)`, borderRadius:'0', overflow:'hidden' }}>
        <img src={`${avatarUrl}?t=${photoTs}`} alt=""
          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
          onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
        {/* Gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)' }}/>
        {/* Name over photo */}
        <div style={{ position:'absolute', bottom:'16px', left:'20px', right:'20px' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', letterSpacing:'-0.01em', lineHeight:1.2 }}>{user?.profile.full_name}</div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,.65)', marginTop:'2px' }}>{user?.email}</div>
        </div>
        {/* Upload button */}
        <label style={{ position:'absolute', top:'14px', right:'14px', width:'36px', height:'36px', borderRadius:'50%', background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backdropFilter:'blur(4px)' }}>
          <Ico icon={CameraIcon} size={18} color="#fff"/>
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadAvatar(f) }}/>
        </label>
        {/* Role badge */}
        <div style={{ position:'absolute', top:'16px', left:'16px', padding:'3px 10px', borderRadius:'99px', background:'rgba(255,255,255,.15)', backdropFilter:'blur(4px)', fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,.9)', textTransform:'capitalize' }}>
          {role.replace(/_/g,' ')}
        </div>
      </div>

      {/* PIN section */}
      <div style={{ padding:'20px 0 4px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'12px' }}>Security</div>
        {pinLock.hasPin ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <button onClick={() => { setShowProfile(false); setShowPinSetup(true) }}
              style={{ ...btnGhost, justifyContent:'flex-start', height:'40px' }}>
              <Ico icon={KeyIcon} size={16}/> Change PIN
            </button>
            <button onClick={() => { pinLock.removePin(); toast('PIN removed') }}
              style={{ ...btnGhost, justifyContent:'flex-start', height:'40px', color:C.red }}>
              <Ico icon={XMarkIcon} size={16}/> Remove PIN
            </button>
          </div>
        ) : (
          <button onClick={() => { setShowProfile(false); setShowPinSetup(true) }}
            style={{ ...btnGhost, justifyContent:'flex-start', height:'40px', width:'100%' }}>
            <Ico icon={KeyIcon} size={16}/> Set up App PIN
          </button>
        )}
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 0 4px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>App</div>
        <div style={{ fontSize:'12px', color: C.slate, lineHeight:1.8 }}>
          Ease Builders Site Manager · v4.0<br/>
          Secured by Supabase · Real-time sync
        </div>
      </div>
      <div style={{ marginTop:'20px' }}>
        <button onClick={() => { setShowProfile(false); signOut() }}
          style={{ ...btnDanger, width:'100%', justifyContent:'center', height:'44px' }}>
          <Ico icon={ArrowRightOnRectangleIcon} size={18}/> Sign Out
        </button>
      </div>
    </Sheet>
  ) : null

    // ── PROJECT FORM STATE ─────────────────────────────────────
  const [projForm, setProjForm] = useState<any>({})
  const [editProjId, setEditProjId] = useState<string|null>(null)
  // ProjectSheet JSX is inlined in the return below (avoids remount on every keystroke)

  // ── HOME VIEW ──────────────────────────────────────────────
  const HomeView = () => {
    const hour = new Date().getHours()
    const firstName = user!.profile.full_name.split(' ')[0]
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    // Morning briefing text
    const alerts: string[] = []
    if (ws.overdueTasks.length > 0) alerts.push(`${ws.overdueTasks.length} overdue task${ws.overdueTasks.length>1?'s':''}`)
    if (ws.todayReminders.length > 0) alerts.push(`${ws.todayReminders.length} reminder${ws.todayReminders.length>1?'s':''} due today`)
    if (ws.overdueReminders.length > 0) alerts.push(`${ws.overdueReminders.length} overdue reminder${ws.overdueReminders.length>1?'s':''}`)
    const urgentProject = [...projects]
      .filter(p => p.end_date && p.status === 'Active')
      .sort((a,b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime())[0]
    if (urgentProject?.end_date) {
      const days = Math.ceil((new Date(urgentProject.end_date).getTime() - Date.now()) / 864e5)
      if (days > 0 && days <= 30) alerts.push(`${urgentProject.name.split(' ')[0]} deadline in ${days}d`)
    }
    const briefingText = alerts.length > 0
      ? `${greeting}, ${firstName}. ${alerts.join(' · ')}.`
      : `${greeting}, ${firstName}. Everything looks clear today.`

    // Pending approvals: tasks marked "Waiting" + milestones overdue
    const waitingTasks = ws.tasks.filter((t:any) => t.status === 'Waiting')
    const overdueMs    = projects.flatMap(p => []).slice(0,0) // placeholder — milestone data is per-project

    return (
    <div style={{ paddingBottom:'80px' }}>
      {/* Header */}
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
      ) : (<>

        {/* KPI tiles */}
        <StatGrid tiles={[
          {label:'Active',  value:String(projects.filter(p=>p.status==='Active').length)},
          {label:'Delayed', value:String(projects.filter(p=>projectHealth(p)==='red').length), alert:projects.filter(p=>projectHealth(p)==='red').length>0},
          {label:'Budget',  value:fmtCur(projects.reduce((s,p)=>s+(p.budget??0),0)), accent:C.gold},
          {label:'Tasks',   value:String(ws.myTasks.length), alert:ws.overdueTasks.length>0},
        ]}/>

        {/* ── Morning Briefing Card ───────────────────────────── */}
        <div style={{ margin:'0 16px 16px' }}>
          <div style={{ background: C.navy, borderRadius:'16px', padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
            <div style={{ position:'absolute', bottom:'-30px', right:'20px', width:'70px', height:'70px', borderRadius:'50%', background:'rgba(255,255,255,.03)' }}/>
            <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:'6px' }}>
              {hour < 12 ? '🌅 Morning Briefing' : hour < 17 ? '☀ Afternoon Update' : '🌙 Evening Summary'}
            </div>
            <div style={{ fontSize:'14px', color:'rgba(255,255,255,.9)', lineHeight:1.6, fontWeight:400 }}>
              {briefingText}
            </div>
          </div>
        </div>

        {/* ── Alerts ─────────────────────────────────────────── */}
        {(ws.overdueTasks.length > 0 || ws.overdueReminders.length > 0) && (
          <div style={{ padding:'0 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Needs Attention</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {ws.overdueTasks.slice(0,2).map((t:any) => (
                <div key={t.id} onClick={() => setView('workspace')}
                  style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'12px', cursor:'pointer', borderLeft:`3px solid ${C_.danger}`, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                  <Ico icon={ExclamationTriangleIcon} size={16} color={C_.danger}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize:'11px', color:C_.danger }}>Task overdue</div>
                  </div>
                  <Ico icon={ChevronRightIcon} size={14} color={C.slate}/>
                </div>
              ))}
              {ws.overdueReminders.slice(0,2).map((r:any) => (
                <div key={r.id} onClick={() => setView('workspace')}
                  style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px 14px', background:'#fff', borderRadius:'12px', cursor:'pointer', borderLeft:`3px solid ${C_.warning}`, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
                  <Ico icon={BellAlertIcon} size={16} color={C_.warning}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize:'11px', color:C_.warning }}>Reminder overdue · {r.category}</div>
                  </div>
                  <Ico icon={ChevronRightIcon} size={14} color={C.slate}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pending Approvals ───────────────────────────────── */}
        {waitingTasks.length > 0 && (
          <div style={{ padding:'0 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Pending Your Action</div>
            <div style={{ ...card }}>
              {waitingTasks.slice(0,3).map((t:any, i:number) => (
                <div key={t.id} onClick={() => setView('workspace')}
                  style={{ display:'flex', gap:'10px', alignItems:'center', padding:'12px 14px', borderBottom: i < Math.min(waitingTasks.length,3)-1 ? `1px solid ${C.border}` : 'none', cursor:'pointer' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'10px', background:C_.infoBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Ico icon={ClipboardDocumentListIcon} size={16} color={C_.info}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize:'11px', color:C.slate }}>Waiting · {t.creator?.full_name || 'Team'}</div>
                  </div>
                  <span style={{ padding:'2px 8px', borderRadius:'99px', background:C_.infoBg, color:C_.info, fontSize:'10px', fontWeight:700 }}>Review</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions ───────────────────────────────────── */}
        <div style={{ padding:'0 16px', marginBottom:'16px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Quick Actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {[
              { icon:ClipboardDocumentListIcon, label:'Site Log',   action:() => setView('projects') },
              { icon:CheckIcon,                 label:'New Task',   action:() => setView('workspace') },
              { icon:CurrencyRupeeIcon,         label:'Finance',    action:() => setView('finance') },
            ].map(({ icon, label, action }) => (
              <div key={label} onClick={action}
                style={{ ...card, padding:'14px 10px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textAlign:'center' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:C.mist, display:'flex', alignItems:'center', justifyContent:'center', color:C.navy }}>
                  <Ico icon={icon} size={20}/>
                </div>
                <div style={{ fontSize:'11px', fontWeight:600, color:C.ink }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent Activity ─────────────────────────────────── */}
        {ws.activity.length > 0 && (
          <div style={{ padding:'0 16px', marginBottom:'16px' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Recent Activity</div>
            <div style={{ ...card }}>
              {ws.activity.slice(0,4).map((a:any, i:number) => (
                <div key={a.id} style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'10px 14px', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:C.navy, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>
                    {(a.user?.full_name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', color:C.ink, lineHeight:1.4 }}>
                      <strong style={{ fontWeight:600 }}>{a.user?.full_name?.split(' ')[0] || 'System'}</strong>{' '}{a.action}
                    </div>
                    <div style={{ fontSize:'11px', color:C.slate, marginTop:'2px' }}>{smartDate(a.created_at, 'ago')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Projects compact list ────────────────────────────── */}
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Projects</div>
          {projects.map(p => {
            const h = projectHealth(p)
            return (
              <div key={p.id} onClick={() => goProject(p)}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0, background: h==='green'?C_.success:h==='amber'?C_.warning:C_.danger }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize:'11px', color:C.slate }}>{p.progress}% · {p.stage || 'In Progress'}</div>
                </div>
                <Ico icon={ChevronRightIcon} size={14} color={C.slate}/>
              </div>
            )
          })}
        </div>

      </>)}
    </div>
    )
  }

  // ── PROJECTS LIST ──────────────────────────────────────────
  const ProjectsView = () => (
    <div style={{ padding:'16px', paddingBottom:'80px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
        <div>
          <div style={{ fontSize:'26px', fontWeight:800, color: C.navy, letterSpacing:'-0.025em', lineHeight:1.2 }}>Projects</div>
          <div style={{ fontSize:'13px', color: C.slate, marginTop:'3px' }}>Construction sites and progress</div>
        </div>
        <button onClick={() => { setProjForm({}); setEditProjId(null); setSheet('new-project') }}
          style={{ ...btnPrimary, height:'36px', marginTop:'4px', flexShrink:0 }}>
          ＋ New
        </button>
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
          <div key={p.id}
            onContextMenu={e => { e.preventDefault(); setProjForm({ ...p }); setEditProjId(p.id); setSheet('edit-project') }}
            onTouchStart={e=>{
              const t = setTimeout(() => { setProjForm({ ...p }); setEditProjId(p.id); setSheet('edit-project') }, 600)
              ;(e.currentTarget as any)._lt = t
              e.currentTarget.style.transform = 'scale(.98)'
            }}
            onTouchEnd={e => { clearTimeout((e.currentTarget as any)._lt); e.currentTarget.style.transform = 'scale(1)' }}
            onTouchMove={e => { clearTimeout((e.currentTarget as any)._lt); e.currentTarget.style.transform = 'scale(1)' }}
            onClick={() => goProject(p)}
            style={{ background:'#fff', borderRadius:'16px', marginBottom:'14px', cursor:'pointer', overflow:'hidden',
              boxShadow:'0 1px 4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
              WebkitTapHighlightColor:'transparent' as any,
              transition:'transform .12s ease' }}>
            <div style={{ display:'flex' }}>
              <div style={{ width:'3px', background: TYPE_ACCENT[p.type || ''] || C.navy, flexShrink:0 }}/>
              <div style={{ flex:1, padding:'16px 16px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px', gap:'10px' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' as any,
                      color: TYPE_ACCENT[p.type || ''] || C.slate, marginBottom:'3px', opacity:0.8 }}>
                      {p.type || 'Construction'}
                    </div>
                    <div style={{ fontSize:'16px', fontWeight:800, color: C.ink, lineHeight:1.3, letterSpacing:'-0.01em',
                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, overflow:'hidden' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize:'12px', color: C.slate, marginTop:'3px' }}>
                      {[p.client, p.location].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <HealthBadge h={h}/>
                </div>
                <div style={{ height:'3px', background: C.mist, borderRadius:'99px', overflow:'hidden', marginBottom:'5px' }}>
                  <div style={{ height:'100%', background: h==='green'?C_.success:h==='amber'?C_.warning:C_.danger,
                    borderRadius:'99px', width:`${p.progress}%`, transition:'width .6s ease' }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', color: C.slate }}>
                  <span>{p.progress}% complete{p.stage ? ` · ${p.stage}` : ''}</span>
                  <span style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    {p.end_date && <span style={{ display:'inline-flex', alignItems:'center', gap:'2px' }}><Ico icon={CalendarDaysIcon} size={11}/>{fmtDate(p.end_date)}</span>}
                    {p.budget && <span>{fmtCur(p.budget)}</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  // LogsView removed — replaced by WorkspacePage

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
          <Ico icon={ChevronRightIcon} size={16} color={C.slate}/>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ fontSize:'11px', fontWeight:700, color: C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px', paddingLeft:'4px' }}>Management</div>
      <div style={{ ...card, marginBottom:'20px' }}>
        {can(role,'userManagement') && (
          <div style={{ display:'flex', gap:'14px', alignItems:'center', padding:'14px 16px', borderBottom:`1px solid ${C.border}`, cursor:'pointer' }} onClick={() => setView('users')}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: C.mist, display:'flex', alignItems:'center', justifyContent:'center' }}>
<Ico icon={UsersIcon} size={18}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'15px', fontWeight:600, color: C.navy }}>User Management</div>
              <div style={{ fontSize:'12px', color: C.slate, marginTop:'1px' }}>Create and manage team accounts</div>
            </div>
            <Ico icon={ChevronRightIcon} size={16} color={C.slate}/>
          </div>
        )}
        <div style={{ display:'flex', gap:'14px', alignItems:'center', padding:'14px 16px', cursor:'pointer' }} onClick={() => setShowProfile(true)}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: C.redBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
<Ico icon={ArrowRightOnRectangleIcon} size={18}/>
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
    <>
      {/* PIN lock screen — shown when locked */}
      {pinLock.isLocked && (
        <LockScreen
          mode="unlock"
          onUnlock={pin => pinLock.verifyPin(pin)}
          onSetup={() => {}}
          onForgot={() => { if(confirm('Remove PIN and sign out?')) { pinLock.removePin(); signOut() } }}
        />
      )}
      {/* PIN setup screen */}
      {showPinSetup && (
        <LockScreen
          mode="setup"
          onUnlock={() => false}
          onSetup={pin => { pinLock.setPin(pin); setShowPinSetup(false); toast('PIN set') }}
          onForgot={() => {}}
          onCancel={() => setShowPinSetup(false)}
        />
      )}
    <div style={{ ...SF, display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background: C.ash, maxWidth:'540px', margin:'0 auto' }}>
      <TopBar/>
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch' as any }}>
        {view === 'home'      && <HomeView/>}
        {view === 'projects'  && <ProjectsView/>}
        {view === 'project'   && activeProject && <ProjectView project={activeProject} tab={tab} setTab={setTab} sheet={sheet} setSheet={setSheet} role={role} user={user!.profile}/>}
        {view === 'workspace' && <WorkspacePage user={user!.profile} role={role} ws={ws} notifications={notifications} markAllRead={markAllRead} unreadCount={unreadCount}/>}
        {view === 'finance'   && <DirectorOffice currentUser={user!.profile} projects={projects}/>}
        {view === 'more'      && <MoreView/>}
        {view === 'users'     && <><div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px' }}><button onClick={()=>setView('more')} style={{ ...btnGhost, fontSize:'13px' }}>← Back</button></div><UserManagementPage/></>}
      </div>
      <BottomNav/>
      <NotifPanel/>
      <ProfileSheet/>
      {showMessages && (
        <MessagesSheet
          onClose={() => setShowMessages(false)}
          currentUser={user!.profile}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
        />
      )}
      {/* Floating calendar button */}
      <button
        onClick={() => setShowCalendar(true)}
        style={{
          position:'fixed', bottom:'84px', right:'16px', zIndex:40,
          width:'46px', height:'46px', borderRadius:'14px',
          background:'#fff', border:`1px solid ${C.border}`,
          boxShadow:'0 2px 12px rgba(0,0,0,.12)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:C.navy,
          WebkitTapHighlightColor:'transparent' as any,
          transition:'transform .12s ease',
        }}
        onTouchStart={e => e.currentTarget.style.transform='scale(.9)'}
        onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
      >
        <Ico icon={CalendarDaysIcon} size={22}/>
      </button>
      {/* Calendar sheet */}
      {showCalendar && (
        <CalendarSheet
          onClose={() => setShowCalendar(false)}
          reminders={ws.reminders}
          tasks={ws.tasks}
          projects={projects}
          userId={user!.profile.id}
        />
      )}
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
              else { setSheet(null); toast('Saved') }
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
    </>
  )
}

// ── ROOT ───────────────────────────────────────────────────────
function App() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#1e3a4a', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <img src={LOGO_NAVY} alt="Ease Builders" style={{ width:'65%', maxWidth:'280px', display:'block', filter:'brightness(0) invert(1)' }}/>
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
