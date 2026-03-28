import { useState } from 'react';
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
        <YStack flex={1} justifyContent="center" paddingHorizontal={T.space.xl} gap={T.space.lg}>

          {/* Session expired banner */}
          {sessionExpired && (
            <YStack
              backgroundColor={T.accentBg}
              borderColor={T.accent}
              borderWidth={1}
              borderRadius={T.radius.md}
              padding={T.space.md}
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
          <YStack alignItems="center" marginBottom={T.space.xxl}>
            <Text fontSize={32} fontWeight="bold" marginBottom={T.space.sm} color={T.primary}>Lambda</Text>
            <Text fontSize={T.fontSize.lg} color={T.muted}>Login</Text>
          </YStack>

          {/* Form */}
          <YStack gap={T.space.lg}>
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
              label="Login"
              onPress={handleLogin}
              disabled={isLoading}
              loading={loading}
            />

            <XStack alignItems="center" gap={T.space.sm} marginVertical={T.space.xs}>
              <Separator flex={1} borderColor={T.border} />
              <Text fontSize={T.fontSize.sm} color={T.muted}>or</Text>
              <Separator flex={1} borderColor={T.border} />
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
                : <Text color={T.primary} fontSize={T.fontSize.md} fontWeight="600">Sign in with Google</Text>
              }
            </XStack>

            <XStack justifyContent="center" marginTop={T.space.sm}>
              <Text fontSize={T.fontSize.sm} color={T.muted}>Don't have an account? </Text>
              <Link href="/(auth)/signup">
                <Text color={T.accent} fontSize={T.fontSize.sm} fontWeight="600">Sign up</Text>
              </Link>
            </XStack>
          </YStack>

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
