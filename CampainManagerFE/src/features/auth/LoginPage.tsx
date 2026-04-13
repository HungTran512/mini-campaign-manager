import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDispatch } from '@/app/hooks';
import { setUser } from '@/features/auth/authSlice';
import { loginRequest } from '@/features/auth/authApi';
import type { LoginForm } from '@/features/auth/loginSchema';
import { loginSchema } from '@/features/auth/loginSchema';
import { ApiError } from '@/lib/apiClient';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const mutation = useMutation({
    mutationFn: (body: LoginForm) => loginRequest(body),
    onSuccess: (data) => {
      dispatch(setUser(data.user));
      toast.success('Signed in');
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Sign-in failed';
      toast.error(msg, {
        action: { label: 'Try again', onClick: () => mutation.mutate(form.getValues()) },
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-display text-4xl text-white">Sign in</h1>
      <p className="mt-2 text-sm text-mist">Campaign Manager — cookie session</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-mist">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'login-email-err' : undefined}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p id="login-email-err" className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-mist">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'login-password-err' : undefined}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p id="login-password-err" className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-ink-950 hover:bg-accent-dim disabled:opacity-60"
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mist">
        No account?{' '}
        <Link to="/register" className="text-accent hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
