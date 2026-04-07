import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import supabase from '@/lib/supabase';
import { useNetwork } from '@/hooks/useNetwork';
import {
  queueMutation as _queueMutation,
  syncQueue,
  pullLatest as _pullLatest,
  type SyncResult,
} from './sync-engine';
import { getPendingCount, resetConflictedMutations } from './sync-db';

// ─── Zustand sync state ───────────────────────────────────────────────────────

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  lastSyncResult: SyncResult | null;
  lastError: string | null;
  syncRequested: boolean;

  // Actions (called internally by useSyncEngine)
  _setIsSyncing: (v: boolean) => void;
  _setPendingCount: (n: number) => void;
  _setLastSyncAt: (d: Date) => void;
  _setLastSyncResult: (r: SyncResult) => void;
  _setLastError: (e: string | null) => void;
  _clearSyncRequested: () => void;

  /**
   * Signal the sync engine to run a sync pass.
   * Safe to call from anywhere — stores, screens, background code.
   * The mounted useSyncEngine hook will pick this up and call triggerSync.
   */
  requestSync: () => void;
}

/**
 * Global sync state — readable from any component without needing the hook.
 *
 * Usage:
 *   const { isSyncing, pendingCount } = useSyncStore();
 *
 * To request a sync from a store or non-hook context:
 *   useSyncStore.getState().requestSync();
 */
export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastSyncResult: null,
  lastError: null,
  syncRequested: false,

  _setIsSyncing: (v) => set({ isSyncing: v }),
  _setPendingCount: (n) => set({ pendingCount: n }),
  _setLastSyncAt: (d) => set({ lastSyncAt: d }),
  _setLastSyncResult: (r) => set({ lastSyncResult: r }),
  _setLastError: (e) => set({ lastError: e }),
  _clearSyncRequested: () => set({ syncRequested: false }),
  requestSync: () => set({ syncRequested: true }),
}));

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useSyncEngine — primary interface for all sync operations.
 *
 * Mount once near the root (e.g. inside the tabs layout). The hook:
 *   - Auto-syncs on mount, app foreground, and network reconnect
 *   - Exposes `queueMutation` for stores to enqueue writes
 *   - Exposes `triggerSync` for screens to request an immediate sync
 *   - Updates Zustand state so any component can read sync status
 *
 * Example:
 *   const { queueMutation } = useSyncEngine();
 *   await queueMutation('fact_user_workout', 'CREATE', workoutId, payload);
 */
export function useSyncEngine() {
  const db = useSQLiteContext();
  const { isConnected, justReconnected, clearJustReconnected } = useNetwork();
  const queryClient = useQueryClient();
  const syncLock = useRef(false);

  const {
    _setIsSyncing,
    _setPendingCount,
    _setLastSyncAt,
    _setLastSyncResult,
    _setLastError,
    _clearSyncRequested,
    syncRequested,
  } = useSyncStore();

  // ── Pending count refresh ───────────────────────────────────────────────────

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount(db);
    _setPendingCount(count);
  }, [db, _setPendingCount]);

  // ── Core sync trigger ───────────────────────────────────────────────────────

  const triggerSync = useCallback(async () => {
    if (syncLock.current || !isConnected) return;

    // Verify session is readable before touching the network.
    // If SecureStore is still locked (device just woke up), getSession() throws —
    // skip this cycle; the next foreground/reconnect event will retry.
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
    } catch {
      return;
    }

    syncLock.current = true;
    _setIsSyncing(true);
    _setLastError(null);

    try {
      const result = await syncQueue(db, supabase);

      // One extra pass: items enqueued while this run was in-flight get picked up
      // immediately rather than waiting for the next foreground/reconnect event.
      const remaining = await getPendingCount(db);
      if (remaining > 0) await syncQueue(db, supabase);

      _setLastSyncAt(new Date());
      _setLastSyncResult(result);

      if (result.conflicts > 0) {
        // Invalidate React Query cache — server state may differ from what we assumed
        queryClient.invalidateQueries();
      }
    } catch (err: unknown) {
      const msg = (err as any)?.message ?? 'Sync failed';
      _setLastError(msg);
      console.warn('[SyncEngine] Sync error:', msg);
    } finally {
      await refreshPendingCount();
      _setIsSyncing(false);
      syncLock.current = false;
    }
  }, [
    db,
    isConnected,
    queryClient,
    refreshPendingCount,
    _setIsSyncing,
    _setLastError,
    _setLastSyncAt,
    _setLastSyncResult,
  ]);

  // ── Auto-sync triggers ──────────────────────────────────────────────────────

  // Sync on network reconnect
  useEffect(() => {
    if (justReconnected) {
      clearJustReconnected();
      triggerSync();
    }
  }, [justReconnected, clearJustReconnected, triggerSync]);

  // Sync when app comes to foreground
  useEffect(() => {
    const handle = (next: AppStateStatus) => {
      if (next === 'active') triggerSync();
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [triggerSync]);

  // Sync on mount — reset any stuck 'conflict' mutations first, then sync
  useEffect(() => {
    (async () => {
      await resetConflictedMutations(db);
      await refreshPendingCount();
      triggerSync();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when any store calls useSyncStore.getState().requestSync()
  useEffect(() => {
    if (syncRequested) {
      _clearSyncRequested();
      triggerSync();
    }
  }, [syncRequested, _clearSyncRequested, triggerSync]);

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Queues a mutation and immediately attempts a background sync.
   * Returns the mutation UUID for tracking.
   */
  const queueMutation = useCallback(
    async (
      table: string,
      operation: 'CREATE' | 'UPDATE' | 'DELETE',
      entityId: string,
      payload: Record<string, unknown>
    ): Promise<string> => {
      const mutationId = await _queueMutation(db, table, operation, entityId, payload);
      await refreshPendingCount();
      triggerSync(); // fire-and-forget
      return mutationId;
    },
    [db, refreshPendingCount, triggerSync]
  );

  /**
   * Fetches server state for a table, writing safe rows to SQLite.
   * Rows with pending local mutations are NOT overwritten.
   */
  const pullLatest = useCallback(
    <T extends Record<string, unknown>>(
      table: string,
      userId: string,
      getEntityId: (row: T) => string,
      writeToLocal: (rows: T[]) => Promise<void>
    ) => _pullLatest(db, supabase, table, userId, getEntityId, writeToLocal),
    [db]
  );

  return { queueMutation, pullLatest, triggerSync };
}
