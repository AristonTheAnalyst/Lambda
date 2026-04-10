import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAppTheme } from '@/lib/ThemeContext';

export default function ForgotPasswordScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const guard = useAsyncGuard();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => guard(async () => {
    const trimmed = email.trim();
    if (!trimmed) { Alert.alert('Enter your email address'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'lambda://reset-password',
      });
      if (error) { Alert.alert('Error', error.message); return; }
      setSent(true);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <YStack flex={1} justifyContent="center" paddingHorizontal={space.xl} gap={space.lg}>

          <YStack alignItems="center" marginBottom={space.xl}>
            <Text fontSize={fontSize.xxl} fontWeight="bold" color={colors.primary} marginBottom={space.sm}>
              Reset Password
            </Text>
            <Text fontSize={fontSize.md} color={colors.muted} textAlign="center">
              {sent
                ? "Check your email for a reset link."
                : "Enter your email and we'll send you a reset link."}
            </Text>
          </YStack>

          {!sent && (
            <YStack gap={space.lg}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                editable={!loading}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Button label="Send Reset Link" onPress={handleSend} loading={loading} disabled={loading} />
            </YStack>
          )}

          <Button label="Back to Login" onPress={() => router.back()} variant="ghost" />

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
