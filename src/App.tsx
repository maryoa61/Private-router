import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CombosView } from './components/CombosView';
import { AddServiceModal } from './components/AddServiceModal';
import { CreateComboModal } from './components/CreateComboModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminLogin } from './components/AdminLogin';
import {
  initialServices,
  initialCombos,
  initialAdapters,
  initialConversations,
  promptTemplates as initialPromptTemplates,
  defaultSettings,
} from './mockData';
import {
  AIService,
  ComboItem,
  AdapterConfig,
  Conversation,
  ChatMessage,
  PromptTemplate,
  AppSettings,
  RoutingStrategy,
} from './types';
import { STORAGE_KEYS, readJson, readString, writeJson, writeString, wipeAllStoredData } from './utils/storage';
import { callServiceChat, callComboChat } from './utils/chatApi';
import { isAdminAuthenticated, clearAdminAuthenticated } from './utils/adminAuth';
import { looksLikeCode, parseCodeDoctorResponse } from './utils/codeAnalysis';
import { ENV_ADMIN_TOKEN } from './utils/env';

const CODE_DOCTOR_PROMPT =
  'نقش تو متخصص عیب‌یابی نرم‌افزار است. خطا یا لاگ کاربر را با دقت واکاوی کن، علت ریشه‌ای را در یک پاراگراف توضیح بده و نسخه کامل و اصلاح‌شده کد را بدون ابهام بازنویسی کن. پاسخ را دقیقاً با همین فرمت بده:\nعلت: <یک پاراگراف>\nراه‌حل: <یک پاراگراف>\n```<زبان برنامه‌نویسی>\n<کد کامل اصلاح‌شده>\n```';

/** شناسه‌ی یکتا حتی وقتی چند پیام در یک میلی‌ثانیه ساخته می‌شوند. */
let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/** عنوان خودکار از اولین پیام کاربر (تنظیمات → autoTitle). */
function deriveTitle(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'گفتگوی بدون عنوان';
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean;
}

