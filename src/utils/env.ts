/**
 * Build-time configuration, injected by Vite from environment variables.
 *
 * ⚠️  IMPORTANT / هشدار مهم
 * Anything named VITE_* is inlined into the JavaScript bundle that ships to the
 * browser. Storing a value here keeps it out of the git repository, but it does
 * NOT keep it secret from anyone who opens the deployed site and reads the
 * bundle or the network tab.
 *
 * Therefore:
 *   - VITE_CORS_PROXY_URL  → fine. The URL is visible in every request anyway.
 *   - VITE_WORKER_PROXY_TOKEN → OPTIONAL and only appropriate for a private /
 *     internal deployment. For a public site, leave it empty and let each user
 *     paste their own token in Settings → Security.
 *
 * The real server-side secret is PROXY_TOKEN inside the Cloudflare Worker,
 * which is a Worker secret and never reaches the browser bundle.
 */

const raw = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const env = (import.meta as any).env ?? {};

/** Default CORS proxy URL (e.g. https://<worker>.workers.dev/?url={url}) */
export const ENV_CORS_PROXY: string = raw(env.VITE_CORS_PROXY_URL);

/** Optional pre-baked worker token. Empty on public builds — see warning above. */
export const ENV_WORKER_TOKEN: string = raw(env.VITE_WORKER_PROXY_TOKEN);

/** Admin area password. Also public in the bundle — see AdminLogin.tsx. */
export const ENV_ADMIN_TOKEN: string = raw(env.VITE_ADMIN_TOKEN);
