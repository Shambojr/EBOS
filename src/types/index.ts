// ─────────────────────────────────────────────────────────────
// Ease Builders v4 — TypeScript Types
// ─────────────────────────────────────────────────────────────

export type UserRole = 'director' | 'accountant' | 'site_engineer' | 'supervisor' | 'office_staff'
export type ProjectStatus = 'Active' | 'On Hold' | 'Completed'
export type MilestonePriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type MaterialStatus = 'Pending' | 'Ordered' | 'In Transit' | 'Delivered' | 'Partially Delivered' | 'Delayed' | 'Cancelled'
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial'
export type DocApproval = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Superseded'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
  last_seen?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  client?: string
  location?: string
  type?: string
  status: ProjectStatus
  stage?: string
  progress: number
  budget?: number
  start_date?: string
  end_date?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  total_spent?: number
  members?: ProjectMember[]
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_on_project?: string
  added_at: string
  user?: User
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  due_date?: string
  actual_date?: string
  priority: MilestonePriority
  assignee_id?: string
  pct: number
  done: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  assignee?: User
}

export interface DailyLog {
  id: string
  project_id: string
  log_date: string
  logged_by: string
  achievements?: string
  site_update: string
  weather?: string
  contractor?: string
  day_progress?: number
  issues?: string
  next_plan?: string
  client_visit: boolean
  safety_issues: boolean
  materials_received?: string
  equipment_used?: string
  labour: Record<string, number>
  created_at: string
  updated_at: string
  logger?: User
}

export interface Material {
  id: string
  project_id: string
  name: string
  spec?: string
  qty_ordered?: number
  qty_received: number
  unit?: string
  rate?: number
  supplier?: string
  vendor_contact?: string
  po_number?: string
  invoice_number?: string
  delivery_eta?: string
  storage_location?: string
  warranty?: string
  status: MaterialStatus
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Expense {
  id: string
  project_id: string
  description: string
  amount: number
  gst_amount: number
  expense_date: string
  category: string
  paid_by?: string
  vendor?: string
  bill_ref?: string
  payment_status: PaymentStatus
  created_by?: string
  created_at: string
  updated_at: string
  payer?: User
}

export interface BOQItem {
  id: string
  project_id: string
  item_number?: number
  description: string
  spec?: string
  unit?: string
  qty?: number
  rate?: number
  amount?: number
  exec_qty: number
  exec_value?: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  project_id: string
  name: string
  doc_number?: string
  revision?: string
  type: string
  approval_status: DocApproval
  storage_path?: string
  external_url?: string
  notes?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
  public_url?: string
  uploader?: User
}

export interface Photo {
  id: string
  project_id: string
  storage_path: string
  name?: string
  category: string
  photo_date: string
  uploaded_by?: string
  created_at: string
  public_url?: string
  uploader?: User
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  project_id?: string
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  user_name?: string
  user_role?: string
  action: string
  entity_type?: string
  entity_id?: string
  project_id?: string
  details: Record<string, unknown>
  device?: string
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: User
}

export interface AppState {
  user: AuthUser | null
  loading: boolean
}
