import { z } from 'zod';

export const listRecipientsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  cursor: z.string().min(1).optional(),
});

export type ListRecipientsQuery = z.infer<typeof listRecipientsQuerySchema>;

export const recipientCursorPayloadSchema = z.object({
  c: z.string().min(1),
  id: z.string().uuid(),
});

export const createRecipientBodySchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).trim().optional().nullable(),
});

export type CreateRecipientBody = z.infer<typeof createRecipientBodySchema>;
