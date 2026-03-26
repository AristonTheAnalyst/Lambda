import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useExerciseData } from '@/lib/ExerciseDataContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name?: string;
}

export default function VariationsScreen() {
  const { variations, variationTypes, refreshVariations } = useExerciseData();
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState<number | null>(variationTypes[0]?.variation_type_id ?? null);
  const [creating, setCreating] = useState(false);
  const [editVar, setEditVar] = useState<Variation | null>(null);

  const typeOptions = variationTypes.map((vt) => ({ label: vt.variation_type_name, value: vt.variation_type_id }));

  async function create() {
    if (!name.trim()) return Alert.alert('Name required');
    if (!typeId) return Alert.alert('Select a variation type');
    setCreating(true);
    const { error } = await supabase.from('dim_exercise_variation').insert({
      exercise_variation_name: name.trim(),
      variation_type_id: typeId,
    });
    setCreating(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    refreshVariations();
  }

  async function saveEdit() {
    if (!editVar?.exercise_variation_name.trim()) return;
    const { error } = await supabase
      .from('dim_exercise_variation')
      .update({
        exercise_variation_name: editVar.exercise_variation_name,
        variation_type_id: editVar.variation_type_id,
      })
      .eq('exercise_variation_id', editVar.exercise_variation_id);
    if (error) return Alert.alert('Error', error.message);
    setEditVar(null);
    refreshVariations();
  }

  function confirmDelete(id: number) {
    Alert.alert('Delete Variation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('dim_exercise_variation').update({ is_active: false }).eq('exercise_variation_id', id);
        refreshVariations();
      }},
    ]);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Create form ── */}
      <Text style={styles.sectionTitle}>New Variation</Text>
      <Input
        placeholder="Variation name"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.label}>Variation type</Text>
      <DropdownSelect
        options={typeOptions}
        value={typeId}
        onChange={setTypeId}
        placeholder="Select type…"
      />
      <View style={styles.btnRow}>
        <Button label="Add Variation" onPress={create} loading={creating} />
      </View>

      {/* ── List ── */}
      <Text style={[styles.sectionTitle, { marginTop: T.space.xxl }]}>All Variations</Text>
      {variations.length === 0 ? (
        <Text style={styles.empty}>No variations yet.</Text>
      ) : (
        variations.map((v) => (
          <View key={v.exercise_variation_id} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{v.exercise_variation_name}</Text>
              <Text style={styles.rowSub}>{v.variation_type_name}</Text>
            </View>
            <TouchableOpacity style={styles.rowBtn} onPress={() => setEditVar({ ...v })}>
              <Text style={styles.rowBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.rowBtn, styles.rowBtnDanger]} onPress={() => confirmDelete(v.exercise_variation_id)}>
              <Text style={[styles.rowBtnText, { color: T.danger }]}>Del</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
      <View style={{ height: T.space.xxl }} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Variation</Text>
          <Input
            value={editVar?.exercise_variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, exercise_variation_name: t } : v)}
            placeholder="Variation name"
          />
          <Text style={styles.label}>Variation type</Text>
          <DropdownSelect
            options={typeOptions}
            value={editVar?.variation_type_id ?? null}
            onChange={(v) => setEditVar((e) => e ? { ...e, variation_type_id: v } : e)}
            placeholder="Select type…"
          />
          <View style={styles.modalBtns}>
            <View style={styles.modalBtnFlex}>
              <Button label="Save" onPress={saveEdit} />
            </View>
            <View style={styles.modalBtnFlex}>
              <Button label="Cancel" onPress={() => setEditVar(null)} variant="ghost" />
            </View>
          </View>
        </View>
      </SlideUpModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, padding: T.space.lg },
  sectionTitle: { fontSize: T.fontSize.lg, fontWeight: '700', color: T.primary, marginBottom: T.space.md },
  label: { fontSize: T.fontSize.sm, fontWeight: '500', color: T.primary, marginTop: T.space.md, marginBottom: T.space.xs },
  btnRow: { marginTop: T.space.md },
  empty: { color: T.muted, padding: T.space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: T.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: T.fontSize.md - 1, color: T.primary },
  rowSub: { fontSize: T.fontSize.xs, color: T.muted, marginTop: T.space.xs },
  rowBtn: { paddingHorizontal: T.space.sm, paddingVertical: T.space.xs + 2, marginLeft: T.space.sm, borderRadius: T.radius.sm, backgroundColor: T.accentBg },
  rowBtnDanger: { backgroundColor: T.dangerBg },
  rowBtnText: { fontSize: T.fontSize.sm, fontWeight: '500', color: T.accent },
  modalBox: { backgroundColor: T.surface, borderTopLeftRadius: T.radius.lg, borderTopRightRadius: T.radius.lg, padding: T.space.xl, paddingBottom: T.space.xxl },
  modalTitle: { fontSize: T.fontSize.lg, fontWeight: '700', color: T.primary, marginBottom: T.space.md },
  modalBtns: { flexDirection: 'row', gap: T.space.sm, marginTop: T.space.sm },
  modalBtnFlex: { flex: 1 },
});
