import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from '../auth/auth-user.type';
import { requireManager } from '../auth/authorization.helper';
import { Task } from '../tasks/task.entity';
import { ActivityLog } from './activity-log.entity';
import { ActivityLogRepository } from './activity-log.repository';

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  createTaskAssigned(task: Task, actorId: string) {
    return this.createTaskLog({
      action: 'TASK_ASSIGNED',
      task,
      actorId,
      assigneeId: task.assigneeId,
    });
  }

  createTaskStatusChanged(task: Task, previousStatus: string, actorId: string) {
    return this.createTaskLog({
      action: 'TASK_STATUS_CHANGED',
      task,
      actorId,
      previousStatus,
      status: task.status,
    });
  }

  createTaskAssigneeChanged(
    task: Task,
    previousAssigneeId: string,
    actorId: string,
  ) {
    return this.createTaskLog({
      action: 'TASK_ASSIGNEE_CHANGED',
      task,
      actorId,
      previousAssigneeId,
      assigneeId: task.assigneeId,
    });
  }

  async findAll(user: AuthUser): Promise<ActivityLog[]> {
    if (requireManager(user)) {
      return this.activityLogRepository.findAll();
    }

    if (!user.teamId) {
      return [];
    }

    return this.activityLogRepository.findByTeamId(user.teamId);
  }

  private createTaskLog(input: {
    action: ActivityLog['action'];
    task: Task;
    actorId: string;
    assigneeId?: string;
    previousAssigneeId?: string;
    status?: string;
    previousStatus?: string;
  }) {
    const now = new Date().toISOString();
    const activityLog: ActivityLog = {
      id: uuidv4(),
      action: input.action,
      taskId: input.task.id,
      title: input.task.title,
      teamId: input.task.teamId,
      projectId: input.task.projectId,
      actorId: input.actorId,
      assigneeId: input.assigneeId,
      previousAssigneeId: input.previousAssigneeId,
      status: input.status,
      previousStatus: input.previousStatus,
      createdAt: now,
      timestamp: now,
    };

    return this.activityLogRepository.create(activityLog);
  }
}
