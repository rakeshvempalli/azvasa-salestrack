import React, { useState, useMemo } from 'react';
import { AppNotification, UserProfile, Lead } from '../types';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Clock,
  AlertTriangle,
  UserCheck,
  ArrowRightLeft,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  ExternalLink,
  School,
  Sparkles,
  Inbox
} from 'lucide-react';

interface NotificationCenterViewProps {
  notifications: AppNotification[];
  currentUser: UserProfile;
  leads: Lead[];
  reps: UserProfile[];
  onSelectLeadById: (leadId: string) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearRead: () => void;
  onTriggerScan: () => void;
}

type NotificationCategory = 'all' | 'unread' | 'followups' | 'stages' | 'assignments';

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  notifications,
  currentUser,
  leads,
  onSelectLeadById,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearRead,
  onTriggerScan
}) => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserScope, setFilterUserScope] = useState<'mine' | 'all'>(
    currentUser.role === 'super_admin' ? 'all' : 'mine'
  );
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Scope filter: Super Admin & Manager can toggle between 'mine' and 'all team'
  const scopedNotifications = useMemo(() => {
    if (currentUser.role === 'super_admin' && filterUserScope === 'all') {
      return notifications;
    }
    return notifications.filter(
      n => n.user_id === currentUser.id || n.user_id === 'all'
    );
  }, [notifications, currentUser, filterUserScope]);

  // Category and search filtering
  const filteredNotifications = useMemo(() => {
    return scopedNotifications.filter(item => {
      // 1. Category Filter
      if (activeCategory === 'unread' && item.read) return false;
      if (activeCategory === 'followups') {
        const isFollowup = [
          'followup_today',
          'followup_overdue',
          'upcoming',
          'due_today',
          'overdue'
        ].includes(item.type);
        if (!isFollowup) return false;
      }
      if (activeCategory === 'stages') {
        const isStage = ['stage_changed', 'stage_updated'].includes(item.type);
        if (!isStage) return false;
      }
      if (activeCategory === 'assignments') {
        const isAssign = ['new_assignment', 'lead_assigned', 'lead_reassigned'].includes(item.type);
        if (!isAssign) return false;
      }

      // 2. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        const matchesSchool = item.school_name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesSchool) return false;
      }

      return true;
    });
  }, [scopedNotifications, activeCategory, searchTerm]);

  // Counts for tabs
  const unreadCount = scopedNotifications.filter(n => !n.read).length;
  const followupsCount = scopedNotifications.filter(n =>
    ['followup_today', 'followup_overdue', 'upcoming', 'due_today', 'overdue'].includes(n.type)
  ).length;
  const stagesCount = scopedNotifications.filter(n =>
    ['stage_changed', 'stage_updated'].includes(n.type)
  ).length;
  const assignmentsCount = scopedNotifications.filter(n =>
    ['new_assignment', 'lead_assigned', 'lead_reassigned'].includes(n.type)
  ).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'followup_today':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-[#f28705]" />
          </div>
        );
      case 'followup_overdue':
      case 'overdue':
        return (
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
        );
      case 'upcoming':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-[#084ab8]" />
          </div>
        );
      case 'lead_assigned':
      case 'lead_reassigned':
      case 'new_assignment':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            {type === 'lead_reassigned' ? (
              <ArrowRightLeft className="w-4 h-4 text-purple-600" />
            ) : (
              <UserCheck className="w-4 h-4 text-purple-600" />
            )}
          </div>
        );
      case 'stage_changed':
      case 'stage_updated':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#084ab8] border border-blue-200 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-[#084ab8]" />
          </div>
        );
    }
  };

  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#084ab8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#084ab8] tracking-tight">
                Notification Center
              </h1>
              <p className="text-xs text-[#646260]">
                Real-time alerts, scheduled follow-up reminders, stage movements, and lead assignments.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              onTriggerScan();
              showToast('Automated follow-up scanner executed.');
            }}
            title="Scan upcoming & overdue follow-ups"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-[#f28705] hover:bg-[#fff4e6] text-[#2d2b2a] text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#f28705]" />
            <span>Scan Reminders</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                onMarkAllAsRead();
                showToast('All notifications marked as read.');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#084ab8] bg-[#eef4ff] text-[#084ab8] hover:bg-[#084ab8] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          {scopedNotifications.some(n => n.read) && (
            <button
              onClick={() => {
                onClearRead();
                showToast('Cleared read notifications.');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-red-400 hover:bg-red-50 text-[#646260] hover:text-red-600 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Scope Toggle & Filter Row */}
      <div className="bg-white rounded-2xl border border-[#e8e7e5] p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-[#084ab8] text-white shadow-xs'
                  : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              All ({scopedNotifications.length})
            </button>

            <button
              onClick={() => setActiveCategory('unread')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'unread'
                  ? 'bg-[#084ab8] text-white shadow-xs'
                  : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeCategory === 'unread' ? 'bg-white text-[#084ab8]' : 'bg-[#f28705] text-white'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveCategory('followups')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'followups'
                  ? 'bg-[#084ab8] text-white shadow-xs'
                  : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              Follow-ups ({followupsCount})
            </button>

            <button
              onClick={() => setActiveCategory('stages')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'stages'
                  ? 'bg-[#084ab8] text-white shadow-xs'
                  : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              Stages ({stagesCount})
            </button>

            <button
              onClick={() => setActiveCategory('assignments')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'assignments'
                  ? 'bg-[#084ab8] text-white shadow-xs'
                  : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              Assignments ({assignmentsCount})
            </button>
          </div>

          {/* Super Admin Scope Switcher */}
          {currentUser.role === 'super_admin' && (
            <div className="flex items-center gap-1 p-1 bg-[#f3f2f1] rounded-xl border border-[#e8e7e5] self-start md:self-auto shrink-0">
              <button
                onClick={() => setFilterUserScope('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterUserScope === 'all'
                    ? 'bg-white text-[#084ab8] shadow-2xs font-bold'
                    : 'text-[#646260] hover:text-[#2d2b2a]'
                }`}
              >
                All Company Updates
              </button>
              <button
                onClick={() => setFilterUserScope('mine')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  filterUserScope === 'mine'
                    ? 'bg-white text-[#084ab8] shadow-2xs font-bold'
                    : 'text-[#646260] hover:text-[#2d2b2a]'
                }`}
              >
                My Personal Only
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8e8b88] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by school name, keyword, or notification content..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#fafaf9] border border-[#e8e7e5] rounded-xl focus:outline-none focus:border-[#084ab8] focus:bg-white text-[#2d2b2a]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8e8b88] hover:text-[#2d2b2a]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notifications Stream */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e8e7e5] p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#2d2b2a]">
              No notifications found
            </h3>
            <p className="text-xs text-[#646260] mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No notifications match your search query. Try clearing the filter.'
                : activeCategory === 'unread'
                ? 'You are all caught up! There are no unread notifications.'
                : 'No alerts registered in this category. Run a reminders scan or log activities to trigger updates.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-1.5 text-xs font-semibold text-[#084ab8] bg-[#eef4ff] rounded-xl hover:bg-[#084ab8] hover:text-white transition-colors cursor-pointer"
                >
                  Clear Search Filter
                </button>
              )}
              <button
                onClick={() => {
                  onTriggerScan();
                  showToast('Automated follow-up scanner executed.');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-[#646260] border border-[#e8e7e5] rounded-xl hover:bg-[#f3f2f1] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3 text-[#f28705]" />
                <span>Run Scanner</span>
              </button>
            </div>
          </div>
        ) : (
          filteredNotifications.map(item => {
            const hasLead = Boolean(item.lead_id);
            const associatedLead = item.lead_id ? leads.find(l => l.id === item.lead_id) : null;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 transition-all duration-150 ${
                  item.read
                    ? 'border-[#e8e7e5] hover:border-[#cfcdca]'
                    : 'border-[#084ab8]/30 bg-[#f9fbff] shadow-xs ring-1 ring-[#084ab8]/10'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Color-coded Type Icon */}
                  {getNotificationIcon(item.type)}

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#2d2b2a]">
                          {item.title}
                        </span>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#f28705] shrink-0" />
                        )}
                        {item.school_name && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                            <School className="w-2.5 h-2.5" />
                            {item.school_name}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-[#8e8b88] font-mono shrink-0">
                        {formatNotificationTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-[#646260] mt-1.5 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-[#f3f2f1] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {hasLead && (
                          <button
                            onClick={() => {
                              if (!item.read) onMarkAsRead(item.id);
                              if (item.lead_id) onSelectLeadById(item.lead_id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#084ab8] bg-[#eef4ff] hover:bg-[#084ab8] hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>
                              {associatedLead ? `View ${associatedLead.school_name}` : 'View School Lead'}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onMarkAsRead(item.id);
                            showToast(item.read ? 'Notification marked unread.' : 'Notification marked read.');
                          }}
                          title={item.read ? 'Mark as Unread' : 'Mark as Read'}
                          className="px-2 py-1 text-[11px] font-semibold text-[#646260] hover:text-[#084ab8] hover:bg-[#eef4ff] rounded-lg transition-colors cursor-pointer"
                        >
                          {item.read ? 'Mark Unread' : 'Mark Read'}
                        </button>

                        <button
                          onClick={() => {
                            onDeleteNotification(item.id);
                            showToast('Notification deleted.');
                          }}
                          title="Delete notification"
                          className="p-1 text-[#8e8b88] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#084ab8] text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium border border-blue-400/30 animate-slideUp">
          <Sparkles className="w-4 h-4 text-[#f28705]" />
          <span>{feedbackToast}</span>
        </div>
      )}
    </div>
  );
};
