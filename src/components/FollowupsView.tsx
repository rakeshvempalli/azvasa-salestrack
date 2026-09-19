import React, { useState, useMemo } from 'react';
import { Lead, UserProfile } from '../types';
import {
  CalendarCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  RotateCcw,
  Plus
} from 'lucide-react';

interface FollowupsViewProps {
  leads: Lead[];
  currentUser: UserProfile;
  reps: UserProfile[];
  onSelectLead: (lead: Lead) => void;
  onOpenAddInteraction: (lead: Lead) => void;
  onRescheduleLead: (leadId: string, newDate: string, newRemarks?: string) => void;
  onMarkDone: (leadId: string) => void;
}

export const FollowupsView: React.FC<FollowupsViewProps> = ({
  leads,
  currentUser,
  reps,
  onSelectLead,
  onOpenAddInteraction,
  onRescheduleLead,
  onMarkDone
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentDateStr = '2026-09-19';

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [repFilter, setRepFilter] = useState('');
  
  // Reschedule inline modal state
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('2026-09-21');
  const [newRemarks, setNewRemarks] = useState('');

  // Role filter: Sales reps only see their own assigned leads
  const visibleLeads = useMemo(() => {
    let list = isSuperAdmin ? leads : leads.filter(l => l.assigned_rep_id === currentUser.id);
    if (repFilter && isSuperAdmin) {
      list = list.filter(l => l.assigned_rep_id === repFilter);
    }
    return list;
  }, [leads, isSuperAdmin, currentUser.id, repFilter]);

  // Categorize leads into Today, Upcoming, Overdue, and Completed
  const { todayList, upcomingList, overdueList, completedList } = useMemo(() => {
    const today: Lead[] = [];
    const upcoming: Lead[] = [];
    const overdue: Lead[] = [];
    const completed: Lead[] = [];

    visibleLeads.forEach(lead => {
      // Completed if in Agreement Stage or no pending action date
      if (lead.current_stage_name === 'Agreement Stage') {
        completed.push(lead);
      } else if (lead.next_action_date) {
        if (lead.next_action_date === currentDateStr) {
          today.push(lead);
        } else if (lead.next_action_date > currentDateStr) {
          upcoming.push(lead);
        } else if (lead.current_stage_name !== 'Not Interested') {
          overdue.push(lead);
        } else {
          completed.push(lead);
        }
      } else {
        completed.push(lead);
      }
    });

    return {
      todayList: today,
      upcomingList: upcoming.sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || '')),
      overdueList: overdue.sort((a, b) => (a.next_action_date || '').localeCompare(b.next_action_date || '')),
      completedList: completed
    };
  }, [visibleLeads, currentDateStr]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case 'today': return todayList;
      case 'upcoming': return upcomingList;
      case 'overdue': return overdueList;
      case 'completed': return completedList;
    }
  }, [activeTab, todayList, upcomingList, overdueList, completedList]);

  const handleConfirmReschedule = () => {
    if (!rescheduleLeadId || !newDate) return;
    onRescheduleLead(rescheduleLeadId, newDate, newRemarks);
    setRescheduleLeadId(null);
    setNewRemarks('');
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8]">
            Follow-up Cadence & Outreach Queue
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Never miss an academic stakeholder touchpoint with systematic reminders and SLA tracking
          </p>
        </div>

        {/* Representative Filter for Super Admin */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#646260] font-semibold whitespace-nowrap">Filter Rep:</span>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Representatives</option>
              {reps.filter(r => r.role === 'sales_rep').map(r => (
                <option key={r.id} value={r.id}>{r.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white border border-[#e8e7e5] p-1.5 gap-1.5 shadow-xs overflow-x-auto">
        {[
          {
            id: 'today',
            label: 'Today',
            count: todayList.length,
            color: 'text-[#f28705]',
            badgeColor: 'bg-[#fff4e6] text-[#f28705]'
          },
          {
            id: 'upcoming',
            label: 'Upcoming (Next 7 Days)',
            count: upcomingList.length,
            color: 'text-[#084ab8]',
            badgeColor: 'bg-[#eef4ff] text-[#084ab8]'
          },
          {
            id: 'overdue',
            label: 'Overdue Pending',
            count: overdueList.length,
            color: 'text-[#b85c00]',
            badgeColor: 'bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/40'
          },
          {
            id: 'completed',
            label: 'Completed / Handled',
            count: completedList.length,
            color: 'text-[#646260]',
            badgeColor: 'bg-[#f3f2f1] text-[#646260]'
          }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#eef4ff] text-[#084ab8] shadow-xs border border-[#084ab8]/20'
                : 'text-[#646260] hover:bg-[#fafaf9] hover:text-[#2d2b2a]'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tab.badgeColor}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Follow-ups List */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-white border border-[#e8e7e5] rounded-2xl p-12 text-center shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-[#084ab8] mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-[#2d2b2a]">No follow-ups in this tab</h3>
            <p className="text-xs text-[#646260] mt-1">
              You are completely caught up with your scheduled outreach in this section.
            </p>
          </div>
        ) : (
          currentList.map(lead => {
            const isOverdue = lead.next_action_date && lead.next_action_date < currentDateStr && lead.current_stage_name !== 'Not Interested';

            return (
              <div
                key={lead.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isOverdue ? 'border-[#f28705]/40 bg-[#fffbf7]' : 'border-[#e8e7e5]'
                }`}
              >
                {/* Left Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 uppercase">
                      {lead.product}
                    </span>
                    <h3
                      onClick={() => onSelectLead(lead)}
                      className="text-sm font-bold text-[#084ab8] hover:underline cursor-pointer"
                    >
                      {lead.school_name}
                    </h3>
                    <span className="text-xs text-[#646260] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#8e8b88]" />
                      {lead.location}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#2d2b2a] pt-1">
                    <div>
                      <span className="text-[10px] text-[#8e8b88] block uppercase">Contact Person</span>
                      <strong className="font-semibold">{lead.poc_name}</strong> ({lead.poc_designation})
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8e8b88] block uppercase">Contact Number</span>
                      <a href={`tel:${lead.poc_contact}`} className="text-[#084ab8] font-bold hover:underline">
                        {lead.poc_contact}
                      </a>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8e8b88] block uppercase">Assigned Consultant</span>
                      <span className="font-semibold">{lead.assigned_rep_name}</span>
                    </div>
                  </div>

                  {/* Scheduled Next Action Box */}
                  <div className="mt-2 p-2.5 rounded-xl bg-[#fafaf9] border border-[#e8e7e5] text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f28705] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Due: {lead.next_action_date || 'None'}
                      </span>
                      <span className="text-[10px] font-semibold text-[#646260]">
                        Current Stage: {lead.current_stage_name}
                      </span>
                    </div>
                    {lead.next_action_remarks && (
                      <p className="text-[#2d2b2a] mt-1 font-medium">
                        "{lead.next_action_remarks}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#f3f2f1]">
                  <div className="flex items-center gap-2">
                    {/* Call button */}
                    <a
                      href={`tel:${lead.poc_contact}`}
                      className="px-3 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-[#084ab8] hover:bg-[#eef4ff] text-[#084ab8] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${lead.poc_contact.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(lead.poc_name)},%20following%20up%20from%20AZVASA%20SalesTrack.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-[#f28705] hover:bg-[#fff4e6] text-[#b85c00] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#f28705]" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Log Activity */}
                    <button
                      onClick={() => onOpenAddInteraction(lead)}
                      className="px-3 py-1.5 rounded-xl bg-[#084ab8] hover:bg-[#06378a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Log Activity
                    </button>

                    {/* Reschedule */}
                    <button
                      onClick={() => {
                        setRescheduleLeadId(lead.id);
                        setNewDate(lead.next_action_date || '2026-09-22');
                        setNewRemarks(lead.next_action_remarks || '');
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-[#e8e7e5] hover:bg-[#f3f2f1] text-[#646260] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Reschedule Follow-up"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>

                    {/* Mark Done */}
                    <button
                      onClick={() => onMarkDone(lead.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-[#e8e7e5] hover:border-[#084ab8] hover:bg-[#eef4ff] text-[#084ab8] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Mark follow-up completed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Reschedule Dialog Modal */}
      {rescheduleLeadId && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#e8e7e5] shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#084ab8]">
                Reschedule Follow-up
              </h3>
              <button
                onClick={() => setRescheduleLeadId(null)}
                className="text-[#8e8b88] hover:text-[#2d2b2a]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  New Follow-up Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Updated Next Action Plan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call to finalize date for academic demonstration"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRescheduleLeadId(null)}
                className="flex-1 py-2 text-xs font-semibold text-[#646260] border border-[#e8e7e5] rounded-xl hover:bg-[#f3f2f1]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#084ab8] hover:bg-[#06378a] rounded-xl shadow-xs"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
