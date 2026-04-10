import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import supabase from './supabase';
import { getSecureStorage } from './storage';
import { DimUser, AuthUser } from '@/types/database';

// ─── Profile cache (SecureStore) ─────────────────────────────────────────────
// Caches the user profile in SecureStore (iOS Keychain / Android Keystore) so
// the app can start fully offline after the first login. Falls back to
// AsyncStorage in Expo Go. Keyed by user ID so multi-account devices work.

const profileCacheKey = (userId: string) => `lambda_profile_${userId}`;

async function loadCachedProfile(userId: string): Promise<DimUser | null> {
  try {
    const raw = await getSecureStorage().getItem(profileCacheKey(userId));
    return raw ? (JSON.parse(raw) as DimUser) : null;
  } catch {
    return null;
  }
}

async function saveProfileCache(userId: string, profile: DimUser): Promise<void> {
  try {
    await getSecureStorage().setItem(profileCacheKey(userId), JSON.stringify(profile));
  } catch {}
}

async function clearProfileCache(userId: string): Promise<void> {
  try {
    await getSecureStorage().removeItem(profileCacheKey(userId));
  } catch {}
}

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  onboarded: boolean | null;
  profile: DimUser | null;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<DimUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const explicitSignOut = useRef(false);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    // 1. Load from cache first — unblocks navigation immediately when offline
    const cached = await loadCachedProfile(userId);
    if (cached) {
      setProfile(cached);
      setOnboarded(cached.onboarded);
    }

    // 2. Fetch fresh data from Supabase in the background
    const { data, error } = await supabase
      .from('dim_user')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // Offline or transient error — keep using cached values
      console.error('[Auth] Error fetching profile:', error);
      return;
    }

    if (!data) {
      // Server is reachable but profile doesn't exist — only sign out if
      // there is no cached profile (i.e. this isn't just a network blip)
      if (!cached) await supabase.auth.signOut();
      return;
    }

    // 3. Persist fresh data and update state
    await saveProfileCache(userId, data as DimUser);
    setProfile(data as DimUser);
    setOnboarded(data.onboarded);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await fetchUserProfile(currentSession.user.id);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.id);
    } else {
      setProfile(null);
      setOnboarded(null);
    }
  }, [user?.id, fetchUserProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Deep link from reset email — let reset-password screen handle the token via useURL()
        setLoading(false);
        return;
      }
      setSession(currentSession);
      if (currentSession?.user) {
        setUser({ id: currentSession.user.id, email: currentSession.user.email || '' });
      } else {
        if (event === 'SIGNED_OUT' && !explicitSignOut.current) {
          setSessionExpired(true);
        }
        explicitSignOut.current = false;
        setUser(null);
      }
      if (event === 'INITIAL_SESSION') {
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile]);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    // Supabase returns a fake success for existing emails (no session, no email confirmation)
    if (data.user && !data.session && data.user.identities?.length === 0) {
      return { error: new Error('An account with this email already exists') };
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    explicitSignOut.current = true;
    const userId = user?.id;
    const { error } = await supabase.auth.signOut();
    if (!error) {
      if (userId) await clearProfileCache(userId);
      setUser(null);
      setSession(null);
      setProfile(null);
      setOnboarded(null);
    } else {
      explicitSignOut.current = false;
    }
    return { error: error ?? null };
  }, [user]);

  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      const redirectTo = Platform.OS === 'web'
        ? window.location.origin
        : Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (error || !data.url) return { error: error ?? new Error('No OAuth URL') };

      // On web, Supabase handles the redirect automatically (skipBrowserRedirect: false)
      if (Platform.OS === 'web') return { error: null };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const url = result.url;
        if (url.includes('#access_token=')) {
          const fragment = url.split('#')[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token') ?? '';
          if (accessToken) {
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }).catch((err) => console.error('[Auth] setSession error:', err));
          }
        } else if (url.includes('code=')) {
          const queryStart = url.indexOf('?');
          if (queryStart >= 0) {
            const params = new URLSearchParams(url.substring(queryStart));
            const code = params.get('code');
            if (code) {
              supabase.auth.exchangeCodeForSession(code)
                .catch((err) => console.error('[Auth] exchangeCode error:', err));
            }
          }
        }
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Google sign-in failed') };
    }
  }, []);

  const signInWithApple = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
      });
      return { error: error ?? null };
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: err instanceof Error ? err : new Error('Apple sign-in failed') };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, onboarded, profile, sessionExpired, clearSessionExpired, signUp, signIn, signInWithGoogle, signInWithApple, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
