import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';
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

  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [name, setName]           = useState('');
  const [lastname, setLastname]   = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender]       = useState('');
  const [height, setHeight]       = useState('');

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
    <YStack flex={1} backgroundColor="$background">
      <PageHeader
        title="User Profile"
        right={!editing
          ? <Text color="$accent" fontSize="$md" fontWeight="600" onPress={startEditing} cursor="pointer">Edit</Text>
          : undefined
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack padding="$xl" gap="$lg">

            {/* Email */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">Email</Text>
              <Text fontSize="$md" fontWeight="500" color="$color">{user?.email}</Text>
            </YStack>

            {/* First Name */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">First Name</Text>
              {editing
                ? <Input value={name} onChangeText={setName} placeholder="Enter first name" editable={!saving} />
                : <Text fontSize="$md" fontWeight="500" color="$color">{profile?.user_name || '—'}</Text>
              }
            </YStack>

            {/* Last Name */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">Last Name</Text>
              {editing
                ? <Input value={lastname} onChangeText={setLastname} placeholder="Enter last name (optional)" editable={!saving} />
                : <Text fontSize="$md" fontWeight="500" color="$color">{profile?.user_lastname || '—'}</Text>
              }
            </YStack>

            {/* Date of Birth */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">Date of Birth</Text>
              {editing
                ? <DatePickerField value={dateOfBirth} onChangeDate={setDateOfBirth} editable={!saving} />
                : <Text fontSize="$md" fontWeight="500" color="$color">{profile?.user_date_of_birth || '—'}</Text>
              }
            </YStack>

            {/* Gender */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">Gender</Text>
              {editing
                ? <DropdownSelect options={GENDER_OPTIONS} value={gender} onChange={setGender} placeholder="Not specified" />
                : <Text fontSize="$md" fontWeight="500" color="$color">{profile?.user_gender || '—'}</Text>
              }
            </YStack>

            {/* Height */}
            <YStack gap="$xs" paddingBottom="$lg" borderBottomWidth={0.5} borderBottomColor="$borderColor">
              <Text fontSize="$xs" color="$muted">Height (cm)</Text>
              {editing
                ? <Input value={height} onChangeText={setHeight} placeholder="Enter height in cm (optional)" keyboardType="number-pad" editable={!saving} />
                : <Text fontSize="$md" fontWeight="500" color="$color">
                    {profile?.user_height_cm ? `${profile.user_height_cm} cm` : '—'}
                  </Text>
              }
            </YStack>

            {/* Actions */}
            {editing ? (
              <YStack gap="$md" marginTop="$sm">
                <Button label="Save" onPress={handleSave} loading={saving} disabled={saving} />
                <Button label="Cancel" onPress={() => setEditing(false)} variant="ghost" disabled={saving} />
              </YStack>
            ) : (
              <YStack gap="$md" marginTop="$xxl">
                <Button label="Logout" onPress={handleLogout} />
                <Button label="Delete Account" onPress={handleDeleteAccount} variant="danger" />
              </YStack>
            )}

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
