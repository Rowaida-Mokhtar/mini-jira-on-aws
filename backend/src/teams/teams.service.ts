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
}
