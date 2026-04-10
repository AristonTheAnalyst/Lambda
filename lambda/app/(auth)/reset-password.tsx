import { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text, YStack } from 'tamagui';
import supabase from '@/lib/supabase';
import { useAsyncGuard } from '@/lib/asyncGuard';
import { useAuthContext } from '@/lib/AuthContext';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAppTheme } from '@/lib/ThemeContext';

export default function ResetPasswordScreen() {
  const { colors, space, radius, fontSize } = useAppTheme();
  const router = useRouter();
  const guard = useAsyncGuard();
  const { clearPasswordRecovery } = useAuthContext();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Block hardware back button (Android)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCancel = () => guard(async () => {
    Alert.alert(
      'Cancel reset?',
      'You will be signed out. Your password will remain unchanged.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            clearPasswordRecovery();
            await supabase.auth.signOut();
          },
        },
      ]
    );
  });

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <YStack flex={1} justifyContent="center" paddingHorizontal={space.xl} gap={space.lg}>

          <YStack alignItems="center" marginBottom={space.xl}>
            <Text fontSize={fontSize.xxl} fontWeight="bold" color={colors.primary} marginBottom={space.sm}>
              New Password
            </Text>
            <Text fontSize={fontSize.md} color={colors.muted} textAlign="center">
              {done
                ? 'Your password has been updated.'
                : 'Choose a new password for your account.'}
            </Text>
          </YStack>

          {!done && ready && (
            <YStack gap={space.md}>
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
              <Button label="Cancel" onPress={handleCancel} variant="danger-ghost" disabled={loading} />
            </YStack>
          )}

          {!done && !ready && (
            <Text color={colors.muted} fontSize={fontSize.sm} textAlign="center">
              Opening reset link…
            </Text>
          )}

          {done && (
            <Button label="Continue" onPress={() => router.replace('/(tabs)/')} />
          )}

        </YStack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
