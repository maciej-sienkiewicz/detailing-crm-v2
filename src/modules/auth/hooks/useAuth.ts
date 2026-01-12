// src/modules/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import type { LoginCredentials, SignupCredentials } from '../types';

export const useLogin = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
        onSuccess: (data) => {
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
        onSuccess: (data) => {
            if (data.redirectUrl) {
                navigate(data.redirectUrl);
            }
        },
    });
};

export const useLogout = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: () => authApi.logout(),
        onSuccess: () => {
            navigate('/login');
        },
    });
};