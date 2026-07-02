// ════════════════════════════════════════════════════════════
// EBOS Design System — Components
// All reusable UI primitives live here.
// Import from here; never duplicate in page files.
// ════════════════════════════════════════════════════════════
import React from 'react'
import { colors, space, radius, shadow, type as T_, text, motion, size, T } from './tokens'

// ── Toast ────────────────────────────────────────────────────
let _toastTimer: ReturnType<typeof setTimeout>
export function toast(msg: string) {
  const existing = document.querySelector('.eb-toast')
  if (existing) existing.remove()
  clearTimeout(_toastTimer)
  const el = document.createElement('div')
  el.className = 'eb-toast'
  el.textContent = msg
  Object.assign(el.style, {
    position: 'fixed', top: space[4], left: '50%', transform: 'translateX(-50%)',
    background: colors.brand, color: '#fff', padding: `${space[2]} ${space[4]}`,
    borderRadius: radius.lg, fontSize: T_.sizeMd, fontWeight: String(T_.weightMedium),
    zIndex: '9999', boxShadow: shadow.lg, whiteSpace: 'nowrap',
    fontFamily: "'Inter', system-ui, sans-serif",
    animation: `ebToastIn ${motion.spring} both`,
  })
  if (!document.querySelector('#eb-toast-style')) {
    const s = document.createElement('style')
    s.id = 'eb-toast-style'
    s.textContent = `@keyframes ebToastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`
    document.head.appendChild(s)
  }
  document.body.appendChild(el)
  _toastTimer = setTimeout(() => {
    el.style.opacity = '0'; el.style.transition = `opacity ${motion.normal}`
    setTimeout(() => el.remove(), 220)
  }, 2600)
}

