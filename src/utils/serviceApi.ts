import { AIService, ServiceModel } from '../types';

const STORAGE_KEY_SERVICES = 'combo_router_services_v1';

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
  return `${cleanProxy.replace(/\/+$/, '')}/${encodeURIComponent(targetUrl)}`;
}

/**
 * Normalizes the base URL, stripping trailing slashes.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Section 1 & 2: Real API call to test connection and fetch models from /v1/models or /models
 */
export async function testAndFetchServiceModels(
  baseUrl: string,
  apiKey: string,
  corsProxy?: string
): Promise<{
  success: boolean;
  latencyMs: number;
  models: ServiceModel[];
  message: string;
}> {
  const normBase = normalizeBaseUrl(baseUrl);
  
  // Choose standard endpoint. If baseUrl already ends with /v1, use /models, else check /v1/models
  const endpoint = normBase.endsWith('/v1') ? `${normBase}/models` : `${normBase}/v1/models`;
  const targetUrl = buildProxyUrl(endpoint, corsProxy);

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      // Some endpoints (like Anthropic or specialized APIs) use custom headers
      headers['x-api-key'] = apiKey.trim();
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
        if (errorJson.error?.message) {
          errorDetail = errorJson.error.message;
        }
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
      rawList = data.data; // Standard OpenAI format
    } else if (Array.isArray(data.models)) {
      rawList = data.models; // Gemini / Ollama format
    } else if (Array.isArray(data)) {
      rawList = data;
    }

    const models: ServiceModel[] = rawList.map((m: any) => {
      const id = typeof m === 'string' ? m : (m.id || m.name || 'unknown-model');
      const name = typeof m === 'string' ? m : (m.name || m.id || id);
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
      errMsg = 'خطای ارتباط شبکه یا محدودیت CORS. در صورت نیاز از CORS Proxy Worker استفاده کنید.';
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
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SERVICES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read services from localStorage:', e);
  }
  return fallbackServices;
}

export function saveServicesToLocalStorage(services: AIService[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
  } catch (e) {
    console.error('Failed to save services to localStorage:', e);
  }
}
