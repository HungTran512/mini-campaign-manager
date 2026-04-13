import type { Pool } from 'pg';

export type RecipientRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
};

export interface IRecipientRepository {
  listActive(input: {
    limit: number;
    cursorCreatedAt: string | null;
    cursorId: string | null;
  }): Promise<RecipientRow[]>;

  upsertRecipient(input: { email: string; name: string | null }): Promise<RecipientRow>;
}

export class PgRecipientRepository implements IRecipientRepository {
  constructor(private readonly pool: Pool) {}

  async listActive(input: {
    limit: number;
    cursorCreatedAt: string | null;
    cursorId: string | null;
  }): Promise<RecipientRow[]> {
    const res = await this.pool.query<RecipientRow>(
      `SELECT
         id,
         email::text AS email,
         name,
         created_at
       FROM recipients
       WHERE deleted_at IS NULL
         AND (
           $1::timestamptz IS NULL
           OR (created_at, id) < ($1::timestamptz, $2::uuid)
         )
       ORDER BY created_at DESC, id DESC
       LIMIT $3::int`,
      [input.cursorCreatedAt, input.cursorId, input.limit],
    );
    return res.rows;
  }

  async upsertRecipient(input: { email: string; name: string | null }): Promise<RecipientRow> {
    const res = await this.pool.query<RecipientRow>(
      `INSERT INTO recipients (email, name, deleted_at)
       VALUES ($1::citext, $2, NULL)
       ON CONFLICT (email) DO UPDATE
         SET name = COALESCE(EXCLUDED.name, recipients.name),
             deleted_at = NULL
       RETURNING id, email::text AS email, name, created_at`,
      [input.email.trim(), input.name],
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error('Recipient upsert returned no row');
    }
    return row;
  }
}
