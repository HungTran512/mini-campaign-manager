import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
  UnprocessableEntityError,
} from '../../http/errors.js';
import type { CreateCampaignBody, PatchCampaignBody, ScheduleCampaignBody } from './campaigns.schemas.js';
import { cursorPayloadSchema } from './campaigns.schemas.js';
import type {
  CampaignDetailRow,
  CampaignRecipientDetailRow,
  CampaignSummaryRow,
  ICampaignRepository,
} from './campaigns.repository.js';

export type CampaignsServiceLimits = {
  maxRecipientsPerCampaign: number;
};

function dedupeRecipients(
  rows: CreateCampaignBody['recipients'],
): { email: string; name: string | null }[] {
  const map = new Map<string, { email: string; name: string | null }>();
  for (const r of rows) {
    const email = r.email.trim().toLowerCase();
    const rawName = r.name?.trim();
    map.set(email, { email, name: rawName && rawName.length > 0 ? rawName : null });
  }
  return [...map.values()];
}

function serializeSummary(c: CampaignSummaryRow) {
  return {
    id: c.id,
    name: c.name,
    subject: c.subject,
    status: c.status,
    scheduled_at: c.scheduled_at?.toISOString() ?? null,
    created_at: c.created_at.toISOString(),
    updated_at: c.updated_at.toISOString(),
    updated_by: c.updated_by,
  };
}

function encodeCursor(row: CampaignSummaryRow): string {
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
  const parsed = cursorPayloadSchema.safeParse(json);
  if (!parsed.success) {
    throw new BadRequestError('Invalid cursor');
  }
  return { createdAt: parsed.data.c, id: parsed.data.id };
}

export class CampaignsService {
  constructor(
    private readonly campaigns: ICampaignRepository,
    private readonly limits: CampaignsServiceLimits,
  ) {}

  async create(userId: string, body: CreateCampaignBody) {
    const deduped = dedupeRecipients(body.recipients);
    if (deduped.length === 0) {
      throw new BadRequestError('At least one valid recipient email is required');
    }
    if (deduped.length > this.limits.maxRecipientsPerCampaign) {
      throw new PayloadTooLargeError(
        `Recipients exceed maximum of ${String(this.limits.maxRecipientsPerCampaign)}`,
      );
    }
    const recipientEmails = deduped.map((r) => r.email);
    const recipientNames = deduped.map((r) => r.name);
    const row = await this.campaigns.createWithRecipients({
      userId,
      name: body.name,
      subject: body.subject,
      body: body.body,
      recipientEmails,
      recipientNames,
    });
    return this.serializeDetail(row);
  }

