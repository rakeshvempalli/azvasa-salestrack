import { 
  UserProfile, 
  PipelineStage, 
  Lead, 
  Interaction, 
  StageHistory, 
  AppNotification, 
  AuditLog, 
  ReminderLog,
  InternalNote,
  FollowupTask
} from '../types';
import { 
  INITIAL_PROFILES, 
  INITIAL_STAGES, 
  INITIAL_LEADS, 
  INITIAL_INTERACTIONS, 
  INITIAL_STAGE_HISTORY, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_REMINDER_LOGS 
} from '../data/seedData';
import { 
  DEFAULT_SUPER_ADMIN, 
  fetchUsersFromDatabase, 
  saveUserToDatabase, 
  deleteUserFromDatabase, 
  subscribeToDatabaseUsers,
  fetchStagesFromDatabase,
  saveStageToDatabase,
  deleteStageFromDatabase,
  subscribeToDatabaseStages,
  fetchLeadsFromDatabase,
  saveLeadToDatabase,
  deleteLeadFromDatabase,
  subscribeToDatabaseLeads,
  fetchInteractionsFromDatabase,
  saveInteractionToDatabase,
  deleteInteractionFromDatabase,
  subscribeToDatabaseInteractions,
  fetchStageHistoryFromDatabase,
  saveStageHistoryToDatabase,
  subscribeToDatabaseStageHistory,
  fetchNotesFromDatabase,
  saveNoteToDatabase,
  deleteNoteFromDatabase,
  subscribeToDatabaseNotes,
  fetchTasksFromDatabase,
  saveTaskToDatabase,
  deleteTaskFromDatabase,
  subscribeToDatabaseTasks,
  fetchNotificationsFromDatabase,
  saveNotificationToDatabase,
  deleteNotificationFromDatabase,
  subscribeToDatabaseNotifications,
  fetchAuditLogsFromDatabase,
  saveAuditLogToDatabase,
  subscribeToDatabaseAuditLogs,
  fetchReminderLogsFromDatabase,
  saveReminderLogToDatabase,
  subscribeToDatabaseReminderLogs
} from './firebase';

// ============================================================================
// CENTRAL IN-MEMORY CACHE SYNCHRONIZED ACROSS ALL DEVICES VIA FIRESTORE
// ============================================================================
let centralProfilesCache: UserProfile[] = [DEFAULT_SUPER_ADMIN];
let centralStagesCache: PipelineStage[] = [...INITIAL_STAGES];
let centralLeadsCache: Lead[] = [...INITIAL_LEADS];
let centralInteractionsCache: Interaction[] = [...INITIAL_INTERACTIONS];
let centralStageHistoryCache: StageHistory[] = [...INITIAL_STAGE_HISTORY];
let centralNotesCache: InternalNote[] = [];
let centralTasksCache: FollowupTask[] = [];
let centralNotificationsCache: AppNotification[] = [...INITIAL_NOTIFICATIONS];
let centralAuditLogsCache: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let centralReminderLogsCache: ReminderLog[] = [...INITIAL_REMINDER_LOGS];

// Change listeners for instant UI updates when any device changes Firestore data
type StoreChangeListener = () => void;
const storeListeners: Set<StoreChangeListener> = new Set();

export function subscribeToStoreChanges(listener: StoreChangeListener): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

function notifyStoreListeners() {
  storeListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.error('Error notifying store listener:', err);
    }
  });
}

// Set up real-time bidirectional subscriptions to centralized Firestore database
if (typeof window !== 'undefined') {
  // 1. Users
  subscribeToDatabaseUsers((users) => {
    if (users && users.length > 0) {
      centralProfilesCache = users;
      notifyStoreListeners();
    }
  });

  // 2. Stages
  subscribeToDatabaseStages((stages) => {
    if (stages && stages.length > 0) {
      centralStagesCache = stages;
      notifyStoreListeners();
    }
  });

  // 3. Leads
  subscribeToDatabaseLeads((leads) => {
    centralLeadsCache = leads;
    notifyStoreListeners();
  });

  // 4. Interactions
  subscribeToDatabaseInteractions((interactions) => {
    centralInteractionsCache = interactions;
    notifyStoreListeners();
  });

  // 5. Stage History
  subscribeToDatabaseStageHistory((history) => {
    centralStageHistoryCache = history;
    notifyStoreListeners();
  });

  // 6. Notes
  subscribeToDatabaseNotes((notes) => {
    centralNotesCache = notes;
    notifyStoreListeners();
  });

  // 7. Tasks
  subscribeToDatabaseTasks((tasks) => {
    centralTasksCache = tasks;
    notifyStoreListeners();
  });

  // 8. Notifications
  subscribeToDatabaseNotifications((notifs) => {
    centralNotificationsCache = notifs;
    notifyStoreListeners();
  });

  // 9. Audit Logs
  subscribeToDatabaseAuditLogs((logs) => {
    centralAuditLogsCache = logs;
    notifyStoreListeners();
  });

  // 10. Reminder Logs
  subscribeToDatabaseReminderLogs((logs) => {
    centralReminderLogsCache = logs;
    notifyStoreListeners();
  });

  // Clean up legacy localStorage keys to enforce centralized single source of truth
  try {
    localStorage.removeItem('azvasa_profiles');
    localStorage.removeItem('azvasa_leads');
    localStorage.removeItem('azvasa_pipeline_stages');
    localStorage.removeItem('azvasa_interactions');
    localStorage.removeItem('azvasa_stage_history');
    localStorage.removeItem('azvasa_notifications');
    localStorage.removeItem('azvasa_audit_logs');
    localStorage.removeItem('azvasa_reminder_logs');
    localStorage.removeItem('azvasa_notes');
    localStorage.removeItem('azvasa_tasks');
    localStorage.removeItem('azvasa_notes_clean');
    localStorage.removeItem('azvasa_tasks_clean');
  } catch {}
}

