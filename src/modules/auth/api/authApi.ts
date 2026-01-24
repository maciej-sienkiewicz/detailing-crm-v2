// src/modules/auth/api/authApi.ts
import { apiClient } from '@/core';
import type { LoginCredentials, SignupCredentials, AuthResponse, CheckAuthResponse } from '../types';

const USE_MOCKS = false;

const BASE_PATH = '/v1/auth';

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

const mockSignup = async (_credentials: SignupCredentials): Promise<AuthResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                success: true,
                redirectUrl: '/onboarding',
            });
        }, 1500);
    });
};

const mockCheckAuth = async (): Promise<{ isAuthenticated: boolean; user: import('../types').User | null }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                isAuthenticated: true,
                user: {
                    userId: 'mock-user-1',
                    studioId: 'mock-studio-1',
                    email: 'test@example.com',
                    role: 'OWNER',
                    subscriptionStatus: 'ACTIVE',
                    trialDaysRemaining: 0,
                },
            });
        }, 300);
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

    checkAuth: async (): Promise<{ isAuthenticated: boolean; user: import('../types').User | null }> => {
        if (USE_MOCKS) {
            return mockCheckAuth();
        }
        const response = await apiClient.get<CheckAuthResponse>(`${BASE_PATH}/me`);
        // Backend zwraca { success, user }, przekształć na { isAuthenticated, user }
        // Użytkownik jest zalogowany jeśli success=true i user nie jest null
        return {
            isAuthenticated: response.data.success && response.data.user !== null,
            user: response.data.user ?? null,
        };
    },
};
