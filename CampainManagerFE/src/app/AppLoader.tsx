export function AppLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 text-mist">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-mist/30 border-t-accent"
        aria-hidden
      />
      <p className="mt-4 text-sm">Loading session…</p>
    </div>
  );
}
