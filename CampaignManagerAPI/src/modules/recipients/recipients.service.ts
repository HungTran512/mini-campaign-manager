import { BadRequestError } from '../../http/errors.js';
import type { CreateRecipientBody } from './recipients.schemas.js';
import { recipientCursorPayloadSchema } from './recipients.schemas.js';
import type { IRecipientRepository, RecipientRow } from './recipients.repository.js';

function encodeCursor(row: RecipientRow): string {
  const payload = { c: row.created_at.toISOString(), id: row.id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { createdAt: string; id: string } {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestError('Invalid cursor');
  }
  const parsed = recipientCursorPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new BadRequestError('Invalid cursor');
  }
  return { createdAt: parsed.data.c, id: parsed.data.id };
}

export class RecipientsService {
  constructor(private readonly recipients: IRecipientRepository) {}

  async list(limit: number, cursorRaw: string | undefined) {
    const fetchLimit = limit + 1;
    let cursorCreatedAt: string | null = null;
    let cursorId: string | null = null;
    if (cursorRaw) {
      const cur = decodeCursor(cursorRaw);
      cursorCreatedAt = cur.createdAt;
      cursorId = cur.id;
    }
    const rows = await this.recipients.listActive({
      limit: fetchLimit,
      cursorCreatedAt,
      cursorId,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const next_cursor = hasMore && last ? encodeCursor(last) : null;
    return {
      items: page.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        created_at: r.created_at.toISOString(),
      })),
      next_cursor,
    };
  }

  async create(body: CreateRecipientBody) {
    const nameRaw = body.name?.trim();
    const row = await this.recipients.upsertRecipient({
      email: body.email.trim(),
      name: nameRaw && nameRaw.length > 0 ? nameRaw : null,
    });
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      created_at: row.created_at.toISOString(),
    };
  }
}
