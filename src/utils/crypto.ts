/**
 * Real AES-GCM encryption on top of the WebCrypto API.
 *
 * Design notes:
 *  - Key derivation is PBKDF2-SHA256 with a random 16-byte salt.
 *  - Each encryption uses a fresh random 12-byte IV. Reusing an IV with the
 *    same key breaks GCM completely, so never cache or hardcode it.
 *  - The passphrase itself is never stored anywhere. Only the derived CryptoKey
 *    lives in memory for the session, and it is created as non-extractable.
 *  - A wrong passphrase makes decrypt() throw, because GCM authenticates the
 *    ciphertext. That is how unlock verification works — no password hash needed.
 */

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export const VAULT_FORMAT = 'PR-AESGCM-1';

export interface EncryptedBlob {
  format: typeof VAULT_FORMAT;
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  data: string; // base64 ciphertext + GCM tag
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  // Chunked to avoid blowing the argument limit on large payloads.
  const CHUNK = 0x8000;
  for (let i = 0; i < arr.length; i += CHUNK) {
    bin += String.fromCharCode(...arr.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function assertCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'WebCrypto در دسترس نیست. رمزگذاری فقط روی HTTPS یا localhost کار می‌کند.'
    );
  }
  return subtle;
}

/** Derives a non-extractable AES-GCM key from a passphrase + salt. */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const subtle = assertCrypto();
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable: the raw key bytes can never be read back out
    ['encrypt', 'decrypt']
  );
}

/** Creates a fresh random salt for a new vault. */
export function newSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/** Encrypts an arbitrary JSON-serialisable value. */
export async function encryptJSON(
  value: unknown,
  key: CryptoKey,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<EncryptedBlob> {
  const subtle = assertCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext);
  return {
    format: VAULT_FORMAT,
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ct),
  };
}

/** Decrypts a blob produced by encryptJSON. Throws if the key is wrong. */
export async function decryptJSON<T = unknown>(blob: EncryptedBlob, key: CryptoKey): Promise<T> {
  const subtle = assertCrypto();
  if (blob?.format !== VAULT_FORMAT) {
    throw new Error('فرمت داده‌ی رمزگذاری‌شده ناشناخته است.');
  }
  const iv = fromBase64(blob.iv);
  const data = fromBase64(blob.data);
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource);
  } catch {
    // GCM tag mismatch — wrong passphrase, or the ciphertext was tampered with.
    throw new Error('رمز عبور اشتباه است یا داده آسیب دیده.');
  }
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** Convenience: derive a key from a stored blob's own salt/iterations. */
export async function deriveKeyForBlob(passphrase: string, blob: EncryptedBlob): Promise<CryptoKey> {
  return deriveKey(passphrase, fromBase64(blob.salt), blob.iterations || PBKDF2_ITERATIONS);
}

export function isEncryptedBlob(v: unknown): v is EncryptedBlob {
  return Boolean(v && typeof v === 'object' && (v as any).format === VAULT_FORMAT);
}

export { PBKDF2_ITERATIONS };