// Fetch all collections from central database on demand
export async function syncAllDataFromCentralDatabase(): Promise<void> {
  try {
    const [
      users,
      stages,
      leads,
      interactions,
      history,
      notes,
      tasks,
      notifs,
      audit,
      reminders
    ] = await Promise.all([
      fetchUsersFromDatabase(),
      fetchStagesFromDatabase(),
      fetchLeadsFromDatabase(),
      fetchInteractionsFromDatabase(),
      fetchStageHistoryFromDatabase(),
      fetchNotesFromDatabase(),
      fetchTasksFromDatabase(),
      fetchNotificationsFromDatabase(),
      fetchAuditLogsFromDatabase(),
      fetchReminderLogsFromDatabase()
    ]);

    if (users && users.length > 0) centralProfilesCache = users;
    if (stages && stages.length > 0) centralStagesCache = stages;
    if (leads) centralLeadsCache = leads;
    if (interactions) centralInteractionsCache = interactions;
    if (history) centralStageHistoryCache = history;
    if (notes) centralNotesCache = notes;
    if (tasks) centralTasksCache = tasks;
    if (notifs) centralNotificationsCache = notifs;
    if (audit) centralAuditLogsCache = audit;
    if (reminders) centralReminderLogsCache = reminders;

    notifyStoreListeners();
  } catch (err) {
    console.error('Error synchronizing all data from central database:', err);
  }
}

// Sync users to backend
export function syncUsersToServer(profiles: UserProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: profiles })
    }).catch(() => {});
  } catch {}
}

// Sync users from centralized database into memory
export async function syncUsersFromServer(): Promise<UserProfile[]> {
  try {
    const dbUsers = await fetchUsersFromDatabase();
    if (Array.isArray(dbUsers) && dbUsers.length > 0) {
      centralProfilesCache = dbUsers;
      notifyStoreListeners();
      return dbUsers;
    }
  } catch (err) {
    console.error('Failed to sync users from centralized database:', err);
  }
  return centralProfilesCache;
}

// Storage initialization (Centralized single source of truth in Firestore)
export function initStorage(forceReset = false): void {
  if (typeof window === 'undefined') return;

  // Ensure no legacy local storage data pollutes the centralized app
  try {
    localStorage.removeItem('azvasa_profiles');
    localStorage.removeItem('azvasa_leads');
  } catch {}

  // Fetch central database records immediately
  syncAllDataFromCentralDatabase().catch(() => {});
}

// Current User Session (Session-only: Opening site requires login, refreshing keeps session)
export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const sessionRaw = sessionStorage.getItem('azvasa_session_user');
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && parsed.id) return parsed;
    } catch {}
  }
  return null;
}

export function setCurrentUser(user: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem('azvasa_session_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('azvasa_session_user');
  }
}

// ============================================================================
// 1. PROFILES / USERS (Centralized Database)
// ============================================================================

export function getProfiles(): UserProfile[] {
  return centralProfilesCache;
}

export function saveProfiles(profiles: UserProfile[]): void {
  centralProfilesCache = profiles;
  profiles.forEach(p => {
    saveUserToDatabase(p).catch(() => {});
  });
  syncUsersToServer(profiles);
  notifyStoreListeners();
}

