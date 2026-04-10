import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useAuthContext } from '@/lib/AuthContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { loginSchema, getFieldErrors } from '@/lib/validation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import T from '@/constants/Theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { signIn, signInWithGoogle, signInWithApple, loading, sessionExpired, clearSessionExpired } = useAuthContext();
  const guard = useAsyncGuard();

  const handleLogin = () => guard(async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});
    const { error } = await signIn(email, password);
    if (error) Alert.alert('Login Failed', error.message);
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

  const isLoading = loading || socialLoading !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <YStack flex={1} justifyContent="center" paddingHorizontal={T.space.xl}>

          {/* Session expired banner */}
          {sessionExpired && (
            <YStack
              backgroundColor={T.accentBg}
              borderColor={T.accent}
              borderWidth={1}
              borderRadius={T.radius.md}
              padding={T.space.md}
              marginBottom={T.space.lg}
              pressStyle={{ opacity: 0.8 }}
              onPress={clearSessionExpired}
              cursor="pointer"
            >
              <Text color={T.accent} fontSize={T.fontSize.sm} textAlign="center">
                Your session expired. Please log in again.
              </Text>
            </YStack>
          )}

          {/* Header */}
          <YStack alignItems="center" marginBottom={T.space.xl}>
            <Text fontSize={32} fontWeight="bold" marginBottom={T.space.xs} color={T.primary}>Lambda</Text>
            <Text fontSize={T.fontSize.lg} color={T.muted}>Sign in</Text>
          </YStack>

          {/* Form */}
          <YStack gap={T.space.md}>
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

            <XStack justifyContent="space-between" alignItems="center">
              <Link href="/(auth)/forgot-password">
                <Text color={T.accent} fontSize={T.fontSize.sm}>Forgot password?</Text>
              </Link>
              <Link href="/(auth)/signup">
                <Text color={T.accent} fontSize={T.fontSize.sm} fontWeight="600">Sign up</Text>
              </Link>
            </XStack>

            <Button
              label="Sign in"
              onPress={handleLogin}
              disabled={isLoading}
              loading={loading}
            />

            <XStack alignItems="center" gap={T.space.sm} marginVertical={T.space.md}>
              <Separator flex={1} borderColor={T.border} />
              <Text fontSize={T.fontSize.sm} color={T.muted}>or</Text>
              <Separator flex={1} borderColor={T.border} />
            </XStack>

            {/* Social sign-in icon buttons */}
            <XStack justifyContent="center" gap={T.space.lg}>
              {/* Google */}
              <XStack
                width={56}
                height={56}
                borderRadius={T.radius.md}
                borderWidth={1}
                borderColor={T.border}
                alignItems="center"
                justifyContent="center"
                backgroundColor={T.surface}
                opacity={socialLoading === 'google' ? 0.5 : 1}
                pressStyle={{ opacity: 0.6 }}
                onPress={isLoading ? undefined : handleGoogle}
                cursor="pointer"
              >
                {socialLoading === 'google'
                  ? <Spinner size="small" color={T.primary} />
                  : <FontAwesome name="google" size={24} color={T.primary} />
                }
              </XStack>

              {/* Apple (iOS only) */}
              {Platform.OS === 'ios' && (
                <XStack
                  width={56}
                  height={56}
                  borderRadius={T.radius.md}
                  borderWidth={1}
                  borderColor={T.border}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={T.surface}
                  opacity={socialLoading === 'apple' ? 0.5 : 1}
                  pressStyle={{ opacity: 0.6 }}
                  onPress={isLoading ? undefined : handleApple}
                  cursor="pointer"
                >
                  {socialLoading === 'apple'
                    ? <Spinner size="small" color={T.primary} />
                    : <FontAwesome name="apple" size={26} color={T.primary} />
                  }
                </XStack>
              )}
            </XStack>

          </YStack>

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
