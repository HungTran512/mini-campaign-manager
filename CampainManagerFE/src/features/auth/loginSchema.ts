import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email').max(320),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginForm = z.infer<typeof loginSchema>;
