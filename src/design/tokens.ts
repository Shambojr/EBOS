// ════════════════════════════════════════════════════════════
// EBOS Design System — Tokens
// Single source of truth for all visual decisions.
// Import from here; never hard-code values in components.
// ════════════════════════════════════════════════════════════

// ── Color Primitives (raw palette — do not use directly) ────
const _palette = {
  navy50:  '#e8edf2',
  navy100: '#c5d0dc',
  navy200: '#9eb0c3',
  navy300: '#7790aa',
  navy400: '#567891',
  navy500: '#1e3a4a',
  navy600: '#1a3341',
  navy700: '#142635',
  navy800: '#0f1f2a',
  navy900: '#0a1520',

  gold50:  '#fdf6e7',
  gold100: '#fae8c0',
  gold200: '#f7d897',
  gold300: '#f4c86e',
  gold400: '#f1bb4f',
  gold500: '#c9943a',
  gold600: '#b5842e',
  gold700: '#9a7025',

  green50:  '#f0fdf9',
  green500: '#0d9488',
  green600: '#0b8578',
  green700: '#097068',

  amber50:  '#fffbeb',
  amber500: '#d97706',
  amber600: '#c56b05',

  red50:  '#fef2f2',
  red500: '#dc2626',
  red600: '#c41f1f',

  blue50:  '#eff6ff',
  blue500: '#1e40af',
  blue600: '#1a369a',

  teal50:  '#f0f9ff',
  teal500: '#0891b2',

  neutral0:   '#ffffff',
  neutral50:  '#f7f8fa',
  neutral100: '#f0f2f5',
  neutral200: '#e4e8ee',
  neutral300: '#d0d6e0',
  neutral400: '#9aa5b4',
  neutral500: '#6b7a8d',
  neutral600: '#4a5568',
  neutral700: '#2d3748',
  neutral800: '#1a202c',
  neutral900: '#0f141a',
}

// ── Semantic Colors ──────────────────────────────────────────
export const colors = {
  // Brand
  brand:        _palette.navy500,
  brandLight:   _palette.navy400,
  brandDark:    _palette.navy700,
  gold:         _palette.gold500,
  goldLight:    _palette.gold50,

  // Backgrounds
  bgApp:        _palette.neutral50,
  bgSurface:    _palette.neutral0,
  bgSurfaceEl:  _palette.neutral100,
  bgMuted:      _palette.neutral100,
  bgOverlay:    'rgba(15,31,42,.52)',

  // Borders
  border:       _palette.neutral200,
  borderStrong: _palette.neutral300,
  divider:      _palette.neutral100,

  // Text
  textPrimary:   _palette.navy800,
  textSecondary: _palette.neutral500,
  textTertiary:  _palette.neutral400,
  textInverse:   _palette.neutral0,
  textBrand:     _palette.navy500,
  textGold:      _palette.gold500,

  // Status
  success:      _palette.green500,
  successBg:    _palette.green50,
  warning:      _palette.amber500,
  warningBg:    _palette.amber50,
  danger:       _palette.red500,
  dangerBg:     _palette.red50,
  info:         _palette.blue500,
  infoBg:       _palette.blue50,
  teal:         _palette.teal500,
  tealBg:       _palette.teal50,

  // Interactive states
  primaryBtnBg:       _palette.navy500,
  primaryBtnBgHover:  _palette.navy600,
  primaryBtnText:     _palette.neutral0,
  secondaryBtnBg:     _palette.neutral0,
  secondaryBtnText:   _palette.navy500,
  dangerBtnBg:        _palette.red50,
  dangerBtnText:      _palette.red500,
  ghostBtnText:       _palette.neutral500,
  disabledBg:         _palette.neutral200,
  disabledText:       _palette.neutral400,
}

// ── Spacing (8-point system) ─────────────────────────────────
export const space = {
  0:  '0px',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
} as const

// ── Border Radius ────────────────────────────────────────────
export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '18px',
  xxl:  '24px',
  pill: '999px',
} as const

// ── Shadows ──────────────────────────────────────────────────
export const shadow = {
  none:     'none',
  xs:       '0 1px 2px rgba(15,31,42,.04)',
  sm:       '0 2px 8px rgba(15,31,42,.08), 0 1px 3px rgba(15,31,42,.05)',
  md:       '0 4px 6px rgba(15,31,42,.05), 0 2px 4px rgba(15,31,42,.04)',
  lg:       '0 10px 15px rgba(15,31,42,.06), 0 4px 6px rgba(15,31,42,.04)',
  xl:       '0 20px 25px rgba(15,31,42,.07), 0 10px 10px rgba(15,31,42,.04)',
  fab:      '0 4px 16px rgba(30,58,74,.30)',
  modal:    '0 24px 40px rgba(15,31,42,.16)',
  hero:     '0 8px 24px rgba(15,31,42,.12), 0 4px 8px rgba(15,31,42,.06)',
} as const

