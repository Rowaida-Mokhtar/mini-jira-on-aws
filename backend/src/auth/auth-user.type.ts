import { UserRole } from './user-role.enum';

export type AuthUser = {
  userId: string;
  email: string;
  role: UserRole;
  teamId?: string;
};
