import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { motion } from "framer-motion"
import { TrendingUp, Layers, FolderKanban } from "lucide-react"
import { endpoints, type Task } from "../lib/api"
import { isOverdue } from "../lib/format"

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#64748b"]
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "none",
    borderRadius: "8px",
    color: "white",
  },
  itemStyle: { color: "white" },
}

export function Analytics() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    endpoints
      .tasks()
      .then((t) => {
        if (ok) setTasks(t)
      })
      .catch((e) => {
        if (ok) setErr(e instanceof Error ? e.message : "Failed to load")
      })
    return () => {
      ok = false
    }
  }, [])

  const pieData = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      const key = t.assignedEmployeeName || "Unassigned"
      map.set(key, (map.get(key) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [tasks])

  const statusData = useMemo(() => {
    const order = ["To Do", "In Progress", "Testing", "Done"]
    const map = new Map<string, number>(order.map((s) => [s, 0]))
    for (const t of tasks) {
      map.set(t.status, (map.get(t.status) || 0) + 1)
    }
    return order.map((name) => ({ name, count: map.get(name) ?? 0 }))
  }, [tasks])

  const priorityData = useMemo(() => {
    const order = ["High", "Medium", "Low"]
    const map = new Map<string, number>(order.map((p) => [p, 0]))
    for (const t of tasks) {
      map.set(t.priority, (map.get(t.priority) || 0) + 1)
    }
    return order.map((name) => ({ name, count: map.get(name) ?? 0 }))
  }, [tasks])

  const overdueCount = useMemo(
    () => tasks.filter((t) => isOverdue(t.deadline, t.status)).length,
    [tasks]
  )

  const perfData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; done: number; totalProgress: number }>()
    for (const t of tasks) {
      if (!t.assignedTo || !t.assignedEmployeeName) continue
      if (!map.has(t.assignedTo)) {
        map.set(t.assignedTo, { name: t.assignedEmployeeName, total: 0, done: 0, totalProgress: 0 })
      }
      const r = map.get(t.assignedTo)!
      r.total++
      if (t.status === "Done") r.done++
      r.totalProgress += t.progress
    }
    return Array.from(map.values())
      .map((r) => ({
        name: r.name,
        total: r.total,
        done: r.done,
        completionRate: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
        avgProgress: r.total > 0 ? Math.round(r.totalProgress / r.total) : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)
  }, [tasks])

  const projectData = useMemo(() => {
    const map = new Map<string, { total: number; done: number; inProgress: number; overdue: number }>()
    for (const t of tasks) {
      const key = t.project || "No Project"
      if (!map.has(key)) map.set(key, { total: 0, done: 0, inProgress: 0, overdue: 0 })
      const r = map.get(key)!
      r.total++
      if (t.status === "Done") r.done++
      if (t.status === "In Progress") r.inProgress++
      if (t.status !== "Done" && new Date(t.deadline) < new Date()) r.overdue++
    }
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        completionPct: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [tasks])

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Organization analytics</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Live charts derived from current task data — status pipeline, priority breakdown, and assignee load.
        </p>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total tasks", value: tasks.length },
          { label: "Done", value: tasks.filter((t) => t.status === "Done").length },
          { label: "In progress", value: tasks.filter((t) => t.status === "In Progress").length },
          { label: "Overdue", value: overdueCount, danger: overdueCount > 0 },
        ].map((x) => (
          <Card key={x.label} className="glass-card">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">{x.label}</p>
              <p className={`text-2xl font-bold ${x.danger ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                {x.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Tasks by status</CardTitle>
              <CardDescription>Pipeline health across all stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                      {statusData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Tasks by priority</CardTitle>
              <CardDescription>Workload urgency distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" name="Tasks" radius={[6, 6, 0, 0]}>
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Workload by assignee</CardTitle>
              <CardDescription>Task counts from the API</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {pieData.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400 p-8 text-center">No tasks loaded</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Project-level Analytics */}
      {projectData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Project Overview
              </CardTitle>
              <CardDescription>Task breakdown and completion rate per project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectData} margin={{ top: 5, right: 16, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="done" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Legend verticalAlign="top" height={28} iconType="circle" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Project</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Tasks</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Done</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-red-500 dark:text-red-400">Overdue</th>
                      <th className="text-left py-2 pl-3 font-medium text-slate-600 dark:text-slate-400">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {projectData.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-slate-400" />{p.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">{p.total}</td>
                        <td className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">{p.done}</td>
                        <td className={`py-3 px-3 text-center font-medium ${p.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
                          {p.overdue}
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden min-w-[80px]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${p.completionPct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${p.completionPct >= 75 ? "bg-emerald-500" : p.completionPct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8 text-right">{p.completionPct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Employee Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Employee Performance
            </CardTitle>
            <CardDescription>Completion rate and average progress per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {perfData.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No assigned tasks yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pr-4 font-medium text-slate-600 dark:text-slate-400">Employee</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Assigned</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Done</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Completion Rate</th>
                      <th className="text-left py-2 pl-3 font-medium text-slate-600 dark:text-slate-400">Avg Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {perfData.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">{row.total}</td>
                        <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">{row.done}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden min-w-[80px]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${row.completionRate}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                  row.completionRate >= 75
                                    ? "bg-emerald-500"
                                    : row.completionRate >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-400"
                                }`}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8 text-right">
                              {row.completionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden min-w-[80px]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${row.avgProgress}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                                className="h-full rounded-full bg-primary"
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-8 text-right">
                              {row.avgProgress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
