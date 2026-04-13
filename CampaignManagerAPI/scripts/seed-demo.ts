/**
 * Idempotent demo dataset for local / Docker review.
 * Login: demo@example.com / demo12345
 *
 * Re-run: removes all campaigns owned by the demo user, then recreates
 * draft + scheduled + sent examples (global recipients are upserted).
 */
import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: path.resolve(__dirname, '..', '.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo12345';
const BCRYPT_COST = 12;

type RecipientSeed = { email: string; name: string | null };

const RECIPIENTS: RecipientSeed[] = [
  { email: 'demo.alice@example.com', name: 'Alice' },
  { email: 'demo.bob@example.com', name: 'Bob' },
  { email: 'demo.carol@example.com', name: 'Carol' },
  { email: 'demo.dave@example.com', name: 'Dave' },
  { email: 'demo.eve@example.com', name: 'Eve' },
];

async function main(): Promise<void> {
  const { DATABASE_URL } = envSchema.parse(process.env);
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let userId: string;
    const existing = await client.query<{ id: string }>(
      `SELECT id::text AS id FROM users WHERE email = $1::citext`,
      [DEMO_EMAIL],
    );
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      console.log(`Demo user already exists (${DEMO_EMAIL}), reusing id.`);
    } else {
      const hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
      const ins = await client.query<{ id: string }>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1::citext, $2, $3)
         RETURNING id::text AS id`,
        [DEMO_EMAIL, 'Demo Marketer', hash],
      );
      userId = ins.rows[0]!.id;
      console.log(`Created demo user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    }

    const del = await client.query(`DELETE FROM campaigns WHERE created_by = $1::uuid RETURNING id`, [userId]);
    console.log(`Removed ${String(del.rowCount ?? 0)} existing demo campaign(s).`);

    const recipientIds: string[] = [];
    for (const r of RECIPIENTS) {
      const up = await client.query<{ id: string }>(
        `INSERT INTO recipients (email, name, deleted_at)
         VALUES ($1::citext, $2, NULL)
         ON CONFLICT (email) DO UPDATE
           SET name = COALESCE(EXCLUDED.name, recipients.name),
               deleted_at = NULL
         RETURNING id::text AS id`,
        [r.email, r.name],
      );
      recipientIds.push(up.rows[0]!.id);
    }

    const draft = await client.query<{ id: string }>(
      `INSERT INTO campaigns (name, subject, body, status, scheduled_at, created_by, updated_by)
       VALUES ($1, $2, $3, 'draft'::campaign_status, NULL, $4::uuid, $4::uuid)
       RETURNING id::text AS id`,
      [
        'Spring promo (draft)',
        'Save 20% this week',
        'Hi {{name}},\n\nUse code SAVE20 at checkout.\n\n— Demo Marketing',
        userId,
      ],
    );
    const draftId = draft.rows[0]!.id;
    for (const rid of recipientIds.slice(0, 3)) {
      await client.query(
        `INSERT INTO campaign_recipients (campaign_id, recipient_id, status, sent_at, opened_at)
         VALUES ($1::uuid, $2::uuid, 'pending'::campaign_recipient_status, NULL, NULL)
         ON CONFLICT DO NOTHING`,
        [draftId, rid],
      );
    }

    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sched = await client.query<{ id: string }>(
      `INSERT INTO campaigns (name, subject, body, status, scheduled_at, created_by, updated_by)
       VALUES ($1, $2, $3, 'scheduled'::campaign_status, $4::timestamptz, $5::uuid, $5::uuid)
       RETURNING id::text AS id`,
      [
        'Newsletter (scheduled)',
        'April digest',
        'Hello,\n\nHere is your scheduled demo newsletter body.\n\n— Demo',
        scheduledAt.toISOString(),
        userId,
      ],
    );
    const schedId = sched.rows[0]!.id;
    for (const rid of recipientIds.slice(1, 4)) {
      await client.query(
        `INSERT INTO campaign_recipients (campaign_id, recipient_id, status, sent_at, opened_at)
         VALUES ($1::uuid, $2::uuid, 'pending'::campaign_recipient_status, NULL, NULL)
         ON CONFLICT DO NOTHING`,
        [schedId, rid],
      );
    }

    const sent = await client.query<{ id: string }>(
      `INSERT INTO campaigns (name, subject, body, status, scheduled_at, created_by, updated_by)
       VALUES ($1, $2, $3, 'sent'::campaign_status, NULL, $4::uuid, $4::uuid)
       RETURNING id::text AS id`,
      [
        'Product launch (sent)',
        'We are live!',
        'Team,\n\nThe launch campaign has completed in demo data.\n\n— Demo',
        userId,
      ],
    );
    const sentId = sent.rows[0]!.id;

    const sentAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const openedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const links: { rid: string; status: 'sent' | 'failed'; opened: boolean }[] = [
      { rid: recipientIds[0]!, status: 'sent', opened: true },
      { rid: recipientIds[1]!, status: 'sent', opened: false },
      { rid: recipientIds[2]!, status: 'failed', opened: false },
      { rid: recipientIds[3]!, status: 'sent', opened: false },
    ];
    for (const { rid, status, opened } of links) {
      if (status === 'sent') {
        await client.query(
          `INSERT INTO campaign_recipients (campaign_id, recipient_id, status, sent_at, opened_at)
           VALUES ($1::uuid, $2::uuid, 'sent'::campaign_recipient_status, $3::timestamptz, $4::timestamptz)`,
          [sentId, rid, sentAt, opened ? openedAt : null],
        );
      } else {
        await client.query(
          `INSERT INTO campaign_recipients (campaign_id, recipient_id, status, sent_at, opened_at)
           VALUES ($1::uuid, $2::uuid, 'failed'::campaign_recipient_status, NULL, NULL)`,
          [sentId, rid],
        );
      }
    }

    await client.query('COMMIT');
    console.log('Demo seed complete: 1 draft, 1 scheduled, 1 sent campaign.');
    console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
