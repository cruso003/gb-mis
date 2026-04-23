import { ServiceType, ReferralOutcome } from '@gb-mis/types';
import { z } from 'zod';

export const CreateReferralSchema = z.object({
  toOrgUnitId: z.string().uuid(),
  serviceType: z.nativeEnum(ServiceType),
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
  notes: z.string().max(2000).optional(),
  outcome: z.nativeEnum(ReferralOutcome).optional(),
  completedAt: z.string().datetime().optional(),
});

export type CreateReferralDto = z.infer<typeof CreateReferralSchema>;
