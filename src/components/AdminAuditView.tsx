import React, { useState } from 'react';
import { AuditLog, SystemSetting } from '../types';
import {
  FileSpreadsheet,
  Shield,
  Download,
  Search,
  Filter,
  Sliders,
  CheckCircle2,
  Lock,
  Database
} from 'lucide-react';

interface AdminAuditViewProps {
  auditLogs: AuditLog[];
  settings: SystemSetting[];
  onUpdateSetting: (key: string, value: string) => void;
}

export const AdminAuditView: React.FC<AdminAuditViewProps> = ({
  auditLogs,
  settings,
  onUpdateSetting
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'settings'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const details = log.details || log.new_value || log.record_title || '';
      if (!log.user_name.toLowerCase().includes(q) && !details.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (actionFilter && log.action !== actionFilter) {
      return false;
    }
    return true;
  });

  const exportAuditCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.user_name}"`,
      `"${l.action}"`,
      `"${l.entity_type || l.record_type || 'Record'}"`,
      `"${l.entity_id || l.record_id || ''}"`,
      `"${(l.details || l.new_value || l.record_title || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `azvasa-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#f28705]" />
            System Governance & Enterprise Audit Logs
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Immutable tracking of lead updates, reassignments, stage transitions, and administrative policies
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sub Tab Switcher */}
          <div className="flex bg-[#f3f2f1] p-1 rounded-xl border border-[#e8e7e5] text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('audit')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeSubTab === 'audit' ? 'bg-white text-[#084ab8] shadow-xs' : 'text-[#646260]'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeSubTab === 'settings' ? 'bg-white text-[#084ab8] shadow-xs' : 'text-[#646260]'
              }`}
            >
              System Settings
            </button>
          </div>

          {activeSubTab === 'audit' && (
            <button
              onClick={exportAuditCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#084ab8] text-[#084ab8] hover:bg-[#eef4ff] rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {activeSubTab === 'audit' && (
        <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-[#e8e7e5] bg-[#fafaf9] flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#8e8b88] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit details or performing user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
            >
              <option value="">All Actions</option>
              <option value="Lead Created">Lead Created</option>
              <option value="Lead Updated">Lead Updated</option>
              <option value="Lead Reassigned">Lead Reassigned</option>
              <option value="Stage Changed">Stage Changed</option>
              <option value="Interaction Logged">Interaction Logged</option>
              <option value="Sales Rep Added">Sales Rep Added</option>
              <option value="Sales Rep Updated">Sales Rep Updated</option>
            </select>
          </div>

          {/* Audit Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#fafaf9] border-b border-[#e8e7e5] text-[#646260] font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Modification Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f2f1]">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#646260] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#2d2b2a] whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#646260] whitespace-nowrap capitalize">
                      {log.entity_type || log.record_type || 'Record'}
                    </td>
                    <td className="py-3 px-4 text-[#2d2b2a]">
                      {log.details || log.new_value || log.record_title}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="bg-white border border-[#e8e7e5] rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[#084ab8]">
              Enterprise System Configuration
            </h3>
            <p className="text-xs text-[#646260] mt-0.5">
              Control global sales policies, notification cadences, and automated reminders
            </p>
          </div>

          <div className="space-y-4 divide-y divide-[#f3f2f1]">
            {settings.map(s => (
              <div key={s.id} className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <strong className="text-xs font-bold text-[#2d2b2a] block">
                    {s.key.replace(/_/g, ' ').toUpperCase()}
                  </strong>
                  <span className="text-xs text-[#646260]">
                    {s.description}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.value}
                    onChange={(e) => onUpdateSetting(s.key, e.target.value)}
                    className="px-3 py-1.5 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8] font-mono w-48"
                  />
                  <button
                    onClick={() => alert(`Setting ${s.key} saved!`)}
                    className="px-3 py-1.5 bg-[#084ab8] text-white rounded-xl text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
