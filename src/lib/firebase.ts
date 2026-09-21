import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { 
  UserProfile, 
  PipelineStage, 
  Lead, 
  Interaction, 
  StageHistory, 
  InternalNote, 
  FollowupTask, 
  AppNotification, 
  AuditLog, 
  ReminderLog, 
  SystemSetting 
} from '../types';
import { INITIAL_STAGES } from '../data/seedData';

export const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0539863578",
  appId: "1:469212434279:web:440da204f71d28d7b1a9c2",
  apiKey: "AIzaSyBKrl6o11hoUxq5E5wV0u_xI7YYYBoDeEw",
  authDomain: "gen-lang-client-0539863578.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-azvasasalestrack-80f8d7cb-c9f7-4cdd-9d61-37344c146822",
  storageBucket: "gen-lang-client-0539863578.firebasestorage.app",
  messagingSenderId: "469212434279",
  measurementId: "",
  oAuthClientId: "469212434279-5afsehp9vqc5ie34svt36p4shfki54vd.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
export const db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);

// Test Firestore server connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client offline or connection test note:", error.message);
    }
    return false;
  }
}
if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

// Error handling helper as per skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// Default Super Admin seeded in centralized database
export const DEFAULT_SUPER_ADMIN: UserProfile = {
  id: 'user-super-admin-rakhi',
  email: 'vempallirakhi20@gmail.com',
  username: 'rakhi',
  password: 'Rakhi@1234',
  full_name: 'Rakhi Vempalli (Super Admin)',
  role: 'super_admin',
  status: 'active',
  employee_id: 'AZ-HQ-001',
  designation: 'Managing Director & Super Admin',
  phone: '+91 98450 99999',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  created_at: '2026-01-01T00:00:00Z'
};

// Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  STAGES: 'pipeline_stages',
  LEADS: 'leads',
  INTERACTIONS: 'interactions',
  STAGE_HISTORY: 'stage_history',
  NOTES: 'notes',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
  REMINDER_LOGS: 'reminder_logs',
  SETTINGS: 'settings'
};

/**
 * Strips undefined values from objects before writing to Firestore.
 * Firestore client library throws an error if any field is undefined.
 */
export function cleanForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

/* =========================================================================
   1. USERS & AUTHENTICATION (Centralized Database)
   ========================================================================= */

export async function ensureInitialSuperAdmin(): Promise<UserProfile> {
  try {
    const adminDocRef = doc(db, COLLECTIONS.USERS, DEFAULT_SUPER_ADMIN.id);
    const snap = await getDoc(adminDocRef);
    if (!snap.exists()) {
      await setDoc(adminDocRef, DEFAULT_SUPER_ADMIN);
      return DEFAULT_SUPER_ADMIN;
    }
    const data = snap.data() as UserProfile;
    if (data.email !== DEFAULT_SUPER_ADMIN.email || data.password !== DEFAULT_SUPER_ADMIN.password) {
      const updated = {
        ...data,
        email: DEFAULT_SUPER_ADMIN.email,
        password: DEFAULT_SUPER_ADMIN.password,
        role: 'super_admin' as const,
        status: 'active' as const
      };
      await setDoc(adminDocRef, updated, { merge: true });
      return updated;
    }
    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.USERS);
    return DEFAULT_SUPER_ADMIN;
  }
}

export async function fetchUsersFromDatabase(): Promise<UserProfile[]> {
  try {
    const colRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(colRef);
    const users: UserProfile[] = [];
    snapshot.forEach(docSnap => {
      users.push(docSnap.data() as UserProfile);
    });

    if (users.length === 0) {
      await ensureInitialSuperAdmin();
      return [DEFAULT_SUPER_ADMIN];
    }

    const hasAdmin = users.some(u => 
      u.id === DEFAULT_SUPER_ADMIN.id || 
      u.email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase() ||
      u.role === 'super_admin'
    );
    if (!hasAdmin) {
      await setDoc(doc(db, COLLECTIONS.USERS, DEFAULT_SUPER_ADMIN.id), DEFAULT_SUPER_ADMIN);
      users.unshift(DEFAULT_SUPER_ADMIN);
    }

    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.USERS);
    return [DEFAULT_SUPER_ADMIN];
  }
}

