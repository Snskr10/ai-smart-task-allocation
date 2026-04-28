const BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001"

export type User = {
  id: string
  role: "manager" | "employee"
  name: string
  employeeId?: string
}

export type Employee = {
  id: string
  name: string
  role: string
  skills: string[]
  activeTasks: number
  workload: number
}

export type TaskComment = { text: string; at: string; authorId: string | null }

export type Task = {
  id: string
  title: string
  description: string
  requiredSkills: string[]
  assignedTo: string | null
  assignedEmployeeName?: string | null
  deadline: string
  priority: string
  status: string
  progress: number
  lastUpdated: string
  lastProgressUpdate: string
  statusSince: string
  comments: TaskComment[]
  project?: string | null
  sprintId?: string | null
  dependencies?: string[]
}

export type Sprint = {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: "planned" | "active" | "completed"
  taskCount?: number
  completedCount?: number
  retrospective?: string
}

export type BurndownPoint = {
  day: number
  date: string
  remaining: number | null
  ideal: number
}

export type SprintBurndown = {
  sprint: Sprint
  totalTasks: number
  points: BurndownPoint[]
}

export type ProjectSummary = {
  name: string
  taskCount: number
}

export type SilentFailureAlert = {
  id: string
  taskId: string
  employeeId: string
  type: string
  severity: string
  message: string
  reason: string
  employeeName: string
  taskName: string
  lastUpdate: string
  riskLevel: string
}

export type PlannedTaskEmployee = {
  id: string
  name: string
  role: string
  skills: string[]
  workload: number
  activeTasks: number
  matchScore: number
  skillMatch: number
}

export type PlannedTaskAlternative = {
  id: string
  name: string
  role: string
  workload: number
  skillMatch: number
}

export type PlannedTask = {
  taskTitle: string
  description: string
  requiredSkills: string[]
  deadline: string
  priority: string
  suggestedEmployee: PlannedTaskEmployee
  alternatives: PlannedTaskAlternative[]
}

export type ProjectPlan = {
  project: string
  description: string
  deadline: string
  priority: string
  tasks: PlannedTask[]
}

export type CreateProjectResult = {
  created: Task[]
  errors: { title: string; error: string }[]
}

export type SilentFailureRulesConfig = {
  staleDays: number
  stuckStageDays: number
  deadlineNearDays: number
  lowProgressThreshold: number
  maxSuggestedActive: number
  workloadUnit: number
}

export type LoginResponse = { token: string; user: User }

export type ManagerDashboardData = {
  totalEmployees: number
  totalTasks: number
  activeTasks: number
  delayedTasks: number
  silentFailureAlerts: number
  workload: Employee[]
}

export type AIAssignResponse = {
  recommended: {
    employeeId: string
    name: string
    role: string
    matchScore: number
    skillMatch: number
    workloadFactor: number
    score: number
    skills: string[]
    reason: string
  }
  rankings: Array<{
    employee: Employee
    skillMatch: number
    workloadFactor: number
    score: number
    atCapacity: boolean
  }>
  draft: Record<string, unknown>
}

async function parseError(r: Response): Promise<string> {
  try {
    const j = await r.json()
    if (j && typeof j.error === "string") return j.error
    if (j && j.hint) return `${j.error || r.statusText}: ${j.hint}`
  } catch {
    void 0
  }
  return r.statusText || "Request failed"
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  if (!r.ok) throw new Error(await parseError(r))
  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}

export const endpoints = {
  login: (body: { role: string; employeeId?: string }) =>
    api<LoginResponse>("/login", { method: "POST", body: JSON.stringify(body) }),
  employees: () => api<Employee[]>("/employees"),
  projects: () => api<ProjectSummary[]>("/projects"),
  tasks: () => api<Task[]>("/tasks"),
  tasksByEmployee: (id: string) => api<Task[]>(`/tasks/employee/${encodeURIComponent(id)}`),
  createTask: (body: Record<string, unknown>) =>
    api<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  assignAI: (body: Record<string, unknown>) =>
    api<AIAssignResponse>("/tasks/assign-ai", { method: "POST", body: JSON.stringify(body) }),
  updateProgress: (taskId: string, body: { status?: string; progress?: number; comment?: string; authorId?: string | null; dependencies?: string[] }) =>
    api<Task>(`/tasks/${encodeURIComponent(taskId)}/progress`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  silentFailures: () => api<SilentFailureAlert[]>("/alerts/silent-failures"),
  silentFailureRulesConfig: () => api<SilentFailureRulesConfig>("/config/silent-failure-rules"),
  managerDashboard: () => api<ManagerDashboardData>("/dashboard/manager"),
  deleteTask: (taskId: string) =>
    api<void>(`/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" }),
  reassignTask: (taskId: string, assignedTo: string) =>
    api<Task>(`/tasks/${encodeURIComponent(taskId)}/reassign`, {
      method: "PUT",
      body: JSON.stringify({ assignedTo }),
    }),
  planProject: (body: { title: string; description: string; deadline: string; priority: string }) =>
    api<ProjectPlan>("/projects/plan", { method: "POST", body: JSON.stringify(body) }),
  createProjectTasks: (payload: {
    project?: string | null
    tasks: Array<{ title: string; description: string; requiredSkills: string[]; deadline: string; priority: string; assignedTo: string | null }>
  }) => api<CreateProjectResult>("/projects/create-all", { method: "POST", body: JSON.stringify(payload) }),
  sprints: () => api<Sprint[]>("/sprints"),
  createSprint: (body: { name: string; goal?: string; startDate: string; endDate: string; status?: string }) =>
    api<Sprint>("/sprints", { method: "POST", body: JSON.stringify(body) }),
  updateSprint: (sprintId: string, body: Partial<Omit<Sprint, "id" | "taskCount" | "completedCount">>) =>
    api<Sprint>(`/sprints/${encodeURIComponent(sprintId)}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteSprint: (sprintId: string) =>
    api<void>(`/sprints/${encodeURIComponent(sprintId)}`, { method: "DELETE" }),
  assignTaskSprint: (taskId: string, sprintId: string | null) =>
    api<Task>(`/tasks/${encodeURIComponent(taskId)}/sprint`, {
      method: "PUT",
      body: JSON.stringify({ sprintId }),
    }),
  sprintBurndown: (sprintId: string) =>
    api<SprintBurndown>(`/sprints/${encodeURIComponent(sprintId)}/burndown`),
  mlStatus: () => api<Record<string, unknown>>("/ml/status"),
  mlTrain: () => api<{ success: boolean; metadata: Record<string, unknown> }>("/ml/train", { method: "POST" }),
}
