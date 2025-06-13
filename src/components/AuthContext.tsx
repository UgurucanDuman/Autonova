import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase, signUp } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe: boolean, isCorporate?: boolean, phone?: string, companyName?: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, isCorporate?: boolean, companyDetails?: { companyName: string; taxNumber: string; phone: string; registrationNumber?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean, isCorporate = false, phone?: string, companyName?: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password,
        options: {
          // Set session expiration based on rememberMe
          expiresIn: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days or 1 day
        }
      });
      
      if (error) throw error;

      // Store the auth token in localStorage if rememberMe is true
      if (rememberMe && data.session) {
        localStorage.setItem('sb-auth-token', data.session.access_token);
      } else {
        // Remove any stored token if rememberMe is false
        localStorage.removeItem('sb-auth-token');
      }

      // Set the user state immediately
      setUser(data.user);

      // Update user profile with corporate status and phone if provided
      if (isCorporate && data.user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            is_corporate: true,
            phone: phone,
            company_name: companyName
          })
          .eq('id', data.user.id);

        if (updateError) throw updateError;
      }

      // Check if there's a return path after login
      const state = location.state as { returnTo?: string } | undefined;
      
      // Add a small delay to ensure the user state is properly set
      setTimeout(() => {
        navigate(state?.returnTo || '/');
      }, 500);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string, isCorporate = false, companyDetails?: { companyName: string; taxNumber: string; phone: string; registrationNumber?: string }) => {
    try {
      const result = await signUp(email, password, fullName, isCorporate, companyDetails);

      if (isCorporate && companyDetails) {
        // For corporate users, automatically sign in
        await signIn(email, password, true, true, companyDetails.phone, companyDetails.companyName);
        return;
      }

      // For non-corporate users, redirect to login
      navigate('/login', {
        state: {
          message: 'Kayıt başarılı! Lütfen giriş yapın.'
        }
      });
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First clear all auth-related data from localStorage
      const keysToRemove = [
        'sb-auth-token',
        'supabase.auth.token',
        'adminSession',
        'sb-access-token',
        'sb-refresh-token',
        // Add any other auth-related keys that might exist
        'supabase.auth.refreshToken',
        'supabase.auth.accessToken',
        'sb-provider-token',
        'sb-session'
      ];

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove ${key} from localStorage:`, e);
        }
      });

      // Clear user state before attempting to sign out
      setUser(null);

      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        try {
          const { error } = await supabase.auth.signOut({
            scope: 'local' // Only clear the current tab's session
          });
          if (error) {
            console.warn('Sign out API call failed:', error);
            // Continue with navigation even if API call fails
          }
        } catch (signOutError) {
          console.warn('Error during sign out API call:', signOutError);
          // Continue with navigation even if API call fails
        }
      }

      // Clear any remaining Supabase session data
      try {
        await supabase.auth.clearSession();
      } catch (clearError) {
        console.warn('Error clearing session:', clearError);
      }

      // Always navigate to login page, regardless of API call success
      navigate('/login');
    } catch (error) {
      console.warn('Error during sign out cleanup:', error);
      // Ensure we still navigate to login even if there's an error
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp: handleSignUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);