export function subscribeToDatabaseUsers(onUpdate: (users: UserProfile[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.USERS);
    return onSnapshot(colRef, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        users.push(docSnap.data() as UserProfile);
      });
      if (users.length === 0) {
        ensureInitialSuperAdmin().then(admin => onUpdate([admin]));
      } else {
        onUpdate(users);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.USERS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveUserToDatabase(user: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(docRef, cleanForFirestore(user), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.USERS}/${user.id}`);
    throw err;
  }
}

export async function deleteUserFromDatabase(userId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.USERS}/${userId}`);
    throw err;
  }
}

export async function authenticateWithCentralDatabase(
  identifier: string,
  passwordAttempt: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const cleanPassword = passwordAttempt.trim();

  if (!cleanIdentifier || !cleanPassword) {
    return { success: false, error: 'Username/email and password are required.' };
  }

  const isSuperAdminQuery = 
    cleanIdentifier === DEFAULT_SUPER_ADMIN.email.toLowerCase() || 
    cleanIdentifier === (DEFAULT_SUPER_ADMIN.username || '').toLowerCase();

  if (isSuperAdminQuery && cleanPassword === DEFAULT_SUPER_ADMIN.password) {
    await ensureInitialSuperAdmin();
    return { success: true, user: DEFAULT_SUPER_ADMIN };
  }

  try {
    const allUsers = await fetchUsersFromDatabase();
    const matched = allUsers.find(u => 
      u.email.toLowerCase() === cleanIdentifier || 
      (u.username && u.username.toLowerCase() === cleanIdentifier)
    );

    if (!matched) {
      return { 
        success: false, 
        error: 'No registered user found with this username or email in the database.' 
      };
    }

    if (matched.status !== 'active') {
      return { 
        success: false, 
        error: 'Your account has been deactivated. Please contact the Super Admin.' 
      };
    }

    const expectedPassword = (matched.password || '').trim() || 'Password@123';
    if (cleanPassword !== expectedPassword) {
      if (matched.role === 'super_admin' && cleanPassword === DEFAULT_SUPER_ADMIN.password) {
        return { success: true, user: matched };
      }
      return { success: false, error: 'Incorrect password entered.' };
    }

    return { success: true, user: matched };
  } catch (err: any) {
    return { success: false, error: 'Database authentication failed. Please try again.' };
  }
}

/* =========================================================================
   2. PIPELINE STAGES (Centralized Database)
   ========================================================================= */

export async function fetchStagesFromDatabase(): Promise<PipelineStage[]> {
  try {
    const colRef = collection(db, COLLECTIONS.STAGES);
    const snapshot = await getDocs(colRef);
    const stages: PipelineStage[] = [];
    snapshot.forEach(docSnap => {
      stages.push(docSnap.data() as PipelineStage);
    });

    if (stages.length === 0) {
      // Seed default pipeline stages if empty in database
      for (const stage of INITIAL_STAGES) {
        await setDoc(doc(db, COLLECTIONS.STAGES, stage.id), stage);
      }
      return [...INITIAL_STAGES].sort((a, b) => a.display_order - b.display_order);
    }

    return stages.sort((a, b) => a.display_order - b.display_order);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STAGES);
    return [...INITIAL_STAGES].sort((a, b) => a.display_order - b.display_order);
  }
}

export function subscribeToDatabaseStages(onUpdate: (stages: PipelineStage[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.STAGES);
    return onSnapshot(colRef, (snapshot) => {
      const stages: PipelineStage[] = [];
      snapshot.forEach(docSnap => {
        stages.push(docSnap.data() as PipelineStage);
      });
      if (stages.length === 0) {
        fetchStagesFromDatabase().then(seeded => onUpdate(seeded));
      } else {
        onUpdate(stages.sort((a, b) => a.display_order - b.display_order));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.STAGES);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveStageToDatabase(stage: PipelineStage): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.STAGES, stage.id), cleanForFirestore(stage), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.STAGES}/${stage.id}`);
    throw err;
  }
}

export async function deleteStageFromDatabase(stageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.STAGES, stageId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.STAGES}/${stageId}`);
    throw err;
  }
}

/* =========================================================================
   3. LEADS (Centralized Database)
   ========================================================================= */

export async function fetchLeadsFromDatabase(): Promise<Lead[]> {
  try {
    const colRef = collection(db, COLLECTIONS.LEADS);
    const snapshot = await getDocs(colRef);
    const leads: Lead[] = [];
    snapshot.forEach(docSnap => {
      leads.push(docSnap.data() as Lead);
    });
    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.LEADS);
    return [];
  }
}

