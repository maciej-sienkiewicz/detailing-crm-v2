import { RouterProvider } from 'react-router-dom';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, isCancelledError } from '@tanstack/react-query';
import { isAxiosError, isCancel } from 'axios';
import { logger } from '@/core/logger';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
import { router } from '@/core';
import { AppErrorBoundary } from '@/core/errors';
import { AuthProvider } from '@/core/context/AuthContext';
import { ToastProvider } from '@/common/components/Toast';
import { problemStatus } from '@/core/problem';

/**
 * Do raportu trafia tylko to, czego nikt się nie spodziewał: brak odpowiedzi, 5xx albo
 * wyjątek w kodzie. 4xx (walidacja, brak uprawnień, paywall) obsługują dymki i widoki,
 * a anulowanie (dalsze przewinięcie kalendarza, kolejna litera w wyszukiwarce) nie jest błędem.
 */
const isUnexpected = (error: unknown) =>
    !isCancel(error) && !isCancelledError(error)
    && (!isAxiosError(error) || error.response === undefined || error.response.status >= 500);

const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error, query) => {
            if (isUnexpected(error)) logger.error('query.failed', error, { key: String(query.queryKey[0]) });
        },
    }),
    mutationCache: new MutationCache({
        onError: error => {
            if (isUnexpected(error)) logger.error('mutation.failed', error);
        },
    }),
    defaultOptions: {
        queries: {
            // Never retry auth/permission/paywall failures: a 401/402/403 is
            // deterministic and a retry would only double the denied request.
            // 429 też nie: ponowienie po sekundzie trafia w ten sam pełny licznik
            // i tylko przedłuża „Przekroczono limit żądań" (patrz core/rateLimit).
            retry: (failureCount, error) => {
                const status = problemStatus(error);
                if (status === 401 || status === 402 || status === 403 || status === 429) return false;
                return failureCount < 1;
            },
            refetchOnWindowFocus: false,
        },
    },
});

const App = () => {
    return (
        // Ostatnia linia obrony nad providerami i samym RouterProvider -
        // `errorElement` routera obsługuje tylko błędy WEWNĄTRZ drzewa route'ów.
        <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <SidebarProvider>
                                {/* Bez onError React Router sam wypisuje każdy błąd do konsoli. Błędy
                                    renderu (z errorInfo) zgłasza już onCaughtError z main.tsx; tu
                                    zostają błędy ładowania trasy. */}
                                <RouterProvider
                                    router={router}
                                    onError={(error, info) => {
                                        if (!info.errorInfo) logger.error('router.route', error, { pattern: info.pattern });
                                    }}
                                />
                            </SidebarProvider>
                        </AuthProvider>
                    </ToastProvider>
                </ThemeProvider>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </AppErrorBoundary>
    );
};

export default App;