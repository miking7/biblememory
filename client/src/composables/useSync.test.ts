import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../sync', () => ({
  syncNow: vi.fn(),
}));

import { useSync } from './useSync';
import { syncNow } from '../sync';

// Sync-health state machine regression tests (see previous-work/074): the
// health verdict must only change on real evidence — an offline signal, a
// completed sync, or a failed sync. Flipping healthy on navigator.onLine
// alone is what used to pop the stale "currently offline" toast on reconnect.
//
// These run in node: navigator is stubbed, syncNow is mocked, and only
// performSync (no scheduler) is driven, so no timers, DOM, or IndexedDB
// are touched.

const syncNowMock = vi.mocked(syncNow);

// Mutable navigator stub so tests can flip connectivity mid-flight
let nav: { onLine: boolean };

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Settle fire-and-forget performSync chains. Everything in these tests
// resolves via microtasks (mocked syncNow, mocked callbacks), so a few
// microtask turns suffice — no timers involved.
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  nav = { onLine: true };
  vi.stubGlobal('navigator', nav);
  syncNowMock.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useSync health state machine', () => {
  it('settles offline without attempting a request when navigator reports offline', async () => {
    nav.onLine = false;
    const sync = useSync();

    await sync.performSync();

    expect(sync.syncHealth.value).toBe('offline');
    expect(sync.hasSyncIssues.value).toBe(true);
    expect(syncNowMock).not.toHaveBeenCalled();
  });

  it('keeps the offline verdict while the reconnect sync is in flight (no premature healthy)', async () => {
    // Go offline first
    nav.onLine = false;
    const sync = useSync();
    await sync.performSync();
    expect(sync.syncHealth.value).toBe('offline');

    // Connectivity returns, sync starts but has not completed yet
    nav.onLine = true;
    const gate = deferred();
    syncNowMock.mockReturnValue(gate.promise);
    const inFlight = sync.performSync();

    expect(sync.syncHealth.value).toBe('offline'); // still unproven
    expect(sync.syncStatus.value).toBe('syncing');
    expect(sync.hasSyncIssues.value).toBe(true);

    // Only a completed sync flips the verdict
    gate.resolve();
    await inFlight;

    expect(sync.syncHealth.value).toBe('synced');
    expect(sync.syncStatus.value).toBe('synced');
    expect(sync.hasSyncIssues.value).toBe(false);
  });

  it('settles error when a sync fails while online', async () => {
    const sync = useSync();
    syncNowMock.mockRejectedValue(new Error('Push failed: 500'));

    await sync.performSync();

    expect(sync.syncHealth.value).toBe('error');
    expect(sync.hasSyncIssues.value).toBe(true);
    expect(sync.lastSyncError.value).toBe('Push failed: 500');
  });

  it('settles offline (not error) when connectivity is lost mid-sync', async () => {
    const sync = useSync();
    const gate = deferred();
    syncNowMock.mockReturnValue(gate.promise);

    const inFlight = sync.performSync();
    nav.onLine = false;
    gate.reject(new Error('Failed to fetch'));
    await inFlight;

    expect(sync.syncHealth.value).toBe('offline');
  });

  it('clears the last error on a successful sync', async () => {
    const sync = useSync();
    syncNowMock.mockRejectedValueOnce(new Error('boom'));
    await sync.performSync();
    expect(sync.lastSyncError.value).toBe('boom');

    syncNowMock.mockResolvedValueOnce(undefined);
    await sync.performSync();

    expect(sync.syncHealth.value).toBe('synced');
    expect(sync.lastSyncError.value).toBeNull();
  });

  it('does not settle synced when connectivity was lost during the sync (stale success)', async () => {
    const sync = useSync();
    const gate = deferred();
    syncNowMock.mockReturnValue(gate.promise);

    const inFlight = sync.performSync();
    nav.onLine = false; // authoritative offline signal lands mid-sync
    gate.resolve();     // the request itself still succeeded
    await inFlight;

    expect(sync.syncHealth.value).toBe('offline');
  });

  it('shares a single pass between triggers arriving within the freshness window', async () => {
    const sync = useSync();
    const gate = deferred();
    syncNowMock.mockReturnValue(gate.promise);

    // Paired triggers (e.g. online + visibilitychange on mobile wake) land
    // in the same instant: one sync, one reload — not two
    const first = sync.performSync();
    const second = sync.performSync();
    expect(second).toBe(first);

    gate.resolve();
    await first;

    expect(syncNowMock).toHaveBeenCalledTimes(1);
    expect(sync.syncHealth.value).toBe('synced');
  });

  it('reruns a fresh pass for a late trigger and settles only from the final pass (doomed reconnect sync)', async () => {
    vi.useFakeTimers();
    try {
      const sync = useSync();

      // Establish the offline verdict first
      nav.onLine = false;
      await sync.performSync();
      expect(sync.syncHealth.value).toBe('offline');

      // A sync is in flight when connectivity returns; the request predates
      // the reconnect and is doomed to time out
      nav.onLine = true;
      const doomed = deferred();
      const fresh = deferred();
      syncNowMock
        .mockReturnValueOnce(doomed.promise)
        .mockReturnValueOnce(fresh.promise);

      const chain = sync.performSync();

      // The 'online' trigger lands 8s into the doomed pass → trailing rerun
      vi.advanceTimersByTime(8000);
      expect(sync.performSync()).toBe(chain);

      // The superseded pass fails, but must NOT settle 'error'
      doomed.reject(new Error('Request timed out after 10s'));
      await flushMicrotasks();
      expect(sync.syncHealth.value).toBe('offline'); // unchanged
      expect(syncNowMock).toHaveBeenCalledTimes(2);  // rerun already started

      // Only the fresh verification pass settles the verdict
      fresh.resolve();
      await chain;
      expect(sync.syncHealth.value).toBe('synced');
      expect(sync.lastSyncError.value).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('useSync scheduler wiring', () => {
  it('runs the initial sync, invokes the reload callback, and reacts to connectivity events', async () => {
    // scheduleSync registers an interval and window/document listeners;
    // fake timers keep the interval inert (it is never advanced) and the
    // listener stubs let the test fire connectivity transitions directly.
    vi.useFakeTimers();
    const windowListeners: Record<string, () => void> = {};
    vi.stubGlobal('window', {
      addEventListener: (event: string, handler: () => void) => {
        windowListeners[event] = handler;
      },
    });
    vi.stubGlobal('document', { addEventListener: vi.fn() });

    const sync = useSync();
    syncNowMock.mockResolvedValue(undefined);
    const onComplete = vi.fn().mockResolvedValue(undefined);

    sync.scheduleSync(onComplete);
    await flushMicrotasks();
    expect(sync.syncHealth.value).toBe('synced');
    expect(syncNowMock).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // 'offline' is authoritative: verdict flips immediately, no sync attempt
    windowListeners['offline']();
    expect(sync.syncHealth.value).toBe('offline');
    expect(syncNowMock).toHaveBeenCalledTimes(1);

    // 'online' is only a hint: it triggers a verification sync, and the
    // verdict flips once that sync completes
    windowListeners['online']();
    expect(sync.syncStatus.value).toBe('syncing');
    expect(sync.syncHealth.value).toBe('offline');
    await flushMicrotasks();
    expect(sync.syncHealth.value).toBe('synced');
    expect(syncNowMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
