// src/modules/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupCredentials } from '../types';
import { useAuth as useAuthContext } from '@/core/context/AuthContext';

export const useLogin = () => {
    const navigate = useNavigate();
    const { setAuthenticated, setUser } = useAuthContext();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
        onSuccess: (data) => {
            // Ustaw stan autentykacji i dane użytkownika po udanym logowaniu
            setAuthenticated(true);
            if (data.user) {
                setUser(data.user);
            }

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
                    message: 'Pomyślnie utworzono konto. Teraz możesz się zalogować.'
                }
            });
        },
    });
};

export const useLogout = () => {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuthContext();

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            // Ustaw stan autentykacji na false po wylogowaniu
            setAuthenticated(false);
            navigate('/login');
        },
    });
};