export default function App() {
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'combos'>('chat');

  // Admin separation. The stored flag is a hash of the real admin token (see
  // utils/adminAuth.ts) so it can't be spoofed with a one-line console call
  // the way the old `admin_auth === '1'` flag could. It's re-verified against
  // the currently configured ENV_ADMIN_TOKEN on every load.
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(
    () => window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin')
  );

  useEffect(() => {
    isAdminAuthenticated(ENV_ADMIN_TOKEN).then(setIsAdmin);
  }, []);

  useEffect(() => {
    const checkRoute = () =>
      setIsAdminRoute(window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin'));
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setShowAdminLogin(false);
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    setActiveView('combos');
  };

  const handleAdminLogout = () => {
    clearAdminAuthenticated();
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

  // ---------------------------------------------------------------
  // State — همه‌ی بخش‌ها از localStorage خوانده و در آن ذخیره می‌شوند.
  // Single mode: هر سرویس (baseUrl + apiKey) به‌صورت JSON ساده در همین
  // مرورگر ذخیره می‌شود و مستقیم برای صدا زدن provider به کار می‌رود.
  // نه vault، نه passphrase، نه حساب سمت سرور.
  // ---------------------------------------------------------------
  const [services, setServices] = useState<AIService[]>(() =>
    readJson(STORAGE_KEYS.services, initialServices)
  );
  const [combos, setCombos] = useState<ComboItem[]>(() => readJson(STORAGE_KEYS.combos, initialCombos));
  const [adapters, setAdapters] = useState<AdapterConfig[]>(() =>
    readJson(STORAGE_KEYS.adapters, initialAdapters)
  );
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    readJson(STORAGE_KEYS.conversations, initialConversations)
  );
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(() =>
    readJson(STORAGE_KEYS.promptTemplates, initialPromptTemplates)
  );
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...defaultSettings,
    ...readJson<Partial<AppSettings>>(STORAGE_KEYS.settings, {}),
  }));
  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const saved = readString(STORAGE_KEYS.activeConversation);
    const list = readJson<Conversation[]>(STORAGE_KEYS.conversations, initialConversations);
    return list.some((c) => c.id === saved) ? saved : list[0]?.id || '';
  });

  useEffect(() => writeJson(STORAGE_KEYS.services, services), [services]);
  useEffect(() => writeJson(STORAGE_KEYS.combos, combos), [combos]);
  useEffect(() => writeJson(STORAGE_KEYS.adapters, adapters), [adapters]);
  useEffect(() => writeJson(STORAGE_KEYS.conversations, conversations), [conversations]);
  useEffect(() => writeJson(STORAGE_KEYS.promptTemplates, promptTemplates), [promptTemplates]);
  useEffect(() => writeJson(STORAGE_KEYS.settings, settings), [settings]);
  useEffect(() => writeString(STORAGE_KEYS.activeConversation, activeConversationId), [activeConversationId]);

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isCreateComboOpen, setIsCreateComboOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleRestoreSync = (data: {
    settings?: AppSettings;
    services?: AIService[];
    combos?: ComboItem[];
    conversations?: Conversation[];
    promptTemplates?: PromptTemplate[];
  }) => {
    // توکن Gist عمداً از بکاپ بازنویسی نمی‌شود: در payload ارسالی نیست.
    if (data.settings) setSettings((prev) => ({ ...prev, ...data.settings, gistToken: prev.gistToken }));
    if (Array.isArray(data.services)) setServices(data.services);
    if (Array.isArray(data.combos)) setCombos(data.combos);
    if (Array.isArray(data.conversations)) {
      setConversations(data.conversations);
      if (data.conversations[0]) setActiveConversationId(data.conversations[0].id);
    }
    if (Array.isArray(data.promptTemplates)) setPromptTemplates(data.promptTemplates);
  };

  // تم حالا فقط یک منبع حقیقت دارد: settings.theme
  // (قبلاً App یک state جدا داشت و سوییچ داخل تنظیمات هیچ اثری نداشت.)
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
  }, [settings.theme]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  }, [lang]);

  const toggleTheme = () =>
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const handleSaveService = (s: AIService) => setServices((prev) => [s, ...prev]);
  const handleSaveCombo = (c: ComboItem) => setCombos((prev) => [c, ...prev]);
  const handleUpdateComboStrategy = (id: string, strategy: RoutingStrategy) =>
    setCombos((prev) => prev.map((c) => (c.id === id ? { ...c, strategy } : c)));
  const handleDeleteCombo = (id: string) => setCombos((prev) => prev.filter((c) => c.id !== id));
  const handleToggleAdapter = (id: 'vision' | 'audio') =>
    setAdapters((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  const handleUpdateAdapterStrategy = (id: 'vision' | 'audio', strategy: 'fallback' | 'round_robin') =>
    setAdapters((prev) => prev.map((a) => (a.id === id ? { ...a, strategy } : a)));
  const handleAddModelToAdapter = (id: 'vision' | 'audio', serviceName: string, modelName: string) =>
    setAdapters((prev) =>
      prev.map((a) => (a.id === id ? { ...a, pool: [...a.pool, { serviceName, modelName, isHealthy: true }] } : a))
    );

  const handleNewConversation = (targetId: string, targetType: 'service' | 'combo', targetName: string) => {
    const newConv: Conversation = {
      id: uid('conv'),
      title: `گفتگو با ${targetName}`,
      serviceOrComboId: targetId,
      targetType,
      targetName,
      updatedAt: new Date().toISOString(),
      systemPrompt: '',
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 4096,
      // پیش‌فرض واقعاً از تنظیمات خوانده می‌شود (قبلاً هاردکد ۶ بود).
      contextLimit: settings.defaultContextLimit,
      messages: [
        {
          id: uid('m'),
          role: 'assistant',
          content: `سلام! من متصل به «${targetName}» هستم. چطور می‌توانم کمکتان کنم؟`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveView('chat');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeConversationId === id) setActiveConversationId(filtered[0]?.id || '');
      return filtered;
    });
  };

  // جلوگیری از ارسال هم‌زمان چند پیام در یک گفتگو (که باعث تداخل
  // پیام pending و تاریخچه‌ی ناهمگام می‌شد).
  const inFlight = useRef<Set<string>>(new Set());

  const handleSendMessage = async (text: string) => {
    if (!activeConversation) return;
    const conv = activeConversation;
    const convId = conv.id;
    if (inFlight.current.has(convId)) return;
    inFlight.current.add(convId);

    const userMsg: ChatMessage = {
      id: uid('m'),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    const pendingId = uid('m');
    const pendingMsg: ChatMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isPending: true,
    };

    const isFirstUserMessage = !conv.messages.some((m) => m.role === 'user');

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: settings.autoTitle && isFirstUserMessage ? deriveTitle(text) : c.title,
              messages: [...c.messages, userMsg, pendingMsg],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    const isCodeRequest = looksLikeCode(text);
    const extraSystemPrompt = isCodeRequest ? CODE_DOCTOR_PROMPT : undefined;

    let result: { success: boolean; content: string; error?: string };
    try {
      if (conv.targetType === 'combo') {
        const combo = combos.find((c) => c.id === conv.serviceOrComboId);
        result = combo
          ? await callComboChat(combo, services, conv, text, extraSystemPrompt, settings.workerSecurityToken)
          : { success: false, content: '', error: 'این Combo دیگر وجود ندارد.' };
      } else {
        const service = services.find((s) => s.id === conv.serviceOrComboId);
        if (!service) {
          result = { success: false, content: '', error: 'این سرویس دیگر وجود ندارد.' };
        } else {
          const resolved = {
            ...service,
            corsProxy: service.corsProxy || settings.defaultCorsProxy || undefined,
          };
          result = await callServiceChat(
            resolved,
            conv,
            text,
            undefined,
            extraSystemPrompt,
            settings.workerSecurityToken
          );
        }
      }
    } finally {
      inFlight.current.delete(convId);
    }

    // اگر پاسخ Code Doctor قالب موردانتظار را داشت، ساختاریافته‌اش کن
    // تا کارت تحلیل کد در ChatView واقعاً رندر شود.
    const analysis = isCodeRequest && result.success ? parseCodeDoctorResponse(result.content) : null;

    const finalMsg: ChatMessage = result.success
      ? {
          id: pendingId,
          role: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString(),
          ...(analysis ? { isCodeFix: true, codeAnalysis: analysis } : {}),
        }
      : {
          id: pendingId,
          role: 'assistant',
          content: `❌ ${result.error || 'خطای ناشناخته'}`,
          timestamp: new Date().toISOString(),
          isError: true,
        };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === pendingId ? finalMsg : m)),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const handleSavePromptToLibrary = (title: string, content: string) =>
    setPromptTemplates((prev) => [{ id: uid('pt'), title, content, category: 'شخصی' }, ...prev]);

  const handleUpdateConversationSettings = (upd: {
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    contextLimit: number;
  }) => {
    if (!activeConversation) return;
    setConversations((prev) => prev.map((c) => (c.id === activeConversation.id ? { ...c, ...upd } : c)));
  };

  const handleWipeData = () => {
    setServices([]);
    setCombos([]);
    setConversations([]);
    setPromptTemplates([]);
    setAdapters(initialAdapters);
    setActiveConversationId('');
    setSettings({ ...defaultSettings, workerSecurityToken: '', gistToken: '', gistId: '' });
    // شامل شمارنده‌های round-robin و فلگ ورود مدیر هم می‌شود.
    wipeAllStoredData();
    clearAdminAuthenticated();
    setIsAdmin(false);
  };

  const chatPane = activeConversation ? (
    <ChatView
      // key باعث می‌شود با عوض شدن گفتگو، مقادیر drawer از گفتگوی
      // قبلی باقی نمانند.
      key={activeConversation.id}
      conversation={activeConversation}
      promptTemplates={promptTemplates}
      ttsEnabled={settings.ttsEnabled}
      onSendMessage={handleSendMessage}
      onSavePromptToLibrary={handleSavePromptToLibrary}
      onUpdateConversationSettings={handleUpdateConversationSettings}
    />
  ) : (
    <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">
      گفتگویی یافت نشد. از سایدبار یک گفتگوی جدید ایجاد کنید.
    </div>
  );

  const settingsModal = (
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
      onRestore={handleRestoreSync}
    />
  );

  // If admin route but not auth -> show login
  if (isAdminRoute && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0]">
        <AdminLogin
          onSuccess={handleAdminLogin}
          onCancel={() => {
            setIsAdminRoute(false);
            window.history.pushState({}, '', '/');
          }}
        />
      </div>
    );
  }

  // Admin view: full management
  if (isAdminRoute && isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased">
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          lang={lang}
          onToggleLang={() => setLang((l) => (l === 'fa' ? 'en' : 'fa'))}
          theme={settings.theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          activeView={activeView}
          onSelectView={(v) => setActiveView(v)}
        />
        <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs">
          <span className="text-amber-300 font-semibold">حالت مدیریت — فقط برای مدیر</span>
          <button
            onClick={handleAdminLogout}
            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
          >
            خروج از مدیریت
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            services={services}
            combos={combos}
            conversations={conversations}
            activeConversationId={activeConversationId}
            activeView={activeView}
            isAdmin={true}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setActiveView('chat');
            }}
            onNewConversation={handleNewConversation}
            onSelectView={(v) => setActiveView(v)}
            onOpenAddService={() => setIsAddServiceOpen(true)}
            onOpenCreateCombo={() => setIsCreateComboOpen(true)}
            onDeleteConversation={handleDeleteConversation}
          />
          {activeView === 'chat' ? (
            chatPane
          ) : (
            <CombosView
              combos={combos}
              adapters={adapters}
              services={services}
              onUpdateComboStrategy={handleUpdateComboStrategy}
              onDeleteCombo={handleDeleteCombo}
              onOpenCreateCombo={() => setIsCreateComboOpen(true)}
              onToggleAdapter={handleToggleAdapter}
              onUpdateAdapterStrategy={handleUpdateAdapterStrategy}
              onAddModelToAdapter={handleAddModelToAdapter}
            />
          )}
        </div>
        <AddServiceModal
          isOpen={isAddServiceOpen}
          onClose={() => setIsAddServiceOpen(false)}
          onSave={handleSaveService}
          defaultCorsProxy={settings.defaultCorsProxy}
          proxyToken={settings.workerSecurityToken}
        />
        <CreateComboModal
          isOpen={isCreateComboOpen}
          onClose={() => setIsCreateComboOpen(false)}
          services={services}
          onSave={handleSaveCombo}
        />
        {settingsModal}
      </div>
    );
  }

  // User view: ONLY chat + personal settings (no combos management)
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased selection:bg-blue-600/30">
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'fa' ? 'en' : 'fa'))}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={'chat'}
        onSelectView={() => {}}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          services={services}
          combos={combos}
          conversations={conversations}
          activeConversationId={activeConversationId}
          activeView={'chat'}
          isAdmin={false}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onNewConversation={handleNewConversation}
          onSelectView={() => {}}
          onOpenAddService={() => setIsAddServiceOpen(true)}
          onOpenCreateCombo={() => {}}
          onDeleteConversation={handleDeleteConversation}
        />
        {chatPane}
      </div>
      {settingsModal}
      {/* Admin entry hidden button */}
      <button
        onClick={handleGoAdmin}
        className="fixed bottom-3 left-3 text-[10px] text-[#475569] hover:text-[#94a3b8]"
      >
        مدیریت
      </button>
      {showAdminLogin && <AdminLogin onSuccess={handleAdminLogin} onCancel={() => setShowAdminLogin(false)} />}
      <AddServiceModal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSave={handleSaveService}
        defaultCorsProxy={settings.defaultCorsProxy}
        proxyToken={settings.workerSecurityToken}
      />
    </div>
  );
}
