import { UserRole } from '../auth/user-role.enum';

export type User = {
  id: string;
  email: string;
  role: UserRole;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
};
