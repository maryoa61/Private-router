/* ============================================================
   Private Router — Cloudflare Worker (CORS proxy) v3.0
   ------------------------------------------------------------
   هیچ مقدار محرمانه‌ای در این فایل هاردکد نشده است.
   همه‌ی تنظیمات از Worker Secrets / Vars خوانده می‌شوند:

     PROXY_TOKEN      (secret, الزامی)  توکنی که اپ باید در هدر
                                        X-Proxy-Token بفرستد.
     ALLOWED_ORIGINS  (var, اختیاری)    لیست کاماجدا از Originهای مجاز،
                                        مثلا: https://private-router.pages.dev
                                        خالی = همه (فقط برای تست محلی).
     ALLOW_HOSTS      (var, اختیاری)    لیست کاماجدا از هاست‌های مقصد مجاز.
                                        خالی = همه هاست‌ها.

   تنظیم:
     wrangler secret put PROXY_TOKEN
     wrangler deploy --var ALLOWED_ORIGINS:"https://your-site.pages.dev"
   ============================================================ */

const splitList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function corsHeaders(request, env) {
  const allowedOrigins = splitList(env.ALLOWED_ORIGINS);
  const origin = request.headers.get('Origin') || '';
  // اگر لیست خالی است همه مجازند؛ در غیر این صورت فقط Origin ثبت‌شده بازتاب می‌شود.
  const allowOrigin =
    allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : '';

  const reqHdrs = request.headers.get('Access-Control-Request-Headers');
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': reqHdrs || 'Authorization,Content-Type,X-Proxy-Token,x-api-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return { headers, allowed: allowedOrigins.length === 0 || Boolean(allowOrigin) };
}

/** مقایسه‌ی زمان‌ثابت تا از timing attack روی توکن جلوگیری شود. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
      if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

      if (!originAllowed) {
        return json({ error: 'origin not allowed' }, 403);
      }

      const PROXY_TOKEN = env.PROXY_TOKEN;
      if (!PROXY_TOKEN) {
        // fail closed: بدون secret، ورکر پروکسی باز عمومی نمی‌شود.
        return json(
          { error: 'PROXY_TOKEN is not configured on this Worker (run: wrangler secret put PROXY_TOKEN)' },
          503
        );
      }
      if (!safeEqual(request.headers.get('X-Proxy-Token') || '', PROXY_TOKEN)) {
        return json({ error: 'invalid X-Proxy-Token' }, 401);
      }

      const reqUrl = new URL(request.url);
      const target = reqUrl.searchParams.get('url');
      if (!target) return json({ error: 'missing ?url=' }, 400);

      let t;
      try {
        t = new URL(target);
      } catch {
        return json({ error: 'bad url' }, 400);
      }
      if (!/^https?:$/.test(t.protocol)) return json({ error: 'unsupported protocol' }, 400);

      const allowHosts = splitList(env.ALLOW_HOSTS);
      if (allowHosts.length && !allowHosts.includes(t.hostname)) {
        return json({ error: 'host not allowed: ' + t.hostname }, 403);
      }

      const headers = new Headers();
      const auth = request.headers.get('Authorization');
      if (auth) headers.set('Authorization', auth);
      const ct = request.headers.get('Content-Type');
      if (ct) headers.set('Content-Type', ct);
      headers.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      );
      headers.set('Accept', 'application/json, text/event-stream, */*');
      headers.set('Accept-Language', 'en-US,en;q=0.9,fa;q=0.8');
      headers.set('Referer', t.origin + '/');
      headers.set('Origin', t.origin);

      const xApiKey = request.headers.get('x-api-key');
      if (xApiKey) headers.set('x-api-key', xApiKey);
      // سایر هدرهای سفارشی x-* را فوروارد کن، به جز X-Proxy-Token
      // که مصرف داخلی دارد و نباید به مقصد درز کند.
      for (const [k, v] of request.headers.entries()) {
        const lk = k.toLowerCase();
        if (lk.startsWith('x-') && lk !== 'x-proxy-token' && !headers.has(k)) headers.set(k, v);
      }

      const init = { method: request.method, headers, redirect: 'follow' };
      if (request.method === 'POST') init.body = await request.arrayBuffer();

      let resp;
      try {
        resp = await fetch(t.toString(), init);
      } catch (e) {
        return json({ error: 'upstream fetch failed: ' + e.message }, 502);
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

      const outHeaders = new Headers(resp.headers);
      for (const [k, v] of Object.entries(CORS)) outHeaders.set(k, v);
      [
        'content-encoding',
        'content-length',
        'transfer-encoding',
        'connection',
        'content-security-policy',
        'content-security-policy-report-only',
      ].forEach((h) => outHeaders.delete(h));
      return new Response(resp.body, { status: resp.status, headers: outHeaders });
    } catch (e) {
      return json({ error: 'worker error: ' + ((e && e.message) || e) }, 500);
    }
  },
};
