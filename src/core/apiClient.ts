import axios from 'axios';

export const apiClient = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    config => {
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    response => {
        console.log('[apiClient] Response:', response.config.url, response.status);
        return response;
    },
    error => {
        console.error('[apiClient] Request failed:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            headers: error.response?.headers
        });

        if (error.response?.status === 401) {
            console.warn('[apiClient] Otrzymano 401 - nieautoryzowany dostęp');
            // Unikaj przekierowania na /login jeśli już jesteśmy na publicznej stronie
            // aby zapobiec nieskończonej pętli wywołań /me endpoint
            const currentPath = window.location.pathname;
            const publicPaths = ['/login', '/signup', '/forgot-password'];

            if (!publicPaths.includes(currentPath)) {
                console.warn('[apiClient] Przekierowanie na /login');
                window.location.href = '/login';
            }
        }

        if (error.response?.status === 403) {
            console.error('Access forbidden');
        }

        if (error.response?.status >= 500) {
            console.error('Server error occurred');
        }

        return Promise.reject(error);
    }
);