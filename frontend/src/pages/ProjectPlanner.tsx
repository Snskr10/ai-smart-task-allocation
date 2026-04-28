import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BrainCircuit, Sparkles, CheckCircle2, Users2, Calendar, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { endpoints, type ProjectPlan, type PlannedTask, type Employee } from "../lib/api"
import { formatShortDate } from "../lib/format"

type TaskOverride = { assignedTo: string }

function SkillBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-400"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>{label}</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

function TaskCard({
  planned,
  index,
  employees,
  override,
  onOverride,
}: {
  planned: PlannedTask
  index: number
  employees: Employee[]
  override: TaskOverride | undefined
  onOverride: (assignedTo: string) => void
}) {
  const [showAlt, setShowAlt] = useState(false)
  const assignedId = override?.assignedTo ?? planned.suggestedEmployee.id
  const assigned = override
    ? employees.find((e) => e.id === assignedId)
    : planned.suggestedEmployee

  const displayName = assigned ? ("name" in assigned ? assigned.name : planned.suggestedEmployee.name) : planned.suggestedEmployee.name
  const displayRole = assigned ? ("role" in assigned ? assigned.role : planned.suggestedEmployee.role) : planned.suggestedEmployee.role
  const matchScore = "matchScore" in planned.suggestedEmployee ? planned.suggestedEmployee.matchScore : 0
  const skillMatch = "skillMatch" in planned.suggestedEmployee ? planned.suggestedEmployee.skillMatch : 0
  const workload = "workload" in planned.suggestedEmployee ? planned.suggestedEmployee.workload : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 200, damping: 22 }}
    >
      <Card className="glass-card border-l-4 border-l-primary/60 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={planned.priority === "High" ? "destructive" : planned.priority === "Medium" ? "secondary" : "outline"}
                  className="text-[10px]"
                >
                  {planned.priority}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {formatShortDate(planned.deadline)}
                </div>
              </div>
              <CardTitle className="text-base leading-snug">{planned.taskTitle.split("—").pop()?.trim()}</CardTitle>
              <CardDescription className="mt-1 line-clamp-2">{planned.description}</CardDescription>
            </div>
            <div className="shrink-0 text-center">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-500">
                {matchScore}%
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">match</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {planned.requiredSkills.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
            ))}
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-xs">
                    {displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayRole}</p>
                </div>
              </div>
              <select
                value={assignedId}
                onChange={(e) => onOverride(e.target.value)}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground max-w-[140px]"
              >
                <option value={planned.suggestedEmployee.id}>{planned.suggestedEmployee.name} (AI pick)</option>
                {planned.alternatives.map((alt) => (
                  <option key={alt.id} value={alt.id}>{alt.name}</option>
                ))}
                {employees
                  .filter((e) => e.id !== planned.suggestedEmployee.id && !planned.alternatives.find((a) => a.id === e.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SkillBar value={Math.round(skillMatch)} label="Skill match" />
              <SkillBar value={Math.round(workload)} label="Workload" />
            </div>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
            onClick={() => setShowAlt((v) => !v)}
          >
            {showAlt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAlt ? "Hide" : "Show"} other candidates ({planned.alternatives.length})
          </button>

          {showAlt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1.5"
            >
              {planned.alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className="flex items-center justify-between text-xs p-2 rounded-md bg-slate-50 dark:bg-slate-800/60 cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => onOverride(alt.id)}
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{alt.name}</span>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <span>Skill {Math.round(alt.skillMatch)}%</span>
                    <span>Load {alt.workload}%</span>
                    <span className="text-xs text-primary">{alt.role}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ProjectPlanner() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [planning, setPlanning] = useState(false)
  const [plan, setPlan] = useState<ProjectPlan | null>(null)
  const [overrides, setOverrides] = useState<Record<number, TaskOverride>>({})
  const [employees, setEmployees] = useState<Employee[]>([])
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [createErrors, setCreateErrors] = useState<{ title: string; error: string }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [step, setStep] = useState<"analyze" | "skills" | "assign" | "done">("analyze")

  useEffect(() => {
    endpoints.employees().then(setEmployees).catch(() => void 0)
  }, [])

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!title.trim() || !description.trim() || !deadline) {
      setErr("Project name, description, and deadline are required")
      return
    }
    setPlanning(true)
    setPlan(null)
    setOverrides({})
    setCreated(false)
    setCreateErrors([])
    setStep("analyze")

    const stepDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    try {
      const [result] = await Promise.all([
        endpoints.planProject({ title: title.trim(), description: description.trim(), deadline: `${deadline}T12:00:00.000Z`, priority }),
        stepDelay(600).then(() => setStep("skills")).then(() => stepDelay(600)).then(() => setStep("assign")).then(() => stepDelay(600)),
      ])
      setStep("done")
      setPlan(result)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Planning failed")
    } finally {
      setPlanning(false)
    }
  }

  const handleCreate = async () => {
    if (!plan) return
    setCreating(true)
    setErr(null)
    try {
      const tasks = plan.tasks.map((t, i) => ({
        title: t.taskTitle,
        description: t.description,
        requiredSkills: t.requiredSkills,
        deadline: t.deadline,
        priority: t.priority,
        assignedTo: overrides[i]?.assignedTo ?? t.suggestedEmployee.id,
      }))
      const result = await endpoints.createProjectTasks({ project: plan.project, tasks })
      setCreateErrors(result.errors)
      setCreated(true)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create tasks")
    } finally {
      setCreating(false)
    }
  }

  const analysisSteps = [
    { key: "analyze", label: "Reading project description…" },
    { key: "skills", label: "Identifying required skills & task breakdown…" },
    { key: "assign", label: "Scoring employees for each task…" },
    { key: "done", label: "Team assembled!" },
  ]
  const currentStepIdx = analysisSteps.findIndex((s) => s.key === step)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Project Planner</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Describe your project once — the AI breaks it into tasks and assembles the best-fit team automatically.
        </p>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {err}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Project details
          </CardTitle>
          <CardDescription>The AI reads your description and identifies which types of work are needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePlan} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Project name</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. E-Commerce Platform v2"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  >
                    {["High", "Medium", "Low"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Project description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe what you want to build — include features, tech stack, and goals. The more detail, the better the task breakdown. e.g. 'Build an e-commerce website with user authentication, product catalog, shopping cart, Stripe payment integration, and an admin dashboard. Deploy on AWS with Docker containers.'"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-slate-400 resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mention keywords like: frontend, backend, API, database, auth, payment, deploy, testing, ML, analytics, mobile…
              </p>
            </div>

            <Button type="submit" disabled={planning} className="w-full sm:w-auto gap-2">
              <Sparkles className="h-4 w-4" />
              {planning ? "Analysing…" : "Plan with AI"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence>
        {planning && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="glass-card border-primary/20">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center gap-6">
                  <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  >
                    <BrainCircuit className="h-14 w-14 text-primary" />
                  </motion.div>
                  <div className="w-full max-w-sm space-y-2">
                    {analysisSteps.map((s, idx) => (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: idx <= currentStepIdx ? 1 : 0.3, x: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        {idx < currentStepIdx ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : idx === currentStepIdx ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent shrink-0"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span className={idx <= currentStepIdx ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>
                          {s.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {plan && !planning && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" />
                  {plan.project} — Team plan
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {plan.tasks.length} tasks identified · deadline {formatShortDate(plan.deadline)} · You can change any assignment before creating.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => { setPlan(null); setCreated(false) }}>
                  Replan
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || created}
                  className={created ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                >
                  {created ? (
                    <><CheckCircle2 className="h-4 w-4 mr-2" /> Project created</>
                  ) : creating ? (
                    "Creating…"
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Create all {plan.tasks.length} tasks</>
                  )}
                </Button>
              </div>
            </div>

            {createErrors.length > 0 && (
              <Card className="border-orange-500/30 glass-card bg-orange-500/5">
                <CardContent className="pt-4 pb-4 space-y-1">
                  <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Some tasks could not be created:</p>
                  {createErrors.map((e, i) => (
                    <p key={i} className="text-xs text-orange-600 dark:text-orange-400">{e.title}: {e.error}</p>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {plan.tasks.map((t, i) => (
                <TaskCard
                  key={i}
                  planned={t}
                  index={i}
                  employees={employees}
                  override={overrides[i]}
                  onOverride={(id) => setOverrides((prev) => ({ ...prev, [i]: { assignedTo: id } }))}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