  async list(userId: string, limit: number, cursorRaw: string | undefined) {
    const fetchLimit = limit + 1;
    let cursorCreatedAt: string | null = null;
    let cursorId: string | null = null;
    if (cursorRaw) {
      const cur = decodeCursor(cursorRaw);
      cursorCreatedAt = cur.createdAt;
      cursorId = cur.id;
    }
    const rows = await this.campaigns.listByOwner({
      userId,
      limit: fetchLimit,
      cursorCreatedAt,
      cursorId,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const next_cursor = hasMore && last ? encodeCursor(last) : null;
    return {
      items: page.map(serializeSummary),
      next_cursor,
    };
  }

  serializeDetail(c: CampaignDetailRow) {
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      body: c.body,
      status: c.status,
      scheduled_at: c.scheduled_at?.toISOString() ?? null,
      created_at: c.created_at.toISOString(),
      updated_at: c.updated_at.toISOString(),
      updated_by: c.updated_by,
    };
  }

  private serializeRecipient(r: CampaignRecipientDetailRow) {
    return {
      email: r.email,
      name: r.name,
      status: r.status,
      sent_at: r.sent_at?.toISOString() ?? null,
      opened_at: r.opened_at?.toISOString() ?? null,
    };
  }

  async getDetail(userId: string, campaignId: string) {
    const row = await this.campaigns.findDetailWithRecipients(userId, campaignId);
    if (!row) {
      return null;
    }
    return {
      ...this.serializeDetail(row.campaign),
      recipients: row.recipients.map((r) => this.serializeRecipient(r)),
    };
  }

  async getStats(userId: string, campaignId: string) {
    const raw = await this.campaigns.aggregateStatsForOwner(userId, campaignId);
    if (!raw) {
      return null;
    }
    const { total, sent, failed, opened } = raw;
    const send_rate = total === 0 ? 0 : sent / total;
    const open_rate = sent === 0 ? 0 : opened / sent;
    return { total, sent, failed, opened, send_rate, open_rate };
  }

  async getDashboardOverview(userId: string) {
    const raw = await this.campaigns.aggregateStatsAllCampaignsForOwner(userId);
    const { total, sent, failed, opened } = raw;
    const send_rate = total === 0 ? 0 : sent / total;
    const open_rate = sent === 0 ? 0 : opened / sent;
    const rows = await this.campaigns.countCampaignsByStatusForOwner(userId);
    const by_status: Record<string, number> = {};
    let campaigns_total = 0;
    for (const r of rows) {
      by_status[r.status] = r.count;
      campaigns_total += r.count;
    }
    return {
      recipients: { total, sent, failed, opened, send_rate, open_rate },
      campaigns: { total: campaigns_total, by_status },
    };
  }

  async patchDraft(userId: string, campaignId: string, body: PatchCampaignBody) {
    const row = await this.campaigns.updateDraftFields(userId, campaignId, body);
    if (row) {
      return this.serializeDetail(row);
    }
    const exists = await this.campaigns.findDetailWithRecipients(userId, campaignId);
    if (!exists) {
      throw new NotFoundError('Not found', 'NOT_FOUND');
    }
    throw new ConflictError('Campaign cannot be edited in its current state', 'CONFLICT_STATE');
  }

  async schedule(userId: string, campaignId: string, body: ScheduleCampaignBody) {
    const at = new Date(body.scheduled_at);
    if (at.getTime() <= Date.now()) {
      throw new UnprocessableEntityError('Scheduled time must be in the future', 'SCHEDULE_NOT_FUTURE');
    }
    const row = await this.campaigns.setSchedule(userId, campaignId, at);
    if (row) {
      return this.serializeDetail(row);
    }
    const exists = await this.campaigns.findDetailWithRecipients(userId, campaignId);
    if (!exists) {
      throw new NotFoundError('Not found', 'NOT_FOUND');
    }
    throw new ConflictError('Campaign cannot be scheduled in its current state', 'CONFLICT_STATE');
  }

  async send(userId: string, campaignId: string) {
    const result = await this.campaigns.sendSyncMvp(userId, campaignId);
    switch (result.outcome) {
      case 'sent':
      case 'idempotent_sent': {
        const stats = await this.campaigns.aggregateStatsForOwner(userId, campaignId);
        const base = this.serializeDetail(result.detail);
        return {
          ...base,
          recipients_summary: stats ?? { total: 0, sent: 0, failed: 0, opened: 0 },
        };
      }
      case 'not_found':
        throw new NotFoundError('Not found', 'NOT_FOUND');
      case 'terminal_conflict':
        throw new ConflictError('Send is not available for this campaign', 'CONFLICT_STATE');
    }
  }

  async softDelete(userId: string, campaignId: string): Promise<'no_content'> {
    const deleted = await this.campaigns.trySoftDeleteDraft(userId, campaignId);
    if (deleted) {
      return 'no_content';
    }
    const state = await this.campaigns.selectDeleteOutcome(userId, campaignId);
    if (!state) {
      throw new NotFoundError('Not found', 'NOT_FOUND');
    }
    if (state.deleted_at) {
      return 'no_content';
    }
    throw new ConflictError('Only draft campaigns can be deleted', 'CONFLICT_STATE');
  }
}
