import { z } from 'zod';
import { Sex, DisabilityStatus, EnrollmentSource, ConsentScope } from '@gb-mis/types';

export const CreateBeneficiarySchema = z.object({
  // PII — will be encrypted at rest before DB write
  fullName: z.string().min(1).max(200),
  nationalId: z.string().max(50).optional(),
  phoneNumber: z.string().max(20).optional(),
  email: z.string().email().optional(),

  // Demographic
  sex: z.nativeEnum(Sex),
  dateOfBirth: z.string().date().optional(),
  disabilityStatus: z.nativeEnum(DisabilityStatus).default('NONE'),

  // Programme
  orgUnitId: z.string().uuid(),
  enrollmentSource: z.nativeEnum(EnrollmentSource),
  consentScope: z.nativeEnum(ConsentScope).default('DATA_COLLECTION'),

  // Consent record — required at intake (COMPLIANCE.md §3)
  consentGivenAt: z.string().datetime(),
  consentWitnessId: z.string().uuid().optional(),
});

export type CreateBeneficiaryDto = z.infer<typeof CreateBeneficiarySchema>;
