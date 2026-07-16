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
            const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/m/upload', '/m/voice'];
            // Public Visit Card pages (/vc/:token) must never bounce the customer to /login
            const isPublicPath = publicPaths.includes(currentPath) || currentPath.startsWith('/vc/');

            if (!isPublicPath) {
                console.warn('[apiClient] Przekierowanie na /login');
                window.location.href = '/login';
            }
        }

        if (status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 403) {
            const message: string = error.response?.data?.message ?? 'Wystąpił nieoczekiwany błąd';
            window.dispatchEvent(new CustomEvent('api:error', { detail: { message } }));
        }

        if (status === 403) {
            console.warn('[apiClient] Access forbidden:', error.config?.url);
        }

        if (status !== undefined && status >= 500) {
            console.error('Server error occurred');
        }

        return Promise.reject(error);
    }
);