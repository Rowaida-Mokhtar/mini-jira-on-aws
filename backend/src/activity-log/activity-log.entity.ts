export type ActivityAction =
  | 'ASSIGNED'
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_ASSIGNEE_CHANGED';

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