export function subscribeToDatabaseLeads(onUpdate: (leads: Lead[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.LEADS);
    return onSnapshot(colRef, (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach(docSnap => {
        leads.push(docSnap.data() as Lead);
      });
      onUpdate(leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.LEADS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveLeadToDatabase(lead: Lead): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.LEADS, lead.id), cleanForFirestore(lead), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.LEADS}/${lead.id}`);
    throw err;
  }
}

export async function deleteLeadFromDatabase(leadId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LEADS, leadId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.LEADS}/${leadId}`);
    throw err;
  }
}

/* =========================================================================
   4. INTERACTIONS (Centralized Database)
   ========================================================================= */

export async function fetchInteractionsFromDatabase(): Promise<Interaction[]> {
  try {
    const colRef = collection(db, COLLECTIONS.INTERACTIONS);
    const snapshot = await getDocs(colRef);
    const interactions: Interaction[] = [];
    snapshot.forEach(docSnap => {
      interactions.push(docSnap.data() as Interaction);
    });
    return interactions.sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.INTERACTIONS);
    return [];
  }
}

export function subscribeToDatabaseInteractions(onUpdate: (interactions: Interaction[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.INTERACTIONS);
    return onSnapshot(colRef, (snapshot) => {
      const interactions: Interaction[] = [];
      snapshot.forEach(docSnap => {
        interactions.push(docSnap.data() as Interaction);
      });
      onUpdate(interactions.sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.INTERACTIONS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveInteractionToDatabase(interaction: Interaction): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.INTERACTIONS, interaction.id), cleanForFirestore(interaction), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.INTERACTIONS}/${interaction.id}`);
    throw err;
  }
}

export async function deleteInteractionFromDatabase(interactionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.INTERACTIONS, interactionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.INTERACTIONS}/${interactionId}`);
    throw err;
  }
}

/* =========================================================================
   5. STAGE HISTORY (Centralized Database)
   ========================================================================= */

export async function fetchStageHistoryFromDatabase(): Promise<StageHistory[]> {
  try {
    const colRef = collection(db, COLLECTIONS.STAGE_HISTORY);
    const snapshot = await getDocs(colRef);
    const history: StageHistory[] = [];
    snapshot.forEach(docSnap => {
      history.push(docSnap.data() as StageHistory);
    });
    return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STAGE_HISTORY);
    return [];
  }
}

export function subscribeToDatabaseStageHistory(onUpdate: (history: StageHistory[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.STAGE_HISTORY);
    return onSnapshot(colRef, (snapshot) => {
      const history: StageHistory[] = [];
      snapshot.forEach(docSnap => {
        history.push(docSnap.data() as StageHistory);
      });
      onUpdate(history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.STAGE_HISTORY);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveStageHistoryToDatabase(entry: StageHistory): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.STAGE_HISTORY, entry.id), cleanForFirestore(entry), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.STAGE_HISTORY}/${entry.id}`);
    throw err;
  }
}

/* =========================================================================
   6. INTERNAL NOTES (Centralized Database)
   ========================================================================= */

export async function fetchNotesFromDatabase(): Promise<InternalNote[]> {
  try {
    const colRef = collection(db, COLLECTIONS.NOTES);
    const snapshot = await getDocs(colRef);
    const notes: InternalNote[] = [];
    snapshot.forEach(docSnap => {
      notes.push(docSnap.data() as InternalNote);
    });
    return notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.NOTES);
    return [];
  }
}

export function subscribeToDatabaseNotes(onUpdate: (notes: InternalNote[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.NOTES);
    return onSnapshot(colRef, (snapshot) => {
      const notes: InternalNote[] = [];
      snapshot.forEach(docSnap => {
        notes.push(docSnap.data() as InternalNote);
      });
      onUpdate(notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.NOTES);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveNoteToDatabase(note: InternalNote): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.NOTES, note.id), cleanForFirestore(note), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.NOTES}/${note.id}`);
    throw err;
  }
}

