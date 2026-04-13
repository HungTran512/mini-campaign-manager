import { deleteRequest, getJson, patchJson, postJson } from '@/lib/apiClient';
import type {
  CampaignCreateResponse,
  CampaignDashboardOverview,
  CampaignDetail,
  CampaignListResponse,
  CampaignStats,
  SendCampaignResponse,
} from './types';
import type { CreateCampaignPayload } from './campaignFormSchema';

export async function fetchCampaignListPage(opts: {
  limit: number;
  cursor?: string;
  signal?: AbortSignal;
}): Promise<CampaignListResponse> {
  const q = new URLSearchParams({ limit: String(opts.limit) });
  if (opts.cursor) {
    q.set('cursor', opts.cursor);
  }
  return getJson<CampaignListResponse>(`/campaigns?${q.toString()}`, { signal: opts.signal });
}

export function fetchCampaignDetail(id: string, signal?: AbortSignal): Promise<CampaignDetail> {
  return getJson<CampaignDetail>(`/campaigns/${id}`, { signal });
}

export function fetchCampaignStats(id: string, signal?: AbortSignal): Promise<CampaignStats> {
  return getJson<CampaignStats>(`/campaigns/${id}/stats`, { signal });
}

export function fetchCampaignDashboardOverview(signal?: AbortSignal): Promise<CampaignDashboardOverview> {
  return getJson<CampaignDashboardOverview>('/campaigns/overview', { signal });
}

export function createCampaign(
  body: CreateCampaignPayload,
  signal?: AbortSignal,
): Promise<CampaignCreateResponse> {
  return postJson<CampaignCreateResponse>('/campaigns', body, { signal });
}

export function patchCampaign(
  id: string,
  body: { name?: string; subject?: string; body?: string },
  signal?: AbortSignal,
): Promise<CampaignDetail> {
  return patchJson<CampaignDetail>(`/campaigns/${id}`, body, { signal });
}

export function scheduleCampaign(
  id: string,
  scheduled_at: string,
  signal?: AbortSignal,
): Promise<CampaignDetail> {
  return postJson<CampaignDetail>(`/campaigns/${id}/schedule`, { scheduled_at }, { signal });
}

export function sendCampaign(id: string, signal?: AbortSignal): Promise<SendCampaignResponse> {
  return postJson<SendCampaignResponse>(`/campaigns/${id}/send`, {}, { signal });
}

export function deleteCampaign(id: string, signal?: AbortSignal): Promise<void> {
  return deleteRequest(`/campaigns/${id}`, { signal });
}
