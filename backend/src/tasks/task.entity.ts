import { TaskPriority } from './task-priority.enum';
import { TaskStatus } from './task-status.enum';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  teamId: string;
  projectId: string;
  assigneeId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  imageKey?: string;
  imageUrl?: string;
  imageUploadedAt?: string;
};
