-- Mini Campaign Manager — core schema (see IMPLEMENTATION_PLAN.md §1.2)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TYPE campaign_status AS ENUM (
  'draft',
  'scheduled',
  'sent',
  'failed'
);

CREATE TYPE campaign_recipient_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaigns (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  subject       text NOT NULL,
  body          text NOT NULL,
  status        campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at  timestamptz NULL,
  created_by    uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid NULL REFERENCES users (id) ON DELETE SET NULL,
  deleted_at    timestamptz NULL,
  CONSTRAINT campaigns_scheduled_requires_time
    CHECK (status <> 'scheduled'::campaign_status OR scheduled_at IS NOT NULL),
  CONSTRAINT campaigns_scheduled_at_only_when_scheduling
    CHECK (
      scheduled_at IS NULL
      OR status = 'scheduled'::campaign_status
    )
);

CREATE TABLE recipients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      citext NOT NULL UNIQUE,
  name       text,
  deleted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_recipients (
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES recipients (id) ON DELETE RESTRICT,
  sent_at     timestamptz NULL,
  opened_at   timestamptz NULL,
  status      campaign_recipient_status NOT NULL DEFAULT 'pending',
  PRIMARY KEY (campaign_id, recipient_id),
  CONSTRAINT campaign_recipients_sent_at_matches_status CHECK (
    (status = 'sent' AND sent_at IS NOT NULL)
    OR (status <> 'sent'::campaign_recipient_status AND sent_at IS NULL)
  ),
  CONSTRAINT campaign_recipients_opened_requires_sent CHECK (
    opened_at IS NULL OR status = 'sent'::campaign_recipient_status
  )
);
