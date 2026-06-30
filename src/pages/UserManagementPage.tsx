import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ASSIGNABLE_ROLES, roleLabel } from '../lib/rbac'
import type { User, UserRole } from '../types'

const C = {
  navy:'#0d2144', blue:'#1a4b8f', gold:'#c9943a',
  ash:'#f5f7fb', mist:'#eef1f7', border:'#e2e8f3',
  ink:'#1e293b', slate:'#64748b', faint:'#94a3b8',
  green:'#16a34a', greenBg:'#f0fdf4',
  red:'#dc2626', redBg:'#fef2f2',
  amber:'#d97706', amberBg:'#fffbeb',
}
const fieldStyle = { width:'100%', padding:'11px 13px', border:`1.5px solid ${C.border}`, borderRadius:'8px', fontSize:'14px', color:C.ink, background:'#fff', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }
const btnPrimary = { padding:'10px 16px', background:C.blue, color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const btnGhost = { padding:'8px 12px', background:'transparent', color:C.slate, border:`1.5px solid ${C.border}`, borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }
const card = { background:'#fff', border:`1px solid ${C.border}`, borderRadius:'12px', boxShadow:'0 1px 3px rgba(13,33,68,.06)' }

const ROLE_COLORS: Record<string, [string,string]> = {
  director:     ['#eff6ff', C.blue],
  accountant:   [C.amberBg, C.amber],
  site_engineer:['#f0fdf4', C.green],
  supervisor:   ['#faf5ff', '#7c3aed'],
  office_staff: [C.mist, C.slate],
}

function RoleBadge({ role }: { role: string }) {
  const [bg, color] = ROLE_COLORS[role] ?? [C.mist, C.slate]
  return (
    <span style={{ padding:'3px 9px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background:bg, color }}>
      {roleLabel(role as UserRole)}
    </span>
  )
}

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', password:'', role:'site_engineer' as UserRole })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('role').order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createUser = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email and password are required'); return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    setSaving(true); setError('')
    try {
      // Use Supabase Admin via service role — we call our create-user edge function
      const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
        body: { email: form.email, password: form.password, full_name: form.full_name, role: form.role }
      })
      if (fnErr || data?.error) {
        setError(fnErr?.message || data?.error || 'Failed to create user')
      } else {
        setShowAdd(false)
        setForm({ full_name:'', email:'', password:'', role:'site_engineer' })
        load()
        toast('User created ✓')
      }
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const toggleActive = async (u: User) => {
    await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    load()
  }

  const changeRole = async (u: User, role: UserRole) => {
    await supabase.from('users').update({ role }).eq('id', u.id)
    load()
  }

  const grouped = ASSIGNABLE_ROLES.map(r => ({
    role: r,
    users: users.filter(u => u.role === r)
  })).filter(g => g.users.length > 0)

  return (
    <div style={{ padding:'16px', paddingBottom:'80px', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' }}>
        <div>
          <div style={{ fontSize:'22px', fontWeight:800, color:C.navy }}>Team</div>
          <div style={{ width:'28px', height:'3px', background:C.gold, borderRadius:'2px', marginTop:'6px' }}/>
          <div style={{ fontSize:'12px', color:C.slate, marginTop:'4px' }}>{users.length} member{users.length!==1?'s':''}</div>
        </div>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Member</button>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'32px', color:C.slate }}>Loading…</div>}

      {grouped.map(g => (
        <div key={g.role} style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>
            {roleLabel(g.role as UserRole)} · {g.users.length}
          </div>
          <div style={card}>
            {g.users.map((u, i) => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px', borderBottom: i < g.users.length-1 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:C.blue, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', flexShrink:0 }}>
                  {u.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:'14px', display:'flex', alignItems:'center', gap:'6px' }}>
                    {u.full_name}
                    {!u.is_active && <span style={{ fontSize:'10px', color:C.red, fontWeight:600, background:C.redBg, padding:'2px 6px', borderRadius:'4px' }}>Inactive</span>}
                  </div>
                  <div style={{ fontSize:'12px', color:C.slate, marginTop:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end' }}>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u, e.target.value as UserRole)}
                    style={{ fontSize:'11px', fontWeight:600, border:'none', background:'transparent', cursor:'pointer', color:C.blue, fontFamily:'inherit', outline:'none' }}
                  >
                    {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                  <button
                    onClick={() => toggleActive(u)}
                    style={{ fontSize:'11px', fontWeight:600, border:'none', background:'none', cursor:'pointer', color: u.is_active ? C.red : C.green, fontFamily:'inherit', padding:0 }}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add Member Sheet */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,33,68,.5)', zIndex:100, display:'flex', alignItems:'flex-end' }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ background:'#fff', width:'100%', borderRadius:'16px 16px 0 0', maxHeight:'90vh', display:'flex', flexDirection:'column', fontFamily:"'Inter',system-ui,sans-serif" }}>
            <div style={{ width:'36px', height:'4px', background:C.border, borderRadius:'2px', margin:'10px auto 0' }}/>
            <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:'17px', fontWeight:700, color:C.navy }}>Add Team Member</div>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', fontSize:'18px', cursor:'pointer', color:C.slate }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
              {error && <div style={{ background:C.redBg, color:C.red, padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'14px', border:`1px solid #fecaca` }}>{error}</div>}
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'6px' }}>Full Name *</label>
                <input style={fieldStyle} value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="e.g. Raghunath K"/>
              </div>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'6px' }}>Email *</label>
                <input style={fieldStyle} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com"/>
              </div>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'6px' }}>Password *</label>
                <input style={fieldStyle} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 8 characters"/>
                <div style={{ fontSize:'11px', color:C.slate, marginTop:'4px' }}>Share this password with the team member. They can change it after logging in.</div>
              </div>
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:C.slate, letterSpacing:'.07em', textTransform:'uppercase', marginBottom:'6px' }}>Role *</label>
                <select style={{...fieldStyle, appearance:'none'}} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value as UserRole}))}>
                  {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
                <div style={{ fontSize:'11px', color:C.slate, marginTop:'6px', lineHeight:1.6 }}>
                  {form.role === 'director' && '• Full access to all projects, finance, and team management'}
                  {form.role === 'accountant' && '• Finance module only: receivables, payables, cash book, funding'}
                  {form.role === 'site_engineer' && '• Projects: logs, materials, milestones, BOQ, documents, photos'}
                  {form.role === 'supervisor' && '• Projects: logs, materials, milestones, BOQ, documents, photos'}
                  {form.role === 'office_staff' && '• Projects: overview, logs, documents, photos only'}
                </div>
              </div>
            </div>
            <div style={{ padding:'12px 16px 28px', borderTop:`1px solid ${C.border}`, display:'flex', gap:'10px', background:'#fff' }}>
              <button onClick={() => setShowAdd(false)} style={{ ...btnGhost, flex:0 }}>Cancel</button>
              <button onClick={createUser} disabled={saving} style={{ ...btnPrimary, flex:1, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function toast(msg: string) {
  const el = document.createElement('div')
  el.textContent = msg
  Object.assign(el.style, { position:'fixed', top:'16px', left:'50%', transform:'translateX(-50%)', background:'#0d2144', color:'#fff', padding:'10px 18px', borderRadius:'12px', fontSize:'13px', fontWeight:500, zIndex:9999, boxShadow:'0 8px 32px rgba(13,33,68,.2)', whiteSpace:'nowrap', fontFamily:"'Inter',system-ui,sans-serif" })
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2600)
}
