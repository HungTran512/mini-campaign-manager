import { z } from 'zod';

const recipientInputSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).trim().optional().nullable(),
});

export const createCampaignBodySchema = z.object({
  name: z.string().min(1).max(200).trim(),
  subject: z.string().min(1).max(500).trim(),
  body: z.string().min(1).max(100_000),
  recipients: z.array(recipientInputSchema).min(1),
});

export type CreateCampaignBody = z.infer<typeof createCampaignBodySchema>;

export const listCampaignsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  cursor: z.string().min(1).optional(),
});

export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;

export const cursorPayloadSchema = z.object({
  c: z.string().min(1),
  id: z.string().uuid(),
});

export type CursorPayload = z.infer<typeof cursorPayloadSchema>;

export const campaignIdParamSchema = z.string().uuid('Invalid campaign id');

export const patchCampaignBodySchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    subject: z.string().min(1).max(500).trim().optional(),
    body: z.string().min(1).max(100_000).optional(),
  })
  .refine((o) => o.name !== undefined || o.subject !== undefined || o.body !== undefined, {
    message: 'At least one of name, subject, body is required',
  });

export type PatchCampaignBody = z.infer<typeof patchCampaignBodySchema>;

export const scheduleCampaignBodySchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }),
});

export type ScheduleCampaignBody = z.infer<typeof scheduleCampaignBodySchema>;
