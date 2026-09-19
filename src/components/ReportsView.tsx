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
  LineChart,
  Line
} from 'recharts';
import { Download, TrendingUp, Award, Target, FileSpreadsheet, Briefcase } from 'lucide-react';

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
  const [dateRange, setDateRange] = useState('All Time');

  const activeReps = reps.filter(r => r.role === 'sales_rep');

  // Compute Sales Rep Performance Table data
  const repPerformance = activeReps.map(rep => {
    const repLeads = leads.filter(l => l.assigned_rep_id === rep.id);
    const total = repLeads.length;
    const visits = repLeads.filter(l => l.current_stage_name === 'Visit').length;
    const demos = repLeads.filter(l => l.current_stage_name === 'Demo Stage').length;
    const proposals = repLeads.filter(l => l.current_stage_name === 'Proposal Shared').length;
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
      proposals,
      agreements,
      conversionRate
    };
  });

  // Source effectiveness data
  const sourceStats: Record<string, { total: number; closed: number }> = {};
  leads.forEach(lead => {
    if (!sourceStats[lead.lead_source]) {
      sourceStats[lead.lead_source] = { total: 0, closed: 0 };
    }
    sourceStats[lead.lead_source].total += 1;
    if (lead.current_stage_name === 'Agreement Stage') {
      sourceStats[lead.lead_source].closed += 1;
    }
  });

  const sourceChartData = Object.entries(sourceStats).map(([source, data]) => ({
    source,
    leads: data.total,
    closed: data.closed,
    winRate: data.total > 0 ? Math.round((data.closed / data.total) * 100) : 0
  }));

  // Product sales data
  const productStats: Record<string, number> = {};
  leads.forEach(l => {
    productStats[l.product] = (productStats[l.product] || 0) + 1;
  });
  const productChartData = Object.entries(productStats).map(([name, count]) => ({ name, count }));

  // Color palette strictly AZVASA
  const BRAND_COLORS = ['#084ab8', '#f28705', '#646260', '#06378a', '#b85c00', '#3c75db'];

  // CSV Export for Rep Performance
  const exportPerformanceCSV = () => {
    const headers = [
      'Representative',
      'Employee ID',
      'Status',
      'Total Leads',
      'Visits Conducted',
      'Demos Completed',
      'Proposals Shared',
      'Agreements Closed',
      'Conversion Rate (%)'
    ];

    const rows = repPerformance.map(r => [
      `"${r.name}"`,
      r.employeeId,
      r.status,
      r.totalLeads,
      r.visits,
      r.demos,
      r.proposals,
      r.agreements,
      `${r.conversionRate}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `azvasa-sales-performance-${new Date().toISOString().slice(0, 10)}.csv`);
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
            Evaluate consultant win-rates, lead channel effectiveness, and institutional curriculum velocity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportPerformanceCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#084ab8] text-[#084ab8] hover:bg-[#eef4ff] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Analytics CSV</span>
          </button>
        </div>
      </div>

      {/* Sales Representative Performance Leaderboard */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e8e7e5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#f28705]" />
            <h3 className="text-sm font-bold text-[#084ab8]">
              Sales Representative Performance Table
            </h3>
          </div>
          <span className="text-xs text-[#646260]">
            Tracked across full pipeline lifecycle
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
              <tr>
                <th className="py-3 px-4">Sales Representative</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Total Accounts</th>
                <th className="py-3 px-4">Visits</th>
                <th className="py-3 px-4">Demos</th>
                <th className="py-3 px-4">Proposals</th>
                <th className="py-3 px-4">Agreements</th>
                <th className="py-3 px-4">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f2f1]">
              {repPerformance.map(rep => (
                <tr key={rep.id} className="hover:bg-[#fafaf9] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#2d2b2a]">
                    {rep.name}
                  </td>
                  <td className="py-3.5 px-4 text-[#646260]">
                    {rep.employeeId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#084ab8]">
                    {rep.totalLeads}
                  </td>
                  <td className="py-3.5 px-4 text-[#2d2b2a]">
                    {rep.visits}
                  </td>
                  <td className="py-3.5 px-4 text-[#2d2b2a]">
                    {rep.demos}
                  </td>
                  <td className="py-3.5 px-4 text-[#2d2b2a]">
                    {rep.proposals}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#f28705]">
                    {rep.agreements}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8]">
                      {rep.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Source Effectiveness Chart */}
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-[#2d2b2a] uppercase tracking-wider mb-4">
            Lead Source Effectiveness & Conversion
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#646260' }} />
                <YAxis tick={{ fontSize: 10, fill: '#646260' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e7e5', borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="leads" fill="#084ab8" name="Total Inbound Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" fill="#f28705" name="Agreements Closed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product-wise Sales Distribution */}
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-[#2d2b2a] uppercase tracking-wider mb-4">
            Product Portfolio Distribution
          </h3>
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
                  innerRadius={40}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
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
        </div>

      </div>
    </div>
  );
};
