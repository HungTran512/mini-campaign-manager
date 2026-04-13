const styles: Record<string, string> = {
  draft: 'bg-slate-700/80 text-slate-100 ring-1 ring-slate-500/40',
  scheduled: 'bg-sky-900/60 text-sky-100 ring-1 ring-sky-500/40',
  sent: 'bg-emerald-900/50 text-emerald-100 ring-1 ring-emerald-500/40',
  failed: 'bg-red-900/50 text-red-100 ring-1 ring-red-500/40',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? 'bg-zinc-800 text-zinc-200 ring-1 ring-zinc-600/40';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
