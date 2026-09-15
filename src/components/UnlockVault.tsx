import React, { useState } from 'react';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { AIService } from '../types';
import { unlockVault } from '../utils/vault';

interface Props {
  onUnlocked: (session: { key: CryptoKey; salt: Uint8Array }, services: AIService[]) => void;
  onForget: () => void;
}

export const UnlockVault: React.FC<Props> = ({ onUnlocked, onForget }) => {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingWipe, setConfirmingWipe] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd) return;
    setBusy(true);
    setErr('');
    try {
      const { key, salt, services } = await unlockVault(pwd);
      setPwd('');
      onUnlocked({ key, salt }, services);
    } catch (e: any) {
      setErr(e?.message || 'باز کردن قفل ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0f19] p-4"
      dir="rtl"
    >
      <form
        onSubmit={handle}
        className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Lock className="w-5 h-5 text-emerald-400" />
          داده‌های شما رمزگذاری شده است
        </div>
        <p className="text-xs text-[#94a3b8] leading-relaxed">
          برای رمزگشایی سرویس‌ها و کلیدهای API، رمز عبور قفل امنیتی را وارد کنید.
          این رمز هیچ‌جا ذخیره نشده و قابل بازیابی نیست.
        </p>

        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="رمز عبور قفل..."
          className="w-full rounded-xl border border-[#243147] bg-[#0b0f19] px-3 py-2.5 text-sm text-white placeholder-[#475569] outline-none focus:border-emerald-500"
          autoFocus
          disabled={busy}
        />

        {err && <span className="text-xs text-rose-400">{err}</span>}

        <button
          type="submit"
          disabled={busy || !pwd}
          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          <span>{busy ? 'در حال رمزگشایی...' : 'باز کردن قفل'}</span>
        </button>

        <div className="border-t border-[#1e293b] pt-3">
          {!confirmingWipe ? (
            <button
              type="button"
              onClick={() => setConfirmingWipe(true)}
              className="w-full text-[11px] text-[#64748b] hover:text-rose-400"
            >
              رمز را فراموش کرده‌ام
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2 text-[11px] text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  رمز قابل بازیابی نیست. تنها گزینه پاک کردن داده‌های رمزگذاری‌شده و شروع
                  از نو است.
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingWipe(false)}
                  className="flex-1 py-2 text-[11px] text-[#94a3b8] hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={onForget}
                  className="flex-1 py-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-semibold"
                >
                  پاک کردن و شروع مجدد
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
