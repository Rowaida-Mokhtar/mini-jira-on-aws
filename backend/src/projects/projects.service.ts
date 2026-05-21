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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './project.entity';
import { ProjectsRepository } from './projects.repository';

@Injectable()
export class ProjectsService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  async create(user: AuthUser, dto: CreateProjectDto): Promise<Project> {
    this.assertManager(user, 'Only managers can create projects');

    const now = new Date().toISOString();
    const project: Project = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      teamId: dto.teamId,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    return this.projectsRepository.create(project);
  }

  async findAll(user: AuthUser): Promise<Project[]> {
    if (requireManager(user)) {
      return this.projectsRepository.findAll();
    }

    this.assertEmployeeHasTeam(user);
    return this.projectsRepository.findByTeamId(user.teamId);
  }

  async findOne(user: AuthUser, id: string): Promise<Project> {
    const project = await this.getExistingProject(id);
    this.assertCanAccessProject(user, project);
    return project;
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    this.assertManager(user, 'Only managers can update projects');

    const existing = await this.getExistingProject(id);
    const updated: Project = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    return this.projectsRepository.put(updated);
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    this.assertManager(user, 'Only managers can delete projects');
    await this.getExistingProject(id);
    await this.projectsRepository.delete(id);
  }

  private async getExistingProject(id: string): Promise<Project> {
    const project = await this.projectsRepository.findById(id);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  private assertCanAccessProject(user: AuthUser, project: Project): void {
    if (!canAccessTeamResource(user, project.teamId)) {
      throw new ForbiddenException('Cannot access project from another team');
    }
  }

  private assertEmployeeHasTeam(user: AuthUser): asserts user is AuthUser & {
    teamId: string;
  } {
    if (!requireManager(user) && !user.teamId) {
      throw new ForbiddenException('Employee user is missing a team');
    }
  }

  private assertManager(user: AuthUser, message: string): void {
    if (!requireManager(user)) {
      throw new ForbiddenException(message);
    }
  }
}
