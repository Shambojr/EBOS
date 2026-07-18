// ════════════════════════════════════════════════════════════
// EBOS Icon System — Heroicons 24px Outline (exclusive)
// Single source of truth for all icons.
// Import from here only. Never import directly from @heroicons/react.
// ════════════════════════════════════════════════════════════
import React from 'react'
import {
  // Navigation
  HomeIcon,
  BuildingOffice2Icon,
  CheckIcon,
  EllipsisHorizontalIcon,
  CurrencyRupeeIcon,

  // Project tabs
  ClipboardDocumentListIcon,
  FlagIcon,
  CubeIcon,
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,

  // Stage icons
  ClipboardIcon,
  PencilSquareIcon,
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  BuildingLibraryIcon,
  CircleStackIcon,
  CubeTransparentIcon,
  BoltIcon,
  WrenchIcon,
  PaintBrushIcon,
  BeakerIcon,
  Cog6ToothIcon,

  // Document icons
  DocumentCheckIcon,
  ReceiptPercentIcon,
  CheckBadgeIcon,
  FolderIcon,

  // Log chips
  CloudIcon,
  UsersIcon,
  UserIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,

  // Material chips
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  TagIcon,

  // Finance
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  ClockIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PaperClipIcon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,

  // Actions
  CameraIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,

  // Alerts
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  BellAlertIcon,

  // People
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  UserPlusIcon,

  // Navigation
  ChevronRightIcon,
  ChevronLeftIcon,
  MapPinIcon,

  // Messaging
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

// Re-export everything
export {
  HomeIcon, BuildingOffice2Icon, CheckIcon, EllipsisHorizontalIcon, CurrencyRupeeIcon,
  ClipboardDocumentListIcon, FlagIcon, CubeIcon, DocumentTextIcon, PhotoIcon, TableCellsIcon,
  ClipboardIcon, PencilSquareIcon, ShoppingCartIcon, WrenchScrewdriverIcon, BuildingLibraryIcon,
  CircleStackIcon, CubeTransparentIcon, BoltIcon, WrenchIcon, PaintBrushIcon, BeakerIcon, Cog6ToothIcon,
  DocumentCheckIcon, ReceiptPercentIcon, CheckBadgeIcon, FolderIcon,
  CloudIcon, UsersIcon, UserIcon, ShieldExclamationIcon, ExclamationTriangleIcon,
  BuildingStorefrontIcon, CalendarDaysIcon, TagIcon,
  BanknotesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, BookOpenIcon,
  ChartBarIcon, ChartBarSquareIcon, ClockIcon, KeyIcon, EyeIcon, EyeSlashIcon,
  PaperClipIcon, ArrowTrendingUpIcon, ArrowsRightLeftIcon,
  CameraIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  ArrowTopRightOnSquareIcon, ClipboardDocumentCheckIcon, MagnifyingGlassIcon,
  InformationCircleIcon, CheckCircleIcon, XCircleIcon, BellIcon, BellAlertIcon,
  UserCircleIcon, ArrowRightOnRectangleIcon, UserPlusIcon,
  ChevronRightIcon, ChevronLeftIcon, MapPinIcon,
  ChatBubbleLeftRightIcon, PaperAirplaneIcon,
}

// ── Ico helper — consistent sizing ────────────────────────────
// size: 16=inline meta, 20=buttons/chips, 24=nav/headers, 32-40=empty states
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>
interface IcoProps { icon: IconComponent; size?: number; color?: string; style?: React.CSSProperties }

export function Ico({ icon: I, size = 20, color, style }: IcoProps) {
  return <I style={{ width: size, height: size, display: 'block', flexShrink: 0, color: color ?? 'currentColor', ...style }}/>
}

// ── Stage → Icon map ──────────────────────────────────────────
export const STAGE_ICON_MAP: Record<string, IconComponent> = {
  'Tender':        ClipboardIcon,
  'Planning':      PencilSquareIcon,
  'Procurement':   ShoppingCartIcon,
  'Site Prep':     WrenchScrewdriverIcon,
  'Foundation':    BuildingLibraryIcon,
  'Civil Works':   CubeIcon,
  'MGPS':          CircleStackIcon,
  'HVAC':          CubeTransparentIcon,
  'Electrical':    BoltIcon,
  'Plumbing':      WrenchIcon,
  'Finishing':     PaintBrushIcon,
  'Testing':       BeakerIcon,
  'Commissioning': Cog6ToothIcon,
  'Handover':      FlagIcon,
}

// ── Document type → Icon map ──────────────────────────────────
export const DOC_ICON_MAP: Record<string, IconComponent> = {
  'Drawing':     PencilSquareIcon,
  'BOQ':         TableCellsIcon,
  'Certificate': DocumentCheckIcon,
  'Contract':    DocumentTextIcon,
  'Report':      ClipboardDocumentListIcon,
  'Invoice':     ReceiptPercentIcon,
  'Photo':       PhotoIcon,
  'Approval':    CheckBadgeIcon,
  'Other':       FolderIcon,
}

// ── Vault module → Icon map ───────────────────────────────────
export const VAULT_ICON_MAP: Record<string, IconComponent> = {
  'dashboard':     HomeIcon,
  'funding':       BanknotesIcon,
  'receivables':   ArrowDownTrayIcon,
  'payables':      ArrowUpTrayIcon,
  'cashbook':      BookOpenIcon,
  'banks':         BuildingLibraryIcon,
  'forecast':      ChartBarSquareIcon,
  'profitability': ChartBarIcon,
  'timeline':      ClockIcon,
  'credentials':   KeyIcon,
}
