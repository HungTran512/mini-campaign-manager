import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Outlet } from 'react-router-dom';
import { RouteErrorFallback } from '@/components/RouteErrorFallback';
import { AppLoader } from '@/app/AppLoader';
import { useAppSelector } from '@/app/hooks';
import { selectBootstrapped, selectUser } from '@/features/auth/authSlice';

export function AuthLayout() {
  const bootstrapped = useAppSelector(selectBootstrapped);
  const user = useAppSelector(selectUser);

  if (!bootstrapped) {
    return <AppLoader />;
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-800 px-4 py-4">
        <span className="font-display text-xl text-white">Campaign Manager</span>
      </header>
      <ErrorBoundary FallbackComponent={RouteErrorFallback}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
