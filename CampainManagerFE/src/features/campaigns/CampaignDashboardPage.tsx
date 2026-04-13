import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchCampaignDashboardOverview } from '@/features/campaigns/campaignApi';
import { campaignKeys } from '@/features/campaigns/queries';
import { StatsPanel } from '@/features/campaigns/components/StatsPanel';
import { StatusBadge } from '@/features/campaigns/components/StatusBadge';
import { usePageH1Focus } from '@/hooks/usePageH1Focus';
import { ApiError } from '@/lib/apiClient';

const CAMPAIGN_STATUS_ORDER = ['draft', 'scheduled', 'sent', 'failed'] as const;

export function CampaignDashboardPage() {
  const q = useQuery({
    queryKey: campaignKeys.dashboard(),
    queryFn: ({ signal }) => fetchCampaignDashboardOverview(signal),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const h1Ref = usePageH1Focus([q.data?.campaigns.total, q.data?.recipients.total]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-display text-3xl text-white outline-none"
        >
          Dashboard
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/campaigns"
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-mist hover:border-accent hover:text-white"
          >
            All campaigns
          </Link>
          <Link
            to="/campaigns/new"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-accent-dim"
          >
            New campaign
          </Link>
        </div>
      </div>

      {q.isLoading ? (
        <div className="mt-10 space-y-6" aria-busy="true">
          <div className="h-44 animate-pulse rounded-xl border border-ink-800 bg-ink-800/60" />
          <div className="h-40 animate-pulse rounded-xl border border-ink-800 bg-ink-800/50" />
        </div>
      ) : q.isError ? (
        <div className="mt-10 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-100" role="alert">
          <p>{q.error instanceof ApiError ? q.error.message : 'Failed to load dashboard'}</p>
          <button
            type="button"
            className="mt-3 rounded border border-red-800 px-3 py-1 text-sm hover:bg-red-900/40"
            onClick={() => void q.refetch()}
          >
            Retry
          </button>
        </div>
      ) : q.data ? (
        <>
          <section className="mt-10" aria-labelledby="dash-recipients-heading">
            <h2 id="dash-recipients-heading" className="mb-3 text-lg font-medium text-white">
              All campaigns — recipients
            </h2>
            <StatsPanel
              stats={q.data.recipients}
              ariaLabel="Aggregate recipient statistics across all campaigns"
            />
          </section>

          <section
            className="mt-10 rounded-xl border border-ink-700 bg-ink-900/40 p-5"
            aria-labelledby="dash-campaigns-heading"
          >
            <h2 id="dash-campaigns-heading" className="text-lg font-medium text-white">
              Campaigns by status
            </h2>
            <p className="mt-1 text-xs text-mist/90">
              Total campaigns:{' '}
              <span className="font-mono text-mist">{q.data.campaigns.total}</span>
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPAIGN_STATUS_ORDER.map((status) => {
                const count = q.data.campaigns.by_status[status] ?? 0;
                return (
                  <li
                    key={status}
                    className="flex items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-950/60 px-4 py-3"
                  >
                    <StatusBadge status={status} />
                    <span className="font-mono text-lg text-white tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
