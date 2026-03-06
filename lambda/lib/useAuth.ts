import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from './supabase';
import { DimUser, AuthUser } from '@/types/database';

interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  onboarded: boolean | null;
  profile: DimUser | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<DimUser | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            user_metadata: currentSession.user.user_metadata,
          });
          // Fetch user profile
          await fetchUserProfile(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);

      if (currentSession?.user) {
        setUser({
          id: currentSession.user.id,
          email: currentSession.user.email || '',
          user_metadata: currentSession.user.user_metadata,
        });
        await fetchUserProfile(currentSession.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setOnboarded(null);
      }

      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('dim_user')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // returns null instead of error when 0 rows

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        // Profile row missing (e.g. user deleted from DB) — sign out to reset state
        await supabase.auth.signOut();
        return;
      }

      setProfile(data as DimUser);
      setOnboarded(data.onboarded);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          return { error };
        }

        // Profile is created automatically via database trigger (handle_new_user)
        if (data.user && data.session) {
          // Session exists (email confirmation disabled) — fetch profile
          await fetchUserProfile(data.user.id);
        }

        return { error: null };
      } catch (error) {
        console.error('Signup error:', error);
        return { error: error instanceof Error ? error : new Error('Sign up failed') };
      } finally {
        setLoading(false);
      }
    },
    [fetchUserProfile]
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      try {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error };
        }

        return { error: null };
      } catch (error) {
        console.error('Sign in error:', error);
        return { error: error instanceof Error ? error : new Error('Sign in failed') };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error };
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      setOnboarded(null);

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error instanceof Error ? error : new Error('Sign out failed') };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    session,
    loading,
    onboarded,
    profile,
    signUp,
    signIn,
    signOut,
  };
}
