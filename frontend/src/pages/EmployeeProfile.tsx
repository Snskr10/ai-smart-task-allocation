import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowLeft, Briefcase, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, User, Tag, ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { TaskDetailModal } from "../components/TaskDetailModal"
import { endpoints, type Employee, type Task, type SilentFailureAlert } from "../lib/api"
import { formatShortDate } from "../lib/format"
import { useAuth } from "../context/AuthContext"

const STATUS_DOT: Record<string, string> = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Testing: "bg-amber-500",
  Done: "bg-emerald-500",
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Low: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
}

export function EmployeeProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = user?.role === "manager"

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [alerts, setAlerts] = useState<SilentFailureAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("All")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      endpoints.employees(),
      endpoints.tasks(),
      isManager ? endpoints.silentFailures() : Promise.resolve([]),
    ])
      .then(([emps, allT, alts]) => {
        const emp = emps.find((e) => e.id === id)
        if (!emp) { setErr("Employee not found"); return }
        setEmployee(emp)
        setAllEmployees(emps)
        setAllTasks(allT)
        setTasks(allT.filter((t) => t.assignedTo === id))
        setAlerts((alts as SilentFailureAlert[]).filter((a) => a.employeeId === id))
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false))
  }, [id, isManager])

  const handleTaskUpdated = (updated: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    setSelectedTask(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (err || !employee) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-red-500 mb-4">{err || "Employee not found"}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline">← Go back</button>
      </div>
    )
  }

  const done = tasks.filter((t) => t.status === "Done").length
  const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0
  const overdueTasks = tasks.filter((t) => t.status !== "Done" && new Date(t.deadline) < new Date()).length

  const workloadCapped = Math.min(employee.workload, 100)
  const loadColor = workloadCapped >= 80 ? "bg-red-500" : workloadCapped >= 50 ? "bg-amber-500" : "bg-emerald-500"

  const filteredTasks = statusFilter === "All" ? tasks : tasks.filter((t) => t.status === statusFilter)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <span className="text-primary font-bold text-xl">
                  {employee.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{employee.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 capitalize mt-0.5">{employee.role}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {employee.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />{s}
                    </Badge>
                  ))}
                </div>
              </div>
              {/* Workload */}
              <div className="w-full sm:w-40">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> Workload</span>
                  <span className="font-semibold">{workloadCapped}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${workloadCapped}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${loadColor}`}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Tasks", value: tasks.length, icon: Briefcase, color: "text-slate-600 dark:text-slate-400" },
          { label: "Completed", value: done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Overdue", value: overdueTasks, icon: Clock, color: "text-red-600 dark:text-red-400" },
          { label: "Active Alerts", value: alerts.length, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-4 pb-4">
              <stat.icon className={`h-5 w-5 mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Performance */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">Completion Rate</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{completionRate}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${completionRate >= 75 ? "bg-emerald-500" : completionRate >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">Avg. Progress</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{avgProgress}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-amber-200 dark:border-amber-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> Active Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{a.taskName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{a.message}</p>
                    <span className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${a.severity === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {a.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tasks */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" /> Task History ({tasks.length})
                </CardTitle>
                <CardDescription>All tasks assigned to {employee.name}</CardDescription>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-slate-700 dark:text-slate-300 outline-none focus:border-primary"
              >
                {["All", "To Do", "In Progress", "Testing", "Done"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No tasks found.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((t) => {
                  const ov = t.status !== "Done" && new Date(t.deadline) < new Date()
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="w-full flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-2 transition-colors text-left"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] ?? "bg-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.title}</p>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[t.priority] ?? ""}`}>
                            {t.priority}
                          </span>
                          {ov && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 flex-1">
                            <div className="h-1.5 flex-1 max-w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${t.progress}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.progress}%</span>
                          </div>
                          <span className="text-xs text-slate-400">Due {formatShortDate(t.deadline)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        allTasks={allTasks}
        employees={allEmployees}
        canEdit={isManager || user?.employeeId === id}
        currentUserId={user?.employeeId || null}
        onClose={() => setSelectedTask(null)}
        onUpdated={handleTaskUpdated}
      />
    </div>
  )
}
