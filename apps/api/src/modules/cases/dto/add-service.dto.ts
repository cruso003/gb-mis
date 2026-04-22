import { z } from 'zod';
import { ServiceType, ServiceOutcome } from '@gb-mis/types';

export const AddServiceSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  providedAt: z.string().datetime(),
  providerOrgUnitId: z.string().uuid().optional(),
  outcome: z.nativeEnum(ServiceOutcome).optional(),
  sessionCount: z.number().int().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export type AddServiceDto = z.infer<typeof AddServiceSchema>;
