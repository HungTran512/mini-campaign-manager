-- §1.3 indexing strategy

CREATE INDEX idx_campaigns_pagination
  ON campaigns (created_by, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_campaigns_status_scheduled_at_active
  ON campaigns (status, scheduled_at)
  WHERE status = 'scheduled'::campaign_status AND deleted_at IS NULL;

CREATE INDEX idx_campaign_recipients_campaign
  ON campaign_recipients (campaign_id);

CREATE INDEX idx_campaign_recipients_campaign_status
  ON campaign_recipients (campaign_id, status);

CREATE INDEX idx_campaign_recipients_campaign_pending
  ON campaign_recipients (campaign_id)
  WHERE status = 'pending';
