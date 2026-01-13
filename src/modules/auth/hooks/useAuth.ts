// src/modules/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupCredentials } from '../types';
import { useAuth as useAuthContext } from '@/core/context/AuthContext';

export const useLogin = () => {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuthContext();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
        onSuccess: (data) => {
            // Ustaw stan autentykacji na true po udanym logowaniu
            setAuthenticated(true);

            if (data.redirectUrl) {
                navigate(data.redirectUrl);
            }
        },
    });
};

export const useSignup = () => {
    const navigate = useNavigate();
    const { setAuthenticated } = useAuthContext();

    return useMutation({
        mutationFn: (credentials: SignupCredentials) => authApi.signup(credentials),
        onSuccess: (data) => {
            // Ustaw stan autentykacji na true po udanej rejestracji
            setAuthenticated(true);

            if (data.redirectUrl) {
                navigate(data.redirectUrl);
            }
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