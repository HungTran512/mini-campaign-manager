export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiClientConfig = {
  baseURL: string;
  getBootstrapped: () => boolean;
  onSessionExpired: () => void;
};

let config: ApiClientConfig | null = null;

let handling401 = false;

export function configureApiClient(next: ApiClientConfig): void {
  config = next;
}

function url(path: string): string {
  if (!config) {
    throw new Error('configureApiClient must run before API calls');
  }
  const base = config.baseURL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function parseErrorBody(res: Response): Promise<{ message: string; code?: string; details?: unknown }> {
  try {
    const j = (await res.json()) as { error?: string; code?: string; details?: unknown };
    return {
      message: typeof j.error === 'string' ? j.error : res.statusText || 'Request failed',
      code: typeof j.code === 'string' ? j.code : undefined,
      details: j.details,
    };
  } catch {
    return { message: res.statusText || 'Request failed' };
  }
}

function handle401IfNeeded(status: number): void {
  if (status !== 401 || !config) {
    return;
  }
  if (!config.getBootstrapped()) {
    return;
  }
  if (handling401) {
    return;
  }
  handling401 = true;
  try {
    config.onSessionExpired();
  } finally {
    queueMicrotask(() => {
      handling401 = false;
    });
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers: hdrs, ...rest } = init ?? {};
  const headers = new Headers(hdrs);
  let body: string | undefined;
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }
  const res = await fetch(url(path), {
    ...rest,
    method,
    headers,
    credentials: 'include',
    body: body ?? rest.body,
  });

  if (!res.ok) {
    handle401IfNeeded(res.status);
    const { message, code, details } = await parseErrorBody(res);
    throw new ApiError(message, res.status, code, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const ct = res.headers.get('content-type');
  if (!ct?.includes('application/json')) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function getJson<T>(path: string, opts?: { signal?: AbortSignal }): Promise<T> {
  return apiRequest<T>('GET', path, { signal: opts?.signal });
}

export function postJson<T>(path: string, json: unknown, opts?: { signal?: AbortSignal }): Promise<T> {
  return apiRequest<T>('POST', path, { json, signal: opts?.signal });
}

export function patchJson<T>(path: string, json: unknown, opts?: { signal?: AbortSignal }): Promise<T> {
  return apiRequest<T>('PATCH', path, { json, signal: opts?.signal });
}

export function deleteRequest(path: string, opts?: { signal?: AbortSignal }): Promise<void> {
  return apiRequest<void>('DELETE', path, { signal: opts?.signal });
}
