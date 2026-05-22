import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.type';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async upsertMe(authUser: AuthUser): Promise<User> {
    const existing = await this.usersRepository.findById(authUser.userId);
    const now = new Date().toISOString();
    const user: User = {
      id: authUser.userId,
      email: authUser.email,
      role: authUser.role,
      teamId: authUser.teamId,
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
}
