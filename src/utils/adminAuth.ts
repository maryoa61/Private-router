/**
 * Admin gate hardening.
 *
 * Honesty first: VITE_ADMIN_TOKEN ships inside the public JS bundle, so this
 * can never be a real server-side authorization boundary — anyone who reads
 * the bundle can read the token. See AdminLogin.tsx / env.ts.
 *
 * What we *can* fix cheaply is the laziest bypass: previously a successful
 * login just wrote `localStorage.setItem('admin_auth', '1')`, so anyone with
 * the browser console — no knowledge of the token required — could grant
 * themselves admin by typing that single line. Now the stored flag is a
 * SHA-256 digest of the actual configured token, so flipping a flag to '1'
 * no longer works; forging it requires already knowing (or deriving from the
 * bundle) the real admin token, which is the same bar the login form itself
 * enforces. This does not add cryptographic security — it just removes the
 * one-line, zero-knowledge bypass.
 */

const STORAGE_KEY_ADMIN_AUTH = 'admin_auth_v2';

async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  const bytes = new TextEncoder().encode(input);
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Call after the password form accepts a matching token. */
export async function markAdminAuthenticated(expectedToken: string): Promise<void> {
  const hash = await sha256Hex(expectedToken);
  if (hash) localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, hash);
  // Clean up the old, trivially-spoofable flag if it's still around.
  localStorage.removeItem('admin_auth');
}

/** Re-validated against the currently configured token on every load. */
export async function isAdminAuthenticated(expectedToken: string): Promise<boolean> {
  if (!expectedToken) return false;
  const stored = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH);
  if (!stored) return false;
  const expectedHash = await sha256Hex(expectedToken);
  return Boolean(expectedHash) && stored === expectedHash;
}

export function clearAdminAuthenticated(): void {
  localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
  localStorage.removeItem('admin_auth');
}
