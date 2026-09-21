import React, { useState } from 'react';
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
  Legend,
  CartesianGrid
} from 'recharts';
import {
  MapPin,
  Package,
  Award,
  TrendingUp,
  Plus,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Briefcase
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
  const isSalesManager = currentUser.role === 'sales_manager';
  const isManagerOrAdmin = isSuperAdmin || isSalesManager;
  const currentDateStr = '2026-09-19';

  // Leads visible on dashboard: Admins & Managers see all centralized leads; Reps see their assigned leads
  const visibleLeads = isManagerOrAdmin 
    ? leads 
    : leads.filter(l => l.assigned_rep_id === currentUser.id);

  // Compute KPI metrics (Without removed sections: Follow-up Today, Upcoming Follow-ups, Proposals)
  const totalLeads = visibleLeads.length;
  const activeLeads = visibleLeads.filter(l => l.current_stage_name !== 'Not Interested').length;
  const overdueFollowups = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date < currentDateStr && l.current_stage_name !== 'Not Interested'
  ).length;

  const visits = visibleLeads.filter(l => l.current_stage_name === 'Visit').length;
  const demos = visibleLeads.filter(l => l.current_stage_name === 'Demo Stage').length;
  const agreements = visibleLeads.filter(l => l.current_stage_name === 'Agreement Stage').length;

  const kpiData: KPIData = {
    totalLeads,
    activeLeads,
    overdueFollowups,
    visits,
    demos,
    agreements,
    salesRepsCount: isManagerOrAdmin ? reps.filter(r => r.role === 'sales_rep').length : undefined
  };

  // Overdue leads
  const overdueLeads = visibleLeads.filter(
    l => l.next_action_date && l.next_action_date < currentDateStr && l.current_stage_name !== 'Not Interested'
  );

  // AZVASA Brand Color Palette
  const BRAND_COLORS = ['#084ab8', '#f28705', '#2d2b2a', '#3c75db', '#ffa742', '#06378a', '#b85c00', '#646260'];

  // 1. STATE-WISE LEADS CALCULATION (Dynamic from Centralized DB)
  const stateCounts: Record<string, { total: number; active: number; converted: number }> = {};
  visibleLeads.forEach(lead => {
    const stateKey = lead.state || 'Unassigned State';
    if (!stateCounts[stateKey]) {
      stateCounts[stateKey] = { total: 0, active: 0, converted: 0 };
    }
    stateCounts[stateKey].total += 1;
    if (lead.current_stage_name !== 'Not Interested') {
      stateCounts[stateKey].active += 1;
    }
    if (lead.current_stage_name === 'Agreement Stage' || lead.current_stage_id === 'stage-7') {
      stateCounts[stateKey].converted += 1;
    }
  });

  const stateChartData = Object.entries(stateCounts)
    .map(([state, data]) => ({
      state,
      leads: data.total,
      active: data.active,
      converted: data.converted
    }))
    .sort((a, b) => b.leads - a.leads);

  // 2. PRODUCT-WISE LEADS CALCULATION
  const productCounts: Record<string, { total: number; converted: number }> = {};
  visibleLeads.forEach(l => {
    const prodKey = l.product || 'Others';
    if (!productCounts[prodKey]) {
      productCounts[prodKey] = { total: 0, converted: 0 };
    }
    productCounts[prodKey].total += 1;
    if (l.current_stage_name === 'Agreement Stage' || l.current_stage_id === 'stage-7') {
      productCounts[prodKey].converted += 1;
    }
  });

  const productChartData = Object.entries(productCounts)
    .map(([product, data]) => ({
      name: product,
      leads: data.total,
      converted: data.converted,
      share: visibleLeads.length > 0 ? Math.round((data.total / visibleLeads.length) * 100) : 0
    }))
    .sort((a, b) => b.leads - a.leads);

  // 3. SALES REPRESENTATIVES PERFORMANCE CALCULATION
  const salesRepsList = reps.filter(r => r.role === 'sales_rep');
  // Fallback to active reps or all team members except super admin if none explicitly marked
  const displayReps = salesRepsList.length > 0 
    ? salesRepsList 
    : reps.filter(r => r.role !== 'super_admin');

  const repPerformanceData = displayReps.map(rep => {
    const repLeads = leads.filter(l => l.assigned_rep_id === rep.id);
    const totalLeads = repLeads.length;
    const visits = repLeads.filter(
      l => l.current_stage_name === 'Visit' || l.current_stage_id === 'stage-3'
    ).length;
    const demos = repLeads.filter(
      l => l.current_stage_name === 'Demo Stage' || l.current_stage_id === 'stage-4'
    ).length;
    const agreementsWon = repLeads.filter(
      l => l.current_stage_name === 'Agreement Stage' || l.current_stage_id === 'stage-7'
    ).length;
    const activitiesCompleted = interactions.filter(i => i.created_by_id === rep.id).length;
    const conversionRate = totalLeads > 0 ? Math.round((agreementsWon / totalLeads) * 100) : 0;

    const territoryStates = Array.from(new Set(repLeads.map(l => l.state).filter(Boolean))).slice(0, 2).join(', ');
    const territory = territoryStates || rep.designation || 'Field Territory';

    return {
      id: rep.id,
      name: rep.full_name,
      employeeId: rep.employee_id,
      designation: rep.designation || 'Sales Representative',
      location: territory,
      totalLeads,
      visits,
      demos,
      agreementsWon,
      activitiesCompleted,
      conversionRate
    };
  });

  // Toggle for representative metric view
  const [repMetric, setRepMetric] = useState<'all' | 'leads' | 'visits' | 'demos' | 'agreements'>('all');

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#f28705] uppercase tracking-wider block mb-1">
            {isSuperAdmin 
              ? 'Super Admin Central Control' 
              : isSalesManager 
              ? 'Sales Manager Operations Hub' 
              : 'Sales Representative Workspace'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#084ab8] tracking-tight">
            Institutional Sales Dashboard
          </h2>
          <p className="text-xs text-[#646260] mt-1">
            Centralized database sync across all territories, academic products, and sales representative performance
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
            Key Performance Metrics
          </h3>
          <span className="text-[11px] text-[#8e8b88]">
            Live Centralized Database
          </span>
        </div>
        <KPICards
          data={kpiData}
          isSuperAdmin={isManagerOrAdmin}
          onFilterClick={(type) => {
            if (type === 'reps') {
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

      {/* SECTION 1: STATE-WISE LEADS GRAPH & BREAKDOWN */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f2f1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#084ab8]">
                State-wise Leads Distribution
              </h3>
              <p className="text-xs text-[#646260]">
                Institutional penetration across Indian States and Union Territories
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#fafaf9] text-[#646260] border border-[#e8e7e5] self-start sm:self-auto">
            {stateChartData.length} States Active
          </span>
        </div>

        {stateChartData.length === 0 ? (
          <div className="py-12 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5]">
            <MapPin className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#2d2b2a]">No state data recorded yet</p>
            <p className="text-[11px] text-[#646260] mt-0.5">Add or update leads with their respective State/UT.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Horizontal Bar Chart */}
            <div className="lg:col-span-2 h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stateChartData.slice(0, 10)}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f2f1" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#646260' }} />
                  <YAxis
                    dataKey="state"
                    type="category"
                    tick={{ fontSize: 11, fill: '#2d2b2a', fontWeight: 600 }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value} leads`,
                      name === 'leads' ? 'Total Leads' : name === 'converted' ? 'Agreements Won' : 'Active Pipeline'
                    ]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e8e7e5',
                      borderRadius: 8,
                      fontSize: 11
                    }}
                  />
                  <Bar dataKey="leads" fill="#084ab8" radius={[0, 4, 4, 0]} name="Total Leads" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* State Leaderboard Table */}
            <div className="bg-[#fafaf9] border border-[#e8e7e5] rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-[#646260] uppercase tracking-wider block">
                Territory Breakdown
              </span>
              <div className="divide-y divide-[#e8e7e5] max-h-60 overflow-y-auto pr-1">
                {stateChartData.map((item, idx) => (
                  <div key={item.state} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[11px] font-bold text-[#8e8b88]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-[#2d2b2a]">{item.state}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold bg-[#eef4ff] text-[#084ab8] text-[11px]">
                        {item.leads} leads
                      </span>
                      {item.converted > 0 && (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-[#fff4e6] text-[#b85c00] text-[10px]">
                          {item.converted} won
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PRODUCT-WISE GRAPH & BREAKDOWN */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f2f1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#fff4e6] text-[#f28705]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#084ab8]">
                Product-wise Leads Breakdown
              </h3>
              <p className="text-xs text-[#646260]">
                Curriculum solution adoption and demand across school prospects
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#fafaf9] text-[#646260] border border-[#e8e7e5] self-start sm:self-auto">
            {productChartData.length} Solutions Tracked
          </span>
        </div>

        {productChartData.length === 0 ? (
          <div className="py-12 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5]">
            <Package className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#2d2b2a]">No product leads logged</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Donut Chart */}
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChartData}
                    dataKey="leads"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {productChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} leads`, name]}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e8e7e5',
                      borderRadius: 8,
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Product Performance Bar Chart */}
            <div className="lg:col-span-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {productChartData.map((p, idx) => (
                  <div
                    key={p.name}
                    className="p-3.5 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] hover:bg-white hover:border-[#084ab8] transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }}
                        />
                        <h4 className="text-xs font-bold text-[#2d2b2a]">{p.name}</h4>
                      </div>
                      <span className="text-xs font-bold text-[#084ab8]">{p.leads} leads</span>
                    </div>

                    <div className="w-full bg-[#e8e7e5] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p.share}%`,
                          backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length]
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#646260] pt-0.5">
                      <span>{p.share}% market share</span>
                      {p.converted > 0 && (
                        <span className="font-semibold text-[#f28705]">{p.converted} agreements</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: SALES REPRESENTATIVES PERFORMANCE GRAPH & COMPARISON */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f2f1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#084ab8]">
                Sales Representatives Performance
              </h3>
              <p className="text-xs text-[#646260]">
                Institutional outreach, school visits, curriculum demos, and closed agreements by representative
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
            {[
              { id: 'all', label: 'All Metrics' },
              { id: 'leads', label: 'Leads' },
              { id: 'visits', label: 'Visits' },
              { id: 'demos', label: 'Demos' },
              { id: 'agreements', label: 'Agreements' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRepMetric(m.id as any)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  repMetric === m.id
                    ? 'bg-[#084ab8] text-white'
                    : 'bg-[#f3f2f1] text-[#646260] hover:text-[#2d2b2a]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {repPerformanceData.length === 0 ? (
          <div className="py-12 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5]">
            <Users className="w-8 h-8 text-[#8e8b88] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#2d2b2a]">No Sales Representatives registered</p>
            <p className="text-[11px] text-[#646260] mt-0.5">
              Add or assign Sales Representatives in User Management to track field sales performance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Performance Comparison Bar Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={repPerformanceData}
                  margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2f1" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#2d2b2a', fontWeight: 600 }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#646260' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e8e7e5',
                      borderRadius: 8,
                      fontSize: 11
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  {(repMetric === 'all' || repMetric === 'leads') && (
                    <Bar dataKey="totalLeads" fill="#084ab8" name="Assigned Leads" radius={[4, 4, 0, 0]} />
                  )}
                  {(repMetric === 'all' || repMetric === 'visits') && (
                    <Bar dataKey="visits" fill="#2d2b2a" name="School Visits" radius={[4, 4, 0, 0]} />
                  )}
                  {(repMetric === 'all' || repMetric === 'demos') && (
                    <Bar dataKey="demos" fill="#3c75db" name="Product Demos" radius={[4, 4, 0, 0]} />
                  )}
                  {(repMetric === 'all' || repMetric === 'agreements') && (
                    <Bar dataKey="agreementsWon" fill="#f28705" name="Agreements Won" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Matrix Table */}
            <div className="overflow-x-auto border border-[#e8e7e5] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Sales Representative</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Territory / Location</th>
                    <th className="py-3 px-4">Assigned Leads</th>
                    <th className="py-3 px-4">School Visits</th>
                    <th className="py-3 px-4">Demos Given</th>
                    <th className="py-3 px-4">Agreements Won</th>
                    <th className="py-3 px-4">Activities</th>
                    <th className="py-3 px-4">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f2f1]">
                  {repPerformanceData.map(r => (
                    <tr key={r.id} className="hover:bg-[#fafaf9] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#084ab8]">{r.name}</td>
                      <td className="py-3 px-4 text-[#646260]">{r.employeeId}</td>
                      <td className="py-3 px-4 text-[#2d2b2a]">{r.location}</td>
                      <td className="py-3 px-4 font-semibold text-[#084ab8]">{r.totalLeads}</td>
                      <td className="py-3 px-4 text-[#2d2b2a]">{r.visits}</td>
                      <td className="py-3 px-4 text-[#3c75db] font-semibold">{r.demos}</td>
                      <td className="py-3 px-4 font-bold text-[#f28705]">{r.agreementsWon}</td>
                      <td className="py-3 px-4 text-[#646260]">{r.activitiesCompleted}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-[#eef4ff] text-[#084ab8] text-[10px]">
                          {r.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Overdue Alerts Section if any pending urgent action */}
      {overdueLeads.length > 0 && (
        <div className="bg-white border border-[#f28705]/40 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#b85c00]" />
              <h3 className="text-sm font-bold text-[#b85c00]">
                Overdue Interaction Deadlines ({overdueLeads.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('followups')}
              className="text-xs font-semibold text-[#b85c00] hover:underline flex items-center gap-1"
            >
              Resolve in Follow-ups <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueLeads.slice(0, 3).map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="p-3 rounded-xl border border-[#f28705]/30 bg-[#fffbf7] hover:border-[#b85c00] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs font-bold text-[#2d2b2a] line-clamp-1">{lead.school_name}</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#fff4e6] text-[#b85c00] shrink-0">
                    {lead.state || 'School'}
                  </span>
                </div>
                <p className="text-[11px] text-[#646260]">
                  POC: {lead.poc_name} • {lead.poc_contact}
                </p>
                <span className="text-[10px] text-[#b85c00] font-semibold block">
                  Due: {lead.next_action_date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
