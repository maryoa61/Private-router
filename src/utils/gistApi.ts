/**
 * Real GitHub Gist sync.
 *
 * api.github.com sends permissive CORS headers, so this works directly from the
 * browser with no proxy. The token needs only the `gist` scope (classic PAT) or
 * read+write Gists permission (fine-grained PAT).
 *
 * Gists are NOT private in the "secret" sense — a secret gist is merely
 * unlisted, and anyone with the URL can read it. This build has no vault/
 * encryption layer, so the payload always goes up as plaintext; the caller
 * warns about that in the UI before pushing. The `encrypted: true` branch is
 * kept only so a gist produced by an older, encrypted-vault build of this app
 * is recognised (and reported as unreadable here) instead of crashing on an
 * unexpected shape.
 */

import { AIService, AppSettings, ComboItem, Conversation, PromptTemplate } from '../types';

const GIST_API = 'https://api.github.com';
const GIST_FILENAME = 'private-router-backup.json';
const GIST_DESCRIPTION = 'Private Router — synced configuration';

export interface SyncPayload {
  version: 2;
  exportedAt: string;
  settings: Omit<AppSettings, 'gistToken'>;
  services: AIService[];
  combos: ComboItem[];
  conversations: Conversation[];
  promptTemplates: PromptTemplate[];
}

/** What actually gets written to the gist: always plaintext in this build. */
export type GistDocument =
  | { encrypted: false; payload: SyncPayload }
  | { encrypted: true; blob: unknown; exportedAt: string };

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function readError(res: Response): Promise<string> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.message || '';
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401) return 'توکن GitHub نامعتبر یا منقضی است.';
  if (res.status === 403) return `دسترسی رد شد یا به سقف نرخ درخواست خوردی. ${detail}`.trim();
  if (res.status === 404) return 'Gist پیدا نشد. شناسه را بررسی کن یا مالک آن توکن نیستی.';
  if (res.status === 422) return `داده‌ی ارسالی پذیرفته نشد. ${detail}`.trim();
  return detail || `خطای HTTP ${res.status}`;
}

/** Verifies the token and returns the account login, for a "test connection" button. */
export async function verifyGistToken(token: string): Promise<{ login: string; scopes: string }> {
  if (!token.trim()) throw new Error('توکن وارد نشده است.');
  const res = await fetch(`${GIST_API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error(await readError(res));
  const user = await res.json();
  const scopes = res.headers.get('x-oauth-scopes') || '';
  return { login: user?.login ?? 'unknown', scopes };
}

/**
 * Pushes the document to GitHub. Creates a new secret gist when no id is given,
 * otherwise updates the existing one. Returns the gist id so the caller can save it.
 */
export async function pushToGist(
  token: string,
  gistId: string | undefined,
  doc: GistDocument
): Promise<{ gistId: string; htmlUrl: string }> {
  if (!token.trim()) throw new Error('ابتدا Personal Access Token را وارد کن.');

  const body = {
    description: GIST_DESCRIPTION,
    files: { [GIST_FILENAME]: { content: JSON.stringify(doc, null, 2) } },
  };

  const id = gistId?.trim();
  const res = await fetch(id ? `${GIST_API}/gists/${id}` : `${GIST_API}/gists`, {
    method: id ? 'PATCH' : 'POST',
    headers: headers(token),
    // `public: false` only applies on creation; a gist's visibility is immutable.
    body: JSON.stringify(id ? body : { ...body, public: false }),
  });

  if (!res.ok) throw new Error(await readError(res));
  const gist = await res.json();
  return { gistId: gist.id, htmlUrl: gist.html_url };
}

/** Pulls and parses the document from an existing gist. */
export async function pullFromGist(token: string, gistId: string): Promise<GistDocument> {
  if (!token.trim()) throw new Error('ابتدا Personal Access Token را وارد کن.');
  if (!gistId.trim()) throw new Error('شناسه‌ی Gist وارد نشده است.');

  const res = await fetch(`${GIST_API}/gists/${gistId.trim()}`, { headers: headers(token) });
  if (!res.ok) throw new Error(await readError(res));

  const gist = await res.json();
  const file = gist?.files?.[GIST_FILENAME];
  if (!file) {
    const names = Object.keys(gist?.files ?? {}).join(', ') || '—';
    throw new Error(`فایل ${GIST_FILENAME} در این Gist نیست. فایل‌های موجود: ${names}`);
  }

  // GitHub truncates inline content above ~1MB and exposes raw_url instead.
  let content: string = file.content ?? '';
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url);
    if (!rawRes.ok) throw new Error('دریافت محتوای کامل Gist ناموفق بود.');
    content = await rawRes.text();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('محتوای Gist یک JSON معتبر نیست.');
  }

  const doc = parsed as GistDocument;
  if (typeof (doc as any)?.encrypted !== 'boolean') {
    throw new Error('ساختار بکاپ ناشناخته است (کلید encrypted وجود ندارد).');
  }
  return doc;
}

export { GIST_FILENAME };
