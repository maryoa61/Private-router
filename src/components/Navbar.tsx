import React from 'react';
import { 
  Cpu, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  PanelRightClose, 
  PanelRight, 
  Globe, 
  Sparkles,
  Layers,
  MessageSquare
} from 'lucide-react';

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  lang: 'fa' | 'en';
  onToggleLang: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  activeView: 'chat' | 'combos';
  onSelectView: (view: 'chat' | 'combos') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  onOpenSettings,
  activeView,
  onSelectView,
}) => {
  return (
    <header className="h-14 border-b border-[#1e293b] bg-[#101726] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Right side in RTL: Sidebar Toggle + App Brand */}
      <div className="flex items-center gap-3">
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl border border-[#243147] bg-[#162032] text-[#94a3b8] hover:text-white hover:bg-[#1e2c44] transition-colors"
          title={sidebarOpen ? 'بستن سایدبار' : 'باز کردن سایدبار'}
        >
          {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 leading-tight">
              <span>Combo Router &amp; AI Chat</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-[#64748b]">
              روتر ترکیبی هوشمند API و کلاینت پیشرفته چت
            </p>
          </div>
        </div>
      </div>

      {/* Center: Quick navigation between Chat and Combos */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-xl border border-[#1e293b] bg-[#0c121e]">
        <button
          onClick={() => onSelectView('chat')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            activeView === 'chat'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>محیط چت</span>
        </button>

        <button
          onClick={() => onSelectView('combos')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            activeView === 'combos'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>روترها و آداپتورها</span>
        </button>
      </div>

      {/* Left side in RTL: Language switch, Theme switch, Settings */}
      <div className="flex items-center gap-2">
        {/* Language switch button (Flag icon) */}
        <button
          id="lang-toggle-btn"
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#243147] bg-[#162032] text-xs text-[#cbd5e1] hover:text-white transition-colors"
          title="تعویض زبان (فارسی / English)"
        >
          <span className="text-sm">🚩</span>
          <span className="text-[11px] font-mono font-bold uppercase">{lang}</span>
        </button>

        {/* Theme switch button */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleTheme}
          className="p-2 rounded-xl border border-[#243147] bg-[#162032] text-[#94a3b8] hover:text-white transition-colors"
          title="تعویض پوسته"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Settings button */}
        <button
          id="settings-btn"
          onClick={onOpenSettings}
          className="p-2 rounded-xl border border-[#243147] bg-[#162032] text-[#94a3b8] hover:text-white hover:bg-[#1e2c44] transition-colors"
          title="تنظیمات سامانه"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
