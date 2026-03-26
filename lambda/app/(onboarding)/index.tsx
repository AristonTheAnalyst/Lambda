import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import supabase from '@/lib/supabase';
import { useAuthContext } from '@/lib/AuthContext';
import { useRouter } from 'expo-router';
import { onboardingSchema, getFieldErrors } from '@/lib/validation';
import { DropdownSelect } from '@/components/FormControls';
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

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { refreshProfile } = useAuthContext();
  const router = useRouter();

  const handleCompleteOnboarding = async () => {
    const result = onboardingSchema.safeParse({ name: name.trim(), lastname, dateOfBirth, gender, height });
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
          onboarded: true,
        })
        .eq('user_id', userId);

      if (error) { Alert.alert('Error', 'Failed to complete onboarding: ' + error.message); return; }
      await refreshProfile();
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Lambda</Text>
            <Text style={styles.subtitle}>Let's set up your profile</Text>
          </View>

          <View style={styles.form}>
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <DatePickerField
                value={dateOfBirth}
                onChangeDate={(v) => { setDateOfBirth(v); setFieldErrors((e) => ({ ...e, dateOfBirth: '' })); }}
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <DropdownSelect
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
                placeholder="Select gender (optional)"
              />
            </View>

            <Input
              label="Height (cm)"
              value={height}
              onChangeText={(v) => { setHeight(v); setFieldErrors((e) => ({ ...e, height: '' })); }}
              placeholder="Enter your height in cm (optional)"
              error={fieldErrors.height}
              keyboardType="number-pad"
              editable={!loading}
            />

            <Button
              label="Complete Setup"
              onPress={handleCompleteOnboarding}
              loading={loading}
              disabled={loading}
            />

            <Text style={styles.note}>* Required field</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, paddingHorizontal: T.space.xl, paddingTop: T.space.xl },
  header: { marginBottom: T.space.xxl, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: T.space.sm, color: T.primary },
  subtitle: { fontSize: T.fontSize.md, color: T.muted },
  form: { gap: T.space.lg, paddingBottom: T.space.xxl },
  fieldGroup: { gap: T.space.xs },
  fieldLabel: { fontSize: T.fontSize.sm, fontWeight: '600', color: T.primary },
  note: { fontSize: T.fontSize.xs, color: T.muted, textAlign: 'center' },
});
