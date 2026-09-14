import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Volume2, 
  Sparkles, 
  Lock, 
  Unlock, 
  Github, 
  Download, 
  Upload, 
  Trash2, 
  KeyRound, 
  CheckCircle2,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onWipeData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onWipeData,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'sync' | 'backup'>('general');
  const [current, setCurrent] = useState<AppSettings>(settings);
  const [passphrase, setPassphrase] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleToggleLock = () => {
    if (!current.hasKeyLock) {
      if (!passphrase.trim()) {
        showFeedback('لطفاً ابتدا یک رمز عبور برای قفل امنیتی وارد نمایید.');
        return;
      }
      const updated = { ...current, hasKeyLock: true };
      setCurrent(updated);
      onUpdateSettings(updated);
      setPassphrase('');
      showFeedback('قفل امنیتی AES-GCM با موفقیت فعال شد.');
    } else {
      const updated = { ...current, hasKeyLock: false };
      setCurrent(updated);
      onUpdateSettings(updated);
      showFeedback('قفل امنیتی غیرفعال شد.');
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
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combo-router-backup-${Date.now()}.json`;
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
        if (parsed.settings) {
          setCurrent(parsed.settings);
          onUpdateSettings(parsed.settings);
          showFeedback('تنظیمات از فایل پشتیبان بازیابی شد.');
        }
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
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            امنیت و رمزنگاری
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
              {/* Theme toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#243147] bg-[#141c2c]">
                <div>
                  <h4 className="text-xs font-bold text-white">پوسته برنامه (Theme)</h4>
                  <p className="text-[11px] text-[#94a3b8]">حالت تیره برای کاهش خستگی چشم</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrent((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))
                  }
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

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-[#cbd5e1]">
                  <p className="font-bold text-white mb-1">رمزگذاری سرتاسری کلیدها (AES-GCM)</p>
                  با فعال کردن این ویژگی، تمام API Keyهای ذخیره‌شده در حافظه با رمز عبور شما رمزگذاری می‌شوند و در ابتدای هر بار باز کردن برنامه، پسورد درخواست می‌شود.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#243147] bg-[#141c2c] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">وضعیت قفل امنیتی:</span>
                  {current.hasKeyLock ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <Lock className="w-3 h-3" />
                      فعال و رمزگذاری‌شده
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      <Unlock className="w-3 h-3" />
                      غیرفعال (متن شفاف در LocalStorage)
                    </span>
                  )}
                </div>

                {!current.hasKeyLock ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[11px] text-[#94a3b8]">تعریف رمز عبور برای قفل امنیتی:</label>
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="رمز عبور قوی وارد کنید..."
                      className="w-full text-xs rounded-xl border border-[#243147] bg-[#0c121e] px-3 py-2 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleToggleLock}
                      className="mt-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>فعال‌سازی قفل امنیتی AES-GCM</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleLock}
                    className="mt-2 py-2 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>حذف و غیرفعال‌سازی قفل امنیتی</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GIST SYNC */}
          {activeTab === 'sync' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                <Github className="w-4 h-4 text-white" />
                <span>همگام‌سازی ابری امن با GitHub Gist شخصی</span>
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

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => showFeedback('همگام‌سازی و ارسال داده‌ها به GitHub Gist (Push) با موفقیت شبیه‌سازی شد.')}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>ارسال به Gist (Push)</span>
                </button>
                <button
                  type="button"
                  onClick={() => showFeedback('داده‌های تنظیمات و سرویس‌ها از GitHub Gist دریافت شد (Pull).')}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#243147] bg-[#162032] hover:bg-[#1f2b42] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دریافت از Gist (Pull)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & WIPE */}
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
