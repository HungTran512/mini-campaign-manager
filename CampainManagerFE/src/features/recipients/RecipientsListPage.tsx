import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchRecipientsPage } from '@/features/recipients/recipientsApi';
import { recipientKeys } from '@/features/recipients/queries';
import { usePageH1Focus } from '@/hooks/usePageH1Focus';
import { ApiError } from '@/lib/apiClient';

const LIMIT = 20;

export function RecipientsListPage() {
  const queryClient = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: recipientKeys.listRoot(LIMIT),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchRecipientsPage({ limit: LIMIT, cursor: pageParam, signal }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const badCursor =
    q.isError && q.error instanceof ApiError && q.error.status === 400;

  const h1Ref = usePageH1Focus([items.length]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs text-mist">
        <Link to="/dashboard" className="hover:text-accent">
          Dashboard
        </Link>
        {' · '}
        <Link to="/campaigns" className="hover:text-accent">
          Campaigns
        </Link>{' '}
        / recipients
      </p>
      <h1
        ref={h1Ref}
        tabIndex={-1}
        className="mt-2 font-display text-3xl text-white outline-none"
      >
        Recipients
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Global address book (one row per email). New contacts appear when you add them to a campaign or
        create them via the API.
      </p>

      {badCursor ? (
        <div className="mt-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-amber-100" role="alert">
          <p>List cursor was rejected by the server.</p>
          <button
            type="button"
            className="mt-3 rounded border border-amber-800 px-3 py-1 text-sm hover:bg-amber-900/40"
            onClick={() => {
              void queryClient.resetQueries({ queryKey: recipientKeys.listRoot(LIMIT) });
            }}
          >
            Reset to first page
          </button>
        </div>
      ) : q.isLoading ? (
        <ul className="mt-8 space-y-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-lg bg-ink-800/80" />
          ))}
        </ul>
      ) : q.isError ? (
        <div className="mt-8 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-100" role="alert">
          <p>{q.error instanceof ApiError ? q.error.message : 'Failed to load recipients'}</p>
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
          <div className="mt-6 overflow-hidden rounded-xl border border-ink-800 bg-ink-900/40">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Global recipients, newest first</caption>
              <thead className="border-b border-ink-800 bg-ink-950/60 text-xs uppercase tracking-wide text-mist">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-800/40">
                    <td className="px-4 py-3 font-mono text-white">{r.email}</td>
                    <td className="px-4 py-3 text-mist">{r.name ?? '—'}</td>
                    <td className="px-4 py-3 text-mist tabular-nums">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <p className="mt-8 text-center text-sm text-mist">
              No recipients yet. They are created when you add emails to a campaign.
            </p>
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
