import axios from 'axios';
import { setPiiAccessFromHeader } from '@/common/pii';

export const apiClient = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    config => {
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    response => {
        console.log('[apiClient] Response:', response.config.url, response.status);
        // Presentational signal: does this session see real personal data or masks?
        setPiiAccessFromHeader(response.headers?.['x-pii-access']);
        return response;
    },
    error => {
        console.error('[apiClient] Request failed:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
        });

        const status = error.response?.status;

        if (status === 401) {
            console.warn('[apiClient] Otrzymano 401 - nieautoryzowany dostęp');
            const currentPath = window.location.pathname;
            const requestUrl = error.config?.url ?? '';
            const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/confirm-password', '/m/upload', '/m/voice'];
            // Public token-based pages must never bounce to /login
            const isPublicPath = publicPaths.includes(currentPath)
                || currentPath.startsWith('/vc/')
                || currentPath.startsWith('/sign/')
                || currentPath.startsWith('/m/sig/');
            // PIN verification endpoints return 401 for wrong PIN — caller handles retries, don't bounce to /login
            const isPinEndpoint = requestUrl.includes('/v1/pin');

            if (!isPublicPath && !isPinEndpoint) {
                console.warn('[apiClient] Przekierowanie na /login');
                window.location.href = '/login';
            }
        }

        if (status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 403) {
            const message: string = error.response?.data?.message ?? 'Wystąpił nieoczekiwany błąd';
            window.dispatchEvent(new CustomEvent('api:error', { detail: { message } }));
        }

        if (status === 403) {
            // The backend is the authority on permissions. Soft-UX rule: reads that the
            // user did not explicitly trigger fail SILENTLY — the view simply shows
            // nothing (permissions hide capabilities, they don't announce errors).
            // Only a deliberate action (mutation) gets a toast, because the user
            // clicked something and needs to know why nothing happened.
            // Either way, re-sync the permission set so the UI hides the capability.
            console.warn('[apiClient] Access forbidden:', error.config?.url);
            const method = (error.config?.method ?? 'get').toLowerCase();
            if (method !== 'get' && method !== 'head') {
                const message: string =
                    error.response?.data?.message ?? 'Nie masz uprawnień do wykonania tej operacji';
                window.dispatchEvent(new CustomEvent('api:error', { detail: { message } }));
            }
            window.dispatchEvent(new CustomEvent('auth:permissions-stale'));
        }

        if (status !== undefined && status >= 500) {
            console.error('Server error occurred');
        }

        return Promise.reject(error);
    }
);