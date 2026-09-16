import { AIService, ComboItem, Conversation, ChatMessage } from '../types';
import { buildProxyUrl, normalizeBaseUrl, proxyAuthHeaders } from './serviceApi';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

export interface SendResult {
  success: boolean;
  content: string;
  error?: string;
}

export function buildMessagesPayload(conversation: Conversation, userMessage: string, extraSystemPrompt?: string) {
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

/** True for Anthropic Claude — detected by preset OR by the host, so a
 * "Custom" service pointed at api.anthropic.com still gets the right wire
 * format instead of silently sending OpenAI-shaped requests that Anthropic
 * will reject. */
function isAnthropic(service: AIService): boolean {
  if (service.preset === 'Anthropic') return true;
  try {
    return new URL(service.baseUrl).hostname.endsWith('anthropic.com');
  } catch {
    return false;
  }
}

const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_DEFAULT_MAX_TOKENS = 4096;

/**
 * Builds the fetch() call for Anthropic's native Messages API
 * (https://docs.anthropic.com/en/api/messages), which is NOT OpenAI-shaped:
 *   - endpoint is /v1/messages, not /v1/chat/completions
 *   - auth is the x-api-key header (no "Bearer ")
 *   - requires an anthropic-version header
 *   - system prompt is a top-level `system` string, not a message with role "system"
 *   - max_tokens is required
 *   - response content is `content: [{ type: "text", text }]`, not `choices`
 * Direct browser calls also need anthropic-dangerous-direct-browser-access,
 * since Anthropic's API otherwise refuses the CORS preflight from a page —
 * this is exactly the same "key sits in the browser" trust model the rest of
 * this app already uses, so it's turned on rather than forcing a proxy.
 */
function buildAnthropicRequest(
  service: AIService,
  conversation: Conversation,
  userMessage: string,
  modelOverride: string | undefined,
  extraSystemPrompt: string | undefined,
  proxyToken?: string
) {
  const normBase = normalizeBaseUrl(service.baseUrl).replace(/\/v1$/, '');
  const endpoint = `${normBase}/v1/messages`;
  const targetUrl = buildProxyUrl(endpoint, service.corsProxy);

  const model = modelOverride || service.models[0]?.name || service.models[0]?.id || 'claude-sonnet-4-5';
  const system = [conversation.systemPrompt, extraSystemPrompt].filter(Boolean).join('\n\n').trim();

  const history = conversation.contextLimit && conversation.contextLimit > 0
    ? conversation.messages.slice(-conversation.contextLimit)
    : conversation.messages;
  const messages = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));
  messages.push({ role: 'user', content: userMessage });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: conversation.maxTokens || ANTHROPIC_DEFAULT_MAX_TOKENS,
    temperature: conversation.temperature,
    top_p: conversation.topP,
  };
  if (system) body.system = system;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
    ...proxyAuthHeaders(service.corsProxy, proxyToken),
  };
  if (service.apiKey && service.apiKey.trim()) headers['x-api-key'] = service.apiKey.trim();

  return { targetUrl, headers, body };
}

