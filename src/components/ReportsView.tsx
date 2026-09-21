import React, { useState } from 'react';
import { Lead, PipelineStage, UserProfile, Interaction } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Download,
  TrendingUp,
  Award,
  MapPin,
  Package,
  Briefcase,
  Users
} from 'lucide-react';

interface ReportsViewProps {
  leads: Lead[];
  reps: UserProfile[];
  stages: PipelineStage[];
  interactions: Interaction[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  leads,
  reps,
  stages,
  interactions
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'managers' | 'reps' | 'states' | 'products'>('all');

  const activeReps = reps.filter(r => r.role === 'sales_rep');
  const salesManagers = reps.filter(r => r.role === 'sales_manager');

  // If no manager is explicitly created, include super admin / managers
  const managersOrLeadership = salesManagers.length > 0
    ? salesManagers
    : reps.filter(r => r.role === 'super_admin');

  // 1. Sales Managers Performance Data
  const managerPerformance = managersOrLeadership.map(manager => {
    const managerLeads = leads.filter(l => l.assigned_rep_id === manager.id);
    const total = managerLeads.length;
    const stagesManaged = new Set(managerLeads.map(l => l.current_stage_id || l.current_stage_name)).size;
    const agreementsWon = managerLeads.filter(
      l => l.current_stage_name === 'Agreement Stage' || l.current_stage_id === 'stage-7'
    ).length;
    const activitiesCount = interactions.filter(i => i.created_by_id === manager.id).length;
    const winRate = total > 0 ? Math.round((agreementsWon / total) * 100) : 0;

    return {
      id: manager.id,
      name: manager.full_name,
      employeeId: manager.employee_id,
      designation: manager.designation,
      status: manager.status,
      totalLeads: total,
      stagesManaged,
      agreementsWon,
      activitiesCount,
      winRate
    };
  });

  // 2. Sales Representative Performance Table data
  const repPerformance = activeReps.map(rep => {
    const repLeads = leads.filter(l => l.assigned_rep_id === rep.id);
    const total = repLeads.length;
    const visits = repLeads.filter(l => l.current_stage_name === 'Visit').length;
    const demos = repLeads.filter(l => l.current_stage_name === 'Demo Stage').length;
    const agreements = repLeads.filter(l => l.current_stage_name === 'Agreement Stage').length;
    const conversionRate = total > 0 ? Math.round((agreements / total) * 100) : 0;

    return {
      id: rep.id,
      name: rep.full_name,
      employeeId: rep.employee_id,
      status: rep.status,
      totalLeads: total,
      visits,
      demos,
      agreements,
      conversionRate
    };
  });

  // 3. State-wise Leads Statistics
  const stateStats: Record<string, { total: number; active: number; won: number }> = {};
  leads.forEach(l => {
    const stateKey = l.state || 'Unassigned State';
    if (!stateStats[stateKey]) {
      stateStats[stateKey] = { total: 0, active: 0, won: 0 };
    }
    stateStats[stateKey].total += 1;
    if (l.current_stage_name !== 'Not Interested') {
      stateStats[stateKey].active += 1;
    }
    if (l.current_stage_name === 'Agreement Stage' || l.current_stage_id === 'stage-7') {
      stateStats[stateKey].won += 1;
    }
  });

  const stateChartData = Object.entries(stateStats)
    .map(([state, data]) => ({
      state,
      leads: data.total,
      active: data.active,
      won: data.won,
      winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
    }))
    .sort((a, b) => b.leads - a.leads);

  // 4. Product Sales Data
  const productStats: Record<string, { total: number; won: number }> = {};
  leads.forEach(l => {
    const pKey = l.product || 'Others';
    if (!productStats[pKey]) {
      productStats[pKey] = { total: 0, won: 0 };
    }
    productStats[pKey].total += 1;
    if (l.current_stage_name === 'Agreement Stage' || l.current_stage_id === 'stage-7') {
      productStats[pKey].won += 1;
    }
  });

  const productChartData = Object.entries(productStats)
    .map(([name, data]) => ({
      name,
      count: data.total,
      won: data.won,
      share: leads.length > 0 ? Math.round((data.total / leads.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Color palette strictly AZVASA
  const BRAND_COLORS = ['#084ab8', '#f28705', '#2d2b2a', '#3c75db', '#ffa742', '#06378a', '#b85c00'];

  // CSV Export
  const exportAnalyticsCSV = () => {
    const headers = [
      'Report Section',
      'Entity Name',
      'Identifier / Key',
      'Total Leads',
      'Agreements Won / Closed',
      'Conversion / Win Rate'
    ];

    const rows: string[][] = [];

    // Managers
    managerPerformance.forEach(m => {
      rows.push([
        'Sales Manager',
        `"${m.name}"`,
        m.employeeId,
        String(m.totalLeads),
        String(m.agreementsWon),
        `${m.winRate}%`
      ]);
    });

    // States
    stateChartData.forEach(s => {
      rows.push([
        'State / Territory',
        `"${s.state}"`,
        'State',
        String(s.leads),
        String(s.won),
        `${s.winRate}%`
      ]);
    });

    // Products
    productChartData.forEach(p => {
      rows.push([
        'Product',
        `"${p.name}"`,
        'Curriculum Solution',
        String(p.count),
        String(p.won),
        `${p.share}% Share`
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `azvasa-comprehensive-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#f28705]" />
            Sales Performance & Conversion Analytics
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Territory state penetrations, manager performance metrics, and curriculum product distributions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportAnalyticsCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: SALES MANAGER PERFORMANCE GRAPH & TABLE */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e8e7e5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#084ab8]">
                Sales Manager Performance Comparison
              </h3>
              <p className="text-xs text-[#646260]">
                Leads handled, stages managed, converted institutional accounts, and activities logged
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fafaf9] text-[#646260] border border-[#e8e7e5] self-start sm:self-auto">
            {managerPerformance.length} Manager Accounts
          </span>
        </div>

        <div className="p-5 space-y-5">
          {managerPerformance.length === 0 ? (
            <div className="py-8 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5]">
              <p className="text-xs text-[#646260]">No sales manager data available.</p>
            </div>
          ) : (
            <>
              {/* Comparison Bar Chart */}
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={managerPerformance} margin={{ top: 10, right: 20, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f2f1" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#2d2b2a', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#646260' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="totalLeads" fill="#084ab8" name="Total Leads Handled" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="agreementsWon" fill="#f28705" name="Agreements Won (Converted)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activitiesCount" fill="#2d2b2a" name="Follow-ups / Activities" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Manager Matrix Table */}
              <div className="overflow-x-auto border border-[#e8e7e5] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Sales Manager</th>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Leads Handled</th>
                      <th className="py-3 px-4">Stages Managed</th>
                      <th className="py-3 px-4">Converted Won</th>
                      <th className="py-3 px-4">Activities Completed</th>
                      <th className="py-3 px-4">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f2f1]">
                    {managerPerformance.map(m => (
                      <tr key={m.id} className="hover:bg-[#fafaf9] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#084ab8]">{m.name}</td>
                        <td className="py-3 px-4 text-[#646260]">{m.employeeId}</td>
                        <td className="py-3 px-4 text-[#2d2b2a]">{m.designation}</td>
                        <td className="py-3 px-4 font-semibold text-[#084ab8]">{m.totalLeads}</td>
                        <td className="py-3 px-4 text-[#646260]">{m.stagesManaged} stages</td>
                        <td className="py-3 px-4 font-bold text-[#f28705]">{m.agreementsWon}</td>
                        <td className="py-3 px-4 text-[#2d2b2a]">{m.activitiesCount}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full font-bold bg-[#eef4ff] text-[#084ab8] text-[10px]">
                            {m.winRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: STATE-WISE LEADS PRESENTATION */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f3f2f1] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eef4ff] text-[#084ab8]">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#084ab8]">
                State-wise Leads Analytics
              </h3>
              <p className="text-xs text-[#646260]">
                Institutional outreach and agreement closures across Indian states
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#646260]">
            Dynamic Central Database
          </span>
        </div>

        {stateChartData.length === 0 ? (
          <div className="py-8 text-center bg-[#fafaf9] rounded-xl border border-dashed border-[#e8e7e5]">
            <p className="text-xs text-[#646260]">No states recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={stateChartData.slice(0, 10)}
                  margin={{ top: 5, right: 25, left: 35, bottom: 5 }}
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
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Bar dataKey="leads" fill="#084ab8" name="Total Leads" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="won" fill="#f28705" name="Agreements Won" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#fafaf9] border border-[#e8e7e5] rounded-xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-[#646260] uppercase tracking-wider block">
                Top State Volume
              </span>
              <div className="divide-y divide-[#e8e7e5] max-h-64 overflow-y-auto pr-1 text-xs">
                {stateChartData.map((s, idx) => (
                  <div key={s.state} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#8e8b88] w-4">#{idx + 1}</span>
                      <strong className="text-[#2d2b2a]">{s.state}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold bg-[#eef4ff] text-[#084ab8]">
                        {s.leads} leads
                      </span>
                      {s.won > 0 && (
                        <span className="px-1.5 py-0.5 rounded font-semibold bg-[#fff4e6] text-[#b85c00]">
                          {s.won} won
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

      {/* SECTION 3: PRODUCT-WISE GRAPH & BREAKDOWN */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#f3f2f1] pb-3">
          <div className="p-2 rounded-xl bg-[#fff4e6] text-[#f28705]">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#084ab8]">
              Product-wise Portfolio Distribution
            </h3>
            <p className="text-xs text-[#646260]">
              Institutional curriculum solution adoption and demand across accounts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productChartData}
                  dataKey="count"
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
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {productChartData.map((p, idx) => (
              <div
                key={p.name}
                className="p-3 rounded-xl border border-[#e8e7e5] bg-[#fafaf9] space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }}
                    />
                    <strong className="text-xs text-[#2d2b2a]">{p.name}</strong>
                  </div>
                  <span className="text-xs font-bold text-[#084ab8]">{p.count} leads</span>
                </div>
                <div className="w-full bg-[#e8e7e5] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.share}%`,
                      backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length]
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#646260]">
                  <span>{p.share}% share</span>
                  {p.won > 0 && (
                    <span className="font-semibold text-[#f28705]">{p.won} agreements won</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: SALES REPRESENTATIVE TABLE */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e8e7e5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#f28705]" />
            <h3 className="text-sm font-bold text-[#084ab8]">
              Sales Representative Individual Performance
            </h3>
          </div>
          <span className="text-xs text-[#646260]">
            Field consultant pipeline conversions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
              <tr>
                <th className="py-3 px-4">Representative</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Total Leads</th>
                <th className="py-3 px-4">Visits</th>
                <th className="py-3 px-4">Demos</th>
                <th className="py-3 px-4">Agreements Won</th>
                <th className="py-3 px-4">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f2f1]">
              {repPerformance.map(rep => (
                <tr key={rep.id} className="hover:bg-[#fafaf9] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#2d2b2a]">{rep.name}</td>
                  <td className="py-3 px-4 text-[#646260]">{rep.employeeId}</td>
                  <td className="py-3 px-4 font-semibold text-[#084ab8]">{rep.totalLeads}</td>
                  <td className="py-3 px-4 text-[#2d2b2a]">{rep.visits}</td>
                  <td className="py-3 px-4 text-[#2d2b2a]">{rep.demos}</td>
                  <td className="py-3 px-4 font-bold text-[#f28705]">{rep.agreements}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-[#eef4ff] text-[#084ab8] text-[10px]">
                      {rep.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