// ── Typography ───────────────────────────────────────────────
export const type = {
  // Font families
  sans: "'Inter', system-ui, -apple-system, sans-serif",

  // Font sizes
  sizeXs:   '11px',
  sizeSm:   '12px',
  sizeMd:   '13px',
  sizeLg:   '14px',
  sizeXl:   '15px',
  size2xl:  '17px',
  size3xl:  '20px',
  size4xl:  '24px',
  size5xl:  '28px',
  size6xl:  '34px',

  // Font weights
  weightNormal:   400,
  weightMedium:   500,
  weightSemibold: 600,
  weightBold:     700,
  weightBlack:    800,

  // Line heights
  lineSnug:    1.25,
  lineNormal:  1.5,
  lineRelaxed: 1.6,
  lineTall:    1.75,

  // Letter spacing
  trackingTight:  '-0.025em',
  trackingNormal: '0',
  trackingWide:   '0.04em',
  trackingWidest: '0.08em',
} as const

// ── Typography Presets ───────────────────────────────────────
// Use these instead of composing individual tokens manually
export const text = {
  display:     { fontSize: type.size5xl,  fontWeight: type.weightBlack,    lineHeight: type.lineSnug,    letterSpacing: type.trackingTight  },
  pageTitle:   { fontSize: type.size4xl,  fontWeight: type.weightBlack,    lineHeight: type.lineSnug,    letterSpacing: type.trackingTight  },
  sectionTitle:{ fontSize: type.size2xl,  fontWeight: type.weightBold,     lineHeight: type.lineSnug,    letterSpacing: '-0.01em'           },
  cardTitle:   { fontSize: type.sizeLg,   fontWeight: type.weightSemibold, lineHeight: type.lineNormal                                      },
  metricLarge: { fontSize: type.size6xl,  fontWeight: type.weightBlack,    lineHeight: 1,                letterSpacing: type.trackingTight  },
  metricMed:   { fontSize: type.size3xl,  fontWeight: type.weightBlack,    lineHeight: 1,                letterSpacing: type.trackingTight  },
  body:        { fontSize: type.sizeLg,   fontWeight: type.weightNormal,   lineHeight: type.lineRelaxed                                     },
  bodySm:      { fontSize: type.sizeMd,   fontWeight: type.weightNormal,   lineHeight: type.lineRelaxed                                     },
  caption:     { fontSize: type.sizeSm,   fontWeight: type.weightNormal,   lineHeight: type.lineNormal                                      },
  label:       { fontSize: type.sizeSm,   fontWeight: type.weightSemibold, letterSpacing: type.trackingWide, textTransform: 'uppercase' as const },
  labelXs:     { fontSize: type.sizeXs,   fontWeight: type.weightSemibold, letterSpacing: type.trackingWidest, textTransform: 'uppercase' as const },
  button:      { fontSize: type.sizeLg,   fontWeight: type.weightSemibold, letterSpacing: '-0.01em'                                        },
  buttonSm:    { fontSize: type.sizeMd,   fontWeight: type.weightSemibold                                                                   },
  input:       { fontSize: type.sizeXl,   fontWeight: type.weightNormal,   lineHeight: type.lineNormal                                      },
  number:      { fontSize: type.sizeLg,   fontWeight: type.weightBold,     letterSpacing: type.trackingTight, fontVariantNumeric: 'tabular-nums' as const },
} as const

// ── Z-index ──────────────────────────────────────────────────
export const z = {
  base:   0,
  raised: 10,
  sticky: 20,
  header: 30,
  modal:  100,
  toast:  200,
} as const

// ── Transitions ──────────────────────────────────────────────
export const motion = {
  fast:    '120ms ease-out',
  normal:  '200ms ease-out',
  slow:    '300ms ease-out',
  spring:  '240ms cubic-bezier(.34,1.56,.64,1)',
  smooth:  '220ms cubic-bezier(.4,0,.2,1)',
} as const

// ── Icon sizes ───────────────────────────────────────────────
export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const

// ── Component dimension tokens ───────────────────────────────
export const size = {
  touchTarget:  '44px',
  inputHeight:  '48px',
  inputHeightSm:'40px',
  btnHeight:    '44px',
  btnHeightSm:  '36px',
  topbar:       '52px',
  bottomNav:    '60px',
  avatarSm:     '32px',
  avatarMd:     '40px',
  fabSize:      '52px',
} as const