export function addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, actor: UserProfile): UserProfile {
  const username = (profile.username || '').trim() || profile.email.split('@')[0];
  const password = (profile.password || '').trim() || 'Password@123';
  const newProfile: UserProfile = {
    ...profile,
    username,
    password,
    id: `user-${profile.role}-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  // Direct persistence to centralized database
  saveUserToDatabase(newProfile).catch(err => {
    console.error('Error saving user to central Firestore database:', err);
  });

  // Update memory cache immediately
  centralProfilesCache = [...centralProfilesCache.filter(u => u.id !== newProfile.id), newProfile];
  notifyStoreListeners();

  // Push to server API
  if (typeof window !== 'undefined') {
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile)
    }).catch(() => {});
  }

  addAuditLog({
    user_id: actor.id,
    user_name: actor.full_name,
    user_role: actor.role,
    action: `User added (${profile.role})`,
    record_type: 'User',
    record_id: newProfile.id,
    record_title: `${newProfile.full_name} (${newProfile.email})`,
    new_value: `Role: ${newProfile.role}, Username: ${newProfile.username || newProfile.email}, Status: ${newProfile.status}`
  });

  return newProfile;
}

export function updateProfile(id: string, updates: Partial<UserProfile>, actor: UserProfile): UserProfile | null {
  const index = centralProfilesCache.findIndex(p => p.id === id);
  if (index === -1) return null;

  const oldProfile = centralProfilesCache[index];
  const updated = { ...oldProfile, ...updates, updated_at: new Date().toISOString() };
  centralProfilesCache[index] = updated;
  notifyStoreListeners();

  // Persist directly to central Firestore database
  saveUserToDatabase(updated).catch(err => {
    console.error('Error updating user in central Firestore database:', err);
  });

  // Update on server API
  if (typeof window !== 'undefined') {
    fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(() => {});
  }

  // Audit log
  if (updates.status && updates.status !== oldProfile.status) {
    addAuditLog({
      user_id: actor.id,
      user_name: actor.full_name,
      user_role: actor.role,
      action: updates.status === 'active' ? 'User activated' : 'User deactivated',
      record_type: 'User',
      record_id: id,
      record_title: `${updated.full_name} (${updated.email})`,
      previous_value: `Status: ${oldProfile.status}`,
      new_value: `Status: ${updates.status}`
    });
  } else {
    addAuditLog({
      user_id: actor.id,
      user_name: actor.full_name,
      user_role: actor.role,
      action: 'User credentials/details updated',
      record_type: 'User',
      record_id: id,
      record_title: `${updated.full_name} (${updated.email})`,
      new_value: `Role: ${updated.role}, Status: ${updated.status}`
    });
  }

  // Update current session if matching
  const current = getCurrentUser();
  if (current && current.id === id) {
    setCurrentUser(updated);
  }

  return updated;
}

export function deleteProfile(id: string, actor: UserProfile): { success: boolean; error?: string } {
  const target = centralProfilesCache.find(p => p.id === id);
  if (!target) return { success: false, error: 'User not found' };

  const superAdmins = centralProfilesCache.filter(p => p.role === 'super_admin' && p.status === 'active');
  if (target.role === 'super_admin' && superAdmins.length <= 1) {
    return { success: false, error: 'Cannot delete the only active Super Admin in the system.' };
  }

  centralProfilesCache = centralProfilesCache.filter(p => p.id !== id);
  notifyStoreListeners();

  // Delete from central Firestore database
  deleteUserFromDatabase(id).catch(err => {
    console.error('Error deleting user from central Firestore database:', err);
  });

  // Delete from server API
  if (typeof window !== 'undefined') {
    fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  addAuditLog({
    user_id: actor.id,
    user_name: actor.full_name,
    user_role: actor.role,
    action: 'User removed',
    record_type: 'User',
    record_id: id,
    record_title: `${target.full_name} (${target.email})`,
    new_value: 'Deleted from system'
  });

  return { success: true };
}

export function authenticateWithCredentials(usernameOrEmail: string, passwordAttempt: string): { success: boolean; user?: UserProfile; error?: string } {
  const profiles = getProfiles();
  const query = usernameOrEmail.trim().toLowerCase();
  const cleanPassword = passwordAttempt.trim();

  const isSuperAdminQuery = query === 'vempallirakhi20@gmail.com' || query === 'rakhi' || query === 'admin';
  if (isSuperAdminQuery && cleanPassword === 'Rakhi@1234') {
    let superAdmin = profiles.find(p => p.role === 'super_admin');
    if (!superAdmin) {
      superAdmin = { ...DEFAULT_SUPER_ADMIN };
      profiles.unshift(superAdmin);
    }
    superAdmin.email = 'vempallirakhi20@gmail.com';
    superAdmin.username = 'rakhi';
    superAdmin.password = 'Rakhi@1234';
    superAdmin.status = 'active';
    saveUserToDatabase(superAdmin).catch(() => {});
    setCurrentUser(superAdmin);
    return { success: true, user: superAdmin };
  }

  const user = profiles.find(p => 
    p.email.toLowerCase() === query || 
    (p.username && p.username.toLowerCase() === query)
  );

  if (!user) {
    return { success: false, error: 'No account found with this username or company email in the database.' };
  }

  if (user.status !== 'active') {
    return { success: false, error: 'This account has been deactivated. Please contact Super Admin.' };
  }

  const expectedPassword = user.password || 'Password@123';
  if (cleanPassword !== expectedPassword && !(user.role === 'super_admin' && cleanPassword === 'Rakhi@1234')) {
    return { success: false, error: 'Incorrect password entered.' };
  }

  setCurrentUser(user);
  return { success: true, user };
}

export function authenticateWithGoogleUser(email: string): { success: boolean; user?: UserProfile; error?: string } {
  return {
    success: false,
    error: 'Please sign in with your company email and password.'
  };
}

// ============================================================================
// 2. PIPELINE STAGES (Centralized Database)
// ============================================================================

export function getStages(): PipelineStage[] {
  return [...centralStagesCache].sort((a, b) => a.display_order - b.display_order);
}

export function saveStages(stages: PipelineStage[], actor?: UserProfile): void {
  centralStagesCache = stages;
  notifyStoreListeners();

  // Persist each stage to central Firestore database
  stages.forEach(s => {
    saveStageToDatabase(s).catch(err => console.error('Error saving stage to Firestore:', err));
  });

  // Also sync to server
  if (typeof window !== 'undefined') {
    fetch('/api/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages })
    }).catch(() => {});
  }

  if (actor) {
    addAuditLog({
      user_id: actor.id,
      user_name: actor.full_name,
      user_role: actor.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
      action: 'Pipeline stage modified',
      record_type: 'Pipeline',
      record_id: 'stages',
      record_title: 'Pipeline Stages Configuration',
      new_value: `${stages.length} stages updated`
    });
  }
}

// ============================================================================
// 3. LEADS (Centralized Database)
// ============================================================================

export function getLeads(): Lead[] {
  return [...centralLeadsCache].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveLeads(leads: Lead[]): void {
  centralLeadsCache = leads;
  notifyStoreListeners();
  leads.forEach(l => {
    saveLeadToDatabase(l).catch(err => console.error('Error saving lead to Firestore:', err));
  });
}

export type ActorType = UserProfile | string | { id: string; full_name: string; role?: string };

function resolveActor(actor: ActorType): { id: string; full_name: string; role: string } {
  if (typeof actor === 'string') {
    return { id: 'usr-current', full_name: actor, role: 'super_admin' };
  }
  return {
    id: actor.id,
    full_name: actor.full_name,
    role: actor.role || 'sales_rep'
  };
}

export function addLead(leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>, actor: ActorType): Lead {
  const actorObj = resolveActor(actor);
  const stages = getStages();
  const profiles = getProfiles();

  const assignedRep = profiles.find(p => p.id === leadData.assigned_rep_id);
  const stage = stages.find(s => s.id === leadData.current_stage_id);

  const newLead: Lead = {
    ...leadData,
    id: `lead-${Date.now()}`,
    assigned_rep_name: assignedRep ? assignedRep.full_name : 'Unassigned',
    current_stage_name: stage ? stage.name : 'Lead',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Immediate cache update
  centralLeadsCache = [newLead, ...centralLeadsCache];
  notifyStoreListeners();

  // 1. Central Firestore Database Write (Available to all devices instantly)
  saveLeadToDatabase(newLead).catch(err => {
    console.error('Error saving lead to central database:', err);
  });

  // 2. Server API fallback
  if (typeof window !== 'undefined') {
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLead)
    }).catch(() => {});
  }

  // Audit Log
  addAuditLog({
    user_id: actorObj.id,
    user_name: actorObj.full_name,
    user_role: actorObj.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
    action: 'Lead created',
    record_type: 'Lead',
    record_id: newLead.id,
    record_title: newLead.school_name,
    new_value: `Product: ${newLead.product}, Stage: ${newLead.current_stage_name}, Rep: ${newLead.assigned_rep_name}`
  });

  // Notify assigned sales rep if assigned to someone else
  if (newLead.assigned_rep_id && newLead.assigned_rep_id !== actorObj.id) {
    addNotification({
      user_id: newLead.assigned_rep_id,
      type: 'new_assignment',
      title: 'New Lead Assigned',
      message: `${newLead.school_name} has been assigned to you.`,
      lead_id: newLead.id,
      school_name: newLead.school_name
    });
  }

  return newLead;
}

export function updateLead(id: string, updates: Partial<Lead>, actor: ActorType): Lead | null {
  const actorObj = resolveActor(actor);
  const index = centralLeadsCache.findIndex(l => l.id === id);
  if (index === -1) return null;

  const oldLead = centralLeadsCache[index];
  const stages = getStages();
  const profiles = getProfiles();

  let repName = oldLead.assigned_rep_name;
  if (updates.assigned_rep_id && updates.assigned_rep_id !== oldLead.assigned_rep_id) {
    const rep = profiles.find(p => p.id === updates.assigned_rep_id);
    repName = rep ? rep.full_name : repName;
  }

  let stageName = oldLead.current_stage_name;
  if (updates.current_stage_id && updates.current_stage_id !== oldLead.current_stage_id) {
    const stage = stages.find(s => s.id === updates.current_stage_id);
    stageName = stage ? stage.name : stageName;
  }

  const updated: Lead = {
    ...oldLead,
    ...updates,
    assigned_rep_name: repName,
    current_stage_name: stageName,
    updated_at: new Date().toISOString()
  };

  centralLeadsCache[index] = updated;
  notifyStoreListeners();

  // 1. Central Firestore Database Write
  saveLeadToDatabase(updated).catch(err => {
    console.error('Error updating lead in central database:', err);
  });

  // 2. Server API
  if (typeof window !== 'undefined') {
    fetch(`/api/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  }

  // Audit and notifications
  if (updates.assigned_rep_id && updates.assigned_rep_id !== oldLead.assigned_rep_id) {
    addAuditLog({
      user_id: actorObj.id,
      user_name: actorObj.full_name,
      user_role: actorObj.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
      action: 'Lead reassigned',
      record_type: 'Lead',
      record_id: id,
      record_title: updated.school_name,
      previous_value: oldLead.assigned_rep_name,
      new_value: updated.assigned_rep_name
    });

    if (updated.assigned_rep_id) {
      addNotification({
        user_id: updated.assigned_rep_id,
        type: 'new_assignment',
        title: 'Lead Reassigned to You',
        message: `${updated.school_name} was reassigned to you by ${actorObj.full_name}.`,
        lead_id: id,
        school_name: updated.school_name
      });
    }
  } else if (updates.current_stage_id && updates.current_stage_id !== oldLead.current_stage_id) {
    addStageHistory({
      lead_id: id,
      from_stage_name: oldLead.current_stage_name || 'Lead',
      to_stage_name: updated.current_stage_name || 'Lead',
      changed_by_id: actorObj.id,
      changed_by_name: actorObj.full_name,
      remarks: updates.next_action_remarks || 'Stage advanced'
    });

    addAuditLog({
      user_id: actorObj.id,
      user_name: actorObj.full_name,
      user_role: actorObj.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
      action: 'Stage changed',
      record_type: 'Lead',
      record_id: id,
      record_title: updated.school_name,
      previous_value: oldLead.current_stage_name,
      new_value: updated.current_stage_name
    });

    if (updated.assigned_rep_id) {
      addNotification({
        user_id: updated.assigned_rep_id,
        type: 'stage_changed',
        title: 'Lead Stage Changed',
        message: `${updated.school_name} moved from ${oldLead.current_stage_name} to ${updated.current_stage_name}.`,
        lead_id: id,
        school_name: updated.school_name
      });
    }
  } else {
    addAuditLog({
      user_id: actorObj.id,
      user_name: actorObj.full_name,
      user_role: actorObj.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
      action: 'Lead edited',
      record_type: 'Lead',
      record_id: id,
      record_title: updated.school_name,
      new_value: 'Lead profile updated'
    });
  }

  return updated;
}

