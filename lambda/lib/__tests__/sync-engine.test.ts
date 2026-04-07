/**
 * sync-engine unit tests
 *
 * Uses in-memory mocks for both SQLite and Supabase so tests run instantly
 * without network or native modules.
 */

import { queueMutation, syncQueue, handleConflict, pullLatest } from '../sync/sync-engine';
import type { MutationRecord } from '../sync/sync-db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUUID() {
  return crypto.randomUUID();
}

// ─── SQLite mock ──────────────────────────────────────────────────────────────

/** Simple in-memory store that mimics the mutation_queue table. */
function makeMockDb(initialRows: MutationRecord[] = []) {
  const rows: MutationRecord[] = [...initialRows];

  const db = {
    _rows: rows,

    runAsync: jest.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('INSERT INTO mutation_queue')) {
        rows.push({
          id: params[0] as string,
          table_name: params[1] as string,
          operation: params[2] as MutationRecord['operation'],
          entity_id: params[3] as string,
          payload: params[4] as string,
          local_version: params[5] as number,
          status: 'pending',
          created_at: params[6] as string,
          synced_at: null,
          server_version: null,
          error: null,
        });
      } else if (sql.includes("SET status = 'syncing'")) {
        const id = params[0] as string;
        const r = rows.find((x) => x.id === id);
        if (r) r.status = 'syncing';
      } else if (sql.includes("SET status = 'synced'")) {
        const [syncedAt, serverVersion, id] = params as [string, number, string];
        const r = rows.find((x) => x.id === id);
        if (r) { r.status = 'synced'; r.synced_at = syncedAt; r.server_version = serverVersion; r.error = null; }
      } else if (sql.includes("SET status = 'conflict'")) {
        const [error, id] = params as [string, string];
        const r = rows.find((x) => x.id === id);
        if (r) { r.status = 'conflict'; r.error = error; }
      } else if (sql.includes("SET status = 'pending', error")) {
        const [error, id] = params as [string, string];
        const r = rows.find((x) => x.id === id);
        if (r) { r.status = 'pending'; r.error = error; }
      } else if (sql.includes('DELETE FROM mutation_queue')) {
        const [table, entityId] = params as [string, string];
        const keep = rows.filter((r) => !(r.table_name === table && r.entity_id === entityId && ['pending','syncing'].includes(r.status)));
        rows.length = 0;
        rows.push(...keep);
      }
    }),

    getFirstAsync: jest.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('MAX(local_version)')) {
        const [table, entityId] = params as [string, string];
        const versions = rows
          .filter((r) => r.table_name === table && r.entity_id === entityId)
          .map((r) => r.local_version);
        return { v: versions.length ? Math.max(...versions) : null };
      }
      if (sql.includes('COUNT(*) as count')) {
        const count = rows.filter((r) => ['pending','syncing','conflict'].includes(r.status)).length;
        return { count };
      }
      if (sql.includes('COUNT(*) as n')) {
        const [table, entityId] = params as [string, string];
        const n = rows.filter(
          (r) => r.table_name === table && r.entity_id === entityId && ['pending','syncing'].includes(r.status)
        ).length;
        return { n };
      }
      return null;
    }),

    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes("status = 'pending'")) {
        return rows.filter((r) => r.status === 'pending').sort(
          (a, b) => a.created_at.localeCompare(b.created_at)
        );
      }
      return [];
    }),
  };

  return db as unknown as import('expo-sqlite').SQLiteDatabase & { _rows: MutationRecord[] };
}

// ─── Supabase mock ────────────────────────────────────────────────────────────