// ── Shorthand composite tokens (for inline styles) ───────────
// These match what components actually need
export const T = {
  // Surfaces
  card: {
    background:   colors.bgSurface,
    border:       `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    boxShadow:    shadow.sm,
    overflow:     'hidden' as const,
  },
  cardFlush: {
    background:   colors.bgSurface,
    borderRadius: radius.lg,
    boxShadow:    shadow.sm,
    overflow:     'hidden' as const,
  },
  heroCard: {
    background:     `linear-gradient(135deg, ${colors.brand} 0%, ${colors.brandLight} 100%)`,
    borderRadius:   radius.xxl,
    padding:        space[6],
    boxShadow:      shadow.hero,
    position:       'relative' as const,
    overflow:       'hidden' as const,
    color:          colors.textInverse,
  },

  // Form elements
  field: {
    width:        '100%',
    padding:      `${space[3]} ${space[4]}`,
    border:       `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize:     type.sizeXl,
    color:        colors.textPrimary,
    background:   colors.bgSurface,
    outline:      'none',
    fontFamily:   "'Inter', system-ui, sans-serif",
    boxSizing:    'border-box' as const,
    transition:   `border-color ${motion.fast}`,
  },
  fieldLabel: {
    display:        'block' as const,
    fontSize:       type.sizeSm,
    fontWeight:     type.weightSemibold,
    color:          colors.textSecondary,
    letterSpacing:  type.trackingWide,
    textTransform:  'uppercase' as const,
    marginBottom:   space[1],
  },

  // Buttons
  btnPrimary: {
    padding:       `0 ${space[4]}`,
    height:        size.btnHeight,
    background:    colors.primaryBtnBg,
    color:         colors.primaryBtnText,
    border:        'none',
    borderRadius:  radius.md,
    fontSize:      type.sizeLg,
    fontWeight:    type.weightSemibold,
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    display:       'inline-flex' as const,
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    gap:           space[2],
    boxShadow:     shadow.sm,
    transition:    `background ${motion.fast}, box-shadow ${motion.fast}`,
    letterSpacing: '-0.01em',
    whiteSpace:    'nowrap' as const,
  },
  btnSecondary: {
    padding:       `0 ${space[4]}`,
    height:        size.btnHeight,
    background:    colors.bgSurface,
    color:         colors.brand,
    border:        `1.5px solid ${colors.border}`,
    borderRadius:  radius.md,
    fontSize:      type.sizeLg,
    fontWeight:    type.weightSemibold,
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    display:       'inline-flex' as const,
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    gap:           space[2],
    transition:    `background ${motion.fast}, border-color ${motion.fast}`,
    letterSpacing: '-0.01em',
    whiteSpace:    'nowrap' as const,
  },
  btnDanger: {
    padding:       `0 ${space[3]}`,
    height:        size.btnHeightSm,
    background:    colors.dangerBg,
    color:         colors.danger,
    border:        'none',
    borderRadius:  radius.md,
    fontSize:      type.sizeMd,
    fontWeight:    type.weightSemibold,
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    display:       'inline-flex' as const,
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    gap:           space[1],
    transition:    `background ${motion.fast}`,
    whiteSpace:    'nowrap' as const,
  },
  btnGhost: {
    padding:       `0 ${space[3]}`,
    height:        size.btnHeightSm,
    background:    'transparent',
    color:         colors.textSecondary,
    border:        'none',
    borderRadius:  radius.md,
    fontSize:      type.sizeMd,
    fontWeight:    type.weightSemibold,
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    display:       'inline-flex' as const,
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    gap:           space[1],
    transition:    `background ${motion.fast}`,
    whiteSpace:    'nowrap' as const,
  },
  btnOutline: {
    padding:       `0 ${space[3]}`,
    height:        size.btnHeightSm,
    background:    'transparent',
    color:         colors.brand,
    border:        `1.5px solid ${colors.border}`,
    borderRadius:  radius.md,
    fontSize:      type.sizeMd,
    fontWeight:    type.weightSemibold,
    cursor:        'pointer',
    fontFamily:    "'Inter', system-ui, sans-serif",
    display:       'inline-flex' as const,
    alignItems:    'center' as const,
    justifyContent:'center' as const,
    gap:           space[1],
    transition:    `background ${motion.fast}, border-color ${motion.fast}`,
    whiteSpace:    'nowrap' as const,
  },

  // Gold rule — brand signature
  goldRule: {
    width:        space[8],
    height:       '3px',
    background:   colors.gold,
    borderRadius: radius.pill,
    marginTop:    space[2],
  },

  // Global font
  font: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize:   type.sizeLg,
    color:      colors.textPrimary,
  },
} as const
