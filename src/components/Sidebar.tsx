import React, { useState } from 'react';
import { 
  Server, 
  Layers, 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Cpu, 
  Sliders, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { AIService, ComboItem, Conversation } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  services: AIService[];
  combos: ComboItem[];
  conversations: Conversation[];
  activeConversationId: string;
  activeView: 'chat' | 'combos';
  onSelectConversation: (id: string) => void;
  onNewConversation: (targetId: string, targetType: 'service' | 'combo', targetName: string) => void;
  onSelectView: (view: 'chat' | 'combos') => void;
  onOpenAddService: () => void;
  onOpenCreateCombo: () => void;
  onDeleteConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  services,
  combos,
  conversations,
  activeConversationId,
  activeView,
  onSelectConversation,
  onNewConversation,
  onSelectView,
  onOpenAddService,
  onOpenCreateCombo,
  onDeleteConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.targetName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      id="app-sidebar"
      className="w-80 border-l border-[#1e293b] bg-[#0e1422] flex flex-col shrink-0 overflow-hidden text-[#e2e8f0] z-20"
      dir="rtl"
    >
      {/* Top View Switcher: Chat Client vs Combo Router Manager */}
      <div className="p-3 border-b border-[#1e293b] bg-[#101726] flex items-center gap-1.5">
        <button
          onClick={() => onSelectView('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            activeView === 'chat'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'bg-[#162032] text-[#94a3b8] hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>کلاینت چت</span>
        </button>

        <button
          onClick={() => onSelectView('combos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all ${
            activeView === 'combos'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
              : 'bg-[#162032] text-[#94a3b8] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>پنل روتر Combo</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-6">
        {/* 1. Services Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#94a3b8] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>سرویس‌ها ({services.length})</span>
            </span>
            <button
              onClick={onOpenAddService}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-[#243147] bg-[#162032] text-[#cbd5e1] hover:text-white hover:border-blue-500/40 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>افزودن</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {services.map((srv) => (
              <div
                key={srv.id}
                onClick={() => {
                  onSelectView('chat');
                  onNewConversation(srv.id, 'service', srv.name);
                }}
                className="group flex items-center justify-between p-2 rounded-xl border border-[#1e293b] bg-[#121929] hover:bg-[#19243a] hover:border-blue-500/30 cursor-pointer transition-all text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-white truncate">{srv.name}</span>
                    <span className="text-[10px] text-[#64748b] truncate">{srv.preset} • {srv.models.length} مدل</span>
                  </div>
                </div>
                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  چت ◄
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Combos Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#94a3b8] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Comboها ({combos.length})</span>
            </span>
            <button
              onClick={onOpenCreateCombo}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-[#243147] bg-[#162032] text-[#cbd5e1] hover:text-white hover:border-indigo-500/40 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>افزودن</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {combos.map((combo) => (
              <div
                key={combo.id}
                onClick={() => {
                  onSelectView('chat');
                  onNewConversation(combo.id, 'combo', combo.name);
                }}
                className="group flex items-center justify-between p-2 rounded-xl border border-[#1e293b] bg-[#121929] hover:bg-[#19243a] hover:border-indigo-500/30 cursor-pointer transition-all text-xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-white truncate">{combo.name}</span>
                    <span className="text-[10px] text-[#64748b] truncate capitalize">
                      استراتژی: {combo.strategy} • {combo.models.length} مدل
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  چت ◄
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Conversations Section */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#94a3b8] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>گفتگوها ({conversations.length})</span>
            </span>
            <button
              onClick={() => {
                const first = services[0]
                  ? { id: services[0].id, type: 'service' as const, name: services[0].name }
                  : combos[0]
                  ? { id: combos[0].id, type: 'combo' as const, name: combos[0].name }
                  : null;
                if (first) onNewConversation(first.id, first.type, first.name);
              }}
              disabled={services.length === 0 && combos.length === 0}
              title={services.length === 0 && combos.length === 0 ? 'ابتدا یک سرویس یا Combo اضافه کنید' : 'گفتگوی جدید با اولین سرویس/Combo موجود'}
              className="text-[11px] font-medium px-2 py-0.5 rounded-lg border border-[#243147] bg-[#162032] text-[#cbd5e1] hover:text-white transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              <span>گفتگوی جدید</span>
            </button>
          </div>

          {/* Search Conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی گفتگوها..."
              className="w-full text-xs pr-8 pl-3 py-1.5 rounded-xl border border-[#243147] bg-[#141c2c] text-white placeholder-[#475569] outline-none focus:border-blue-500"
            />
          </div>

          {/* Conversations list */}
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {filteredConversations.map((conv) => {
              const isActive = activeView === 'chat' && activeConversationId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectView('chat');
                    onSelectConversation(conv.id);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-500/10 text-white'
                      : 'border-[#1e293b] bg-[#121929] text-[#cbd5e1] hover:bg-[#19243a]'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 overflow-hidden pr-1">
                    <span className="font-semibold truncate text-[11px]">{conv.title}</span>
                    <span className="text-[10px] text-[#64748b] truncate">{conv.targetName} • {conv.updatedAt}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all text-[#64748b]"
                    title="حذف گفتگو"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer Info Badge */}
      <div className="p-3 border-t border-[#1e293b] bg-[#101726] flex items-center justify-between text-[11px] text-[#64748b]">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>پروکسی و روتینگ محلی فعال</span>
        </div>
        <span className="font-mono text-[10px]">v1.1</span>
      </div>
    </aside>
  );
};
