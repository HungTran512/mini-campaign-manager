import type { Pool } from 'pg';

export type CampaignSummaryRow = {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
};

export type CampaignDetailRow = CampaignSummaryRow & {
  body: string;
};

export type CampaignRecipientDetailRow = {
  email: string;
  name: string | null;
  status: string;
  sent_at: Date | null;
  opened_at: Date | null;
};

export type CampaignStatsRow = {
  total: number;
  sent: number;
  failed: number;
  opened: number;
};

export type CampaignDeleteStateRow = {
  deleted_at: Date | null;
  status: string;
};

export interface ICampaignRepository {
  createWithRecipients(input: {
    userId: string;
    name: string;
    subject: string;
    body: string;
    recipientEmails: string[];
    recipientNames: (string | null)[];
  }): Promise<CampaignDetailRow>;

  listByOwner(input: {
    userId: string;
    limit: number;
    cursorCreatedAt: string | null;
    cursorId: string | null;
  }): Promise<CampaignSummaryRow[]>;

  findDetailWithRecipients(
    userId: string,
    campaignId: string,
  ): Promise<{ campaign: CampaignDetailRow; recipients: CampaignRecipientDetailRow[] } | null>;

  aggregateStatsForOwner(userId: string, campaignId: string): Promise<CampaignStatsRow | null>;

  /** All `campaign_recipients` rows for non-deleted campaigns owned by the user. */
  aggregateStatsAllCampaignsForOwner(userId: string): Promise<CampaignStatsRow>;

  countCampaignsByStatusForOwner(userId: string): Promise<{ status: string; count: number }[]>;

  updateDraftFields(
    userId: string,
    campaignId: string,
    patch: { name?: string; subject?: string; body?: string },
  ): Promise<CampaignDetailRow | null>;

  setSchedule(userId: string, campaignId: string, scheduledAt: Date): Promise<CampaignDetailRow | null>;

  sendSyncMvp(userId: string, campaignId: string): Promise<
    | { outcome: 'sent'; detail: CampaignDetailRow }
    | { outcome: 'idempotent_sent'; detail: CampaignDetailRow }
    | { outcome: 'not_found' }
    | { outcome: 'terminal_conflict'; status: string }
  >;

  trySoftDeleteDraft(userId: string, campaignId: string): Promise<boolean>;

  selectDeleteOutcome(userId: string, campaignId: string): Promise<CampaignDeleteStateRow | null>;
}

export class PgCampaignRepository implements ICampaignRepository {
  constructor(private readonly pool: Pool) {}

  async createWithRecipients(input: {
    userId: string;
    name: string;
    subject: string;
    body: string;
    recipientEmails: string[];
    recipientNames: (string | null)[];
  }): Promise<CampaignDetailRow> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const ins = await client.query<CampaignDetailRow>(
        `INSERT INTO campaigns (name, subject, body, created_by, updated_by)
         VALUES ($1, $2, $3, $4::uuid, $4::uuid)
         RETURNING
           id,
           name,
           subject,
           body,
           status::text AS status,
           scheduled_at,
           created_at,
           updated_at,
           updated_by::text AS updated_by`,
        [input.name, input.subject, input.body, input.userId],
      );
      const campaign = ins.rows[0];
      if (!campaign) {
        throw new Error('Campaign insert returned no row');
      }

      await client.query(
        `WITH upserted AS (
           INSERT INTO recipients (email, name, deleted_at)
           SELECT u.email::citext, u.name, NULL
           FROM unnest($1::text[], $2::text[]) AS u(email, name)
           ON CONFLICT (email) DO UPDATE
             SET name = COALESCE(EXCLUDED.name, recipients.name),
                 deleted_at = NULL
           RETURNING id
         )
         INSERT INTO campaign_recipients (campaign_id, recipient_id, status)
         SELECT $3::uuid, upserted.id, 'pending'::campaign_recipient_status
         FROM upserted
         ON CONFLICT (campaign_id, recipient_id) DO NOTHING`,
        [input.recipientEmails, input.recipientNames, campaign.id],
      );

      await client.query('COMMIT');
      return campaign;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async listByOwner(input: {
    userId: string;
    limit: number;
    cursorCreatedAt: string | null;
    cursorId: string | null;
  }): Promise<CampaignSummaryRow[]> {
    const res = await this.pool.query<CampaignSummaryRow>(
      `SELECT
         id,
         name,
         subject,
         status::text AS status,
         scheduled_at,
         created_at,
         updated_at,
         updated_by::text AS updated_by
       FROM campaigns
       WHERE created_by = $1::uuid
         AND deleted_at IS NULL
         AND (
           $2::timestamptz IS NULL
           OR (created_at, id) < ($2::timestamptz, $3::uuid)
         )
       ORDER BY created_at DESC, id DESC
       LIMIT $4::int`,
      [input.userId, input.cursorCreatedAt, input.cursorId, input.limit],
    );
    return res.rows;
  }

