import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.type';
import { requireManager } from '../auth/authorization.helper';
import { TeamsRepository } from '../teams/teams.repository';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly teamsRepository: TeamsRepository,
  ) {}

  async upsertMe(authUser: AuthUser): Promise<User> {
    const existing = await this.usersRepository.findById(authUser.userId);
    const now = new Date().toISOString();
    const user: User = {
      id: authUser.userId,
      email: authUser.email,
      role: authUser.role,
      teamId: existing?.teamId || authUser.teamId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    return this.usersRepository.put(user);
  }

  async findMe(authUser: AuthUser): Promise<User> {
    const user = await this.usersRepository.findById(authUser.userId);

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async findAll(authUser: AuthUser): Promise<User[]> {
    this.assertManager(authUser, 'Only managers can list users');
    return this.usersRepository.findAll();
  }

  async assignTeam(
    authUser: AuthUser,
    userId: string,
    teamId: string,
  ): Promise<User> {
    this.assertManager(authUser, 'Only managers can assign teams');

    const [user, team] = await Promise.all([
      this.usersRepository.findById(userId),
      this.teamsRepository.findById(teamId),
    ]);

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return this.usersRepository.put({
      ...user,
      teamId: team.id,
      updatedAt: new Date().toISOString(),
    });
  }

  private assertManager(user: AuthUser, message: string): void {
    if (!requireManager(user)) {
      throw new ForbiddenException(message);
    }
  }
}
