import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setUser } from '@/features/auth/authSlice';
import { fetchMe } from '@/features/auth/authApi';

export function BootstrapAuth({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchMe(ac.signal);
        if (!cancelled) {
          dispatch(setUser(data.user));
        }
      } catch {
        if (!cancelled) {
          dispatch(setUser(null));
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [dispatch]);

  return <>{children}</>;
}
