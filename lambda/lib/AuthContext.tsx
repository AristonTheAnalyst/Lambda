import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import supabase from './supabase';
import { DimUser, AuthUser } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  onboarded: boolean | null;
  profile: DimUser | null;
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

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('dim_user')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    if (!data) {
      // Profile row missing — sign out to reset
      await supabase.auth.signOut();
      return;
    }

    setProfile(data as DimUser);
    setOnboarded(data.onboarded);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await fetchUserProfile(currentSession.user.id);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        if (currentSession?.user) {
          setUser({ id: currentSession.user.id, email: currentSession.user.email || '' });
          await fetchUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUser({ id: currentSession.user.id, email: currentSession.user.email || '' });
        await fetchUserProfile(currentSession.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setOnboarded(null);
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile]);

  // Fallback deep link listener for OAuth callbacks (e.g. magic links, email confirmations)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (url.includes('code=')) {
        await supabase.auth.exchangeCodeForSession(url).catch(() => {});
      }
    };
    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    if (data.user && data.session) {
      await fetchUserProfile(data.user.id);
    }
    return { error: null };
  }, [fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setOnboarded(null);
    }
    return { error: error ?? null };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      // No explicit scheme — in Expo Go this generates exp://..., in a native build it uses lambda://
      const redirectTo = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error };
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success') {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) return { error: sessionError };
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
    <AuthContext.Provider value={{ user, session, loading, onboarded, profile, signUp, signIn, signInWithGoogle, signInWithApple, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
