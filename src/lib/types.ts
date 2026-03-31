export type IssueType = 'guest_request' | 'maintenance' | 'cleaner'
export type Priority = 'on_fire' | 'urgent' | 'watch'
export type IssueStatus = 'in_progress' | 'stuck' | 'resolved'
export type Reimbursable = 'none' | 'guest_owes' | 'landlord_owes' | 'haven_owes'

export interface Profile {
  id: string
  name: string
  initials: string
  role: string | null
  created_at: string
}

export interface Property {
  id: string
  name: string
  market: string
  address: string | null
  color_tag: string
  active: boolean
  created_at: string
}

export interface Issue {
  id: string
  property_id: string
  title: string
  description: string | null
  type: IssueType
  priority: Priority
  status: IssueStatus
  slack_note: string | null
  slack_note_updated_at: string | null
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string
  resolved_at: string | null
  // Joined relations
  property?: Property
  creator?: Profile
  updater?: Profile
}

export interface ActivityLogEntry {
  id: string
  issue_id: string
  user_id: string
  note: string
  status_from: string | null
  status_to: string | null
  created_at: string
  // Joined
  user?: Profile
}

export interface CostEntry {
  id: string
  issue_id: string
  logged_by: string
  amount: number
  vendor_name: string | null
  description: string
  receipt_url: string | null
  reimbursable: Reimbursable
  reimbursable_from: string | null
  date: string
  created_at: string
  // Joined
  logger?: Profile
  issue?: Issue & { property?: Property }
}

// Display helpers
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  guest_request: 'Guest Request',
  maintenance: 'Maintenance',
  cleaner: 'Cleaner',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  on_fire: 'On Fire',
  urgent: 'Important',
  watch: 'Upcoming',
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  in_progress: 'In Progress',
  stuck:       'Stuck',
  resolved:    'Resolved',
}

export const REIMBURSABLE_LABELS: Record<Reimbursable, string> = {
  none: 'None',
  guest_owes: 'Guest Owes',
  landlord_owes: 'Landlord Owes',
  haven_owes: 'Haven Owes',
}

// ── Workflow Templates ────────────────────────────────────────────────────────

export interface WorkflowTemplateStep {
  id: string
  label: string
  order: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  steps: WorkflowTemplateStep[]
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Checklist Items ───────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string
  issue_id: string
  label: string
  order_index: number
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  created_at: string
  // Joined
  completer?: Profile
}
