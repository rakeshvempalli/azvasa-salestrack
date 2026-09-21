import React, { useState, useEffect } from 'react';
import { UserProfile, Lead, PipelineStage, Interaction, AuditLog, ReminderLog, Notification, FollowupTask } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getLeads,
  saveLeads,
  getStages,
  saveStages,
  getInteractions,
  saveInteractions,
  getProfiles,
  saveProfiles,
  getAuditLogs,
  saveAuditLogs,
  getReminderLogs,
  saveReminderLogs,
  getNotifications,
  saveNotifications,
  getStageHistory,
  getNotes,
  saveNotes,
  getTasks,
  saveTasks,
  addLead,
  updateLead,
  addInteraction,
  addAuditLog,
  addProfile,
  updateProfile,
  deleteProfile,
  sendAutomatedReminders,
  deleteLead,
  deleteNotification,
  clearReadNotifications,
  syncFollowupNotifications,
  syncUsersFromServer,
  subscribeToStoreChanges,
  syncAllDataFromCentralDatabase,
  addNote,
  addTask,
  updateTaskStatus
} from './lib/storage';

import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './components/LoginPage';
import { DashboardView } from './components/DashboardView';
import { LeadsView } from './components/LeadsView';
import { FollowupsView } from './components/FollowupsView';
import { CalendarView } from './components/CalendarView';
import { ReportsView } from './components/ReportsView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { AdminRepsView } from './components/AdminRepsView';
import { AdminPipelineView } from './components/AdminPipelineView';
import { AdminRemindersView } from './components/AdminRemindersView';
import { AdminAuditView } from './components/AdminAuditView';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { LeadModal } from './components/LeadModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { AddInteractionModal } from './components/AddInteractionModal';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => getCurrentUser());
  
  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Core Data States
  const [leads, setLeads] = useState<Lead[]>(() => getLeads());
  const [stages, setStages] = useState<PipelineStage[]>(() => getStages());
  const [interactions, setInteractions] = useState<Interaction[]>(() => getInteractions());
  const [reps, setReps] = useState<UserProfile[]>(() => getProfiles());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getAuditLogs());
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>(() => getReminderLogs());
  const [notifications, setNotifications] = useState<Notification[]>(() => getNotifications());
  const [notes, setNotes] = useState(() => getNotes());
  const [tasks, setTasks] = useState(() => getTasks());

  // Modal Control States
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [leadForInteraction, setLeadForInteraction] = useState<Lead | null>(null);

  // Refresh helper
  const refreshData = () => {
    setLeads(getLeads());
    setStages(getStages());
    setInteractions(getInteractions());
    setReps(getProfiles());
    setAuditLogs(getAuditLogs());
    setReminderLogs(getReminderLogs());
    setNotifications(getNotifications());
    setNotes(getNotes());
    setTasks(getTasks());
  };

  // Automatically sync with centralized Firestore database and subscribe to real-time updates across all devices
  useEffect(() => {
    // Initial fetch from centralized cloud database
    syncAllDataFromCentralDatabase().then(() => {
      refreshData();
    });

    // Real-time listener: when any device creates/updates data in Firestore, refresh immediately
    const unsubscribe = subscribeToStoreChanges(() => {
      refreshData();
    });

    syncFollowupNotifications('2026-09-19');
    setNotifications(getNotifications());

    return () => {
      unsubscribe();
    };
  }, []);

  // Auth Handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
  };

  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    // If switching to rep, restrict admin tabs
    if (user.role !== 'super_admin' && currentTab.startsWith('admin-')) {
      setCurrentTab('dashboard');
    }
  };

  // Automated Reminders Scan Action & Notification Sync
  const handleTriggerReminders = () => {
    syncFollowupNotifications('2026-09-19');
    sendAutomatedReminders();
    refreshData();
  };

  // Delete Lead / School (Super Admin only after Not Interested)
  const handleDeleteLead = (leadId: string) => {
    if (!currentUser) return;
    const res = deleteLead(leadId, currentUser);
    if (res.success) {
      if (selectedLeadForDetail?.id === leadId) {
        setSelectedLeadForDetail(null);
      }
      refreshData();
    }
    return res;
  };

  // Lead Operations
  const handleCreateOrUpdateLead = (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    if (!currentUser) return;

    if (editingLead) {
      updateLead(editingLead.id, leadData, currentUser);
    } else {
      addLead(leadData, currentUser);
    }

    refreshData();
    setIsAddLeadModalOpen(false);
    setEditingLead(null);

    // Update selected lead in detail modal if open
    if (selectedLeadForDetail) {
      const updated = getLeads().find(l => l.id === (editingLead ? editingLead.id : selectedLeadForDetail.id));
      if (updated) setSelectedLeadForDetail(updated);
    }
  };

  // Stage Change Handler
  const handleStageChange = (leadId: string, newStageId: string) => {
    if (!currentUser) return;
    const stage = stages.find(s => s.id === newStageId);
    if (!stage) return;

    updateLead(
      leadId,
      {
        current_stage_id: stage.id,
        current_stage_name: stage.name
      },
      currentUser
    );

    refreshData();
    if (selectedLeadForDetail?.id === leadId) {
      const updated = getLeads().find(l => l.id === leadId);
      if (updated) setSelectedLeadForDetail(updated);
    }
  };

  // Reassign Lead Handler (Admin only)
  const handleReassignLead = (leadId: string, newRepId: string) => {
    if (!currentUser || currentUser.role !== 'super_admin') return;
    const rep = reps.find(r => r.id === newRepId);
    if (!rep) return;

    updateLead(
      leadId,
      {
        assigned_rep_id: rep.id,
        assigned_rep_name: rep.full_name
      },
      currentUser
    );

    refreshData();
    if (selectedLeadForDetail?.id === leadId) {
      const updated = getLeads().find(l => l.id === leadId);
      if (updated) setSelectedLeadForDetail(updated);
    }
  };

  // Reschedule Follow-up
  const handleRescheduleLead = (leadId: string, newDate: string, newRemarks?: string) => {
    if (!currentUser) return;
    updateLead(
      leadId,
      {
        next_action_date: newDate,
        next_action_remarks: newRemarks
      },
      currentUser
    );
    refreshData();
  };

  // Mark Follow-up Done
  const handleMarkDone = (leadId: string) => {
    if (!currentUser) return;
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;

    addInteraction(
      {
        lead_id: leadId,
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        interaction_type: 'Meeting',
        interaction_date: new Date().toISOString().slice(0, 16),
        contact_person: targetLead.poc_name,
        discussion_summary: `Completed scheduled follow-up: "${targetLead.next_action_remarks || 'Discussion held'}".`,
        follow_up_remarks: 'Action completed. Next steps to be scheduled.',
        stage_at_interaction: targetLead.current_stage_name
      },
      currentUser
    );

    updateLead(
      leadId,
      {
        next_action_date: undefined,
        next_action_remarks: undefined
      },
      currentUser
    );

    refreshData();
  };

  // Interaction Submit Handler
  const handleInteractionSubmit = (
    interactionData: Omit<Interaction, 'id' | 'created_at'>,
    updatedStageId?: string,
    nextDate?: string,
    nextRemarks?: string
  ) => {
    if (!currentUser) return;

    addInteraction(interactionData, currentUser);

    // Apply stage or next action updates to lead
    const updates: Partial<Lead> = {};
    if (updatedStageId) {
      const st = stages.find(s => s.id === updatedStageId);
      if (st) {
        updates.current_stage_id = st.id;
        updates.current_stage_name = st.name;
      }
    }
    if (nextDate !== undefined) {
      updates.next_action_date = nextDate;
    }
    if (nextRemarks !== undefined) {
      updates.next_action_remarks = nextRemarks;
    }

    if (Object.keys(updates).length > 0) {
      updateLead(interactionData.lead_id, updates, currentUser);
    }

    refreshData();
    if (selectedLeadForDetail?.id === interactionData.lead_id) {
      const updated = getLeads().find(l => l.id === interactionData.lead_id);
      if (updated) setSelectedLeadForDetail(updated);
    }
  };

  // Notes & Tasks handlers
  const handleAddNote = (leadId: string, content: string) => {
    if (!currentUser) return;
    addNote(leadId, content, currentUser);
    refreshData();
  };

  const handleToggleTask = (taskId: string) => {
    const existing = getTasks();
    const task = existing.find(t => t.id === taskId);
    if (task) {
      updateTaskStatus(taskId, task.status === 'Completed' ? 'Pending' : 'Completed');
      refreshData();
    }
  };

  const handleAddTask = (leadId: string, title: string, dueDate: string, priority: 'Low' | 'Medium' | 'High') => {
    if (!currentUser) return;
    addTask(leadId, title, dueDate, priority, currentUser);
    refreshData();
  };

  // Admin User Operations
  const handleAddRep = (userData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): UserProfile | null => {
    if (!currentUser) return null;
    const created = addProfile(userData, currentUser);
    refreshData();
    return created;
  };

  const handleUpdateRep = (id: string, updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    updateProfile(id, updates, currentUser);
    refreshData();
  };

  const handleDeleteUser = (id: string, reassignToRepId?: string) => {
    if (!currentUser) return;

    // Handle leads assigned to this user
    const currentLeads = getLeads();
    const userLeads = currentLeads.filter(l => l.assigned_rep_id === id);
    if (userLeads.length > 0) {
      if (reassignToRepId) {
        const targetRep = reps.find(r => r.id === reassignToRepId);
        if (targetRep) {
          const updated = currentLeads.map(l => {
            if (l.assigned_rep_id === id) {
              return {
                ...l,
                assigned_rep_id: targetRep.id,
                assigned_rep_name: targetRep.full_name,
                updated_at: new Date().toISOString()
              };
            }
            return l;
          });
          saveLeads(updated);
          addAuditLog({
            user_id: currentUser.id,
            user_name: currentUser.full_name,
            action: 'Leads Reassigned on User Deletion',
            entity_type: 'lead',
            entity_id: 'bulk',
            details: `Reassigned ${userLeads.length} leads to ${targetRep.full_name} upon removing user.`
          });
        }
      } else {
        // Unassign leads so they remain accessible in unassigned pool
        const updated = currentLeads.map(l => {
          if (l.assigned_rep_id === id) {
            return {
              ...l,
              assigned_rep_id: undefined,
              assigned_rep_name: undefined,
              updated_at: new Date().toISOString()
            };
          }
          return l;
        });
        saveLeads(updated);
        addAuditLog({
          user_id: currentUser.id,
          user_name: currentUser.full_name,
          action: 'Leads Unassigned on User Deletion',
          entity_type: 'lead',
          entity_id: 'bulk',
          details: `Unassigned ${userLeads.length} leads to unassigned pool upon removing user.`
        });
      }
    }

    const res = deleteProfile(id, currentUser);
    refreshData();
    return res;
  };

  const handleReassignAllLeads = (fromRepId: string, toRepId: string) => {
    const targetRep = reps.find(r => r.id === toRepId);
    const sourceRep = reps.find(r => r.id === fromRepId);
    if (!targetRep || !sourceRep) return;

    const currentLeads = getLeads();
    let count = 0;
    const updated = currentLeads.map(l => {
      if (l.assigned_rep_id === fromRepId) {
        count++;
        return {
          ...l,
          assigned_rep_id: targetRep.id,
          assigned_rep_name: targetRep.full_name,
          updated_at: new Date().toISOString()
        };
      }
      return l;
    });

    saveLeads(updated);
    addAuditLog({
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Super Admin',
      action: 'Lead Reassigned',
      entity_type: 'lead',
      entity_id: 'bulk',
      details: `Transferred ${count} leads from ${sourceRep.full_name} to ${targetRep.full_name}.`
    });
    refreshData();
  };

  // Pipeline Stages updates
  const handleUpdateStages = (newStages: PipelineStage[]) => {
    saveStages(newStages);
    addAuditLog({
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.full_name || 'Super Admin',
      action: 'Stage Changed',
      entity_type: 'pipeline',
      entity_id: 'stages',
      details: `Reordered or modified pipeline configuration.`
    });
    refreshData();
  };

  // Notifications
  const handleMarkNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
    setNotifications(updated);
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
    setNotifications(updated);
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
    refreshData();
  };

  const handleClearReadNotifications = () => {
    clearReadNotifications(currentUser?.role === 'super_admin' ? undefined : currentUser?.id);
    refreshData();
  };

  // If no user is logged in, render official Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Calculate counts for sidebar badges
  const currentDateStr = '2026-09-19';
  const visibleLeads = (currentUser.role === 'super_admin' || currentUser.role === 'sales_manager')
    ? leads
    : leads.filter(l => l.assigned_rep_id === currentUser.id);

  const followupsTodayCount = visibleLeads.filter(l => l.next_action_date === currentDateStr).length;
  const followupsOverdueCount = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date < currentDateStr && l.current_stage_name !== 'Not Interested'
  ).length;
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-[#fafaf9] text-[#2d2b2a] overflow-hidden selection:bg-[#084ab8] selection:text-white font-sans antialiased">
      {/* Persistent Desktop Sidebar & Mobile Drawer */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        counts={{
          totalLeads: visibleLeads.length,
          followupsToday: followupsTodayCount,
          followupsOverdue: followupsOverdueCount,
          unreadNotifications: unreadNotificationsCount
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          currentUser={currentUser}
          allProfiles={reps}
          onSwitchUser={handleSwitchUser}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onTriggerReminders={handleTriggerReminders}
          onLogout={handleLogout}
          unreadCount={unreadNotificationsCount}
        />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                currentUser={currentUser}
                leads={leads}
                stages={stages}
                interactions={interactions}
                reps={reps}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenAddLead={() => {
                  setEditingLead(null);
                  setIsAddLeadModalOpen(true);
                }}
                onOpenAddInteraction={(lead) => setLeadForInteraction(lead)}
              />
            )}

            {currentTab === 'leads' && (
              <LeadsView
                leads={leads}
                stages={stages}
                reps={reps}
                currentUser={currentUser}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onOpenAddLead={() => {
                  setEditingLead(null);
                  setIsAddLeadModalOpen(true);
                }}
                onOpenAddInteraction={(lead) => setLeadForInteraction(lead)}
                onDeleteLead={handleDeleteLead}
              />
            )}

            {currentTab === 'followups' && (
              <FollowupsView
                leads={leads}
                currentUser={currentUser}
                reps={reps}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onOpenAddInteraction={(lead) => setLeadForInteraction(lead)}
                onRescheduleLead={handleRescheduleLead}
                onMarkDone={handleMarkDone}
              />
            )}

            {currentTab === 'calendar' && (
              <CalendarView
                leads={leads}
                stages={stages}
                reps={reps}
                currentUser={currentUser}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                leads={leads}
                reps={reps}
                stages={stages}
                interactions={interactions}
              />
            )}

            {currentTab === 'notifications' && (
              <NotificationCenterView
                notifications={notifications}
                currentUser={currentUser}
                leads={leads}
                reps={reps}
                onSelectLeadById={(leadId) => {
                  const found = leads.find(l => l.id === leadId);
                  if (found) setSelectedLeadForDetail(found);
                }}
                onMarkAsRead={handleMarkNotificationRead}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onDeleteNotification={handleDeleteNotification}
                onClearRead={handleClearReadNotifications}
                onTriggerScan={handleTriggerReminders}
              />
            )}

            {/* ADMIN ONLY VIEWS */}
            {currentUser.role === 'super_admin' && (
              <>
                {currentTab === 'admin-reps' && (
                  <AdminRepsView
                    reps={reps}
                    leads={leads}
                    currentUser={currentUser}
                    onAddRep={handleAddRep}
                    onUpdateRep={handleUpdateRep}
                    onDeleteUser={handleDeleteUser}
                    onReassignAllLeads={handleReassignAllLeads}
                  />
                )}

                {currentTab === 'admin-pipeline' && (
                  <AdminPipelineView
                    stages={stages}
                    onUpdateStages={handleUpdateStages}
                  />
                )}

                {currentTab === 'admin-reminders' && (
                  <AdminRemindersView
                    leads={leads}
                    reps={reps}
                    reminderLogs={reminderLogs}
                    onTriggerScan={handleTriggerReminders}
                  />
                )}

                {currentTab === 'admin-audit' && (
                  <AdminAuditView
                    auditLogs={auditLogs}
                    settings={[
                      { id: '1', key: 'reminder_time', value: '09:00 AM', description: 'Daily scan run time for 1-day prior alerts' },
                      { id: '2', key: 'round_robin_assignment', value: 'Enabled', description: 'Distribute unassigned inbound leads evenly' },
                      { id: '3', key: 'sla_overdue_threshold', value: '24 Hours', description: 'Flag leads as overdue past scheduled date' }
                    ]}
                    onUpdateSetting={(k, v) => alert(`Setting ${k} updated to ${v}`)}
                  />
                )}
              </>
            )}

            {/* Application Footer */}
            <footer className="mt-12 pt-6 pb-4 border-t border-[#e8e7e5] text-center">
              <p className="text-xs text-[#8e8b88]">
                &copy; 2026 Azvasa Education. All rights reserved.
              </p>
            </footer>
          </div>
        </main>
      </div>

      {/* Global Modals */}

      {/* 1. Add / Edit Lead Modal */}
      {isAddLeadModalOpen && (
        <LeadModal
          isOpen={isAddLeadModalOpen}
          onClose={() => {
            setIsAddLeadModalOpen(false);
            setEditingLead(null);
          }}
          onSubmit={handleCreateOrUpdateLead}
          existingLead={editingLead}
          stages={stages}
          reps={reps}
          currentUser={currentUser}
        />
      )}

      {/* 2. Lead Detail Modal */}
      {selectedLeadForDetail && (
        <LeadDetailModal
          isOpen={!!selectedLeadForDetail}
          onClose={() => setSelectedLeadForDetail(null)}
          lead={selectedLeadForDetail}
          stages={stages}
          reps={reps}
          currentUser={currentUser}
          interactions={interactions}
          pipelineHistories={getStageHistory(selectedLeadForDetail.id)}
          notes={notes}
          tasks={tasks}
          onOpenAddInteraction={(lead) => setLeadForInteraction(lead)}
          onOpenEditLead={(lead) => {
            setEditingLead(lead);
            setIsAddLeadModalOpen(true);
          }}
          onStageChange={handleStageChange}
          onReassignLead={handleReassignLead}
          onAddNote={handleAddNote}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          onDeleteLead={handleDeleteLead}
        />
      )}

      {/* 3. Add Activity / Interaction Modal */}
      {leadForInteraction && (
        <AddInteractionModal
          isOpen={!!leadForInteraction}
          onClose={() => setLeadForInteraction(null)}
          lead={leadForInteraction}
          stages={stages}
          currentUser={currentUser}
          onSubmit={handleInteractionSubmit}
        />
      )}

      {/* 4. Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationRead}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onSelectLeadById={(id) => {
          const matched = leads.find(l => l.id === id);
          if (matched) setSelectedLeadForDetail(matched);
        }}
        onOpenNotificationCenter={() => {
          setNotificationsOpen(false);
          setCurrentTab('notifications');
        }}
      />
    </div>
  );
}
