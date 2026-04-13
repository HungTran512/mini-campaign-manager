import { getJson, postJson } from '@/lib/apiClient';
import type { AuthUser } from './authSlice';

export async function fetchMe(signal?: AbortSignal): Promise<{ user: AuthUser }> {
  return getJson<{ user: AuthUser }>('/auth/me', { signal });
}

export async function loginRequest(
  body: { email: string; password: string },
  signal?: AbortSignal,
): Promise<{ user: AuthUser }> {
  return postJson<{ user: AuthUser }>('/auth/login', body, { signal });
}

export async function registerRequest(
  body: { email: string; password: string; name: string },
  signal?: AbortSignal,
): Promise<{ user: AuthUser }> {
  return postJson<{ user: AuthUser }>('/auth/register', body, { signal });
}

export async function logoutRequest(signal?: AbortSignal): Promise<void> {
  await postJson<unknown>('/auth/logout', {}, { signal });
}
