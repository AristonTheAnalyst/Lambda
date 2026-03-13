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
import { Picker } from '@react-native-picker/picker';
import supabase from '@/lib/supabase';
import { useColorScheme } from '@/hooks';
import { useAuthContext } from '@/lib/AuthContext';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuthContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const secondaryTextColor = isDark ? '#999' : '#666';
  const inputBg = isDark ? '#333' : '#f5f5f5';

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
    if (!name.trim()) {
      Alert.alert('Error', 'First name is required.');
      return;
    }
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

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
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
      {
        text: 'Logout',
        onPress: async () => {
          const { error } = await signOut();
          if (error) Alert.alert('Error', 'Failed to logout: ' + error.message);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                  },
                },
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
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: textColor }]}>Profile</Text>
              {!editing && (
                <TouchableOpacity onPress={startEditing}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>Email</Text>
              <Text style={[styles.value, { color: textColor }]}>{user?.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>First Name</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter first name"
                  placeholderTextColor={isDark ? '#999' : '#ccc'}
                  editable={!saving}
                />
              ) : (
                <Text style={[styles.value, { color: textColor }]}>{profile?.user_name || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>Last Name</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={lastname}
                  onChangeText={setLastname}
                  placeholder="Enter last name (optional)"
                  placeholderTextColor={isDark ? '#999' : '#ccc'}
                  editable={!saving}
                />
              ) : (
                <Text style={[styles.value, { color: textColor }]}>{profile?.user_lastname || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>Date of Birth</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD (optional)"
                  placeholderTextColor={isDark ? '#999' : '#ccc'}
                  editable={!saving}
                />
              ) : (
                <Text style={[styles.value, { color: textColor }]}>{profile?.user_date_of_birth || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>Gender</Text>
              {editing ? (
                <View style={[styles.pickerContainer, { backgroundColor: inputBg }]}>
                  <Picker
                    selectedValue={gender}
                    onValueChange={setGender}
                    enabled={!saving}
                    style={{ color: textColor }}
                  >
                    <Picker.Item label="Not specified" value="" />
                    <Picker.Item label="Male" value="Male" />
                    <Picker.Item label="Female" value="Female" />
                    <Picker.Item label="Other" value="Other" />
                  </Picker>
                </View>
              ) : (
                <Text style={[styles.value, { color: textColor }]}>{profile?.user_gender || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: secondaryTextColor }]}>Height (cm)</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Enter height in cm (optional)"
                  placeholderTextColor={isDark ? '#999' : '#ccc'}
                  keyboardType="number-pad"
                  editable={!saving}
                />
              ) : (
                <Text style={[styles.value, { color: textColor }]}>
                  {profile?.user_height_cm ? `${profile.user_height_cm} cm` : '—'}
                </Text>
              )}
            </View>

            {editing ? (
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.saveButton, { opacity: saving ? 0.6 : 1 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
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
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold' },
  editButton: { color: '#555', fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 12, marginBottom: 6 },
  value: { fontSize: 16, fontWeight: '500' },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: { borderRadius: 8, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  editActions: { gap: 12, marginTop: 8 },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { borderWidth: 1, borderColor: '#ddd', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  logoutButton: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 32 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { borderWidth: 1, borderColor: '#e74c3c', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  deleteButtonText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' },
});
