import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Cpu, Shuffle, GitCompare, ArrowDownUp } from 'lucide-react';
import { ComboItem, RoutingStrategy, AIService } from '../types';

interface CreateComboModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: AIService[];
  onSave: (combo: ComboItem) => void;
}

export const CreateComboModal: React.FC<CreateComboModalProps> = ({
  isOpen,
  onClose,
  services,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<RoutingStrategy>('fallback');
  const [selectedModels, setSelectedModels] = useState<
    { serviceId: string; serviceName: string; modelName: string; priority: number; weight?: number; isHealthy: boolean }[]
  >([]);

  const [candidateServiceId, setCandidateServiceId] = useState(services[0]?.id || '');
  const [candidateModelName, setCandidateModelName] = useState('');

  if (!isOpen) return null;

  const handleAddModel = () => {
    const srv = services.find((s) => s.id === candidateServiceId) || services[0];
    if (!srv) return;

    const newModel = {
      serviceId: srv.id,
      serviceName: srv.name,
      modelName: candidateModelName || srv.models[0]?.name || 'default-model',
      priority: selectedModels.length + 1,
      weight: 50,
      isHealthy: true,
    };

    setSelectedModels([...selectedModels, newModel]);
  };

  const handleRemoveModel = (index: number) => {
    setSelectedModels(selectedModels.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedModels.length === 0) return;

    // قبلاً اینجا یک endpoint و API Key ساختگی تولید می‌شد و در UI
    // مثل اعتبارنامه‌ی واقعی نمایش داده می‌شد. این اپ بک‌اند ندارد،
    // پس چنین چیزی وجود خارجی نداشت و فقط گمراه‌کننده بود.
    const newCombo: ComboItem = {
      id: `combo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      strategy,
      models: selectedModels,
    };

    onSave(newCombo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-2xl border border-[#243147] bg-[#0e1422] shadow-2xl flex flex-col overflow-hidden text-[#e2e8f0]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121927]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">ایجاد روتر ترکیبی جدید (Create Combo)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1a2333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          {/* Combo Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#94a3b8]">نام گروه Combo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: High Reliability Pool یا Creative Fusion"
              className="w-full text-xs rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 text-white placeholder-[#475569] outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Strategy Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#94a3b8]">
              استراتژی روتینگ (Routing Strategy)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Fallback */}
              <button
                type="button"
                onClick={() => setStrategy('fallback')}
                className={`p-3 rounded-xl border text-right flex flex-col gap-1 transition-all ${
                  strategy === 'fallback'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-[#243147] bg-[#141c2c] text-[#94a3b8] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  <span>Fallback</span>
                </div>
                <span className="text-[10px] text-[#94a3b8]">
                  تلاش به ترتیب تا دریافت پاسخ موفق
                </span>
              </button>

              {/* Round Robin */}
              <button
                type="button"
                onClick={() => setStrategy('round_robin')}
                className={`p-3 rounded-xl border text-right flex flex-col gap-1 transition-all ${
                  strategy === 'round_robin'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-[#243147] bg-[#141c2c] text-[#94a3b8] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Round Robin</span>
                </div>
                <span className="text-[10px] text-[#94a3b8]">
                  پخش چرخشی بار میان مدل‌ها
                </span>
              </button>

              {/* Fusion */}
              <button
                type="button"
                onClick={() => setStrategy('fusion')}
                className={`p-3 rounded-xl border text-right flex flex-col gap-1 transition-all ${
                  strategy === 'fusion'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-[#243147] bg-[#141c2c] text-[#94a3b8] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Fusion (داوری)</span>
                </div>
                <span className="text-[10px] text-[#94a3b8]">
                  پرسش همزمان + ترکیب پاسخ توسط داور
                </span>
              </button>
            </div>
          </div>

          {/* Models Inside this Combo */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1e293b]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#94a3b8]">
                مدل‌های عضو این Combo ({selectedModels.length})
              </label>
              <span className="text-[10px] text-[#64748b]">
                اولویت بالا به پایین است
              </span>
            </div>

            {/* Models List */}
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {selectedModels.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#243147] bg-[#141c2c]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1e293b] text-[10px] font-mono text-center flex items-center justify-center text-[#94a3b8]">
                      {index + 1}
                    </span>
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <div>
                      <span className="text-xs font-medium text-white">{item.modelName}</span>
                      <span className="text-[10px] text-[#64748b] mr-2">({item.serviceName})</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveModel(index)}
                    className="p-1 rounded text-[#94a3b8] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Model to Combo Bar */}
            <div className="flex items-center gap-2 p-2 rounded-xl border border-dashed border-[#243147] bg-[#101726]">
              <select
                value={candidateServiceId}
                onChange={(e) => setCandidateServiceId(e.target.value)}
                className="text-xs rounded-lg border border-[#243147] bg-[#141c2c] px-2 py-1.5 text-white outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={candidateModelName}
                onChange={(e) => setCandidateModelName(e.target.value)}
                placeholder="نام مدل (مثلاً gpt-4o)"
                className="flex-1 text-xs rounded-lg border border-[#243147] bg-[#141c2c] px-2 py-1.5 text-white placeholder-[#475569] outline-none"
              />

              <button
                type="button"
                onClick={handleAddModel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1e293b] hover:bg-[#28374f] text-white transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#162032] transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={!name.trim() || selectedModels.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              ذخیره و ایجاد Combo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
