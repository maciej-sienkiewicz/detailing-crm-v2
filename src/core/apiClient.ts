import axios from 'axios';
import { setPiiAccessFromHeader } from '@/common/pii';

/**
 * Per-request opt-out from the global error toast.
 *
 * Set `skipErrorToast: true` on any call whose failure is already shown in context —
 * an inline error, a wizard step, a form field. The interceptor stays the safety net
 * for everything else, which is what it was for. Without it the user saw the same
 * sentence twice: once bare from the interceptor, once with a title from the caller.
 */
declare module 'axios' {
    export interface AxiosRequestConfig {
        skipErrorToast?: boolean;
    }
}

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
        // Presentational signal: does this session see real personal data or masks?
        setPiiAccessFromHeader(response.headers?.['x-pii-access']);
        return response;
    },
    error => {
        const status = error.response?.status;

        if (status === 401) {
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
                window.location.href = '/login';
            }
        }

        if (status === 402) {
            // Paywall contract: every 402 body carries a machine-readable `code`.
            // Same soft-UX rule as 403 below: background READS the user did not
            // trigger (config prefetches on calendar/check-in views) fail SILENTLY —
            // the view's own gates render the locked state. Only a deliberate
            // MUTATION opens the global upsell dialog (PaywallListener) — the user
            // clicked something and gets a purchase path instead of a raw error.
            // Other codes (INSUFFICIENT_CREDITS) fall through to the generic toast
            // unless a call site handles them.
            const body = error.response?.data;
            if (body?.code === 'MODULE_REQUIRED') {
                const method = (error.config?.method ?? 'get').toLowerCase();
                if (method !== 'get' && method !== 'head') {
                    window.dispatchEvent(new CustomEvent('api:paywall', { detail: body }));
                }
                return Promise.reject(error);
            }
        }

        // Generic 4xx fallback toast — for errors NOBODY handles. A call site that
        // renders its own message passes `skipErrorToast` (declared at the top);
        // without it the user saw the same sentence twice, once bare from here and
        // once with a title from the call site.
        const handledLocally = error.config?.skipErrorToast === true;
        if (
            !handledLocally
            && status !== undefined && status >= 400 && status < 500
            && status !== 401 && status !== 403
        ) {
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
            const method = (error.config?.method ?? 'get').toLowerCase();
            if (method !== 'get' && method !== 'head') {
                const message: string =
                    error.response?.data?.message ?? 'Nie masz uprawnień do wykonania tej operacji';
                window.dispatchEvent(new CustomEvent('api:error', { detail: { message } }));
            }
            window.dispatchEvent(new CustomEvent('auth:permissions-stale'));
        }

        return Promise.reject(error);
    }
);