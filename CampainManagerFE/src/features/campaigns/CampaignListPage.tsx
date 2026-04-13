import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchCampaignListPage } from '@/features/campaigns/campaignApi';
import { campaignKeys } from '@/features/campaigns/queries';
import { StatusBadge } from '@/features/campaigns/components/StatusBadge';
import { ApiError } from '@/lib/apiClient';

const LIMIT = 20;

export function CampaignListPage() {
  const queryClient = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: campaignKeys.listRoot(LIMIT),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) =>
      fetchCampaignListPage({ limit: LIMIT, cursor: pageParam, signal }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const badCursor =
    q.isError && q.error instanceof ApiError && q.error.status === 400;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs text-mist">
        <Link to="/dashboard" className="hover:text-accent">
          Dashboard
        </Link>{' '}
        / list
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl text-white">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-dim"
        >
          New campaign
        </Link>
      </div>

      {badCursor ? (
        <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-amber-100" role="alert">
          <p>List cursor was rejected by the server.</p>
          <button
            type="button"
            className="mt-3 rounded border border-amber-800 px-3 py-1 text-sm hover:bg-amber-900/40"
            onClick={() => {
              void queryClient.resetQueries({ queryKey: campaignKeys.listRoot(LIMIT) });
            }}
          >
            Reset to first page
          </button>
        </div>
      ) : q.isLoading ? (
        <ul className="mt-8 space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="h-16 animate-pulse rounded-lg bg-ink-800/80"
            />
          ))}
        </ul>
      ) : q.isError ? (
        <div className="mt-8 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-100" role="alert">
          <p>{q.error instanceof ApiError ? q.error.message : 'Failed to load campaigns'}</p>
          <button
            type="button"
            className="mt-3 rounded border border-red-800 px-3 py-1 text-sm hover:bg-red-900/40"
            onClick={() => void q.refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-ink-800 rounded-xl border border-ink-800 bg-ink-900/40">
            {items.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/campaigns/${c.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-ink-800/50 sm:flex-row sm:items-center sm:justify-between"
                  aria-label={`Open campaign ${c.name}`}
                >
                  <div>
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-mist">{c.subject}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
                    <StatusBadge status={c.status} />
                    <span>{formatDate(c.updated_at)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {items.length === 0 && (
            <p className="mt-8 text-center text-sm text-mist">No campaigns yet. Create one to get started.</p>
          )}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-white hover:bg-ink-800 disabled:opacity-40"
              disabled={!q.hasNextPage || q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
              aria-busy={q.isFetchingNextPage}
            >
              {q.isFetchingNextPage ? 'Loading…' : q.hasNextPage ? 'Load more' : 'No more results'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
