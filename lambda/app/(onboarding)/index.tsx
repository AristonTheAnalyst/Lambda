import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, YStack } from 'tamagui';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { useRouter } from 'expo-router';
import { onboardingSchema, getFieldErrors } from '@/lib/validation';
import { DropdownSelect } from '@/components/FormControls';
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

export default function OnboardingScreen() {
  const [name, setName]           = useState('');
  const [lastname, setLastname]   = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender]       = useState('');
  const [height, setHeight]       = useState('');
  const [weight, setWeight]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);
  const guard = useAsyncGuard();
  const { refreshProfile }        = useAuthContext();
  const router                    = useRouter();

  const handleCompleteOnboarding = () => guard(async () => {
    const result = onboardingSchema.safeParse({ name: name.trim(), lastname, dateOfBirth, gender, height, weight });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) { Alert.alert('Error', 'User session not found. Please log in again.'); return; }

      const { error } = await supabase
        .from('dim_user')
        .update({
          user_name: name.trim(),
          user_lastname: lastname.trim() || null,
          user_date_of_birth: dateOfBirth || null,
          user_gender: gender || null,
          user_height_cm: height ? parseInt(height, 10) : null,
          user_weight_kg: weight ? parseFloat(weight) : null,
          onboarded: true,
        } as any)
        .eq('user_id', userId);

      if (error) { Alert.alert('Error', 'Failed to complete onboarding: ' + error.message); return; }
      if (weight) {
        await supabase.from('fact_user_weight').insert({ user_id: userId, weight_kg: parseFloat(weight) });
      }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack paddingHorizontal={T.space.xl} paddingTop={T.space.xl}>

            <YStack alignItems="center" marginBottom={T.space.xxl}>
              <Text fontSize={32} fontWeight="bold" marginBottom={T.space.sm} color={T.primary}>Welcome to Lambda</Text>
              <Text fontSize={T.fontSize.md} color={T.muted}>Let's set up your profile</Text>
            </YStack>

            <YStack gap={T.space.lg} paddingBottom={T.space.xxl}>
              <Input
                label="First Name *"
                value={name}
                onChangeText={(v) => { setName(v); setFieldErrors((e) => ({ ...e, name: '' })); }}
                placeholder="Enter your first name"
                error={fieldErrors.name}
                editable={!loading}
              />

              <Input
                label="Last Name"
                value={lastname}
                onChangeText={(v) => { setLastname(v); setFieldErrors((e) => ({ ...e, lastname: '' })); }}
                placeholder="Enter your last name (optional)"
                editable={!loading}
              />

              <YStack gap={T.space.xs}>
                <Text color={T.primary} fontSize={T.fontSize.sm} fontWeight="600">Date of Birth</Text>
                <DatePickerField
                  value={dateOfBirth}
                  onChangeDate={(v) => { setDateOfBirth(v); setFieldErrors((e) => ({ ...e, dateOfBirth: '' })); }}
                  editable={!loading}
                />
              </YStack>

              <YStack gap={T.space.xs}>
                <Text color={T.primary} fontSize={T.fontSize.sm} fontWeight="600">Gender</Text>
                <DropdownSelect
                  options={GENDER_OPTIONS}
                  value={gender}
                  onChange={setGender}
                  placeholder="Select gender (optional)"
                />
              </YStack>

              <Input
                label="Height (cm)"
                value={height}
                onChangeText={(v) => { setHeight(v); setFieldErrors((e) => ({ ...e, height: '' })); }}
                placeholder="Enter your height in cm (optional)"
                error={fieldErrors.height}
                keyboardType="number-pad"
                editable={!loading}
              />

              <Input
                label="Weight (kg)"
                value={weight}
                onChangeText={(v) => { setWeight(v); setFieldErrors((e) => ({ ...e, weight: '' })); }}
                placeholder="Enter your weight in kg (optional)"
                error={fieldErrors.weight}
                keyboardType="decimal-pad"
                editable={!loading}
              />

              <Button
                label="Complete Setup"
                onPress={handleCompleteOnboarding}
                loading={loading}
                disabled={loading}
              />

              <Text fontSize={T.fontSize.xs} color={T.muted} textAlign="center">* Required field</Text>
            </YStack>

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
