export type ActivityAction =
  | 'ASSIGNED'
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_ASSIGNEE_CHANGED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_IMAGE_UPLOADED'
  | 'TASK_IMAGE_DELETED'
  | 'TASK_COMMENTED';

export type ActivityLog = {
  id: string;
  action: ActivityAction;
  taskId: string;
  title?: string;
  teamId: string;
  projectId?: string;
  actorId: string;
  assigneeId?: string;
  previousAssigneeId?: string;
  status?: string;
  previousStatus?: string;
  createdAt: string;
  timestamp: string;
};
