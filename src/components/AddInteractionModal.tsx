import React, { useState } from 'react';
import { Lead, PipelineStage, InteractionType, UserProfile, Interaction } from '../types';
import { X, MessageSquare, Calendar, User, FileText, Upload, CheckCircle2, Zap } from 'lucide-react';

interface AddInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  stages: PipelineStage[];
  currentUser: UserProfile;
  onSubmit: (interaction: Omit<Interaction, 'id' | 'created_at'>, updatedStageId?: string, nextDate?: string, nextRemarks?: string) => void;
}

export const AddInteractionModal: React.FC<AddInteractionModalProps> = ({
  isOpen,
  onClose,
  lead,
  stages,
  currentUser,
  onSubmit
}) => {
  if (!isOpen) return null;

  const [interactionType, setInteractionType] = useState<InteractionType>('Call');
  const [interactionDate, setInteractionDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [contactPerson, setContactPerson] = useState(lead.poc_name);
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [nextActionDate, setNextActionDate] = useState(lead.next_action_date || '');
  const [nextActionType, setNextActionType] = useState<InteractionType>('Meeting');
  const [nextActionRemarks, setNextActionRemarks] = useState(lead.next_action_remarks || '');
  const [newStageId, setNewStageId] = useState(lead.current_stage_id);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleAutoFillSample = () => {
    const samples = [
      {
        type: 'Call' as InteractionType,
        summary: `Connected with ${lead.poc_name} regarding ${lead.product} rollout timeline for next term. Management approved the teacher demo.`,
        followup: 'Submit the revised 3-year subscription commercial proposal with onboarding schedule.',
        nextDate: '2026-09-24',
        nextRemarks: 'Academic council online presentation and Q&A session.'
      },
      {
        type: 'Visit' as InteractionType,
        summary: `In-person campus visit conducted at ${lead.school_name}. Inspected computer labs and met with academic coordinators.`,
        followup: 'Principal requested references from top 3 affiliated schools using IntelliRead.',
        nextDate: '2026-09-23',
        nextRemarks: 'Deliver printed workbooks and sample curriculum integration kit.'
      },
      {
        type: 'Demo' as InteractionType,
        summary: `Completed 45-minute live platform demonstration to 12 faculty members. Positive feedback on student tracking dashboards.`,
        followup: 'Preparing formal agreement documentation and MOU draft.',
        nextDate: '2026-09-22',
        nextRemarks: 'Executive board sign-off meeting.'
      }
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setInteractionType(picked.type);
    setDiscussionSummary(picked.summary);
    setFollowUpRemarks(picked.followup);
    setNextActionDate(picked.nextDate);
    setNextActionRemarks(picked.nextRemarks);
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachmentName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionSummary.trim()) {
      setError('Discussion summary is required.');
      return;
    }

    const stage = stages.find(s => s.id === newStageId);

    onSubmit(
      {
        lead_id: lead.id,
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        interaction_type: interactionType,
        interaction_date: interactionDate,
        contact_person: contactPerson.trim() || lead.poc_name,
        discussion_summary: discussionSummary.trim(),
        follow_up_remarks: followUpRemarks.trim() || discussionSummary.trim(),
        next_action_date: nextActionDate || '',
        next_action_remarks: nextActionRemarks.trim() || '',
        next_action_type: nextActionType,
        attachment_url: attachmentName ? `/uploads/${attachmentName}` : undefined,
        attachment_name: attachmentName || undefined,
        stage_at_interaction: stage?.name || lead.current_stage_name
      },
      newStageId !== lead.current_stage_id ? newStageId : undefined,
      nextActionDate || undefined,
      nextActionRemarks.trim() || undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#e8e7e5] shadow-2xl overflow-hidden my-6 animate-scaleIn">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e7e5] bg-[#fafaf9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#084ab8]">
                Log Sales Activity / Follow-up
              </h2>
              <p className="text-xs text-[#646260]">
                {lead.school_name} • POC: {lead.poc_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillSample}
              className="py-1.5 px-2.5 rounded-xl bg-[#eef4ff] hover:bg-[#dbe7ff] text-[#084ab8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#bcd7ff]"
              title="Populate discussion and follow-up with realistic sample values"
            >
              <Zap className="w-3.5 h-3.5 fill-[#f28705] text-[#f28705]" />
              Auto-Fill Sample
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#646260] hover:text-[#2d2b2a] hover:bg-[#f3f2f1] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-[#fff4e6] border border-[#b85c00] text-xs text-[#b85c00] font-medium">
              {error}
            </div>
          )}

          {/* Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                Interaction Type <span className="text-[#f28705]">*</span>
              </label>
              <select
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
              >
                <option value="Call">Call</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Visit">School Visit</option>
                <option value="Demo">Product Demo</option>
                <option value="Proposal">Proposal Shared</option>
                <option value="Meeting">Formal Meeting</option>
                <option value="Notes">Internal Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                Date & Time <span className="text-[#f28705]">*</span>
              </label>
              <input
                type="datetime-local"
                value={interactionDate}
                onChange={(e) => setInteractionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
              Contact Person Met / Spoken With
            </label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Dr. Ramesh Rao (Principal)"
              className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            />
          </div>

          {/* Discussion Summary */}
          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
              Discussion Summary <span className="text-[#f28705]">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Provide specific notes regarding requirements, feedback on curriculum, teacher availability, etc."
              value={discussionSummary}
              onChange={(e) => setDiscussionSummary(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            />
          </div>

          {/* Follow-up Remarks */}
          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
              Follow-up Remarks / Agreed Deliverables
            </label>
            <input
              type="text"
              placeholder="e.g. Needs revised commercial proposal with batch discounting"
              value={followUpRemarks}
              onChange={(e) => setFollowUpRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            />
          </div>

          {/* Update Stage & Next Action */}
          <div className="p-3.5 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block">
              Stage Transition & Follow-up Commitment
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Update Pipeline Stage
                </label>
                <select
                  value={newStageId}
                  onChange={(e) => setNewStageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.id === lead.current_stage_id ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Next Action Type
                </label>
                <select
                  value={nextActionType}
                  onChange={(e) => setNextActionType(e.target.value as InteractionType)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  <option value="Meeting">Meeting / Visit</option>
                  <option value="Demo">Product Demo</option>
                  <option value="Proposal">Commercial Proposal</option>
                  <option value="Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp Check-in</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Next Action Date
                </label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Next Action Plan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule pilot session with HOD"
                  value={nextActionRemarks}
                  onChange={(e) => setNextActionRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>
            </div>
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
              Upload Attachment (MOM / Proposal / Documents)
            </label>
            <div className="border border-dashed border-[#e8e7e5] rounded-xl p-3 text-center bg-white hover:bg-[#fafaf9] transition-colors cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center gap-2 text-xs text-[#646260]">
                <Upload className="w-4 h-4 text-[#084ab8]" />
                {attachmentName ? (
                  <span className="font-semibold text-[#084ab8]">{attachmentName}</span>
                ) : (
                  <span>Click or drag to attach PDF, Word MOM, or signed agreement</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e8e7e5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#646260] hover:bg-[#f3f2f1] rounded-xl border border-[#e8e7e5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#084ab8] hover:bg-[#06378a] rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Log Interaction
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
