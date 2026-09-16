import React, { useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { ENV_ADMIN_TOKEN } from '../utils/env';
import { markAdminAuthenticated } from '../utils/adminAuth';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    // Admin token comes from the build environment (VITE_ADMIN_TOKEN), never hardcoded.
    // NOTE: VITE_* values are visible in the public bundle — this gates the UI,
    // it is not a server-side authorisation boundary. See utils/adminAuth.ts.
    const expected = ENV_ADMIN_TOKEN;
    if (!expected) {
      setErr('توکن مدیریت تنظیم نشده است. مقدار VITE_ADMIN_TOKEN را در فایل .env قرار دهید.');
      return;
    }
    if (pwd === expected) {
      setBusy(true);
      await markAdminAuthenticated(expected);
      setBusy(false);
      onSuccess();
    } else {
      setErr('رمز مدیر اشتباه است');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
      <form onSubmit={handle} className="w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Shield className="w-5 h-5 text-blue-400" />
          ورود به بخش مدیریت
        </div>
        <p className="text-xs text-[#94a3b8]">این بخش فقط برای مدیر است. رمز را وارد کنید.</p>
        <div className="flex items-center gap-2 rounded-xl border border-[#243147] bg-[#0b0f19] px-3 py-2">
          <Lock className="w-4 h-4 text-[#64748b]" />
          <input
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="رمز مدیر..."
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-[#475569]"
            autoFocus
          />
        </div>
        {err && <span className="text-xs text-red-400">{err}</span>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-xs text-[#94a3b8] hover:text-white">بازگشت</button>
          <button type="submit" disabled={busy} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold">ورود</button>
        </div>
      </form>
    </div>
  );
};
