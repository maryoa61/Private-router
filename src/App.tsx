import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CombosView } from './components/CombosView';
import { AddServiceModal } from './components/AddServiceModal';
import { CreateComboModal } from './components/CreateComboModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLogin } from './components/AdminLogin';
import { UnlockVault } from './components/UnlockVault';
import { 
  initialServices, 
  initialCombos, 
  initialAdapters, 
  initialConversations, 
  promptTemplates as initialPromptTemplates, 
  defaultSettings 
} from './mockData';
import { AIService, ComboItem, AdapterConfig, Conversation, PromptTemplate, AppSettings, RoutingStrategy } from './types';
import {
  vaultExists,
  persistServices,
  loadPlainServices,
  disableVault,
  STORAGE_KEY_VAULT,
  STORAGE_KEY_SERVICES,
} from './utils/vault';
import { callServiceChat, callComboChat } from './utils/chatApi';

const CODE_DOCTOR_PROMPT =
  'نقش تو متخصص عیب‌یابی نرم‌افزار است. خطا یا لاگ کاربر را با دقت واکاوی کن، علت ریشه‌ای را در یک پاراگراف توضیح بده و نسخه کامل و اصلاح‌شده کد را بدون ابهام بازنویسی کن. پاسخ را دقیقاً با همین فرمت بده:\nعلت: <یک پاراگراف>\nراه‌حل: <یک پاراگراف>\n```<زبان برنامه‌نویسی>\n<کد کامل اصلاح‌شده>\n```';

