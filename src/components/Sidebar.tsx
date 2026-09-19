import React from 'react';
import { AZVASALogo } from './AZVASALogo';
import { UserProfile } from '../types';
import {
  LayoutDashboard,
  Users2,
  CalendarDays,
  Clock,
  BarChart3,
  Bell,
  UserCheck2,
  Sliders,
  FileSpreadsheet,
  MailCheck,
  LogOut,
  X,
  Shield
} from 'lucide-react';

export type NavTab = 
  | 'dashboard' 
  | 'leads' 
  | 'followups' 
  | 'calendar' 
  | 'reports' 
  | 'notifications' 
  | 'admin-reps' 
  | 'admin-pipeline' 
  | 'admin-audit'
  | 'admin-reminders';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: UserProfile;
  onLogout: () => void;
  counts: {
    totalLeads: number;
    followupsToday: number;
    followupsOverdue: number;
    unreadNotifications: number;
  };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  counts,
  mobileOpen,
  onCloseMobile
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'leads' as NavTab,
      label: 'Leads',
      icon: Users2,
      badge: counts.totalLeads > 0 ? `${counts.totalLeads}` : null
    },
    {
      id: 'followups' as NavTab,
      label: 'Follow-ups',
      icon: Clock,
      badge: counts.followupsOverdue > 0 
        ? `${counts.followupsToday + counts.followupsOverdue}`
        : (counts.followupsToday > 0 ? `${counts.followupsToday}` : null),
      badgeColor: counts.followupsOverdue > 0 ? 'bg-[#fff4e6] text-[#b85c00] border border-[#f28705]' : 'bg-[#eef4ff] text-[#084ab8]'
    },
    {
      id: 'calendar' as NavTab,
      label: 'Sales Calendar',
      icon: CalendarDays,
      badge: null
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: counts.unreadNotifications > 0 ? `${counts.unreadNotifications}` : null,
      badgeColor: 'bg-[#f28705] text-white'
    }
  ];

  const adminItems = [
    {
      id: 'admin-reps' as NavTab,
      label: 'Team & Credentials',
      icon: UserCheck2
    },
    {
      id: 'admin-pipeline' as NavTab,
      label: 'Pipeline Settings',
      icon: Sliders
    },
    {
      id: 'admin-reminders' as NavTab,
      label: 'Email Reminders',
      icon: MailCheck
    },
    {
      id: 'admin-audit' as NavTab,
      label: 'Audit & Settings',
      icon: FileSpreadsheet
    }
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-[#e8e7e5] w-64 md:w-64">
      {/* Top Section */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Logo Container with whitespace */}
        <div className="p-5 pb-4 border-b border-[#f3f2f1] flex items-center justify-between">
          <div className="flex flex-col">
            <AZVASALogo variant="sidebar" showSubtitle={false} />
            <div className="mt-1 pl-1">
              <span className="text-xs font-bold text-[#084ab8] tracking-wide">
                SalesTrack
              </span>
              <span className="text-[10px] text-[#646260] font-medium block">
                Follow-up Management
              </span>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#646260] hover:bg-[#f3f2f1]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8e8b88]">
            Main Menu
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 shadow-xs'
                    : 'text-[#646260] hover:bg-[#f3f2f1] hover:text-[#2d2b2a]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#084ab8]' : 'text-[#646260]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      item.badgeColor || (isActive ? 'bg-[#084ab8] text-white' : 'bg-[#f3f2f1] text-[#646260]')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* ADMIN MENU (Only shown to Super Admin) */}
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-1">
                <div className="flex items-center gap-2 px-3 py-1">
                  <div className="h-[1px] flex-1 bg-[#e8e7e5]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#084ab8] flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#f28705]" />
                    Admin
                  </span>
                  <div className="h-[1px] flex-1 bg-[#e8e7e5]" />
                </div>
              </div>

              {adminItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 shadow-xs'
                        : 'text-[#646260] hover:bg-[#f3f2f1] hover:text-[#2d2b2a]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#084ab8]' : 'text-[#646260]'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* Bottom Profile Section */}
      <div className="p-3 border-t border-[#e8e7e5] bg-[#fafaf9]">
        <div className="p-2.5 rounded-xl border border-[#e8e7e5] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={currentUser.full_name}
              className="w-8 h-8 rounded-lg object-cover border border-[#e8e7e5] shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-xs font-bold text-[#2d2b2a] truncate">
                {currentUser.full_name}
              </span>
              <span className="block text-[10px] text-[#646260] truncate">
                {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.designation}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-[#646260] hover:text-[#b85c00] hover:bg-[#fff4e6] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-64 max-w-[85vw] h-full shadow-2xl animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
