import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, Clock, User, ChevronDown, ChevronUp, ShieldCheck,
  Wand2, X, CheckCircle2, ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import {
  endpoints, type SilentFailureAlert, type SilentFailureRulesConfig,
  type AIAssignResponse, type Task,
} from "../lib/api"
import { formatRelativeDay } from "../lib/format"

export function SilentFailureAlerts() {
  const [items, setItems] = useState<SilentFailureAlert[]>([])
  const [rules, setRules] = useState<SilentFailureRulesConfig | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  // AI reassignment modal state
  const [aiAlert, setAiAlert] = useState<SilentFailureAlert | null>(null)
  const [aiResult, setAiResult] = useState<AIAssignResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [reassigning, setReassigning] = useState(false)
  const [reassigned, setReassigned] = useState<string | null>(null)

  useEffect(() => {
    let ok = true
    Promise.all([
      endpoints.silentFailures(),
      endpoints.silentFailureRulesConfig(),
      endpoints.tasks(),
    ])
      .then(([alerts, config, allTasks]) => {
        if (ok) {
          setItems(alerts)
          setRules(config)
          setTasks(allTasks)
        }
      })
      .catch((e) => {
        if (ok) setErr(e instanceof Error ? e.message : "Failed to load")
      })
    return () => { ok = false }
  }, [])

  const handleAISuggest = async (alert: SilentFailureAlert) => {
    setAiAlert(alert)
    setAiResult(null)
    setAiLoading(true)
    setReassigned(null)
    const task = tasks.find((t) => t.id === alert.taskId)
    try {
      const res = await endpoints.assignAI({
        requiredSkills: task?.requiredSkills ?? [],
        title: task?.title ?? alert.taskName,
        description: task?.description ?? "",
        priority: task?.priority ?? "Medium",
      })
      setAiResult(res)
    } catch {
      void 0
    } finally {
      setAiLoading(false)
    }
  }

  const handleReassign = async () => {
    if (!aiAlert || !aiResult) return
    setReassigning(true)
    try {
      await endpoints.reassignTask(aiAlert.taskId, aiResult.recommended.employeeId)
      setReassigned(aiResult.recommended.name)
      // Update local items to remove the alert (it may resolve)
      setItems((prev) => prev.filter((a) => a.id !== aiAlert.id))
    } catch {
      void 0
    } finally {
      setReassigning(false)
    }
  }

  const closeAiModal = () => {
    setAiAlert(null)
    setAiResult(null)
    setReassigned(null)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Silent Failure Alerts</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Tasks flagged by rule-based risk checks: stale updates, deadline pressure, and stuck stages.
        </p>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Active risk signals
          </CardTitle>
          <CardDescription>{items.length} open alerts from live task data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && !err && (
            <p className="text-sm text-slate-600 dark:text-slate-400 py-8 text-center">No silent failures detected.</p>
          )}
          {items.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-xl border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                a.riskLevel === "High"
                  ? "bg-red-500/5 border-red-500/20"
                  : a.riskLevel === "Medium"
                    ? "bg-orange-500/5 border-orange-500/20"
                    : "bg-slate-500/5 border-slate-500/15"
              }`}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold truncate text-slate-900 dark:text-slate-50">{a.taskName}</span>
                  <Badge
                    variant={a.riskLevel === "High" ? "destructive" : "secondary"}
                    className="text-[10px]"
                  >
                    {a.riskLevel}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{a.reason}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{a.message}</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end shrink-0">
                <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 sm:justify-end">
                    <User className="h-4 w-4" />
                    {a.employeeName}
                  </div>
                  <div className="flex items-center gap-1.5 sm:justify-end">
                    <Clock className="h-4 w-4" />
                    Last update {formatRelativeDay(a.lastUpdate)}
                  </div>
                </div>
                <button
                  onClick={() => handleAISuggest(a)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors"
                >
                  <Wand2 className="h-3.5 w-3.5" /> AI Suggest
                </button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {rules && (
        <Card className="glass-card">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setRulesOpen((o) => !o)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Detection rules
              </CardTitle>
              {rulesOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
            <CardDescription>Thresholds applied server-side to every task</CardDescription>
          </CardHeader>
          {rulesOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    { label: "Stale update", description: `Flag if no progress update for more than ${rules.staleDays} days` },
                    { label: "Stuck in stage", description: `Flag if status has not changed for more than ${rules.stuckStageDays} days` },
                    { label: "Deadline pressure", description: `Flag if deadline is within ${rules.deadlineNearDays} days and progress is below ${rules.lowProgressThreshold}%` },
                    { label: "Max active tasks", description: `Warn when an employee has more than ${rules.maxSuggestedActive} active tasks` },
                    { label: "Workload unit", description: `Each active task contributes ${rules.workloadUnit}% to the workload meter` },
                  ].map((rule) => (
                    <li key={rule.label} className="flex gap-3 items-start">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{rule.label}: </span>
                        <span className="text-slate-600 dark:text-slate-400">{rule.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </motion.div>
          )}
        </Card>
      )}

      {/* AI Reassignment Modal */}
      <AnimatePresence>
        {aiAlert && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeAiModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="glass-card shadow-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-primary" />
                        AI Reassignment Suggestion
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Task: <strong>{aiAlert.taskName}</strong>
                        <span className="mx-2">·</span>
                        Current assignee: {aiAlert.employeeName}
                      </CardDescription>
                    </div>
                    <button
                      onClick={closeAiModal}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reassigned ? (
                    <div className="flex flex-col items-center py-6 text-center gap-3">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Reassigned to {reassigned}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">The alert has been resolved.</p>
                      <Button onClick={closeAiModal} variant="outline" size="sm">Close</Button>
                    </div>
                  ) : aiLoading ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Analysing skills & workload…</p>
                    </div>
                  ) : aiResult ? (
                    <>
                      {/* Top recommendation */}
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-primary font-bold text-sm">
                              {aiResult.recommended.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white">{aiResult.recommended.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{aiResult.recommended.role}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{aiResult.recommended.reason}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-slate-600 dark:text-slate-400">Skill match: <strong className="text-primary">{aiResult.recommended.skillMatch}%</strong></span>
                              <span className="text-slate-600 dark:text-slate-400">Score: <strong className="text-primary">{aiResult.recommended.score.toFixed(1)}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Other options */}
                      {aiResult.rankings.length > 1 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Other candidates</p>
                          <div className="space-y-1.5">
                            {aiResult.rankings.slice(1, 4).map((r) => (
                              <div key={r.employee.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                                <User className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="flex-1 text-slate-700 dark:text-slate-300">{r.employee.name}</span>
                                <span className="text-xs text-slate-500">{r.skillMatch}% match</span>
                                {r.atCapacity && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">At capacity</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end pt-1">
                        <Button variant="outline" onClick={closeAiModal} disabled={reassigning}>Cancel</Button>
                        <Button
                          onClick={handleReassign}
                          disabled={reassigning}
                          className="gap-1.5"
                        >
                          <ArrowRight className="h-4 w-4" />
                          {reassigning ? "Reassigning…" : `Assign to ${aiResult.recommended.name}`}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      Failed to get AI suggestion. Please try again.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
