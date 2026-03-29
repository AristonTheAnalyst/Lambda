import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { DropdownSelect } from '@/components/FormControls';
import PageHeader from '@/components/PageHeader';
import GlassButton from '@/components/GlassButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import DatePickerField from '@/components/DatePickerField';
import { useAsyncGuard } from '@/lib/asyncGuard';
import T from '@/constants/Theme';

const GENDER_OPTIONS = [
  { label: 'Not specified', value: '' },
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

export default function ProfileScreen() {
  const guard = useAsyncGuard();
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuthContext();

  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [name, setName]           = useState('');
  const [lastname, setLastname]   = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender]       = useState('');
  const [height, setHeight]       = useState('');
  const [weight, setWeight]       = useState('');

  const startEditing = () => {
    setName(profile?.user_name ?? '');
    setLastname(profile?.user_lastname ?? '');
    setDateOfBirth(profile?.user_date_of_birth ?? '');
    setGender(profile?.user_gender ?? '');
    setHeight(profile?.user_height_cm?.toString() ?? '');
    setWeight((profile as any)?.user_weight_kg?.toString() ?? '');
    setEditing(true);
  };

  const handleSave = () => guard(async () => {
    if (!name.trim()) { Alert.alert('Error', 'First name is required.'); return; }
    if (weight) {
      const w = parseFloat(weight);
      if (isNaN(w) || w < 20 || w > 300) { Alert.alert('Error', 'Weight must be between 20 and 300 kg.'); return; }
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
          user_weight_kg: weight ? parseFloat(weight) : null,
        } as any)
        .eq('user_id', user!.id);
      if (error) { Alert.alert('Error', error.message); return; }
      const prevWeight = (profile as any)?.user_weight_kg;
      if (weight && parseFloat(weight) !== prevWeight) {
        await supabase.from('fact_user_weight').insert({ user_id: user!.id, weight_kg: parseFloat(weight) });
      }
      await refreshProfile();
      setEditing(false);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => guard(async () => {
        const { error } = await signOut();
        if (error) Alert.alert('Error', 'Failed to logout: ' + error.message);
      })},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => guard(async () => {
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
        })},
      ],
    );
  };

  return (
    <YStack flex={1} backgroundColor={T.bg}>
      <PageHeader
        title="User Profile"
        left={<GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
        right={!editing
          ? <Text color={T.accent} fontSize={T.fontSize.md} fontWeight="600" onPress={startEditing} cursor="pointer">Edit</Text>
          : undefined
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack padding={T.space.xl} gap={T.space.lg}>

            {/* Email */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Email</Text>
              <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>
                {user?.email?.endsWith('@privaterelay.appleid.com') ? 'Signed in with Apple' : user?.email}
              </Text>
            </YStack>

            {/* Name */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Name</Text>
              {editing ? (
                <XStack gap={T.space.sm}>
                  <YStack flex={1}><Input value={name} onChangeText={setName} placeholder="First" editable={!saving} /></YStack>
                  <YStack flex={1}><Input value={lastname} onChangeText={setLastname} placeholder="Last" editable={!saving} /></YStack>
                </XStack>
              ) : (
                <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>
                  {[profile?.user_name, profile?.user_lastname].filter(Boolean).join(' ') || '—'}
                </Text>
              )}
            </YStack>

            {/* Date of Birth */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Date of Birth</Text>
              {editing
                ? <DatePickerField value={dateOfBirth} onChangeDate={setDateOfBirth} editable={!saving} />
                : <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>{profile?.user_date_of_birth || '—'}</Text>
              }
            </YStack>

            {/* Gender */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Gender</Text>
              {editing
                ? <DropdownSelect options={GENDER_OPTIONS} value={gender} onChange={setGender} placeholder="Not specified" />
                : <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>{profile?.user_gender || '—'}</Text>
              }
            </YStack>

            {/* Height */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Height (cm)</Text>
              {editing
                ? <Input value={height} onChangeText={setHeight} placeholder="Enter height in cm (optional)" keyboardType="number-pad" editable={!saving} />
                : <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>
                    {profile?.user_height_cm ? `${profile.user_height_cm} cm` : '—'}
                  </Text>
              }
            </YStack>

            {/* Weight */}
            <YStack gap={T.space.xs} paddingBottom={T.space.lg} borderBottomWidth={0.5} borderBottomColor={T.border}>
              <Text fontSize={T.fontSize.xs} color={T.muted}>Weight (kg)</Text>
              {editing
                ? <Input value={weight} onChangeText={setWeight} placeholder="Enter weight in kg (optional)" keyboardType="decimal-pad" editable={!saving} />
                : <Text fontSize={T.fontSize.md} fontWeight="500" color={T.primary}>
                    {(profile as any)?.user_weight_kg ? `${(profile as any).user_weight_kg} kg` : '—'}
                  </Text>
              }
            </YStack>

            {/* Actions */}
            {editing ? (
              <YStack gap={T.space.md} marginTop={T.space.sm}>
                <XStack justifyContent="center">
                  <XStack gap={T.space.sm}>
                    <Button label="Cancel" onPress={() => setEditing(false)} variant="danger-ghost" disabled={saving} />
                    <Button label="Save" onPress={handleSave} loading={saving} disabled={saving} />
                  </XStack>
                </XStack>
                <Button label="Delete Account" onPress={handleDeleteAccount} variant="danger" disabled={saving} />
              </YStack>
            ) : (
              <YStack gap={T.space.md} marginTop={T.space.xxl}>
                <Button label="Logout" onPress={handleLogout} />
              </YStack>
            )}

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </YStack>
  );
}