export function deleteLead(id: string, actor: UserProfile): { success: boolean; error?: string } {
  if (actor.role !== 'super_admin') {
    return { success: false, error: 'Only Super Admins are authorized to delete school records.' };
  }

  const target = centralLeadsCache.find(l => l.id === id);
  if (!target) {
    return { success: false, error: 'School/Lead not found.' };
  }

  const isNotInterested = 
    target.current_stage_name?.trim().toLowerCase() === 'not interested' ||
    target.current_stage_id === 'stage-lost' ||
    target.current_stage_id === 'stage-not-interested';

  if (!isNotInterested) {
    return {
      success: false,
      error: `School "${target.school_name}" cannot be deleted because its current stage is "${target.current_stage_name}". Schools can only be deleted once marked as "Not Interested".`
    };
  }

  // Remove lead from cache
  centralLeadsCache = centralLeadsCache.filter(l => l.id !== id);
  notifyStoreListeners();

  // 1. Delete from central Firestore database
  deleteLeadFromDatabase(id).catch(err => {
    console.error('Error deleting lead from central database:', err);
  });

  // 2. Delete on server API
  if (typeof window !== 'undefined') {
    fetch(`/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Clean up interactions from cache and Firestore
  const toDeleteInteractions = centralInteractionsCache.filter(i => i.lead_id === id);
  centralInteractionsCache = centralInteractionsCache.filter(i => i.lead_id !== id);
  toDeleteInteractions.forEach(i => deleteInteractionFromDatabase(i.id).catch(() => {}));

  // Clean up notes and tasks
  const toDeleteNotes = centralNotesCache.filter(n => n.lead_id === id);
  centralNotesCache = centralNotesCache.filter(n => n.lead_id !== id);
  toDeleteNotes.forEach(n => deleteNoteFromDatabase(n.id).catch(() => {}));

  const toDeleteTasks = centralTasksCache.filter(t => t.lead_id !== id);
  centralTasksCache = centralTasksCache.filter(t => t.lead_id !== id);
  toDeleteTasks.forEach(t => deleteTaskFromDatabase(t.id).catch(() => {}));

  // Record Audit Log
  addAuditLog({
    user_id: actor.id,
    user_name: actor.full_name,
    user_role: 'Super Admin',
    action: 'School Deleted',
    record_type: 'Lead',
    record_id: id,
    record_title: `${target.school_name} (${target.location})`,
    new_value: 'Permanently deleted after Not Interested stage'
  });

  if (target.assigned_rep_id && target.assigned_rep_id !== actor.id) {
    addNotification({
      user_id: target.assigned_rep_id,
      type: 'stage_changed',
      title: 'School Record Removed',
      message: `${target.school_name} (Not Interested) was permanently removed by Super Admin ${actor.full_name}.`,
      school_name: target.school_name
    });
  }

  return { success: true };
}

// ============================================================================
// 4. INTERACTIONS (Centralized Database)
// ============================================================================

export function getInteractions(leadId?: string): Interaction[] {
  const interactions = [...centralInteractionsCache].sort(
    (a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime()
  );
  if (leadId) {
    return interactions.filter(i => i.lead_id === leadId);
  }
  return interactions;
}

export function saveInteractions(interactions: Interaction[]): void {
  centralInteractionsCache = interactions;
  notifyStoreListeners();
  interactions.forEach(i => saveInteractionToDatabase(i).catch(() => {}));
}

export function addInteraction(
  interactionData: Omit<Interaction, 'id' | 'created_at'>, 
  actor?: ActorType,
  autoUpdateLead: boolean = true
): Interaction {
  const actorObj = resolveActor(actor || { id: 'usr-current', full_name: interactionData.created_by_name || 'Sales Rep', role: 'sales_rep' });
  const newInteraction: Interaction = {
    ...interactionData,
    id: `inter-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  centralInteractionsCache = [newInteraction, ...centralInteractionsCache];
  notifyStoreListeners();

  // 1. Save to central Firestore database
  saveInteractionToDatabase(newInteraction).catch(err => {
    console.error('Error saving interaction to central database:', err);
  });

  // 2. Push to server
  if (typeof window !== 'undefined') {
    fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInteraction)
    }).catch(() => {});
  }

  // Update lead's last interaction date, next action date, and remarks
  if (autoUpdateLead) {
    const lead = centralLeadsCache.find(l => l.id === interactionData.lead_id);
    if (lead) {
      updateLead(
        lead.id,
        {
          last_interaction_date: newInteraction.interaction_date,
          next_action_date: newInteraction.next_action_date,
          next_action_remarks: newInteraction.next_action_remarks
        },
        actorObj
      );
    }
  }

  addAuditLog({
    user_id: actorObj.id,
    user_name: actorObj.full_name,
    user_role: actorObj.role === 'super_admin' ? 'Super Admin' : 'Sales Representative',
    action: 'Interaction added',
    record_type: 'Interaction',
    record_id: newInteraction.id,
    record_title: `${newInteraction.interaction_type} with lead`,
    new_value: `Next Action: ${newInteraction.next_action_date} (${newInteraction.next_action_remarks})`
  });

  return newInteraction;
}

