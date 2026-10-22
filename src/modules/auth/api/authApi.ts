// src/modules/auth/api/authApi.ts
import { apiClient } from '@/core';
import { detachNativePush } from '@/modules/push/native/nativePush';
import type { LoginCredentials, SignupCredentials, AuthResponse, CheckAuthResponse, DemoAccountResponse, ForgotPasswordRequest, ForgotPasswordResponse, ValidateResetTokenResponse, ResetPasswordRequest, ResetPasswordResponse } from '../types';

const BASE_PATH = '/v1/auth';

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post(`${BASE_PATH}/login`, credentials);
        return response.data;
    },

    signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post(`${BASE_PATH}/signup`, credentials);
        return response.data;
    },

    logout: async (): Promise<void> => {
        // Każda droga wylogowania (menu, przełącznik osób) przechodzi tędy - odpinamy
        // telefon z aplikacją, póki sesja jeszcze mówi serwerowi, czyj to telefon.
        await detachNativePush();
        await apiClient.post(`${BASE_PATH}/logout`);
    },

    /**
     * „Sesja zablokowana": od tej chwili serwer nie wydaje danych tej sesji w żadnej
     * karcie, dopóki ktoś nie wpisze PIN-u albo nie zaloguje się hasłem. Wołane w tle
     * przez licznik bezczynności - bez dymka i bez wyrzucania na /login.
     */
    lockSession: async (): Promise<void> => {
        await apiClient.post(`${BASE_PATH}/session-lock`, undefined, { skipErrorToast: true, skipAuthRedirect: true });
    },

    checkAuth: async (): Promise<{ isAuthenticated: boolean; user: import('../types').User | null }> => {
        const response = await apiClient.get<CheckAuthResponse>(`${BASE_PATH}/me`);
        // Backend zwraca { success, user }, przekształć na { isAuthenticated, user }
        // Użytkownik jest zalogowany jeśli success=true i user nie jest null
        return {
            isAuthenticated: response.data.success && response.data.user !== null,
            user: response.data.user ?? null,
        };
    },

    forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
        const response = await apiClient.post<ForgotPasswordResponse>(`${BASE_PATH}/forgot-password`, data);
        return response.data;
    },

    validateResetToken: async (token: string): Promise<ValidateResetTokenResponse> => {
        const response = await apiClient.get<ValidateResetTokenResponse>(`${BASE_PATH}/reset-password/validate`, {
            params: { token },
        });
        return response.data;
    },

    resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
        const response = await apiClient.post<ResetPasswordResponse>(`${BASE_PATH}/reset-password`, data);
        return response.data;
    },

    createDemoAccount: async (): Promise<DemoAccountResponse> => {
        const response = await apiClient.post<DemoAccountResponse>('/v1/demo');
        return response.data;
    },
};
