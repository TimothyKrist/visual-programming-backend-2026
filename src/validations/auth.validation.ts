import { z } from 'zod';

export const credentials = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(1),
}).strict();

export const registration = credentials.extend({ password: z.string().min(9) });
