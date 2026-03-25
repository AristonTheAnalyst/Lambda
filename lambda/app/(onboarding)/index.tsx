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
import { useRouter } from 'expo-router';
import { onboardingSchema, getFieldErrors } from '@/lib/validation';
import { DropdownSelect } from '@/components/FormControls';
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
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                placeholder="Enter your first name"
                placeholderTextColor={T.muted}
                value={name}
                onChangeText={(v) => { setName(v); setFieldErrors((e) => ({ ...e, name: '' })); }}
                editable={!loading}
              />
              {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, fieldErrors.lastname && styles.inputError]}
                placeholder="Enter your last name (optional)"
                placeholderTextColor={T.muted}
                value={lastname}
                onChangeText={(v) => { setLastname(v); setFieldErrors((e) => ({ ...e, lastname: '' })); }}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.input, fieldErrors.dateOfBirth && styles.inputError]}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={T.muted}
                value={dateOfBirth}
                onChangeText={(v) => { setDateOfBirth(v); setFieldErrors((e) => ({ ...e, dateOfBirth: '' })); }}
                editable={!loading}
              />
              {fieldErrors.dateOfBirth ? <Text style={styles.errorText}>{fieldErrors.dateOfBirth}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <DropdownSelect
                options={GENDER_OPTIONS}
                value={gender}
                onChange={setGender}
                placeholder="Select gender (optional)"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={[styles.input, fieldErrors.height && styles.inputError]}
                placeholder="Enter your height in cm (optional)"
                placeholderTextColor={T.muted}
                value={height}
                onChangeText={(v) => { setHeight(v); setFieldErrors((e) => ({ ...e, height: '' })); }}
                keyboardType="number-pad"
                editable={!loading}
              />
              {fieldErrors.height ? <Text style={styles.errorText}>{fieldErrors.height}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.button, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleCompleteOnboarding}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={T.accentText} />
              ) : (
                <Text style={styles.buttonText}>Complete Setup</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.note}>* Required field</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: T.primary },
  subtitle: { fontSize: 16, color: T.muted },
  form: { gap: 20, paddingBottom: 40 },
  inputContainer: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: T.primary },
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
  inputError: { borderColor: T.danger },
  button: {
    backgroundColor: T.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: T.accentText, fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, color: T.muted, textAlign: 'center' },
  errorText: { color: T.danger, fontSize: 13, marginTop: 2 },
});
