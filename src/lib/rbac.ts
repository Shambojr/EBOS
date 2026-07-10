import type { UserRole } from '../types'
export const ROLE_ACCESS = {
  director: {
    projects: true, expenses: true, materials: true, boq: true,
    documents: true, photos: true, milestones: true, logs: true,
    userManagement: true, activityLog: true, notifications: true,
    directorOffice: true, finance: true, workspace: true,
  },
  accountant: {
    projects: true, expenses: true, materials: false, boq: true,
    documents: true, photos: false, milestones: false, logs: false,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: true, workspace: true,
  },
  site_engineer: {
    projects: true, expenses: false, materials: true, boq: true,
    documents: true, photos: true, milestones: true, logs: true,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: false, workspace: true,
  },
  supervisor: {
    projects: true, expenses: false, materials: true, boq: true,
    documents: true, photos: true, milestones: true, logs: true,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: false, workspace: true,
  },
  office_staff: {
    projects: true, expenses: false, materials: false, boq: false,
    documents: true, photos: true, milestones: false, logs: true,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: false, workspace: true,
  },
} as const
export type AccessKey = keyof typeof ROLE_ACCESS.director
export function can(role: UserRole, action: AccessKey): boolean {
  return ROLE_ACCESS[role]?.[action] ?? false
}
export function roleLabel(role: UserRole): string {
  return {
    director: 'Director',
    accountant: 'Accountant',
    site_engineer: 'Site Engineer',
    supervisor: 'Supervisor',
    office_staff: 'Office Staff',
  }[role] ?? role
}
export const NAV_TABS: Record<UserRole, Array<{ key: string; label: string }>> = {
  director: [
    { key: 'home',      label: 'Home' },
    { key: 'projects',  label: 'Projects' },
    { key: 'workspace', label: 'Work' },
    { key: 'finance',   label: 'Finance' },
    { key: 'more',      label: 'More' },
  ],
  accountant: [
    { key: 'home',      label: 'Home' },
    { key: 'finance',   label: 'Finance' },
    { key: 'projects',  label: 'Projects' },
    { key: 'workspace', label: 'Work' },
    { key: 'more',      label: 'More' },
  ],
  site_engineer: [
    { key: 'home',      label: 'Home' },
    { key: 'projects',  label: 'Projects' },
    { key: 'workspace', label: 'Work' },
    { key: 'more',      label: 'More' },
  ],
  supervisor: [
    { key: 'home',      label: 'Home' },
    { key: 'projects',  label: 'Projects' },
    { key: 'workspace', label: 'Work' },
    { key: 'more',      label: 'More' },
  ],
  office_staff: [
    { key: 'home',      label: 'Home' },
    { key: 'projects',  label: 'Projects' },
    { key: 'workspace', label: 'Work' },
    { key: 'more',      label: 'More' },
  ],
}
export const PROJECT_TABS: Record<UserRole, string[]> = {
  director:      ['overview','stages','milestones','logs','materials','expenses','boq','jms','documents','photos'],
  accountant:    ['overview','expenses','boq','documents'],
  site_engineer: ['overview','stages','milestones','logs','materials','boq','jms','documents','photos'],
  supervisor:    ['overview','stages','milestones','logs','materials','boq','jms','documents','photos'],
  office_staff:  ['overview','logs','documents','photos'],
}
export const ROLE_LABELS: Record<UserRole, string> = {
  director: 'Director',
  accountant: 'Accountant',
  site_engineer: 'Site Engineer',
  supervisor: 'Supervisor',
  office_staff: 'Office Staff',
}
export const ASSIGNABLE_ROLES: UserRole[] = [
  'director', 'accountant', 'site_engineer', 'supervisor', 'office_staff'
]
