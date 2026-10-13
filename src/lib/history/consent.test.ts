// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYNC_QUEUE_STORAGE_KEY, getDeviceId, hasShareConsent, setShareConsent } from './consent';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('share consent', () => {
  it('treats a missing or non-true value as no consent', () => {
    expect(hasShareConsent()).toBe(false);
    localStorage.setItem('sindria.shareConsent', 'false');
    expect(hasShareConsent()).toBe(false);
    localStorage.setItem('sindria.shareConsent', 'TRUE');
    expect(hasShareConsent()).toBe(false);
    localStorage.setItem('sindria.shareConsent', '1');
    expect(hasShareConsent()).toBe(false);
  });

  it('accepts only the exact stored value true', () => {
    setShareConsent(true);
    expect(localStorage.getItem('sindria.shareConsent')).toBe('true');
    expect(hasShareConsent()).toBe(true);
  });

  it('stores false and drops the sync queue when consent is revoked', () => {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, '[{"kind":"scan"}]');
    setShareConsent(false);
    expect(localStorage.getItem('sindria.shareConsent')).toBe('false');
    expect(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)).toBeNull();
  });

  it('leaves a queued payload in place when consent is granted', () => {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, '[{"kind":"scan"}]');
    setShareConsent(true);
    expect(localStorage.getItem(SYNC_QUEUE_STORAGE_KEY)).toBe('[{"kind":"scan"}]');
  });

  it('does not throw when storage reads and writes fail', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage disabled');
      },
      setItem: () => {
        throw new Error('storage disabled');
      },
      removeItem: () => {
        throw new Error('storage disabled');
      },
    });

    expect(hasShareConsent()).toBe(false);
    expect(() => setShareConsent(true)).not.toThrow();
    expect(getDeviceId().length).toBeGreaterThan(0);
  });
});

describe('getDeviceId', () => {
  it('creates one id and reuses it', () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second).toBe(first);
    expect(localStorage.getItem('sindria.deviceId')).toBe(first);
  });

  it('replaces a blank stored id', () => {
    localStorage.setItem('sindria.deviceId', '');
    const created = getDeviceId();
    expect(created.length).toBeGreaterThan(0);
    expect(localStorage.getItem('sindria.deviceId')).toBe(created);
  });
});
