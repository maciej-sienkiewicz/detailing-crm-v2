import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/modules/auth/api/authApi';
import type { User } from '@/modules/auth/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  checkAuth: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] Sprawdzanie autentykacji...');
      // Wywołaj endpoint sprawdzający sesję
      const result = await authApi.checkAuth();
      console.log('[AuthContext] Wynik sprawdzenia:', result);
      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user ?? null);
    } catch (error) {
      console.error('[AuthContext] Błąd podczas sprawdzania autentykacji:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
    if (!value) {
      setUser(null);
    }
  };

  // Sprawdź autentykację przy pierwszym załadowaniu
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        checkAuth,
        setAuthenticated,
        setUser,
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