function makeSuccessSupabase(returnData: Record<string, unknown> = {}) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { server_version: 1, ...returnData }, error: null }),
    // for pullLatest which uses select without maybeSingle
    then: undefined as any,
  };

  // Allow the chain to resolve when awaited at the top level (for pullLatest)
  (chain as any)[Symbol.toStringTag] = 'Promise';

  const supabase = {
    from: jest.fn(() => ({
      ...chain,
      // pullLatest calls .select('*').eq().order() then awaits the whole thing
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [returnData], error: null }),
        })),
        maybeSingle: jest.fn().mockResolvedValue({ data: { server_version: 1, ...returnData }, error: null }),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: { server_version: 1 }, error: null }),
        })),
      })),
    })),
  };
  return supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
}

function makeNetworkErrorSupabase() {
  const supabase = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        maybeSingle: jest.fn().mockRejectedValue(new Error('Network request failed')),
        eq: jest.fn(() => ({
          order: jest.fn().mockRejectedValue(new Error('Network request failed')),
        })),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          maybeSingle: jest.fn().mockRejectedValue(new Error('Network request failed')),
        })),
      })),
    })),
  };
  return supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
}

function makeRlsErrorSupabase() {
  const supabase = {
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'new row violates row-level security policy' },
          }),
        })),
      })),
    })),
  };
  return supabase as unknown as import('@supabase/supabase-js').SupabaseClient;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('queueMutation', () => {
  it('adds a pending mutation to the queue and returns a UUID', async () => {
    const db = makeMockDb();
    const entityId = makeUUID();

    const mutationId = await queueMutation(db, 'fact_user_workout', 'CREATE', entityId, {
      user_workout_id: entityId,
      user_id: 'user-abc',
    });

    expect(mutationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(db._rows).toHaveLength(1);
    expect(db._rows[0]).toMatchObject({
      id: mutationId,
      table_name: 'fact_user_workout',
      operation: 'CREATE',
      entity_id: entityId,
      local_version: 1,
      status: 'pending',
    });
  });

  it('increments local_version for sequential mutations on the same entity', async () => {
    const db = makeMockDb();
    const entityId = makeUUID();

    await queueMutation(db, 'fact_user_workout', 'CREATE', entityId, { user_workout_id: entityId });
    await queueMutation(db, 'fact_user_workout', 'UPDATE', entityId, { user_workout_id: entityId, notes: 'updated' });

    expect(db._rows[0].local_version).toBe(1);
    expect(db._rows[1].local_version).toBe(2);
  });

  it('assigns independent versions to different entities', async () => {
    const db = makeMockDb();
    const idA = makeUUID();
    const idB = makeUUID();

    await queueMutation(db, 'fact_user_workout', 'CREATE', idA, { user_workout_id: idA });
    await queueMutation(db, 'fact_user_workout', 'CREATE', idB, { user_workout_id: idB });

    expect(db._rows[0].local_version).toBe(1);
    expect(db._rows[1].local_version).toBe(1); // independent counter
  });
});

describe('syncQueue', () => {
  it('syncs all pending mutations and marks them synced', async () => {
    const entityId = makeUUID();
    const db = makeMockDb([
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'CREATE',
        entity_id: entityId, payload: JSON.stringify({ user_workout_id: entityId }),
        local_version: 1, status: 'pending', created_at: new Date().toISOString(),
        synced_at: null, server_version: null, error: null,
      },
    ]);

    const result = await syncQueue(db, makeSuccessSupabase());

    expect(result.synced).toBe(1);
    expect(result.errors).toBe(0);
    expect(db._rows[0].status).toBe('synced');
    expect(db._rows[0].server_version).toBe(1);
  });

  it('syncs two mutations on the same entity in queue order', async () => {
    const entityId = makeUUID();
    const now = Date.now();
    const db = makeMockDb([
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'CREATE',
        entity_id: entityId, payload: '{}', local_version: 1, status: 'pending',
        created_at: new Date(now).toISOString(),
        synced_at: null, server_version: null, error: null,
      },
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'UPDATE',
        entity_id: entityId, payload: '{"notes":"done"}', local_version: 2, status: 'pending',
        created_at: new Date(now + 1).toISOString(),
        synced_at: null, server_version: null, error: null,
      },
    ]);

    const result = await syncQueue(db, makeSuccessSupabase());

    expect(result.synced).toBe(2);
    expect(db._rows.every((r) => r.status === 'synced')).toBe(true);
  });

  it('leaves transient network errors as pending for retry', async () => {
    const entityId = makeUUID();
    const db = makeMockDb([
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'CREATE',
        entity_id: entityId, payload: '{}', local_version: 1, status: 'pending',
        created_at: new Date().toISOString(),
        synced_at: null, server_version: null, error: null,
      },
    ]);

    const result = await syncQueue(db, makeNetworkErrorSupabase());

    expect(result.errors).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(db._rows[0].status).toBe('pending'); // still pending — will retry
    expect(db._rows[0].error).toContain('Network request failed');
  });

  it('marks RLS violations as conflict (permanent)', async () => {
    const entityId = makeUUID();
    const db = makeMockDb([
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'CREATE',
        entity_id: entityId, payload: '{}', local_version: 1, status: 'pending',
        created_at: new Date().toISOString(),
        synced_at: null, server_version: null, error: null,
      },
    ]);

    const result = await syncQueue(db, makeRlsErrorSupabase());

    expect(result.conflicts).toBe(1);
    expect(db._rows[0].status).toBe('conflict');
  });

  it('returns 0 synced when queue is empty', async () => {
    const db = makeMockDb([]);
    const result = await syncQueue(db, makeSuccessSupabase());
    expect(result).toEqual({ synced: 0, conflicts: 0, errors: 0 });
  });
});

