import React, { useState } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Globe, 
  Sliders, 
  BookmarkPlus, 
  Copy, 
  Check, 
  Volume2, 
  Sparkles, 
  Code2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  FileCode,
  Bot,
  User,
  ExternalLink
} from 'lucide-react';
import { Conversation, PromptTemplate } from '../types';

interface ChatViewProps {
  conversation: Conversation;
  promptTemplates: PromptTemplate[];
  onSendMessage: (text: string, withWebSearch: boolean) => void;
  onSavePromptToLibrary: (title: string, content: string) => void;
  onUpdateConversationSettings: (settings: {
    systemPrompt: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    contextLimit: number;
  }) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  promptTemplates,
  onSendMessage,
  onSavePromptToLibrary,
  onUpdateConversationSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [webSearchActive, setWebSearchActive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [playingTTS, setPlayingTTS] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Local state for system parameters drawer
  const [sysPrompt, setSysPrompt] = useState(conversation.systemPrompt || '');
  const [temperature, setTemperature] = useState(conversation.temperature || 0.7);
  const [topP, setTopP] = useState(conversation.topP || 0.95);
  const [maxTokens, setMaxTokens] = useState(conversation.maxTokens || 4096);
  const [contextLimit, setContextLimit] = useState(conversation.contextLimit || 8);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleApplyTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = promptTemplates.find((t) => t.id === id);
    if (tmpl) {
      setSysPrompt(tmpl.content);
    }
  };

