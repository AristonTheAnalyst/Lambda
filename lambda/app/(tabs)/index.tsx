import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { DropdownSelect } from '@/components/FormControls';
import T from '@/constants/Theme';

const GENDER_OPTIONS = [
  { label: 'Not specified', value: '' },
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuthContext();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');

  const startEditing = () => {
    setName(profile?.user_name ?? '');
    setLastname(profile?.user_lastname ?? '');
    setDateOfBirth(profile?.user_date_of_birth ?? '');
    setGender(profile?.user_gender ?? '');
    setHeight(profile?.user_height_cm?.toString() ?? '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'First name is required.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dim_user')
        .update({
          user_name: name.trim(),
          user_lastname: lastname.trim() || null,
          user_date_of_birth: dateOfBirth || null,
          user_gender: gender || null,
          user_height_cm: height ? parseInt(height, 10) : null,
        })
        .eq('user_id', user!.id);
      if (error) { Alert.alert('Error', error.message); return; }
      await refreshProfile();
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: async () => {
        const { error } = await signOut();
        if (error) Alert.alert('Error', 'Failed to logout: ' + error.message);
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
              { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' } },
            );
            if (!response.ok) {
              const body = await response.json();
              Alert.alert('Error', body.error ?? 'Failed to delete account.');
              return;
            }
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to delete account. Please try again.');
          }
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Profile</Text>
              {!editing && (
                <TouchableOpacity onPress={startEditing}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>First Name</Text>
              {editing ? (
                <TextInput style={styles.input} value={name} onChangeText={setName}
                  placeholder="Enter first name" placeholderTextColor={T.muted}
                  editable={!saving} />
              ) : (
                <Text style={styles.value}>{profile?.user_name || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              {editing ? (
                <TextInput style={styles.input} value={lastname} onChangeText={setLastname}
                  placeholder="Enter last name (optional)" placeholderTextColor={T.muted}
                  editable={!saving} />
              ) : (
                <Text style={styles.value}>{profile?.user_lastname || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              {editing ? (
                <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD (optional)" placeholderTextColor={T.muted}
                  editable={!saving} />
              ) : (
                <Text style={styles.value}>{profile?.user_date_of_birth || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gender</Text>
              {editing ? (
                <DropdownSelect
                  options={GENDER_OPTIONS}
                  value={gender}
                  onChange={setGender}
                  placeholder="Not specified"
                />
              ) : (
                <Text style={styles.value}>{profile?.user_gender || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              {editing ? (
                <TextInput style={styles.input} value={height} onChangeText={setHeight}
                  placeholder="Enter height in cm (optional)" placeholderTextColor={T.muted}
                  keyboardType="number-pad" editable={!saving} />
              ) : (
                <Text style={styles.value}>
                  {profile?.user_height_cm ? `${profile.user_height_cm} cm` : '—'}
                </Text>
              )}
            </View>

            {editing ? (
              <View style={styles.editActions}>
                <TouchableOpacity style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={T.accentText} /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: T.primary },
  editButton: { color: T.accent, fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  fieldLabel: { fontSize: 12, marginBottom: 6, color: T.muted },
  value: { fontSize: 16, fontWeight: '500', color: T.primary },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    color: T.primary,
  },
  editActions: { gap: 12, marginTop: 8 },
  saveButton: { backgroundColor: T.accent, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: T.accentText, fontSize: 16, fontWeight: '600' },
  cancelButton: { borderWidth: 1, borderColor: T.border, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: T.muted, fontSize: 16, fontWeight: '600' },
  logoutButton: { backgroundColor: T.accent, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  logoutButtonText: { color: T.accentText, fontSize: 16, fontWeight: '600' },
  deleteButton: { borderWidth: 1, borderColor: T.dangerBorder, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  deleteButtonText: { color: T.danger, fontSize: 16, fontWeight: '600' },
});
