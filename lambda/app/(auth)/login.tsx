import { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthContext } from '@/lib/AuthContext';
import { withGuard } from '@/lib/asyncGuard';
import { loginSchema, getFieldErrors } from '@/lib/validation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import T from '@/constants/Theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { signIn, signInWithGoogle, signInWithApple, loading, sessionExpired, clearSessionExpired } = useAuthContext();

  useEffect(() => {
    if (sessionExpired) {
      return () => clearSessionExpired();
    }
  }, []);

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

  const handleLogin = () => withGuard(async () => {
    if (cooldown > 0) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});
    const { error } = await signIn(email, password);
    if (error) { Alert.alert('Login Failed', error.message); setCooldown(30); }
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
        {sessionExpired && (
          <View style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>Your session expired. Please log in again.</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Lambda</Text>
          <Text style={styles.subtitle}>Login</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, email: '' })); }}
            placeholder="Enter your email"
            error={fieldErrors.email}
            editable={!isLoading}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: '' })); }}
            placeholder="Enter your password"
            error={fieldErrors.password}
            editable={!isLoading}
            secureTextEntry
          />

          <Button
            label={isCoolingDown ? `Try again in ${cooldown}s` : 'Login'}
            onPress={handleLogin}
            disabled={isLoading || isCoolingDown}
            loading={loading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={T.radius.md}
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
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup">
              <Text style={styles.link}>Sign up</Text>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: T.space.xl },
  header: { marginBottom: T.space.xxl, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: T.space.sm, color: T.primary },
  subtitle: { fontSize: T.fontSize.lg, color: T.muted },
  form: { gap: T.space.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: T.space.sm, marginVertical: T.space.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerText: { fontSize: T.fontSize.sm, color: T.muted },
  appleButton: { height: 48, borderRadius: T.radius.md },
  googleButton: {
    height: 48,
    borderRadius: T.radius.md,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surface,
  },
  googleButtonText: { color: T.primary, fontSize: T.fontSize.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: T.space.sm },
  footerText: { fontSize: T.fontSize.sm, color: T.muted },
  link: { color: T.accent, fontSize: T.fontSize.sm, fontWeight: '600' },
  expiredBanner: {
    backgroundColor: T.accentBg,
    borderColor: T.accent,
    borderWidth: 1,
    borderRadius: T.radius.md,
    padding: T.space.md,
    marginBottom: T.space.lg,
  },
  expiredBannerText: { color: T.accent, fontSize: T.fontSize.sm, textAlign: 'center' },
});