export async function deleteNoteFromDatabase(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTES, noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.NOTES}/${noteId}`);
    throw err;
  }
}

/* =========================================================================
   7. FOLLOW-UP TASKS (Centralized Database)
   ========================================================================= */

export async function fetchTasksFromDatabase(): Promise<FollowupTask[]> {
  try {
    const colRef = collection(db, COLLECTIONS.TASKS);
    const snapshot = await getDocs(colRef);
    const tasks: FollowupTask[] = [];
    snapshot.forEach(docSnap => {
      tasks.push(docSnap.data() as FollowupTask);
    });
    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.TASKS);
    return [];
  }
}

export function subscribeToDatabaseTasks(onUpdate: (tasks: FollowupTask[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.TASKS);
    return onSnapshot(colRef, (snapshot) => {
      const tasks: FollowupTask[] = [];
      snapshot.forEach(docSnap => {
        tasks.push(docSnap.data() as FollowupTask);
      });
      onUpdate(tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TASKS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveTaskToDatabase(task: FollowupTask): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.TASKS, task.id), cleanForFirestore(task), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.TASKS}/${task.id}`);
    throw err;
  }
}

export async function deleteTaskFromDatabase(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TASKS, taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.TASKS}/${taskId}`);
    throw err;
  }
}

/* =========================================================================
   8. NOTIFICATIONS (Centralized Database)
   ========================================================================= */

export async function fetchNotificationsFromDatabase(): Promise<AppNotification[]> {
  try {
    const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const snapshot = await getDocs(colRef);
    const notifs: AppNotification[] = [];
    snapshot.forEach(docSnap => {
      notifs.push(docSnap.data() as AppNotification);
    });
    return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.NOTIFICATIONS);
    return [];
  }
}

export function subscribeToDatabaseNotifications(onUpdate: (notifs: AppNotification[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    return onSnapshot(colRef, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach(docSnap => {
        notifs.push(docSnap.data() as AppNotification);
      });
      onUpdate(notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.NOTIFICATIONS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveNotificationToDatabase(notif: AppNotification): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notif.id), cleanForFirestore(notif), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.NOTIFICATIONS}/${notif.id}`);
    throw err;
  }
}

export async function deleteNotificationFromDatabase(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.NOTIFICATIONS}/${notifId}`);
    throw err;
  }
}

/* =========================================================================
   9. AUDIT LOGS (Centralized Database)
   ========================================================================= */

export async function fetchAuditLogsFromDatabase(): Promise<AuditLog[]> {
  try {
    const colRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    const snapshot = await getDocs(colRef);
    const logs: AuditLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as AuditLog);
    });
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.AUDIT_LOGS);
    return [];
  }
}

export function subscribeToDatabaseAuditLogs(onUpdate: (logs: AuditLog[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.AUDIT_LOGS);
    return onSnapshot(colRef, (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as AuditLog);
      });
      onUpdate(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.AUDIT_LOGS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveAuditLogToDatabase(log: AuditLog): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, log.id), cleanForFirestore(log), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.AUDIT_LOGS}/${log.id}`);
    throw err;
  }
}

/* =========================================================================
   10. REMINDER LOGS (Centralized Database)
   ========================================================================= */

export async function fetchReminderLogsFromDatabase(): Promise<ReminderLog[]> {
  try {
    const colRef = collection(db, COLLECTIONS.REMINDER_LOGS);
    const snapshot = await getDocs(colRef);
    const logs: ReminderLog[] = [];
    snapshot.forEach(docSnap => {
      logs.push(docSnap.data() as ReminderLog);
    });
    return logs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.REMINDER_LOGS);
    return [];
  }
}

export function subscribeToDatabaseReminderLogs(onUpdate: (logs: ReminderLog[]) => void): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.REMINDER_LOGS);
    return onSnapshot(colRef, (snapshot) => {
      const logs: ReminderLog[] = [];
      snapshot.forEach(docSnap => {
        logs.push(docSnap.data() as ReminderLog);
      });
      onUpdate(logs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.REMINDER_LOGS);
    });
  } catch (err) {
    return () => {};
  }
}

export async function saveReminderLogToDatabase(log: ReminderLog): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.REMINDER_LOGS, log.id), cleanForFirestore(log), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.REMINDER_LOGS}/${log.id}`);
    throw err;
  }
}

/* =========================================================================
   11. SETTINGS & CONFIGURATION (Centralized Database)
   ========================================================================= */

export async function fetchSettingsFromDatabase(): Promise<SystemSetting[]> {
  try {
    const colRef = collection(db, COLLECTIONS.SETTINGS);
    const snapshot = await getDocs(colRef);
    const settings: SystemSetting[] = [];
    snapshot.forEach(docSnap => {
      settings.push(docSnap.data() as SystemSetting);
    });
    return settings;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTIONS.SETTINGS);
    return [];
  }
}

export async function saveSettingToDatabase(setting: SystemSetting): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, setting.id), cleanForFirestore(setting), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/${setting.id}`);
    throw err;
  }
}
