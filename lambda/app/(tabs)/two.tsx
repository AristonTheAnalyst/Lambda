import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useColorScheme } from '@/hooks';
import supabase from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
  is_active: boolean;
}

interface VariationType {
  variation_type_id: number;
  variation_type_name: string;
}

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name?: string;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  expanded,
  onToggle,
  isDark,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.sectionHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}
      onPress={onToggle}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>{title}</Text>
      <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 18 }}>{expanded ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminExercisesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? '#1a1a1a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const inputBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const borderColor = isDark ? '#444' : '#ddd';

  // ─── Section expand state
  const [section, setSection] = useState<'exercises' | 'variations' | 'assign' | null>('exercises');
  const toggle = (s: 'exercises' | 'variations' | 'assign') =>
    setSection((prev) => (prev === s ? null : s));

  // ─── Shared data
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);

  // ─── Exercise form
  const [exName, setExName] = useState('');
  const [exVolume, setExVolume] = useState('reps');
  const [exIntensity, setExIntensity] = useState('weight');
  const [exLoading, setExLoading] = useState(false);

  // ─── Variation form
  const [varName, setVarName] = useState('');
  const [varTypeId, setVarTypeId] = useState<number | null>(null);
  const [varLoading, setVarLoading] = useState(false);

  // ─── Assign section
  const [assignExId, setAssignExId] = useState<number | null>(null);
  const [selectedVarIds, setSelectedVarIds] = useState<number[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // ─── Edit modals
  const [editEx, setEditEx] = useState<Exercise | null>(null);
  const [editVar, setEditVar] = useState<Variation | null>(null);

  // ─── Load data ───────────────────────────────────────────────────────────

  const loadVariationTypes = useCallback(async () => {
    const { data } = await supabase
      .from('dim_variation_type')
      .select('*')
      .eq('is_active', true)
      .order('variation_type_name');
    if (data) {
      setVariationTypes(data);
      if (!varTypeId && data.length > 0) setVarTypeId(data[0].variation_type_id);
    }
  }, [varTypeId]);

  const loadExercises = useCallback(async () => {
    const { data } = await supabase
      .from('dim_exercise')
      .select('*')
      .eq('is_active', true)
      .order('exercise_name');
    if (data) setExercises(data);
  }, []);

  const loadVariations = useCallback(async () => {
    const { data } = await supabase
      .from('dim_exercise_variation')
      .select('*, dim_variation_type(variation_type_name)')
      .eq('is_active', true)
      .order('exercise_variation_name');
    if (data) {
      setVariations(
        data.map((v: any) => ({
          ...v,
          variation_type_name: v.dim_variation_type?.variation_type_name ?? '',
        }))
      );
    }
  }, []);

  useEffect(() => {
    loadVariationTypes();
    loadExercises();
    loadVariations();
  }, []);

  // Load assigned variations when exercise changes in Assign section
  useEffect(() => {
    if (!assignExId) {
      setSelectedVarIds([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('bridge_exercise_variation')
        .select('exercise_variation_id')
        .eq('exercise_id', assignExId);
      if (data) setSelectedVarIds(data.map((r: any) => r.exercise_variation_id));
    })();
  }, [assignExId]);

  // ─── Exercise CRUD ───────────────────────────────────────────────────────

  async function createExercise() {
    if (!exName.trim()) return Alert.alert('Name required');
    setExLoading(true);
    const { error } = await supabase.from('dim_exercise').insert({
      exercise_name: exName.trim(),
      exercise_volume_type: exVolume,
      exercise_intensity_type: exIntensity,
    });
    setExLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setExName('');
    loadExercises();
  }

  async function saveEditExercise() {
    if (!editEx || !editEx.exercise_name.trim()) return;
    const { error } = await supabase
      .from('dim_exercise')
      .update({
        exercise_name: editEx.exercise_name,
        exercise_volume_type: editEx.exercise_volume_type,
        exercise_intensity_type: editEx.exercise_intensity_type,
      })
      .eq('exercise_id', editEx.exercise_id);
    if (error) return Alert.alert('Error', error.message);
    setEditEx(null);
    loadExercises();
  }

  async function deleteExercise(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('dim_exercise').update({ is_active: false }).eq('exercise_id', id);
          loadExercises();
        },
      },
    ]);
  }

  // ─── Variation CRUD ──────────────────────────────────────────────────────

  async function createVariation() {
    if (!varName.trim()) return Alert.alert('Name required');
    if (!varTypeId) return Alert.alert('Select a variation type');
    setVarLoading(true);
    const { error } = await supabase.from('dim_exercise_variation').insert({
      exercise_variation_name: varName.trim(),
      variation_type_id: varTypeId,
    });
    setVarLoading(false);
    if (error) return Alert.alert('Error', error.message);
    setVarName('');
    loadVariations();
  }

  async function saveEditVariation() {
    if (!editVar || !editVar.exercise_variation_name.trim()) return;
    const { error } = await supabase
      .from('dim_exercise_variation')
      .update({
        exercise_variation_name: editVar.exercise_variation_name,
        variation_type_id: editVar.variation_type_id,
      })
      .eq('exercise_variation_id', editVar.exercise_variation_id);
    if (error) return Alert.alert('Error', error.message);
    setEditVar(null);
    loadVariations();
  }

  async function deleteVariation(id: number) {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('dim_exercise_variation')
            .update({ is_active: false })
            .eq('exercise_variation_id', id);
          loadVariations();
        },
      },
    ]);
  }

  // ─── Assign Variations ───────────────────────────────────────────────────

  function toggleVariation(varId: number) {
    setSelectedVarIds((prev) =>
      prev.includes(varId) ? prev.filter((id) => id !== varId) : [...prev, varId]
    );
  }

  async function assignVariations() {
    if (!assignExId) return Alert.alert('Select an exercise');
    setAssignLoading(true);
    // Delete existing, then insert selected
    await supabase
      .from('bridge_exercise_variation')
      .delete()
      .eq('exercise_id', assignExId);
    if (selectedVarIds.length > 0) {
      await supabase.from('bridge_exercise_variation').insert(
        selectedVarIds.map((vid) => ({
          exercise_id: assignExId,
          exercise_variation_id: vid,
        }))
      );
    }
    setAssignLoading(false);
    Alert.alert('Success', 'Variations assigned');
  }

  // Group variations by type for the assign section
  const variationsByType = variations.reduce<Record<string, Variation[]>>((acc, v) => {
    const key = v.variation_type_name ?? 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ScrollView style={[styles.container, { backgroundColor: bg }]} keyboardShouldPersistTaps="handled">

      {/* ── Section 1: Exercises ── */}
      <SectionHeader
        title="Exercises"
        expanded={section === 'exercises'}
        onToggle={() => toggle('exercises')}
        isDark={isDark}
      />
      {section === 'exercises' && (
        <View style={styles.section}>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Exercise name"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            value={exName}
            onChangeText={setExName}
          />
          <Text style={[styles.label, { color: textColor }]}>Volume type</Text>
          <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
            <Picker selectedValue={exVolume} onValueChange={setExVolume} style={{ color: textColor }}>
              <Picker.Item label="Reps" value="reps" />
              <Picker.Item label="Duration" value="duration" />
            </Picker>
          </View>
          <Text style={[styles.label, { color: textColor }]}>Intensity type</Text>
          <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
            <Picker selectedValue={exIntensity} onValueChange={setExIntensity} style={{ color: textColor }}>
              <Picker.Item label="Weight" value="weight" />
              <Picker.Item label="Distance" value="distance" />
            </Picker>
          </View>
          <TouchableOpacity style={styles.btn} onPress={createExercise} disabled={exLoading}>
            {exLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Exercise</Text>}
          </TouchableOpacity>

          <Text style={[styles.listTitle, { color: textColor }]}>Manage Exercises</Text>
          {exercises.length === 0 ? (
            <Text style={{ color: isDark ? '#888' : '#aaa', padding: 12 }}>No exercises yet.</Text>
          ) : (
            exercises.map((ex) => (
              <View key={ex.exercise_id} style={[styles.listRow, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: textColor }]}>{ex.exercise_name}</Text>
                  <Text style={[styles.rowSub, { color: isDark ? '#aaa' : '#666' }]}>
                    {ex.exercise_volume_type} · {ex.exercise_intensity_type}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setEditEx({ ...ex })} style={styles.rowBtn}>
                  <Text style={styles.rowBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteExercise(ex.exercise_id)} style={[styles.rowBtn, styles.rowBtnDanger]}>
                  <Text style={[styles.rowBtnText, { color: '#e55' }]}>Del</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Section 2: Variations ── */}
      <SectionHeader
        title="Variations"
        expanded={section === 'variations'}
        onToggle={() => toggle('variations')}
        isDark={isDark}
      />
      {section === 'variations' && (
        <View style={styles.section}>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Variation name"
            placeholderTextColor={isDark ? '#888' : '#aaa'}
            value={varName}
            onChangeText={setVarName}
          />
          <Text style={[styles.label, { color: textColor }]}>Variation type</Text>
          <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
            <Picker
              selectedValue={varTypeId}
              onValueChange={(v) => setVarTypeId(v)}
              style={{ color: textColor }}>
              {variationTypes.map((vt) => (
                <Picker.Item key={vt.variation_type_id} label={vt.variation_type_name} value={vt.variation_type_id} />
              ))}
            </Picker>
          </View>
          <TouchableOpacity style={styles.btn} onPress={createVariation} disabled={varLoading}>
            {varLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add Variation</Text>}
          </TouchableOpacity>

          <Text style={[styles.listTitle, { color: textColor }]}>Manage Variations</Text>
          {variations.length === 0 ? (
            <Text style={{ color: isDark ? '#888' : '#aaa', padding: 12 }}>No variations yet.</Text>
          ) : (
            variations.map((v) => (
              <View key={v.exercise_variation_id} style={[styles.listRow, { borderColor }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: textColor }]}>{v.exercise_variation_name}</Text>
                  <Text style={[styles.rowSub, { color: isDark ? '#aaa' : '#666' }]}>{v.variation_type_name}</Text>
                </View>
                <TouchableOpacity onPress={() => setEditVar({ ...v })} style={styles.rowBtn}>
                  <Text style={styles.rowBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteVariation(v.exercise_variation_id)} style={[styles.rowBtn, styles.rowBtnDanger]}>
                  <Text style={[styles.rowBtnText, { color: '#e55' }]}>Del</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Section 3: Assign Variations ── */}
      <SectionHeader
        title="Assign Variations to Exercise"
        expanded={section === 'assign'}
        onToggle={() => toggle('assign')}
        isDark={isDark}
      />
      {section === 'assign' && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: textColor }]}>Select exercise</Text>
          <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
            <Picker
              selectedValue={assignExId}
              onValueChange={(v) => setAssignExId(v)}
              style={{ color: textColor }}>
              <Picker.Item label="— choose exercise —" value={null} />
              {exercises.map((ex) => (
                <Picker.Item key={ex.exercise_id} label={ex.exercise_name} value={ex.exercise_id} />
              ))}
            </Picker>
          </View>

          {assignExId && (
            <>
              <Text style={[styles.listTitle, { color: textColor }]}>Select variations</Text>
              {Object.entries(variationsByType).map(([typeName, vars]) => (
                <View key={typeName} style={{ marginBottom: 8 }}>
                  <Text style={[styles.groupHeader, { color: isDark ? '#aaa' : '#666' }]}>{typeName}</Text>
                  {vars.map((v) => {
                    const checked = selectedVarIds.includes(v.exercise_variation_id);
                    return (
                      <TouchableOpacity
                        key={v.exercise_variation_id}
                        style={styles.checkRow}
                        onPress={() => toggleVariation(v.exercise_variation_id)}>
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                        </View>
                        <Text style={[styles.checkLabel, { color: textColor }]}>
                          {v.exercise_variation_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <TouchableOpacity style={styles.btn} onPress={assignVariations} disabled={assignLoading}>
                {assignLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Assign Variations</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── Edit Exercise Modal ── */}
      <Modal visible={!!editEx} transparent animationType="slide" onRequestClose={() => setEditEx(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: bg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Edit Exercise</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
              value={editEx?.exercise_name ?? ''}
              onChangeText={(t) => setEditEx((e) => e ? { ...e, exercise_name: t } : e)}
              placeholder="Exercise name"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
            />
            <Text style={[styles.label, { color: textColor }]}>Volume type</Text>
            <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
              <Picker
                selectedValue={editEx?.exercise_volume_type}
                onValueChange={(v) => setEditEx((e) => e ? { ...e, exercise_volume_type: v } : e)}
                style={{ color: textColor }}>
                <Picker.Item label="Reps" value="reps" />
                <Picker.Item label="Duration" value="duration" />
              </Picker>
            </View>
            <Text style={[styles.label, { color: textColor }]}>Intensity type</Text>
            <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
              <Picker
                selectedValue={editEx?.exercise_intensity_type}
                onValueChange={(v) => setEditEx((e) => e ? { ...e, exercise_intensity_type: v } : e)}
                style={{ color: textColor }}>
                <Picker.Item label="Weight" value="weight" />
                <Picker.Item label="Distance" value="distance" />
              </Picker>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={saveEditExercise}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => setEditEx(null)}>
                <Text style={[styles.btnText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Variation Modal ── */}
      <Modal visible={!!editVar} transparent animationType="slide" onRequestClose={() => setEditVar(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: bg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Edit Variation</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
              value={editVar?.exercise_variation_name ?? ''}
              onChangeText={(t) => setEditVar((v) => v ? { ...v, exercise_variation_name: t } : v)}
              placeholder="Variation name"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
            />
            <Text style={[styles.label, { color: textColor }]}>Variation type</Text>
            <View style={[styles.pickerWrap, { backgroundColor: inputBg, borderColor }]}>
              <Picker
                selectedValue={editVar?.variation_type_id}
                onValueChange={(v) => setEditVar((e) => e ? { ...e, variation_type_id: v } : e)}
                style={{ color: textColor }}>
                {variationTypes.map((vt) => (
                  <Picker.Item key={vt.variation_type_id} label={vt.variation_type_name} value={vt.variation_type_id} />
                ))}
              </Picker>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={saveEditVariation}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => setEditVar(null)}>
                <Text style={[styles.btnText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '500', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  btn: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  listTitle: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
    borderRadius: 6,
    backgroundColor: '#e8f0fe',
  },
  rowBtnDanger: { backgroundColor: '#fee8e8' },
  rowBtnText: { fontSize: 13, fontWeight: '500', color: '#4a90e2' },
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4a90e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#4a90e2' },
  checkLabel: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', marginTop: 8 },
});
