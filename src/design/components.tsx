// ════════════════════════════════════════════════════════════
// EBOS Design System — Components
// All reusable UI primitives live here.
// Import from here; never duplicate in page files.
// ════════════════════════════════════════════════════════════
import React from 'react'
import { Ico, STAGE_ICON_MAP, CalendarDaysIcon, MapPinIcon, ExclamationTriangleIcon, ClipboardDocumentListIcon } from './icons'
import { colors, space, radius, shadow, type as T_, text, motion, size, T } from './tokens'
import { fmtMoney, smartDate, daysLeft, getStatus, projectHealth, HEALTH_LABEL, initials as bInitials } from './business'

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

      <div style={{
        background: colors.bgSurface, width: '100%',
        borderRadius: `${radius.xxl} ${radius.xxl} 0 0`,
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        /* No slide animation - avoids re-triggering on keyboard/re-render */
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
    failed:  [colors.danger,  `${pending} queued`],
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

// ════════════════════════════════════════════════════════════
// ENTERPRISE COMPONENT LIBRARY — Stage 2.5
// ════════════════════════════════════════════════════════════

// ── EnterpriseCard ───────────────────────────────────────────
// Unified card component. Replaces all inline `...card` spreads.
// Usage: <EnterpriseCard variant="metric" title="Budget" .../>
interface EnterpriseCardProps {
  variant?: 'default' | 'metric' | 'dashboard' | 'list' | 'alert' | 'action' | 'flush'
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  trailing?: React.ReactNode
  footer?: React.ReactNode
  status?: 'success' | 'warning' | 'danger' | 'info' | 'brand'
  loading?: boolean
  onClick?: () => void
  children?: React.ReactNode
  style?: React.CSSProperties
  noPad?: boolean
}

export function EnterpriseCard({
  variant = 'default', title, subtitle, icon, trailing, footer,
  status, loading, onClick, children, style, noPad
}: EnterpriseCardProps) {
  const statusColors: Record<string, string> = {
    success: colors.success, warning: colors.warning,
    danger: colors.danger, info: colors.info, brand: colors.brand,
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bgSurface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadow.sm,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Status bar */}
      {status && <div style={{ height: '3px', background: statusColors[status] }}/>}

      {/* Header */}
      {(title || icon || trailing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: noPad ? '0' : `${space[4]} ${space[4]} ${children ? space[2] : space[4]}` }}>
          {icon && (
            <div style={{ width: '36px', height: '36px', borderRadius: radius.md, background: colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: colors.textSecondary }}>
              {icon}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && <div style={{ ...text.cardTitle, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>}
            {subtitle && <div style={{ ...text.caption, color: colors.textSecondary, marginTop: '2px' }}>{subtitle}</div>}
          </div>
          {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div style={{ padding: space[4], display: 'flex', flexDirection: 'column', gap: space[2] }}>
          <Skeleton height="14px" radius={radius.sm}/>
          <Skeleton height="14px" radius={radius.sm} width="70%"/>
        </div>
      ) : children ? (
        <div style={{ padding: noPad || title ? `0 ${space[4]} ${space[4]}` : space[4] }}>{children}</div>
      ) : null}

      {/* Footer */}
      {footer && (
        <div style={{ padding: `${space[3]} ${space[4]}`, borderTop: `1px solid ${colors.divider}`, display: 'flex', gap: space[2] }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// ── KPITile ──────────────────────────────────────────────────
// Unified KPI / metric tile. Replaces SumCard and inline stat cards.
// Usage: <KPITile label="Cash Position" value="₹4.2L" trend="+12%" trendUp/>
interface KPITileProps {
  label: string
  value: string
  sub?: string
  trend?: string
  trendUp?: boolean
  accent?: string
  alert?: boolean
  loading?: boolean
  onClick?: () => void
}

export function KPITile({ label, value, sub, trend, trendUp, accent, alert, loading, onClick }: KPITileProps) {
  const bg = alert ? colors.dangerBg : colors.bgMuted
  const valueColor = alert ? colors.danger : colors.textPrimary
  const accentBar = alert ? colors.danger : (accent ?? colors.brand)

  return (
    <div onClick={onClick} style={{ textAlign: 'center', padding: `${space[3]} ${space[2]}`, background: bg, borderRadius: radius.lg, cursor: onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
      {/* Accent dot */}
      <div style={{ width: '6px', height: '6px', borderRadius: radius.pill, background: accentBar, margin: `0 auto ${space[1]}` }}/>
      <div style={{ ...text.labelXs, color: alert ? colors.danger : colors.textSecondary, marginBottom: space[1] }}>{label}</div>
      {loading ? (
        <div style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Skeleton height="18px" width="60px" radius={radius.sm}/>
        </div>
      ) : (
        <div style={{ fontSize: T_.size2xl, fontWeight: T_.weightBlack, color: valueColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      )}
      {sub && <div style={{ ...text.caption, color: alert ? colors.danger : colors.textTertiary, marginTop: '3px' }}>{sub}</div>}
      {trend && (
        <div style={{ fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, color: trendUp ? colors.success : colors.danger, marginTop: '4px' }}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  )
}

// ── ConfirmDialog ─────────────────────────────────────────────
// Replaces every window.confirm() call.
// Usage: <ConfirmDialog open={open} title="Delete project?" ... />
interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: colors.bgOverlay, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: space[5] }}
      onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: colors.bgSurface, borderRadius: radius.xl, padding: space[6], width: '100%', maxWidth: '320px', boxShadow: shadow.modal }}>
        {/* Icon */}
        <div style={{ width: '48px', height: '48px', borderRadius: radius.lg, background: danger ? colors.dangerBg : colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `0 auto ${space[4]}` }}>
          {danger ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )}
        </div>
        <div style={{ ...text.sectionTitle, color: colors.textPrimary, textAlign: 'center', marginBottom: space[2] }}>{title}</div>
        {message && <div style={{ ...text.body, color: colors.textSecondary, textAlign: 'center', marginBottom: space[5], lineHeight: T_.lineRelaxed }}>{message}</div>}
        <div style={{ display: 'flex', gap: space[2] }}>
          <button onClick={onCancel} style={{ ...T.btnSecondary, flex: 1 }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ ...( danger ? T.btnDanger : T.btnPrimary ), flex: 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── ListRow ───────────────────────────────────────────────────
// Reusable list row. Used in More, Documents, Notifications, Credentials.
// Usage: <ListRow icon={...} title="User Management" subtitle="..." onTap={...} trailing={...}/>
interface ListRowProps {
  icon?: React.ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  trailing?: React.ReactNode
  onTap?: () => void
  danger?: boolean
  showChevron?: boolean
  borderBottom?: boolean
}

export function ListRow({ icon, iconBg, title, subtitle, trailing, onTap, danger, showChevron = true, borderBottom = true }: ListRowProps) {
  return (
    <div
      onClick={onTap}
      style={{ display: 'flex', gap: space[3], alignItems: 'center', padding: `${space[3]} ${space[4]}`, borderBottom: borderBottom ? `1px solid ${colors.divider}` : 'none', cursor: onTap ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent' } as React.CSSProperties}
    >
      {icon && (
        <div style={{ width: '36px', height: '36px', borderRadius: radius.md, background: iconBg ?? colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: T_.sizeLg, fontWeight: T_.weightSemibold, color: danger ? colors.danger : colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ ...text.caption, color: colors.textSecondary, marginTop: '2px' }}>{subtitle}</div>}
      </div>
      {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      {showChevron && onTap && !trailing && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
      )}
    </div>
  )
}

// ── ActivityItem ──────────────────────────────────────────────
// Reusable timeline entry. Used in Finance Timeline, Activity Feed.
// Usage: <ActivityItem date="2 Jun" type="Receivable" desc="Client payment" amount="+₹2L" dir="in"/>
interface ActivityItemProps {
  date: string
  type: string
  desc: string
  amount?: string
  dir?: 'in' | 'out' | 'neutral'
  color?: string
  isLast?: boolean
}

export function ActivityItem({ date, type, desc, amount, dir = 'neutral', color, isLast }: ActivityItemProps) {
  const dotColor = color ?? (dir === 'in' ? colors.success : dir === 'out' ? colors.danger : colors.textSecondary)
  const amountColor = dir === 'in' ? colors.success : dir === 'out' ? colors.danger : colors.textPrimary

  return (
    <div style={{ position: 'relative', paddingLeft: space[8], marginBottom: isLast ? 0 : space[4] }}>
      {/* Vertical line */}
      {!isLast && <div style={{ position: 'absolute', left: '9px', top: '18px', bottom: `-${space[4]}`, width: '1px', background: colors.divider }}/>}
      {/* Dot */}
      <div style={{ position: 'absolute', left: '4px', top: '4px', width: '10px', height: '10px', borderRadius: radius.pill, background: dotColor, border: `2px solid ${colors.bgSurface}`, boxShadow: `0 0 0 1.5px ${colors.border}` }}/>
      {/* Date */}
      <div style={{ ...text.caption, color: colors.textTertiary, marginBottom: '3px' }}>{date}</div>
      {/* Card */}
      <div style={{ background: colors.bgSurface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: `${space[2]} ${space[3]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: shadow.xs }}>
        <div>
          <div style={{ ...text.labelXs, color: dotColor, marginBottom: '2px' }}>{type}</div>
          <div style={{ fontSize: T_.sizeMd, fontWeight: T_.weightMedium, color: colors.textPrimary }}>{desc}</div>
        </div>
        {amount && (
          <div style={{ fontSize: T_.sizeLg, fontWeight: T_.weightBold, color: amountColor, marginLeft: space[3], whiteSpace: 'nowrap' }}>{amount}</div>
        )}
      </div>
    </div>
  )
}

// ── FormSection ───────────────────────────────────────────────
// Groups related form fields with a section title.
// Usage: <FormSection title="Project Details"><FormGroup .../></FormSection>
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: space[5] }}>
      <div style={{ ...text.label, color: colors.textSecondary, marginBottom: space[3], paddingBottom: space[2], borderBottom: `1px solid ${colors.divider}` }}>{title}</div>
      {children}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────
// Consistent page title + subtitle used across all main pages.
// Usage: <PageHeader title="Projects" subtitle="Track construction progress"/>
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: `${space[5]} ${space[4]} ${space[4]}` }}>
      <div>
        <div style={{ ...text.pageTitle, color: colors.brand }}>{title}</div>
        {subtitle && <div style={{ ...text.caption, color: colors.textSecondary, marginTop: '3px' }}>{subtitle}</div>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ── StatGrid ──────────────────────────────────────────────────
// 2-column KPI grid. Wraps KPITile for consistent spacing.
// Usage: <StatGrid tiles={[{label:'Budget', value:'₹10L'}, ...]}/>
interface StatTile { label: string; value: string; sub?: string; alert?: boolean; accent?: string; onClick?: () => void }
export function StatGrid({ tiles, columns }: { tiles: StatTile[]; columns?: 2 | 3 }) {
  const cols = columns ?? (tiles.length === 3 ? 3 : 2)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: space[2], marginBottom: space[4] }}>
      {tiles.map(t => <KPITile key={t.label} {...t}/>)}
    </div>
  )
}

// ── HeroCard ──────────────────────────────────────────────────
// Gradient navy hero card used on Finance dashboard, Expenses tab.
// Usage: <HeroCard label="Total Spent" value="₹4.96L" sub="6% of budget"/>
interface HeroCardProps { label: string; value: string; sub?: string; children?: React.ReactNode }
export function HeroCard({ label, value, sub, children }: HeroCardProps) {
  return (
    <div style={{ ...T.heroCard, margin: `0 ${space[4]} ${space[4]}` }}>
      <div style={{ fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, letterSpacing: T_.trackingWidest, textTransform: 'uppercase', color: 'rgba(255,255,255,.6)', marginBottom: space[1] }}>{label}</div>
      <div style={{ ...text.metricLarge, color: '#fff' }}>{value}</div>
      {sub && <div style={{ ...text.caption, color: 'rgba(255,255,255,.6)', marginTop: space[1] }}>{sub}</div>}
      {children && <div style={{ marginTop: space[4] }}>{children}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// BUSINESS COMPONENTS — Stage 2.6
// ════════════════════════════════════════════════════════════
// business utils imported at top of file

// ── EntityAvatar ─────────────────────────────────────────────
// Extends Avatar with type variants.
// Usage: <EntityAvatar name="Anirudh" type="user"/>
//        <EntityAvatar name="SBI" type="bank" size="lg"/>
type EntityType = 'user' | 'client' | 'vendor' | 'bank' | 'project' | 'contractor' | 'company'
type AvatarSize = 'sm' | 'md' | 'lg'

const ENTITY_BG: Record<EntityType, string> = {
  user:       colors.brand,
  client:     '#0891b2',
  vendor:     '#7c3aed',
  bank:       '#059669',
  project:    colors.gold,
  contractor: '#d97706',
  company:    colors.brand,
}

export function EntityAvatar({ name, type = 'user', size = 'md', imageUrl }: { name?: string; type?: EntityType; size?: AvatarSize; imageUrl?: string }) {
  const dim = size === 'sm' ? '28px' : size === 'lg' ? '48px' : '36px'
  const fontSize = size === 'sm' ? T_.sizeXs : size === 'lg' ? T_.sizeLg : T_.sizeSm
  const rad = size === 'sm' ? radius.sm : size === 'lg' ? radius.lg : radius.md
  const bg = ENTITY_BG[type] ?? colors.brand

  if (imageUrl) {
    return <img src={imageUrl} alt={name} style={{ width: dim, height: dim, borderRadius: rad, objectFit: 'cover', flexShrink: 0 }}/>
  }

  return (
    <div style={{ width: dim, height: dim, borderRadius: rad, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, fontWeight: T_.weightBold, flexShrink: 0, letterSpacing: '-0.01em' }}>
      {bInitials(name)}
    </div>
  )
}

// ── ProjectHealthCard ─────────────────────────────────────────
// Reusable project card used on Home, Projects list, future search.
// DO NOT redesign here — visual redesign happens in Stage 3.
// Usage: <ProjectHealthCard project={p} onClick={() => goProject(p)}/>
interface ProjectHealthCardProps {
  project: {
    id: string
    name: string
    client?: string | null
    location?: string | null
    type?: string | null
    stage?: string | null
    progress: number
    budget?: number | null
    total_spent?: number | null
    end_date?: string | null
    status?: string | null
  }
  onClick?: () => void
  onEdit?: () => void
  showEdit?: boolean
}

// Stage icons now use STAGE_ICON_MAP from ./icons

export function ProjectHealthCard({ project: p, onClick, onEdit, showEdit }: ProjectHealthCardProps) {
  const h = projectHealth(p)
  const healthColor = h === 'green' ? colors.success : h === 'amber' ? colors.warning : colors.danger
  const healthLabel = HEALTH_LABEL[h]

  return (
    <div style={{ ...T.card, marginBottom: space[3], cursor: onClick ? 'pointer' : 'default' }}>
      {/* Health bar */}
      <div style={{ height: '3px', background: healthColor }}/>
      {/* Dark header */}
      <div style={{ background: colors.brand, padding: `${space[3]} ${space[4]}` }} onClick={onClick}>
        <div style={{ fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, letterSpacing: T_.trackingWidest, textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: '3px' }}>{p.type || 'Construction'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: T_.size2xl, fontWeight: T_.weightBold, color: '#fff', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            <div style={{ fontSize: T_.sizeSm, color: 'rgba(255,255,255,.55)', marginTop: '2px' }}>{p.client || '—'}</div>
          </div>
          <span style={{ padding: `${space[1]} ${space[2]}`, borderRadius: radius.pill, fontSize: T_.sizeXs, fontWeight: T_.weightSemibold, background: h === 'green' ? '#f0fdf4' : h === 'amber' ? '#fffbeb' : '#fef2f2', color: healthColor, marginLeft: space[2], flexShrink: 0 }}>{healthLabel}</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: `${space[3]} ${space[4]}` }} onClick={onClick}>
        <div style={{ display: 'flex', gap: space[3], flexWrap: 'wrap', marginBottom: space[3] }}>
          {p.location && <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize: T_.sizeSm, color: colors.textSecondary }}><Ico icon={MapPinIcon} size={14}/>{p.location}</span>}
          {p.end_date && <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize: T_.sizeSm, color: colors.textSecondary }}><Ico icon={CalendarDaysIcon} size={14}/>{smartDate(p.end_date)}</span>}
          {p.stage && <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize: T_.sizeSm, color: colors.textSecondary }}><Ico icon={STAGE_ICON_MAP[p.stage] || ClipboardDocumentListIcon} size={14}/>{p.stage}</span>}
        </div>
        <ProgressBar value={p.progress} color={healthColor}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: space[1], fontSize: T_.sizeSm, color: colors.textSecondary }}>
          <span>{p.progress}% complete</span>
          {p.budget && <span>{fmtMoney(p.total_spent ?? 0)} of {fmtMoney(p.budget)}</span>}
        </div>
      </div>
      {/* Edit footer */}
      {showEdit && onEdit && (
        <div style={{ padding: `0 ${space[4]} ${space[3]}` }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ ...T.btnSecondary, width: '100%', height: '36px', fontSize: T_.sizeSm }}>Edit Project</button>
        </div>
      )}
    </div>
  )
}

// ── BusinessEmptyStates ──────────────────────────────────────
// Named presets — no more repeating icon/title/body for common states.
// Usage: <BusinessEmptyStates.NoProjects onCta={() => ...}/>

const makeEmptyState = (icon: React.ReactNode, title: string, body: string) =>
  ({ onCta, ctaLabel }: { onCta?: () => void; ctaLabel?: string }) =>
    <EmptyState icon={icon} title={title} body={body} ctaLabel={ctaLabel} onCta={onCta}/>

const ProjectIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
const DocIcon    = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
const MoneyIcon  = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
const LockIcon   = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const LogIcon    = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const BoxIcon    = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
const BellIcon   = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
const ChartIcon  = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>

export const BusinessEmptyState = {
  NoProjects:    makeEmptyState(ProjectIcon, 'No Projects Yet',      'Create your first construction project to start tracking milestones, logs, materials and expenses.'),
  NoFunding:     makeEmptyState(MoneyIcon,   'No Funding Records',   'Add loans, gold loans, director contributions and other funding sources here.'),
  NoReceivables: makeEmptyState(MoneyIcon,   'No Receivables',       'Add running bills and client invoices to track incoming payments.'),
  NoPayables:    makeEmptyState(MoneyIcon,   'No Payables',          'Add vendor invoices and supplier payments to track outgoing obligations.'),
  NoDocuments:   makeEmptyState(DocIcon,     'No Documents',         'Link drawings, BOQs, certificates and contracts from Google Drive or any URL.'),
  NoLogs:        makeEmptyState(LogIcon,     'No Daily Logs',        'Record daily site activity, labour counts, weather and progress updates.'),
  NoMaterials:   makeEmptyState(BoxIcon,     'No Materials',         'Track procurement and delivery status for materials across this project.'),
  NoExpenses:    makeEmptyState(MoneyIcon,   'No Expenses',          'Record material, labour, equipment and other project expenses here.'),
  NoCredentials: makeEmptyState(LockIcon,    'No Credentials Saved', 'Store portal logins, vendor credentials and client access details securely.'),
  NoNotifications: makeEmptyState(BellIcon,  'All Caught Up',        'No new notifications right now.'),
  NoBOQ:         makeEmptyState(ChartIcon,   'No BOQ Items',         'Add items manually or import from a CSV file. Format: Description, Spec, Unit, Qty, Rate.'),
}

// ── EnterpriseList ────────────────────────────────────────────
// Reusable list container with loading skeleton and empty state.
// Usage: <EnterpriseList loading={loading} empty={<BusinessEmptyState.NoLogs/>} items={[...]}/>
interface EnterpriseListProps {
  loading?: boolean
  empty?: React.ReactNode
  children: React.ReactNode
  skeletonCount?: number
}

export function EnterpriseList({ loading, empty, children, skeletonCount = 3 }: EnterpriseListProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} style={{ background: colors.bgSurface, borderRadius: radius.lg, padding: space[4], border: `1px solid ${colors.border}` }}>
            <Skeleton height="14px" width="60%" radius={radius.sm}/>
            <div style={{ height: space[2] }}/>
            <Skeleton height="12px" width="40%" radius={radius.sm}/>
          </div>
        ))}
        <style>{`@keyframes ebPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      </div>
    )
  }

  // Check if children is empty (React.Children.count handles fragments)
  const count = React.Children.count(children)
  if (count === 0 && empty) return <>{empty}</>

  return <>{children}</>
}
