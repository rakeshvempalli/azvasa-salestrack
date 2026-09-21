import { 
  UserProfile, 
  PipelineStage, 
  Lead, 
  Interaction, 
  StageHistory, 
  AppNotification, 
  AuditLog, 
  ReminderLog 
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

const STORAGE_KEYS = {
  CURRENT_USER: 'azvasa_current_user',
  PROFILES: 'azvasa_profiles',
  STAGES: 'azvasa_pipeline_stages',
  LEADS: 'azvasa_leads',
  INTERACTIONS: 'azvasa_interactions',
  STAGE_HISTORY: 'azvasa_stage_history',
  NOTIFICATIONS: 'azvasa_notifications',
  AUDIT_LOGS: 'azvasa_audit_logs',
  REMINDER_LOGS: 'azvasa_reminder_logs',
  INITIALIZED: 'azvasa_clean_slate_v12'
};

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

// Sync users from server into local state
export async function syncUsersFromServer(): Promise<UserProfile[]> {
  if (typeof window === 'undefined') return getProfiles();
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users) && data.users.length > 0) {
        const local = getProfiles();
        const merged: UserProfile[] = [...data.users];
        local.forEach(lp => {
          if (!merged.some(u => u.id === lp.id || u.email.toLowerCase() === lp.email.toLowerCase())) {
            merged.push(lp);
          }
        });
        // Ensure Super Admin in merged array is up to date
        const saIdx = merged.findIndex(u => 
          u.id === 'user-super-admin-rakhi' || 
          u.email.toLowerCase() === 'vempallirakhi20@gmail.com' ||
          u.email.toLowerCase() === 'admin@azvasa.com' ||
          (u.username && u.username.toLowerCase() === 'rakhi')
        );
        if (saIdx >= 0) {
          merged[saIdx].email = 'vempallirakhi20@gmail.com';
          merged[saIdx].password = 'Rakhi@1234';
          merged[saIdx].username = merged[saIdx].username || 'rakhi';
          merged[saIdx].role = 'super_admin';
          merged[saIdx].status = 'active';
        }
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.error('Failed to sync users from server:', err);
  }
  return getProfiles();
}

// Initialize clean data
export function initStorage(forceReset = false): void {
  if (typeof window === 'undefined') return;

  const initialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!initialized || forceReset) {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_PROFILES));
    localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(INITIAL_STAGES));
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(INITIAL_LEADS));
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(INITIAL_INTERACTIONS));
    localStorage.setItem(STORAGE_KEYS.STAGE_HISTORY, JSON.stringify(INITIAL_STAGE_HISTORY));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify(INITIAL_REMINDER_LOGS));
    
    // Clear old notes & tasks
    localStorage.removeItem('azvasa_notes');
    localStorage.removeItem('azvasa_tasks');
    localStorage.setItem('azvasa_notes_clean', JSON.stringify([]));
    localStorage.setItem('azvasa_tasks_clean', JSON.stringify([]));

    // Ensure no automatic login on first boot or new clean session - user must explicitly log in
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    sessionStorage.removeItem('azvasa_session_user');
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    syncUsersToServer(INITIAL_PROFILES);
  } else {
    // Migration check: ensure Super Admin in existing local storage has updated credentials
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (existingRaw) {
        const parsed: UserProfile[] = JSON.parse(existingRaw);
        let updated = false;
        const saIdx = parsed.findIndex(p => 
          p.id === 'user-super-admin-rakhi' || 
          p.email.toLowerCase() === 'admin@azvasa.com' ||
          p.email.toLowerCase() === 'vempallirakhi20@gmail.com' ||
          (p.username && p.username.toLowerCase() === 'rakhi')
        );
        if (saIdx >= 0) {
          if (parsed[saIdx].email !== 'vempallirakhi20@gmail.com' || parsed[saIdx].password !== 'Rakhi@1234') {
            parsed[saIdx].email = 'vempallirakhi20@gmail.com';
            parsed[saIdx].password = 'Rakhi@1234';
            parsed[saIdx].username = parsed[saIdx].username || 'rakhi';
            parsed[saIdx].role = 'super_admin';
            parsed[saIdx].status = 'active';
            updated = true;
          }
        } else {
          parsed.unshift(INITIAL_PROFILES[0]);
          updated = true;
        }
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(parsed));
        }
      }
    } catch {
      // Ignore migration parsing error
    }
  }
}

