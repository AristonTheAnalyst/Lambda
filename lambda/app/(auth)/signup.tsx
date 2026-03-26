import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useAuthContext } from '@/lib/AuthContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { signupSchema, getFieldErrors } from '@/lib/validation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import T from '@/constants/Theme';

export default function SignupScreen() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [cooldown, setCooldown]       = useState(0);
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

  const handleSignup = () => guard(async () => {
    if (cooldown > 0) return;
    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});
    const { error } = await signUp(email, password);
    if (error) { Alert.alert('Signup Failed', error.message); setCooldown(30); }
  });

  const handleGoogle = () => guard(async () => {
    setSocialLoading('google');
    try {
      const { error } = await signInWithGoogle();
      if (error) Alert.alert('Google Sign-In Failed', error.message);
    } finally { setSocialLoading(null); }
  });

  const handleApple = () => guard(async () => {
    setSocialLoading('apple');
    try {
      const { error } = await signInWithApple();
      if (error) Alert.alert('Apple Sign-In Failed', error.message);
    } finally { setSocialLoading(null); }
  });

  const guard = useAsyncGuard();
  const isLoading    = loading || socialLoading !== null;
  const isCoolingDown = cooldown > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack paddingHorizontal={T.space.xl} gap={T.space.lg} paddingBottom={T.space.xxl}>

            <YStack alignItems="center" marginBottom={T.space.xxl} marginTop={T.space.xl}>
              <Text fontSize={32} fontWeight="bold" marginBottom={T.space.sm} color={T.primary}>Lambda</Text>
              <Text fontSize={T.fontSize.lg} color={T.muted}>Create Account</Text>
            </YStack>

            <YStack gap={T.space.lg}>
              {/* Apple Sign-Up (iOS only) */}
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={T.radius.md}
                  style={{ height: 48, borderRadius: T.radius.md, opacity: socialLoading === 'apple' ? 0.6 : 1 }}
                  onPress={handleApple}
                />
              )}

              {/* Google Sign-Up */}
              <XStack
                height={48}
                borderRadius={T.radius.md}
                borderWidth={1}
                borderColor={T.border}
                alignItems="center"
                justifyContent="center"
                backgroundColor={T.surface}
                opacity={socialLoading === 'google' ? 0.6 : 1}
                pressStyle={{ opacity: 0.75 }}
                onPress={isLoading ? undefined : handleGoogle}
                cursor="pointer"
              >
                {socialLoading === 'google'
                  ? <Spinner size="small" color={T.primary} />
                  : <Text color={T.primary} fontSize={T.fontSize.md} fontWeight="600">Continue with Google</Text>
                }
              </XStack>

              <XStack alignItems="center" gap={T.space.sm} marginVertical={T.space.xs}>
                <Separator flex={1} borderColor={T.border} />
                <Text fontSize={T.fontSize.sm} color={T.muted}>or</Text>
                <Separator flex={1} borderColor={T.border} />
              </XStack>

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
                placeholder="Enter password (min 6 characters)"
                error={fieldErrors.password}
                editable={!isLoading}
                secureTextEntry
              />

              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setFieldErrors((e) => ({ ...e, confirmPassword: '' })); }}
                placeholder="Confirm your password"
                error={fieldErrors.confirmPassword}
                editable={!isLoading}
                secureTextEntry
              />

              <Button
                label={isCoolingDown ? `Try again in ${cooldown}s` : 'Sign Up'}
                onPress={handleSignup}
                disabled={isLoading || isCoolingDown}
                loading={loading}
              />

              <XStack justifyContent="center" marginTop={T.space.sm}>
                <Text fontSize={T.fontSize.sm} color={T.muted}>Already have an account? </Text>
                <Link href="/(auth)/login">
                  <Text color={T.accent} fontSize={T.fontSize.sm} fontWeight="600">Login</Text>
                </Link>
              </XStack>
            </YStack>

          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
