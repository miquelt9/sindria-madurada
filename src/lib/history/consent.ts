const DEVICE_ID_KEY = 'sindria.deviceId';
const SHARE_CONSENT_KEY = 'sindria.shareConsent';
export const SYNC_QUEUE_STORAGE_KEY = 'sindria.syncQueue';

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function safeGet(key: string): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or quota — ignore.
  }
}

function safeRemove(key: string): void {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Stable anonymous id for this browser profile. Created on first use. */
export function getDeviceId(): string {
  const existing = safeGet(DEVICE_ID_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }
  const created = crypto.randomUUID();
  safeSet(DEVICE_ID_KEY, created);
  return created;
}

/** Share-to-improve consent. Default is off (missing key is not consent). */
export function hasShareConsent(): boolean {
  return safeGet(SHARE_CONSENT_KEY) === 'true';
}

export function setShareConsent(enabled: boolean): void {
  safeSet(SHARE_CONSENT_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    safeRemove(SYNC_QUEUE_STORAGE_KEY);
  }
}
