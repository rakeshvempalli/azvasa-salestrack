import React, { useState } from 'react';
import { Lead, PipelineStage, UserProfile, Interaction, PipelineHistory, InternalNote, FollowupTask } from '../types';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Building2,
  User,
  Clock,
  ArrowRight,
  Send,
  FileText,
  Paperclip,
  CheckCircle2,
  Circle,
  AlertTriangle,
  History,
  ShieldCheck,
  Edit,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  stages: PipelineStage[];
  reps: UserProfile[];
  currentUser: UserProfile;
  interactions: Interaction[];
  pipelineHistories: PipelineHistory[];
  notes: InternalNote[];
  tasks: FollowupTask[];
  onOpenAddInteraction: (lead: Lead) => void;
  onOpenEditLead: (lead: Lead) => void;
  onStageChange: (leadId: string, newStageId: string) => void;
  onReassignLead: (leadId: string, newRepId: string) => void;
  onAddNote: (leadId: string, content: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (leadId: string, title: string, dueDate: string, priority: 'Low' | 'Medium' | 'High') => void;
  onDeleteLead?: (leadId: string) => { success: boolean; error?: string } | void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  stages,
  reps,
  currentUser,
  interactions,
  pipelineHistories,
  notes,
  tasks,
  onOpenAddInteraction,
  onOpenEditLead,
  onStageChange,
  onReassignLead,
  onAddNote,
  onToggleTask,
  onAddTask,
  onDeleteLead
}) => {
  if (!isOpen) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isNotInterested = 
    lead.current_stage_name?.trim().toLowerCase() === 'not interested' ||
    lead.current_stage_id === 'stage-lost' ||
    lead.current_stage_id === 'stage-not-interested';

  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'history' | 'notes' | 'tasks'>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // WhatsApp template modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'intro' | 'followup' | 'demo' | 'proposal'>('followup');

  // New Note state
  const [newNoteContent, setNewNoteContent] = useState('');

  // New Task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('2026-09-20');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Active reps for reassignment
  const activeReps = reps.filter(r => r.role === 'sales_rep' && r.status === 'active');

  // Filtered interactions & histories for this lead
  const leadInteractions = interactions
    .filter(i => i.lead_id === lead.id)
    .sort((a, b) => new Date(b.interaction_date).getTime() - new Date(a.interaction_date).getTime());

  const leadHistories = pipelineHistories
    .filter(h => h.lead_id === lead.id)
    .sort((a, b) => new Date(b.changed_at || b.created_at || '').getTime() - new Date(a.changed_at || a.created_at || '').getTime());

  const leadNotes = notes
    .filter(n => n.lead_id === lead.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const leadTasks = tasks
    .filter(t => t.lead_id === lead.id)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // WhatsApp Message Generator
  const generateWhatsAppURL = () => {
    const cleanPhone = lead.poc_contact.replace(/[^0-9]/g, '');
    let text = '';

    switch (selectedTemplate) {
      case 'intro':
        text = `Greetings ${lead.poc_name}, I am ${currentUser.full_name} from AZVASA Edutech. We empower educational institutions with innovative academic solutions such as ${lead.product}. Would you have 10 minutes this week for a brief walkthrough?`;
        break;
      case 'followup':
        text = `Dear ${lead.poc_name}, following up on our recent discussion regarding AZVASA ${lead.product} for ${lead.school_name}. Please let us know when would be a convenient time to take this forward. Best regards, ${currentUser.full_name} (AZVASA).`;
        break;
      case 'demo':
        text = `Dear ${lead.poc_name}, this is to confirm our product demonstration of AZVASA ${lead.product} scheduled for ${lead.school_name}. Looking forward to presenting our capabilities to your leadership team.`;
        break;
      case 'proposal':
        text = `Dear ${lead.poc_name}, we have shared the official AZVASA proposal for ${lead.product} tailored for ${lead.school_name}. Please review the document and feel free to reach out if you require any adjustments.`;
        break;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    onAddNote(lead.id, newNoteContent.trim());
    setNewNoteContent('');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(lead.id, newTaskTitle.trim(), newTaskDate, newTaskPriority);
    setNewTaskTitle('');
    setShowTaskForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-[#e8e7e5] shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh] animate-scaleIn">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#e8e7e5] bg-[#fafaf9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 uppercase">
                {lead.product}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#084ab8]">
                {lead.school_name}
              </h2>
            </div>
            <p className="text-xs text-[#646260] flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#8e8b88]" />
                {lead.location}
              </span>
              <span>•</span>
              <span>Assigned: <strong className="text-[#2d2b2a]">{lead.assigned_rep_name}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isSuperAdmin && isNotInterested && (
              <button
                onClick={() => setShowDeleteModal(true)}
                title="Permanently delete this Not Interested school"
                className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete School</span>
              </button>
            )}
            <button
              onClick={() => onOpenEditLead(lead)}
              className="p-2 rounded-xl border border-[#e8e7e5] text-[#646260] hover:text-[#084ab8] hover:bg-[#eef4ff] text-xs font-semibold flex items-center gap-1"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Not Interested Deletion Notice Banner for Super Admin */}
        {isSuperAdmin && isNotInterested && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-red-900 font-bold block">
                  Stage: Not Interested — Eligible for Super Admin Deletion
                </strong>
                <span className="text-red-700 text-[11px] leading-relaxed">
                  This institution has been marked as Not Interested. As Super Admin, you are permitted to permanently purge this record and its interaction timeline.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete School Record</span>
            </button>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-[#e8e7e5] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            {/* Call */}
            <a
              href={`tel:${lead.poc_contact}`}
              className="px-3 py-1.5 rounded-lg border border-[#e8e7e5] hover:border-[#084ab8] hover:bg-[#eef4ff] text-[#084ab8] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call ({lead.poc_contact})</span>
            </a>

            {/* WhatsApp */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="px-3 py-1.5 rounded-lg border border-[#e8e7e5] hover:border-[#f28705] hover:bg-[#fff4e6] text-[#b85c00] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#f28705]" />
              <span>WhatsApp</span>
            </button>

            {/* Log Activity */}
            <button
              onClick={() => onOpenAddInteraction(lead)}
              className="px-3 py-1.5 rounded-lg bg-[#084ab8] hover:bg-[#06378a] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>+ Log Activity</span>
            </button>
          </div>

          {/* Quick Stage Mover & Reassignment */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-semibold text-[#646260] hidden md:inline">Stage:</span>
              <select
                value={lead.current_stage_id}
                onChange={(e) => onStageChange(lead.id, e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold border border-[#084ab8] text-[#084ab8] rounded-lg bg-[#eef4ff] focus:outline-none"
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Reassign Lead (Admin only per requirements) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[11px] font-semibold text-[#646260] hidden lg:inline">Reassign:</span>
                <select
                  value={lead.assigned_rep_id}
                  onChange={(e) => onReassignLead(lead.id, e.target.value)}
                  className="px-2 py-1 text-xs border border-[#e8e7e5] text-[#2d2b2a] rounded-lg bg-white focus:outline-none"
                >
                  {activeReps.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#e8e7e5] bg-[#fafaf9] px-5 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'interactions', label: `Interactions (${leadInteractions.length})` },
            { id: 'history', label: `Pipeline Flow (${leadHistories.length})` },
            { id: 'notes', label: `Team Notes (${leadNotes.length})` },
            { id: 'tasks', label: `Tasks & Follow-ups (${leadTasks.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#084ab8] text-[#084ab8] bg-white'
                  : 'border-transparent text-[#646260] hover:text-[#2d2b2a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Institution Info */}
                <div className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#084ab8] block">
                    Institution Details
                  </span>
                  <div>
                    <span className="text-[11px] text-[#646260] block">School Name</span>
                    <strong className="text-xs text-[#2d2b2a]">{lead.school_name}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#646260] block">Location / City</span>
                    <strong className="text-xs text-[#2d2b2a]">{lead.location}</strong>
                  </div>
                </div>

                {/* POC Info */}
                <div className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#084ab8] block">
                    Key Stakeholder / POC
                  </span>
                  <div>
                    <span className="text-[11px] text-[#646260] block">Name & Role</span>
                    <strong className="text-xs text-[#2d2b2a]">{lead.poc_name} ({lead.poc_designation})</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#646260] block">Contact Number</span>
                    <a href={`tel:${lead.poc_contact}`} className="text-xs font-bold text-[#084ab8] hover:underline">
                      {lead.poc_contact}
                    </a>
                  </div>
                </div>

                {/* Pipeline & Product */}
                <div className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#084ab8] block">
                    Commercial & Pipeline
                  </span>
                  <div>
                    <span className="text-[11px] text-[#646260] block">Target Product</span>
                    <strong className="text-xs text-[#2d2b2a]">
                      {lead.product} {lead.other_product ? `(${lead.other_product})` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#646260] block">Lead Source</span>
                    <strong className="text-xs text-[#2d2b2a]">
                      {lead.lead_source} {lead.channel_partner_name ? `(${lead.channel_partner_name})` : ''}
                    </strong>
                  </div>
                </div>

              </div>

              {/* Next Action Box */}
              <div className="p-4 rounded-xl border border-[#f28705]/40 bg-[#fffbf7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#b85c00] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Scheduled Next Action
                  </span>
                  <div className="mt-1">
                    <span className="text-xs font-bold text-[#2d2b2a]">
                      {lead.next_action_date || 'No follow-up date currently scheduled'}
                    </span>
                    {lead.next_action_remarks && (
                      <p className="text-xs text-[#646260] mt-0.5">
                        Remarks: {lead.next_action_remarks}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onOpenAddInteraction(lead)}
                  className="px-3 py-1.5 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-lg text-xs font-semibold shrink-0"
                >
                  Schedule / Update
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIONS */}
          {activeTab === 'interactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#084ab8] uppercase tracking-wider">
                  Timeline of Activities & Discussions
                </h3>
                <button
                  onClick={() => onOpenAddInteraction(lead)}
                  className="px-3 py-1 bg-[#084ab8] text-white rounded-lg text-xs font-semibold"
                >
                  + Add Interaction
                </button>
              </div>

              {leadInteractions.length === 0 ? (
                <div className="p-8 text-center bg-[#fafaf9] rounded-xl border border-[#e8e7e5]">
                  <MessageSquare className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#2d2b2a]">No interactions logged yet</p>
                  <p className="text-[11px] text-[#646260] mt-0.5">Log calls, demos, or meetings to maintain an audit trail.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadInteractions.map(interaction => (
                    <div
                      key={interaction.id}
                      className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-2 hover:bg-white transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                            {interaction.interaction_type}
                          </span>
                          <span className="text-xs font-bold text-[#2d2b2a]">
                            With: {interaction.contact_person}
                          </span>
                          <span className="text-[11px] text-[#8e8b88]">
                            • Logged by {interaction.created_by_name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#646260]">
                          {interaction.interaction_date.replace('T', ' ')}
                        </span>
                      </div>

                      <p className="text-xs text-[#2d2b2a] bg-white p-3 rounded-lg border border-[#e8e7e5] leading-relaxed">
                        {interaction.discussion_summary}
                      </p>

                      {interaction.follow_up_remarks && (
                        <div className="text-[11px] text-[#646260]">
                          <strong className="text-[#f28705]">Agreed Next Steps: </strong>
                          {interaction.follow_up_remarks}
                        </div>
                      )}

                      {interaction.attachment_name && (
                        <div className="flex items-center gap-1.5 text-xs text-[#084ab8] font-medium pt-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attachment: {interaction.attachment_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PIPELINE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#084ab8] uppercase tracking-wider">
                Stage Movement Audit Trail
              </h3>

              {leadHistories.length === 0 ? (
                <div className="p-8 text-center bg-[#fafaf9] rounded-xl border border-[#e8e7e5]">
                  <History className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#2d2b2a]">No stage transitions recorded yet</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 border-l-2 border-[#e8e7e5] ml-2">
                  {leadHistories.map(h => (
                    <div key={h.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#084ab8] border-2 border-white shadow-xs" />
                      <div className="p-3 rounded-xl border border-[#e8e7e5] bg-[#fafaf9]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold text-[#646260]">
                            {h.from_stage_name ? `${h.from_stage_name} → ` : 'Initial Lead: '}
                          </span>
                          <strong className="text-xs text-[#084ab8] font-bold">
                            {h.to_stage_name}
                          </strong>
                          <span className="text-[10px] text-[#8e8b88]">
                            • {new Date(h.changed_at || h.created_at || '').toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#646260] block mt-1">
                          Transitioned by {h.changed_by_name}
                        </span>
                        {h.notes && (
                          <p className="text-xs text-[#2d2b2a] mt-1 italic">
                            "{h.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: INTERNAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleCreateNote} className="space-y-2 bg-[#fafaf9] p-4 rounded-xl border border-[#e8e7e5]">
                <label className="block text-xs font-semibold text-[#2d2b2a]">
                  Add Internal Team Note (Confidential)
                </label>
                <textarea
                  rows={2}
                  placeholder="Record stakeholder inclinations, pricing flexibility, competitive presence..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#084ab8] text-white rounded-lg text-xs font-semibold hover:bg-[#06378a]"
                  >
                    Post Note
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2.5">
                {leadNotes.map(note => (
                  <div key={note.id} className="p-3 rounded-xl border border-[#e8e7e5] bg-white text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#646260] mb-1">
                      <strong className="text-[#2d2b2a]">{note.created_by_name}</strong>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-[#2d2b2a] leading-relaxed">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TASKS / FOLLOW-UPS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#084ab8] uppercase tracking-wider">
                  Checklist & Action Deliverables
                </h3>
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="px-3 py-1 bg-[#084ab8] text-white rounded-lg text-xs font-semibold"
                >
                  {showTaskForm ? 'Cancel' : '+ New Task'}
                </button>
              </div>

              {showTaskForm && (
                <form onSubmit={handleCreateTask} className="p-4 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">Task Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Courier sample IntelliRead teacher kits"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newTaskDate}
                        onChange={(e) => setNewTaskDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#084ab8] text-white rounded-lg text-xs font-semibold hover:bg-[#06378a]"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              {leadTasks.length === 0 ? (
                <div className="p-8 text-center bg-[#fafaf9] rounded-xl border border-[#e8e7e5]">
                  <CheckCircle2 className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#2d2b2a]">No tasks pending</p>
                  <p className="text-[11px] text-[#646260] mt-0.5">Create action items to keep the follow-up cadence structured.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leadTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className={`p-3 rounded-xl border transition-colors flex items-center justify-between cursor-pointer ${
                        task.status === 'Completed'
                          ? 'bg-[#f3f2f1] border-[#e8e7e5] opacity-75'
                          : 'bg-white border-[#e8e7e5] hover:border-[#084ab8]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {task.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#084ab8]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#8e8b88]" />
                        )}
                        <div>
                          <span className={`text-xs font-semibold ${task.status === 'Completed' ? 'line-through text-[#646260]' : 'text-[#2d2b2a]'}`}>
                            {task.title}
                          </span>
                          <span className="text-[10px] text-[#8e8b88] block">
                            Due: {task.due_date} • Assigned to {task.assigned_to_name}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.priority === 'High'
                            ? 'bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/40'
                            : 'bg-[#eef4ff] text-[#084ab8]'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* WhatsApp Template Generator Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#e8e7e5] shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#f28705]" />
                <h3 className="text-sm font-bold text-[#084ab8]">
                  WhatsApp Outreach Assistant
                </h3>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-[#646260] hover:text-[#2d2b2a] text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#646260]">
              Select a pre-filled professional template configured for {lead.school_name}:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'intro', label: '1. Introduction' },
                { id: 'followup', label: '2. Follow-up' },
                { id: 'demo', label: '3. Demo Confirmation' },
                { id: 'proposal', label: '4. Proposal Shared' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id as any)}
                  className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-colors ${
                    selectedTemplate === t.id
                      ? 'border-[#084ab8] bg-[#eef4ff] text-[#084ab8]'
                      : 'border-[#e8e7e5] bg-white text-[#646260] hover:bg-[#fafaf9]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Preview Box */}
            <div className="p-3 bg-[#fafaf9] rounded-xl border border-[#e8e7e5] text-xs text-[#2d2b2a] italic">
              "
              {selectedTemplate === 'intro' && `Greetings ${lead.poc_name}, I am ${currentUser.full_name} from AZVASA Edutech. We empower educational institutions with innovative academic solutions such as ${lead.product}...`}
              {selectedTemplate === 'followup' && `Dear ${lead.poc_name}, following up on our recent discussion regarding AZVASA ${lead.product} for ${lead.school_name}...`}
              {selectedTemplate === 'demo' && `Dear ${lead.poc_name}, this is to confirm our product demonstration of AZVASA ${lead.product} scheduled for ${lead.school_name}...`}
              {selectedTemplate === 'proposal' && `Dear ${lead.poc_name}, we have shared the official AZVASA proposal for ${lead.product} tailored for ${lead.school_name}...`}
              "
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 py-2 px-3 border border-[#e8e7e5] rounded-xl text-xs font-semibold text-[#646260]"
              >
                Cancel
              </button>
              <a
                href={generateWhatsAppURL()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppModal(false)}
                className="flex-1 py-2 px-3 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <span>Launch WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete School Confirmation Modal (Super Admin only for Not Interested) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-950">
                  Delete School Record Permanently
                </h3>
                <span className="text-xs text-[#646260]">
                  Super Admin Authorized Action
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#fafaf9] rounded-xl border border-[#e8e7e5] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">School Name:</span>
                <strong className="text-[#2d2b2a]">{lead.school_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Location:</span>
                <span className="text-[#2d2b2a]">{lead.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Current Stage:</span>
                <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {lead.current_stage_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Assigned Rep:</span>
                <span className="text-[#2d2b2a]">{lead.assigned_rep_name || 'Unassigned'}</span>
              </div>
            </div>

            <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 leading-relaxed">
              <strong>Warning:</strong> This will permanently erase <strong>{lead.school_name}</strong> and all linked activity records, stage logs, and notes from AZVASA SalesTrack. This action is irreversible.
            </p>

            {deleteError && (
              <div className="p-2.5 bg-red-100 border border-red-300 rounded-xl text-xs text-red-800 font-medium">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="flex-1 py-2 px-3 border border-[#e8e7e5] rounded-xl text-xs font-semibold text-[#646260] hover:bg-[#f3f2f1] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLead) {
                    const res = onDeleteLead(lead.id);
                    if (res && !res.success) {
                      setDeleteError(res.error || 'Failed to delete school.');
                      return;
                    }
                  }
                  setShowDeleteModal(false);
                  onClose();
                }}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
