import React, { useState, useMemo, useEffect } from 'react';
import { Lead, PipelineStage, UserProfile, INDIAN_STATES_AND_UTS } from '../types';
import { exportLeadsToCSV } from '../lib/storage';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  Phone,
  Mail,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  AlertTriangle,
  Clock,
  Trash2,
  MapPin,
  Globe2
} from 'lucide-react';

interface LeadsFilterOptions {
  stageFilter?: string;
  followupStatusFilter?: string;
  stateFilter?: string;
  repFilter?: string;
  productFilter?: string;
  sourceFilter?: string;
  searchTerm?: string;
  activeOnly?: boolean;
}

interface LeadsViewProps {
  leads: Lead[];
  stages: PipelineStage[];
  reps: UserProfile[];
  currentUser: UserProfile;
  initialFilters?: LeadsFilterOptions;
  onClearInitialFilters?: () => void;
  onSelectLead: (lead: Lead) => void;
  onOpenAddLead: () => void;
  onOpenAddInteraction: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => { success: boolean; error?: string } | void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  stages,
  reps,
  currentUser,
  initialFilters,
  onClearInitialFilters,
  onSelectLead,
  onOpenAddLead,
  onOpenAddInteraction,
  onDeleteLead
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isSalesManager = currentUser.role === 'sales_manager';
  const isManagerOrAdmin = isSuperAdmin || isSalesManager;
  const currentDateStr = '2026-09-19';

  const [schoolToDelete, setSchoolToDelete] = useState<Lead | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Centralized lead visibility: Only Sales Manager and Super Admin can see all Central leads.
  // For Sales Representatives, strictly ONLY their assigned leads are visible.
  const baseLeads = useMemo(() => {
    if (isManagerOrAdmin) {
      return leads;
    }
    return leads.filter(l => l.assigned_rep_id === currentUser.id);
  }, [leads, isManagerOrAdmin, currentUser.id]);

