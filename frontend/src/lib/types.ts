export type Role = "MANAGER" | "EMPLOYEE";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Team = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

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

export type Comment = {
  id: string;
  taskId: string;
  teamId: string;
  authorId: string;
  authorEmail: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityLog = {
  id: string;
  action:
    | "ASSIGNED"
    | "TASK_CREATED"
    | "TASK_ASSIGNED"
    | "TASK_ASSIGNEE_CHANGED"
    | "TASK_STATUS_CHANGED"
    | "TASK_IMAGE_UPLOADED"
    | "TASK_IMAGE_DELETED"
    | "TASK_COMMENTED";
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
