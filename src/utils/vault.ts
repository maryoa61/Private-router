/**
 * Storage layer for sensitive data (services + their API keys).
 *
 * Two modes:
 *   - Unlocked: plaintext JSON under STORAGE_KEY_SERVICES (legacy behaviour).
 *   - Locked:   AES-GCM blob under STORAGE_KEY_VAULT, and the plaintext key
 *               is removed from localStorage entirely.
 *
 * The session key lives only in React state in App.tsx. Closing the tab loses
 * it, which is the point: reopening the app requires the passphrase again.
 */

import { AIService } from '../types';
import {
  EncryptedBlob,
  decryptJSON,
  deriveKey,
  deriveKeyForBlob,
  encryptJSON,
  isEncryptedBlob,
  newSalt,
} from './crypto';

export const STORAGE_KEY_SERVICES = 'combo_router_services_v1';
export const STORAGE_KEY_VAULT = 'combo_router_vault_v1';

interface VaultPayload {
  services: AIService[];
}

/** True when an encrypted vault exists and the app must ask for a passphrase. */
export function vaultExists(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VAULT);
    if (!raw) return false;
    return isEncryptedBlob(JSON.parse(raw));
  } catch {
    return false;
  }
}

function readVaultBlob(): EncryptedBlob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VAULT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isEncryptedBlob(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Attempts to unlock the vault. Throws on a wrong passphrase. */
export async function unlockVault(
  passphrase: string
): Promise<{ key: CryptoKey; salt: Uint8Array; services: AIService[] }> {
  const blob = readVaultBlob();
  if (!blob) throw new Error('هیچ داده‌ی رمزگذاری‌شده‌ای یافت نشد.');
  const key = await deriveKeyForBlob(passphrase, blob);
  const payload = await decryptJSON<VaultPayload>(blob, key);
  const salt = Uint8Array.from(atob(blob.salt), (c) => c.charCodeAt(0));
  return { key, salt, services: Array.isArray(payload.services) ? payload.services : [] };
}

/** Turns on the lock: encrypts current services and wipes the plaintext copy. */
export async function enableVault(
  passphrase: string,
  services: AIService[]
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  if (!passphrase.trim()) throw new Error('رمز عبور نمی‌تواند خالی باشد.');
  const salt = newSalt();
  const key = await deriveKey(passphrase, salt);
  const blob = await encryptJSON({ services } satisfies VaultPayload, key, salt);
  localStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify(blob));
  localStorage.removeItem(STORAGE_KEY_SERVICES);
  return { key, salt };
}

/** Turns off the lock: writes services back as plaintext and drops the vault. */
export function disableVault(services: AIService[]): void {
  localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
  localStorage.removeItem(STORAGE_KEY_VAULT);
}

/**
 * Persists services in whichever mode is active. When locked, this re-encrypts
 * with a brand new IV on every write — required for AES-GCM safety.
 */
export async function persistServices(
  services: AIService[],
  session: { key: CryptoKey; salt: Uint8Array } | null
): Promise<void> {
  try {
    if (session) {
      const blob = await encryptJSON({ services } satisfies VaultPayload, session.key, session.salt);
      localStorage.setItem(STORAGE_KEY_VAULT, JSON.stringify(blob));
      localStorage.removeItem(STORAGE_KEY_SERVICES);
    } else {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(services));
    }
  } catch (e) {
    console.error('Failed to persist services:', e);
  }
}

/** Loads plaintext services. Only meaningful when the vault is off. */
export function loadPlainServices(fallback: AIService[] = []): AIService[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SERVICES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read services from localStorage:', e);
  }
  return fallback;
}

/** Encrypts an arbitrary payload with the active session key (used by Gist sync). */
export async function encryptWithSession(
  value: unknown,
  session: { key: CryptoKey; salt: Uint8Array }
): Promise<EncryptedBlob> {
  return encryptJSON(value, session.key, session.salt);
}

export { decryptJSON, isEncryptedBlob };
export type { EncryptedBlob };
