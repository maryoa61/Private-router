import { AIService, ComboItem, Conversation, ChatMessage } from '../types';
import { buildProxyUrl, normalizeBaseUrl, proxyAuthHeaders } from './serviceApi';

export interface SendResult {
  success: boolean;
  content: string;
  error?: string;
}

function buildMessagesPayload(conversation: Conversation, userMessage: string, extraSystemPrompt?: string) {
  const sys = [conversation.systemPrompt, extraSystemPrompt].filter(Boolean).join('\n\n');
  const history = conversation.contextLimit && conversation.contextLimit > 0
    ? conversation.messages.slice(-conversation.contextLimit)
    : conversation.messages;

  const messages: { role: string; content: string }[] = [];
  if (sys.trim()) messages.push({ role: 'system', content: sys.trim() });
  for (const m of history) {
    if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/**
 * Calls a single AIService's chat/completions endpoint (non-streaming, simple JSON response).
 */
export async function callServiceChat(
  service: AIService,
  conversation: Conversation,
  userMessage: string,
  modelOverride?: string,
  extraSystemPrompt?: string,
  proxyToken?: string
): Promise<SendResult> {
  const normBase = normalizeBaseUrl(service.baseUrl);
  const endpoint = normBase.endsWith('/v1') ? `${normBase}/chat/completions` : `${normBase}/v1/chat/completions`;
  const targetUrl = buildProxyUrl(endpoint, service.corsProxy);

  const model = modelOverride || service.models[0]?.name || service.models[0]?.id || 'default-model';

  const body = {
    model,
    messages: buildMessagesPayload(conversation, userMessage, extraSystemPrompt),
    temperature: conversation.temperature,
    top_p: conversation.topP,
    max_tokens: conversation.maxTokens || undefined,
    stream: false,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...proxyAuthHeaders(service.corsProxy, proxyToken),
  };
  if (service.apiKey && service.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${service.apiKey.trim()}`;
    headers['x-api-key'] = service.apiKey.trim();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let msg =
        res.status === 401 && service.corsProxy
          ? 'خطای ۴۰۱: توکن امنیتی Worker نامعتبر یا تنظیم‌نشده است (Settings → امنیت).'
          : `خطای HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) msg = errJson.error.message;
      } catch {
        /* ignore */
      }
      return { success: false, content: '', error: msg };
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '';

    if (!content) {
      return { success: false, content: '', error: 'پاسخ خالی یا فرمت ناشناخته از سرور دریافت شد.' };
    }

    return { success: true, content };
  } catch (err: any) {
    let msg = err?.message || 'خطای ناشناخته در اتصال';
    if (err?.name === 'AbortError') msg = 'درخواست به دلیل انقضای زمان (Timeout 30s) متوقف شد.';
    else if (msg.includes('Failed to fetch')) msg = 'خطای شبکه یا CORS. از CORS Proxy Worker استفاده کنید.';
    return { success: false, content: '', error: msg };
  }
}

/**
 * Runs a Combo (Fallback / Round Robin / Fusion) across its member models.
 * `services` is the full list of saved services, used to resolve each combo model's credentials.
 */
export async function callComboChat(
  combo: ComboItem,
  services: AIService[],
  conversation: Conversation,
  userMessage: string,
  extraSystemPrompt?: string,
  proxyToken?: string
): Promise<SendResult> {
  const members = combo.models
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((m) => ({ ...m, service: services.find((s) => s.id === m.serviceId) }))
    .filter((m) => !!m.service) as (typeof combo.models[number] & { service: AIService })[];

  if (members.length === 0) {
    return { success: false, content: '', error: 'این Combo هیچ مدل معتبری (با سرویس موجود) ندارد.' };
  }

  if (combo.strategy === 'fallback') {
    let lastError = '';
    for (const m of members) {
      const res = await callServiceChat(m.service, conversation, userMessage, m.modelName, extraSystemPrompt, proxyToken);
      if (res.success) return res;
      lastError = res.error || 'خطای نامشخص';
    }
    return { success: false, content: '', error: `همه‌ی مدل‌های Combo با خطا مواجه شدند. آخرین خطا: ${lastError}` };
  }

  if (combo.strategy === 'round_robin') {
    const counterKey = `combo_rr_counter_${combo.id}`;
    const idx = (parseInt(localStorage.getItem(counterKey) || '0', 10) || 0) % members.length;
    localStorage.setItem(counterKey, String((idx + 1) % members.length));
    const m = members[idx];
    return callServiceChat(m.service, conversation, userMessage, m.modelName, extraSystemPrompt, proxyToken);
  }

  // fusion: query all in parallel, then ask the first healthy member to synthesize
  const results = await Promise.all(
    members.map((m) => callServiceChat(m.service, conversation, userMessage, m.modelName, extraSystemPrompt, proxyToken))
  );
  const successful = results.filter((r) => r.success);
  if (successful.length === 0) {
    return { success: false, content: '', error: 'هیچ‌کدام از مدل‌های Combo پاسخ ندادند.' };
  }
  if (successful.length === 1) return successful[0];

  const judgePrompt =
    'چند پاسخ مختلف از مدل‌های گوناگون به یک سوال دریافت شده. بهترین و کامل‌ترین پاسخ نهایی را با ترکیب نقاط قوت آن‌ها ارائه بده، بدون اشاره به این‌که چند پاسخ وجود داشته:\n\n' +
    successful.map((r, i) => `پاسخ ${i + 1}:\n${r.content}`).join('\n\n---\n\n');

  const judgeMember = members[0];
  return callServiceChat(judgeMember.service, conversation, judgePrompt, judgeMember.modelName, undefined, proxyToken);
}

export type { ChatMessage };
