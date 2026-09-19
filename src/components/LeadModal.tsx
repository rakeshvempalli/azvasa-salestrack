import React, { useState } from 'react';
import { Lead, PipelineStage, UserProfile, LeadSource, ProductType } from '../types';
import { X, AlertCircle, Building2, User, Phone, MapPin, Briefcase, Zap } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => void;
  existingLead?: Lead | null;
  stages: PipelineStage[];
  reps: UserProfile[];
  currentUser: UserProfile;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingLead,
  stages,
  reps,
  currentUser
}) => {
  if (!isOpen) return null;

  // Active reps only for assignment (per requirement: "Only active sales representatives can receive new leads.")
  const activeReps = reps.filter(r => r.role === 'sales_rep' && r.status === 'active');
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Form states
  const [schoolName, setSchoolName] = useState(existingLead?.school_name || '');
  const [location, setLocation] = useState(existingLead?.location || '');
  const [pocName, setPocName] = useState(existingLead?.poc_name || '');
  const [pocDesignation, setPocDesignation] = useState(existingLead?.poc_designation || '');
  const [pocContact, setPocContact] = useState(existingLead?.poc_contact || '');
  const [leadSource, setLeadSource] = useState<LeadSource>(existingLead?.lead_source || 'Direct');
  const [channelPartnerName, setChannelPartnerName] = useState(existingLead?.channel_partner_name || '');
  const [product, setProduct] = useState<ProductType>(existingLead?.product || 'INTELLIREAD');
  const [otherProduct, setOtherProduct] = useState(existingLead?.other_product || '');
  const [assignedRepId, setAssignedRepId] = useState(
    existingLead?.assigned_rep_id || (isSuperAdmin ? (activeReps[0]?.id || '') : currentUser.id)
  );
  const [currentStageId, setCurrentStageId] = useState(
    existingLead?.current_stage_id || stages[0]?.id || 'stage-1'
  );
  const [nextActionDate, setNextActionDate] = useState(existingLead?.next_action_date || '');
  const [nextActionRemarks, setNextActionRemarks] = useState(existingLead?.next_action_remarks || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAutoFillSample = () => {
    const samples = [
      {
        school: 'Heritage International Academy',
        loc: 'Indiranagar, Bengaluru, Karnataka',
        poc: 'Dr. Sunita Rao',
        desig: 'Director of Academics',
        contact: '+91 98451 22334 / s.rao@heritage-academy.edu.in',
        source: 'Direct' as LeadSource,
        prod: 'INTELLIREAD' as ProductType,
        remarks: 'Demonstration of interactive reading labs scheduled for teachers',
        nextDate: '2026-09-24'
      },
      {
        school: 'Oakridge Global High School',
        loc: 'Gachibowli, Hyderabad, Telangana',
        poc: 'Fr. Thomas Mathew',
        desig: 'Principal',
        contact: '+91 98452 77889 / principal@oakridge-global.in',
        source: 'Channel Partner' as LeadSource,
        partner: 'EdVentures South Network',
        prod: 'ASP' as ProductType,
        remarks: 'Reviewing proposal for AI-assisted STEM classroom labs',
        nextDate: '2026-09-22'
      },
      {
        school: 'Delhi Public Grammar School',
        loc: 'Vijay Nagar, Indore, Madhya Pradesh',
        poc: 'Mrs. Meenakshi Sundaram',
        desig: 'Vice Principal',
        contact: '+91 98453 55667 / vp@dpgs-indore.ac.in',
        source: 'TCE' as LeadSource,
        prod: 'FOFO' as ProductType,
        remarks: 'FOFO curriculum integration discussion with management trust board',
        nextDate: '2026-09-21'
      }
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    setSchoolName(picked.school);
    setLocation(picked.loc);
    setPocName(picked.poc);
    setPocDesignation(picked.desig);
    setPocContact(picked.contact);
    setLeadSource(picked.source);
    if (picked.partner) setChannelPartnerName(picked.partner);
    setProduct(picked.prod);
    setNextActionDate(picked.nextDate);
    setNextActionRemarks(picked.remarks);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!schoolName.trim()) errs.schoolName = 'School Name is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (!pocName.trim()) errs.pocName = 'POC Name is required';
    if (!pocDesignation.trim()) errs.pocDesignation = 'POC Designation is required';
    if (!pocContact.trim()) errs.pocContact = 'POC Contact phone/email is required';

    if (leadSource === 'Channel Partner' && !channelPartnerName.trim()) {
      errs.channelPartnerName = 'Channel Partner Name is required when source is Channel Partner';
    }

    if (product === 'Others' && !otherProduct.trim()) {
      errs.otherProduct = 'Please specify the educational product';
    }

    if (!assignedRepId) {
      errs.assignedRepId = 'An active sales representative must be assigned';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const rep = reps.find(r => r.id === assignedRepId);
    const stage = stages.find(s => s.id === currentStageId);

    onSubmit({
      school_name: schoolName.trim(),
      location: location.trim(),
      poc_name: pocName.trim(),
      poc_designation: pocDesignation.trim(),
      poc_contact: pocContact.trim(),
      lead_source: leadSource,
      channel_partner_name: leadSource === 'Channel Partner' ? channelPartnerName.trim() : undefined,
      product,
      other_product: product === 'Others' ? otherProduct.trim() : undefined,
      assigned_rep_id: assignedRepId,
      assigned_rep_name: rep?.full_name || 'Unassigned',
      current_stage_id: currentStageId,
      current_stage_name: stage?.name || 'Lead',
      next_action_date: nextActionDate || undefined,
      next_action_remarks: nextActionRemarks.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#e8e7e5] shadow-2xl overflow-hidden my-8 animate-scaleIn">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8e7e5] flex items-center justify-between bg-[#fafaf9]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#084ab8]">
                {existingLead ? 'Edit School Account' : 'Add New School Lead'}
              </h2>
              <p className="text-xs text-[#646260]">
                Enter prospective school profile and assign academic sales consultant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!existingLead && (
              <button
                type="button"
                onClick={handleAutoFillSample}
                className="py-1.5 px-2.5 rounded-xl bg-[#eef4ff] hover:bg-[#dbe7ff] text-[#084ab8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#bcd7ff]"
                title="Populate all fields with ready-to-save sample values"
              >
                <Zap className="w-3.5 h-3.5 fill-[#f28705] text-[#f28705]" />
                Auto-Fill Sample Lead
              </button>
            )}
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
          
          {/* Section 1: Institution Details */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block mb-2">
              1. Institution Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  School Name <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Public School, Bangalore"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                    errors.schoolName ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                  }`}
                />
                {errors.schoolName && <p className="text-[10px] text-[#b85c00] mt-1">{errors.schoolName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Location / City <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarjapur Road, Bangalore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                    errors.location ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                  }`}
                />
                {errors.location && <p className="text-[10px] text-[#b85c00] mt-1">{errors.location}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Key Stakeholder / POC Details */}
          <div className="pt-2 border-t border-[#f3f2f1]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block mb-2">
              2. Point of Contact (POC)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  POC Name <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ramesh Rao"
                  value={pocName}
                  onChange={(e) => setPocName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                    errors.pocName ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                  }`}
                />
                {errors.pocName && <p className="text-[10px] text-[#b85c00] mt-1">{errors.pocName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  POC Designation <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Principal / Trustee"
                  value={pocDesignation}
                  onChange={(e) => setPocDesignation(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                    errors.pocDesignation ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                  }`}
                />
                {errors.pocDesignation && <p className="text-[10px] text-[#b85c00] mt-1">{errors.pocDesignation}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  POC Contact Number <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98450 XXXXX"
                  value={pocContact}
                  onChange={(e) => setPocContact(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                    errors.pocContact ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                  }`}
                />
                {errors.pocContact && <p className="text-[10px] text-[#b85c00] mt-1">{errors.pocContact}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Lead Source & Educational Product */}
          <div className="pt-2 border-t border-[#f3f2f1]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block mb-2">
              3. Channel & Product Information
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Lead Source <span className="text-[#f28705]">*</span>
                </label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  <option value="Direct">Direct Inbound / Outbound</option>
                  <option value="Channel Partner">Channel Partner</option>
                  <option value="TCE">TCE (Tata ClassEdge)</option>
                </select>
              </div>

              {/* Conditional Channel Partner Name Field */}
              {leadSource === 'Channel Partner' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                    Channel Partner Name <span className="text-[#f28705]">* (Required)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Specify Channel Partner agency or entity"
                    value={channelPartnerName}
                    onChange={(e) => setChannelPartnerName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                      errors.channelPartnerName ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                    }`}
                  />
                  {errors.channelPartnerName && (
                    <p className="text-[10px] text-[#b85c00] mt-1">{errors.channelPartnerName}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  AZVASA Product <span className="text-[#f28705]">*</span>
                </label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value as ProductType)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  <option value="INTELLIREAD">INTELLIREAD</option>
                  <option value="ASP">ASP (Academic Services Partner)</option>
                  <option value="FOFO">FOFO (Franchise Owned Franchise Operated)</option>
                  <option value="TEACHER UPSKILL">TEACHER UPSKILL</option>
                  <option value="LMS & Books">LMS & Books (Dewey Lotus)</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Conditional Other Product Field */}
              {product === 'Others' && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                    Specify Product <span className="text-[#f28705]">* (Required)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Specify educational solution or curriculum"
                    value={otherProduct}
                    onChange={(e) => setOtherProduct(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-xl bg-white focus:outline-none focus:border-[#084ab8] ${
                      errors.otherProduct ? 'border-[#b85c00] bg-[#fff4e6]' : 'border-[#e8e7e5]'
                    }`}
                  />
                  {errors.otherProduct && (
                    <p className="text-[10px] text-[#b85c00] mt-1">{errors.otherProduct}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Assignment & Initial Pipeline Stage */}
          <div className="pt-2 border-t border-[#f3f2f1]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block mb-2">
              4. Assignment & Pipeline Configuration
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Assigned Sales Representative <span className="text-[#f28705]">*</span>
                </label>
                <select
                  value={assignedRepId}
                  disabled={!isSuperAdmin && !!existingLead}
                  onChange={(e) => setAssignedRepId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8] disabled:bg-[#f9f9f8] disabled:text-[#8e8b88]"
                >
                  {activeReps.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name} ({rep.employee_id}) - Active
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#646260] mt-1">
                  Only active representatives can receive lead accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Current Pipeline Stage <span className="text-[#f28705]">*</span>
                </label>
                <select
                  value={currentStageId}
                  onChange={(e) => setCurrentStageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                >
                  {stages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      Step {stage.display_order}: {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Next Action / Follow-up schedule */}
          <div className="pt-2 border-t border-[#f3f2f1]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#084ab8] block mb-2">
              5. Next Action & Follow-up Schedule
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                <span className="text-[10px] text-[#646260] mt-0.5 block">
                  Automated email reminder will trigger 1 day before.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Next Action Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Demo presentation with Academic Director"
                  value={nextActionRemarks}
                  onChange={(e) => setNextActionRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
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
              {existingLead ? 'Update Lead' : 'Create School Lead'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
