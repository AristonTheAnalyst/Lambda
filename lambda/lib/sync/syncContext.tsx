import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useNetwork } from '@/hooks/useNetwork';
import { getPendingCount } from './syncQueue';
import { processSyncQueue } from './syncEngine';
import supabase from '@/lib/supabase';

interface SyncContextValue {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext must be used inside SyncProvider');
  return ctx;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { isConnected, justReconnected, clearJustReconnected } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncLock = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount(db);
    setPendingCount(count);

    // TEMP: dump full queue
    const all = await db.getAllAsync('SELECT id, table_name, operation, status, local_id, depends_on_local_id, last_error FROM sync_queue ORDER BY id ASC');
    console.log('[SyncQueue dump]', JSON.stringify(all, null, 2));
  }, [db]);

  const triggerSync = useCallback(async () => {
    if (syncLock.current || !isConnected) return;

    // Guard: verify the session is readable before touching the network.
    // If SecureStore is still locked (device just woke up), getSession() may throw —
    // skip this cycle and let the next foreground/reconnect event retry.
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
    } catch {
      return;
    }

    syncLock.current = true;
    setIsSyncing(true);
    try {
      await processSyncQueue(db);
      setLastSyncAt(new Date());
    } catch (err) {
      console.warn('[SyncContext] Sync error:', err);
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, [db, isConnected, refreshPendingCount]);

  // Sync on reconnect
  useEffect(() => {
    if (justReconnected) {
      clearJustReconnected();
      triggerSync();
    }
  }, [justReconnected]);

  // Sync when app comes to foreground
  useEffect(() => {
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        triggerSync();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [triggerSync]);

  // Sync on mount
  useEffect(() => {
    refreshPendingCount();
    triggerSync();
  }, []);

  return (
    <SyncContext.Provider value={{ isSyncing, pendingCount, lastSyncAt, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}
