import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DropdownSelect } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
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
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Select Variations</Text>

          {Object.entries(grouped).map(([typeName, vars]) => {
            const isExpanded = expandedTypes.has(typeName);
            const selectedCount = vars.filter((v) => selectedVarIds.includes(v.exercise_variation_id)).length;

            return (
              <View key={typeName} style={styles.typeBlock}>
                <TouchableOpacity style={styles.typeRow} onPress={() => toggleType(typeName)} activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
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
                            {checked && <Text style={{ color: T.accentText, fontSize: 12 }}>✓</Text>}
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

          <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={T.accentText} /> : <Text style={styles.btnText}>Save Assignments</Text>}
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: T.primary, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '500', color: T.primary, marginTop: 4, marginBottom: 4 },
  typeBlock: {
    borderWidth: 1, borderColor: T.border, borderRadius: 10,
    marginBottom: 8, overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    backgroundColor: T.surface,
  },
  typeName: { fontSize: 15, fontWeight: '600', color: T.primary },
  selectedHint: { fontSize: 12, color: T.accent, marginTop: 2 },
  varList: { paddingHorizontal: 14, paddingBottom: 6, backgroundColor: T.bg },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: T.accent },
  checkLabel: { fontSize: 15, color: T.primary },
  btn: { backgroundColor: T.accent, borderRadius: 8, padding: 13, alignItems: 'center' },
  btnText: { color: T.accentText, fontWeight: '600', fontSize: 15 },
});
