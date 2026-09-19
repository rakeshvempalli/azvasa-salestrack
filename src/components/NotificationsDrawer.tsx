import React from 'react';
import { Notification } from '../types';
import { Bell, X, Check, Clock, AlertTriangle, UserCheck, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onSelectLeadById?: (leadId: string) => void;
  onOpenNotificationCenter?: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectLeadById,
  onOpenNotificationCenter
}) => {
  if (!isOpen) return null;

  const unreadList = notifications.filter(n => !n.read);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'followup_today':
        return <Clock className="w-4 h-4 text-[#f28705]" />;
      case 'followup_overdue':
        return <AlertTriangle className="w-4 h-4 text-[#b85c00]" />;
      case 'lead_assigned':
        return <UserCheck className="w-4 h-4 text-[#084ab8]" />;
      case 'lead_reassigned':
        return <ArrowRightLeft className="w-4 h-4 text-[#084ab8]" />;
      case 'stage_updated':
        return <CheckCircle2 className="w-4 h-4 text-[#084ab8]" />;
      default:
        return <Bell className="w-4 h-4 text-[#084ab8]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-50 w-full max-w-sm bg-white h-full shadow-2xl border-l border-[#e8e7e5] flex flex-col animate-slideLeft">
        
        {/* Header */}
        <div className="p-4 border-b border-[#e8e7e5] bg-[#fafaf9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#eef4ff] text-[#084ab8]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#084ab8]">
                Notifications
              </h3>
              <span className="text-[10px] text-[#646260]">
                {unreadList.length} unread updates
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadList.length > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] text-[#084ab8] hover:underline font-semibold px-2 py-1"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#646260] hover:bg-[#f3f2f1]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-[#646260] text-xs">
              No notifications at this moment.
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.read) onMarkAsRead(item.id);
                  if (item.lead_id && onSelectLeadById) {
                    onSelectLeadById(item.lead_id);
                    onClose();
                  }
                }}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  item.read
                    ? 'bg-white border-[#e8e7e5] opacity-75'
                    : 'bg-[#eef4ff]/40 border-[#084ab8]/30 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-white border border-[#e8e7e5] shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-[#2d2b2a] line-clamp-1">
                        {item.title}
                      </strong>
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-[#f28705] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#646260] mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-[#8e8b88] mt-1 block">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#e8e7e5] bg-[#fafaf9] flex flex-col gap-2">
          {onOpenNotificationCenter && (
            <button
              onClick={() => {
                onClose();
                onOpenNotificationCenter();
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-[#084ab8] hover:bg-[#06378a] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open Full Notification Center</span>
            </button>
          )}
          <div className="text-center text-[10px] text-[#8e8b88]">
            AZVASA SalesTrack Real-Time Notification Engine
          </div>
        </div>

      </div>
    </div>
  );
};
