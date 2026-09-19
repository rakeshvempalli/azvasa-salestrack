import React from 'react';
import { PipelineStage, Lead } from '../types';
import { ChevronRight, ArrowRight, XCircle, CheckCircle } from 'lucide-react';

interface PipelineViewProps {
  stages: PipelineStage[];
  leads: Lead[];
  onSelectStage?: (stageId: string) => void;
  selectedStageId?: string | null;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  stages,
  leads,
  onSelectStage,
  selectedStageId
}) => {
  const totalLeads = leads.length;

  // Split active pipeline stages vs Not Interested
  const activeStages = stages
    .filter(s => s.active && s.name !== 'Not Interested')
    .sort((a, b) => a.display_order - b.display_order);

  const closedLostStage = stages.find(s => s.name === 'Not Interested');

  return (
    <div className="w-full bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#084ab8] tracking-tight">
            Sales Pipeline Progression
          </h3>
          <p className="text-xs text-[#646260]">
            Track school accounts through progressive engagement stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedStageId && (
            <button
              onClick={() => onSelectStage && onSelectStage('')}
              className="text-[11px] font-semibold text-[#084ab8] hover:underline"
            >
              Clear stage filter
            </button>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eef4ff] text-[#084ab8] border border-[#084ab8]/20">
            {totalLeads} Total Prospects
          </span>
        </div>
      </div>

      {/* Pipeline Progression Steps (Horizontal scroll on smaller screens, grid on desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {activeStages.map((stage, idx) => {
          const stageLeads = leads.filter(l => l.current_stage_id === stage.id || l.current_stage_name === stage.name);
          const count = stageLeads.length;
          const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
          const isSelected = selectedStageId === stage.id;

          // Subtle gradient styling from brand blue to brand orange
          const isLateStage = idx >= 4;

          return (
            <div
              key={stage.id}
              onClick={() => onSelectStage && onSelectStage(isSelected ? '' : stage.id)}
              className={`relative rounded-xl p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#084ab8] bg-[#eef4ff] ring-2 ring-[#084ab8]/20 shadow-xs'
                  : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-white hover:border-[#084ab8]/40 hover:shadow-xs'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-[#646260] border border-[#e8e7e5]">
                  Step {idx + 1}
                </span>
                {idx < activeStages.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#8e8b88] hidden lg:block" />
                )}
              </div>

              <div className="my-1">
                <span className="text-xs font-bold text-[#2d2b2a] line-clamp-1 block" title={stage.name}>
                  {stage.name}
                </span>
                <span className="text-[10px] text-[#646260] line-clamp-1">
                  {stage.description || 'Active stage'}
                </span>
              </div>

              {/* Counts & Percentage */}
              <div className="mt-2 pt-2 border-t border-[#e8e7e5] flex items-baseline justify-between">
                <span className={`text-base font-extrabold ${isLateStage ? 'text-[#f28705]' : 'text-[#084ab8]'}`}>
                  {count}
                </span>
                <span className="text-[11px] font-semibold text-[#646260]">
                  {pct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-[#e8e7e5] rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isLateStage ? 'bg-[#f28705]' : 'bg-[#084ab8]'}`}
                  style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Closed / Lost State: Not Interested */}
      {closedLostStage && (
        <div className="mt-3 pt-3 border-t border-[#f3f2f1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {(() => {
            const lostLeads = leads.filter(
              l => l.current_stage_id === closedLostStage.id || l.current_stage_name === 'Not Interested'
            );
            const isSelected = selectedStageId === closedLostStage.id;
            return (
              <div
                onClick={() => onSelectStage && onSelectStage(isSelected ? '' : closedLostStage.id)}
                className={`w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-3.5 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-[#646260] bg-[#f3f2f1] ring-1 ring-[#646260]'
                    : 'border-[#e8e7e5] bg-[#fafaf9] hover:bg-[#f3f2f1]'
                }`}
              >
                <div className="flex items-center gap-2 text-[#646260]">
                  <XCircle className="w-4 h-4 text-[#8e8b88]" />
                  <span className="font-semibold text-[#2d2b2a]">
                    Closed State: {closedLostStage.name}
                  </span>
                  <span className="text-[11px] text-[#646260] hidden md:inline">
                    (Budget limits, deferred or opting out)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#646260] px-2 py-0.5 rounded-full bg-white border border-[#e8e7e5]">
                    {lostLeads.length} leads
                  </span>
                  <span className="text-[11px] text-[#8e8b88]">
                    {totalLeads > 0 ? Math.round((lostLeads.length / totalLeads) * 100) : 0}%
                  </span>
                </div>
              </div>
            );
          })()}

          <span className="text-[11px] text-[#646260] italic">
            * Click any stage card to filter the lead management list below
          </span>
        </div>
      )}
    </div>
  );
};