// ── Sheet (bottom modal) ─────────────────────────────────────
interface SheetProps {
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
}
export function Sheet({ title, children, onClose, footer }: SheetProps) {
  return (
    <div
      style={{ position:'fixed', inset:0, background: colors.bgOverlay, zIndex: 100, display:'flex', alignItems:'flex-end', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' } as React.CSSProperties}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`@keyframes ebSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes ebBackdrop{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        background: colors.bgSurface, width: '100%',
        borderRadius: `${radius.xxl} ${radius.xxl} 0 0`,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        animation: `ebSheetUp ${motion.smooth} both`,
        fontFamily: "'Inter', system-ui, sans-serif",
        boxShadow: '0 -4px 40px rgba(15,31,42,.12)',
      }}>
        {/* Drag indicator */}
        <div style={{ width: '36px', height: '4px', background: colors.borderStrong, borderRadius: radius.pill, margin: `${space[2]} auto 0`, opacity: 0.4 }}/>
        {/* Header */}
        <div style={{ padding: `${space[4]} ${space[5]} ${space[3]}`, borderBottom: `1px solid ${colors.divider}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ ...text.sectionTitle, color: colors.brand }}>{title}</div>
            <div style={T.goldRule}/>
          </div>
          <button onClick={onClose} style={{
            width: '34px', height: '34px', borderRadius: radius.md, display:'flex', alignItems:'center', justifyContent:'center',
            background: colors.bgMuted, border: 'none', color: colors.textSecondary, fontSize: '16px', cursor:'pointer', fontWeight: 600,
          }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: space[5], WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>{children}</div>
        {/* Footer */}
        {footer && (
          <div style={{ padding: `${space[3]} ${space[5]}`, paddingBottom: `calc(${space[5]} + env(safe-area-inset-bottom, 0px))`, borderTop: `1px solid ${colors.divider}`, display:'flex', gap: space[2], flexShrink: 0, background: colors.bgSurface }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FormGroup ────────────────────────────────────────────────
export function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: space[4] }}>
      <label style={T.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

// ── Grid2 ─────────────────────────────────────────────────────
export function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space[3] }}>{children}</div>
}

// ── RangeField ───────────────────────────────────────────────
export function RangeField({ label, id, value, onChange }: { label: string; id: string; value: number; onChange: (v: number) => void }) {
  return (
    <FormGroup label={`${label}: `}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
        <input type="range" id={id} min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: colors.brand }}/>
        <span style={{ ...text.number, color: colors.brand, minWidth: '38px', textAlign: 'right' }}>{value}%</span>
      </div>
    </FormGroup>
  )
}

// ── EmptyState ───────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  body?: string
  ctaLabel?: string
  onCta?: () => void
}
export function EmptyState({ icon, title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding: `${space[12]} ${space[8]}`, textAlign:'center' }}>
      <div style={{
        width: '64px', height: '64px', background: colors.bgMuted, borderRadius: radius.xl,
        display:'flex', alignItems:'center', justifyContent:'center', marginBottom: space[5],
      }}>
        <span style={{ width: '28px', height: '28px', color: colors.textSecondary, display:'flex' }}>{icon}</span>
      </div>
      <div style={{ ...text.sectionTitle, color: colors.textPrimary, marginBottom: space[2] }}>{title}</div>
      {body && <div style={{ ...text.body, color: colors.textSecondary, marginBottom: space[6], maxWidth: '280px', lineHeight: T_.lineRelaxed }}>{body}</div>}
      {ctaLabel && onCta && (
        <button style={T.btnPrimary} onClick={onCta}>{ctaLabel}</button>
      )}
    </div>
  )
}

// ── HealthBadge ──────────────────────────────────────────────
export function HealthBadge({ h }: { h: string }) {
  const map: Record<string, [string, string]> = {
    green: [colors.successBg, colors.success],
    amber: [colors.warningBg, colors.warning],
    red:   [colors.dangerBg,  colors.danger],
  }
  const [bg, color] = map[h] ?? map.green
  const label = h === 'green' ? 'On Track' : h === 'amber' ? 'At Risk' : 'Delayed'
  return (
    <span style={{ padding: `${space[1]} ${space[2]}`, borderRadius: radius.pill, fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, background: bg, color, letterSpacing: T_.trackingWide }}>
      {label}
    </span>
  )
}

// ── Badge ─────────────────────────────────────────────────────
type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'teal'
export function Badge({ label, color = 'blue' }: { label: string; color?: BadgeColor }) {
  const map: Record<BadgeColor, [string, string]> = {
    blue:  [colors.infoBg,     colors.info],
    green: [colors.successBg,  colors.success],
    amber: [colors.warningBg,  colors.warning],
    red:   [colors.dangerBg,   colors.danger],
    gray:  [colors.bgMuted,    colors.textSecondary],
    teal:  [colors.tealBg,     colors.teal],
  }
  const [bg, c] = map[color]
  return (
    <span style={{ padding: `${space[1]} ${space[2]}`, borderRadius: radius.pill, fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, background: bg, color: c, letterSpacing: T_.trackingWide }}>
      {label}
    </span>
  )
}

// ── StatusBadge (for finance) ────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    Active:           [colors.infoBg,    colors.info],
    'Partially Repaid':[colors.warningBg, colors.warning],
    Closed:           [colors.successBg, colors.success],
    Overdue:          [colors.dangerBg,  colors.danger],
    Draft:            [colors.bgMuted,   colors.textSecondary],
    Submitted:        [colors.infoBg,    colors.info],
    Approved:         [colors.successBg, colors.success],
    'Partially Paid': [colors.warningBg, colors.warning],
    Paid:             [colors.successBg, colors.success],
    Pending:          [colors.bgMuted,   colors.textSecondary],
    Disputed:         [colors.dangerBg,  colors.danger],
  }
  const [bg, color] = map[status] ?? [colors.bgMuted, colors.textSecondary]
  return (
    <span style={{ padding: `${space[1]} ${space[2]}`, borderRadius: radius.pill, fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, background: bg, color, letterSpacing: T_.trackingWide }}>
      {status}
    </span>
  )
}

// ── SyncIndicator ────────────────────────────────────────────
export function SyncIndicator({ status, pending }: { status: string; pending: number }) {
  const map: Record<string, [string, string]> = {
    online:  [colors.success, '● Online'],
    offline: [colors.danger,  '● Offline'],
    syncing: [colors.warning, '↻ Syncing…'],
    failed:  [colors.danger,  `⚠ ${pending} queued`],
  }
  const [color, label] = map[status] ?? map.online
  return <span style={{ fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, color, letterSpacing: '0.02em' }}>{label}</span>
}

// ── SumCard (finance summary tile) ──────────────────────────
interface SumCardProps { label: string; value: string; sub?: string; accent?: string; alert?: boolean }
export function SumCard({ label, value, sub, alert }: SumCardProps) {
  return (
    <div style={{ textAlign:'center', padding: `${space[3]} ${space[2]}`, background: alert ? colors.dangerBg : colors.bgMuted, borderRadius: radius.lg }}>
      <div style={{ ...text.labelXs, color: alert ? colors.danger : colors.textSecondary, marginBottom: space[1] }}>{label}</div>
      <div style={{ ...text.metricMed, color: alert ? colors.danger : colors.textPrimary }}>{value}</div>
      {sub && <div style={{ ...text.caption, color: alert ? colors.danger : colors.textTertiary, marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

// ── Section Header (with gold rule) ─────────────────────────
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: space[4] }}>
      <div style={{ ...text.pageTitle, color: colors.brand }}>{title}</div>
      <div style={T.goldRule}/>
      {subtitle && <div style={{ ...text.caption, color: colors.textSecondary, marginTop: space[1] }}>{subtitle}</div>}
    </div>
  )
}

// ── Divider ──────────────────────────────────────────────────
export function Divider() {
  return <div style={{ height: '1px', background: colors.divider, margin: `${space[4]} 0` }}/>
}

// ── Progress Bar ─────────────────────────────────────────────
export function ProgressBar({ value, color = colors.success, height = '5px' }: { value: number; color?: string; height?: string }) {
  return (
    <div style={{ height, background: colors.bgMuted, borderRadius: radius.pill, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: radius.pill, transition: `width ${motion.slow}` }}/>
    </div>
  )
}

// ── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size: s = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const dim = s === 'sm' ? '28px' : '36px'
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: dim, height: dim, borderRadius: s === 'sm' ? radius.sm : radius.md, background: colors.brand, color: '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: s === 'sm' ? T_.sizeXs : T_.sizeSm, fontWeight: T_.weightBold, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

// ── Loading Skeleton ─────────────────────────────────────────
export function Skeleton({ width = '100%', height = '16px', radius: r = radius.sm }: { width?: string; height?: string; radius?: string }) {
  return (
    <div style={{ width, height, background: colors.bgMuted, borderRadius: r, animation: 'ebPulse 1.5s ease-in-out infinite' }}>
      <style>{`@keyframes ebPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  )
}
