import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { DropdownSelect } from '@/components/FormControls';
import PageHeader from '@/components/PageHeader';
import Button from '@/components/Button';
import Input from '@/components/Input';
import DatePickerField from '@/components/DatePickerField';
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
    <View style={styles.container}>
      <PageHeader
        title="User Profile"
        right={!editing ? (
          <TouchableOpacity onPress={startEditing}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        ) : undefined}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>First Name</Text>
              {editing ? (
                <Input value={name} onChangeText={setName} placeholder="Enter first name" editable={!saving} />
              ) : (
                <Text style={styles.value}>{profile?.user_name || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              {editing ? (
                <Input value={lastname} onChangeText={setLastname} placeholder="Enter last name (optional)" editable={!saving} />
              ) : (
                <Text style={styles.value}>{profile?.user_lastname || '—'}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              {editing ? (
                <DatePickerField value={dateOfBirth} onChangeDate={setDateOfBirth} editable={!saving} />
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
                <Input
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Enter height in cm (optional)"
                  keyboardType="number-pad"
                  editable={!saving}
                />
              ) : (
                <Text style={styles.value}>
                  {profile?.user_height_cm ? `${profile.user_height_cm} cm` : '—'}
                </Text>
              )}
            </View>

            {editing ? (
              <View style={styles.editActions}>
                <Button label="Save" onPress={handleSave} loading={saving} disabled={saving} />
                <Button label="Cancel" onPress={() => setEditing(false)} variant="ghost" disabled={saving} />
              </View>
            ) : (
              <View style={styles.accountActions}>
                <Button label="Logout" onPress={handleLogout} />
                <Button label="Delete Account" onPress={handleDeleteAccount} variant="danger" />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  flex: { flex: 1 },
  content: { padding: T.space.xl },
  editButton: { color: T.accent, fontSize: T.fontSize.md, fontWeight: '600' },
  field: {
    marginBottom: T.space.lg,
    paddingBottom: T.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  fieldLabel: { fontSize: T.fontSize.xs, marginBottom: T.space.xs, color: T.muted },
  value: { fontSize: T.fontSize.md, fontWeight: '500', color: T.primary },
  editActions: { gap: T.space.md, marginTop: T.space.sm },
  accountActions: { gap: T.space.md, marginTop: T.space.xxl },
});
