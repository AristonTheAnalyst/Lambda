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
import { useRouter } from 'expo-router';
import { onboardingSchema, getFieldErrors } from '@/lib/validation';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const inputBg = isDark ? '#333' : '#f5f5f5';

  const handleCompleteOnboarding = async () => {
    const result = onboardingSchema.safeParse({ name: name.trim(), lastname, dateOfBirth, gender, height });
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        Alert.alert('Error', 'User session not found. Please log in again.');
        return;
      }

      const heightCm = height ? parseInt(height, 10) : null;

      const { error } = await supabase
        .from('dim_user')
        .update({
          user_name: name.trim(),
          user_lastname: lastname.trim() || null,
          user_date_of_birth: dateOfBirth || null,
          user_gender: gender || null,
          user_height_cm: heightCm,
          onboarded: true,
        })
        .eq('user_id', userId);

      if (error) {
        Alert.alert('Error', 'Failed to complete onboarding: ' + error.message);
        return;
      }

      // Refresh shared auth state so _layout.tsx sees onboarded=true, then navigate
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>Welcome to Lambda</Text>
            <Text style={[styles.subtitle, { color: textColor }]}>Let's set up your profile</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: textColor }]}>First Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }, fieldErrors.name && styles.inputError]}
                placeholder="Enter your first name"
                placeholderTextColor={isDark ? '#999' : '#ccc'}
                value={name}
                onChangeText={(v) => { setName(v); setFieldErrors((e) => ({ ...e, name: '' })); }}
                editable={!loading}
              />
              {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: textColor }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }, fieldErrors.lastname && styles.inputError]}
                placeholder="Enter your last name (optional)"
                placeholderTextColor={isDark ? '#999' : '#ccc'}
                value={lastname}
                onChangeText={(v) => { setLastname(v); setFieldErrors((e) => ({ ...e, lastname: '' })); }}
                editable={!loading}
              />
              {fieldErrors.lastname ? <Text style={styles.errorText}>{fieldErrors.lastname}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: textColor }]}>Date of Birth</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }, fieldErrors.dateOfBirth && styles.inputError]}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={isDark ? '#999' : '#ccc'}
                value={dateOfBirth}
                onChangeText={(v) => { setDateOfBirth(v); setFieldErrors((e) => ({ ...e, dateOfBirth: '' })); }}
                editable={!loading}
              />
              {fieldErrors.dateOfBirth ? <Text style={styles.errorText}>{fieldErrors.dateOfBirth}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: textColor }]}>Gender</Text>
              <View style={[styles.pickerContainer, { backgroundColor: inputBg }]}>
                <Picker
                  selectedValue={gender}
                  onValueChange={setGender}
                  enabled={!loading}
                  style={{ color: textColor }}
                >
                  <Picker.Item label="Select gender (optional)" value="" />
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: textColor }]}>Height (cm)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textColor }, fieldErrors.height && styles.inputError]}
                placeholder="Enter your height in cm (optional)"
                placeholderTextColor={isDark ? '#999' : '#ccc'}
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
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Setup</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.note, { color: textColor }]}>
              * Required field
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  form: {
    gap: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  errorText: { color: '#e74c3c', fontSize: 13, marginTop: 2 },
  inputError: { borderColor: '#e74c3c' },
});