  const handleSaveToLib = () => {
    if (!sysPrompt.trim()) return;
    const title = sysPrompt.slice(0, 24) + '...';
    onSavePromptToLibrary(title, sysPrompt);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleSaveDrawerSettings = () => {
    onUpdateConversationSettings({
      systemPrompt: sysPrompt,
      temperature,
      topP,
      maxTokens,
      contextLimit,
    });
    setDrawerOpen(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText, webSearchActive);
    setInputText('');
  };

  const copyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const simulateTTS = (id: string, text: string) => {
    setPlayingTTS(id);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.substring(0, 150));
      utterance.onend = () => setPlayingTTS(null);
      utterance.onerror = () => setPlayingTTS(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingTTS(null), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0f19] overflow-hidden text-[#e2e8f0]" dir="rtl">
      {/* 1. Chat Top Header */}
      <div className="h-14 border-b border-[#1e293b] bg-[#101726] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {conversation.title}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {conversation.targetType === 'combo' ? 'روتر Combo' : 'سرویس مستقیم'}
              </span>
            </div>
            <span className="text-[11px] text-[#64748b] font-mono">
              سرویس انتخابی: {conversation.targetName}
            </span>
          </div>
        </div>

        {/* System Prompt & Parameter Drawer Button */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            drawerOpen
              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
              : 'border-[#243147] bg-[#162032] text-[#cbd5e1] hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">تنظیمات پرامپت و مدل</span>
          {drawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. System Parameters Dropdown Panel / Drawer */}
      {drawerOpen && (
        <div className="border-b border-[#1e293b] bg-[#0d1322] p-4 sm:p-6 shadow-xl flex flex-col gap-4 animate-fade-in z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>پیکربندی هوشمند پرامپت و پارامترهای گفتگو</span>
            </h3>

            {/* Prompt Library Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#94a3b8]">کتابخانه پرامپت:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="text-xs rounded-lg border border-[#243147] bg-[#141c2c] px-2.5 py-1 text-white outline-none"
              >
                <option value="">-- انتخاب از الگوهای ذخیره‌شده --</option>
                {promptTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.title} ({tmpl.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* System Prompt Textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#94a3b8]">
                دستورالعمل سیستم (System Prompt):
              </label>
              <button
                type="button"
                onClick={handleSaveToLib}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>{savedNotice ? 'ذخیره شد!' : 'ذخیره در کتابخانه پرامپت'}</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={sysPrompt}
              onChange={(e) => setSysPrompt(e.target.value)}
              placeholder="دستورالعمل نقشی که هوش مصنوعی باید در طول این گفتگو ایفا کند..."
              className="w-full text-xs rounded-xl border border-[#243147] bg-[#141c2c] p-3 text-white placeholder-[#475569] outline-none focus:border-blue-500"
            />
          </div>

          {/* Sliders Grid: Temp, Top-P, Max Tokens, Context Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 rounded-xl border border-[#1e293b] bg-[#101726]">
            {/* Temperature Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#94a3b8]">Temperature (دقت / خلاقیت):</span>
                <span className="font-mono text-blue-400">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Top P Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#94a3b8]">Top P:</span>
                <span className="font-mono text-blue-400">{topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Max Output Tokens */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#94a3b8]">حداکثر توکن خروجی:</label>
              <input
                type="number"
                min="256"
                max="32768"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                className="text-xs rounded-lg border border-[#243147] bg-[#141c2c] px-2 py-1 text-white outline-none"
              />
            </div>

            {/* Context Limit */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#94a3b8]">کوتاه‌سازی Context (N پیام):</label>
              <input
                type="number"
                min="0"
                max="50"
                value={contextLimit}
                onChange={(e) => setContextLimit(parseInt(e.target.value) || 0)}
                className="text-xs rounded-lg border border-[#243147] bg-[#141c2c] px-2 py-1 text-white outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDrawerOpen(false)}
              className="px-3 py-1.5 text-xs text-[#94a3b8] hover:text-white"
            >
              بستن
            </button>
            <button
              onClick={handleSaveDrawerSettings}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
            >
              اعمال تنظیمات
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
        {conversation.messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-[#1e293b] border border-[#243147] text-blue-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`flex flex-col gap-2 rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-[#101726] border border-[#243147] text-[#e2e8f0] rounded-tl-none'
                }`}
              >
                {/* Regular content */}
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Live Web Sources Indicator if present */}
                {msg.webSources && msg.webSources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1e293b] flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      منابع جستجوی زنده وب:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.webSources.map((source, sIdx) => (
                        <a
                          key={sIdx}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20"
                        >
                          <span>{source.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Error Detection Assistant Block (Item 5) */}
                {msg.isCodeFix && msg.codeAnalysis && (
                  <div className="mt-3 flex flex-col gap-3 pt-3 border-t border-[#1e293b]">
                    {/* Error Analysis & Cause Block */}
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>تحلیل خطای کد (Code Error Detection):</span>
                      </div>
                      <p className="text-[11px] text-[#cbd5e1]">
                        <strong className="text-white">علت خطا: </strong>
                        {msg.codeAnalysis.cause}
                      </p>
                      <p className="text-[11px] text-[#cbd5e1]">
                        <strong className="text-white">راهکار اصلاح: </strong>
                        {msg.codeAnalysis.solution}
                      </p>
                      <div className="text-[10px] font-mono text-blue-400 bg-black/30 px-2 py-1 rounded">
                        خلاصه تغییرات: {msg.codeAnalysis.diffSummary}
                      </div>
                    </div>

                    {/* Fixed Code Box with Copy Button */}
                    <div className="rounded-xl border border-[#243147] bg-[#0c111c] overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141c2c] border-b border-[#243147] text-[10px]">
                        <span className="font-mono text-[#94a3b8]">
                          {msg.codeAnalysis.language} • نسخه اصلاح‌شده کامل
                        </span>
                        <button
                          onClick={() => copyContent(msg.codeAnalysis!.fixedCode, `code-${msg.id}`)}
                          className="flex items-center gap-1 text-blue-400 hover:text-white font-medium"
                        >
                          {copiedMsgId === `code-${msg.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>کپی کد</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3 text-[11px] font-mono text-[#e2e8f0] overflow-x-auto text-left" dir="ltr">
                        <code>{msg.codeAnalysis.fixedCode}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Footer bar for assistant message: Timestamp, TTS, Copy */}
                {!isUser && (
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#1e293b]/70 text-[10px] text-[#64748b]">
                    <span>{msg.timestamp}</span>
                    <div className="flex items-center gap-2">
                      {/* TTS Button */}
                      <button
                        onClick={() => simulateTTS(msg.id, msg.content)}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                          playingTTS === msg.id
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'hover:text-white text-[#94a3b8]'
                        }`}
                        title="خواندن پاسخ با صدا (TTS)"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{playingTTS === msg.id ? 'در حال پخش...' : 'صدا'}</span>
                      </button>

                      {/* Copy message button */}
                      <button
                        onClick={() => copyContent(msg.content, msg.id)}
                        className="hover:text-white text-[#94a3b8] flex items-center gap-1"
                        title="کپی متن پاسخ"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>کپی</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Input Bar Area */}
      <div className="p-4 border-t border-[#1e293b] bg-[#0e1422] shrink-0 flex flex-col gap-2">
        {/* Web Search Live Toggle Bar (Item 6) */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between px-2">
          <button
            type="button"
            onClick={() => setWebSearchActive(!webSearchActive)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              webSearchActive
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-sm'
                : 'bg-[#141c2c] border border-[#243147] text-[#94a3b8] hover:text-white'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${webSearchActive ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>جستجوی وب زنده (Live Web Search):</span>
            <span className="font-bold">{webSearchActive ? 'فعال' : 'غیرفعال'}</span>
          </button>

          <span className="text-[10px] text-[#64748b]">
            نکته: برای بررسی خطای کد، متن خطا یا کد معیوب را اینجا پیست کنید.
          </span>
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={handleSend}
          className="max-w-3xl w-full mx-auto flex items-center gap-2 rounded-2xl border border-[#243147] bg-[#131a29] px-3 py-2 shadow-lg focus-within:border-blue-500 transition-colors"
        >
          {/* File Attachment */}
          <label
            className="w-8 h-8 rounded-xl border border-[#243147] bg-[#162032] flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer shrink-0 transition-colors"
            title="پیوست عکس یا فایل"
          >
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" />
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              webSearchActive
                ? 'سوال با جستجوی زنده وب، یا کد برای عیب‌یابی...'
                : 'پیام خود را بنویسید یا خطای کد را برای دیباگ پیست کنید...'
            }
            className="flex-1 bg-transparent text-xs text-[#e2e8f0] placeholder-[#475569] outline-none"
          />

          {/* Mic Button */}
          <button
            type="button"
            className="w-8 h-8 rounded-xl border border-[#243147] bg-[#162032] flex items-center justify-center text-[#94a3b8] hover:text-white shrink-0 transition-colors"
            title="ورودی صوتی"
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:hover:bg-blue-600"
            title="ارسال پیام"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
