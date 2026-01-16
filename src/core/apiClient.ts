import axios from 'axios';

export const apiClient = axios.create({
    baseURL: 'http://localhost:8080',
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
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Unikaj przekierowania na /login jeśli już jesteśmy na publicznej stronie
            // aby zapobiec nieskończonej pętli wywołań /me endpoint
            const currentPath = window.location.pathname;
            const publicPaths = ['/login', '/signup', '/forgot-password'];

            if (!publicPaths.includes(currentPath)) {
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