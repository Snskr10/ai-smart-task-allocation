import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Briefcase, ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { endpoints, type Employee } from "../lib/api"

export function TeamRoster() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    endpoints
      .employees()
      .then((list) => {
        if (ok) setEmployees(list)
      })
      .catch((e) => {
        if (ok) setErr(e instanceof Error ? e.message : "Failed to load")
      })
    return () => {
      ok = false
    }
  }, [])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Team roster</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Skill profiles and current workload for every team member.
        </p>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      <motion.div
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {employees.map((emp) => {
          const workloadCapped = Math.min(emp.workload, 100)
          const loadColor =
            workloadCapped >= 80
              ? "bg-red-500"
              : workloadCapped >= 50
                ? "bg-amber-500"
                : "bg-emerald-500"

          return (
            <motion.div
              key={emp.id}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            >
              <Card className="glass-card h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{emp.name}</CardTitle>
                      <CardDescription className="text-xs truncate capitalize">{emp.role}</CardDescription>
                    </div>
                    <Link
                      to={`/employees/${emp.id}`}
                      className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors"
                      title="View profile"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {emp.skills.length === 0 ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">No skills listed</span>
                    ) : (
                      emp.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px]">
                          {skill}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>Workload</span>
                      </div>
                      <span>{workloadCapped}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${workloadCapped}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${loadColor}`}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.activeTasks}</span> active task{emp.activeTasks !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
