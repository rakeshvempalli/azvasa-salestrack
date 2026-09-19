import React, { useState, useMemo } from 'react';
import { Lead, PipelineStage, UserProfile } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  Phone,
  User,
  CheckCircle2
} from 'lucide-react';

interface CalendarViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  reps: UserProfile[];
  currentUser: UserProfile;
  onSelectLead: (lead: Lead) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  leads,
  stages,
  reps,
  currentUser,
  onSelectLead
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [repFilter, setRepFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // September 2026 reference anchor
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 8 = September (0-indexed)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Filter leads based on role & dropdowns
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (!isSuperAdmin && l.assigned_rep_id !== currentUser.id) return false;
      if (repFilter && l.assigned_rep_id !== repFilter) return false;
      if (stageFilter && l.current_stage_id !== stageFilter) return false;
      return !!l.next_action_date;
    });
  }, [leads, isSuperAdmin, currentUser.id, repFilter, stageFilter]);

  // Days in current month calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Controls Card */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#f28705]" />
            Sales Follow-up & Visit Calendar
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Visualize scheduled demonstrations, school campus walkthroughs, and agreement closings
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex bg-[#f3f2f1] p-1 rounded-xl border border-[#e8e7e5] text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                  calendarView === v
                    ? 'bg-white text-[#084ab8] shadow-xs'
                    : 'text-[#646260] hover:text-[#2d2b2a]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Rep filter for admin */}
          {isSuperAdmin && (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Consultants</option>
              {reps.filter(r => r.role === 'sales_rep').map(r => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          )}

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
          >
            <option value="">All Stages</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Navigation Bar */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#2d2b2a]">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
            {filteredLeads.length} Events Scheduled
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl border border-[#e8e7e5] hover:bg-[#fafaf9] text-[#646260]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(8);
            }}
            className="px-3 py-1.5 rounded-xl border border-[#e8e7e5] hover:bg-[#fafaf9] text-xs font-semibold text-[#084ab8]"
          >
            Today (Sep 19)
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl border border-[#e8e7e5] hover:bg-[#fafaf9] text-[#646260]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid (Month View) */}
      {calendarView === 'month' && (
        <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[#e8e7e5] bg-[#fafaf9] text-center text-[11px] font-bold text-[#646260] py-2.5">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#f3f2f1] text-xs">
            {/* Empty prefix days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[105px] bg-[#fafaf9]/40 p-2 opacity-30" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = formattedDate === '2026-09-19';

              // Leads scheduled on this day
              const dayLeads = filteredLeads.filter(l => l.next_action_date === formattedDate);

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors ${
                    isToday ? 'bg-[#eef4ff]/30 ring-1 ring-inset ring-[#084ab8]/40' : 'hover:bg-[#fafaf9]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-[#084ab8] text-white'
                          : 'text-[#2d2b2a]'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayLeads.length > 0 && (
                      <span className="text-[10px] font-bold text-[#f28705] bg-[#fff4e6] px-1.5 py-0.2 rounded-full border border-[#f28705]/30">
                        {dayLeads.length}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Items in cell */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-20">
                    {dayLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="p-1 rounded bg-[#eef4ff] border border-[#084ab8]/20 hover:bg-[#084ab8] hover:text-white transition-colors cursor-pointer group text-[10px]"
                      >
                        <strong className="block truncate group-hover:text-white text-[#084ab8]">
                          {lead.school_name}
                        </strong>
                        <span className="block truncate text-[9px] text-[#646260] group-hover:text-white/90">
                          {lead.current_stage_name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] text-[#8e8b88] text-right">
                    {dayLeads.length > 0 ? `${dayLeads.length} due` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week / Day View (Streamlined list for quick review) */}
      {calendarView !== 'month' && (
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#084ab8]">
            Upcoming Scheduled Engagements
          </h3>

          <div className="divide-y divide-[#f3f2f1]">
            {filteredLeads
              .sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || ''))
              .map(lead => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafaf9] p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4ff] text-[#084ab8]">
                        {lead.current_stage_name}
                      </span>
                      <strong className="text-xs font-bold text-[#2d2b2a]">
                        {lead.school_name}
                      </strong>
                    </div>
                    <p className="text-xs text-[#646260]">
                      POC: {lead.poc_name} ({lead.poc_contact}) • Location: {lead.location}
                    </p>
                    {lead.next_action_remarks && (
                      <p className="text-xs text-[#f28705] font-medium">
                        Plan: {lead.next_action_remarks}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-bold text-[#084ab8] block">
                      Date: {lead.next_action_date}
                    </span>
                    <span className="text-[11px] text-[#8e8b88] block">
                      Rep: {lead.assigned_rep_name}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