  // Helper to normalize stage filter values (e.g. 'demos' -> stage-4)
  const resolveStageFilter = (val?: string): string => {
    if (!val) return '';
    const lower = val.toLowerCase().trim();
    if (lower === 'demos' || lower === 'demo') {
      const s = stages.find(st => st.name.toLowerCase().includes('demo') || st.id === 'stage-4');
      return s ? s.id : 'stage-4';
    }
    if (lower === 'visits' || lower === 'visit') {
      const s = stages.find(st => st.name.toLowerCase().includes('visit') || st.id === 'stage-3');
      return s ? s.id : 'stage-3';
    }
    if (lower === 'agreements' || lower === 'agreement') {
      const s = stages.find(st => st.name.toLowerCase().includes('agreement') || st.id === 'stage-7');
      return s ? s.id : 'stage-7';
    }
    const matched = stages.find(st => st.id === val || st.name.toLowerCase() === lower);
    return matched ? matched.id : val;
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm || '');
  const [stageFilter, setStageFilter] = useState(() => resolveStageFilter(initialFilters?.stageFilter));
  const [stateFilter, setStateFilter] = useState(initialFilters?.stateFilter || '');
  const [sourceFilter, setSourceFilter] = useState(initialFilters?.sourceFilter || '');
  const [productFilter, setProductFilter] = useState(initialFilters?.productFilter || '');
  const [repFilter, setRepFilter] = useState(initialFilters?.repFilter || '');
  const [followupStatusFilter, setFollowupStatusFilter] = useState(initialFilters?.followupStatusFilter || '');
  const [activeOnly, setActiveOnly] = useState(initialFilters?.activeOnly || false);
  const [sortBy, setSortBy] = useState<'updated_at' | 'school_name' | 'next_action_date'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Synchronize when initialFilters prop changes (e.g., user clicks Demos on Dashboard)
  useEffect(() => {
    if (initialFilters) {
      setSearchTerm(initialFilters.searchTerm || '');
      setStageFilter(resolveStageFilter(initialFilters.stageFilter));
      setStateFilter(initialFilters.stateFilter || '');
      setSourceFilter(initialFilters.sourceFilter || '');
      setProductFilter(initialFilters.productFilter || '');
      setRepFilter(initialFilters.repFilter || '');
      setFollowupStatusFilter(initialFilters.followupStatusFilter || '');
      setActiveOnly(initialFilters.activeOnly || false);
      setCurrentPage(1);
    }
  }, [initialFilters, stages]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter application
  const filteredLeads = useMemo(() => {
    return baseLeads.filter(lead => {
      // 1. Search Query: School Name, Location, State, POC Name, POC Contact
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesSchool = lead.school_name?.toLowerCase().includes(query);
        const matchesLocation = lead.location?.toLowerCase().includes(query);
        const matchesState = lead.state?.toLowerCase().includes(query);
        const matchesPoc = lead.poc_name?.toLowerCase().includes(query);
        const matchesContact = lead.poc_contact?.toLowerCase().includes(query);
        if (!matchesSchool && !matchesLocation && !matchesState && !matchesPoc && !matchesContact) {
          return false;
        }
      }

      // 2. Active Only Filter
      if (activeOnly) {
        if (
          lead.current_stage_name === 'Not Interested' || 
          lead.current_stage_id === 'stage-lost' || 
          lead.current_stage_id === 'stage-not-interested'
        ) {
          return false;
        }
      }

      // 3. Stage Filter: robust match across IDs, names, and normalized identifiers
      if (stageFilter) {
        const stageObj = stages.find(s => s.id === stageFilter || s.name.toLowerCase() === stageFilter.toLowerCase());
        const matchId = lead.current_stage_id === stageFilter;
        const matchName = lead.current_stage_name?.toLowerCase() === stageFilter.toLowerCase();
        const matchStageObj = stageObj && (
          lead.current_stage_id === stageObj.id || 
          lead.current_stage_name?.toLowerCase() === stageObj.name.toLowerCase()
        );

        // Robust semantic check for KPI categories (Demo, Visit, Agreement)
        const isDemoFilter = stageFilter === 'stage-4' || (stageObj && stageObj.name.toLowerCase().includes('demo'));
        const isLeadDemo = lead.current_stage_id === 'stage-4' || lead.current_stage_name?.toLowerCase().includes('demo');

        const isVisitFilter = stageFilter === 'stage-3' || (stageObj && stageObj.name.toLowerCase().includes('visit'));
        const isLeadVisit = lead.current_stage_id === 'stage-3' || lead.current_stage_name?.toLowerCase().includes('visit');

        const isAgreementFilter = stageFilter === 'stage-7' || (stageObj && stageObj.name.toLowerCase().includes('agreement'));
        const isLeadAgreement = lead.current_stage_id === 'stage-7' || lead.current_stage_name?.toLowerCase().includes('agreement');

        const semanticMatch = (isDemoFilter && isLeadDemo) || (isVisitFilter && isLeadVisit) || (isAgreementFilter && isLeadAgreement);

        if (!matchId && !matchName && !matchStageObj && !semanticMatch) {
          return false;
        }
      }

      // 4. State Filter
      if (stateFilter && lead.state !== stateFilter) {
        return false;
      }

      // 5. Source Filter
      if (sourceFilter && lead.lead_source !== sourceFilter) {
        return false;
      }

      // 6. Product Filter
      if (productFilter && lead.product !== productFilter) {
        return false;
      }

      // 7. Sales Rep Filter
      if (repFilter && lead.assigned_rep_id !== repFilter) {
        return false;
      }

      // 8. Followup Status Filter
      if (followupStatusFilter) {
        if (followupStatusFilter === 'today') {
          if (lead.next_action_date !== currentDateStr) return false;
        } else if (followupStatusFilter === 'overdue') {
          if (!lead.next_action_date || lead.next_action_date >= currentDateStr) return false;
        } else if (followupStatusFilter === 'upcoming') {
          if (!lead.next_action_date || lead.next_action_date <= currentDateStr) return false;
        } else if (followupStatusFilter === 'none') {
          if (lead.next_action_date) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'school_name') {
        comparison = a.school_name.localeCompare(b.school_name);
      } else if (sortBy === 'next_action_date') {
        const dateA = a.next_action_date || '9999-99-99';
        const dateB = b.next_action_date || '9999-99-99';
        comparison = dateA.localeCompare(dateB);
      } else {
        comparison = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [baseLeads, searchTerm, stageFilter, stateFilter, sourceFilter, productFilter, repFilter, followupStatusFilter, activeOnly, sortBy, sortOrder, stages]);

  // Paginated chunk
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    exportLeadsToCSV(filteredLeads);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStageFilter('');
    setStateFilter('');
    setSourceFilter('');
    setProductFilter('');
    setRepFilter('');
    setFollowupStatusFilter('');
    setActiveOnly(false);
    setCurrentPage(1);
    if (onClearInitialFilters) {
      onClearInitialFilters();
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-[#084ab8]">
              {isManagerOrAdmin ? 'Institutional Leads Directory' : 'My Assigned Leads'}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
              {filteredLeads.length} leads
            </span>
            {isManagerOrAdmin ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fafaf9] text-[#646260] border border-[#e8e7e5] flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-[#084ab8]" />
                Central Database
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fafaf9] text-[#646260] border border-[#e8e7e5] flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#084ab8]" />
                Representative Workspace
              </span>
            )}
          </div>
          <p className="text-xs text-[#646260] mt-0.5">
            {isManagerOrAdmin
              ? 'Centralized database view across all institutional accounts, territories, representatives, and pipeline stages'
              : 'Track and manage your assigned school accounts, outreach activities, and upcoming follow-up schedules'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Option: strictly restricted to Sales Manager and Super Admin */}
          {isManagerOrAdmin && (
            <button
              onClick={handleExportCSV}
              title="Export filtered leads as CSV"
              className="flex items-center gap-1.5 px-3 py-2 border border-[#084ab8] text-[#084ab8] hover:bg-[#eef4ff] rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={onOpenAddLead}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-4 shadow-xs space-y-3">
        {/* Active Filter Notification Bar */}
        {(stageFilter || followupStatusFilter || stateFilter || repFilter || productFilter || sourceFilter || activeOnly || searchTerm) && (
          <div className="flex items-center gap-2 bg-[#eef4ff] border border-[#084ab8]/20 px-3.5 py-2 rounded-xl text-xs text-[#084ab8] flex-wrap justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold">Active Filter:</span>
              {stageFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  Stage: {stages.find(s => s.id === stageFilter)?.name || stageFilter}
                </span>
              )}
              {followupStatusFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs capitalize">
                  Follow-up: {followupStatusFilter}
                </span>
              )}
              {activeOnly && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  Active Pipeline Only
                </span>
              )}
              {repFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  Rep: {reps.find(r => r.id === repFilter)?.full_name || repFilter}
                </span>
              )}
              {stateFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  State: {stateFilter}
                </span>
              )}
              {productFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  Product: {productFilter}
                </span>
              )}
              {sourceFilter && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  Source: {sourceFilter}
                </span>
              )}
              {searchTerm && (
                <span className="bg-white px-2 py-0.5 rounded-md border border-[#084ab8]/30 font-semibold shadow-2xs">
                  &ldquo;{searchTerm}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#084ab8] text-[11px]">
                Showing {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
              </span>
              <button
                onClick={resetFilters}
                className="text-xs font-bold underline hover:text-[#06378a] cursor-pointer text-[#084ab8]"
              >
                Clear filter (Show all)
              </button>
            </div>
          </div>
        )}
        
        {/* Search Input Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8e8b88] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search school name, location, state, POC name, or contact number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8] placeholder-[#8e8b88]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              className="px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8] text-[#2d2b2a]"
            >
              <option value="updated_at-desc">Sort: Recently Updated</option>
              <option value="school_name-asc">Sort: School Name (A-Z)</option>
              <option value="school_name-desc">Sort: School Name (Z-A)</option>
              <option value="next_action_date-asc">Sort: Next Action Date (Soonest)</option>
            </select>

            {(searchTerm || stageFilter || stateFilter || sourceFilter || productFilter || repFilter || followupStatusFilter) && (
              <button
                onClick={resetFilters}
                className="text-xs text-[#084ab8] hover:underline whitespace-nowrap px-2 font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-[#f3f2f1]">
          
          {/* Stage Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Stages</option>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* State / UT Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
              State / UT
            </label>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All States</option>
              {INDIAN_STATES_AND_UTS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
              Product
            </label>
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Products</option>
              <option value="INTELLIREAD">INTELLIREAD</option>
              <option value="ASP">ASP</option>
              <option value="FOFO">FOFO</option>
              <option value="TEACHER UPSKILL">TEACHER UPSKILL</option>
              <option value="LMS & Books">LMS & Books</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
              Lead Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Sources</option>
              <option value="Direct">Direct</option>
              <option value="Channel Partner">Channel Partner</option>
              <option value="TCE">TCE</option>
            </select>
          </div>

          {/* Sales Rep Filter (Super Admin & Sales Manager) */}
          {isManagerOrAdmin && (
            <div>
              <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
                Representative
              </label>
              <select
                value={repFilter}
                onChange={(e) => {
                  setRepFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
              >
                <option value="">All Representatives</option>
                {reps.filter(r => r.role === 'sales_rep').map(r => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Follow-up Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[#646260] uppercase mb-1">
              Follow-up Status
            </label>
            <select
              value={followupStatusFilter}
              onChange={(e) => {
                setFollowupStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs border border-[#e8e7e5] rounded-lg bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Statuses</option>
              <option value="today">Follow-up Today</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Upcoming</option>
              <option value="none">No Follow-up Scheduled</option>
            </select>
          </div>

        </div>
      </div>

      {/* Leads Table for Desktop & Cards for Mobile */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
              <tr>
                <th className="py-3.5 px-4">School & Location</th>
                <th className="py-3.5 px-4">Point of Contact (POC)</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Assigned Rep</th>
                <th className="py-3.5 px-4">Next Action Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f2f1]">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#646260]">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  const isToday = lead.next_action_date === currentDateStr;
                  const isOverdue = lead.next_action_date && lead.next_action_date < currentDateStr && lead.current_stage_name !== 'Not Interested';

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#fafaf9] transition-colors group cursor-pointer"
                      onClick={() => onSelectLead(lead)}
                    >
                      {/* School & Location & State */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#2d2b2a] group-hover:text-[#084ab8] block">
                          {lead.school_name}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[11px] text-[#646260] flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#8e8b88]" />
                            {lead.location}
                          </span>
                          {lead.state && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#f3f2f1] text-[#084ab8] border border-[#e8e7e5]">
                              {lead.state}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* POC Contact with clickable tel */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <span className="font-semibold text-[#2d2b2a] block">
                          {lead.poc_name}
                        </span>
                        <span className="text-[11px] text-[#646260] block">
                          {lead.poc_designation}
                        </span>
                        <a
                          href={`tel:${lead.poc_contact}`}
                          className="text-[11px] text-[#084ab8] hover:underline flex items-center gap-1 mt-0.5 font-medium"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          {lead.poc_contact}
                        </a>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#2d2b2a] px-2 py-0.5 rounded bg-[#f3f2f1] text-[11px] border border-[#e8e7e5] inline-block">
                          {lead.product}
                          {lead.product === 'Others' && lead.other_product ? ` (${lead.other_product})` : ''}
                        </span>
                        <span className="block text-[10px] text-[#8e8b88] mt-0.5">
                          Source: {lead.lead_source}
                          {lead.channel_partner_name ? ` (${lead.channel_partner_name})` : ''}
                        </span>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            lead.current_stage_name === 'Not Interested'
                              ? 'bg-[#f3f2f1] text-[#646260] border-[#e8e7e5]'
                              : lead.current_stage_name === 'Agreement Stage'
                              ? 'bg-[#fff4e6] text-[#f28705] border-[#f28705]/40'
                              : 'bg-[#eef4ff] text-[#084ab8] border-[#084ab8]/20'
                          }`}
                        >
                          {lead.current_stage_name}
                        </span>
                      </td>

                      {/* Assigned Rep */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#2d2b2a] block">
                          {lead.assigned_rep_name}
                        </span>
                      </td>

                      {/* Next Action Date */}
                      <td className="py-3.5 px-4">
                        {lead.next_action_date ? (
                          <div>
                            <span
                              className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                                isOverdue
                                  ? 'text-[#b85c00]'
                                  : isToday
                                  ? 'text-[#f28705]'
                                  : 'text-[#2d2b2a]'
                              }`}
                            >
                              {isOverdue && <AlertTriangle className="w-3 h-3" />}
                              {isToday && <Clock className="w-3 h-3" />}
                              {lead.next_action_date}
                            </span>
                            {lead.next_action_remarks && (
                              <span className="text-[10px] text-[#646260] block line-clamp-1 mt-0.5 max-w-[180px]" title={lead.next_action_remarks}>
                                {lead.next_action_remarks}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8e8b88]">Not scheduled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenAddInteraction(lead)}
                            title="Add interaction"
                            className="px-2.5 py-1 text-[11px] font-semibold bg-[#084ab8] hover:bg-[#06378a] text-white rounded-lg transition-colors cursor-pointer"
                          >
                            + Activity
                          </button>
                          <button
                            onClick={() => onSelectLead(lead)}
                            title="View lead profile"
                            className="px-2 py-1 text-[11px] font-semibold border border-[#084ab8] text-[#084ab8] hover:bg-[#eef4ff] rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          {isSuperAdmin && (lead.current_stage_name === 'Not Interested' || lead.current_stage_id === 'stage-lost' || lead.current_stage_id === 'stage-not-interested') && (
                            <button
                              onClick={() => {
                                setSchoolToDelete(lead);
                                setDeleteError(null);
                              }}
                              title="Super Admin: Permanently Delete School"
                              className="p-1.5 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-lg border border-red-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="md:hidden divide-y divide-[#f3f2f1]">
          {paginatedLeads.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#646260]">
              No leads found matching current filters.
            </div>
          ) : (
            paginatedLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="p-4 space-y-2.5 hover:bg-[#fafaf9] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#084ab8]">
                      {lead.school_name}
                    </h4>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[11px] text-[#646260] flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#8e8b88]" />
                        {lead.location}
                      </span>
                      {lead.state && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#f3f2f1] text-[#084ab8] border border-[#e8e7e5]">
                          {lead.state}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20 shrink-0">
                    {lead.current_stage_name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#fafaf9] p-2.5 rounded-xl border border-[#e8e7e5]">
                  <div>
                    <span className="text-[#8e8b88] block text-[10px]">POC</span>
                    <span className="font-semibold text-[#2d2b2a]">{lead.poc_name}</span>
                    <a
                      href={`tel:${lead.poc_contact}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#084ab8] font-medium block hover:underline"
                    >
                      {lead.poc_contact}
                    </a>
                  </div>
                  <div>
                    <span className="text-[#8e8b88] block text-[10px]">Product & Rep</span>
                    <span className="font-semibold text-[#2d2b2a] block">{lead.product}</span>
                    <span className="text-[#646260]">{lead.assigned_rep_name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="text-[11px]">
                    <span className="text-[#8e8b88]">Next Action: </span>
                    <strong className="text-[#f28705]">{lead.next_action_date || 'None'}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSuperAdmin && (lead.current_stage_name === 'Not Interested' || lead.current_stage_id === 'stage-lost' || lead.current_stage_id === 'stage-not-interested') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSchoolToDelete(lead);
                          setDeleteError(null);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg flex items-center gap-1 hover:bg-red-600 hover:text-white transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddInteraction(lead);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#084ab8] text-white rounded-lg"
                    >
                      + Activity
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#e8e7e5] bg-[#fafaf9] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#646260]">
            Showing <strong className="text-[#2d2b2a]">{Math.min(filteredLeads.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
            <strong className="text-[#2d2b2a]">{Math.min(filteredLeads.length, currentPage * itemsPerPage)}</strong> of{' '}
            <strong className="text-[#2d2b2a]">{filteredLeads.length}</strong> accounts
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#e8e7e5] text-[#646260] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-[#2d2b2a]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#e8e7e5] text-[#646260] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Super Admin Delete School Modal */}
      {schoolToDelete && (
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
                <strong className="text-[#2d2b2a]">{schoolToDelete.school_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Location:</span>
                <span className="text-[#2d2b2a]">{schoolToDelete.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Current Stage:</span>
                <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {schoolToDelete.current_stage_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8e8b88]">Assigned Rep:</span>
                <span className="text-[#2d2b2a]">{schoolToDelete.assigned_rep_name || 'Unassigned'}</span>
              </div>
            </div>

            <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 leading-relaxed">
              <strong>Warning:</strong> This will permanently erase <strong>{schoolToDelete.school_name}</strong> and all linked activity records, stage logs, and notes from AZVASA SalesTrack. This action is irreversible.
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
                  setSchoolToDelete(null);
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
                    const res = onDeleteLead(schoolToDelete.id);
                    if (res && !res.success) {
                      setDeleteError(res.error || 'Failed to delete school.');
                      return;
                    }
                  }
                  setSchoolToDelete(null);
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
