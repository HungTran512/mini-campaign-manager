import { z } from 'zod';

const recipientSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().max(200).trim().optional().nullable(),
});

export const createCampaignPayloadSchema = z
  .object({
    name: z.string().min(1, 'Required').max(200).trim(),
    subject: z.string().min(1, 'Required').max(500).trim(),
    body: z.string().min(1, 'Required').max(100_000),
    recipients: z.array(recipientSchema).min(1, 'Add at least one recipient'),
  })
  .superRefine((data, ctx) => {
    const max = maxRecipients();
    if (data.recipients.length > max) {
      ctx.addIssue({
        code: 'custom',
        message: `Too many recipients (max ${String(max)})`,
        path: ['recipients'],
      });
    }
  });

export type CreateCampaignPayload = z.infer<typeof createCampaignPayloadSchema>;

/** One row in the UI (may have blank email while editing). */
const recipientDraftRowSchema = z.object({
  email: z.string().max(320),
  name: z.string().max(200),
});

export const campaignFormInputSchema = z
  .object({
    name: z.string().min(1, 'Required').max(200).trim(),
    subject: z.string().min(1, 'Required').max(500).trim(),
    body: z.string().min(1, 'Required').max(100_000),
    recipients: z.array(recipientDraftRowSchema).min(1, 'Keep at least one row'),
  })
  .superRefine((data, ctx) => {
    const max = maxRecipients();
    const filled = data.recipients
      .map((r, i) => ({ i, email: r.email.trim(), name: r.name.trim() }))
      .filter((r) => r.email.length > 0);

    if (filled.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least one email',
        path: ['recipients', 0, 'email'],
      });
      return;
    }

    const uniqueKeys = new Set(filled.map((r) => r.email.toLowerCase()));
    if (uniqueKeys.size > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Too many unique recipients (max ${String(max)})`,
        path: ['recipients'],
      });
    }

    const emailFmt = z.string().email();
    for (let i = 0; i < data.recipients.length; i++) {
      const e = data.recipients[i]!.email.trim();
      if (!e) {
        continue;
      }
      if (!emailFmt.safeParse(e).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid email',
          path: ['recipients', i, 'email'],
        });
      }
      if (data.recipients[i]!.name.length > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Name too long',
          path: ['recipients', i, 'name'],
        });
      }
    }
  });

export type CampaignFormInputValues = z.infer<typeof campaignFormInputSchema>;

/** Dedupe by case-insensitive email; last row wins for name (matches API). */
export function normalizeRecipientsForApi(
  rows: CampaignFormInputValues['recipients'],
): CreateCampaignPayload['recipients'] {
  const map = new Map<string, { email: string; name: string | null }>();
  for (const r of rows) {
    const email = r.email.trim();
    if (!email) {
      continue;
    }
    const key = email.toLowerCase();
    const nm = r.name.trim();
    map.set(key, { email, name: nm.length > 0 ? nm : null });
  }
  return [...map.values()];
}

export function toApiPayload(input: CampaignFormInputValues): CreateCampaignPayload {
  return createCampaignPayloadSchema.parse({
    name: input.name,
    subject: input.subject,
    body: input.body,
    recipients: normalizeRecipientsForApi(input.recipients),
  });
}

const emailFmt = z.string().email();

export function isValidRecipientEmail(value: string): boolean {
  const t = value.trim();
  if (!t) {
    return false;
  }
  return emailFmt.safeParse(t).success;
}

/** Non-empty name within max length counts as valid for styling. */
export function isValidRecipientName(value: string): boolean {
  const t = value.trim();
  if (t.length === 0) {
    return false;
  }
  return t.length <= 200;
}

export function maxRecipients(): number {
  const raw = import.meta.env.VITE_MAX_RECIPIENTS_PER_CAMPAIGN;
  const n = raw ? Number.parseInt(raw, 10) : 10_000;
  return Number.isFinite(n) && n > 0 ? n : 10_000;
}
