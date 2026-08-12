import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
import { router } from '@/core';
import { AuthProvider } from '@/core/context/AuthContext';
import { ToastProvider } from '@/common/components/Toast';
import { vehicleMetadataApi } from '@/modules/vehicles/api/vehicleMetadataApi';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Never retry auth/permission failures — a 401/403 is deterministic and a
            // retry would only double the denied request (and the resulting toast).
            retry: (failureCount, error) => {
                const status = (error as { response?: { status?: number } })?.response?.status;
                if (status === 401 || status === 403) return false;
                return failureCount < 1;
            },
            refetchOnWindowFocus: false,
        },
    },
});

// Prefetch vehicle metadata once on app start to enable instant filtering
queryClient.prefetchQuery({
    queryKey: ['vehicleMetadata'],
    queryFn: () => vehicleMetadataApi.getAll(),
});

const App = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <SidebarProvider>
                            <RouterProvider router={router} />
                        </SidebarProvider>
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
};

export default App;