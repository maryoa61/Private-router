import React, { useState } from 'react';
import { X, CheckCircle2, RefreshCw, Eye, EyeOff, Server } from 'lucide-react';
import { AIService, ServiceModel } from '../types';
import { testAndFetchServiceModels } from '../utils/serviceApi';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: AIService) => void;
  /** Default CORS proxy from app settings (VITE_CORS_PROXY_URL / Settings). */
  defaultCorsProxy?: string;
  /** Worker security token from app settings, sent as X-Proxy-Token. */
  proxyToken?: string;
}

const PRESET_OPTIONS = [
  { id: 'OpenAI', name: 'OpenAI (Official)', url: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { id: 'Anthropic', name: 'Anthropic Claude', url: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-5' },
  { id: 'DeepSeek', name: 'DeepSeek API', url: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat' },
  { id: 'Groq', name: 'Groq Cloud (Fast LPU)', url: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b' },
  { id: 'OpenRouter', name: 'OpenRouter Aggregator', url: 'https://openrouter.ai/api/v1', defaultModel: 'auto' },
  { id: 'Gemini', name: 'Google Gemini (OpenAI Compat)', url: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-2.0-flash' },
  { id: 'Custom', name: 'آدرس دستی / سرویس سفارشی (Custom)', url: '', defaultModel: 'default-model' },
];

export const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, onSave, defaultCorsProxy = '', proxyToken = '' }) => {
  const [selectedPreset, setSelectedPreset] = useState('Custom');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [corsProxy, setCorsProxy] = useState(defaultCorsProxy);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<ServiceModel[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PRESET_OPTIONS.find(p => p.id === presetId);
    if (preset && preset.id !== 'Custom') {
      setName(preset.name.split(' (')[0]);
      setBaseUrl(preset.url);
    } else if (presetId === 'Custom') {
      setName('');
      setBaseUrl('');
    }
    setTestResult(null);
    setFetchedModels([]);
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ success: false, msg: 'لطفاً ابتدا Base URL را وارد کنید.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    const res = await testAndFetchServiceModels(baseUrl, apiKey, corsProxy, proxyToken, selectedPreset);
    setTesting(false);
    setTestResult({
      success: res.success,
      msg: res.message,
    });
    if (res.success && res.models.length > 0) {
      setFetchedModels(res.models);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim()) return;

    let modelsToSave = fetchedModels;
    let serviceStatus: 'online' | 'offline' | 'degraded' = 'online';

    // If models haven't been fetched yet, fetch or prepare standard fallback model
    if (modelsToSave.length === 0) {
      if (apiKey.trim()) {
        const res = await testAndFetchServiceModels(baseUrl, apiKey, corsProxy, proxyToken, selectedPreset);
        if (res.success && res.models.length > 0) {
          modelsToSave = res.models;
          serviceStatus = 'online';
        } else {
          serviceStatus = res.success ? 'online' : 'degraded';
          const presetObj = PRESET_OPTIONS.find((p) => p.id === selectedPreset);
          const defaultModelId = presetObj?.defaultModel || 'default-model';
          modelsToSave = [
            {
              id: defaultModelId,
              name: defaultModelId,
              isHealthy: res.success,
              latencyMs: res.latencyMs || 250,
            },
          ];
        }
      } else {
        const presetObj = PRESET_OPTIONS.find((p) => p.id === selectedPreset);
        const defaultModelId = presetObj?.defaultModel || 'default-model';
        modelsToSave = [
          {
            id: defaultModelId,
            name: defaultModelId,
            isHealthy: true,
            latencyMs: 180,
          },
        ];
      }
    }

    const newService: AIService = {
      id: `srv-${Date.now()}`,
      name: name.trim(),
      preset: selectedPreset,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      corsProxy: corsProxy.trim() || undefined,
      status: serviceStatus,
      models: modelsToSave,
    };

    onSave(newService);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-2xl border border-[#243147] bg-[#0e1422] shadow-2xl flex flex-col overflow-hidden text-[#e2e8f0]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121927]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">افزودن سرویس هوش مصنوعی جدید</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1a2333] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          {/* Preset Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#94a3b8]">
              انتخاب پریست آماده (Preset)
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 text-white outline-none focus:border-blue-500 transition-colors"
            >
              {PRESET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#94a3b8]">نام سرویس</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: OpenAI Production یا Claude Main"
              className="w-full text-xs rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 text-white placeholder-[#475569] outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#94a3b8]">Base URL سرویس</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 text-white placeholder-[#475569] outline-none focus:border-blue-500 transition-colors text-left"
              dir="ltr"
            />
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#94a3b8]">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 pl-10 text-white placeholder-[#475569] outline-none focus:border-blue-500 transition-colors text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Optional CORS Proxy Worker URL */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#94a3b8]">
                CORS Proxy Worker URL (اختیاری)
              </label>
              <span className="text-[10px] text-blue-400 font-mono">الگوی {'{url}'}</span>
            </div>
            <input
              type="text"
              value={corsProxy}
              onChange={(e) => setCorsProxy(e.target.value)}
              placeholder="https://my-proxy.workers.dev/{url}"
              className="w-full text-xs font-mono rounded-xl border border-[#243147] bg-[#141c2c] px-3 py-2.5 text-white placeholder-[#475569] outline-none focus:border-blue-500 transition-colors text-left"
              dir="ltr"
            />
            <p className="text-[10px] text-[#64748b]">
              برای دور زدن محدودیت‌های CORS در ارتباط مستقیم مرورگر به API سرورها — برای Anthropic معمولاً لازم است، برای OpenAI معمولاً نیازی نیست.
            </p>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.success && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              <span>{testResult.msg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-[#243147] bg-[#162032] hover:bg-[#1f2b42] text-[#cbd5e1] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-blue-400' : ''}`} />
              <span>{testing ? 'در حال بررسی...' : 'تست اتصال'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#162032] transition-colors"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-lg shadow-blue-500/20 transition-all"
              >
                <span>ذخیره سرویس</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
