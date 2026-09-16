import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Eye, 
  Volume2, 
  Shuffle, 
  ArrowDownUp, 
  GitCompare, 
  Sparkles,
  Info
} from 'lucide-react';
import { ComboItem, AdapterConfig, RoutingStrategy, AIService } from '../types';

interface CombosViewProps {
  combos: ComboItem[];
  adapters: AdapterConfig[];
  services: AIService[];
  onUpdateComboStrategy: (comboId: string, strategy: RoutingStrategy) => void;
  onDeleteCombo: (comboId: string) => void;
  onOpenCreateCombo: () => void;
  onToggleAdapter: (adapterId: 'vision' | 'audio') => void;
  onUpdateAdapterStrategy: (adapterId: 'vision' | 'audio', strategy: 'fallback' | 'round_robin') => void;
  onAddModelToAdapter: (adapterId: 'vision' | 'audio', serviceName: string, modelName: string) => void;
}

export const CombosView: React.FC<CombosViewProps> = ({
  combos,
  adapters,
  services,
  onUpdateComboStrategy,
  onDeleteCombo,
  onOpenCreateCombo,
  onToggleAdapter,
  onUpdateAdapterStrategy,
  onAddModelToAdapter,
}) => {
  // Adapter quick-add state
  const [showAddVision, setShowAddVision] = useState(false);
  const [showAddAudio, setShowAddAudio] = useState(false);
  const [newAdapterModel, setNewAdapterModel] = useState('');

  const getStrategyBadge = (strategy: RoutingStrategy) => {
    switch (strategy) {
      case 'fallback':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ArrowDownUp className="w-3 h-3" />
            Fallback (پشتیبان)
          </span>
        );
      case 'round_robin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shuffle className="w-3 h-3" />
            Round Robin (چرخشی)
          </span>
        );
      case 'fusion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <GitCompare className="w-3 h-3" />
            Fusion (داوری نهایی)
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 text-[#e2e8f0]" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                مدیریت روترهای ترکیبی (Combo Routers)
              </h2>
              <p className="text-xs text-[#94a3b8]">
                تجمیع چند مدل هوش مصنوعی در یک نقطه پایانی (Endpoint) واحد با استراتژی‌های توزیع بار و پایداری
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenCreateCombo}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد Combo جدید</span>
        </button>
      </div>

      {/* Combo Cards List */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8] px-1">
          روترهای ترکیبی فعال ({combos.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="rounded-2xl border border-[#243147] bg-[#101726] p-5 shadow-sm flex flex-col gap-4 transition-all hover:border-[#334466]"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50"></span>
                  <h4 className="text-sm font-bold text-white">{combo.name}</h4>
                  {getStrategyBadge(combo.strategy)}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Strategy Quick Selector */}
                  <select
                    value={combo.strategy}
                    onChange={(e) => onUpdateComboStrategy(combo.id, e.target.value as RoutingStrategy)}
                    className="text-[11px] font-medium rounded-lg border border-[#243147] bg-[#162032] px-2 py-1 text-[#cbd5e1] outline-none"
                  >
                    <option value="fallback">Fallback (پشتیبان)</option>
                    <option value="round_robin">Round Robin (چرخشی)</option>
                    <option value="fusion">Fusion (داوری و ادغام)</option>
                  </select>

                  <button
                    onClick={() => onDeleteCombo(combo.id)}
                    className="p-1.5 rounded-lg border border-[#243147] bg-[#162032] text-[#94a3b8] hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                    title="حذف Combo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* یادداشت: نسخه‌ی قبلی اینجا یک Base URL و API Key
                  «اختصاصی» با دکمه‌ی کپی نشان می‌داد (router.local/...)
                  که هیچ سروری آن‌ها را serve نمی‌کرد. چون این اپ بک‌اند
                  ندارد، Combo فقط داخل خود مرورگر روتینگ می‌کند. */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl border border-[#1e293b] bg-[#0c121e] text-[11px] text-[#94a3b8]">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  این Combo فقط داخل همین برنامه کار می‌کند: هنگام ارسال پیام، درخواست طبق
                  استراتژی انتخاب‌شده بین مدل‌های زیر توزیع می‌شود. Endpoint قابل‌فراخوانی
                  از بیرون وجود ندارد، چون این اپ بک‌اند ندارد.
                </span>
              </div>

              {/* Models List in this Combo */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-[#94a3b8]">
                  مدل‌های زنجیره روتینگ (تعداد: {combo.models.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {combo.models.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#243147] bg-[#131b2c] text-xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-[#1e293b] text-[10px] flex items-center justify-center text-[#94a3b8] font-mono">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-white">{m.modelName}</span>
                      <span className="text-[10px] text-[#64748b]">({m.serviceName})</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adapters Section: Vision & Audio */}
      <div className="flex flex-col gap-4 pt-4 border-t border-[#1e293b]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>آداپتورهای چندرسانه‌ای خودکار (Specialized Fallback Adapters)</span>
            </h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              اگر مدل اصلیِ انتخابی توانایی تحلیل عکس یا پردازش صوت را نداشته باشد، درخواست خودکار به این استخر (Pool) سوئیچ می‌شود.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vision Adapter */}
          {adapters.map((adapter) => {
            const isVision = adapter.id === 'vision';
            const isAudio = adapter.id === 'audio';
            const showAdd = isVision ? showAddVision : showAddAudio;
            const setShowAdd = isVision ? setShowAddVision : setShowAddAudio;

            return (
              <div
                key={adapter.id}
                className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all ${
                  adapter.enabled
                    ? 'border-[#243147] bg-[#101726]'
                    : 'border-[#1e293b] bg-[#0c121e]/60 opacity-70'
                }`}
              >
                {/* Adapter Header & Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isVision
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                      }`}
                    >
                      {isVision ? <Eye className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{adapter.name}</h4>
                      <span className="text-[10px] text-[#64748b]">
                        استخر مدل‌های جایگزین برای ورودی‌های چندرسانه‌ای
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adapter.enabled}
                      onChange={() => onToggleAdapter(adapter.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1e293b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[#94a3b8] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Strategy Selector for Adapter */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94a3b8] font-medium">استراتژی روتینگ آداپتور:</span>
                  <select
                    disabled={!adapter.enabled}
                    value={adapter.strategy}
                    onChange={(e) =>
                      onUpdateAdapterStrategy(adapter.id, e.target.value as 'fallback' | 'round_robin')
                    }
                    className="text-[11px] rounded-lg border border-[#243147] bg-[#162032] px-2 py-1 text-[#cbd5e1] outline-none disabled:opacity-50"
                  >
                    <option value="fallback">Fallback (پشتیبان ترتیبی)</option>
                    <option value="round_robin">Round Robin (چرخشی)</option>
                  </select>
                </div>

                {/* Models Pool List */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8]">
                    <span>استخر مدل‌های فعال (Pool):</span>
                    <button
                      type="button"
                      disabled={!adapter.enabled}
                      onClick={() => setShowAdd(!showAdd)}
                      className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      <span>افزودن مدل</span>
                    </button>
                  </div>

                  {showAdd && (
                    <div className="flex items-center gap-2 p-2 rounded-xl border border-[#243147] bg-[#141c2c]">
                      <input
                        type="text"
                        value={newAdapterModel}
                        onChange={(e) => setNewAdapterModel(e.target.value)}
                        placeholder="نام مدل (مثلاً gpt-4o یا claude-3-5-sonnet)"
                        className="flex-1 text-xs rounded-lg border border-[#243147] bg-[#0c121e] px-2 py-1 text-white placeholder-[#475569] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newAdapterModel.trim()) {
                            onAddModelToAdapter(adapter.id, 'Custom Pool', newAdapterModel.trim());
                            setNewAdapterModel('');
                            setShowAdd(false);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        ثبت
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {adapter.pool.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-[#1e293b] bg-[#0d1320] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="font-mono text-white text-[11px]">{item.modelName}</span>
                          <span className="text-[10px] text-[#64748b]">({item.serviceName})</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          آماده
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
