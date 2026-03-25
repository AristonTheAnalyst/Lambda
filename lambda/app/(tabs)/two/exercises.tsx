import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SegmentedControl, SlideUpModal } from '@/components/FormControls';
import { useAdminData } from './AdminDataContext';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

interface Exercise {
  exercise_id: number;
  exercise_name: string;
  exercise_volume_type: string;
  exercise_intensity_type: string;
  is_active: boolean;
}

const VOLUME_OPTIONS = [{ label: 'Reps', value: 'reps' }, { label: 'Duration', value: 'duration' }];
const INTENSITY_OPTIONS = [{ label: 'Weight', value: 'weight' }, { label: 'Distance', value: 'distance' }];

export default function ExercisesScreen() {
  const { exercises, refreshExercises } = useAdminData();
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('reps');
  const [intensity, setIntensity] = useState('weight');
  const [creating, setCreating] = useState(false);
  const [editEx, setEditEx] = useState<Exercise | null>(null);

  async function create() {
    if (!name.trim()) return Alert.alert('Name required');
    setCreating(true);
    const { error } = await supabase.from('dim_exercise').insert({
      exercise_name: name.trim(),
      exercise_volume_type: volume,
      exercise_intensity_type: intensity,
    });
    setCreating(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    refreshExercises();
  }

  async function saveEdit() {
    if (!editEx?.exercise_name.trim()) return;
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
    refreshExercises();
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete Exercise', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('dim_exercise').update({ is_active: false }).eq('exercise_id', id);
        refreshExercises();
      }},
    ]);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Create form ── */}
      <Text style={styles.sectionTitle}>New Exercise</Text>
      <TextInput
        style={styles.input}
        placeholder="Exercise name"
        placeholderTextColor={T.muted}
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.label}>Volume type</Text>
      <SegmentedControl options={VOLUME_OPTIONS} value={volume} onChange={setVolume} />
      <Text style={styles.label}>Intensity type</Text>
      <SegmentedControl options={INTENSITY_OPTIONS} value={intensity} onChange={setIntensity} />
      <TouchableOpacity style={styles.btn} onPress={create} disabled={creating}>
        {creating ? <ActivityIndicator color={T.accentText} /> : <Text style={styles.btnText}>Create Exercise</Text>}
      </TouchableOpacity>

      {/* ── List ── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>All Exercises</Text>
      {exercises.length === 0 ? (
        <Text style={styles.empty}>No exercises yet.</Text>
      ) : (
        exercises.map((ex) => (
          <View key={ex.exercise_id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{ex.exercise_name}</Text>
              <Text style={styles.rowSub}>{ex.exercise_volume_type} · {ex.exercise_intensity_type}</Text>
            </View>
            <TouchableOpacity style={styles.rowBtn} onPress={() => setEditEx({ ...ex })}>
              <Text style={styles.rowBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rowBtn, styles.rowBtnDanger]} onPress={() => confirmDelete(ex.exercise_id)}>
              <Text style={[styles.rowBtnText, { color: T.danger }]}>Del</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editEx} onClose={() => setEditEx(null)}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Exercise</Text>
          <TextInput
            style={styles.input}
            value={editEx?.exercise_name ?? ''}
            onChangeText={(t) => setEditEx((e) => e ? { ...e, exercise_name: t } : e)}
            placeholder="Exercise name"
            placeholderTextColor={T.muted}
          />
          <Text style={styles.label}>Volume type</Text>
          <SegmentedControl
            options={VOLUME_OPTIONS}
            value={editEx?.exercise_volume_type ?? 'reps'}
            onChange={(v) => setEditEx((e) => e ? { ...e, exercise_volume_type: v } : e)}
          />
          <Text style={styles.label}>Intensity type</Text>
          <SegmentedControl
            options={INTENSITY_OPTIONS}
            value={editEx?.exercise_intensity_type ?? 'weight'}
            onChange={(v) => setEditEx((e) => e ? { ...e, exercise_intensity_type: v } : e)}
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={saveEdit}>
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setEditEx(null)}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SlideUpModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: T.primary, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: T.primary, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: T.border, borderRadius: 8,
    padding: 12, fontSize: 15, backgroundColor: T.surface, color: T.primary, marginBottom: 4,
  },
  btn: { backgroundColor: T.accent, borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 12 },
  btnText: { color: T.accentText, fontWeight: '600', fontSize: 15 },
  btnOutline: { borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 12 },
  btnOutlineText: { color: T.muted, fontWeight: '600', fontSize: 15 },
  empty: { color: T.muted, padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  rowName: { fontSize: 15, color: T.primary },
  rowSub: { fontSize: 12, color: T.muted, marginTop: 2 },
  rowBtn: { paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8, borderRadius: 6, backgroundColor: T.accentBg },
  rowBtnDanger: { backgroundColor: T.dangerBg },
  rowBtnText: { fontSize: 13, fontWeight: '500', color: T.accent },
  modalBox: { backgroundColor: T.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: T.primary, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', marginTop: 4 },
});
