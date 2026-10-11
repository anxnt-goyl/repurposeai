import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { settingsService } from '../services/settingsService';
import { getAuthToken } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<boolean>;
  signUp: (name: string, email: string, password?: string) => Promise<boolean>;
  signOut: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify authentication on app launch
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (err) {
        console.warn('[AUTH] Token validation failed:', err);
        authService.logout();
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password?: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const cleanEmail = email.trim();
        const cleanPass = (password && password.trim()) || 'password123';

        const authResponse = await authService.login(cleanEmail, cleanPass);
        setUser(authResponse.user);
        return true;
      } catch (err: any) {
        console.error('[AUTH] Sign in error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signUp = useCallback(
    async (name: string, email: string, password?: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const cleanName = name.trim();
        const cleanEmail = email.trim();
        const cleanPass = (password && password.trim()) || 'password123';

        const authResponse = await authService.signup(cleanName, cleanEmail, cleanPass);
        setUser(authResponse.user);
        return true;
      } catch (err: any) {
        console.error('[AUTH] Sign up error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        const updated = await settingsService.updateProfile(updates);
        setUser(updated);
      } catch (err) {
        console.error('[AUTH] Update profile error:', err);
        throw err;
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
