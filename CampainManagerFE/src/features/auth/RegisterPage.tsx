import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppDispatch } from '@/app/hooks';
import { setUser } from '@/features/auth/authSlice';
import { registerRequest } from '@/features/auth/authApi';
import type { RegisterForm } from '@/features/auth/registerSchema';
import { registerSchema } from '@/features/auth/registerSchema';
import { ApiError } from '@/lib/apiClient';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (body: RegisterForm) => registerRequest(body),
    onSuccess: (data) => {
      dispatch(setUser(data.user));
      toast.success('Account created');
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : 'Registration failed';
      toast.error(msg, {
        action: { label: 'Try again', onClick: () => mutation.mutate(form.getValues()) },
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-display text-4xl text-white">Create account</h1>
      <p className="mt-2 text-sm text-mist">You will be signed in automatically.</p>

      <form
        className="mt-8 space-y-4"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="reg-name" className="block text-sm font-medium text-mist">
            Name
          </label>
          <input
            id="reg-name"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.name}
            aria-describedby={form.formState.errors.name ? 'reg-name-err' : undefined}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p id="reg-name-err" className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-mist">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'reg-email-err' : undefined}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p id="reg-email-err" className="mt-1 text-sm text-red-400" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-mist">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-white outline-none ring-accent focus:ring-1"
            aria-invalid={!!form.formState.errors.password}
            aria-describedby={form.formState.errors.password ? 'reg-password-err' : undefined}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p id="reg-password-err" className="mt-1 text-sm text-red-400" role="alert">
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
          {mutation.isPending ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mist">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
