import type { FallbackProps } from 'react-error-boundary';
import { Link } from 'react-router-dom';

export function RouteErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div
      role="alert"
      className="m-6 rounded-xl border border-red-900/40 bg-red-950/30 p-6 text-red-100"
    >
      <h2 className="text-lg font-semibold">This view failed to load</h2>
      <p className="mt-2 text-sm opacity-90">
        {import.meta.env.DEV && error instanceof Error ? error.message : 'Please try again or go back.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg border border-red-800/60 px-3 py-1.5 text-sm hover:bg-red-900/40"
          onClick={resetErrorBoundary}
        >
          Retry
        </button>
        <Link
          to="/campaigns"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
        >
          All campaigns
        </Link>
      </div>
    </div>
  );
}
