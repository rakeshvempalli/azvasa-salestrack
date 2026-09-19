import React from 'react';
import { UserProfile, Lead, PipelineStage, Interaction, KPIData } from '../types';
import { KPICards } from './KPICards';
import { PipelineView } from './PipelineView';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Clock,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  School,
  User,
  Phone,
  Tag,
  History,
  TrendingUp,
  Plus
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: UserProfile;
  leads: Lead[];
  stages: PipelineStage[];
  interactions: Interaction[];
  reps: UserProfile[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: any) => void;
  onOpenAddLead: () => void;
  onOpenAddInteraction: (lead: Lead) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  leads,
  stages,
  interactions,
  reps,
  onSelectLead,
  onNavigateTab,
  onOpenAddLead,
  onOpenAddInteraction
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentDateStr = '2026-09-19';

  // Filter leads based on role
  const visibleLeads = isSuperAdmin 
    ? leads 
    : leads.filter(l => l.assigned_rep_id === currentUser.id);

  // Compute KPI metrics from actual database data
  const totalLeads = visibleLeads.length;
  const activeLeads = visibleLeads.filter(l => l.current_stage_name !== 'Not Interested').length;
  
  const followupsToday = visibleLeads.filter(l => l.next_action_date === currentDateStr).length;
  const upcomingFollowups = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date > currentDateStr
  ).length;
  const overdueFollowups = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date < currentDateStr && l.current_stage_name !== 'Not Interested'
  ).length;

  const visits = visibleLeads.filter(l => l.current_stage_name === 'Visit').length;
  const demos = visibleLeads.filter(l => l.current_stage_name === 'Demo Stage').length;
  const proposals = visibleLeads.filter(l => l.current_stage_name === 'Proposal Shared').length;
  const agreements = visibleLeads.filter(l => l.current_stage_name === 'Agreement Stage').length;

  const kpiData: KPIData = {
    totalLeads,
    activeLeads,
    followupsToday,
    upcomingFollowups,
    overdueFollowups,
    visits,
    demos,
    proposals,
    agreements,
    salesRepsCount: isSuperAdmin ? reps.filter(r => r.role === 'sales_rep').length : undefined
  };

  // Today's Follow-ups list
  const todaysFollowupLeads = visibleLeads.filter(l => l.next_action_date === currentDateStr);

  // Overdue leads
  const overdueLeads = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date < currentDateStr && l.current_stage_name !== 'Not Interested'
  );

  // Recent interactions
  const recentInteractions = isSuperAdmin
    ? interactions.slice(0, 5)
    : interactions.filter(i => i.created_by_id === currentUser.id).slice(0, 5);

  // Chart data for Super Admin (using brand colors only)
  const BRAND_COLORS = ['#084ab8', '#f28705', '#646260', '#06378a', '#b85c00', '#3c75db', '#ffa742', '#8e8b88'];

  // 1. Leads by Stage
  const stageData = stages
    .filter(s => s.active)
    .map(stage => {
      const count = visibleLeads.filter(l => l.current_stage_id === stage.id || l.current_stage_name === stage.name).length;
      return {
        name: stage.name,
        count
      };
    });

  // 2. Leads by Product
  const productCounts: Record<string, number> = {};
  visibleLeads.forEach(l => {
    productCounts[l.product] = (productCounts[l.product] || 0) + 1;
  });
  const productData = Object.entries(productCounts).map(([name, value]) => ({ name, value }));

  // 3. Leads by Source
  const sourceCounts: Record<string, number> = {};
  visibleLeads.forEach(l => {
    sourceCounts[l.lead_source] = (sourceCounts[l.lead_source] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts).map(([name, count]) => ({ name, count }));

  // 4. Leads by Sales Rep
  const repData = reps
    .filter(r => r.role === 'sales_rep')
    .map(rep => {
      const count = leads.filter(l => l.assigned_rep_id === rep.id).length;
      return {
        name: rep.full_name.split(' ')[0],
        leads: count
      };
    });

  // 5. Monthly Trend
  const monthlyData = [
    { month: 'Jun', leads: 4 },
    { month: 'Jul', leads: 8 },
    { month: 'Aug', leads: 14 },
    { month: 'Sep', leads: visibleLeads.length }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#f28705] uppercase tracking-wider block mb-1">
            {isSuperAdmin ? 'AZVASA Enterprise CRM' : 'Sales Representative Workspace'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#084ab8] tracking-tight">
            {isSuperAdmin ? 'Executive Sales Overview' : `Good Morning, ${currentUser.full_name}`}
          </h2>
          <p className="text-xs text-[#646260] mt-1">
            {isSuperAdmin 
              ? 'Real-time performance across all sales territories, academic pipelines, and partner institutions.'
              : 'Here is your targeted pipeline activity and priority school follow-ups for today.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddLead}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-[#646260] uppercase tracking-wider">
            {isSuperAdmin ? 'Key Performance Metrics' : 'My Sales Overview'}
          </h3>
          <span className="text-[11px] text-[#8e8b88]">
            Date: 19 September 2026
          </span>
        </div>
        <KPICards
          data={kpiData}
          isSuperAdmin={isSuperAdmin}
          onFilterClick={(type) => {
            if (type === 'today' || type === 'overdue' || type === 'upcoming') {
              onNavigateTab('followups');
            } else if (type === 'reps') {
              onNavigateTab('admin-reps');
            } else {
              onNavigateTab('leads');
            }
          }}
        />
      </div>

      {/* Visual Pipeline Progression */}
      <PipelineView
        stages={stages}
        leads={visibleLeads}
        onSelectStage={() => onNavigateTab('leads')}
      />

      {/* Two Column Layout: Today's Follow-ups & Priority Action / Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Follow-ups Table */}
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#fff4e6] text-[#f28705]">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#084ab8]">
                Today's Follow-ups ({todaysFollowupLeads.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('followups')}
              className="text-xs font-semibold text-[#084ab8] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaysFollowupLeads.length === 0 ? (
            <div className="p-8 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5] my-auto">
              <Clock className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#2d2b2a]">No follow-ups scheduled for today</p>
              <p className="text-[11px] text-[#646260] mt-0.5">Check upcoming follow-ups or plan next actions.</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
              {todaysFollowupLeads.map(lead => (
                <div
                  key={lead.id}
                  className="p-3.5 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] hover:bg-white hover:border-[#084ab8] transition-all flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4
                        onClick={() => onSelectLead(lead)}
                        className="text-xs font-bold text-[#084ab8] hover:underline cursor-pointer"
                      >
                        {lead.school_name}
                      </h4>
                      <p className="text-[11px] text-[#646260] mt-0.5">
                        POC: {lead.poc_name} ({lead.poc_designation}) • {lead.poc_contact}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] shrink-0 border border-[#084ab8]/20">
                      {lead.current_stage_name}
                    </span>
                  </div>

                  {lead.next_action_remarks && (
                    <div className="p-2 rounded-lg bg-white border border-[#e8e7e5] text-[11px] text-[#2d2b2a]">
                      <span className="font-semibold text-[#f28705]">Action: </span>
                      {lead.next_action_remarks}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#f3f2f1] text-[11px]">
                    <span className="text-[#646260]">
                      Rep: <strong className="text-[#2d2b2a]">{lead.assigned_rep_name}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenAddInteraction(lead)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-[#084ab8] text-white hover:bg-[#06378a]"
                      >
                        Log Activity
                      </button>
                      <button
                        onClick={() => onSelectLead(lead)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md border border-[#084ab8] text-[#084ab8] hover:bg-[#eef4ff]"
                      >
                        View Lead
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Follow-ups (Attention Treatment in AZVASA dark orange / gray) */}
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/30">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#b85c00]">
                Overdue Follow-ups ({overdueLeads.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('followups')}
              className="text-xs font-semibold text-[#b85c00] hover:underline flex items-center gap-1"
            >
              Resolve Overdue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {overdueLeads.length === 0 ? (
            <div className="p-8 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5] my-auto">
              <CalendarCheck className="w-8 h-8 text-[#084ab8] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#2d2b2a]">Zero overdue follow-ups</p>
              <p className="text-[11px] text-[#646260] mt-0.5">All sales interaction deadlines are up to date.</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
              {overdueLeads.map(lead => {
                // Calculate days overdue
                const due = new Date(lead.next_action_date!);
                const curr = new Date(currentDateStr);
                const diffTime = curr.getTime() - due.getTime();
                const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

                return (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl border border-[#f28705]/40 bg-[#fffbf7] hover:border-[#b85c00] transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          onClick={() => onSelectLead(lead)}
                          className="text-xs font-bold text-[#2d2b2a] hover:text-[#084ab8] cursor-pointer"
                        >
                          {lead.school_name}
                        </h4>
                        <p className="text-[11px] text-[#646260] mt-0.5">
                          {lead.poc_name} • {lead.poc_contact}
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#fff4e6] text-[#b85c00] border border-[#f28705]/40 shrink-0">
                        {diffDays} {diffDays === 1 ? 'day' : 'days'} overdue
                      </span>
                    </div>

                    <div className="text-[11px] text-[#646260] bg-white p-2 rounded-lg border border-[#e8e7e5]">
                      <span className="font-semibold text-[#646260]">Due Date: {lead.next_action_date}</span>
                      <p className="text-[#2d2b2a] mt-0.5 line-clamp-1">{lead.next_action_remarks || 'Action pending'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#646260]">Rep: <strong>{lead.assigned_rep_name}</strong></span>
                      <button
                        onClick={() => onOpenAddInteraction(lead)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-[#f28705] hover:bg-[#b85c00] text-white"
                      >
                        Update Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Analytics Charts Section */}
      {isSuperAdmin && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#084ab8] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#f28705]" />
              Executive Analytics & Territory Distribution
            </h3>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-[#084ab8] hover:underline"
            >
              Full Analytics Report →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Leads by Stage */}
            <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-[#2d2b2a] mb-3">
                Leads by Pipeline Stage
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: '#646260' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#646260' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                    />
                    <Bar dataKey="count" fill="#084ab8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Leads by Product */}
            <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-[#2d2b2a] mb-3">
                Leads by Educational Product
              </h4>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {productData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Leads by Sales Rep */}
            <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-[#2d2b2a] mb-3">
                Assigned Accounts by Representative
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#646260' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#646260' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                    />
                    <Bar dataKey="leads" fill="#f28705" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Recent Activities Timeline (for Sales Reps & Super Admin) */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#084ab8]" />
            <h3 className="text-sm font-bold text-[#084ab8]">
              Recent Interaction Stream
            </h3>
          </div>
          <span className="text-[11px] text-[#646260]">
            Latest CRM touchpoints
          </span>
        </div>

        <div className="space-y-3">
          {recentInteractions.map(inter => {
            const lead = leads.find(l => l.id === inter.lead_id);
            return (
              <div
                key={inter.id}
                className="p-3 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                      {inter.interaction_type}
                    </span>
                    <strong
                      onClick={() => lead && onSelectLead(lead)}
                      className="text-xs font-bold text-[#2d2b2a] hover:text-[#084ab8] hover:underline cursor-pointer"
                    >
                      {lead ? lead.school_name : 'School Account'}
                    </strong>
                    <span className="text-[11px] text-[#8e8b88]">
                      by {inter.created_by_name}
                    </span>
                  </div>
                  <p className="text-xs text-[#646260] line-clamp-2">
                    {inter.follow_up_remarks}
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] text-[#8e8b88] block">
                    {inter.interaction_date ? inter.interaction_date.split('T')[0] : ''}
                  </span>
                  {inter.next_action_date && (
                    <span className="text-[11px] font-semibold text-[#f28705] block">
                      Next: {inter.next_action_date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
