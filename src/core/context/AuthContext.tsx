import { createContext, useCallback, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/modules/auth/api/authApi';
import { prefetchSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { isPublicAppPath } from '@/core/publicPaths';
import { disconnectStompClient } from '@/core/socketClient';
import { SESSION_USER_CHANGED_EVENT, setShownUser } from '@/core/sessionUser';
import type { User } from '@/modules/auth/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  checkAuth: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  setUser: (user: User | null) => void;
  /**
   * Ponowny odczyt /auth/me BEZ ekranu „Ładowanie…" (checkAuth go pokazuje i odmontowuje
   * całą aplikację). Np. po odblokowaniu sesji PIN-em w innej karcie - mogła się w niej
   * zalogować inna osoba.
   */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  /**
   * Czyje dane leżą w cache zapytań; `undefined` = start aplikacji, zanim /auth/me odpowie
   * (prefetch statusu pakietu dotyczy tej samej sesji, więc go nie wyrzucamy).
   *
   * Inna osoba = pusty cache. Zgłoszenie 03.11.2026: na wspólnym komputerze właściciel
   * i pracownik przełączają się PIN-em, a cache zapytań przeżywał zmianę osoby - stopka
   * e-mail (5 minut świeżości) i inne dane „moje" pokazywały się następnej osobie jako
   * jej własne, a kreator stopki otwarty na cudzych danych zapisywał je na jej konto.
   * Czyścimy PRZED ustawieniem nowej osoby, żeby żaden render nie zobaczył jej z cudzym
   * cache. Stan komponentów czyści ProtectedRoute (klucz po userId).
   */
  const cacheOwner = useRef<string | null | undefined>(undefined);

  const setUser = useCallback((next: User | null) => {
    const nextId = next?.userId ?? null;
    if (cacheOwner.current !== undefined && cacheOwner.current !== nextId) {
      queryClient.removeQueries();
      if (nextId) void prefetchSubscriptionStatus(queryClient);
    }
    cacheOwner.current = nextId;
    setShownUser(nextId);
    setUserState(next);
  }, [queryClient]);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      // Wywołaj endpoint sprawdzający sesję
      const result = await authApi.checkAuth();
      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user ?? null);
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [setUser]);

  const refreshUser = useCallback(async () => {
    try {
      const result = await authApi.checkAuth();
      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user ?? null);
    } catch {
      /* 401 obsługuje interceptor (redirect na /login) */
    }
  }, [setUser]);

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
    if (!value) {
      setUser(null);
      // Tear down the WebSocket session so subscriptions bound to the
      // previous user/studio do not leak into the next login
      void disconnectStompClient();
    }
  };

  // Sprawdź autentykację przy pierwszym załadowaniu. Status subskrypcji idzie
  // równolegle (opis przy prefetchSubscriptionStatus) - poza stronami publicznymi,
  // na których nikt go nie potrzebuje.
  useEffect(() => {
    if (!isPublicAppPath(window.location.pathname)) {
      void prefetchSubscriptionStatus(queryClient);
    }
    checkAuth();
  }, [queryClient, checkAuth]);

  // Po każdym 403 z API odśwież efektywne uprawnienia (permissions z /auth/me):
  // rola mogła zostać zmieniona w innej sesji, a UI ukrywa to, czego użytkownik
  // nie może zrobić. Debounce chroni przed burstem 403 z jednego widoku.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refreshPermissions = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; }, 5000);
      authApi.checkAuth()
        .then(result => {
          setIsAuthenticated(result.isAuthenticated);
          setUser(result.user ?? null);
        })
        .catch(() => { /* 401 obsługuje interceptor (redirect na /login) */ });
    };
    window.addEventListener('auth:permissions-stale', refreshPermissions);
    return () => {
      window.removeEventListener('auth:permissions-stale', refreshPermissions);
      if (timer) clearTimeout(timer);
    };
  }, [setUser]);

  // Serwer odrzucił zapis, bo w sesji jest już inna osoba (sessionUser.ts) - pokaż ją.
  // Bez debounce'u z effectu wyżej: to jedno zdarzenie po jednym kliknięciu, a nie seria 403.
  useEffect(() => {
    const onUserChanged = () => { void refreshUser(); };
    window.addEventListener(SESSION_USER_CHANGED_EVENT, onUserChanged);
    return () => window.removeEventListener(SESSION_USER_CHANGED_EVENT, onUserChanged);
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        checkAuth,
        setAuthenticated,
        setUser,
        refreshUser,
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
