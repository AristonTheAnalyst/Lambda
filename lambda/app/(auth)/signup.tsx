import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useAuthContext } from '@/lib/AuthContext';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { signupSchema, getFieldErrors } from '@/lib/validation';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAppTheme } from '@/lib/ThemeContext';

export default function SignupScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const { signUp, signInWithGoogle, signInWithApple, loading } = useAuthContext();
  const guard = useAsyncGuard();

  const handleSignup = () => guard(async () => {
    const result = signupSchema.safeParse({ email, password, confirmPassword });
    if (!result.success) { setFieldErrors(getFieldErrors(result.error)); return; }
    setFieldErrors({});
    const { error } = await signUp(email, password);
    if (error) Alert.alert('Signup Failed', error.message);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <YStack flex={1} paddingHorizontal={space.xl}>

          {/* Back button — pinned to top */}
          <XStack paddingTop={space.md}>
            <XStack
              onPress={() => router.back()}
              pressStyle={{ opacity: 0.6 }}
              cursor="pointer"
              alignItems="center"
              gap={space.sm}
            >
              <FontAwesome name="chevron-left" size={14} color={colors.accent} />
              <Text color={colors.accent} fontSize={fontSize.sm}>Back</Text>
            </XStack>
          </XStack>

          {/* Centered content */}
          <YStack flex={1} justifyContent="center">

            {/* Header */}
            <YStack alignItems="center" marginBottom={space.xl}>
              <Text fontSize={32} fontWeight="bold" marginBottom={space.xs} color={colors.primary}>Lambda</Text>
              <Text fontSize={fontSize.lg} color={colors.muted}>Create Account</Text>
            </YStack>

            {/* Form */}
            <YStack gap={space.md}>
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
                label="Sign Up"
                onPress={handleSignup}
                disabled={isLoading}
                loading={loading}
              />

              {/* OR divider */}
              <XStack alignItems="center" gap={space.sm} marginVertical={space.md}>
                <Separator flex={1} borderColor={colors.border} />
                <Text fontSize={fontSize.sm} color={colors.muted}>or</Text>
                <Separator flex={1} borderColor={colors.border} />
              </XStack>

              {/* Social icon buttons */}
              <XStack justifyContent="center" gap={space.lg}>
                <XStack
                  width={56}
                  height={56}
                  borderRadius={radius.md}
                  borderWidth={1}
                  borderColor={colors.border}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={colors.surface}
                  opacity={socialLoading === 'google' ? 0.5 : 1}
                  pressStyle={{ opacity: 0.6 }}
                  onPress={isLoading ? undefined : handleGoogle}
                  cursor="pointer"
                >
                  {socialLoading === 'google'
                    ? <Spinner size="small" color={colors.primary} />
                    : <FontAwesome name="google" size={24} color={colors.primary} />
                  }
                </XStack>

                {Platform.OS === 'ios' && (
                  <XStack
                    width={56}
                    height={56}
                    borderRadius={radius.md}
                    borderWidth={1}
                    borderColor={colors.border}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={colors.surface}
                    opacity={socialLoading === 'apple' ? 0.5 : 1}
                    pressStyle={{ opacity: 0.6 }}
                    onPress={isLoading ? undefined : handleApple}
                    cursor="pointer"
                  >
                    {socialLoading === 'apple'
                      ? <Spinner size="small" color={colors.primary} />
                      : <FontAwesome name="apple" size={26} color={colors.primary} />
                    }
                  </XStack>
                )}
              </XStack>
            </YStack>

          </YStack>
        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
