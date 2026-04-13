import type { CampaignStats } from '../types';

export function StatsPanel({
  stats,
  ariaLabel = 'Campaign statistics',
}: {
  stats: CampaignStats;
  ariaLabel?: string;
}) {
  const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
  return (
    <section
      aria-label={ariaLabel}
      className="space-y-6 rounded-xl border border-ink-700 bg-ink-900/50 p-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Recipients" value={String(stats.total)} />
        <Stat label="Sent" value={String(stats.sent)} />
        <Stat label="Failed" value={String(stats.failed)} />
        <Stat label="Opened" value={String(stats.opened)} />
      </div>

      <div className="space-y-5 border-t border-ink-800 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-mist">Rates</p>
        <RateBar label="Send rate" value={stats.send_rate} tone="emerald" />
        <RateBar label="Open rate" value={stats.open_rate} tone="sky" />
        <p className="text-xs text-mist/80">
          Numeric: send {pct(stats.send_rate)} · open {pct(stats.open_rate)}
        </p>
      </div>
    </section>
  );
}

function RateBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'sky';
}) {
  const widthPct = Math.min(100, Math.max(0, value * 100));
  const bar =
    tone === 'emerald'
      ? 'bg-gradient-to-r from-emerald-900 to-emerald-500'
      : 'bg-gradient-to-r from-sky-900 to-sky-400';
  const labelPct = `${Math.round(widthPct * 10) / 10}%`;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="text-mist">{label}</span>
        <span className="font-mono text-white" aria-hidden>
          {labelPct}
        </span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-ink-700"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(widthPct * 10) / 10}
        aria-label={`${label}: ${labelPct}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${bar}`}
          style={{ width: `${String(widthPct)}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-mist">{label}</p>
      <p className="mt-1 font-mono text-lg text-white">{value}</p>
    </div>
  );
}
