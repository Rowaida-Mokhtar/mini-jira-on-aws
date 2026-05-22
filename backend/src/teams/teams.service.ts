import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from '../auth/auth-user.type';
import {
  canAccessTeamResource,
  requireManager,
} from '../auth/authorization.helper';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './team.entity';
import { TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(private readonly teamsRepository: TeamsRepository) {}

  async create(user: AuthUser, dto: CreateTeamDto): Promise<Team> {
    if (!requireManager(user)) {
      throw new ForbiddenException('Only managers can create teams');
    }

    const now = new Date().toISOString();
    const team: Team = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      createdAt: now,
      updatedAt: now,
    };

    return this.teamsRepository.create(team);
  }

  async findAll(user: AuthUser): Promise<Team[]> {
    if (requireManager(user)) {
      return this.teamsRepository.findAll();
    }

    if (!user.teamId) {
      throw new ForbiddenException('Employee user is missing a team');
    }

    const team = await this.teamsRepository.findById(user.teamId);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (!canAccessTeamResource(user, team.id)) {
      throw new ForbiddenException('Cannot access another team');
    }

    return [team];
  }

  async findOne(user: AuthUser, id: string): Promise<Team> {
    const team = await this.getExistingTeam(id);

    if (!canAccessTeamResource(user, team.id)) {
      throw new ForbiddenException('Cannot access another team');
    }

    return team;
  }

  async update(user: AuthUser, id: string, dto: UpdateTeamDto): Promise<Team> {
    this.assertManager(user, 'Only managers can update teams');

    const existing = await this.getExistingTeam(id);
    const updated: Team = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    return this.teamsRepository.put(updated);
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    this.assertManager(user, 'Only managers can delete teams');
    await this.getExistingTeam(id);
    await this.teamsRepository.delete(id);
  }

  private async getExistingTeam(id: string): Promise<Team> {
    const team = await this.teamsRepository.findById(id);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private assertManager(user: AuthUser, message: string): void {
    if (!requireManager(user)) {
      throw new ForbiddenException(message);
    }
  }
}
