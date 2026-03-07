import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { useAuthContext } from '@/lib/AuthContext';
import { useColorScheme } from '@/hooks';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithApple, loading } = useAuthContext();
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? '#1a1a1a' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const inputBg = isDark ? '#333' : '#f5f5f5';
  const dividerColor = isDark ? '#444' : '#ddd';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const { error } = await signIn(email, password);
    if (error) Alert.alert('Login Failed', error.message);
  };

  const handleGoogle = async () => {
    setSocialLoading('google');
    const { error } = await signInWithGoogle();
    setSocialLoading(null);
    if (error) Alert.alert('Google Sign-In Failed', error.message);
  };

  const handleApple = async () => {
    setSocialLoading('apple');
    const { error } = await signInWithApple();
    setSocialLoading(null);
    if (error) Alert.alert('Apple Sign-In Failed', error.message);
  };

  const isLoading = loading || socialLoading !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>Lambda</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>Login</Text>
        </View>

        <View style={styles.form}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleButton, { opacity: socialLoading === 'apple' ? 0.6 : 1 }]}
              onPress={handleApple}
              disabled={isLoading}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.googleButton, { opacity: socialLoading === 'google' ? 0.6 : 1 }]}
            onPress={handleGoogle}
            disabled={isLoading}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color="#444" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
            <Text style={[styles.dividerText, { color: dividerColor }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Enter your email"
              placeholderTextColor={isDark ? '#999' : '#ccc'}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: textColor }]}>Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
              placeholder="Enter your password"
              placeholderTextColor={isDark ? '#999' : '#ccc'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: textColor }]}>Don't have an account? </Text>
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
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 18, opacity: 0.6 },
  form: { gap: 16 },
  appleButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleButtonText: { color: '#444', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  inputContainer: { gap: 8 },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { fontSize: 14 },
  link: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
});
