/**
 * یک لایه‌ی نازک روی localStorage.
 *
 * تا نسخه‌ی قبل فقط `services` و `settings` ذخیره می‌شدند و گفتگوها،
 * Comboها و الگوهای پرامپت صرفاً در stateِ ری‌اکت بودند — یعنی با هر
 * refresh پاک می‌شدند. همه‌ی بخش‌ها حالا از همین helper استفاده می‌کنند
 * تا این اتفاق دوباره نیفتد.
 */

export const STORAGE_KEYS = {
  services: 'combo_router_services_v1',
  combos: 'private_router_combos_v1',
  conversations: 'private_router_conversations_v1',
  promptTemplates: 'private_router_prompts_v1',
  adapters: 'private_router_adapters_v1',
  activeConversation: 'private_router_active_conv_v1',
  settings: 'private_router_settings_v1',
  adminAuth: 'admin_auth_v2',
  /** پیشوند شمارنده‌های round-robin هر Combo. */
  roundRobinPrefix: 'combo_rr_',
} as const;

/** خواندن یک مقدار JSON؛ در صورت خرابی/نبودن، مقدار پیش‌فرض برمی‌گردد. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (e) {
    console.error(`Failed to read "${key}" from localStorage:`, e);
    return fallback;
  }
}

/** نوشتن یک مقدار JSON. خطای quota/حالت ناشناس باعث crash نمی‌شود. */
export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write "${key}" to localStorage:`, e);
  }
}

export function readString(key: string, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`Failed to write "${key}" to localStorage:`, e);
  }
}

/**
 * پاک کردن کامل داده‌های اپ. برخلاف نسخه‌ی قبل، شمارنده‌های
 * round-robin و فلگ ورود مدیر هم حذف می‌شوند.
 */
export function wipeAllStoredData(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        (Object.values(STORAGE_KEYS) as string[]).includes(k) ||
        k.startsWith(STORAGE_KEYS.roundRobinPrefix) ||
        k === 'admin_auth' // فلگ قدیمی و قابل‌جعل
      ) {
        doomed.push(k);
      }
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to wipe localStorage:', e);
  }
}
