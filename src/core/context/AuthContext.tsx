import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/modules/auth/api/authApi';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      // Wywołaj endpoint sprawdzający sesję
      const result = await authApi.checkAuth();
      console.log('[AuthContext] checkAuth result:', result);
      setIsAuthenticated(result.isAuthenticated);
    } catch (error) {
      console.log('[AuthContext] checkAuth error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
  };

  // Sprawdź autentykację przy pierwszym załadowaniu
  useEffect(() => {
    checkAuth();
  }, []);

  // Nasłuchuj na event unauthorized z interceptora
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('[AuthContext] Received unauthorized event, setting isAuthenticated to false');
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        checkAuth,
        setAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
