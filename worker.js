/* ============================================================
   Private Router — Cloudflare Worker (CORS proxy) v4.0
   ------------------------------------------------------------
   هیچ مقدار محرمانه‌ای در این فایل هاردکد نشده است.
   همه‌ی تنظیمات از Worker Secrets / Vars خوانده می‌شوند:

     PROXY_TOKEN      (secret, الزامی)  توکنی که اپ باید در هدر
                                        X-Proxy-Token بفرستد.
     ALLOWED_ORIGINS  (var, الزامی)     لیست کاماجدا از Originهای مجاز.
     ALLOW_HOSTS      (var, الزامی)     لیست کاماجدا از هاست‌های مقصد مجاز.
     DEV_ALLOW_ALL    (var, اختیاری)    فقط برای توسعه‌ی محلی؛ اگر "true"
                                        باشد دو مورد بالا می‌توانند خالی
                                        بمانند. هرگز در production.

   ⚠️ تغییر مهم نسبت به v3: پیش‌فرض‌ها دیگر fail-open نیستند.
   لیست خالیِ Origin یا Host یعنی «پیکربندی ناقص» و ورکر ۵۰۳
   برمی‌گرداند، نه «همه مجازند». دلیلش این است که این ورکر هدرهای
   Authorization و x-api-key را فوروارد می‌کند؛ یک پروکسی باز با
   این رفتار عملاً یک SSRF قابل سوءاستفاده است.

   تنظیم:
     wrangler secret put PROXY_TOKEN
     wrangler deploy --var ALLOWED_ORIGINS:"https://your-site.pages.dev"
   ============================================================ */

const splitList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const isDevAllowAll = (env) => String(env.DEV_ALLOW_ALL || '').toLowerCase() === 'true';

/** هدرهایی که اجازه داریم از کلاینت به مقصد بفرستیم. */
const FORWARD_REQUEST_HEADERS = new Set([
  'authorization',
  'content-type',
  'x-api-key',
  'anthropic-version',
  'anthropic-beta',
  'anthropic-dangerous-direct-browser-access',
  'openai-organization',
  'openai-beta',
  'http-referer',
  'x-title',
]);

/** هدرهایی که نباید از پاسخ مقصد به مرورگر برگردند. */
const STRIP_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'upgrade',
  'content-security-policy',
  'content-security-policy-report-only',
  'set-cookie',
  'set-cookie2',
  'strict-transport-security',
  'public-key-pins',
]);

/** هدرهای پاسخ که مرورگر اجازه دارد بخواند. */
const EXPOSE_RESPONSE_HEADERS = [
  'content-type',
  'x-request-id',
  'request-id',
  'retry-after',
  'x-ratelimit-limit-requests',
  'x-ratelimit-remaining-requests',
  'x-ratelimit-reset-requests',
  'x-ratelimit-limit-tokens',
  'x-ratelimit-remaining-tokens',
  'x-ratelimit-reset-tokens',
  'anthropic-ratelimit-requests-remaining',
  'anthropic-ratelimit-tokens-remaining',
].join(',');

function corsHeaders(request, env) {
  const allowedOrigins = splitList(env.ALLOWED_ORIGINS);
  const origin = request.headers.get('Origin') || '';
  const devMode = isDevAllowAll(env);

  // fail-closed: لیست خالی در حالت عادی یعنی «هیچ‌کس»، نه «همه».
  const allowOrigin = devMode
    ? origin || '*'
    : allowedOrigins.includes(origin)
      ? origin
      : '';

  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': [...FORWARD_REQUEST_HEADERS, 'x-proxy-token'].join(','),
    'Access-Control-Expose-Headers': EXPOSE_RESPONSE_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return { headers, allowed: Boolean(allowOrigin) };
}

/**
 * مقایسه‌ی واقعاً زمان‌ثابت: به‌جای مقایسه‌ی مستقیم رشته‌ها (که با
 * بازگشت زودهنگام روی اختلاف طول، طول توکن را لو می‌داد) هر دو مقدار
 * SHA-256 می‌شوند و خلاصه‌های هم‌طول بایت‌به‌بایت مقایسه می‌شوند.
 */
async function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

/**
 * جلوگیری از SSRF به شبکه‌ی داخلی / سرویس metadata، حتی اگر کسی
 * اشتباهاً چنین هاستی را در ALLOW_HOSTS گذاشته باشد.
 */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) {
    return true;
  }
  if (h === '::1' || h === '0.0.0.0' || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local + metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  }
  return false;
}

