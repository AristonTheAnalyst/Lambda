import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
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
    console.log('[Auth] fetchUserProfile called for:', userId);
    const { data, error } = await supabase
      .from('dim_user')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[Auth] fetchUserProfile result:', { data: !!data, error, onboarded: data?.onboarded });

    if (error) {
      console.error('[Auth] Error fetching profile:', error);
      return;
    }

    if (!data) {
      console.warn('[Auth] No dim_user row found — signing out');
      await supabase.auth.signOut();
      return;
    }

    setProfile(data as DimUser);
    setOnboarded(data.onboarded);
    console.log('[Auth] Profile loaded, onboarded:', data.onboarded);
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
      console.log('[Auth] AUTH STATE CHANGE:', _event);
      console.log('[Auth] Session user:', currentSession?.user?.email || 'No user');
      setSession(currentSession);
      if (currentSession?.user) {
        setUser({ id: currentSession.user.id, email: currentSession.user.email || '' });
        await fetchUserProfile(currentSession.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setOnboarded(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, [fetchUserProfile]);

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

  // Handle deep links from OAuth redirects
  useEffect(() => {
    const processUrl = async (url: string) => {
      console.log('[Auth] processUrl called with:', url);
      // Check for access_token in fragment (implicit flow)
      if (url.includes('#access_token=')) {
        console.log('[Auth] Found access_token in fragment (implicit flow)');
        const fragment = url.split('#')[1];
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token') ?? '';
        if (accessToken) {
          console.log('[Auth] Setting session with access token...');
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          console.log('[Auth] setSession result error:', error);
        }
        return;
      }
      // Check for code in query params (PKCE flow)
      if (url.includes('code=')) {
        console.log('[Auth] Found code in query params (PKCE flow)');
        const queryStart = url.indexOf('?');
        if (queryStart >= 0) {
          const params = new URLSearchParams(url.substring(queryStart));
          const code = params.get('code');
          if (code) {
            console.log('[Auth] Exchanging code for session...');
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            console.log('[Auth] exchangeCodeForSession error:', error);
          }
        }
      } else {
        console.log('[Auth] URL has no token or code — ignored');
      }
    };

    // Handle URLs that opened the app while it was closed
    Linking.getInitialURL().then((url) => {
      console.log('[Auth] getInitialURL:', url);
      if (url) processUrl(url);
    });

    // Handle URLs received while the app is open
    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log('[Auth] Linking url event:', url);
      processUrl(url);
    });
    return () => sub.remove();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      console.log('=== GOOGLE OAUTH START ===');
      const redirectTo = Linking.createURL('/');
      console.log('[Auth] redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      console.log('[Auth] OAuth URL:', data?.url);
      console.log('[Auth] OAuth error:', error);

      if (error || !data.url) return { error: error ?? new Error('No OAuth URL') };

      console.log('[Auth] Opening auth session...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('[Auth] WebBrowser result type:', result.type);
      if (result.type === 'success') {
        console.log('[Auth] WebBrowser success URL:', result.url);

        // Process tokens from the returned URL
        const url = result.url;
        if (url.includes('#access_token=')) {
          const fragment = url.split('#')[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token') ?? '';
          if (accessToken) {
            console.log('[Auth] Setting session from returned URL (non-blocking)...');
            // Don't await — setSession blocks until onAuthStateChange callbacks finish,
            // which includes fetchUserProfile. Fire-and-forget so the UI unblocks.
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }).then(({ error: setErr }) => {
              if (setErr) console.error('[Auth] setSession error:', setErr);
              else console.log('[Auth] Session set successfully');
            });
          }
        } else if (url.includes('code=')) {
          const queryStart = url.indexOf('?');
          if (queryStart >= 0) {
            const params = new URLSearchParams(url.substring(queryStart));
            const code = params.get('code');
            if (code) {
              console.log('[Auth] Exchanging code for session (non-blocking)...');
              supabase.auth.exchangeCodeForSession(code).then(({ error: codeErr }) => {
                if (codeErr) console.error('[Auth] exchangeCodeForSession error:', codeErr);
              });
            }
          }
        }
      } else {
        console.log('[Auth] WebBrowser result (non-success):', JSON.stringify(result));
        return { error: null };
      }

      console.log('=== GOOGLE OAUTH END ===');

      return { error: null };
    } catch (err) {
      console.error('[Auth] Exception during Google OAuth:', err);
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
