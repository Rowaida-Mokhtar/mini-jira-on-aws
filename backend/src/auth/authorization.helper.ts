import { AuthUser } from './auth-user.type';
import { UserRole } from './user-role.enum';

export function canAccessTeamResource(
  user: AuthUser,
  resourceTeamId: string,
): boolean {
  if (user.role === UserRole.MANAGER) {
    return true;
  }

  return user.teamId === resourceTeamId;
}

export function requireManager(user: AuthUser): boolean {
  return user.role === UserRole.MANAGER;
}