describe('handleConflict', () => {
  it('always returns local_wins (current strategy)', () => {
    const payload = { notes: 'local' };
    expect(handleConflict(1, 5, payload)).toEqual({
      shouldApply: true,
      resolution: 'local_wins',
    });
    expect(handleConflict(3, 1, payload)).toEqual({
      shouldApply: true,
      resolution: 'local_wins',
    });
    expect(handleConflict(2, 2, payload)).toEqual({
      shouldApply: true,
      resolution: 'local_wins',
    });
  });
});

describe('pullLatest', () => {
  it('calls writeToLocal with server rows that have no pending mutations', async () => {
    const safeId = makeUUID();
    const blockedId = makeUUID();

    // blockedId has a pending mutation → should NOT be overwritten
    const db = makeMockDb([
      {
        id: makeUUID(), table_name: 'fact_user_workout', operation: 'UPDATE',
        entity_id: blockedId, payload: '{}', local_version: 1, status: 'pending',
        created_at: new Date().toISOString(),
        synced_at: null, server_version: null, error: null,
      },
    ]);

    const serverRows = [
      { id: safeId, user_id: 'user-abc', notes: 'safe' },
      { id: blockedId, user_id: 'user-abc', notes: 'blocked' },
    ];

    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: serverRows, error: null }),
          })),
        })),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const writeToLocal = jest.fn().mockResolvedValue(undefined);
    const result = await pullLatest(db, supabase, 'fact_user_workout', 'user-abc', writeToLocal);

    // Returns all server rows for React Query cache
    expect(result).toHaveLength(2);

    // Only writes the safe row — blocked row skipped
    expect(writeToLocal).toHaveBeenCalledWith([serverRows[0]]);
  });

  it('returns empty array when server has no rows', async () => {
    const db = makeMockDb();
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const writeToLocal = jest.fn();
    const result = await pullLatest(db, supabase, 'fact_user_workout', 'user-abc', writeToLocal);

    expect(result).toHaveLength(0);
    expect(writeToLocal).not.toHaveBeenCalled();
  });

  it('throws when Supabase returns an error', async () => {
    const db = makeMockDb();
    const supabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }),
          })),
        })),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    await expect(
      pullLatest(db, supabase, 'fact_user_workout', 'user-abc', jest.fn())
    ).rejects.toThrow('permission denied');
  });
});
