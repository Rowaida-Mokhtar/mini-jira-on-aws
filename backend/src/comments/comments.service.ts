import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AuthUser } from '../auth/auth-user.type';
import { canAccessTeamResource } from '../auth/authorization.helper';
import { TasksRepository } from '../tasks/tasks.repository';
import { Comment } from './comment.entity';
import { CommentsRepository } from './comments.repository';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly tasksRepository: TasksRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(
    user: AuthUser,
    taskId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    const task = await this.getAccessibleTask(user, taskId);
    const now = new Date().toISOString();
    const comment: Comment = {
      id: uuidv4(),
      taskId,
      teamId: task.teamId,
      authorId: user.userId,
      authorEmail: user.email,
      body: dto.body,
      createdAt: now,
      updatedAt: now,
    };

    const createdComment = await this.commentsRepository.create(comment);
    await this.activityLogService.createTaskCommented(task, user.userId);

    return createdComment;
  }

  async findByTaskId(user: AuthUser, taskId: string): Promise<Comment[]> {
    await this.getAccessibleTask(user, taskId);
    return this.commentsRepository.findByTaskId(taskId);
  }

  private async getAccessibleTask(user: AuthUser, taskId: string) {
    const task = await this.tasksRepository.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!canAccessTeamResource(user, task.teamId)) {
      throw new ForbiddenException('Cannot access comments for another team');
    }

    return task;
  }
}
