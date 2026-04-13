import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CampaignRecipient } from '../types';

const VIRTUAL_THRESHOLD = 48;
const ROW_H = 44;

export function RecipientTable({ recipients }: { recipients: CampaignRecipient[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  if (recipients.length <= VIRTUAL_THRESHOLD) {
    return (
      <div className="overflow-x-auto rounded-lg border border-ink-700">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink-700 bg-ink-900/80 text-xs uppercase tracking-wide text-mist">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Email
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Sent
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {recipients.map((r) => (
              <tr key={r.email} className="hover:bg-ink-900/40">
                <td className="px-3 py-2 font-mono text-xs text-white">{r.email}</td>
                <td className="px-3 py-2 text-mist">{r.name ?? '—'}</td>
                <td className="px-3 py-2 text-mist">{r.status}</td>
                <td className="px-3 py-2 text-mist">{r.sent_at ? formatShort(r.sent_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const virtualizer = useVirtualizer({
    count: recipients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className="h-[min(24rem,50vh)] overflow-auto rounded-lg border border-ink-700"
      role="grid"
      aria-label="Recipients"
      aria-rowcount={recipients.length}
    >
      <div className="sticky top-0 z-10 grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-ink-700 bg-ink-900/95 px-3 py-2 text-xs uppercase tracking-wide text-mist">
        <div role="columnheader">Email</div>
        <div role="columnheader">Name</div>
        <div role="columnheader">Status</div>
        <div role="columnheader">Sent</div>
      </div>
      <div style={{ height: `${String(virtualizer.getTotalSize())}px` }} className="relative isolate">
        {virtualizer.getVirtualItems().map((vi) => {
          const r = recipients[vi.index];
          if (!r) {
            return null;
          }
          return (
            <div
              key={r.email}
              role="row"
              className="absolute left-0 right-0 grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-ink-800 px-3 py-2 text-sm hover:bg-ink-900/40"
              style={{
                top: 0,
                height: `${String(vi.size)}px`,
                transform: `translateY(${String(vi.start)}px)`,
              }}
            >
              <span role="gridcell" className="truncate font-mono text-xs text-white">
                {r.email}
              </span>
              <span role="gridcell" className="truncate text-mist">
                {r.name ?? '—'}
              </span>
              <span role="gridcell" className="text-mist">
                {r.status}
              </span>
              <span role="gridcell" className="text-mist">
                {r.sent_at ? formatShort(r.sent_at) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatShort(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
