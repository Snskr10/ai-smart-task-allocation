import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, CircleDashed, Calendar, Pencil, Trash2, UserCheck, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { useAuth } from "../context/AuthContext"
import { endpoints, type Employee, type Task } from "../lib/api"
import { formatShortDate, formatRelativeDay, isOverdue } from "../lib/format"

const STATUSES = ["To Do", "In Progress", "Testing", "Done"] as const
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

type SortKey = "priority" | "deadline" | "progress"
type StatusFilter = "All" | (typeof STATUSES)[number]

export function EmployeeDashboard() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [previewId, setPreviewId] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [edit, setEdit] = useState<Task | null>(null)
  const [form, setForm] = useState({ status: "To Do", progress: 0, comment: "" })
  const [saving, setSaving] = useState(false)
  const [sortBy, setSortBy] = useState<SortKey>("priority")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All")
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null)
  const [reassignTo, setReassignTo] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const isManager = user?.role === "manager"
  const selfId = user?.role === "employee" ? user.employeeId || user.id : null
  const effectiveId = isManager ? previewId : selfId || ""

  useEffect(() => {
    if (!isManager) return
    let ok = true
    endpoints
      .employees()
      .then((list) => {
        if (ok) {
          setEmployees(list)
          setPreviewId((id) => id || list[0]?.id || "")
        }
      })
      .catch(() => void 0)
    return () => {
      ok = false
    }
  }, [isManager])

  useEffect(() => {
    if (!effectiveId) return
    let ok = true
    endpoints
      .tasksByEmployee(effectiveId)
      .then((t) => {
        if (ok) setTasks(t)
      })
      .catch((e) => {
        if (ok) setErr(e instanceof Error ? e.message : "Failed to load tasks")
      })
    return () => {
      ok = false
    }
  }, [effectiveId])

  const summary = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === "Done").length
    const active = tasks.filter((t) => t.status !== "Done").length
    const overdue = tasks.filter((t) => isOverdue(t.deadline, t.status)).length
    const avg =
      total === 0 ? 0 : Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total)
    return { total, done, active, overdue, avg }
  }, [tasks])

  const displayedTasks = useMemo(() => {
    let filtered = statusFilter === "All" ? tasks : tasks.filter((t) => t.status === statusFilter)
    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
      }
      if (sortBy === "deadline") {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      return a.progress - b.progress
    })
  }, [tasks, sortBy, statusFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Done":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "In Progress":
        return <CircleDashed className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-slate-400" />
    }
  }

  const openEdit = (t: Task) => {
    setEdit(t)
    setForm({ status: t.status as (typeof STATUSES)[number], progress: t.progress, comment: "" })
  }

  const saveEdit = async () => {
    if (!edit) return
    setSaving(true)
    setErr(null)
    try {
      await endpoints.updateProgress(edit.id, {
        status: form.status,
        progress: form.progress,
        comment: form.comment || undefined,
        authorId: effectiveId,
      })
      const next = await endpoints.tasksByEmployee(effectiveId)
      setTasks(next)
      setEdit(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    setActionBusy(true)
    setActionErr(null)
    try {
      await endpoints.deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      setConfirmDeleteId(null)
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setActionBusy(false)
    }
  }

  const handleReassign = async () => {
    if (!reassignTaskId || !reassignTo) return
    setActionBusy(true)
    setActionErr(null)
    try {
      await endpoints.reassignTask(reassignTaskId, reassignTo)
      const next = await endpoints.tasksByEmployee(effectiveId)
      setTasks(next)
      setReassignTaskId(null)
      setReassignTo("")
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "Reassign failed")
    } finally {
      setActionBusy(false)
    }
  }

  const circ = 351.8
  const offset = circ * (1 - summary.avg / 100)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isManager ? "Employee view" : "My tasks"}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {isManager
              ? "Preview any profile. Updates sync to the manager dashboard."
              : "Your queue from SilentFlow — update progress and status anytime."}
          </p>
        </div>
        {isManager && (
          <div className="flex flex-col gap-1 min-w-[220px]">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">View as</label>
            <select
              value={previewId}
              onChange={(e) => setPreviewId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Assigned", value: summary.total },
          { label: "Done", value: summary.done },
          { label: "In flight", value: summary.active },
          { label: "Overdue", value: summary.overdue },
        ].map((x) => (
          <Card key={x.label} className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">{x.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{x.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-card md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>My progress</CardTitle>
            <CardDescription>Average completion</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full rotate-[-90deg]">
                <circle cx="64" cy="64" r="56" className="stroke-muted fill-none stroke-[8px]" />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="stroke-primary fill-none stroke-[8px]"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{summary.avg}%</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Avg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Current queue <Badge variant="secondary">{displayedTasks.length}</Badge>
            </h2>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 mr-1">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="priority">Priority</option>
                  <option value="deadline">Deadline</option>
                  <option value="progress">Progress</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-slate-600 dark:text-slate-400 mr-1">Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="All">All</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {displayedTasks.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No tasks match the current filter.</p>
            )}
            {displayedTasks.map((task) => (
              <motion.div
                key={task.id}
                variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
                whileHover={{ scale: 1.01 }}
              >
                <Card className="glass-card hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="mt-1 bg-background p-2 rounded-full border shadow-sm shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{task.id}</span>
                          <Badge
                            variant={
                              task.priority === "High"
                                ? "destructive"
                                : task.priority === "Medium"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px] py-0"
                          >
                            {task.priority} priority
                          </Badge>
                          {isOverdue(task.deadline, task.status) && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              Overdue
                            </Badge>
                          )}
                          {task.project && (
                            <Badge variant="outline" className="text-[10px] py-0 border-primary/50 text-primary max-w-[200px] truncate" title={task.project}>
                              {task.project}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50">{task.title}</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Progress {task.progress}%</p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        {formatShortDate(task.deadline)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            task.status === "Done"
                              ? "border-green-500/50 text-green-600 dark:text-green-400"
                              : task.status === "In Progress"
                                ? "border-blue-500/50 text-blue-600 dark:text-blue-400"
                                : ""
                          }
                        >
                          {task.status}
                        </Badge>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(task)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Update
                        </Button>
                        {isManager && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => { setReassignTaskId(task.id); setReassignTo(""); setActionErr(null) }}
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Reassign
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => { setConfirmDeleteId(task.id); setActionErr(null) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Update task</CardTitle>
              <CardDescription className="line-clamp-2">{edit.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {edit.comments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    History ({edit.comments.length})
                  </p>
                  <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                    {edit.comments.map((c, i) => (
                      <div key={i} className="relative">
                        <div className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeDay(c.at)}</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200">{c.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Progress ({form.progress}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  placeholder="What changed?"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setEdit(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reassignTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>Reassign task</CardTitle>
              <CardDescription>Choose a new assignee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionErr && <p className="text-sm text-destructive">{actionErr}</p>}
              <select
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setReassignTaskId(null)} disabled={actionBusy}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleReassign} disabled={actionBusy || !reassignTo}>
                  {actionBusy ? "Saving…" : "Reassign"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>Delete task</CardTitle>
              <CardDescription>This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {actionErr && <p className="text-sm text-destructive">{actionErr}</p>}
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Are you sure you want to delete task <span className="font-semibold">{confirmDeleteId}</span>?
              </p>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={actionBusy}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={actionBusy}
                >
                  {actionBusy ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