// User Profile & Authentication (Session-based: Requires login when site is opened)
export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  initStorage();
  
  // Use sessionStorage so opening the site requires login, while refreshing maintains active session
  const sessionRaw = sessionStorage.getItem('azvasa_session_user');
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && parsed.id) return parsed;
    } catch {
      // fall through
    }
  }
  return null;
}

export function setCurrentUser(user: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem('azvasa_session_user', JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem('azvasa_session_user');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function getProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return INITIAL_PROFILES;
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
  if (!raw) return INITIAL_PROFILES;
  try {
    const parsed: UserProfile[] = JSON.parse(raw);
    // Ensure at least one super admin exists
    const hasSuperAdmin = parsed.some(p => p.role === 'super_admin');
    if (!hasSuperAdmin) {
      parsed.unshift(INITIAL_PROFILES[0]);
      saveProfiles(parsed);
    }
    return parsed;
  } catch {
    return INITIAL_PROFILES;
  }
}

export function saveProfiles(profiles: UserProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  syncUsersToServer(profiles);
}

export function addProfile(profile: Omit<UserProfile, 'id' | 'created_at'>, actor: UserProfile): UserProfile {
  const profiles = getProfiles();
  const username = (profile.username || '').trim() || profile.email.split('@')[0];
  const password = (profile.password || '').trim() || 'Password@123';
  const newProfile: UserProfile = {
    ...profile,
    username,
    password,
    id: `user-${profile.role}-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  profiles.push(newProfile);
  saveProfiles(profiles);

  // Directly push to server persistent storage
  if (typeof window !== 'undefined') {
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile)
    }).catch(err => console.error('Failed pushing user to server:', err));
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
  const profiles = getProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return null;

  const oldProfile = profiles[index];
  const updated = { ...oldProfile, ...updates, updated_at: new Date().toISOString() };
  profiles[index] = updated;
  saveProfiles(profiles);

  // Directly update on server persistent storage
  if (typeof window !== 'undefined') {
    fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(err => console.error('Failed updating user on server:', err));
  }

  // If status changed
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

  // Update current user in session if it's the same user
  const current = getCurrentUser();
  if (current && current.id === id) {
    setCurrentUser(updated);
  }

  return updated;
}

export function deleteProfile(id: string, actor: UserProfile): { success: boolean; error?: string } {
  const profiles = getProfiles();
  const target = profiles.find(p => p.id === id);
  if (!target) return { success: false, error: 'User not found' };

  const superAdmins = profiles.filter(p => p.role === 'super_admin' && p.status === 'active');
  if (target.role === 'super_admin' && superAdmins.length <= 1) {
    return { success: false, error: 'Cannot delete the only active Super Admin in the system.' };
  }

  const filtered = profiles.filter(p => p.id !== id);
  saveProfiles(filtered);

  // Directly delete from server persistent storage
  if (typeof window !== 'undefined') {
    fetch(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(err => console.error('Failed deleting user from server:', err));
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

// Client-side authentication helpers
export function authenticateWithCredentials(usernameOrEmail: string, passwordAttempt: string): { success: boolean; user?: UserProfile; error?: string } {
  const profiles = getProfiles();
  const query = usernameOrEmail.trim().toLowerCase();
  const cleanPassword = passwordAttempt.trim();

  // Direct guarantee for primary Super Admin credentials
  const isSuperAdminQuery = query === 'vempallirakhi20@gmail.com' || query === 'rakhi' || query === 'admin';
  if (isSuperAdminQuery && cleanPassword === 'Rakhi@1234') {
    let superAdmin = profiles.find(p => p.role === 'super_admin');
    if (!superAdmin) {
      superAdmin = { ...INITIAL_PROFILES[0] };
      profiles.unshift(superAdmin);
    }
    superAdmin.email = 'vempallirakhi20@gmail.com';
    superAdmin.username = 'rakhi';
    superAdmin.password = 'Rakhi@1234';
    superAdmin.status = 'active';
    saveProfiles(profiles);
    setCurrentUser(superAdmin);
    return { success: true, user: superAdmin };
  }

  const user = profiles.find(p => 
    p.email.toLowerCase() === query || 
    (p.username && p.username.toLowerCase() === query)
  );

  if (!user) {
    return { success: false, error: 'No account found with this username or company email.' };
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

// Pipeline Stages
export function getStages(): PipelineStage[] {
  if (typeof window === 'undefined') return INITIAL_STAGES;
  const raw = localStorage.getItem(STORAGE_KEYS.STAGES);
  const stages: PipelineStage[] = raw ? JSON.parse(raw) : INITIAL_STAGES;
  return stages.sort((a, b) => a.display_order - b.display_order);
}

export function saveStages(stages: PipelineStage[], actor?: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.STAGES, JSON.stringify(stages));

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

// Leads
export function getLeads(): Lead[] {
  if (typeof window === 'undefined') return INITIAL_LEADS;
  const raw = localStorage.getItem(STORAGE_KEYS.LEADS);
  return raw ? JSON.parse(raw) : INITIAL_LEADS;
}

export function saveLeads(leads: Lead[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
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
  const leads = getLeads();
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

  leads.unshift(newLead);
  saveLeads(leads);

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
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === id);
  if (index === -1) return null;

  const oldLead = leads[index];
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

  leads[index] = updated;
  saveLeads(leads);

  // Check if rep was changed
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
    // Stage changed
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
    // General lead edit
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

  const leads = getLeads();
  const target = leads.find(l => l.id === id);
  if (!target) {
    return { success: false, error: 'School/Lead not found.' };
  }

  // Ensure stage is "Not Interested"
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

  // Remove lead from storage
  const updatedLeads = leads.filter(l => l.id !== id);
  saveLeads(updatedLeads);

  // Clean up interactions
  const allInteractions = getInteractions().filter(i => i.lead_id !== id);
  saveInteractions(allInteractions);

  // Clean up stage history
  const allHistory = getStageHistory().filter(h => h.lead_id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STAGE_HISTORY, JSON.stringify(allHistory));
  }

  // Clean up notes and tasks
  const allNotes = getNotes().filter(n => n.lead_id !== id);
  saveNotes(allNotes);

  const allTasks = getTasks().filter(t => t.lead_id !== id);
  saveTasks(allTasks);

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

  // Notify assigned rep if different from actor
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

// Interactions (ONE LEAD -> MANY INTERACTIONS, never overwritten)
export function getInteractions(leadId?: string): Interaction[] {
  if (typeof window === 'undefined') return INITIAL_INTERACTIONS;
  const raw = localStorage.getItem(STORAGE_KEYS.INTERACTIONS);
  const interactions: Interaction[] = raw ? JSON.parse(raw) : INITIAL_INTERACTIONS;
  
  if (leadId) {
    return interactions
      .filter(i => i.lead_id === leadId)
      .sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime());
  }

  return interactions.sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime());
}

export function saveInteractions(interactions: Interaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(interactions));
}

export function addInteraction(
  interactionData: Omit<Interaction, 'id' | 'created_at'>, 
  actor?: ActorType,
  autoUpdateLead: boolean = true
): Interaction {
  const actorObj = resolveActor(actor || { id: 'usr-current', full_name: interactionData.created_by_name || 'Sales Rep', role: 'sales_rep' });
  const interactions = getInteractions();
  const newInteraction: Interaction = {
    ...interactionData,
    id: `inter-${Date.now()}`,
    created_at: new Date().toISOString()
  };

  interactions.unshift(newInteraction);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(interactions));
  }

  // Update lead's last interaction date, next action date, and next action remarks
  if (autoUpdateLead) {
    const leads = getLeads();
    const lead = leads.find(l => l.id === interactionData.lead_id);
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

// Stage History
export function getStageHistory(leadId?: string): StageHistory[] {
  if (typeof window === 'undefined') return INITIAL_STAGE_HISTORY;
  const raw = localStorage.getItem(STORAGE_KEYS.STAGE_HISTORY);
  const history: StageHistory[] = raw ? JSON.parse(raw) : INITIAL_STAGE_HISTORY;

  if (leadId) {
    return history
      .filter(h => h.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addStageHistory(item: Omit<StageHistory, 'id' | 'created_at'>): StageHistory {
  const history = getStageHistory();
  const newEntry: StageHistory = {
    ...item,
    id: `hist-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  history.unshift(newEntry);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.STAGE_HISTORY, JSON.stringify(history));
  }
  return newEntry;
}

