/// <reference types="vite/client" />
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User, UserRole } from '../types'

const ROLES: UserRole[] = ['director', 'accountant', 'site_engineer']
const roleLabel = (r: UserRole) => ({ director: 'Director', accountant: 'Accountant', site_engineer: 'Site Engineer' }[r])

export function UserManagementPage() {
  const [users, setUsers]     = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ email: '', full_name: '', role: 'site_engineer' as UserRole, password: '' })
  const [err, setErr]         = useState('')
  const [saving, setSaving]   = useState(false)

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('created_at')
    setUsers((data ?? []) as User[])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setSaving(true)
    // Use Supabase Admin API via Edge Function (or service role key on server)
    // For client-side we call a Supabase Edge Function that uses service_role key
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, role: form.role }),
    })
    const result = await res.json()
    if (!res.ok) setErr(result.error ?? 'Failed to create user')
    else { setShowAdd(false); setForm({ email:'', full_name:'', role:'site_engineer', password:'' }); await fetchUsers() }
    setSaving(false)
  }

  const toggleActive = async (user: User) => {
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id)
    await fetchUsers()
  }

  const updateRole = async (userId: string, role: UserRole) => {
    await supabase.from('users').update({ role }).eq('id', userId)
    await fetchUsers()
  }

  const s = { fontFamily: "'Inter',system-ui,sans-serif", fontSize: '14px', color: '#1e293b' }
  const label = { display:'block' as const, fontSize:'11px', fontWeight:700, color:'#64748b', letterSpacing:'.07em', textTransform:'uppercase' as const, marginBottom:'5px' }
  const input = { width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f3', borderRadius:'6px', fontSize:'14px', outline:'none', color:'#1e293b', fontFamily:'inherit', marginBottom:'12px', boxSizing:'border-box' as const }
  const btnP = { padding:'9px 16px', background:'#1a4b8f', color:'#fff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }

  if (loading) return <div style={{ padding: '32px', textAlign: 'center', ...s }}>Loading…</div>

  return (
    <div style={{ ...s, padding: '0 0 80px' }}>
      <div style={{ padding: '16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'22px', fontWeight:800, color:'#0d2144', letterSpacing:'-0.025em' }}>User Management</div>
          <div style={{ width:'32px', height:'3px', background:'#c9943a', borderRadius:'2px', marginTop:'6px' }}/>
        </div>
        <button style={btnP} onClick={() => setShowAdd(true)}>＋ Add User</button>
      </div>

      {/* User list */}
      <div style={{ padding: '0 16px' }}>
        {users.map(u => (
          <div key={u.id} style={{ background:'#fff', border:'1px solid #e2e8f3', borderRadius:'12px', padding:'14px', marginBottom:'10px', boxShadow:'0 1px 3px rgba(13,33,68,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'50%', background: u.is_active ? '#1a4b8f' : '#94a3b8', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', flexShrink:0 }}>
                {u.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700 }}>{u.full_name}</div>
                <div style={{ fontSize:'12px', color:'#64748b' }}>{u.email}</div>
              </div>
              <div>
                <select
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value as UserRole)}
                  style={{ padding:'5px 28px 5px 8px', border:'1.5px solid #e2e8f3', borderRadius:'6px', fontSize:'12px', fontWeight:600, color:'#1e293b', background:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1 1l5 5 5-5'/%3E%3C/svg%3E") no-repeat right 8px center #fff`, appearance:'none', cursor:'pointer', fontFamily:'inherit' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
              <span style={{ padding:'3px 8px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background: u.is_active ? '#f0fdf4' : '#fef2f2', color: u.is_active ? '#16a34a' : '#dc2626' }}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
              <span style={{ padding:'3px 8px', borderRadius:'99px', fontSize:'11px', fontWeight:600, background:'#eff6ff', color:'#1a4b8f' }}>
                {roleLabel(u.role)}
              </span>
              <span style={{ fontSize:'11px', color:'#94a3b8', paddingTop:'4px' }}>
                {u.last_seen ? `Last seen ${new Date(u.last_seen).toLocaleDateString('en-IN')}` : 'Never logged in'}
              </span>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'10px' }}>
              <button
                onClick={() => toggleActive(u)}
                style={{ padding:'6px 12px', background: u.is_active ? '#fef2f2' : '#f0fdf4', color: u.is_active ? '#dc2626' : '#16a34a', border:`1.5px solid ${u.is_active ? '#fecaca' : '#bbf7d0'}`, borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}
              >
                {u.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add User Sheet */}
      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,33,68,.5)', zIndex:100, display:'flex', alignItems:'flex-end' }} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ background:'#fff', width:'100%', borderRadius:'16px 16px 0 0', padding:'20px 20px 40px', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ width:'36px', height:'4px', background:'#cdd6e8', borderRadius:'2px', margin:'0 auto 16px' }}/>
            <div style={{ fontSize:'17px', fontWeight:700, color:'#0d2144', marginBottom:'4px' }}>Add New User</div>
            <div style={{ width:'24px', height:'2.5px', background:'#c9943a', borderRadius:'2px', marginBottom:'18px' }}/>
            <form onSubmit={createUser}>
              <label style={label}>Full Name</label>
              <input style={input} required value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} placeholder="e.g. Raghunath K"/>
              <label style={label}>Email Address</label>
              <input style={input} type="email" required value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="user@easebuilders.com"/>
              <label style={label}>Temporary Password</label>
              <input style={input} type="password" required minLength={8} value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Min. 8 characters"/>
              <label style={label}>Role</label>
              <select style={{...input, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 13px center', paddingRight:'36px', appearance:'none'}} value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value as UserRole}))}>
                {ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
              {err && <div style={{ background:'#fef2f2', padding:'10px', borderRadius:'6px', color:'#dc2626', fontSize:'13px', marginBottom:'12px' }}>{err}</div>}
              <div style={{ display:'flex', gap:'10px' }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex:1, padding:'11px', background:'#eef1f7', color:'#64748b', border:'none', borderRadius:'6px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', fontSize:'14px' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2, ...btnP, padding:'11px', fontSize:'14px', opacity:saving?0.7:1 }}>{saving ? 'Creating…' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
