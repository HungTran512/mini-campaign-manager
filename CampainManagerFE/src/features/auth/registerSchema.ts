import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  email: z.string().email('Enter a valid email').max(320),
  password: z.string().min(8, 'At least 8 characters').max(128),
});

export type RegisterForm = z.infer<typeof registerSchema>;
