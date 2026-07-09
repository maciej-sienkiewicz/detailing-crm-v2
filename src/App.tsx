import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
import { router } from '@/core';
import { AuthProvider } from '@/core/context/AuthContext';
import { PermissionProvider } from '@/core/context/PermissionContext';
import { ToastProvider } from '@/common/components/Toast';
import { vehicleMetadataApi } from '@/modules/vehicles/api/vehicleMetadataApi';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
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
                        <PermissionProvider>
                        <SidebarProvider>
                            <RouterProvider router={router} />
                        </SidebarProvider>
                        </PermissionProvider>
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
};

export default App;