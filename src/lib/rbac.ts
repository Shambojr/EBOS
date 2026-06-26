import type { UserRole } from '../types'

export const ROLE_ACCESS = {
  director: {
    projects: true, expenses: true, materials: true, boq: true,
    documents: true, photos: true, milestones: true, logs: true,
    userManagement: true, activityLog: true, notifications: true,
    directorOffice: true, finance: true,
  },
  accountant: {
    projects: true, expenses: true, materials: false, boq: true,
    documents: true, photos: false, milestones: false, logs: false,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: true,
  },
  site_engineer: {
    projects: true, expenses: false, materials: true, boq: true,
    documents: true, photos: true, milestones: true, logs: true,
    userManagement: false, activityLog: false, notifications: true,
    directorOffice: false, finance: false,
  },
} as const

export type AccessKey = keyof typeof ROLE_ACCESS.director

export function can(role: UserRole, action: AccessKey): boolean {
  return ROLE_ACCESS[role]?.[action] ?? false
}

export function roleLabel(role: UserRole): string {
  return { director: 'Director', accountant: 'Accountant', site_engineer: 'Site Engineer' }[role]
}

export const NAV_TABS: Record<UserRole, Array<{ key: string; label: string }>> = {
  director: [
    { key: 'home',     label: 'Home' },
    { key: 'projects', label: 'Projects' },
    { key: 'logs',     label: 'Logs' },
    { key: 'finance',  label: 'Finance' },
    { key: 'more',     label: 'More' },
  ],
  accountant: [
    { key: 'home',     label: 'Home' },
    { key: 'projects', label: 'Projects' },
    { key: 'finance',  label: 'Finance' },
    { key: 'more',     label: 'More' },
  ],
  site_engineer: [
    { key: 'home',     label: 'Home' },
    { key: 'projects', label: 'Projects' },
    { key: 'logs',     label: 'Logs' },
    { key: 'more',     label: 'More' },
  ],
}

export const PROJECT_TABS: Record<UserRole, string[]> = {
  director:      ['overview','stages','milestones','logs','materials','expenses','boq','documents','photos'],
  accountant:    ['overview','expenses','boq','documents'],
  site_engineer: ['overview','stages','milestones','logs','materials','boq','documents','photos'],
}
