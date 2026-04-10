import type { WorkoutSet } from '@/lib/offline/setStore';

export function formatValues(arr: number[] | null): string {
  if (!arr || arr.length === 0) return '—';
  return arr.join(', ');
}

export function parseValues(str: string): number[] {
  return str.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => !isNaN(n));
}

export type GroupedSetGroup = { exId: string; sets: WorkoutSet[]; startIdx: number };

export function buildGroupedSets(sets: WorkoutSet[]): GroupedSetGroup[] {
  const groups: GroupedSetGroup[] = [];
  const exCounts: Record<string, number> = {};
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exId === s.custom_exercise_id) {
      last.sets.push(s);
    } else {
      groups.push({ exId: s.custom_exercise_id, sets: [s], startIdx: exCounts[s.custom_exercise_id] ?? 0 });
    }
    exCounts[s.custom_exercise_id] = (exCounts[s.custom_exercise_id] ?? 0) + 1;
  }
  return groups;
}