// Notifications
export function getNotifications(userId?: string): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const list: AppNotification[] = raw ? JSON.parse(raw) : INITIAL_NOTIFICATIONS;

  if (userId) {
    return list.filter(n => n.user_id === userId || n.user_id === 'all');
  }

  return list;
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'read' | 'created_at'>): AppNotification {
  const list = getNotifications();
  const item: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    read: false,
    created_at: new Date().toISOString()
  };
  list.unshift(item);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  }
  return item;
}

export function markNotificationRead(id: string): void {
  const list = getNotifications();
  const index = list.findIndex(n => n.id === id);
  if (index !== -1) {
    list[index].read = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    }
  }
}

export function markAllNotificationsRead(userId?: string): void {
  const list = getNotifications();
  list.forEach(n => {
    if (!userId || n.user_id === userId || n.user_id === 'all') {
      n.read = true;
    }
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  }
}

export function deleteNotification(id: string): void {
  const list = getNotifications();
  const filtered = list.filter(n => n.id !== id);
  saveNotifications(filtered);
}

export function clearReadNotifications(userId?: string): void {
  const list = getNotifications();
  const filtered = list.filter(n => {
    if (n.read) {
      if (!userId || n.user_id === userId || n.user_id === 'all') {
        return false;
      }
    }
    return true;
  });
  saveNotifications(filtered);
}

// Scans active leads and creates real-time follow-up and overdue notifications
export function syncFollowupNotifications(currentDateStr: string = '2026-09-19'): AppNotification[] {
  const leads = getLeads();
  const existing = getNotifications();
  const newNotifs: AppNotification[] = [];

  leads.forEach(lead => {
    if (!lead.next_action_date || !lead.assigned_rep_id) return;
    // Skip leads that are Not Interested or already signed
    const isClosed = lead.current_stage_name === 'Not Interested' || lead.current_stage_name === 'Agreement Stage';
    if (isClosed) return;

    const leadDate = lead.next_action_date;

    if (leadDate === currentDateStr) {
      // Check if a follow-up due today notification already exists for today
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
      // Overdue alert
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

// Audit Logs
export function getAuditLogs(): AuditLog[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  const list: AuditLog[] = raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const list = getAuditLogs();
  const item: AuditLog = {
    ...log,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };
  list.unshift(item);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
  }
  return item;
}

// Reminder Logs (Automated Email Reminders)
export function getReminderLogs(): ReminderLog[] {
  if (typeof window === 'undefined') return INITIAL_REMINDER_LOGS;
  const raw = localStorage.getItem(STORAGE_KEYS.REMINDER_LOGS);
  const list: ReminderLog[] = raw ? JSON.parse(raw) : INITIAL_REMINDER_LOGS;
  return list.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
}

export function addReminderLog(log: Omit<ReminderLog, 'id' | 'sent_at'>): ReminderLog {
  const list = getReminderLogs();
  const item: ReminderLog = {
    ...log,
    id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sent_at: new Date().toISOString()
  };
  list.unshift(item);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify(list));
  }
  return item;
}

// Automated Follow-up Reminder Job (Runs 1 day before Next Action Date)
export function runAutomatedFollowupReminders(targetDateStr: string = '2026-09-19'): ReminderLog[] {
  const leads = getLeads();
  const profiles = getProfiles();
  const existingReminders = getReminderLogs();
  const newDispatches: ReminderLog[] = [];

  // Parse target date and find leads whose next_action_date is tomorrow (targetDate + 1 day)
  const target = new Date(targetDateStr);
  const tomorrow = new Date(target);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  leads.forEach(lead => {
    if (!lead.next_action_date || !lead.assigned_rep_id) return;
    
    // If next action is tomorrow
    if (lead.next_action_date === tomorrowStr) {
      // Check if already dispatched for this date
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

          // Also trigger notification
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

// CSV Export Generator
export function exportLeadsToCSV(leads: Lead[]): void {
  const headers = [
    'School Name',
    'Location',
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

// Additional Storage Helpers
export function saveAuditLogs(logs: AuditLog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
}

export function saveReminderLogs(logs: ReminderLog[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.REMINDER_LOGS, JSON.stringify(logs));
}

export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
}

const STORAGE_NOTES_KEY = 'azvasa_notes_clean';
const STORAGE_TASKS_KEY = 'azvasa_tasks_clean';

export function getNotes(): any[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_NOTES_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveNotes(notes: any[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
}

export function getTasks(): any[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_TASKS_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(raw);
}

export function saveTasks(tasks: any[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_TASKS_KEY, JSON.stringify(tasks));
}

export function sendAutomatedReminders(): { sent: number } {
  const sentLogs = runAutomatedFollowupReminders('2026-09-19');
  return { sent: sentLogs.length };
}

