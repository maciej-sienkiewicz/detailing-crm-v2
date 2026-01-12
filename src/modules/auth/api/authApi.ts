// src/modules/auth/api/authApi.ts
import { apiClient } from '@/core';
import type { LoginCredentials, SignupCredentials, AuthResponse } from '../types';

const USE_MOCKS = true;

const BASE_PATH = '/api/v1/auth';

const mockLogin = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
                resolve({
                    success: true,
                    redirectUrl: '/dashboard',
                });
            } else {
                reject({
                    response: {
                        status: 401,
                        data: {
                            message: 'Nieprawidłowy email lub hasło',
                        },
                    },
                });
            }
        }, 1000);
    });
};

const mockSignup = async (credentials: SignupCredentials): Promise<AuthResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                redirectUrl: '/onboarding',
            });
        }, 1500);
    });
};

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        if (USE_MOCKS) {
            return mockLogin(credentials);
        }
        const response = await apiClient.post(`${BASE_PATH}/login`, credentials);
        return response.data;
    },

    signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
        if (USE_MOCKS) {
            return mockSignup(credentials);
        }
        const response = await apiClient.post(`${BASE_PATH}/signup`, credentials);
        return response.data;
    },

    logout: async (): Promise<void> => {
        if (USE_MOCKS) {
            return Promise.resolve();
        }
        await apiClient.post(`${BASE_PATH}/logout`);
    },
};