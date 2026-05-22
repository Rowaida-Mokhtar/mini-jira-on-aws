"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AuthSession,
  clearStoredSession,
  getStoredSession,
  isSessionExpired,
  refreshStoredSession,
} from "@/lib/auth";
import { apiRequest, syncUserProfile } from "@/lib/api";
import {
  ActivityLog,
  Comment,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  Team,
  UserProfile,
} from "@/lib/types";

const statuses: Array<{ value: TaskStatus; label: string }> = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "DONE", label: "Done" },
];

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [teamForm, setTeamForm] = useState({ name: "" });
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    teamId: "",
  });
  const [taskForm, setTaskForm] = useState(() => ({
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    deadline: dateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    projectId: "",
    teamId: "",
    assigneeId: "",
  }));
  const [commentBody, setCommentBody] = useState("");
  const [commentsTaskId, setCommentsTaskId] = useState("");

  const activeProject =
    selectedProjectId === "all"
      ? undefined
      : projects.find((project) => project.id === selectedProjectId);
  const activeTeamId = profile?.teamId || teams[0]?.id || "";
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedProjectId !== "all" && task.projectId !== selectedProjectId) {
        return false;
      }

      return profile?.role === "MANAGER" || task.assigneeId === profile?.id;
    });
  }, [profile?.id, profile?.role, selectedProjectId, tasks]);
  const taskCounts = useMemo(() => {
    return statuses.reduce<Record<TaskStatus, number>>(
      (counts, status) => {
        counts[status.value] = visibleTasks.filter(
          (task) => task.status === status.value,
        ).length;
        return counts;
      },
      { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
    );
  }, [visibleTasks]);
  const effectiveSelectedTaskId =
    selectedTaskId && visibleTasks.some((task) => task.id === selectedTaskId)
      ? selectedTaskId
      : visibleTasks[0]?.id || "";
  const selectedTask = tasks.find((task) => task.id === effectiveSelectedTaskId);
  const selectedTaskComments =
    commentsTaskId === selectedTask?.id ? comments : [];
  const effectiveProjectId = taskForm.projectId || projects[0]?.id || "";
  const effectiveTaskProject = projects.find(
    (project) => project.id === effectiveProjectId,
  );
  const effectiveTaskTeamId =
    effectiveTaskProject?.teamId ||
    activeProject?.teamId ||
    taskForm.teamId ||
    activeTeamId;

  const api = useCallback(
    async <T,>(path: string, options: RequestInit = {}) => {
      if (!session) {
        throw new Error("Please sign in first.");
      }

      return apiRequest<T>(session, path, options);
    },
    [session],
  );

  const loadComments = useCallback(
    async (taskId: string) => {
      try {
        setCommentsTaskId(taskId);
        setComments(await api<Comment[]>(`/tasks/${taskId}/comments`));
      } catch (nextError) {
        setError(readError(nextError));
      }
    },
    [api],
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [nextTeams, nextProjects, nextTasks, nextActivityLogs] =
        await Promise.all([
        api<Team[]>("/teams"),
        api<Project[]>("/projects"),
        api<Task[]>("/tasks"),
          api<ActivityLog[]>("/activity-log"),
        ]);

      const nextTeamId = profile?.teamId || nextTeams[0]?.id || "";
      const nextProjectId = nextProjects[0]?.id || "";
      const nextSelectedTask = nextTasks.find((task) => {
        return profile?.role === "MANAGER" || task.assigneeId === profile?.id;
      });

      setTeams(nextTeams);
      setProjects(nextProjects);
      setTasks(nextTasks);
      setActivityLogs(nextActivityLogs);
      setProjectForm((current) => ({
        ...current,
        teamId: current.teamId || nextTeamId,
      }));
      setTaskForm((current) => ({
        ...current,
        teamId: current.teamId || nextTeamId,
        projectId: current.projectId || nextProjectId,
        assigneeId: current.assigneeId || profile?.id || "",
      }));

      if (nextSelectedTask) {
        setCommentsTaskId(nextSelectedTask.id);
        setComments(
          await api<Comment[]>(`/tasks/${nextSelectedTask.id}/comments`),
        );
      } else {
        setCommentsTaskId("");
        setComments([]);
      }
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsLoading(false);
    }
  }, [api, profile]);

  useEffect(() => {
    async function restoreSession() {
      const storedSession = getStoredSession();

      if (!storedSession) {
        window.location.href = "/login";
        return;
      }

      if (isSessionExpired(storedSession)) {
        const refreshedSession = await refreshStoredSession();

        if (!refreshedSession) {
          window.location.href = "/login";
          return;
        }

        setSession(refreshedSession);
        setProfile(await syncUserProfile(refreshedSession));
      } else {
        setSession(storedSession);
        setProfile(await syncUserProfile(storedSession));
      }

      setIsCheckingAuth(false);
    }

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!session || !profile) {
      return;
    }

    // Loading DynamoDB-backed workspace data is the authenticated sync point.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
  }, [loadWorkspace, profile, session]);

  function logout() {
    clearStoredSession();
    window.location.href = "/login";
  }

  function selectProject(projectId: string) {
    setSelectedProjectId(projectId);
    const nextTask = tasks.find((task) => {
      const projectMatches = projectId === "all" || task.projectId === projectId;
      const roleMatches =
        profile?.role === "MANAGER" || task.assigneeId === profile?.id;
      return projectMatches && roleMatches;
    });

    setSelectedTaskId(nextTask?.id || "");

    if (nextTask) {
      void loadComments(nextTask.id);
    } else {
      setCommentsTaskId("");
      setComments([]);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const team = await api<Team>("/teams", {
        method: "POST",
        body: JSON.stringify({ name: teamForm.name }),
      });
      setTeams((current) => [team, ...current]);
      setTeamForm({ name: "" });
      setProjectForm((current) => ({ ...current, teamId: team.id }));
      setTaskForm((current) => ({ ...current, teamId: team.id }));
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const project = await api<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          ...projectForm,
          teamId: projectForm.teamId || activeTeamId,
        }),
      });
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      setProjectForm({ name: "", description: "", teamId: project.teamId });
      setTaskForm((current) => ({
        ...current,
        projectId: project.id,
        teamId: project.teamId,
      }));
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!effectiveProjectId || !effectiveTaskTeamId) {
      setError("Create a team and project before adding tasks.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const task = await api<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...taskForm,
          projectId: effectiveProjectId,
          teamId: effectiveTaskTeamId,
          deadline: new Date(taskForm.deadline).toISOString(),
          assigneeId: taskForm.assigneeId.trim(),
        }),
      });
      setTasks((current) => [task, ...current]);
      setSelectedTaskId(task.id);
      setCommentsTaskId(task.id);
      setComments([]);
      setTaskForm((current) => ({
        ...current,
        title: "",
        description: "",
        status: "TODO",
        priority: "MEDIUM",
      }));
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    setIsSaving(true);
    setError("");

    try {
      const updated = await api<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updated : item)),
      );
      setSelectedTaskId(updated.id);
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTask || !commentBody.trim()) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const comment = await api<Comment>(`/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      });
      setComments((current) => [comment, ...current]);
      setCommentsTaskId(selectedTask.id);
      setCommentBody("");
    } catch (nextError) {
      setError(readError(nextError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isCheckingAuth || !session || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] text-sm text-[#697586]">
        Loading workspace...
      </main>
    );
  }

  const isManager = profile.role === "MANAGER";

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#17202a]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-[#d8dee7] bg-[#102033] text-white lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-8 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fb5d9]">
                Mini-Jira
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Team workspace
              </h1>
            </div>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a9bdd3]">
                Account
              </p>
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-[#d6e2ef]">
                <p className="font-medium text-white">{profile.email}</p>
                <p className="mt-1">Role: {profile.role}</p>
                <p className="mt-1">Team: {profile.teamId || activeTeamId || "None"}</p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a9bdd3]">
                  Projects
                </p>
                <span className="text-xs text-[#d6e2ef]">{projects.length}</span>
              </div>
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  selectedProjectId === "all"
                    ? "bg-[#2f80ed] text-white"
                    : "text-[#d6e2ef] hover:bg-white/10"
                }`}
                type="button"
                onClick={() => selectProject("all")}
              >
                All projects
              </button>
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      selectedProjectId === project.id
                        ? "bg-[#2f80ed] text-white"
                        : "text-[#d6e2ef] hover:bg-white/10"
                    }`}
                    key={project.id}
                    type="button"
                    onClick={() => selectProject(project.id)}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            </section>

            <button
              className="mt-auto rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              type="button"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[#d8dee7] bg-white px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-medium text-[#697586]">
                  {activeProject ? activeProject.name : "All active work"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">
                  {isManager ? "Manager board" : "My assigned tasks"}
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:flex">
                {statuses.map((status) => (
                  <div
                    className="rounded-md border border-[#d8dee7] bg-[#f9fafb] px-3 py-2 text-center"
                    key={status.value}
                  >
                    <p className="text-xs font-medium text-[#697586]">
                      {status.label}
                    </p>
                    <p className="text-lg font-semibold text-[#111827]">
                      {taskCounts[status.value]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          {error ? (
            <div className="border-b border-[#f2c6b4] bg-[#fff4ef] px-5 py-3 text-sm text-[#9a3412]">
              {error}
            </div>
          ) : null}

          <div className="grid flex-1 grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-w-0 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {statuses.map((status) => (
                  <div
                    className="flex min-h-[28rem] flex-col rounded-md border border-[#d8dee7] bg-[#eef2f6]"
                    key={status.value}
                  >
                    <div className="flex items-center justify-between border-b border-[#d8dee7] px-3 py-3">
                      <h3 className="text-sm font-semibold text-[#344054]">
                        {status.label}
                      </h3>
                      <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-[#697586]">
                        {taskCounts[status.value]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-3">
                      {isLoading ? (
                        <div className="rounded-md border border-dashed border-[#c3cad5] p-4 text-sm text-[#697586]">
                          Loading tasks...
                        </div>
                      ) : null}
                      {!isLoading &&
                        visibleTasks
                          .filter((task) => task.status === status.value)
                          .map((task) => (
                            <article
                              className={`rounded-md border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                effectiveSelectedTaskId === task.id
                                  ? "border-[#2f80ed]"
                                  : "border-[#d8dee7]"
                              }`}
                              key={task.id}
                            >
                              <button
                                className="block w-full text-left"
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  void loadComments(task.id);
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <h4 className="text-sm font-semibold text-[#111827]">
                                    {task.title}
                                  </h4>
                                  <span
                                    className={`rounded px-2 py-1 text-[11px] font-bold ${priorityClass(task.priority)}`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="mt-2 line-clamp-3 text-sm text-[#697586]">
                                  {task.description || "No description"}
                                </p>
                                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#697586]">
                                  <span>{projectName(projects, task.projectId)}</span>
                                  <span>{formatDate(task.deadline)}</span>
                                </div>
                              </button>
                              <select
                                className="mt-3 h-9 w-full rounded border border-[#d8dee7] bg-white px-2 text-sm text-[#344054]"
                                value={task.status}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateTaskStatus(
                                    task,
                                    event.target.value as TaskStatus,
                                  )
                                }
                              >
                                {statuses.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                    disabled={!canMoveToStatus(task.status, option.value)}
                                  >
                                    Move to {option.label}
                                  </option>
                                ))}
                              </select>
                            </article>
                          ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="space-y-4">
              {isManager ? (
                <section className="rounded-md border border-[#d8dee7] bg-white p-4">
                  <h3 className="text-base font-semibold text-[#111827]">
                    New team
                  </h3>
                  <form className="mt-4 space-y-3" onSubmit={createTeam}>
                    <label className="block text-sm font-medium text-[#344054]">
                      Name
                      <input
                        className="mt-1 h-10 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                        value={teamForm.name}
                        required
                        maxLength={100}
                        onChange={(event) =>
                          setTeamForm({ name: event.target.value })
                        }
                      />
                    </label>
                    <button
                      className="h-10 w-full rounded-md bg-[#102033] px-3 text-sm font-semibold text-white transition hover:bg-[#1c324d] disabled:cursor-not-allowed disabled:opacity-60"
                      type="submit"
                      disabled={isSaving}
                    >
                      Create team
                    </button>
                  </form>
                </section>
              ) : null}

              <section className="rounded-md border border-[#d8dee7] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#111827]">
                    New project
                  </h3>
                  <span className="text-xs font-medium text-[#697586]">
                    Manager
                  </span>
                </div>
                <form className="mt-4 space-y-3" onSubmit={createProject}>
                  <label className="block text-sm font-medium text-[#344054]">
                    Name
                    <input
                      className="mt-1 h-10 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                      value={projectForm.name}
                      required
                      maxLength={120}
                      disabled={!isManager}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#344054]">
                    Team
                    <select
                      className="mt-1 h-10 w-full rounded border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
                      value={projectForm.teamId || activeTeamId}
                      required
                      disabled={!isManager}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          teamId: event.target.value,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Select team
                      </option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-[#344054]">
                    Description
                    <textarea
                      className="mt-1 min-h-20 w-full resize-none rounded border border-[#cfd7e3] px-3 py-2 text-sm outline-none focus:border-[#2f80ed]"
                      value={projectForm.description}
                      maxLength={1000}
                      disabled={!isManager}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="h-10 w-full rounded-md bg-[#1f6feb] px-3 text-sm font-semibold text-white transition hover:bg-[#1a5fcc] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={isSaving || !isManager}
                  >
                    {isManager ? "Create project" : "Manager only"}
                  </button>
                </form>
              </section>

              <section className="rounded-md border border-[#d8dee7] bg-white p-4">
                <h3 className="text-base font-semibold text-[#111827]">
                  Activity log
                </h3>
                <div className="mt-4 space-y-3">
                  {activityLogs.slice(0, 8).map((activity) => (
                    <div
                      className="rounded-md border border-[#e3e8ef] bg-[#f9fafb] p-3"
                      key={activity.id}
                    >
                      <p className="text-sm font-semibold text-[#111827]">
                        {formatActivityAction(activity.action)}
                      </p>
                      <p className="mt-1 text-sm text-[#4b5563]">
                        {activity.title || activity.taskId}
                      </p>
                      <p className="mt-2 text-xs text-[#697586]">
                        {formatDate(activity.timestamp || activity.createdAt)}
                      </p>
                    </div>
                  ))}
                  {!activityLogs.length ? (
                    <p className="rounded-md border border-dashed border-[#cfd7e3] p-3 text-sm text-[#697586]">
                      No activity yet.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-md border border-[#d8dee7] bg-white p-4">
                <h3 className="text-base font-semibold text-[#111827]">
                  New task
                </h3>
                <form className="mt-4 space-y-3" onSubmit={createTask}>
                  <label className="block text-sm font-medium text-[#344054]">
                    Title
                    <input
                      className="mt-1 h-10 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                      value={taskForm.title}
                      required
                      maxLength={160}
                      disabled={!isManager}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#344054]">
                    Project
                    <select
                      className="mt-1 h-10 w-full rounded border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
                      value={effectiveProjectId}
                      required
                      disabled={!isManager}
                      onChange={(event) => {
                        const nextProject = projects.find(
                          (project) => project.id === event.target.value,
                        );
                        setTaskForm((current) => ({
                          ...current,
                          projectId: event.target.value,
                          teamId: nextProject?.teamId || current.teamId,
                        }));
                      }}
                    >
                      <option value="" disabled>
                        Select project
                      </option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm font-medium text-[#344054]">
                      Priority
                      <select
                        className="mt-1 h-10 w-full rounded border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#2f80ed]"
                        value={taskForm.priority}
                        disabled={!isManager}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            priority: event.target.value as TaskPriority,
                          }))
                        }
                      >
                        {priorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm font-medium text-[#344054]">
                      Due
                      <input
                        className="mt-1 h-10 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                        type="date"
                        value={taskForm.deadline}
                        required
                        disabled={!isManager}
                        onChange={(event) =>
                          setTaskForm((current) => ({
                            ...current,
                            deadline: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-[#344054]">
                    Assignee user ID
                    <input
                      className="mt-1 h-10 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2f80ed]"
                      value={taskForm.assigneeId}
                      required
                      disabled={!isManager}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          assigneeId: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#344054]">
                    Description
                    <textarea
                      className="mt-1 min-h-24 w-full resize-none rounded border border-[#cfd7e3] px-3 py-2 text-sm outline-none focus:border-[#2f80ed]"
                      value={taskForm.description}
                      maxLength={2000}
                      disabled={!isManager}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button
                    className="h-10 w-full rounded-md bg-[#0f766e] px-3 text-sm font-semibold text-white transition hover:bg-[#0b5f59] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={isSaving || !isManager}
                  >
                    {isManager ? "Create task" : "Manager only"}
                  </button>
                </form>
              </section>

              <section className="rounded-md border border-[#d8dee7] bg-white p-4">
                <h3 className="text-base font-semibold text-[#111827]">
                  Task details
                </h3>
                {selectedTask ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#697586]">
                        {projectName(projects, selectedTask.projectId)}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-[#111827]">
                        {selectedTask.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                        {selectedTask.description || "No description added."}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <Detail
                        label="Status"
                        value={labelForStatus(selectedTask.status)}
                      />
                      <Detail label="Priority" value={selectedTask.priority} />
                      <Detail label="Assignee" value={selectedTask.assigneeId} />
                      <Detail label="Due" value={formatDate(selectedTask.deadline)} />
                    </dl>
                    {selectedTask.imageUrl ? (
                      <img
                        className="max-h-56 w-full rounded-md object-cover"
                        src={selectedTask.imageUrl}
                        alt=""
                      />
                    ) : null}
                    <form className="space-y-3" onSubmit={addComment}>
                      <label className="block text-sm font-medium text-[#344054]">
                        Comment
                        <textarea
                          className="mt-1 min-h-20 w-full resize-none rounded border border-[#cfd7e3] px-3 py-2 text-sm outline-none focus:border-[#2f80ed]"
                          value={commentBody}
                          onChange={(event) => setCommentBody(event.target.value)}
                        />
                      </label>
                      <button
                        className="h-10 w-full rounded-md border border-[#cfd7e3] px-3 text-sm font-semibold text-[#344054] transition hover:bg-[#f3f6fa] disabled:cursor-not-allowed disabled:opacity-60"
                        type="submit"
                        disabled={isSaving || !commentBody.trim()}
                      >
                        Add comment
                      </button>
                    </form>
                    <div className="space-y-3">
                      {selectedTaskComments.map((comment) => (
                        <div
                          className="rounded-md border border-[#e3e8ef] bg-[#f9fafb] p-3"
                          key={comment.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#111827]">
                              {comment.authorEmail}
                            </p>
                            <span className="text-xs text-[#697586]">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[#4b5563]">
                            {comment.body}
                          </p>
                        </div>
                      ))}
                      {!selectedTaskComments.length ? (
                        <p className="rounded-md border border-dashed border-[#cfd7e3] p-3 text-sm text-[#697586]">
                          No comments yet.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-md border border-dashed border-[#cfd7e3] p-4 text-sm text-[#697586]">
                    Select a task to see details and comments.
                  </p>
                )}
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f3f6fa] p-3">
      <dt className="text-xs font-medium text-[#697586]">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-[#111827]">{value}</dd>
    </div>
  );
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function projectName(projects: Project[], projectId: string) {
  return projects.find((project) => project.id === projectId)?.name || "No project";
}

function labelForStatus(status: TaskStatus) {
  return statuses.find((item) => item.value === status)?.label || status;
}

function formatActivityAction(action: ActivityLog["action"]) {
  if (action === "TASK_STATUS_CHANGED") {
    return "Status changed";
  }

  if (action === "TASK_ASSIGNEE_CHANGED") {
    return "Assignee changed";
  }

  return "Task assigned";
}

function canMoveToStatus(current: TaskStatus, next: TaskStatus) {
  const allowed: Record<TaskStatus, TaskStatus[]> = {
    TODO: ["TODO", "IN_PROGRESS"],
    IN_PROGRESS: ["IN_PROGRESS", "IN_REVIEW"],
    IN_REVIEW: ["IN_REVIEW", "DONE"],
    DONE: ["DONE"],
  };

  return allowed[current].includes(next);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function priorityClass(priority: TaskPriority) {
  if (priority === "HIGH") {
    return "bg-[#fee2e2] text-[#991b1b]";
  }

  if (priority === "MEDIUM") {
    return "bg-[#fef3c7] text-[#92400e]";
  }

  return "bg-[#dcfce7] text-[#166534]";
}
