import { z } from 'zod';
import { Role } from '@gb-mis/types';

export const CreateUserSchema = z.object({
  keycloakSubject: z.string().uuid(),
  displayName: z.string().min(1).max(200),
  orgUnitId: z.string().uuid(),
  roles: z.array(z.nativeEnum(Role)).min(1),
  assignedBy: z.string().uuid(),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
