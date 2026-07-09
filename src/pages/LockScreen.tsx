// ════════════════════════════════════════════════════════════
// EBOS Lock Screen — premium PIN entry
// Handles both unlock and setup (first-time / change PIN) modes
// ════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react'
import { LOGO_NAVY } from '../assets/logo'

type LockMode = 'unlock' | 'setup'
type SetupPhase = 'enter' | 'confirm'

interface LockScreenProps {
  mode: LockMode
  onUnlock: (pin: string) => boolean   // returns true if correct
  onSetup:  (pin: string) => void       // called with confirmed PIN
  onForgot: () => void
  onCancel?: () => void                 // for setup mode — cancels
}

const NAVY  = '#0d1b2a'
const NAVY2 = '#152335'
const WHITE = '#ffffff'

// ── Keypad layout ─────────────────────────────────────────────
const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function LockScreen({ mode, onUnlock, onSetup, onForgot, onCancel }: LockScreenProps) {
  const [pin,       setPin]       = useState('')
  const [phase,     setPhase]     = useState<SetupPhase>('enter')
  const [firstPin,  setFirstPin]  = useState('')
  const [shake,     setShake]     = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [time,      setTime]      = useState(new Date())

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = (d: Date) => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false })
  const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  const triggerShake = (msg: string) => {
    setError(msg)
    setShake(true)
    setTimeout(() => { setShake(false); setPin('') }, 600)
    setTimeout(() => setError(''), 2000)
  }

  const handleKey = (k: string) => {
    if (success) return
    if (k === '⌫') { setPin(p => p.slice(0, -1)); return }
    if (k === '')  return
    const next = pin + k
    if (next.length > 4) return
    setPin(next)

    if (next.length === 4) {
      setTimeout(() => {
        if (mode === 'unlock') {
          const ok = onUnlock(next)
          if (ok) { setSuccess(true) }
          else    { triggerShake('Wrong PIN') }
        } else {
          // setup mode
          if (phase === 'enter') {
            setFirstPin(next)
            setPhase('confirm')
            setPin('')
            setError('')
          } else {
            if (next === firstPin) {
              setSuccess(true)
              setTimeout(() => onSetup(next), 400)
            } else {
              triggerShake("PINs don't match")
              setPhase('enter')
              setFirstPin('')
            }
          }
        }
      }, 80)
    }
  }

  const headline =
    mode === 'unlock' ? 'Enter PIN' :
    phase === 'enter' ? 'Create a PIN' : 'Confirm PIN'

  const sub =
    mode === 'unlock' ? 'to access EBOS' :
    phase === 'enter' ? 'Choose a 4-digit PIN' : 'Enter the same PIN again'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Inter',system-ui,sans-serif",
      paddingBottom: 'env(safe-area-inset-bottom,0px)',
      userSelect: 'none',
    }}>
      {/* Logo + Clock */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:'40px' }}>
        <img src={LOGO_NAVY} alt="Ease Builders"
          style={{ height:'32px', width:'auto', filter:'brightness(0) invert(1)', opacity:0.6, marginBottom:'36px' }}/>

        <div style={{ fontSize:'56px', fontWeight:200, color:WHITE, letterSpacing:'-0.02em', lineHeight:1, marginBottom:'6px' }}>
          {fmt(time)}
        </div>
        <div style={{ fontSize:'14px', color:'rgba(255,255,255,.45)', marginBottom:'48px' }}>
          {fmtDate(time)}
        </div>

        {/* Headline */}
        <div style={{ fontSize:'17px', fontWeight:600, color:WHITE, marginBottom:'4px' }}>{headline}</div>
        <div style={{ fontSize:'13px', color:'rgba(255,255,255,.45)', marginBottom:'28px' }}>{sub}</div>

        {/* PIN dots */}
        <div style={{
          display: 'flex', gap: '16px', marginBottom: error ? '10px' : '48px',
          transform: shake ? 'translateX(0)' : 'none',
          animation: shake ? 'pinShake .5s ease' : 'none',
        }}>
          <style>{`
            @keyframes pinShake {
              0%,100%{transform:translateX(0)}
              15%{transform:translateX(-8px)}
              30%{transform:translateX(8px)}
              45%{transform:translateX(-6px)}
              60%{transform:translateX(6px)}
              75%{transform:translateX(-4px)}
              90%{transform:translateX(4px)}
            }
            @keyframes pinFill {
              0%{transform:scale(0)}
              60%{transform:scale(1.2)}
              100%{transform:scale(1)}
            }
          `}</style>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: `2px solid ${success ? '#34d399' : pin.length > i ? 'transparent' : 'rgba(255,255,255,.3)'}`,
              background: success ? '#34d399' : pin.length > i ? WHITE : 'transparent',
              transition: 'all .15s ease',
              transform: pin.length > i ? 'scale(1)' : 'scale(1)',
              animation: pin.length === i + 1 ? 'pinFill .15s ease' : 'none',
            }}/>
          ))}
        </div>

        {error && (
          <div style={{ fontSize:'13px', color:'#f87171', marginBottom:'28px', textAlign:'center' }}>
            {error}
          </div>
        )}
      </div>

      {/* Keypad */}
      <div style={{ width:'100%', maxWidth:'320px', padding:'0 24px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
          {KEYS.map((k, i) => {
            const isEmpty = k === ''
            const isBack  = k === '⌫'
            return (
              <button key={i} onClick={() => handleKey(k)}
                disabled={isEmpty}
                style={{
                  height: '72px', borderRadius: '18px', border: 'none',
                  background: isEmpty ? 'transparent' : isBack ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.1)',
                  color: WHITE, fontSize: isBack ? '22px' : '26px', fontWeight: k === '' ? 400 : 400,
                  cursor: isEmpty ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Inter',system-ui,sans-serif",
                  transition: 'background .1s ease, transform .08s ease',
                  WebkitTapHighlightColor: 'transparent',
                  letterSpacing: '-0.01em',
                  backdropFilter: isEmpty ? 'none' : 'blur(4px)',
                }}
                onTouchStart={e => { if(!isEmpty) e.currentTarget.style.background = 'rgba(255,255,255,.22)'; e.currentTarget.style.transform = 'scale(.94)' }}
                onTouchEnd={e   => { e.currentTarget.style.background = isEmpty ? 'transparent' : isBack ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.1)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                {k}
              </button>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'20px', padding:'0 4px' }}>
          {mode === 'setup' && onCancel ? (
            <button onClick={onCancel} style={{ background:'none', border:'none', color:'rgba(255,255,255,.45)', fontSize:'14px', cursor:'pointer', fontFamily:'inherit' }}>
              Cancel
            </button>
          ) : <span/>}
          {mode === 'unlock' && (
            <button onClick={onForgot} style={{ background:'none', border:'none', color:'rgba(255,255,255,.35)', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
              Forgot PIN?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
