import { UserProfile, PipelineStage, Lead, Interaction, StageHistory, AuditLog, AppNotification, ReminderLog } from '../types';

export const INITIAL_STAGES: PipelineStage[] = [
  {
    id: 'stage-1',
    name: 'Lead',
    description: 'Initial school prospect identified or inquired',
    display_order: 1,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-2',
    name: 'Followup',
    description: 'Preliminary engagement and qualification call',
    display_order: 2,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-3',
    name: 'Visit',
    description: 'In-person physical school campus visit conducted or scheduled',
    display_order: 3,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-4',
    name: 'Demo Stage',
    description: 'Product demonstration presentation for school management / academic coordinator',
    display_order: 4,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-5',
    name: 'Proposal Shared',
    description: 'Commercial proposal and academic syllabus model submitted',
    display_order: 5,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-6',
    name: 'Docs Collected',
    description: 'School registration documents, KYC and board approval letters gathered',
    display_order: 6,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-7',
    name: 'Agreement Stage',
    description: 'Final agreement signing and onboarding preparation',
    display_order: 7,
    active: true,
    is_won: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'stage-8',
    name: 'Not Interested',
    description: 'School opted out, budget constraints, or closed/lost',
    display_order: 8,
    active: true,
    is_lost: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

// Super Admin initialized as vempallirakhi20@gmail.com with fixed credentials
export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user-super-admin-rakhi',
    email: 'vempallirakhi20@gmail.com',
    username: 'rakhi',
    password: 'Password@123',
    full_name: 'Rakhi Vempalli (Super Admin)',
    phone: '+91 98450 99999',
    employee_id: 'AZ-HQ-001',
    designation: 'Managing Director & Super Admin',
    role: 'super_admin',
    status: 'active',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  }
];

// Clean state: all dummy data removed
export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_INTERACTIONS: Interaction[] = [];

export const INITIAL_STAGE_HISTORY: StageHistory[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    user_id: 'user-super-admin-rakhi',
    type: 'new_assignment',
    title: 'Welcome to AZVASA SalesTrack',
    message: 'System is initialized. You can now add your team members (Super Admin, Sales Manager, Sales Representatives) and start logging school leads.',
    read: false,
    created_at: new Date().toISOString()
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-001',
    user_id: 'user-super-admin-rakhi',
    user_name: 'Rakhi Vempalli',
    user_role: 'Super Admin',
    action: 'System Initialized',
    record_type: 'System',
    record_id: 'sys-01',
    record_title: 'AZVASA SalesTrack CRM',
    previous_value: undefined,
    new_value: 'Super Admin: vempallirakhi20@gmail.com',
    timestamp: new Date().toISOString()
  }
];

export const INITIAL_REMINDER_LOGS: ReminderLog[] = [];
