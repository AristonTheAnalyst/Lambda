import type { WorkoutSet } from '@/lib/offline/setStore';

export function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

export function parseValues(str: string): number[] {
  return str.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

export function toProperCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type GroupedSetGroup = { exId: string; sets: WorkoutSet[]; startIdx: number };

export function buildGroupedSets(sets: WorkoutSet[]): GroupedSetGroup[] {
  const groupMap = new Map<string, GroupedSetGroup>();
  const order: string[] = [];
  for (const s of sets) {
    if (!groupMap.has(s.custom_exercise_id)) {
      groupMap.set(s.custom_exercise_id, { exId: s.custom_exercise_id, sets: [], startIdx: 0 });
      order.push(s.custom_exercise_id);
    }
    groupMap.get(s.custom_exercise_id)!.sets.push(s);
  }
  return order.map((id) => groupMap.get(id)!);
}
