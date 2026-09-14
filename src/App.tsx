import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { CombosView } from './components/CombosView';
import { AddServiceModal } from './components/AddServiceModal';
import { CreateComboModal } from './components/CreateComboModal';
import { SettingsModal } from './components/SettingsModal';
import { 
  initialServices, 
  initialCombos, 
  initialAdapters, 
  initialConversations, 
  promptTemplates as initialPromptTemplates, 
  defaultSettings 
} from './mockData';
import { AIService, ComboItem, AdapterConfig, Conversation, PromptTemplate, AppSettings, RoutingStrategy } from './types';
import { loadServicesFromLocalStorage, saveServicesToLocalStorage } from './utils/serviceApi';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<'chat' | 'combos'>('chat');

  // Core States with LocalStorage support for Services
  const [services, setServices] = useState<AIService[]>(() => loadServicesFromLocalStorage(initialServices));
  const [combos, setCombos] = useState<ComboItem[]>(initialCombos);
  const [adapters, setAdapters] = useState<AdapterConfig[]>(initialAdapters);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(initialPromptTemplates);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeConversationId, setActiveConversationId] = useState<string>(initialConversations[0]?.id || '');

  // Modals state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isCreateComboOpen, setIsCreateComboOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync services to localStorage
  useEffect(() => {
    saveServicesToLocalStorage(services);
  }, [services]);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Sync lang & direction
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  }, [lang]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || conversations[0];

  // Handlers
  const handleSaveService = (newService: AIService) => {
    setServices((prev) => [newService, ...prev]);
  };

  const handleSaveCombo = (newCombo: ComboItem) => {
    setCombos((prev) => [newCombo, ...prev]);
  };

  const handleUpdateComboStrategy = (comboId: string, strategy: RoutingStrategy) => {
    setCombos((prev) =>
      prev.map((c) => (c.id === comboId ? { ...c, strategy } : c))
    );
  };

  const handleDeleteCombo = (comboId: string) => {
    setCombos((prev) => prev.filter((c) => c.id !== comboId));
  };

  const handleToggleAdapter = (adapterId: 'vision' | 'audio') => {
    setAdapters((prev) =>
      prev.map((a) => (a.id === adapterId ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleUpdateAdapterStrategy = (
    adapterId: 'vision' | 'audio',
    strategy: 'fallback' | 'round_robin'
  ) => {
    setAdapters((prev) =>
      prev.map((a) => (a.id === adapterId ? { ...a, strategy } : a))
    );
  };

  const handleAddModelToAdapter = (
    adapterId: 'vision' | 'audio',
    serviceName: string,
    modelName: string
  ) => {
    setAdapters((prev) =>
      prev.map((a) =>
        a.id === adapterId
          ? {
              ...a,
              pool: [...a.pool, { serviceName, modelName, isHealthy: true }],
            }
          : a
      )
    );
  };

  const handleNewConversation = (
    targetId: string,
    targetType: 'service' | 'combo',
    targetName: string
  ) => {
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
      messages: [
        {
          id: `m-${Date.now()}`,
          role: 'assistant',
          content: `سلام! من متصل به «${targetName}» هستم. چطور می‌توانم کمکتان کنم؟ می‌توانید سوال خود را بپرسید یا کد و خطای برنامه‌نویسی را جهت عیب‌یابی بفرستید.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeConversationId === id && filtered.length > 0) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleSendMessage = (text: string, withWebSearch: boolean) => {
    if (!activeConversation) return;

    const userMsgId = `m-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hasWebSearch: withWebSearch,
    };

    // Check if input looks like code or an error
    const isCodeQuery =
      text.includes('function') ||
      text.includes('const') ||
      text.includes('error') ||
      text.includes('خطا') ||
      text.includes('Exception') ||
      text.includes('TypeError') ||
      text.includes('```') ||
      text.includes('{');

    const assistantMsgId = `m-${Date.now() + 1}`;
    let assistantMsg;

    if (isCodeQuery) {
      assistantMsg = {
        id: assistantMsgId,
        role: 'assistant' as const,
        content: 'کد و گزارش خطای شما توسط دستیار تحلیل کد واکاوی شد. علت بروز خطا و قطعه کد اصلاح‌شده در زیر ارائه شده است:',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCodeFix: true,
        codeAnalysis: {
          cause: 'عدم بررسی مقادیر Nullable یا اشتباه در فراخوانی متد روی شیء تعریف‌نشده.',
          solution: 'افزودن شرط بررسی اولیه، بهینه‌سازی هندلینگ داده و استفاده از مقادیر پیش‌فرض امن.',
          diffSummary: '- problematicCall()\n+ safeCallWithValidation()',
          language: 'typescript',
          fixedCode: `// نسخه اصلاح‌شده توسط دستیار کد Combo Router:\nfunction safeExecution(payload: unknown) {\n  if (!payload || typeof payload !== 'object') {\n    console.warn('داده نامعتبر است');\n    return null;\n  }\n  return Object.freeze({ ...payload, processedAt: Date.now() });\n}`,
        },
      };
    } else if (withWebSearch) {
      assistantMsg = {
        id: assistantMsgId,
        role: 'assistant' as const,
        content: `بر اساس نتایج زنده موتور جستجوی وب برای پرسش شما: «${text}»:\nاطلاعات به‌روز استخراج شده و توسط مدل تجمیع گردید.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        webSources: [
          { title: 'نتایج زنده وب: جستجوی هوشمند', url: 'https://google.com' },
          { title: 'مستندات معماری و روتر ترکیبی AI', url: 'https://example.com/docs' },
        ],
      };
    } else {
      assistantMsg = {
        id: assistantMsgId,
        role: 'assistant' as const,
        content: `پاسخ شبیه‌سازی‌شده از «${activeConversation.targetName}» به پیام شما:\n${text}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    const updatedConv: Conversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, userMsg, assistantMsg],
      updatedAt: 'هم‌اکنون',
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? updatedConv : c))
    );
  };

  const handleSavePromptToLibrary = (title: string, content: string) => {
    const newTemplate: PromptTemplate = {
      id: `pt-${Date.now()}`,
      title,
      content,
      category: 'شخصی',
    };
    setPromptTemplates((prev) => [newTemplate, ...prev]);
  };

  const handleUpdateConversationSettings = (updated: {
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    contextLimit: number;
  }) => {
    if (!activeConversation) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              ...updated,
            }
          : c
      )
    );
  };

  const handleWipeData = () => {
    setServices([]);
    setCombos([]);
    setConversations([]);
    setPromptTemplates([]);
    setActiveConversationId('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased selection:bg-blue-600/30">
      {/* Top Bar */}
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        lang={lang}
        onToggleLang={() => setLang((l) => (l === 'fa' ? 'en' : 'fa'))}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          services={services}
          combos={combos}
          conversations={conversations}
          activeConversationId={activeConversationId}
          activeView={activeView}
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

        {/* View Switcher: Chat Client OR Combos Manager */}
        {activeView === 'chat' ? (
          activeConversation ? (
            <ChatView
              conversation={activeConversation}
              promptTemplates={promptTemplates}
              onSendMessage={handleSendMessage}
              onSavePromptToLibrary={handleSavePromptToLibrary}
              onUpdateConversationSettings={handleUpdateConversationSettings}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-[#94a3b8]">
              گفتگویی یافت نشد. از سایدبار یک گفتگوی جدید ایجاد کنید.
            </div>
          )
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

      {/* Modals */}
      <AddServiceModal
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSave={handleSaveService}
      />

      <CreateComboModal
        isOpen={isCreateComboOpen}
        onClose={() => setIsCreateComboOpen(false)}
        services={services}
        onSave={handleSaveCombo}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onWipeData={handleWipeData}
      />
    </div>
  );
}
