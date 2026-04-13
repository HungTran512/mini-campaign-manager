import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../src/http/errors.js';
import { CampaignsService } from '../src/modules/campaigns/campaigns.service.js';
import type { ICampaignRepository } from '../src/modules/campaigns/campaigns.repository.js';

function makeRepo(overrides?: Partial<ICampaignRepository>): ICampaignRepository {
  return {
    createWithRecipients: vi.fn(),
    listByOwner: vi.fn(),
    findDetailWithRecipients: vi.fn(),
    aggregateStatsForOwner: vi.fn(),
    aggregateStatsAllCampaignsForOwner: vi.fn(),
    countCampaignsByStatusForOwner: vi.fn(),
    updateDraftFields: vi.fn(),
    setSchedule: vi.fn(),
    sendSyncMvp: vi.fn(),
    trySoftDeleteDraft: vi.fn(),
    selectDeleteOutcome: vi.fn(),
    ...overrides,
  };
}

describe('CampaignsService', () => {
  it('rejects scheduling in the past with 422', async () => {
    const repo = makeRepo();
    const svc = new CampaignsService(repo, { maxRecipientsPerCampaign: 10_000 });

    await expect(
      svc.schedule('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-2222-4333-8444-555555555555', {
        scheduled_at: '2020-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityError);
    expect(repo.setSchedule).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when patch target does not exist', async () => {
    const repo = makeRepo({
      updateDraftFields: vi.fn().mockResolvedValue(null),
      findDetailWithRecipients: vi.fn().mockResolvedValue(null),
    });
    const svc = new CampaignsService(repo, { maxRecipientsPerCampaign: 10_000 });

    await expect(
      svc.patchDraft('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-2222-4333-8444-555555555555', {
        name: 'Updated',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns conflict when patch target exists but is not editable', async () => {
    const repo = makeRepo({
      updateDraftFields: vi.fn().mockResolvedValue(null),
      findDetailWithRecipients: vi.fn().mockResolvedValue({
        campaign: {
          id: '11111111-2222-4333-8444-555555555555',
          name: 'Locked',
          subject: 'Subject',
          body: 'Body',
          status: 'sent',
          scheduled_at: null,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_by: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        recipients: [],
      }),
    });
    const svc = new CampaignsService(repo, { maxRecipientsPerCampaign: 10_000 });

    await expect(
      svc.patchDraft('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '11111111-2222-4333-8444-555555555555', {
        subject: 'Updated',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
