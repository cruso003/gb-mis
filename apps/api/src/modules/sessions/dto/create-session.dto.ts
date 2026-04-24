import { z } from 'zod';

export const SESSION_TYPES = [
  'SASA_AWARENESS',
  'SASA_SUPPORT',
  'SASA_ACTION',
  'ASRH',
  'OTHER',
] as const;

export const CreateSessionSchema = z.object({
  type: z.enum(SESSION_TYPES),
  orgUnitId: z.string().uuid(),
  heldAt: z.string().datetime(),
  topic: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
