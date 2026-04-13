import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BootstrapAuth } from '@/app/BootstrapAuth';
import { store } from '@/app/store';
import { AppErrorFallback } from '@/components/AppErrorFallback';
import { logout } from '@/features/auth/authSlice';
import { configureApiClient } from '@/lib/apiClient';
import { router } from '@/routes';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status !== undefined && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

export function AppProviders() {
  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    configureApiClient({
      baseURL,
      getBootstrapped: () => store.getState().auth.bootstrapped,
      onSessionExpired: () => {
        store.dispatch(logout());
        queryClient.clear();
        const p = window.location.pathname;
        if (p !== '/login' && p !== '/register') {
          window.location.assign('/login');
        }
      },
    });
  }, []);

  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <Toaster richColors position="top-center" />
          <BootstrapAuth>
            <RouterProvider router={router} />
          </BootstrapAuth>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}
