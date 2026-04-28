import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, Activity, AlertTriangle, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { endpoints, type ManagerDashboardData, type SilentFailureAlert } from "../lib/api"
import { formatRelativeDay } from "../lib/format"

export function ManagerDashboard() {
  const [summary, setSummary] = useState<ManagerDashboardData | null>(null)
  const [alerts, setAlerts] = useState<SilentFailureAlert[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    Promise.all([endpoints.managerDashboard(), endpoints.silentFailures()])
      .then(([s, a]) => {
        if (ok) {
          setSummary(s)
          setAlerts(a.slice(0, 5))
        }
      })
      .catch((e) => {
        if (ok) setErr(e instanceof Error ? e.message : "Failed to load")
      })
    return () => {
      ok = false
    }
  }, [])

  const doneCount = summary
    ? summary.totalTasks - summary.activeTasks
    : 0

  const stats = summary
    ? [
        { title: "Total employees", value: String(summary.totalEmployees), icon: Users, sub: "Team roster", color: "text-blue-500" },
        { title: "Total tasks", value: String(summary.totalTasks), icon: Activity, sub: "All time", color: "text-violet-500" },
        { title: "Active tasks", value: String(summary.activeTasks), icon: CheckCircle2, sub: `${doneCount} completed`, color: "text-green-500" },
        { title: "Delayed tasks", value: String(summary.delayedTasks), icon: Clock, sub: `${summary.silentFailureAlerts} silent failures`, color: "text-orange-500" },
      ]
    : [
        { title: "Total employees", value: "—", icon: Users, sub: "Loading", color: "text-blue-500" },
        { title: "Total tasks", value: "—", icon: Activity, sub: "Loading", color: "text-violet-500" },
        { title: "Active tasks", value: "—", icon: CheckCircle2, sub: "Loading", color: "text-green-500" },
        { title: "Delayed tasks", value: "—", icon: Clock, sub: "Loading", color: "text-orange-500" },
      ]

  const workload = summary?.workload ?? []
  const maxW = Math.max(1, ...workload.map((w) => w.workload))

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Manager Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Live workload, task health, and silent-failure signals from the Python API.
        </p>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants} whileHover={{ y: -5 }} className="transition-all">
            <Card className="glass-card shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <motion.div
          className="col-span-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full glass-card">
            <CardHeader>
              <CardTitle>Workload overview</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active load per employee (progress bars)</p>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {workload.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">No data</p>}
              {workload.map((w) => (
                <div key={w.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate pr-2 text-slate-900 dark:text-slate-100">{w.name}</span>
                    <span className="text-slate-600 dark:text-slate-400 shrink-0">
                      {w.activeTasks} active · {w.workload}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(w.workload / maxW) * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="col-span-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="h-full glass-card border-red-500/20 shadow-red-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Silent failure detection
                </CardTitle>
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Top risk signals (see Alerts for full list)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length === 0 && (
                <p className="text-sm text-slate-600 dark:text-slate-400">No alerts right now.</p>
              )}
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  whileHover={{ scale: 1.02, x: 5 }}
                  className={`flex flex-col gap-2 rounded-lg border p-3 pl-4 relative overflow-hidden ${
                    alert.riskLevel === "High"
                      ? "bg-red-500/5 border-red-500/20"
                      : alert.riskLevel === "Medium"
                        ? "bg-orange-500/5 border-orange-500/20"
                        : "bg-slate-500/5 border-slate-500/15"
                  }`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      alert.riskLevel === "High"
                        ? "bg-red-500"
                        : alert.riskLevel === "Medium"
                          ? "bg-orange-500"
                          : "bg-slate-400"
                    }`}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">{alert.taskName}</div>
                    <Badge
                      variant={alert.riskLevel === "High" ? "destructive" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {alert.riskLevel} risk
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1 truncate">
                      <Users className="h-3 w-3 shrink-0" /> {alert.employeeName}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> {formatRelativeDay(alert.lastUpdate)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