// ============================================================================
// 5. STAGE HISTORY (Centralized Database)
// ============================================================================

export function getStageHistory(leadId?: string): StageHistory[] {
  const history = [...centralStageHistoryCache].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (leadId) {
    return history.filter(h => h.lead_id === leadId);
  }
  return history;
}

export function addStageHistory(item: Omit<StageHistory, 'id' | 'created_at'>): StageHistory {
  const newEntry: StageHistory = {
    ...item,
    id: `hist-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  centralStageHistoryCache = [newEntry, ...centralStageHistoryCache];
  notifyStoreListeners();

  saveStageHistoryToDatabase(newEntry).catch(err => {
    console.error('Error saving stage history to central database:', err);
  });

  return newEntry;
}

// ============================================================================
// 6. INTERNAL NOTES (Centralized Database)
// ============================================================================

export function getNotes(): InternalNote[] {
  return [...centralNotesCache].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function saveNotes(notes: InternalNote[]): void {
  centralNotesCache = notes;
  notifyStoreListeners();
  notes.forEach(n => saveNoteToDatabase(n).catch(() => {}));
}

export function addNote(leadId: string, content: string, actor?: ActorType): InternalNote {
  const actorObj = resolveActor(actor || { id: 'usr-current', full_name: 'User', role: 'sales_rep' });
  const newNote: InternalNote = {
    id: `note-${Date.now()}`,
    lead_id: leadId,
    created_by_id: actorObj.id,
    created_by_name: actorObj.full_name,
    content,
    created_at: new Date().toISOString()
  };

  centralNotesCache = [newNote, ...centralNotesCache];
  notifyStoreListeners();

  saveNoteToDatabase(newNote).catch(err => {
    console.error('Error saving note to central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    }).catch(() => {});
  }

  return newNote;
}

export function deleteNote(noteId: string): void {
  centralNotesCache = centralNotesCache.filter(n => n.id !== noteId);
  notifyStoreListeners();

  deleteNoteFromDatabase(noteId).catch(err => {
    console.error('Error deleting note from central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch(`/api/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' }).catch(() => {});
  }
}

