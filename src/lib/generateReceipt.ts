// ════════════════════════════════════════════════════════════
// EBOS Receipt Generator — Canvas-based premium document
// Generates PNG receipts for Funding, Receivables, Payables
// ════════════════════════════════════════════════════════════

export interface ReceiptField {
  label: string
  value: string
  bold?: boolean
  accent?: string  // optional color for the value
}

export interface ReceiptOptions {
  docType:     'FUNDING RECEIPT' | 'RECEIVABLE STATEMENT' | 'PAYABLE VOUCHER'
  refNumber:   string
  partyLabel:  string   // SOURCE / CLIENT / SUPPLIER
  partyName:   string
  category?:   string
  projectName?: string
  date:        string
  dueDate?:    string
  fields:      ReceiptField[]
  status:      string
  notes?:      string
  logoSrc:     string   // base64 data URL
}

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload  = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY)
      line = word
      curY += lineH
    } else line = test
  }
  if (line) ctx.fillText(line, x, curY)
  return curY + lineH
}

// ── Main generator ─────────────────────────────────────────────
export async function generateReceipt(opts: ReceiptOptions): Promise<Blob> {
  const W   = 800
  const PAD = 52
  const CW  = W - PAD * 2

  // Dynamic height
  const noteLines = opts.notes ? Math.ceil(opts.notes.length / 80) + 1 : 0
  const H = PAD + 144 + 40 + 56 + 40 + 100 + 40 + opts.fields.length * 52 + 40 + (noteLines > 0 ? noteLines * 20 + 56 : 0) + 72 + PAD

  const canvas = document.createElement('canvas')
  canvas.width  = W * 2   // 2x for retina sharpness
  canvas.height = H * 2
  canvas.style.width  = `${W}px`
  canvas.style.height = `${H}px`

  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)   // draw at 2x, export as 2x PNG

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const NAVY   = '#1e3a4a'
  const INK    = '#0f172a'
  const SLATE  = '#475569'
  const MUTED  = '#94a3b8'
  const BORDER = '#cbd5e1'
  const STRIPE = '#f8fafc'
  const FONT   = 'system-ui, -apple-system, Helvetica Neue, sans-serif'

  let y = PAD

  // ── Logo ────────────────────────────────────────────────
  const logo = await loadImg(opts.logoSrc)
  const logoH = 72
  const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH
  ctx.drawImage(logo, PAD, y, logoW, logoH)

  // Company info — right aligned
  ctx.textAlign = 'right'
  ctx.fillStyle = NAVY
  ctx.font      = `bold 14px ${FONT}`
  ctx.fillText('Ease Builders Pvt. Ltd.', W - PAD, y + 14)
  ctx.font      = `12px ${FONT}`
  ctx.fillStyle = SLATE
  ctx.fillText('Mars Building, Prabhath Junction', W - PAD, y + 32)
  ctx.fillText('Kannur, Kerala 670001', W - PAD, y + 48)
  ctx.fillText('Ph: 0497 297 2511', W - PAD, y + 64)

  y += logoH + 28

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = BORDER
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 32

  // ── Document type + ref ─────────────────────────────────
  ctx.textAlign = 'left'
  ctx.fillStyle = INK
  ctx.font      = `bold 24px ${FONT}`
  ctx.fillText(opts.docType, PAD, y + 18)

  // Ref number top right
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font      = `12px ${FONT}`
  ctx.fillText(opts.refNumber, W - PAD, y + 6)

  // Status badge text
  const statusColor = ['Active','Paid','Approved'].includes(opts.status) ? '#16a34a'
    : ['Overdue','Delayed','Rejected'].includes(opts.status) ? '#dc2626' : '#d97706'
  ctx.fillStyle = statusColor
  ctx.font      = `bold 12px ${FONT}`
  ctx.fillText(opts.status.toUpperCase(), W - PAD, y + 22)

  y += 48

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth   = 0.5
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 28

  // ── Party + Date (2 column) ──────────────────────────────
  // Left: party info
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font      = `10px ${FONT}`
  ctx.fillText(opts.partyLabel, PAD, y)
  ctx.fillStyle = INK
  ctx.font      = `bold 18px ${FONT}`
  ctx.fillText(opts.partyName, PAD, y + 20)
  if (opts.category) {
    ctx.fillStyle = SLATE
    ctx.font      = `13px ${FONT}`
    ctx.fillText(opts.category, PAD, y + 38)
  }
  if (opts.projectName) {
    ctx.fillStyle = MUTED
    ctx.font      = `12px ${FONT}`
    ctx.fillText(`Project: ${opts.projectName}`, PAD, y + 56)
  }

  // Right: dates
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.font      = `10px ${FONT}`
  ctx.fillText('DATE', W - PAD, y)
  ctx.fillStyle = INK
  ctx.font      = `bold 14px ${FONT}`
  ctx.fillText(fmtDate(opts.date), W - PAD, y + 20)

  if (opts.dueDate) {
    ctx.fillStyle = MUTED
    ctx.font      = `10px ${FONT}`
    ctx.fillText('DUE DATE', W - PAD, y + 44)
    ctx.fillStyle = INK
    ctx.font      = `bold 14px ${FONT}`
    ctx.fillText(fmtDate(opts.dueDate), W - PAD, y + 62)
  }

  y += 96

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = BORDER
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 24

  // ── Financial fields ─────────────────────────────────────
  opts.fields.forEach((f, i) => {
    const rowY   = y + i * 52
    const isLast = i === opts.fields.length - 1

    // Stripe on alternates
    if (i % 2 === 1) {
      ctx.fillStyle = STRIPE
      ctx.fillRect(PAD - 8, rowY - 2, CW + 16, 44)
    }

    ctx.textAlign = 'left'
    ctx.fillStyle = SLATE
    ctx.font      = `13px ${FONT}`
    ctx.fillText(f.label, PAD, rowY + 20)

    ctx.textAlign = 'right'
    ctx.fillStyle = f.accent ?? (f.bold ? INK : '#1e293b')
    ctx.font      = f.bold ? `bold 17px ${FONT}` : `14px ${FONT}`
    ctx.fillText(f.value, W - PAD, rowY + 20)

    // Row divider (thin)
    if (!isLast) {
      ctx.strokeStyle = '#f1f5f9'
      ctx.lineWidth   = 0.5
      ctx.beginPath(); ctx.moveTo(PAD, rowY + 44); ctx.lineTo(W - PAD, rowY + 44); ctx.stroke()
    }
  })

  y += opts.fields.length * 52 + 16

  // ── Divider ─────────────────────────────────────────────
  ctx.strokeStyle = BORDER
  ctx.lineWidth   = 1
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 24

  // ── Notes ───────────────────────────────────────────────
  if (opts.notes) {
    ctx.textAlign = 'left'
    ctx.fillStyle = MUTED
    ctx.font      = `10px ${FONT}`
    ctx.fillText('NOTES', PAD, y)
    ctx.fillStyle = SLATE
    ctx.font      = `13px ${FONT}`
    const nextY = wrapText(ctx, opts.notes, PAD, y + 18, CW, 20)
    y = nextY + 28

    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth   = 0.5
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
    y += 24
  }

  // ── Footer ───────────────────────────────────────────────
  // Light bottom strip
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, y, W, H - y)

  ctx.textAlign = 'center'
  ctx.fillStyle = MUTED
  ctx.font      = `11px ${FONT}`
  const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  ctx.fillText(`Generated by EBOS · Ease Builders Site Manager`, W / 2, y + 22)
  ctx.fillStyle = '#cbd5e1'
  ctx.font      = `10px ${FONT}`
  ctx.fillText(dateStr, W / 2, y + 38)

  // Export at actual pixel size (2x)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png', 1.0)
  })
}

// ── Share helper ──────────────────────────────────────────────
export async function shareOrDownload(blob: Blob, filename: string, title: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title })
  } else {
    // Fallback: trigger download
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }
}
