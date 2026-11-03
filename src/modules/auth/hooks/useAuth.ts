// src/modules/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupCredentials } from '../types';
import { useAuth as useAuthContext } from '@/core/context/AuthContext';
import { announceUnlock } from '@/core/sessionLock';

export const useLogin = () => {
    const navigate = useNavigate();
    const { setAuthenticated, setUser } = useAuthContext();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
        onSuccess: (data) => {
            // Fresh password login clears any stale idle-lock flag
            sessionStorage.removeItem('crm_session_locked');
            setAuthenticated(true);
            if (data.user) {
                setUser(data.user);
            }
            // Ciasteczko sesji jest wspólne dla kart: logowanie na inne konto podmienia
            // osobę także w karcie otwartej obok, która dalej pokazywała poprzednią i jej
            // zapisy (np. stopka e-mail) szły na nowe konto. Ten sam sygnał co po PIN-ie -
            // inne karty pytają /auth/me, kto jest teraz zalogowany.
            announceUnlock();

            if (data.redirectUrl) {
                navigate(data.redirectUrl);
            }
        },
    });
};

export const useSignup = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (credentials: SignupCredentials) => authApi.signup(credentials),
        onSuccess: () => {
            // Przekieruj na stronę logowania z komunikatem o pomyślnej rejestracji
            navigate('/login', {
                state: {
                    message: 'Konto założone. Możesz się zalogować.'
                }
            });
        },
    });
};

export const useForgotPassword = () => {
    return useMutation({
        mutationFn: (data: { email: string }) => authApi.forgotPassword(data),
    });
};

export const useResetPassword = () => {
    return useMutation({
        mutationFn: (data: import('../types').ResetPasswordRequest) => authApi.resetPassword(data),
    });
};

export const useDemoAccount = () => {
    const navigate = useNavigate();
    const { setAuthenticated, setUser } = useAuthContext();

    return useMutation({
        mutationFn: () => authApi.createDemoAccount(),
        onSuccess: (data) => {
            setAuthenticated(true);
            if (data.auth.user) {
                const { daysRemaining, ...rest } = data.auth.user;
                setUser({
                    ...rest,
                    trialDaysRemaining: daysRemaining ?? 0,
                });
            }
            navigate(data.auth.redirectUrl ?? '/dashboard');
        },
    });
};