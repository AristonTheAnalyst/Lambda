import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
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
    if (sessionExpired) return () => clearSessionExpired();
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

  const isLoading   = loading || socialLoading !== null;
  const isCoolingDown = cooldown > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <YStack flex={1} justifyContent="center" paddingHorizontal="$xl" gap="$lg">

          {/* Session expired banner */}
          {sessionExpired && (
            <YStack
              backgroundColor="$accentBg"
              borderColor="$accent"
              borderWidth={1}
              borderRadius="$md"
              padding="$md"
            >
              <Text color="$accent" fontSize="$sm" textAlign="center">
                Your session expired. Please log in again.
              </Text>
            </YStack>
          )}

          {/* Header */}
          <YStack alignItems="center" marginBottom="$xxl">
            <Text fontSize={32} fontWeight="bold" marginBottom="$sm" color="$color">Lambda</Text>
            <Text fontSize="$lg" color="$muted">Login</Text>
          </YStack>

          {/* Form */}
          <YStack gap="$lg">
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

            <XStack alignItems="center" gap="$sm" marginVertical="$xs">
              <Separator flex={1} borderColor="$borderColor" />
              <Text fontSize="$sm" color="$muted">or</Text>
              <Separator flex={1} borderColor="$borderColor" />
            </XStack>

            {/* Apple Sign-In (iOS only, uses native component) */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={T.radius.md}
                style={{ height: 48, borderRadius: T.radius.md, opacity: socialLoading === 'apple' ? 0.6 : 1 }}
                onPress={handleApple}
              />
            )}

            {/* Google Sign-In */}
            <XStack
              height={48}
              borderRadius="$md"
              borderWidth={1}
              borderColor="$borderColor"
              alignItems="center"
              justifyContent="center"
              backgroundColor="$surface"
              opacity={socialLoading === 'google' ? 0.6 : 1}
              pressStyle={{ opacity: 0.75 }}
              onPress={isLoading ? undefined : handleGoogle}
              cursor="pointer"
            >
              {socialLoading === 'google'
                ? <Spinner size="small" color="$color" />
                : <Text color="$color" fontSize="$md" fontWeight="600">Sign in with Google</Text>
              }
            </XStack>

            <XStack justifyContent="center" marginTop="$sm">
              <Text fontSize="$sm" color="$muted">Don't have an account? </Text>
              <Link href="/(auth)/signup">
                <Text color="$accent" fontSize="$sm" fontWeight="600">Sign up</Text>
              </Link>
            </XStack>
          </YStack>

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