function looksLikeCode(text: string): boolean {
  return /function|const |class |Exception|Traceback|Error:|```|\{[\s\S]*\}/.test(text);
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'combos'>('chat');

  // Admin separation
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('admin_auth') === '1');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin'));

  useEffect(() => {
    const checkRoute = () => setIsAdminRoute(window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin'));
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => { window.removeEventListener('hashchange', checkRoute); window.removeEventListener('popstate', checkRoute); };
  }, []);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    setActiveView('combos');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAdmin(false);
    setIsAdminRoute(false);
    window.history.pushState({}, '', '/');
    setActiveView('chat');
  };

  const handleGoAdmin = () => {
    if (isAdmin) {
      window.history.pushState({}, '', '/admin');
      setIsAdminRoute(true);
      setActiveView('combos');
    } else {
      setShowAdminLogin(true);
    }
  };

  // Vault: when locked, services live encrypted at rest and the derived key is
  // held only in memory for this session.
  const [vaultSession, setVaultSession] = useState<{ key: CryptoKey; salt: Uint8Array } | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(() => vaultExists());

  // Core States with LocalStorage support for Services
  const [services, setServices] = useState<AIService[]>(() =>
    vaultExists() ? [] : loadPlainServices(initialServices)
  );
  const [combos, setCombos] = useState<ComboItem[]>(initialCombos);
  const [adapters, setAdapters] = useState<AdapterConfig[]>(initialAdapters);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(initialPromptTemplates);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('private_router_settings_v1');
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch { /* ignore corrupted settings */ }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem('private_router_settings_v1', JSON.stringify(settings));
    } catch { /* quota or private mode */ }
  }, [settings]);
  const [activeConversationId, setActiveConversationId] = useState<string>(initialConversations[0]?.id || '');

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isCreateComboOpen, setIsCreateComboOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Skip while locked: services is an empty placeholder and writing it would
    // overwrite the real vault with nothing.
    if (isLocked) return;
    void persistServices(services, vaultSession);
  }, [services, vaultSession, isLocked]);

  const handleUnlocked = (session: { key: CryptoKey; salt: Uint8Array }, loaded: AIService[]) => {
    setVaultSession(session);
    setServices(loaded);
    setIsLocked(false);
  };

  const handleForgotPassphrase = () => {
    localStorage.removeItem(STORAGE_KEY_VAULT);
    localStorage.removeItem(STORAGE_KEY_SERVICES);
    setVaultSession(null);
    setServices([]);
    setIsLocked(false);
    setSettings(prev => ({ ...prev, hasKeyLock: false }));
  };

  /** Called by SettingsModal after it has already written the vault. */
  const handleVaultChange = (session: { key: CryptoKey; salt: Uint8Array } | null) => {
    setVaultSession(session);
  };

  const handleRestoreSync = (data: {
    settings?: AppSettings;
    services?: AIService[];
    combos?: ComboItem[];
    conversations?: Conversation[];
    promptTemplates?: PromptTemplate[];
  }) => {
    if (data.settings) setSettings(prev => ({ ...prev, ...data.settings, gistToken: prev.gistToken }));
    if (Array.isArray(data.services)) setServices(data.services);
    if (Array.isArray(data.combos)) setCombos(data.combos);
    if (Array.isArray(data.conversations)) {
      setConversations(data.conversations);
      if (data.conversations[0]) setActiveConversationId(data.conversations[0].id);
    }
    if (Array.isArray(data.promptTemplates)) setPromptTemplates(data.promptTemplates);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light'); else root.classList.remove('light');
  }, [theme]);
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  }, [lang]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleSaveService = (s: AIService) => setServices(prev => [s, ...prev]);
  const handleSaveCombo = (c: ComboItem) => setCombos(prev => [c, ...prev]);
  const handleUpdateComboStrategy = (id: string, strategy: RoutingStrategy) => setCombos(prev => prev.map(c => c.id === id ? { ...c, strategy } : c));
  const handleDeleteCombo = (id: string) => setCombos(prev => prev.filter(c => c.id !== id));
  const handleToggleAdapter = (id: 'vision' | 'audio') => setAdapters(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const handleUpdateAdapterStrategy = (id: 'vision' | 'audio', strategy: 'fallback' | 'round_robin') => setAdapters(prev => prev.map(a => a.id === id ? { ...a, strategy } : a));
  const handleAddModelToAdapter = (id: 'vision' | 'audio', serviceName: string, modelName: string) => setAdapters(prev => prev.map(a => a.id === id ? { ...a, pool: [...a.pool, { serviceName, modelName, isHealthy: true }] } : a));
  const handleNewConversation = (targetId: string, targetType: 'service' | 'combo', targetName: string) => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: `گفتگو با ${targetName}`,
      serviceOrComboId: targetId,
      targetType,
      targetName,
      updatedAt: 'هم‌اکنون',
      systemPrompt: '',
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 4096,
      contextLimit: 6,
      messages: [{ id: `m-${Date.now()}`, role: 'assistant', content: `سلام! من متصل به «${targetName}» هستم. چطور می‌توانم کمکتان کنم؟`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveView('chat');
  };
  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeConversationId === id && filtered.length > 0) setActiveConversationId(filtered[0].id);
      return filtered;
    });
  };
  const handleSendMessage = async (text: string, withWebSearch: boolean) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: any = { id: `m-${Date.now()}`, role: 'user' as const, content: text, timestamp: ts(), hasWebSearch: withWebSearch };
    const pendingMsg: any = { id: `m-${Date.now() + 1}`, role: 'assistant' as const, content: '', timestamp: ts(), isPending: true };

    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, userMsg, pendingMsg], updatedAt: 'هم‌اکنون' } : c));

    const extraSystemPrompt = looksLikeCode(text) ? CODE_DOCTOR_PROMPT : undefined;
    if (withWebSearch && !extraSystemPrompt) {
      // Note: real web search requires a search-capable model/tool on the target service itself;
      // we just flag intent to the model here rather than faking search results.
    }

    let result: { success: boolean; content: string; error?: string };
    if (activeConversation.targetType === 'combo') {
      const combo = combos.find(c => c.id === activeConversation.serviceOrComboId);
      if (!combo) {
        result = { success: false, content: '', error: 'این Combo دیگر وجود ندارد.' };
      } else {
        result = await callComboChat(combo, services, activeConversation, text, extraSystemPrompt, settings.workerSecurityToken);
      }
    } else {
      const service = services.find(s => s.id === activeConversation.serviceOrComboId);
      if (!service) {
        result = { success: false, content: '', error: 'این سرویس دیگر وجود ندارد.' };
      } else {
        const resolved = { ...service, corsProxy: service.corsProxy || settings.defaultCorsProxy || undefined };
        result = await callServiceChat(resolved, activeConversation, text, undefined, extraSystemPrompt, settings.workerSecurityToken);
      }
    }

    const finalMsg: any = result.success
      ? { id: pendingMsg.id, role: 'assistant' as const, content: result.content, timestamp: ts() }
      : { id: pendingMsg.id, role: 'assistant' as const, content: `❌ ${result.error || 'خطای ناشناخته'}`, timestamp: ts(), isError: true };

    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return { ...c, messages: c.messages.map(m => m.id === pendingMsg.id ? finalMsg : m), updatedAt: 'هم‌اکنون' };
    }));
  };
  const handleSavePromptToLibrary = (title: string, content: string) => setPromptTemplates(prev => [{ id: `pt-${Date.now()}`, title, content, category: 'شخصی' }, ...prev]);
  const handleUpdateConversationSettings = (upd: any) => { if (!activeConversation) return; setConversations(prev => prev.map(c => c.id === activeConversation.id ? { ...c, ...upd } : c)); };
  const handleWipeData = () => {
    setServices([]); setCombos([]); setConversations([]); setPromptTemplates([]); setActiveConversationId('');
    localStorage.removeItem(STORAGE_KEY_VAULT);
    localStorage.removeItem(STORAGE_KEY_SERVICES);
    setVaultSession(null);
    setSettings(prev => ({ ...prev, hasKeyLock: false }));
  };

  // Encrypted vault present and not yet unlocked: nothing else renders.
  if (isLocked) {
    return <UnlockVault onUnlocked={handleUnlocked} onForget={handleForgotPassphrase} />;
  }

  // If admin route but not auth -> show login
  if (isAdminRoute && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0]">
        <AdminLogin onSuccess={handleAdminLogin} onCancel={() => { setIsAdminRoute(false); window.history.pushState({}, '', '/'); }} />
      </div>
    );
  }

  // Admin view: full management
  if (isAdminRoute && isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased">
        <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} lang={lang} onToggleLang={() => setLang(l => l==='fa'?'en':'fa')} theme={theme} onToggleTheme={() => setTheme(t => t==='dark'?'light':'dark')} onOpenSettings={() => setIsSettingsOpen(true)} activeView={activeView} onSelectView={v => setActiveView(v)} />
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs">
          <span className="text-amber-300 font-semibold">حالت مدیریت — فقط برای مدیر</span>
          <button onClick={handleAdminLogout} className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30">خروج از مدیریت</button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} services={services} combos={combos} conversations={conversations} activeConversationId={activeConversationId} activeView={activeView} onSelectConversation={(id) => { setActiveConversationId(id); setActiveView('chat'); }} onNewConversation={handleNewConversation} onSelectView={v => setActiveView(v)} onOpenAddService={() => setIsAddServiceOpen(true)} onOpenCreateCombo={() => setIsCreateComboOpen(true)} onDeleteConversation={handleDeleteConversation} />
          {activeView === 'chat' ? (activeConversation ? <ChatView conversation={activeConversation} promptTemplates={promptTemplates} onSendMessage={handleSendMessage} onSavePromptToLibrary={handleSavePromptToLibrary} onUpdateConversationSettings={handleUpdateConversationSettings} /> : <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">گفتگویی یافت نشد.</div>) : <CombosView combos={combos} adapters={adapters} services={services} onUpdateComboStrategy={handleUpdateComboStrategy} onDeleteCombo={handleDeleteCombo} onOpenCreateCombo={() => setIsCreateComboOpen(true)} onToggleAdapter={handleToggleAdapter} onUpdateAdapterStrategy={handleUpdateAdapterStrategy} onAddModelToAdapter={handleAddModelToAdapter} />}
        </div>
        <AddServiceModal isOpen={isAddServiceOpen} onClose={() => setIsAddServiceOpen(false)} onSave={handleSaveService} defaultCorsProxy={settings.defaultCorsProxy} proxyToken={settings.workerSecurityToken} />
        <CreateComboModal isOpen={isCreateComboOpen} onClose={() => setIsCreateComboOpen(false)} services={services} onSave={handleSaveCombo} />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          onWipeData={handleWipeData}
          services={services}
          combos={combos}
          conversations={conversations}
          promptTemplates={promptTemplates}
          vaultSession={vaultSession}
          onVaultChange={handleVaultChange}
          onRestore={handleRestoreSync}
        />
      </div>
    );
  }

  // User view: ONLY chat + personal settings (no combos management)
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased selection:bg-blue-600/30">
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} lang={lang} onToggleLang={() => setLang(l => l==='fa'?'en':'fa')} theme={theme} onToggleTheme={() => setTheme(t => t==='dark'?'light':'dark')} onOpenSettings={() => setIsSettingsOpen(true)} activeView={'chat'} onSelectView={() => {}} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} services={services} combos={combos} conversations={conversations} activeConversationId={activeConversationId} activeView={'chat'} onSelectConversation={(id) => setActiveConversationId(id)} onNewConversation={handleNewConversation} onSelectView={() => {}} onOpenAddService={() => setIsAddServiceOpen(false)} onOpenCreateCombo={() => {}} onDeleteConversation={handleDeleteConversation} />
        {activeConversation ? <ChatView conversation={activeConversation} promptTemplates={promptTemplates} onSendMessage={handleSendMessage} onSavePromptToLibrary={handleSavePromptToLibrary} onUpdateConversationSettings={handleUpdateConversationSettings} /> : <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">گفتگویی یافت نشد. از سایدبار یک گفتگوی جدید ایجاد کنید.</div>}
      </div>
      {/* User settings: only personal BaseURL/Key - hide admin parts via prop if needed */}
      <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={setSettings}
          onWipeData={handleWipeData}
          services={services}
          combos={combos}
          conversations={conversations}
          promptTemplates={promptTemplates}
          vaultSession={vaultSession}
          onVaultChange={handleVaultChange}
          onRestore={handleRestoreSync}
        />
      {/* Admin entry hidden button */}
      <button onClick={handleGoAdmin} className="fixed bottom-3 left-3 text-[10px] text-[#475569] hover:text-[#94a3b8]">مدیریت</button>
      {showAdminLogin && <AdminLogin onSuccess={handleAdminLogin} onCancel={() => setShowAdminLogin(false)} />}
      <AddServiceModal isOpen={isAddServiceOpen} onClose={() => setIsAddServiceOpen(false)} onSave={handleSaveService} defaultCorsProxy={settings.defaultCorsProxy} proxyToken={settings.workerSecurityToken} />
    </div>
  );
}
