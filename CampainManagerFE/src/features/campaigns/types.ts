export type CampaignSummary = {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type CampaignRecipient = {
  email: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
};

export type CampaignDetail = CampaignSummary & {
  body: string;
  recipients: CampaignRecipient[];
};

/** `POST /campaigns` returns detail fields without `recipients` until `GET /campaigns/:id`. */
export type CampaignCreateResponse = CampaignSummary & { body: string };

export type CampaignListResponse = {
  items: CampaignSummary[];
  next_cursor: string | null;
};

export type CampaignStats = {
  total: number;
  sent: number;
  failed: number;
  opened: number;
  send_rate: number;
  open_rate: number;
};

export type CampaignDashboardOverview = {
  recipients: CampaignStats;
  campaigns: { total: number; by_status: Record<string, number> };
};

export type SendCampaignResponse = CampaignSummary & {
  body: string;
  recipients_summary: {
    total: number;
    sent: number;
    failed: number;
    opened: number;
  };
};
