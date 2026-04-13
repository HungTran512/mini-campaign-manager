import { getJson } from '@/lib/apiClient';
import type { RecipientListResponse } from './types';

export async function fetchRecipientsPage(opts: {
  limit: number;
  cursor?: string;
  signal?: AbortSignal;
}): Promise<RecipientListResponse> {
  const q = new URLSearchParams({ limit: String(opts.limit) });
  if (opts.cursor) {
    q.set('cursor', opts.cursor);
  }
  return getJson<RecipientListResponse>(`/recipients?${q.toString()}`, { signal: opts.signal });
}
