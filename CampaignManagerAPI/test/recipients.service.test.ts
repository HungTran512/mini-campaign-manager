import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { RecipientsService } from '../src/modules/recipients/recipients.service.js';
import type { IRecipientRepository, RecipientRow } from '../src/modules/recipients/recipients.repository.js';

function row(partial: Partial<RecipientRow> & Pick<RecipientRow, 'id' | 'email' | 'created_at'>): RecipientRow {
  return {
    name: null,
    ...partial,
  };
}

describe('RecipientsService', () => {
  it('returns one page and null next_cursor when under limit', async () => {
    const listActive = vi.fn().mockResolvedValue([
      row({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', email: 'a@example.com', created_at: new Date('2026-01-01T00:00:00.000Z') }),
    ]);
    const repo: Pick<IRecipientRepository, 'listActive' | 'upsertRecipient'> = {
      listActive,
      upsertRecipient: vi.fn(),
    };
    const svc = new RecipientsService(repo as IRecipientRepository);
    const out = await svc.list(20, undefined);
    expect(out.items).toHaveLength(1);
    expect(out.next_cursor).toBeNull();
    expect(listActive).toHaveBeenCalledWith({
      limit: 21,
      cursorCreatedAt: null,
      cursorId: null,
    });
  });

  it('returns next_cursor when more than limit rows', async () => {
    const rows = Array.from({ length: 21 }).map((_, i) =>
      row({
        id: randomUUID(),
        email: `u${String(i)}@x.com`,
        created_at: new Date(2026, 0, 1 + i),
      }),
    );
    const listActive = vi.fn().mockResolvedValue(rows);
    const svc = new RecipientsService({ listActive, upsertRecipient: vi.fn() } as IRecipientRepository);
    const out = await svc.list(20, undefined);
    expect(out.items).toHaveLength(20);
    expect(out.next_cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
