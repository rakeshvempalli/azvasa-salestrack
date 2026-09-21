export type UserRole = 'super_admin' | 'sales_manager' | 'sales_rep';

export type RepStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  password?: string;
  full_name: string;
  phone: string;
  employee_id: string;
  designation: string;
  role: UserRole;
  status: RepStatus;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  display_order: number;
  active: boolean;
  color?: string;
  is_won?: boolean;
  is_lost?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type LeadSource = 'Direct' | 'Channel Partner' | 'TCE';

export type ProductType = 
  | 'FOFO' 
  | 'ASP' 
  | 'INTELLIREAD' 
  | 'TEACHER UPSKILL' 
  | 'LMS & Books' 
  | 'Others';

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
] as const;

export type IndianStateOrUT = typeof INDIAN_STATES_AND_UTS[number];

export interface Lead {
  id: string;
  school_name: string;
  location: string;
  state?: string;
  poc_name: string;
  poc_designation: string;
  poc_contact: string;
  lead_source: LeadSource;
  channel_partner_name?: string;
  product: ProductType;
  other_product?: string;
  assigned_rep_id?: string;
  assigned_rep_name?: string;
  current_stage_id: string;
  current_stage_name?: string;
  last_interaction_date?: string;
  next_action_date?: string;
  next_action_remarks?: string;
  created_at: string;
  updated_at: string;
}

export type InteractionType =
  | 'Call'
  | 'WhatsApp'
  | 'Email'
  | 'Meeting'
  | 'Visit'
  | 'Demo'
  | 'Proposal Discussion'
  | 'Documentation'
  | 'Agreement Discussion'
  | 'Other';

export interface Interaction {
  id: string;
  lead_id: string;
  interaction_date: string;
  interaction_type: InteractionType;
  follow_up_remarks: string;
  next_action_date?: string;
  next_action_remarks?: string;
  next_action_type?: string;
  attachment_url?: string;
  created_by_id: string;
  created_by_name: string;
  contact_person?: string;
  discussion_summary?: string;
  attachment_name?: string;
  stage_at_interaction?: string;
  created_at: string;
}

export interface StageHistory {
  id: string;
  lead_id: string;
  from_stage_name: string;
  to_stage_name: string;
  changed_by_id: string;
  changed_by_name: string;
  remarks?: string;
  notes?: string;
  created_at: string;
  changed_at?: string;
}

export type PipelineHistory = StageHistory;

export interface InternalNote {
  id: string;
  lead_id: string;
  created_by_id: string;
  created_by_name: string;
  content: string;
  created_at: string;
}

export interface FollowupTask {
  id: string;
  lead_id: string;
  assigned_to_id: string;
  assigned_to_name: string;
  title: string;
  due_date: string;
  status: 'Pending' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
}

export type NotificationType = 
  | 'due_today' 
  | 'upcoming' 
  | 'overdue' 
  | 'new_assignment' 
  | 'stage_changed'
  | 'followup_today'
  | 'followup_overdue'
  | 'lead_assigned'
  | 'lead_reassigned'
  | 'stage_updated';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  lead_id?: string;
  school_name?: string;
  read: boolean;
  created_at: string;
}

export type Notification = AppNotification;

export interface ReminderLog {
  id: string;
  lead_id: string;
  school_name: string;
  poc_name: string;
  poc_designation: string;
  poc_contact: string;
  product: string;
  current_stage: string;
  rep_id: string;
  rep_name: string;
  rep_email: string;
  recipient_email?: string;
  next_action_date: string;
  scheduled_date?: string;
  latest_remarks: string;
  sent_at: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  action: string;
  record_type?: string;
  record_id?: string;
  record_title?: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
  previous_value?: string;
  new_value?: string;
  timestamp: string;
}

export interface KPIData {
  totalLeads: number;
  activeLeads: number;
  followupsToday?: number;
  upcomingFollowups?: number;
  overdueFollowups?: number;
  followupsOverdue?: number;
  conversionRate?: number;
  visits?: number;
  visitsCount?: number;
  demos?: number;
  demosCount?: number;
  proposals?: number;
  proposalsCount?: number;
  agreements?: number;
  agreementsCount?: number;
  salesRepsCount?: number;
}

export type DashboardMetrics = KPIData;