/**
 * مقصد را از درخواست بیرون می‌کشد. هر دو قالبی که buildProxyUrl در اپ
 * می‌سازد پشتیبانی می‌شوند:
 *   /?url=<encoded>            ← قالب {url}
 *   /<encoded>                 ← قالب append
 */
function extractTarget(reqUrl) {
  const fromQuery = reqUrl.searchParams.get('url');
  if (fromQuery) return fromQuery;
  const path = reqUrl.pathname.replace(/^\/+/, '');
  if (!path) return '';
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export default {
  async fetch(request, env) {
    const { headers: CORS, allowed: originAllowed } = corsHeaders(request, env);
    const json = (obj, status) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });

    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: originAllowed ? 204 : 403, headers: CORS });
      }

      const devMode = isDevAllowAll(env);
      const allowedOrigins = splitList(env.ALLOWED_ORIGINS);
      const allowHosts = splitList(env.ALLOW_HOSTS);

      // پیکربندی ناقص = خاموش. نه باز.
      if (!devMode && allowedOrigins.length === 0) {
        return json(
          { error: 'ALLOWED_ORIGINS is not configured on this Worker (deploy with --var ALLOWED_ORIGINS:"https://your-site")' },
          503
        );
      }
      if (!devMode && allowHosts.length === 0) {
        return json(
          { error: 'ALLOW_HOSTS is not configured on this Worker (deploy with --var ALLOW_HOSTS:"api.anthropic.com,api.openai.com")' },
          503
        );
      }
      if (!originAllowed) return json({ error: 'origin not allowed' }, 403);

      const PROXY_TOKEN = env.PROXY_TOKEN;
      if (!PROXY_TOKEN) {
        return json(
          { error: 'PROXY_TOKEN is not configured on this Worker (run: wrangler secret put PROXY_TOKEN)' },
          503
        );
      }
      if (!(await safeEqual(request.headers.get('X-Proxy-Token') || '', PROXY_TOKEN))) {
        return json({ error: 'invalid X-Proxy-Token' }, 401);
      }

      const reqUrl = new URL(request.url);
      const target = extractTarget(reqUrl);
      if (!target) return json({ error: 'missing target url (use ?url=<encoded> or /<encoded>)' }, 400);

      let t;
      try {
        t = new URL(target);
      } catch {
        return json({ error: 'bad url' }, 400);
      }
      if (t.protocol !== 'https:' && !(devMode && t.protocol === 'http:')) {
        return json({ error: 'only https targets are allowed' }, 400);
      }
      if (isPrivateHost(t.hostname)) {
        return json({ error: 'target host is in a private/internal range' }, 403);
      }
      if (allowHosts.length && !allowHosts.includes(t.hostname)) {
        return json({ error: 'host not allowed: ' + t.hostname }, 403);
      }

      // فقط هدرهای whitelist‌شده فوروارد می‌شوند. X-Proxy-Token عمداً
      // در لیست نیست تا به provider درز نکند.
      const headers = new Headers();
      for (const [k, v] of request.headers.entries()) {
        if (FORWARD_REQUEST_HEADERS.has(k.toLowerCase())) headers.set(k, v);
      }
      headers.set('Accept', request.headers.get('Accept') || 'application/json, text/event-stream, */*');
      headers.set('Accept-Language', 'en-US,en;q=0.9');
      headers.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );

      const init = { method: request.method, headers, redirect: 'manual' };
      if (request.method === 'POST') init.body = await request.arrayBuffer();

      let resp;
      try {
        resp = await fetch(t.toString(), init);
      } catch (e) {
        return json({ error: 'upstream fetch failed: ' + e.message }, 502);
      }

      // redirect: 'manual' تا ریدایرکت به هاست غیرمجاز، allowlist را دور نزند.
      if (resp.status >= 300 && resp.status < 400) {
        return json({ error: 'upstream returned a redirect; refusing to follow it across the host allowlist' }, 502);
      }

      const upCt = resp.headers.get('content-type') || '';
      if (upCt.includes('text/html')) {
        return json(
          {
            error:
              'upstream returned an HTML page (likely a WAF/anti-bot challenge), not the API. This server cannot be used from a browser/worker.',
          },
          502
        );
      }

      const outHeaders = new Headers();
      for (const [k, v] of resp.headers.entries()) {
        if (!STRIP_RESPONSE_HEADERS.has(k.toLowerCase())) outHeaders.set(k, v);
      }
      for (const [k, v] of Object.entries(CORS)) outHeaders.set(k, v);
      return new Response(resp.body, { status: resp.status, headers: outHeaders });
    } catch (e) {
      return json({ error: 'worker error: ' + ((e && e.message) || e) }, 500);
    }
  },
};
