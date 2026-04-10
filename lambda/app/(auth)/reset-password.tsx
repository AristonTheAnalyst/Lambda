import { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { useAuthContext } from '@/lib/AuthContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import T from '@/constants/Theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const guard = useAsyncGuard();
  const { clearPasswordRecovery } = useAuthContext();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = () => guard(async () => {
    if (password.length < 6) { Alert.alert('Password must be at least 6 characters'); return; }
    if (password !== confirm) { Alert.alert('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { Alert.alert('Error', error.message); return; }
      clearPasswordRecovery();
      setDone(true);
    } finally {
      setLoading(false);
    }
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <YStack flex={1} justifyContent="center" paddingHorizontal={T.space.xl} gap={T.space.lg}>

          <YStack alignItems="center" marginBottom={T.space.xl}>
            <Text fontSize={T.fontSize.xxl} fontWeight="bold" color={T.primary} marginBottom={T.space.sm}>
              New Password
            </Text>
            <Text fontSize={T.fontSize.md} color={T.muted} textAlign="center">
              {done
                ? 'Your password has been updated.'
                : 'Choose a new password for your account.'}
            </Text>
          </YStack>

          {!done && ready && (
            <YStack gap={T.space.lg}>
              <Input
                label="New Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                editable={!loading}
                secureTextEntry
              />
              <Input
                label="Confirm Password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat new password"
                editable={!loading}
                secureTextEntry
              />
              <Button label="Update Password" onPress={handleReset} loading={loading} disabled={loading} />
            </YStack>
          )}

          {!done && !ready && (
            <Text color={T.muted} fontSize={T.fontSize.sm} textAlign="center">
              Opening reset link…
            </Text>
          )}

          {done && (
            <Button label="Back to Login" onPress={() => router.replace('/(auth)/login')} />
          )}

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
