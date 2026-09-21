import React from 'react';
import { AZVASALogo } from './AZVASALogo';
import { UserProfile } from '../types';
import { Menu, Bell, MailCheck, ShieldCheck, UserCheck, Briefcase, RefreshCw, LogOut } from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  currentUser: UserProfile;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  onTriggerReminders: () => void;
  onLogout?: () => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentUser,
  onOpenMobileMenu,
  onOpenNotifications,
  onTriggerReminders,
  onLogout,
  unreadCount
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Sales Overview';
      case 'leads': return 'Lead Management';
      case 'followups': return 'Follow-ups Management';
      case 'calendar': return 'Sales Calendar';
      case 'reports': return 'Sales Analytics & Reports';
      case 'notifications': return 'Notification Center';
      case 'admin-reps': return 'Team & Credentials Management';
      case 'admin-pipeline': return 'Pipeline Configuration';
      case 'admin-audit': return 'Audit Logs & System Settings';
      case 'admin-reminders': return 'Automated Email Reminders';
      default: return 'SalesTrack';
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur-xs border-b border-[#e8e7e5] px-4 md:px-8 py-3 flex items-center justify-between">
      {/* Left section: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl border border-[#e8e7e5] text-[#646260] hover:bg-[#f3f2f1]"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Header Logo */}
        <div className="md:hidden flex items-center">
          <AZVASALogo variant="mobile" />
        </div>

        {/* Desktop Title & Subtitle */}
        <div className="hidden md:flex flex-col">
          <h1 className="text-base font-bold text-[#084ab8] leading-tight">
            {getTabTitle()}
          </h1>
          <span className="text-[11px] text-[#646260] font-medium">
            AZVASA SalesTrack • Official CRM
          </span>
        </div>
      </div>

      {/* Right section: Controls & Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Verified Active Account Role Badge (Read-Only Security Indicator) */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fafaf9] border border-[#e8e7e5] text-[11px]">
          {currentUser.role === 'super_admin' ? (
            <span className="flex items-center gap-1.5 font-bold text-[#084ab8]">
              <ShieldCheck className="w-4 h-4 text-[#084ab8]" />
              Super Admin
            </span>
          ) : currentUser.role === 'sales_manager' ? (
            <span className="flex items-center gap-1.5 font-bold text-[#084ab8]">
              <Briefcase className="w-4 h-4 text-[#084ab8]" />
              Sales Manager
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-[#b85c00]">
              <UserCheck className="w-4 h-4 text-[#f28705]" />
              Sales Representative
            </span>
          )}
        </div>

        {/* Automated Reminders Trigger button */}
        <button
          onClick={onTriggerReminders}
          title="Run daily automated follow-up reminders (1-day before)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-[#f28705] hover:bg-[#fff4e6] text-[#2d2b2a] text-xs font-medium transition-colors cursor-pointer"
        >
          <MailCheck className="w-4 h-4 text-[#f28705]" />
          <span className="hidden sm:inline">Daily Reminders</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl border border-[#e8e7e5] hover:bg-[#eef4ff] text-[#646260] hover:text-[#084ab8] transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f28705] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Identity Chip */}
        <div className="flex items-center gap-2 pl-1">
          <img
            src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={currentUser.full_name}
            className="w-8 h-8 rounded-lg object-cover border border-[#e8e7e5]"
          />
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-[#2d2b2a] leading-none">
              {currentUser.full_name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-[#646260] font-medium leading-tight">
              {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'sales_manager' ? 'Sales Manager' : 'Sales Rep'}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 ml-1 text-[#646260] hover:text-[#b85c00] hover:bg-[#fff4e6] rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
