import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { LOGO_NAVY } from '../assets/logo'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d2144 0%, #1a3a72 60%, #1a4b8f 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '36px 32px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(13,33,68,.18)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '24px' }}>
          <img src={LOGO_NAVY} alt="Ease Builders Pvt. Ltd." style={{ height: '46px', width: 'auto', display: 'block' }}/>
        </div>

        {/* Gold rule — brochure signature */}
        <div style={{ width: '32px', height: '3px', background: '#c9943a', borderRadius: '2px', marginBottom: '20px' }}/>

        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0d2144', marginBottom: '4px' }}>Site Manager</div>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
          Sign in to access your projects and team updates.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@easebuilders.com"
              style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #e2e8f3', borderRadius: '6px', fontSize: '14px', outline: 'none', color: '#1e293b' }}
              onFocus={e => (e.target.style.borderColor = '#1a4b8f')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f3')}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #e2e8f3', borderRadius: '6px', fontSize: '14px', outline: 'none', color: '#1e293b' }}
              onFocus={e => (e.target.style.borderColor = '#1a4b8f')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f3')}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#1a4b8f', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
          Contact your Director to get access.
        </div>
      </div>
    </div>
  )
}