function extractAnthropicText(data: any): string {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return blocks
    .filter((b: any) => b?.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('');
}

/**
 * Calls a single AIService. Anthropic gets its native Messages API request
 * shape (see buildAnthropicRequest); every other preset (OpenAI, Groq,
 * DeepSeek, OpenRouter, Gemini-OpenAI-compat, Custom) is assumed to speak the
 * OpenAI-compatible /v1/chat/completions dialect, which is what all of those
 * providers actually implement.
 */
export async function callServiceChat(
  service: AIService,
  conversation: Conversation,
  userMessage: string,
  modelOverride?: string,
  extraSystemPrompt?: string,
  proxyToken?: string
): Promise<SendResult> {
  const anthropic = isAnthropic(service);

  let targetUrl: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  if (anthropic) {
    const req = buildAnthropicRequest(service, conversation, userMessage, modelOverride, extraSystemPrompt, proxyToken);
    targetUrl = req.targetUrl;
    headers = req.headers;
    body = req.body;
  } else {
    const normBase = normalizeBaseUrl(service.baseUrl);
    const endpoint = normBase.endsWith('/v1') ? `${normBase}/chat/completions` : `${normBase}/v1/chat/completions`;
    targetUrl = buildProxyUrl(endpoint, service.corsProxy);

    const model = modelOverride || service.models[0]?.name || service.models[0]?.id || 'default-model';
    body = {
      model,
      messages: buildMessagesPayload(conversation, userMessage, extraSystemPrompt),
      temperature: conversation.temperature,
      top_p: conversation.topP,
      max_tokens: conversation.maxTokens || undefined,
      stream: false,
    };
    headers = {
      'Content-Type': 'application/json',
      ...proxyAuthHeaders(service.corsProxy, proxyToken),
    };
    if (service.apiKey && service.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${service.apiKey.trim()}`;
    }
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
          ? 'خطای ۴۰۱: توکن امنیتی Worker نامعتبر یا تنظیم‌نشده است (Settings → پروکسی CORS)، یا API Key اشتباه است.'
          : `خطای HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        const providerMsg = errJson?.error?.message || errJson?.message;
        if (providerMsg) msg = providerMsg;
      } catch {
        /* ignore */
      }
      return { success: false, content: '', error: msg };
    }

    const data = await res.json();
    const content = anthropic
      ? extractAnthropicText(data)
      : data?.choices?.[0]?.message?.content ??
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

/** One "call this service" step, decoupled from how it actually reaches the provider. */
export type SendFn = (
  service: AIService,
  conversation: Conversation,
  userMessage: string,
  modelOverride?: string,
  extraSystemPrompt?: string
) => Promise<SendResult>;

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
  proxyToken?: string,
  sendFn: SendFn = (service, conv, msg, modelOverride, sys) =>
    callServiceChat(service, conv, msg, modelOverride, sys, proxyToken)
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
      const res = await sendFn(m.service, conversation, userMessage, m.modelName, extraSystemPrompt);
      if (res.success) return res;
      lastError = res.error || 'خطای نامشخص';
    }
    return { success: false, content: '', error: `همه‌ی مدل‌های Combo با خطا مواجه شدند. آخرین خطا: ${lastError}` };
  }

  if (combo.strategy === 'round_robin') {
    // شمارنده‌ی یکنواخت صعودی ذخیره می‌شود و modulo فقط موقع خواندن
    // اعمال می‌شود؛ نسخه‌ی قبلی مقدارِ از پیش modulo شده را ذخیره می‌کرد
    // و با تغییر تعداد اعضای Combo چرخش نامتوازن می‌شد.
    const counterKey = `${STORAGE_KEYS.roundRobinPrefix}counter_${combo.id}`;
    const counter = readJson<number>(counterKey, 0);
    const idx = ((counter % members.length) + members.length) % members.length;
    writeJson(counterKey, counter + 1);
    const m = members[idx];
    return sendFn(m.service, conversation, userMessage, m.modelName, extraSystemPrompt);
  }

  // Fusion is the expensive strategy: it calls every member in parallel and then
  // spends one more call asking a judge model to synthesize them, i.e. N+1 paid
  // API calls for a single chat message. Two guardrails keep that bounded:
  //   1. Cap how many members actually get queried — beyond a handful of
  //      models, more "votes" add cost far faster than they add answer quality.
  //   2. Give the judge a much smaller token budget than the conversation's own
  //      setting: it is summarizing/merging existing text, not writing fresh
  //      long-form content, so it rarely needs the full budget.
  const MAX_FUSION_MEMBERS = 4;
  const JUDGE_MAX_TOKENS = 1024;
  const fusionMembers = members.slice(0, MAX_FUSION_MEMBERS);

  const results = await Promise.all(
    fusionMembers.map((m) => sendFn(m.service, conversation, userMessage, m.modelName, extraSystemPrompt))
  );
  const successful = results.filter((r) => r.success);
  if (successful.length === 0) {
    return { success: false, content: '', error: 'هیچ‌کدام از مدل‌های Combo پاسخ ندادند.' };
  }
  if (successful.length === 1) return successful[0];

  // No need to spend a whole extra call reconciling answers that already agree.
  const uniqueContents = new Set(successful.map((r) => r.content.trim()));
  if (uniqueContents.size === 1) return successful[0];

  const judgePrompt =
    'چند پاسخ مختلف از مدل‌های گوناگون به یک سوال دریافت شده. بهترین و کامل‌ترین پاسخ نهایی را با ترکیب نقاط قوت آن‌ها ارائه بده، بدون اشاره به این‌که چند پاسخ وجود داشته:\n\n' +
    successful.map((r, i) => `پاسخ ${i + 1}:\n${r.content}`).join('\n\n---\n\n');

  const judgeMember = fusionMembers[0];
  // داور فقط خود پاسخ‌ها را می‌بیند: فرستادن دوباره‌ی کل تاریخچه‌ی گفتگو
  // (که قبلاً اتفاق می‌افتاد) هزینه‌ی توکن را بی‌دلیل چند برابر می‌کرد،
  // چون متن پاسخ‌ها خودش داخل judgePrompt هست.
  const judgeConversation: Conversation = {
    ...conversation,
    messages: [],
    systemPrompt: '',
    contextLimit: 0,
    maxTokens: conversation.maxTokens ? Math.min(conversation.maxTokens, JUDGE_MAX_TOKENS) : JUDGE_MAX_TOKENS,
  };
  return sendFn(judgeMember.service, judgeConversation, judgePrompt, judgeMember.modelName, undefined);
}

export type { ChatMessage };
