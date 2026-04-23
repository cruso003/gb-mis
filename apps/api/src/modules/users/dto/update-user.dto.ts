import { UserStatus } from '@gb-mis/types';
import { z } from 'zod';

export const UpdateUserSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  orgUnitId: z.string().uuid().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
