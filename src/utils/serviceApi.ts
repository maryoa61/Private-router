import { AIService, ServiceModel } from '../types';
import { STORAGE_KEYS, readJson, writeJson } from './storage';

const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Resolves the target URL through an optional CORS Proxy Worker URL.
 * Supports placeholder {url} or appended URL format.
 */
export function buildProxyUrl(targetUrl: string, corsProxy?: string): string {
  if (!corsProxy || !corsProxy.trim()) {
    return targetUrl;
  }
  const cleanProxy = corsProxy.trim();
  if (cleanProxy.includes('{url}')) {
    return cleanProxy.replace('{url}', encodeURIComponent(targetUrl));
  }
  // حالت append. ورکر v4 هر دو قالب را می‌فهمد؛ ورکر v3 فقط ?url= را
  // می‌خواند و این قالب همیشه با «missing ?url=» رد می‌شد.
  return `${cleanProxy.replace(/\/+$/, '')}/${encodeURIComponent(targetUrl)}`;
}

/**
 * Builds the headers needed to authenticate against the CORS proxy Worker.
 * The token is only attached when a proxy is actually in use, so it is never
 * leaked to the upstream AI provider.
 */
export function proxyAuthHeaders(corsProxy?: string, proxyToken?: string): Record<string, string> {
  if (!corsProxy || !corsProxy.trim()) return {};
  if (!proxyToken || !proxyToken.trim()) return {};
  return { 'X-Proxy-Token': proxyToken.trim() };
}

/**
 * Normalizes the base URL, stripping trailing slashes.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function isAnthropicHost(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.endsWith('anthropic.com');
  } catch {
    return false;
  }
}

/**
 * Section 1 & 2: Real API call to test connection and fetch models.
 *
 * Anthropic and OpenAI-compatible providers (OpenAI, Groq, DeepSeek,
 * OpenRouter, Gemini's OpenAI-compat endpoint, Custom) use different auth
 * headers and, for Anthropic, a different models-list endpoint contract —
 * both are handled explicitly here so "Test connection" reflects what the
 * chat call will actually do.
 *
 * `preset` is optional and only used to pick the Anthropic branch when the
 * URL itself doesn't make it obvious (e.g. a CORS-proxied or self-hosted
 * gateway URL); when omitted, the host is used to detect Anthropic.
 */
export async function testAndFetchServiceModels(
  baseUrl: string,
  apiKey: string,
  corsProxy?: string,
  proxyToken?: string,
  preset?: string
): Promise<{
  success: boolean;
  latencyMs: number;
  models: ServiceModel[];
  message: string;
}> {
  const normBase = normalizeBaseUrl(baseUrl);
  const anthropic = preset === 'Anthropic' || isAnthropicHost(normBase);

  // Anthropic's models endpoint always lives at /v1/models regardless of
  // whether the configured base already ends in /v1.
  const endpoint = anthropic
    ? `${normBase.replace(/\/v1$/, '')}/v1/models`
    : normBase.endsWith('/v1')
      ? `${normBase}/models`
      : `${normBase}/v1/models`;
  const targetUrl = buildProxyUrl(endpoint, corsProxy);

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...proxyAuthHeaders(corsProxy, proxyToken),
    };

    if (anthropic) {
      headers['anthropic-version'] = ANTHROPIC_VERSION;
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      if (apiKey && apiKey.trim()) headers['x-api-key'] = apiKey.trim();
    } else if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      let errorDetail = `خطای HTTP ${response.status} (${response.statusText})`;
      try {
        const errorJson = await response.json();
        const providerMsg = errorJson?.error?.message || errorJson?.message;
        if (providerMsg) errorDetail = providerMsg;
      } catch {
        // ignore json parse error
      }
      return {
        success: false,
        latencyMs,
        models: [],
        message: `اتصال ناموفق بود: ${errorDetail}`,
      };
    }

    const data = await response.json();

    let rawList: any[] = [];
    if (Array.isArray(data.data)) {
      rawList = data.data; // OpenAI و Anthropic هر دو همین شکل را برمی‌گردانند
    } else if (Array.isArray(data.models)) {
      rawList = data.models; // Gemini / Ollama format
    } else if (Array.isArray(data)) {
      rawList = data;
    }

    const models: ServiceModel[] = rawList.map((m: any) => {
      const id = typeof m === 'string' ? m : (m.id || m.name || 'unknown-model');
      const name = typeof m === 'string' ? m : (m.display_name || m.name || m.id || id);
      return {
        id,
        name: name.replace(/^models\//, ''),
        isHealthy: true,
        latencyMs,
      };
    });

    // If endpoint returned empty list or non-standard format, provide at least the default model
    if (models.length === 0) {
      models.push({
        id: 'default-model',
        name: 'default-model',
        isHealthy: true,
        latencyMs,
      });
    }

    return {
      success: true,
      latencyMs,
      models,
      message: `اتصال موفقیت‌آمیز بود! پینگ: ${latencyMs}ms • تعداد ${models.length} مدل دریافت شد.`,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    let errMsg = err.message || 'خطای ناشناخته در اتصال';
    if (err.name === 'AbortError') {
      errMsg = 'درخواست به دلیل انقضای زمان (Timeout 12s) متوقف شد.';
    } else if (err.message && err.message.includes('Failed to fetch')) {
      errMsg = anthropic
        ? 'خطای شبکه یا CORS. Anthropic برای اتصال مستقیم از مرورگر معمولاً به CORS Proxy Worker نیاز دارد (Settings).'
        : 'خطای ارتباط شبکه یا محدودیت CORS. در صورت نیاز از CORS Proxy Worker استفاده کنید.';
    } else if (err?.status === 401) {
      errMsg = 'توکن امنیتی Worker نامعتبر است یا API Key اشتباه است.';
    }

    return {
      success: false,
      latencyMs,
      models: [],
      message: errMsg,
    };
  }
}

/**
 * Storage helpers for Services
 */
export function loadServicesFromLocalStorage(fallbackServices: AIService[]): AIService[] {
  const parsed = readJson<AIService[]>(STORAGE_KEYS.services, fallbackServices);
  return Array.isArray(parsed) ? parsed : fallbackServices;
}

export function saveServicesToLocalStorage(services: AIService[]): void {
  writeJson(STORAGE_KEYS.services, services);
}
