// ════════════════════════════════════════════════════════════
// EBOS Business Utilities — Stage 2.6
// Centralized business logic. Import from here.
// Never format currency, dates or status inline again.
// ════════════════════════════════════════════════════════════

// ── Money Formatter ──────────────────────────────────────────
// Replaces all `fmtCur()` instances across the codebase.
// Usage: fmtMoney(450000) → "₹4.50L"
//        fmtMoney(0)      → "₹0"
//        fmtMoney(-5000)  → "-₹5K"
export function fmtMoney(n?: number | null, opts?: { compact?: boolean; decimals?: number }): string {
  if (n === null || n === undefined) return '₹0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const d = opts?.decimals ?? 2

  if (abs === 0) return '₹0'
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(d)}Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(d)}L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
}

// Alias — keeps backward compat while migrating
export const fmtCur = fmtMoney

// ── SmartDate ────────────────────────────────────────────────
// Replaces all `fmtDate()` and `fmtAgo()` instances.
// Usage: smartDate('2026-06-30')          → "30 Jun 2026"
//        smartDate('2026-07-02', 'rel')   → "Today" / "Yesterday" / "2 days ago"
//        smartDate('2026-07-02', 'short') → "2 Jul"
//        smartDate(ts, 'ago')             → "3h ago"

export type DateFormat = 'abs' | 'rel' | 'short' | 'ago' | 'datetime'

export function smartDate(d?: string | null, format: DateFormat = 'abs'): string {
  if (!d) return '—'

  if (format === 'ago') {
    const s = (Date.now() - new Date(d).getTime()) / 1000
    if (s < 60)   return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  const date = new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
  const now  = new Date()
  const diffDays = Math.round((date.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000)
  date.setTime(new Date(d + (d.includes('T') ? '' : 'T00:00:00')).getTime())

  if (format === 'rel') {
    if (diffDays === 0)  return 'Today'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 1)  return 'Tomorrow'
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`
  }

  if (format === 'short') {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  if (format === 'datetime') {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Default: 'abs'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Alias for backward compat
export const fmtDate = (d?: string | null) => smartDate(d, 'abs')
export const fmtAgo  = (d: string) => smartDate(d, 'ago')

// ── Days left helper ─────────────────────────────────────────
export function daysLeft(d?: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 864e5)
}

export function isOverdue(d?: string | null): boolean {
  return d ? new Date(d + 'T00:00:00') < new Date() : false
}

// ── Status Engine ─────────────────────────────────────────────
// Single source of truth for every status in EBOS.
// Usage: const s = STATUS['Delayed']  →  { bg, color, label, dot }

export interface StatusConfig {
  bg:    string
  color: string
  label: string
  dot:   string   // same as color, for dot indicators
}

export const STATUS: Record<string, StatusConfig> = {
  // Project health
  Healthy:    { bg: '#f0fdf9', color: '#0d9488', label: 'Healthy',    dot: '#0d9488' },
  'On Track': { bg: '#f0fdf9', color: '#0d9488', label: 'On Track',   dot: '#0d9488' },
  'At Risk':  { bg: '#fffbeb', color: '#d97706', label: 'At Risk',    dot: '#d97706' },
  Warning:    { bg: '#fffbeb', color: '#d97706', label: 'Warning',    dot: '#d97706' },
  Critical:   { bg: '#fef2f2', color: '#dc2626', label: 'Critical',   dot: '#dc2626' },
  Delayed:    { bg: '#fef2f2', color: '#dc2626', label: 'Delayed',    dot: '#dc2626' },

  // Finance
  Paid:             { bg: '#f0fdf9', color: '#0d9488', label: 'Paid',             dot: '#0d9488' },
  Approved:         { bg: '#f0fdf9', color: '#0d9488', label: 'Approved',         dot: '#0d9488' },
  Completed:        { bg: '#f0fdf9', color: '#0d9488', label: 'Completed',        dot: '#0d9488' },
  Closed:           { bg: '#f0fdf9', color: '#0d9488', label: 'Closed',           dot: '#0d9488' },
  Active:           { bg: '#eff6ff', color: '#1e40af', label: 'Active',           dot: '#1e40af' },
  Submitted:        { bg: '#eff6ff', color: '#1e40af', label: 'Submitted',        dot: '#1e40af' },
  'Partially Paid': { bg: '#fffbeb', color: '#d97706', label: 'Partially Paid',   dot: '#d97706' },
  'Partially Repaid':{ bg: '#fffbeb', color: '#d97706', label: 'Partially Repaid',dot: '#d97706' },
  Pending:          { bg: '#f0f4f8', color: '#5a7a8a', label: 'Pending',          dot: '#5a7a8a' },
  Draft:            { bg: '#f0f4f8', color: '#5a7a8a', label: 'Draft',            dot: '#5a7a8a' },
  Overdue:          { bg: '#fef2f2', color: '#dc2626', label: 'Overdue',          dot: '#dc2626' },
  Cancelled:        { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled',        dot: '#dc2626' },
  Disputed:         { bg: '#fef2f2', color: '#dc2626', label: 'Disputed',         dot: '#dc2626' },

  // Materials
  Delivered:           { bg: '#f0fdf9', color: '#0d9488', label: 'Delivered',           dot: '#0d9488' },
  Ordered:             { bg: '#eff6ff', color: '#1e40af', label: 'Ordered',             dot: '#1e40af' },
  'In Transit':        { bg: '#eff6ff', color: '#1e40af', label: 'In Transit',          dot: '#1e40af' },
  'Partially Delivered':{ bg: '#fffbeb', color: '#d97706', label: 'Partially Delivered',dot: '#d97706' },
}

// Helper: get status config with fallback
export function getStatus(key: string): StatusConfig {
  return STATUS[key] ?? { bg: '#f0f4f8', color: '#5a7a8a', label: key, dot: '#5a7a8a' }
}

// ── Project health calc ──────────────────────────────────────
// Single function for determining project health — used everywhere
export function projectHealth(p: { budget?: number | null; total_spent?: number | null; progress?: number; end_date?: string | null }): 'green' | 'amber' | 'red' {
  const sp = p.total_spent ?? 0
  const b  = p.budget ?? 0
  if (b && sp > b)          return 'red'
  if (b && sp > b * 0.85)   return 'amber'
  const dl = daysLeft(p.end_date)
  if (dl !== null && dl < 7 && (p.progress ?? 0) < 90) return 'amber'
  return 'green'
}

export const HEALTH_LABEL: Record<string, string> = {
  green: 'On Track', amber: 'At Risk', red: 'Delayed'
}

// ── Initials helper ──────────────────────────────────────────
export function initials(name?: string): string {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
