import React, { useState } from 'react';
import { PipelineStage } from '../types';
import { Sliders, ArrowUp, ArrowDown, Plus, Edit, Check, X, ShieldAlert } from 'lucide-react';

interface AdminPipelineViewProps {
  stages: PipelineStage[];
  onUpdateStages: (newStages: PipelineStage[]) => void;
}

export const AdminPipelineView: React.FC<AdminPipelineViewProps> = ({
  stages,
  onUpdateStages
}) => {
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageDescription, setNewStageDescription] = useState('');

  const sortedStages = [...stages].sort((a, b) => a.display_order - b.display_order);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newStages = [...sortedStages];
    const tempOrder = newStages[index].display_order;
    newStages[index].display_order = newStages[index - 1].display_order;
    newStages[index - 1].display_order = tempOrder;
    onUpdateStages(newStages);
  };

  const handleMoveDown = (index: number) => {
    if (index === sortedStages.length - 1) return;
    const newStages = [...sortedStages];
    const tempOrder = newStages[index].display_order;
    newStages[index].display_order = newStages[index + 1].display_order;
    newStages[index + 1].display_order = tempOrder;
    onUpdateStages(newStages);
  };

  const handleStartEdit = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description);
  };

  const handleSaveEdit = (stageId: string) => {
    if (!editName.trim()) return;
    const updated = stages.map(s => {
      if (s.id === stageId) {
        return { ...s, name: editName.trim(), description: editDescription.trim() };
      }
      return s;
    });
    onUpdateStages(updated);
    setEditingStageId(null);
  };

  const handleToggleActive = (stageId: string) => {
    const updated = stages.map(s => {
      if (s.id === stageId) {
        return { ...s, active: !s.active };
      }
      return s;
    });
    onUpdateStages(updated);
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      display_order: sortedStages.length + 1,
      color: '#084ab8',
      active: true,
      description: newStageDescription.trim() || 'Custom academic stage'
    };

    onUpdateStages([...stages, newStage]);
    setNewStageName('');
    setNewStageDescription('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#084ab8] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#f28705]" />
            Academic Pipeline Progression Configuration
          </h2>
          <p className="text-xs text-[#646260] mt-0.5">
            Configure sales lifecycle stages, display ordering, and milestone requirements for institutional deals
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#084ab8] hover:bg-[#06378a] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Pipeline Stage</span>
        </button>
      </div>

      {/* Stage List */}
      <div className="bg-white border border-[#e8e7e5] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#e8e7e5] bg-[#fafaf9] flex items-center justify-between">
          <span className="text-xs font-bold text-[#646260] uppercase tracking-wider">
            Active Deal Progression Funnel
          </span>
          <span className="text-xs text-[#8e8b88]">
            Use arrows to reorder progression sequence
          </span>
        </div>

        <div className="divide-y divide-[#f3f2f1]">
          {sortedStages.map((stage, index) => {
            const isEditing = editingStageId === stage.id;

            return (
              <div
                key={stage.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#fafaf9] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#eef4ff] text-[#084ab8] font-bold text-xs flex items-center justify-center shrink-0 border border-[#084ab8]/20">
                    {stage.display_order}
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-[#084ab8] rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="px-2.5 py-1 text-xs border border-[#e8e7e5] rounded-lg bg-white"
                      />
                      <button
                        onClick={() => handleSaveEdit(stage.id)}
                        className="p-1 bg-[#084ab8] text-white rounded-lg"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingStageId(null)}
                        className="p-1 border border-[#e8e7e5] rounded-lg text-[#646260]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-[#2d2b2a]">
                          {stage.name}
                        </strong>
                        {!stage.active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f3f2f1] text-[#8e8b88]">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#646260] block">
                        {stage.description}
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center border border-[#e8e7e5] rounded-xl overflow-hidden">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-[#f3f2f1] text-[#646260] disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedStages.length - 1}
                      className="p-1.5 hover:bg-[#f3f2f1] text-[#646260] disabled:opacity-30 disabled:cursor-not-allowed border-l border-[#e8e7e5]"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleStartEdit(stage)}
                    className="p-1.5 rounded-xl border border-[#e8e7e5] hover:bg-[#f3f2f1] text-[#646260]"
                    title="Edit Stage"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleActive(stage.id)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border transition-colors ${
                      stage.active
                        ? 'border-[#e8e7e5] text-[#646260] hover:text-[#b85c00]'
                        : 'border-[#084ab8] text-[#084ab8] bg-[#eef4ff]'
                    }`}
                  >
                    {stage.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Stage Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#e8e7e5] shadow-2xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#084ab8]">
                Add Custom Pipeline Stage
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8e8b88] hover:text-[#2d2b2a]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Stage Name <span className="text-[#f28705]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MOE Approval Pending"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2d2b2a] mb-1">
                  Description / Milestone Goal
                </label>
                <input
                  type="text"
                  placeholder="e.g. Awaiting board clearance"
                  value={newStageDescription}
                  onChange={(e) => setNewStageDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#e8e7e5] rounded-xl bg-white focus:outline-none focus:border-[#084ab8]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-[#646260] border border-[#e8e7e5] rounded-xl hover:bg-[#f3f2f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#084ab8] hover:bg-[#06378a] rounded-xl shadow-xs"
                >
                  Create Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
