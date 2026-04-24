import { z } from 'zod';

export const CreateVslaGroupSchema = z.object({
  name: z.string().min(1).max(200),
  orgUnitId: z.string().uuid(),
  formedAt: z.string().date(),
});

export type CreateVslaGroupDto = z.infer<typeof CreateVslaGroupSchema>;

export const AddMemberSchema = z.object({
  beneficiaryId: z.string().uuid(),
  role: z.enum(['CHAIR', 'SECRETARY', 'TREASURER', 'MEMBER']),
  joinedAt: z.string().date(),
});

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
