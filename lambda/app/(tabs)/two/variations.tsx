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
import { DropdownSelect, SlideUpModal } from '@/components/FormControls';
import { useAdminData } from './AdminDataContext';
import supabase from '@/lib/supabase';
import T from '@/constants/Theme';

interface Variation {
  exercise_variation_id: number;
  exercise_variation_name: string;
  variation_type_id: number;
  variation_type_name?: string;
}

export default function VariationsScreen() {
  const { variations, variationTypes, refreshVariations } = useAdminData();
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
      <TextInput
        style={styles.input}
        placeholder="Variation name"
        placeholderTextColor={T.muted}
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
      <TouchableOpacity style={styles.btn} onPress={create} disabled={creating}>
        {creating ? <ActivityIndicator color={T.accentText} /> : <Text style={styles.btnText}>Add Variation</Text>}
      </TouchableOpacity>

      {/* ── List ── */}
      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>All Variations</Text>
      {variations.length === 0 ? (
        <Text style={styles.empty}>No variations yet.</Text>
      ) : (
        variations.map((v) => (
          <View key={v.exercise_variation_id} style={styles.row}>
            <View style={{ flex: 1 }}>
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
      <View style={{ height: 40 }} />

      {/* ── Edit modal ── */}
      <SlideUpModal visible={!!editVar} onClose={() => setEditVar(null)}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Edit Variation</Text>
          <TextInput
            style={styles.input}
            value={editVar?.exercise_variation_name ?? ''}
            onChangeText={(t) => setEditVar((v) => v ? { ...v, exercise_variation_name: t } : v)}
            placeholder="Variation name"
            placeholderTextColor={T.muted}
          />
          <Text style={styles.label}>Variation type</Text>
          <DropdownSelect
            options={typeOptions}
            value={editVar?.variation_type_id ?? null}
            onChange={(v) => setEditVar((e) => e ? { ...e, variation_type_id: v } : e)}
            placeholder="Select type…"
          />
          <View style={styles.modalBtns}>
            <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={saveEdit}>
              <Text style={styles.btnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setEditVar(null)}>
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