  async findDetailWithRecipients(
    userId: string,
    campaignId: string,
  ): Promise<{ campaign: CampaignDetailRow; recipients: CampaignRecipientDetailRow[] } | null> {
    const c = await this.pool.query<CampaignDetailRow>(
      `SELECT
         id,
         name,
         subject,
         body,
         status::text AS status,
         scheduled_at,
         created_at,
         updated_at,
         updated_by::text AS updated_by
       FROM campaigns
       WHERE id = $1::uuid
         AND created_by = $2::uuid
         AND deleted_at IS NULL`,
      [campaignId, userId],
    );
    const campaign = c.rows[0];
    if (!campaign) {
      return null;
    }
    const r = await this.pool.query<CampaignRecipientDetailRow>(
      `SELECT
         r.email::text AS email,
         r.name,
         cr.status::text AS status,
         cr.sent_at,
         cr.opened_at
       FROM campaign_recipients cr
       INNER JOIN recipients r ON r.id = cr.recipient_id
       WHERE cr.campaign_id = $1::uuid
       ORDER BY r.email ASC`,
      [campaignId],
    );
    return { campaign, recipients: r.rows };
  }

  private async loadCampaignDetailRow(userId: string, campaignId: string): Promise<CampaignDetailRow | null> {
    const c = await this.pool.query<CampaignDetailRow>(
      `SELECT
         id,
         name,
         subject,
         body,
         status::text AS status,
         scheduled_at,
         created_at,
         updated_at,
         updated_by::text AS updated_by
       FROM campaigns
       WHERE id = $1::uuid
         AND created_by = $2::uuid
         AND deleted_at IS NULL`,
      [campaignId, userId],
    );
    return c.rows[0] ?? null;
  }

