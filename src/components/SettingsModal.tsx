import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Github,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { AIService, AppSettings, ComboItem, Conversation, PromptTemplate } from '../types';
import { pushToGist, pullFromGist, verifyGistToken, GistDocument, SyncPayload } from '../utils/gistApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onWipeData: () => void;
  services: AIService[];
  combos: ComboItem[];
  conversations: Conversation[];
  promptTemplates: PromptTemplate[];
  onRestore: (data: {
    settings?: AppSettings;
    services?: AIService[];
    combos?: ComboItem[];
    conversations?: Conversation[];
    promptTemplates?: PromptTemplate[];
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onWipeData,
  services,
  combos,
  conversations,
  promptTemplates,
  onRestore,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sync' | 'backup'>('general');
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'push' | 'pull' | 'verify'>(null);

  // مودال unmount نمی‌شود، پس `current` بعد از Pull/Import یا هر تغییر
  // بیرونی در تنظیمات کهنه می‌ماند. با هر باز شدن دوباره همگام می‌شود.
  useEffect(() => {
    if (isOpen) setCurrent(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // ---------- Gist sync ----------
  // Single mode: no encryption layer. Services (incl. API keys) go to your
  // GitHub Gist exactly as they are locally. Use a SECRET gist and keep the
  // PAT private — "secret" on GitHub means unlisted, not access-controlled:
  // anyone with the URL can read it.

  const buildPayload = (): SyncPayload => {
    const { gistToken: _omit, ...safeSettings } = current;
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: safeSettings,
      services,
      combos,
      conversations,
      promptTemplates,
    };
  };

  const handleVerifyToken = async () => {
    setBusy('verify');
    try {
      const { login, scopes } = await verifyGistToken(current.gistToken);
      showFeedback(`اتصال برقرار شد: ${login}${scopes ? ` (scopes: ${scopes})` : ''}`);
    } catch (e: any) {
      showFeedback(e?.message || 'بررسی توکن ناموفق بود.');
    } finally {
      setBusy(null);
    }
  };

  const handlePush = async () => {
    setBusy('push');
    try {
      const payload = buildPayload();
      const doc: GistDocument = { encrypted: false, payload };
      const { gistId } = await pushToGist(current.gistToken, current.gistId, doc);
      const updated = { ...current, gistId };
      setCurrent(updated);
      onUpdateSettings(updated);
      showFeedback(`ارسال شد به Gist (متن ساده). شناسه Gist: ${gistId}`);
    } catch (e: any) {
      showFeedback(e?.message || 'ارسال به Gist ناموفق بود.');
    } finally {
      setBusy(null);
    }
  };

  const applyPayload = (payload: SyncPayload) => {
    onRestore({
      settings: { ...(payload.settings as AppSettings), gistToken: current.gistToken },
      services: payload.services,
      combos: payload.combos,
      conversations: payload.conversations,
      promptTemplates: payload.promptTemplates,
    });
  };

  const handlePull = async () => {
    setBusy('pull');
    try {
      const doc = await pullFromGist(current.gistToken, current.gistId);
      if (doc.encrypted === false) {
        applyPayload(doc.payload);
        showFeedback('داده‌ها از Gist بازیابی شد.');
        return;
      }
      // A gist created by an older/encrypted version of the app — no vault
      // exists here anymore to decrypt it with.
      showFeedback('این بکاپ با نسخه‌ی قدیمی‌تر (رمزگذاری‌شده) ساخته شده و با این نسخه قابل بازیابی نیست.');
    } catch (e: any) {
      showFeedback(e?.message || 'دریافت از Gist ناموفق بود.');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(current);
    showFeedback('تنظیمات با موفقیت به‌روزرسانی شد.');
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: current,
      services,
      combos,
      conversations,
      promptTemplates,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `private-router-backup-${Date.now()}.json`;
    a.click();
    showFeedback('فایل پشتیبان JSON دانلود شد.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onRestore({
          settings: parsed.settings,
          services: parsed.services,
          combos: parsed.combos,
          conversations: parsed.conversations,
          promptTemplates: parsed.promptTemplates,
        });
        if (parsed.settings) setCurrent(parsed.settings);
        showFeedback('داده‌ها از فایل پشتیبان بازیابی شد.');
      } catch (err) {
        showFeedback('فایل پشتیبان نامعتبر است.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl border border-[#243147] bg-[#0e1422] shadow-2xl flex flex-col overflow-hidden text-[#e2e8f0]"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121927]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">تنظیمات سامانه</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1a2333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#1e293b] bg-[#0c121e]">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            عمومی و مدل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'sync'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            همگام‌سازی Gist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            پشتیبان‌گیری و بازنشانی
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-5">
          {actionNotice && (
            <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="flex flex-col gap-4">
              {/* Local-storage notice replaces the old vault/backend explanation:
                  this build has exactly one mode — key + baseUrl saved in this browser. */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-[#cbd5e1]">
                  <p className="font-bold text-white mb-1">ذخیره‌سازی محلی</p>
                  کلید API هر سرویس (OpenAI، Anthropic و بقیه) به همراه Base URL آن، فقط در
                  localStorage همین مرورگر ذخیره می‌شود و مستقیماً برای چت به همان provider ارسال
                  می‌شود. این مرورگر/دستگاه را امن نگه‌دار.
                </div>
              </div>

              {/* Theme toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#243147] bg-[#141c2c]">
                <div>
                  <h4 className="text-xs font-bold text-white">پوسته برنامه (Theme)</h4>
                  <p className="text-[11px] text-[#94a3b8]">حالت تیره برای کاهش خستگی چشم</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // بدون onUpdateSettings، تغییر تم تا زدن «ذخیره» دیده
                    // نمی‌شد — و در نسخه‌ی قبل اصلاً اعمال نمی‌شد.
                    const next = { ...current, theme: (current.theme === 'dark' ? 'light' : 'dark') as 'dark' | 'light' };
                    setCurrent(next);
                    onUpdateSettings(next);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#243147] bg-[#1a2333] text-xs text-white"
                >
                  {current.theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{current.theme === 'dark' ? 'تاریک (Dark)' : 'روشن (Light)'}</span>
                </button>
              </div>

              {/* Auto Title Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#243147] bg-[#141c2c]">
                <div>
                  <h4 className="text-xs font-bold text-white">عنوان‌گذاری خودکار و هوشمند گفتگوها</h4>
                  <p className="text-[11px] text-[#94a3b8]">تولید عنوان متناسب پس از اولین پیام ارسال‌شده</p>
                </div>
                <input
                  type="checkbox"
                  checked={current.autoTitle}
                  onChange={(e) => setCurrent({ ...current, autoTitle: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>

              {/* TTS Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#243147] bg-[#141c2c]">
                <div>
                  <h4 className="text-xs font-bold text-white">خواندن پاسخ‌ها با صدا (TTS)</h4>
                  <p className="text-[11px] text-[#94a3b8]">نمایش دکمه پخش صوتی بر روی هر پاسخ هوش مصنوعی</p>
                </div>
                <input
                  type="checkbox"
                  checked={current.ttsEnabled}
                  onChange={(e) => setCurrent({ ...current, ttsEnabled: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>

              {/* Default Context Truncation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#94a3b8]">
                  کوتاه‌سازی پیش‌فرض Context (تعداد آخرین پیام‌ها)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={current.defaultContextLimit}
                  onChange={(e) => setCurrent({ ...current, defaultContextLimit: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2 text-white outline-none"
                />
                <span className="text-[10px] text-[#64748b]">عدد ۰ به معنی ارسال کل تاریخچه گفتگو است.</span>
              </div>

              {/* Default CORS Proxy */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#94a3b8]">
                  CORS Proxy پیش‌فرض
                </label>
                <input
                  type="text"
                  value={current.defaultCorsProxy}
                  onChange={(e) => setCurrent({ ...current, defaultCorsProxy: e.target.value })}
                  placeholder="https://cors-proxy.workers.dev/{url}"
                  className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2 text-white outline-none"
                  dir="ltr"
                />
                <span className="text-[10px] text-[#64748b]">
                  برای Anthropic معمولاً لازم است (CORS مستقیم را نمی‌پذیرد)؛ برای OpenAI/Groq/DeepSeek/OpenRouter معمولاً نیازی نیست.
                </span>
              </div>

              {/* Worker Security Token */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#94a3b8]">
                  Worker Security Token
                </label>
                <input
                  type="password"
                  value={current.workerSecurityToken}
                  onChange={(e) => setCurrent({ ...current, workerSecurityToken: e.target.value })}
                  placeholder="توکن محرمانه ورکر پروکسی"
                  className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2 text-white outline-none"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                className="mt-2 py-2 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
              >
                ذخیره تغییرات عمومی
              </button>
            </form>
          )}

          {/* TAB 2: GIST SYNC */}
          {activeTab === 'sync' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                <Github className="w-4 h-4 text-white" />
                <span>همگام‌سازی ابری با GitHub Gist شخصی</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#94a3b8]">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={current.gistToken}
                  onChange={(e) => setCurrent({ ...current, gistToken: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2 text-white outline-none"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#94a3b8]">
                  Gist ID (اختیاری - در صورت خالی بودن گیست جدید ساخته می‌شود)
                </label>
                <input
                  type="text"
                  value={current.gistId}
                  onChange={(e) => setCurrent({ ...current, gistId: e.target.value })}
                  placeholder="مثال: 7f8a3c9e..."
                  className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2 text-white outline-none"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-3 mt-1">
                <button
                  type="button"
                  onClick={handleVerifyToken}
                  disabled={busy !== null || !current.gistToken}
                  className="py-2 px-3 rounded-xl border border-[#243147] bg-[#162032] hover:bg-[#1f2b42] disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  {busy === 'verify' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>بررسی اعتبار توکن</span>
                </button>

                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    این بکاپ رمزگذاری نمی‌شود — کلیدهای API به‌صورت متن ساده در Gist ذخیره می‌شوند.
                    Gist «Secret» فقط «فهرست‌نشده» است، نه خصوصی؛ هرکس URL را داشته باشد می‌تواند
                    محتوا (و کلیدهایتان) را بخواند. توکن PAT را هم فقط با scope حداقلی (gist) بسازید.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePush}
                    disabled={busy !== null || !current.gistToken}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    {busy === 'push' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>ارسال به Gist (Push)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePull}
                    disabled={busy !== null || !current.gistToken || !current.gistId}
                    className="flex-1 py-2 px-3 rounded-xl border border-[#243147] bg-[#162032] hover:bg-[#1f2b42] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    {busy === 'pull' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>دریافت از Gist (Pull)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & WIPE */}
          {activeTab === 'backup' && (
            <div className="flex flex-col gap-5">
              {/* Export & Import */}
              <div className="p-4 rounded-xl border border-[#243147] bg-[#141c2c] flex flex-col gap-3">
                <h4 className="text-xs font-bold text-white">پشتیبان‌گیری آفلاین (فایل JSON)</h4>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#1e293b] hover:bg-[#28374f] text-white text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل بکاپ</span>
                  </button>

                  <label className="flex-1 py-2 px-3 rounded-xl border border-[#243147] bg-[#162032] hover:bg-[#1f2b42] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>انتخاب فایل و بازیابی</span>
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-[#64748b]">
                  فایل بکاپ شامل کلیدهای API به‌صورت متن ساده است — جای امنی نگه‌دارید.
                </p>
              </div>

              {/* Danger Zone: Wipe All */}
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>عملیات خطرناک: بازنشانی و پاک کردن داده‌ها</span>
                </div>
                <p className="text-[11px] text-[#94a3b8]">
                  این عمل تمام سرویس‌ها، کلیدها، Comboها و تاریخچه گفتگوها را به‌طور کامل از حافظه مرورگر پاک خواهد کرد.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('آیا از پاک کردن کامل تمام داده‌ها و تنظیمات اطمینان دارید؟')) {
                      onWipeData();
                      onClose();
                    }
                  }}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 self-start"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>پاک کردن کامل تمام داده‌ها (Wipe)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
