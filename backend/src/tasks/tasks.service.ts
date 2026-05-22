import { PublishCommand } from '@aws-sdk/client-sns';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from '../auth/auth-user.type';
import {
  canAccessTeamResource,
  requireManager,
} from '../auth/authorization.helper';
import { UserRole } from '../auth/user-role.enum';
import { S3_CLIENT, SNS_CLIENT } from '../aws/aws.constants';
import { AppConfigService } from '../config/app-config.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './task.entity';
import { TaskStatus } from './task-status.enum';
import { TasksRepository } from './tasks.repository';

const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.DONE],
  [TaskStatus.DONE]: [],
};

const EMPLOYEE_ALLOWED_UPDATE_FIELDS = new Set<keyof UpdateTaskDto>(['status']);
type DefinedTaskUpdate = Partial<{
  [Key in keyof UpdateTaskDto]: NonNullable<UpdateTaskDto[Key]>;
}>;

export type UploadedTaskImageFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

type S3ClientLike = {
  send(command: PutObjectCommand | DeleteObjectCommand): Promise<unknown>;
};

type SnsClientLike = {
  send(command: PublishCommand): Promise<unknown>;
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tasksRepository: TasksRepository,
    @Inject(S3_CLIENT)
    private readonly s3Client: S3ClientLike,
    @Inject(SNS_CLIENT)
    private readonly snsClient: SnsClientLike,
    private readonly config: AppConfigService,
  ) {}

  async create(user: AuthUser, dto: CreateTaskDto): Promise<Task> {
    this.assertManager(user, 'Only managers can create tasks');

    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: dto.title,
      description: dto.description,
      status: dto.status,
      priority: dto.priority,
      deadline: dto.deadline,
      teamId: dto.teamId,
      projectId: dto.projectId,
      assigneeId: dto.assigneeId,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    const createdTask = await this.tasksRepository.create(task);
    await this.publishTaskAssignedEvent(createdTask);

    return createdTask;
  }

  async findAll(user: AuthUser): Promise<Task[]> {
    if (requireManager(user)) {
      return this.tasksRepository.findAll();
    }

    this.assertEmployeeHasTeam(user);
    return this.tasksRepository.findByTeamId(user.teamId);
  }

  async findOne(user: AuthUser, id: string): Promise<Task> {
    const task = await this.getExistingTask(id);
    this.assertCanAccessTask(user, task);
    return task;
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto): Promise<Task> {
    const existing = await this.getExistingTask(id);
    this.assertCanAccessTask(user, existing);
    const requestedUpdate = this.getDefinedUpdateFields(dto);
    this.assertUpdateIsAllowed(user, requestedUpdate);

    if (requestedUpdate.status) {
      this.assertValidStatusTransition(existing.status, requestedUpdate.status);
    }

    const updated: Task = {
      ...existing,
      ...requestedUpdate,
      updatedAt: new Date().toISOString(),
    };

    return this.tasksRepository.put(updated);
  }

  async delete(user: AuthUser, id: string): Promise<void> {
    this.assertManager(user, 'Only managers can delete tasks');
    await this.getExistingTask(id);
    await this.tasksRepository.delete(id);
  }

  async uploadImage(
    user: AuthUser,
    taskId: string,
    file: UploadedTaskImageFile | undefined,
  ): Promise<Task> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const existing = await this.getExistingTask(taskId);
    this.assertCanAccessTask(user, existing);

    const uploadedAt = new Date().toISOString();
    const imageKey = this.createImageKey(taskId, uploadedAt, file.originalname);

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.taskImagesBucket,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const updated: Task = {
      ...existing,
      imageKey,
      imageUrl: this.createImageUrl(imageKey),
      imageUploadedAt: uploadedAt,
      updatedAt: uploadedAt,
    };

    return this.tasksRepository.put(updated);
  }

  async deleteImage(user: AuthUser, taskId: string): Promise<Task> {
    const existing = await this.getExistingTask(taskId);
    this.assertCanAccessTask(user, existing);

    if (existing.imageKey) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.config.taskImagesBucket,
          Key: existing.imageKey,
        }),
      );
    }

    const { imageKey, imageUrl, imageUploadedAt, ...taskWithoutImage } =
      existing;
    const updated: Task = {
      ...taskWithoutImage,
      updatedAt: new Date().toISOString(),
    };

    return this.tasksRepository.put(updated);
  }

  private async getExistingTask(id: string): Promise<Task> {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private assertCanAccessTask(user: AuthUser, task: Task): void {
    if (!canAccessTeamResource(user, task.teamId)) {
      throw new ForbiddenException('Cannot access task from another team');
    }
  }

  private getDefinedUpdateFields(dto: UpdateTaskDto): DefinedTaskUpdate {
    return Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as DefinedTaskUpdate;
  }

  private assertUpdateIsAllowed(
    user: AuthUser,
    requestedUpdate: DefinedTaskUpdate,
  ): void {
    const fields = Object.keys(requestedUpdate) as (keyof UpdateTaskDto)[];

    if (fields.length === 0) {
      throw new BadRequestException('At least one task field is required');
    }

    if (user.role === UserRole.MANAGER) {
      return;
    }

    const forbiddenFields = fields.filter(
      (field) => !EMPLOYEE_ALLOWED_UPDATE_FIELDS.has(field),
    );

    if (forbiddenFields.length > 0) {
      throw new ForbiddenException('Employees can only update task status');
    }
  }

  private assertValidStatusTransition(
    currentStatus: TaskStatus,
    nextStatus: TaskStatus,
  ): void {
    if (currentStatus === nextStatus) {
      return;
    }

    if (!ALLOWED_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid task status transition from ${currentStatus} to ${nextStatus}`,
      );
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

  private createImageKey(
    taskId: string,
    uploadedAt: string,
    originalFilename: string,
  ): string {
    const timestamp = uploadedAt.replace(/[:.]/g, '-');
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `tasks/${taskId}/${timestamp}-${safeFilename}`;
  }

  private createImageUrl(imageKey: string): string {
    const encodedKey = imageKey.split('/').map(encodeURIComponent).join('/');
    return `https://${this.config.taskImagesBucket}.s3.${this.config.awsRegion}.amazonaws.com/${encodedKey}`;
  }

  private async publishTaskAssignedEvent(task: Task): Promise<void> {
    try {
      await this.snsClient.send(
        new PublishCommand({
          TopicArn: this.config.assignmentTopicArn,
          Message: JSON.stringify({
            taskId: task.id,
            title: task.title,
            projectId: task.projectId,
            teamId: task.teamId,
            assigneeId: task.assigneeId,
            assignedBy: task.createdBy,
            assignedAt: task.createdAt,
          }),
          MessageAttributes: {
            eventType: {
              DataType: 'String',
              StringValue: 'TASK_ASSIGNED',
            },
            teamId: {
              DataType: 'String',
              StringValue: task.teamId,
            },
          },
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish TASK_ASSIGNED event for task ${task.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
