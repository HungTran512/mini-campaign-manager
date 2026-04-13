import { ErrorBoundary } from 'react-error-boundary';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RouteErrorFallback } from '@/components/RouteErrorFallback';
import { AppLoader } from '@/app/AppLoader';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logout as logoutAction, selectBootstrapped, selectUser } from '@/features/auth/authSlice';
import { logoutRequest } from '@/features/auth/authApi';

export function ProtectedLayout() {
  const bootstrapped = useAppSelector(selectBootstrapped);
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMut = useMutation({
    mutationFn: async () => {
      try {
        await logoutRequest();
      } catch {
        /* still clear client session */
      }
    },
    onSettled: () => {
      dispatch(logoutAction());
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: () => {
      toast.error('Logout request failed; session cleared locally.');
    },
  });

  if (!bootstrapped) {
    return <AppLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-ink-950 text-mist">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 px-4 py-3">
        <Link to="/dashboard" className="font-display text-xl text-white hover:text-accent">
          Campaign Manager
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <Link to="/campaigns" className="hover:text-white">
            Campaigns
          </Link>
          <Link to="/campaigns/new" className="hover:text-white">
            New
          </Link>
          <Link to="/recipients" className="hover:text-white">
            Recipients
          </Link>
          <span className="text-mist/80">{user.name}</span>
          <button
            type="button"
            className="rounded-lg border border-ink-600 px-3 py-1.5 text-white hover:bg-ink-800"
            onClick={() => logoutMut.mutate()}
            disabled={logoutMut.isPending}
            aria-busy={logoutMut.isPending}
          >
            Log out
          </button>
        </nav>
      </header>
      <ErrorBoundary FallbackComponent={RouteErrorFallback}>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
