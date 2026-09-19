import React, { useState } from 'react';
import { Lead, UserProfile, ReminderLog } from '../types';
import { AZVASALogo } from './AZVASALogo';
import { MailCheck, Send, Clock, Calendar, CheckCircle2, AlertCircle, Building2, User, Phone } from 'lucide-react';

interface AdminRemindersViewProps {
  leads: Lead[];
  reps: UserProfile[];
  reminderLogs: ReminderLog[];
  onTriggerScan: () => void;
}

export const AdminRemindersView: React.FC<AdminRemindersViewProps> = ({
  leads,
  reps,
  reminderLogs,
  onTriggerScan
}) => {
  // Tomorrow reference date: 2026-09-20
  const tomorrowStr = '2026-09-20';
  const upcomingReminders = leads.filter(l => l.next_action_date === tomorrowStr);

  const [selectedLead, setSelectedLead] = useState<Lead>(upcomingReminders[0] || leads[0]);
  const [testSent, setTestSent] = useState(false);

  const assignedRep = reps.find(r => r.id === selectedLead?.assigned_rep_id);

  const handleSendTestEmail = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8] flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-[#f28705]" />
            Automated 1-Day Prior Email Reminder Service
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Dispatches branded HTML email notifications to assigned representatives exactly 24 hours prior to scheduled action dates
          </p>
        </div>

        <button
          onClick={onTriggerScan}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Execute Daily Reminder Scan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Queue & History (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Queue for Tomorrow */}
          <div className="bg-white border border-[#e8e7e5] rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#084ab8] uppercase tracking-wider">
                Tomorrow's Scheduled Queue (Sep 20)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#fff4e6] text-[#f28705] border border-[#f28705]/30">
                {upcomingReminders.length} Due
              </span>
            </div>

            {upcomingReminders.length === 0 ? (
              <p className="text-xs text-[#646260] py-4 text-center">
                No follow-ups due tomorrow.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingReminders.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id
                        ? 'border-[#084ab8] bg-[#eef4ff]'
                        : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-[#2d2b2a]">{lead.school_name}</strong>
                      <span className="text-[10px] text-[#646260]">{lead.current_stage_name}</span>
                    </div>
                    <span className="text-[11px] text-[#084ab8] block mt-0.5">
                      Rep: {lead.assigned_rep_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Dispatched Logs */}
          <div className="bg-white border border-[#e8e7e5] rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-bold text-[#646260] uppercase tracking-wider mb-3">
              Recent Reminder Dispatch Log
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {reminderLogs.map(log => (
                <div key={log.id} className="p-2.5 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#2d2b2a]">{log.school_name}</strong>
                    <span className="text-[10px] font-bold text-[#084ab8] bg-[#eef4ff] px-1.5 py-0.2 rounded">
                      Sent
                    </span>
                  </div>
                  <div className="text-[11px] text-[#646260] mt-0.5">
                    To: {log.rep_email || log.recipient_email} • {log.next_action_date || log.scheduled_date}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Exact HTML Email Template Preview (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#e8e7e5] bg-[#fafaf9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#084ab8]">
                  Official AZVASA Email Template Preview
                </span>
              </div>
              <button
                onClick={handleSendTestEmail}
                className="px-3 py-1 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-lg text-xs font-semibold"
              >
                Send Test Email Now
              </button>
            </div>

            {testSent && (
              <div className="p-3 bg-[#eef4ff] border-b border-[#084ab8]/20 text-xs text-[#084ab8] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Test email reminder dispatched to {assignedRep?.email || 'sales rep'}!</span>
              </div>
            )}

            {/* Email Container (Styled strictly in AZVASA brand palette per requirements) */}
            <div className="p-6 md:p-8 bg-[#fafaf9] flex justify-center">
              <div className="max-w-lg w-full bg-white border border-[#e8e7e5] rounded-2xl shadow-sm overflow-hidden text-left">
                
                {/* Email Header */}
                <div className="p-6 border-b border-[#f3f2f1] text-center flex flex-col items-center bg-white">
                  <AZVASALogo variant="email" className="mb-2" />
                  <span className="text-xs font-bold text-[#084ab8] tracking-wide">
                    SalesTrack Automated Reminder
                  </span>
                  <p className="text-[10px] text-[#646260]">
                    Follow-up Action Scheduled for Tomorrow
                  </p>
                </div>

                {/* Email Content */}
                <div className="p-6 space-y-4 text-xs text-[#2d2b2a]">
                  <p className="leading-relaxed">
                    Hello <strong className="text-[#084ab8]">{selectedLead?.assigned_rep_name || 'Representative'}</strong>,
                  </p>
                  <p className="text-[#646260] leading-relaxed">
                    This is an automated priority reminder regarding your upcoming institutional engagement scheduled for tomorrow,{' '}
                    <strong className="text-[#2d2b2a]">{selectedLead?.next_action_date || '2026-09-20'}</strong>.
                  </p>

                  {/* School Account Card inside email */}
                  <div className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#084ab8]">
                        School Account
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4ff] text-[#084ab8]">
                        {selectedLead?.current_stage_name}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#084ab8]">
                      {selectedLead?.school_name}
                    </h4>

                    <div className="space-y-1 text-[11px] text-[#646260] pt-1 border-t border-[#e8e7e5]">
                      <div>
                        <strong>Location: </strong> {selectedLead?.location}
                      </div>
                      <div>
                        <strong>Key POC: </strong> {selectedLead?.poc_name} ({selectedLead?.poc_designation})
                      </div>
                      <div>
                        <strong>Contact: </strong>{' '}
                        <a href={`tel:${selectedLead?.poc_contact}`} className="text-[#084ab8] font-bold">
                          {selectedLead?.poc_contact}
                        </a>
                      </div>
                      <div>
                        <strong>Curriculum Product: </strong> {selectedLead?.product}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Action Box */}
                  <div className="p-3.5 rounded-xl border border-[#f28705]/40 bg-[#fff4e6] text-[#2d2b2a]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#b85c00] block mb-1">
                      Scheduled Action & Objectives
                    </span>
                    <p className="font-semibold text-xs">
                      {selectedLead?.next_action_remarks || 'Conduct curriculum walkthrough and address board requirements.'}
                    </p>
                  </div>

                  <div className="pt-2 text-center">
                    <a
                      href="#view-lead"
                      className="inline-block px-5 py-2.5 bg-[#084ab8] text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Open Account in SalesTrack
                    </a>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="p-4 bg-[#fafaf9] border-t border-[#e8e7e5] text-center text-[10px] text-[#8e8b88] space-y-0.5">
                  <p>© 2026 Azvasa Education. All rights reserved.</p>
                  <p>Confidential sales management communication for authorized representatives.</p>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
