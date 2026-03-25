import { useState, useEffect, useRef } from 'react';
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
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthContext } from '@/lib/AuthContext';
import { withGuard } from '@/lib/asyncGuard';
import { signupSchema, getFieldErrors } from '@/lib/validation';
import T from '@/constants/Theme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { signUp, signInWithGoogle, signInWithApple, loading } = useAuthContext();

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current!);
  }, [cooldown > 0]);

  const handleSignup = () => withGuard(async () => {
    if (cooldown > 0) return;
    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});
    const { error } = await signUp(email, password);
    if (error) { Alert.alert('Signup Failed', error.message); setCooldown(30); }
  });

  const handleGoogle = () => withGuard(async () => {
    setSocialLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) Alert.alert('Google Sign-In Failed', error.message);
    } finally { setSocialLoading(null); }
  });

  const handleApple = () => withGuard(async () => {
    setSocialLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) Alert.alert('Apple Sign-In Failed', error.message);
    } finally { setSocialLoading(null); }
  });

  const isLoading = loading || socialLoading !== null;
  const isCoolingDown = cooldown > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Lambda</Text>
            <Text style={styles.subtitle}>Create Account</Text>
          </View>

          <View style={styles.form}>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={[styles.appleButton, { opacity: socialLoading === 'apple' ? 0.6 : 1 }]}
                onPress={handleApple}
              />
            )}

            <TouchableOpacity
              style={[styles.googleButton, { opacity: socialLoading === 'google' ? 0.6 : 1 }]}
              onPress={handleGoogle}
              disabled={isLoading}>
              {socialLoading === 'google' ? (
                <ActivityIndicator color={T.primary} />
              ) : (
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, fieldErrors.email && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor={T.muted}
                value={email}
                onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, email: '' })); }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
              {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, fieldErrors.password && styles.inputError]}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor={T.muted}
                value={password}
                onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: '' })); }}
                secureTextEntry
                editable={!isLoading}
              />
              {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
                placeholder="Confirm your password"
                placeholderTextColor={T.muted}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setFieldErrors((e) => ({ ...e, confirmPassword: '' })); }}
                secureTextEntry
                editable={!isLoading}
              />
              {fieldErrors.confirmPassword ? <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.button, { opacity: isLoading || isCoolingDown ? 0.6 : 1 }]}
              onPress={handleSignup}
              disabled={isLoading || isCoolingDown}>
              {loading ? (
                <ActivityIndicator color={T.accentText} />
              ) : isCoolingDown ? (
                <Text style={styles.buttonText}>Try again in {cooldown}s</Text>
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login">
                <Text style={styles.link}>Login</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: T.primary },
  subtitle: { fontSize: 18, color: T.muted },
  form: { gap: 16 },
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
    marginTop: 4,
  },
  buttonText: { color: T.accentText, fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontSize: 13, color: T.muted },
  appleButton: { height: 48, borderRadius: 8 },
  googleButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
  },
  googleButtonText: { color: T.primary, fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { fontSize: 14, color: T.muted },
  link: { color: T.accent, fontSize: 14, fontWeight: '600' },
  errorText: { color: T.danger, fontSize: 13, marginTop: 2 },
});
