import type { FallbackProps } from 'react-error-boundary';

export function AppErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-mist">
      <h1 className="font-display text-3xl text-white">Something went wrong</h1>
      <p className="mt-3 max-w-md text-center text-sm">
        {import.meta.env.DEV && error instanceof Error ? error.message : 'An unexpected error occurred.'}
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          className="rounded-lg border border-ink-700 px-4 py-2 text-sm text-white hover:bg-ink-800"
          onClick={resetErrorBoundary}
        >
          Try again
        </button>
        <a
          href="/campaigns"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink-950 hover:bg-accent-dim"
        >
          Campaigns
        </a>
      </div>
    </div>
  );
}
