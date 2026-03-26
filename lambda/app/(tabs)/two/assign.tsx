import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DropdownSelect } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import Button from '@/components/Button';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

export default function AssignVariationsScreen() {
  const { exercises, variations, refreshExerciseDetails } = useExerciseData();
  const [assignExId, setAssignExId] = useState<number | null>(null);
  const [selectedVarIds, setSelectedVarIds] = useState<number[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assignExId) { setSelectedVarIds([]); setExpandedTypes(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from('bridge_exercise_variation')
        .select('exercise_variation_id')
        .eq('exercise_id', assignExId);
      if (data) setSelectedVarIds(data.map((r: any) => r.exercise_variation_id));
    })();
  }, [assignExId]);

  function toggleType(typeName: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(typeName) ? next.delete(typeName) : next.add(typeName);
      return next;
    });
  }

  function toggle(varId: number) {
    setSelectedVarIds((prev) =>
      prev.includes(varId) ? prev.filter((id) => id !== varId) : [...prev, varId]
    );
  }

  async function save() {
    if (!assignExId) return Alert.alert('Select an exercise first');
    setSaving(true);
    await supabase.from('bridge_exercise_variation').delete().eq('exercise_id', assignExId);
    if (selectedVarIds.length > 0) {
      await supabase.from('bridge_exercise_variation').insert(
        selectedVarIds.map((vid) => ({ exercise_id: assignExId, exercise_variation_id: vid }))
      );
    }
    setSaving(false);
    refreshExerciseDetails();
    Alert.alert('Saved', 'Variations assigned successfully.');
  }

  const grouped = variations.reduce<Record<string, typeof variations>>((acc, v) => {
    if (!acc[v.variation_type_name]) acc[v.variation_type_name] = [];
    acc[v.variation_type_name].push(v);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Exercise</Text>
      <DropdownSelect
        options={exercises.map((ex) => ({ label: ex.exercise_name, value: ex.exercise_id }))}
        value={assignExId}
        onChange={setAssignExId}
        placeholder="Choose exercise…"
      />

      {assignExId && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: T.space.xl }]}>Select Variations</Text>

          {Object.entries(grouped).map(([typeName, vars]) => {
            const isExpanded = expandedTypes.has(typeName);
            const selectedCount = vars.filter((v) => selectedVarIds.includes(v.exercise_variation_id)).length;

            return (
              <View key={typeName} style={styles.typeBlock}>
                <TouchableOpacity style={styles.typeRow} onPress={() => toggleType(typeName)} activeOpacity={0.7}>
                  <View style={styles.typeRowText}>
                    <Text style={styles.typeName}>{typeName}</Text>
                    {!isExpanded && selectedCount > 0 && (
                      <Text style={styles.selectedHint}>{selectedCount} selected</Text>
                    )}
                  </View>
                  <FontAwesome
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={T.muted}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.varList}>
                    {vars.map((v) => {
                      const checked = selectedVarIds.includes(v.exercise_variation_id);
                      return (
                        <TouchableOpacity
                          key={v.exercise_variation_id}
                          style={styles.checkRow}
                          onPress={() => toggle(v.exercise_variation_id)}>
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <Text style={styles.checkLabel}>{v.exercise_variation_name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <View style={styles.btnRow}>
            <Button label="Save Assignments" onPress={save} loading={saving} />
          </View>
        </>
      )}

      <View style={{ height: T.space.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, padding: T.space.lg },
  sectionTitle: { fontSize: T.fontSize.lg, fontWeight: '700', color: T.primary, marginBottom: T.space.sm },
  label: { fontSize: T.fontSize.sm, fontWeight: '500', color: T.primary, marginTop: T.space.xs, marginBottom: T.space.xs },
  typeBlock: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius.md,
    marginBottom: T.space.sm,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: T.space.md,
    paddingHorizontal: T.space.md,
    backgroundColor: T.surface,
  },
  typeRowText: { flex: 1 },
  typeName: { fontSize: T.fontSize.md - 1, fontWeight: '600', color: T.primary },
  selectedHint: { fontSize: T.fontSize.xs, color: T.accent, marginTop: T.space.xs },
  varList: { paddingHorizontal: T.space.md, paddingBottom: T.space.xs, backgroundColor: T.bg },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: T.space.sm, gap: T.space.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: T.radius.sm,
    borderWidth: 2,
    borderColor: T.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: T.accent },
  checkmark: { color: T.accentText, fontSize: T.fontSize.xs },
  checkLabel: { fontSize: T.fontSize.md - 1, color: T.primary },
  btnRow: { marginTop: T.space.lg },
});