  async aggregateStatsForOwner(userId: string, campaignId: string): Promise<CampaignStatsRow | null> {
    const camp = await this.pool.query(
      `SELECT 1 FROM campaigns WHERE id = $1::uuid AND created_by = $2::uuid AND deleted_at IS NULL`,
      [campaignId, userId],
    );
    if (camp.rowCount === 0) {
      return null;
    }
    const stats = await this.pool.query<CampaignStatsRow>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
         COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened
       FROM campaign_recipients
       WHERE campaign_id = $1::uuid`,
      [campaignId],
    );
    const row = stats.rows[0];
    if (!row) {
      return { total: 0, sent: 0, failed: 0, opened: 0 };
    }
    return row;
  }

  async aggregateStatsAllCampaignsForOwner(userId: string): Promise<CampaignStatsRow> {
    const stats = await this.pool.query<CampaignStatsRow>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE cr.status = 'sent')::int AS sent,
         COUNT(*) FILTER (WHERE cr.status = 'failed')::int AS failed,
         COUNT(*) FILTER (WHERE cr.opened_at IS NOT NULL)::int AS opened
       FROM campaign_recipients cr
       INNER JOIN campaigns c ON c.id = cr.campaign_id
       WHERE c.created_by = $1::uuid
         AND c.deleted_at IS NULL`,
      [userId],
    );
    const row = stats.rows[0];
    if (!row) {
      return { total: 0, sent: 0, failed: 0, opened: 0 };
    }
    return row;
  }

  async countCampaignsByStatusForOwner(userId: string): Promise<{ status: string; count: number }[]> {
    const res = await this.pool.query<{ status: string; count: number }>(
      `SELECT status::text AS status, COUNT(*)::int AS count
       FROM campaigns
       WHERE created_by = $1::uuid
         AND deleted_at IS NULL
       GROUP BY status
       ORDER BY status`,
      [userId],
    );
    return res.rows;
  }

  async updateDraftFields(
    userId: string,
    campaignId: string,
    patch: { name?: string; subject?: string; body?: string },
  ): Promise<CampaignDetailRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [campaignId, userId];
    let idx = 3;
    if (patch.name !== undefined) {
      sets.push(`name = $${String(idx)}`);
      values.push(patch.name);
      idx += 1;
    }
    if (patch.subject !== undefined) {
      sets.push(`subject = $${String(idx)}`);
      values.push(patch.subject);
      idx += 1;
    }
    if (patch.body !== undefined) {
      sets.push(`body = $${String(idx)}`);
      values.push(patch.body);
      idx += 1;
    }
    sets.push(`updated_by = $${String(idx)}::uuid`);
    values.push(userId);

    const res = await this.pool.query<CampaignDetailRow>(
      `UPDATE campaigns
       SET ${sets.join(', ')}
       WHERE id = $1::uuid
         AND created_by = $2::uuid
         AND status = 'draft'::campaign_status
         AND deleted_at IS NULL
       RETURNING
         id,
         name,
         subject,
         body,
         status::text AS status,
         scheduled_at,
         created_at,
         updated_at,
         updated_by::text AS updated_by`,
      values,
    );
    return res.rows[0] ?? null;
  }

  async setSchedule(userId: string, campaignId: string, scheduledAt: Date): Promise<CampaignDetailRow | null> {
    const res = await this.pool.query<CampaignDetailRow>(
      `UPDATE campaigns
       SET
         status = CASE
           WHEN status = 'draft'::campaign_status THEN 'scheduled'::campaign_status
           ELSE status
         END,
         scheduled_at = $3::timestamptz,
         updated_by = $2::uuid
       WHERE id = $1::uuid
         AND created_by = $2::uuid
         AND deleted_at IS NULL
         AND status IN ('draft'::campaign_status, 'scheduled'::campaign_status)
       RETURNING
         id,
         name,
         subject,
         body,
         status::text AS status,
         scheduled_at,
         created_at,
         updated_at,
         updated_by::text AS updated_by`,
      [campaignId, userId, scheduledAt],
    );
    return res.rows[0] ?? null;
  }

  async sendSyncMvp(
    userId: string,
    campaignId: string,
  ): Promise<
    | { outcome: 'sent'; detail: CampaignDetailRow }
    | { outcome: 'idempotent_sent'; detail: CampaignDetailRow }
    | { outcome: 'not_found' }
    | { outcome: 'terminal_conflict'; status: string }
  > {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query<CampaignDetailRow>(
        `UPDATE campaigns
         SET status = 'sent'::campaign_status,
             scheduled_at = NULL,
             updated_by = $2::uuid
         WHERE id = $1::uuid
           AND created_by = $2::uuid
           AND deleted_at IS NULL
           AND status IN ('draft'::campaign_status, 'scheduled'::campaign_status)
         RETURNING
           id,
           name,
           subject,
           body,
           status::text AS status,
           scheduled_at,
           created_at,
           updated_at,
           updated_by::text AS updated_by`,
        [campaignId, userId],
      );
      const row = upd.rows[0];
      if (row) {
        /** Simulated async send: each pending row flips to `sent` or `failed` using one `random()` draw per row. */
        await client.query(
          `WITH rnd AS (
             SELECT campaign_id, recipient_id, random() AS r
             FROM campaign_recipients
             WHERE campaign_id = $1::uuid
               AND status = 'pending'::campaign_recipient_status
           )
           UPDATE campaign_recipients AS cr
           SET
             status = (CASE WHEN rnd.r < 0.5 THEN 'sent' ELSE 'failed' END)::campaign_recipient_status,
             sent_at = CASE WHEN rnd.r < 0.5 THEN clock_timestamp() ELSE NULL END
           FROM rnd
           WHERE cr.campaign_id = rnd.campaign_id
             AND cr.recipient_id = rnd.recipient_id`,
          [campaignId],
        );
        await client.query('COMMIT');
        return { outcome: 'sent', detail: row };
      }
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    const st = await this.pool.query<{ status: string; deleted_at: Date | null }>(
      `SELECT status::text AS status, deleted_at FROM campaigns WHERE id = $1::uuid AND created_by = $2::uuid`,
      [campaignId, userId],
    );
    const srow = st.rows[0];
    if (!srow || srow.deleted_at) {
      return { outcome: 'not_found' };
    }
    if (srow.status === 'sent') {
      const detail = await this.loadCampaignDetailRow(userId, campaignId);
      if (!detail) {
        return { outcome: 'not_found' };
      }
      return { outcome: 'idempotent_sent', detail };
    }
    if (srow.status === 'failed') {
      return { outcome: 'terminal_conflict', status: srow.status };
    }
    const detail = await this.loadCampaignDetailRow(userId, campaignId);
    if (!detail) {
      return { outcome: 'not_found' };
    }
    if (detail.status === 'sent') {
      return { outcome: 'idempotent_sent', detail };
    }
    return { outcome: 'not_found' };
  }

  async trySoftDeleteDraft(userId: string, campaignId: string): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE campaigns
       SET deleted_at = now(),
           updated_by = $2::uuid
       WHERE id = $1::uuid
         AND created_by = $2::uuid
         AND status = 'draft'::campaign_status
         AND deleted_at IS NULL
       RETURNING id`,
      [campaignId, userId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async selectDeleteOutcome(userId: string, campaignId: string): Promise<CampaignDeleteStateRow | null> {
    const res = await this.pool.query<CampaignDeleteStateRow>(
      `SELECT deleted_at, status::text AS status
       FROM campaigns
       WHERE id = $1::uuid AND created_by = $2::uuid`,
      [campaignId, userId],
    );
    return res.rows[0] ?? null;
  }
}