// ============================================================================
// 7. FOLLOW-UP TASKS (Centralized Database)
// ============================================================================

export function getTasks(): FollowupTask[] {
  return [...centralTasksCache].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function saveTasks(tasks: FollowupTask[]): void {
  centralTasksCache = tasks;
  notifyStoreListeners();
  tasks.forEach(t => saveTaskToDatabase(t).catch(() => {}));
}

export function addTask(
  leadId: string, 
  title: string, 
  dueDate: string, 
  priority: 'Low' | 'Medium' | 'High',
  actor?: ActorType
): FollowupTask {
  const actorObj = resolveActor(actor || { id: 'usr-current', full_name: 'User', role: 'sales_rep' });
  const newTask: FollowupTask = {
    id: `task-${Date.now()}`,
    lead_id: leadId,
    assigned_to_id: actorObj.id,
    assigned_to_name: actorObj.full_name,
    title,
    due_date: dueDate,
    status: 'Pending',
    priority,
    created_at: new Date().toISOString()
  };

  centralTasksCache = [...centralTasksCache, newTask];
  notifyStoreListeners();

  saveTaskToDatabase(newTask).catch(err => {
    console.error('Error saving task to central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    }).catch(() => {});
  }

  return newTask;
}

export function updateTaskStatus(taskId: string, status: 'Pending' | 'Completed'): void {
  const index = centralTasksCache.findIndex(t => t.id === taskId);
  if (index === -1) return;

  const updated: FollowupTask = {
    ...centralTasksCache[index],
    status
  };
  centralTasksCache[index] = updated;
  notifyStoreListeners();

  saveTaskToDatabase(updated).catch(err => {
    console.error('Error updating task in central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  }
}

export function deleteTask(taskId: string): void {
  centralTasksCache = centralTasksCache.filter(t => t.id !== taskId);
  notifyStoreListeners();

  deleteTaskFromDatabase(taskId).catch(err => {
    console.error('Error deleting task from central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' }).catch(() => {});
  }
}

// ============================================================================
// 8. NOTIFICATIONS (Centralized Database)
// ============================================================================

export function getNotifications(userId?: string): AppNotification[] {
  const list = [...centralNotificationsCache].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  if (userId) {
    return list.filter(n => n.user_id === userId || n.user_id === 'all');
  }
  return list;
}

export function saveNotifications(notifications: AppNotification[]): void {
  centralNotificationsCache = notifications;
  notifyStoreListeners();
  notifications.forEach(n => saveNotificationToDatabase(n).catch(() => {}));
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'read' | 'created_at'>): AppNotification {
  const item: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    read: false,
    created_at: new Date().toISOString()
  };

  centralNotificationsCache = [item, ...centralNotificationsCache];
  notifyStoreListeners();

  saveNotificationToDatabase(item).catch(err => {
    console.error('Error saving notification to central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).catch(() => {});
  }

  return item;
}

export function markNotificationRead(id: string): void {
  const index = centralNotificationsCache.findIndex(n => n.id === id);
  if (index !== -1) {
    const updated = { ...centralNotificationsCache[index], read: true };
    centralNotificationsCache[index] = updated;
    notifyStoreListeners();
    saveNotificationToDatabase(updated).catch(() => {});

    if (typeof window !== 'undefined') {
      fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      }).catch(() => {});
    }
  }
}

export function markAllNotificationsRead(userId?: string): void {
  centralNotificationsCache = centralNotificationsCache.map(n => {
    if (!userId || n.user_id === userId || n.user_id === 'all') {
      const updated = { ...n, read: true };
      saveNotificationToDatabase(updated).catch(() => {});
      return updated;
    }
    return n;
  });
  notifyStoreListeners();
}

export function deleteNotification(id: string): void {
  centralNotificationsCache = centralNotificationsCache.filter(n => n.id !== id);
  notifyStoreListeners();

  deleteNotificationFromDatabase(id).catch(err => {
    console.error('Error deleting notification from central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }
}

export function clearReadNotifications(userId?: string): void {
  const toDelete: AppNotification[] = [];
  centralNotificationsCache = centralNotificationsCache.filter(n => {
    if (n.read) {
      if (!userId || n.user_id === userId || n.user_id === 'all') {
        toDelete.push(n);
        return false;
      }
    }
    return true;
  });
  notifyStoreListeners();

  toDelete.forEach(n => deleteNotificationFromDatabase(n.id).catch(() => {}));
}

export function syncFollowupNotifications(currentDateStr: string = '2026-09-19'): AppNotification[] {
  const leads = getLeads();
  const existing = getNotifications();
  const newNotifs: AppNotification[] = [];

  leads.forEach(lead => {
    if (!lead.next_action_date || !lead.assigned_rep_id) return;
    const isClosed = lead.current_stage_name === 'Not Interested' || lead.current_stage_name === 'Agreement Stage';
    if (isClosed) return;

    const leadDate = lead.next_action_date;

    if (leadDate === currentDateStr) {
      const alreadyHasToday = existing.some(
        n => n.lead_id === lead.id && n.type === 'followup_today' && n.created_at.startsWith(currentDateStr)
      );
      if (!alreadyHasToday) {
        const notif = addNotification({
          user_id: lead.assigned_rep_id,
          type: 'followup_today',
          title: 'Follow-up Due Today',
          message: `Scheduled follow-up for ${lead.school_name} (${lead.poc_name} - ${lead.poc_contact}) is due today. Notes: ${lead.next_action_remarks || 'None'}`,
          lead_id: lead.id,
          school_name: lead.school_name
        });
        newNotifs.push(notif);
      }
    } else if (leadDate < currentDateStr) {
      const alreadyHasOverdue = existing.some(
        n => n.lead_id === lead.id && n.type === 'followup_overdue' && n.created_at.startsWith(currentDateStr)
      );
      if (!alreadyHasOverdue) {
        const notif = addNotification({
          user_id: lead.assigned_rep_id,
          type: 'followup_overdue',
          title: 'Overdue Follow-up Notice',
          message: `Follow-up for ${lead.school_name} was due on ${lead.next_action_date} and is now overdue. Please contact ${lead.poc_name}.`,
          lead_id: lead.id,
          school_name: lead.school_name
        });
        newNotifs.push(notif);
      }
    }
  });

  return newNotifs;
}

// ============================================================================
// 9. AUDIT LOGS (Centralized Database)
// ============================================================================

export function getAuditLogs(): AuditLog[] {
  return [...centralAuditLogsCache].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function saveAuditLogs(logs: AuditLog[]): void {
  centralAuditLogsCache = logs;
  notifyStoreListeners();
  logs.forEach(l => saveAuditLogToDatabase(l).catch(() => {}));
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const item: AuditLog = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };

  centralAuditLogsCache = [item, ...centralAuditLogsCache];
  notifyStoreListeners();

  saveAuditLogToDatabase(item).catch(err => {
    console.error('Error saving audit log to central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).catch(() => {});
  }

  return item;
}

// ============================================================================
// 10. REMINDER LOGS (Centralized Database)
// ============================================================================

export function getReminderLogs(): ReminderLog[] {
  return [...centralReminderLogsCache].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );
}

export function saveReminderLogs(logs: ReminderLog[]): void {
  centralReminderLogsCache = logs;
  notifyStoreListeners();
  logs.forEach(l => saveReminderLogToDatabase(l).catch(() => {}));
}

export function addReminderLog(log: Omit<ReminderLog, 'id' | 'sent_at'>): ReminderLog {
  const item: ReminderLog = {
    ...log,
    id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sent_at: new Date().toISOString()
  };

  centralReminderLogsCache = [item, ...centralReminderLogsCache];
  notifyStoreListeners();

  saveReminderLogToDatabase(item).catch(err => {
    console.error('Error saving reminder log to central database:', err);
  });

  if (typeof window !== 'undefined') {
    fetch('/api/reminder-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    }).catch(() => {});
  }

  return item;
}

export function runAutomatedFollowupReminders(targetDateStr: string = '2026-09-19'): ReminderLog[] {
  const leads = getLeads();
  const profiles = getProfiles();
  const existingReminders = getReminderLogs();
  const newDispatches: ReminderLog[] = [];

  const target = new Date(targetDateStr);
  const tomorrow = new Date(target);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  leads.forEach(lead => {
    if (!lead.next_action_date || !lead.assigned_rep_id) return;
    
    if (lead.next_action_date === tomorrowStr) {
      const alreadySent = existingReminders.some(
        r => r.lead_id === lead.id && r.next_action_date === tomorrowStr
      );

      if (!alreadySent) {
        const rep = profiles.find(p => p.id === lead.assigned_rep_id);
        if (rep && rep.status === 'active') {
          const reminder = addReminderLog({
            lead_id: lead.id,
            school_name: lead.school_name,
            poc_name: lead.poc_name,
            poc_designation: lead.poc_designation,
            poc_contact: lead.poc_contact,
            product: lead.product,
            current_stage: lead.current_stage_name || 'Lead',
            rep_id: rep.id,
            rep_name: rep.full_name,
            rep_email: rep.email,
            next_action_date: lead.next_action_date,
            latest_remarks: lead.next_action_remarks || 'Scheduled follow-up reminder',
            status: 'sent'
          });

          addNotification({
            user_id: rep.id,
            type: 'upcoming',
            title: 'Upcoming Follow-up Tomorrow',
            message: `Reminder: Follow-up for ${lead.school_name} is scheduled for tomorrow (${lead.next_action_date}).`,
            lead_id: lead.id,
            school_name: lead.school_name
          });

          newDispatches.push(reminder);
        }
      }
    }
  });

  return newDispatches;
}

export function sendAutomatedReminders(): { sent: number } {
  const sentLogs = runAutomatedFollowupReminders('2026-09-19');
  return { sent: sentLogs.length };
}

// ============================================================================
// 11. CSV EXPORT HELPER
// ============================================================================

export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'School Name',
    'Location',
    'State',
    'POC Name',
    'POC Designation',
    'POC Contact',
    'Lead Source',
    'Channel Partner',
    'Product',
    'Stage',
    'Sales Representative',
    'Created Date',
    'Last Interaction',
    'Next Action Date'
  ];

  const rows = leads.map(l => [
    `"${(l.school_name || '').replace(/"/g, '""')}"`,
    `"${(l.location || '').replace(/"/g, '""')}"`,
    `"${(l.state || '').replace(/"/g, '""')}"`,
    `"${(l.poc_name || '').replace(/"/g, '""')}"`,
    `"${(l.poc_designation || '').replace(/"/g, '""')}"`,
    `"${(l.poc_contact || '').replace(/"/g, '""')}"`,
    `"${(l.lead_source || '').replace(/"/g, '""')}"`,
    `"${(l.channel_partner_name || 'N/A').replace(/"/g, '""')}"`,
    `"${(l.product === 'Others' ? `${l.product} - ${l.other_product || ''}` : l.product).replace(/"/g, '""')}"`,
    `"${(l.current_stage_name || '').replace(/"/g, '""')}"`,
    `"${(l.assigned_rep_name || '').replace(/"/g, '""')}"`,
    `"${l.created_at ? l.created_at.split('T')[0] : ''}"`,
    `"${l.last_interaction_date ? l.last_interaction_date.split('T')[0] : 'None'}"`,
    `"${l.next_action_date || 'None'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AZVASA_SalesTrack_Leads_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
