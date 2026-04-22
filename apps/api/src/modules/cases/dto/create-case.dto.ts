import { z } from 'zod';
import { CasePriority, IntakeChannel, ViolenceType } from '@gb-mis/types';

export const CreateCaseSchema = z.object({
  beneficiaryId: z.string().uuid(),
  orgUnitId: z.string().uuid(),
  intakeChannel: z.nativeEnum(IntakeChannel),
  priority: z.nativeEnum(CasePriority).default('STANDARD'),
  primaryViolenceType: z.nativeEnum(ViolenceType),
  incidentDate: z.string().datetime().optional(),
  // perpetratorRelationship is captured but NEVER perpetrator name — COMPLIANCE.md
  perpetratorRelationship: z.string().optional(),
  perpetratorAgeBracket: z.string().optional(),
  perpetratorSex: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  referredFrom: z.string().max(200).optional(),
});

export type CreateCaseDto = z.infer<typeof CreateCaseSchema>;
