import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Send, BrainCircuit, Check, Cpu, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { Badge } from "../components/ui/Badge"
import { endpoints, type ProjectSummary } from "../lib/api"

type Suggestion = {
  employeeId: string
  name: string
  role: string
  matchScore: number
  reason: string
  skills: string[]
}

function deadlineIso(dateYmd: string) {
  if (!dateYmd) return ""
  return `${dateYmd}T12:00:00.000Z`
}

export function TaskAllocation() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [skillsInput, setSkillsInput] = useState("")
  const [deadline, setDeadline] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [assigned, setAssigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectOption, setProjectOption] = useState("")
  const [newProjectName, setNewProjectName] = useState("")
  // ML model state
  const [mlStatus, setMlStatus] = useState<Record<string, unknown> | null>(null)
  const [mlTraining, setMlTraining] = useState(false)
  const [mlMsg, setMlMsg] = useState<string | null>(null)

  useEffect(() => {
    endpoints.projects().then(setProjects).catch(() => void 0)
    endpoints.mlStatus().then(setMlStatus).catch(() => void 0)
  }, [])

  const handleTrainML = async () => {
    setMlTraining(true)
    setMlMsg(null)
    try {
      const res = await endpoints.mlTrain()
      if (res.success) {
        setMlMsg(`Model trained on ${(res.metadata as Record<string,unknown>).n_samples} samples. CV R²: ${(res.metadata as Record<string,unknown>).cv_r2_score ?? "N/A"}`)
        const updated = await endpoints.mlStatus()
        setMlStatus(updated)
      } else {
        setMlMsg("Training failed.")
      }
    } catch (e) {
      setMlMsg(e instanceof Error ? e.message : "Training failed")
    } finally {
      setMlTraining(false)
    }
  }

  const effectiveProject = useMemo(() => {
    if (projectOption === "__new__") return newProjectName.trim() || null
    if (projectOption) return projectOption
    return null
  }, [projectOption, newProjectName])

  const requiredSkills = skillsInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const handleAISuggestion = async () => {
    setError(null)
    if (!title.trim() || !deadline) {
      setError("Task name and deadline are required")
      return
    }
    if (projectOption === "__new__" && !newProjectName.trim()) {
      setError("Enter a new project name or choose an existing project")
      return
    }
    setIsAnalyzing(true)
    setSuggestion(null)
    setAssigned(false)
    try {
      const res = await endpoints.assignAI({
        title: title.trim(),
        description: description.trim(),
        requiredSkills,
        deadline: deadlineIso(deadline),
        priority,
        project: effectiveProject,
      })
      const r = res.recommended
      setSuggestion({
        employeeId: r.employeeId,
        name: r.name,
        role: r.role,
        matchScore: r.matchScore,
        reason: r.reason,
        skills: r.skills.length ? r.skills : requiredSkills.slice(0, 4),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI suggestion failed")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAssign = async () => {
    if (!suggestion) return
    if (projectOption === "__new__" && !newProjectName.trim()) {
      setError("Enter a new project name or choose an existing project")
      return
    }
    setError(null)
    try {
      await endpoints.createTask({
        title: title.trim(),
        description: description.trim(),
        requiredSkills,
        deadline: deadlineIso(deadline),
        priority,
        assignedTo: suggestion.employeeId,
        status: "To Do",
        progress: 0,
        project: effectiveProject,
      })
      setAssigned(true)
      endpoints.projects().then(setProjects).catch(() => void 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignment failed")
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI task allocation</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Link each task to a project from Plan Project or create a new one. AI scoring is unchanged; the project tag groups work in dashboards.
        </p>
      </div>

      {/* ML Model Status Panel */}
      <Card className={`glass-card border ${mlStatus?.trained ? "border-emerald-500/30" : "border-amber-500/30"}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Cpu className={`h-5 w-5 ${mlStatus?.trained ? "text-emerald-500" : "text-amber-500"}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  ML Assignment Engine
                  <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mlStatus?.trained ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                    {mlStatus?.trained ? "ACTIVE" : "NOT TRAINED"}
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {mlStatus?.trained
                    ? `${String(mlStatus.backend)} · ${String(mlStatus.n_samples)} training samples · CV R²: ${String(mlStatus.cv_r2_score ?? "N/A")}`
                    : "Rule-based fallback active. Train on historical data for ML-powered recommendations."}
                </p>
                {mlMsg && <p className={`text-xs mt-0.5 ${mlMsg.includes("fail") ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{mlMsg}</p>}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTrainML}
              disabled={mlTraining}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${mlTraining ? "animate-spin" : ""}`} />
              {mlTraining ? "Training…" : mlStatus?.trained ? "Re-train Model" : "Train Model"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Task details</CardTitle>
            <CardDescription>Enter requirements for scoring and assignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Project</label>
              <select
                value={projectOption}
                onChange={(e) => {
                  setProjectOption(e.target.value)
                  if (e.target.value !== "__new__") setNewProjectName("")
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">No project (standalone task)</option>
                {projects.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.taskCount} task{p.taskCount !== 1 ? "s" : ""})
                  </option>
                ))}
                <option value="__new__">+ New project…</option>
              </select>
              {projectOption === "__new__" && (
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="New project name"
                  className="bg-background text-foreground mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Task name</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement payment gateway"
                className="bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Deadline</label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Required skills</label>
              <Input
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. React, Node.js, Stripe"
                className="bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800 dark:text-slate-100">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-slate-500 dark:placeholder:text-slate-400"
                placeholder="Objectives and acceptance criteria"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              onClick={handleAISuggestion}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 transition-opacity text-white border-0"
            >
              {isAnalyzing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="mr-2"
                  >
                    <BrainCircuit className="h-5 w-5" />
                  </motion.div>
                  Analyzing team bandwidth…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  AI suggest employee
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait">
            {!isAnalyzing && !suggestion && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[420px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-600 dark:text-slate-300 glass"
              >
                <BrainCircuit className="h-12 w-12 mb-4 opacity-50" />
                <p>Fill the form and run AI to see the best match and workload-aware ranking.</p>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[420px] rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <motion.div
                  animate={{ y: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent w-full"
                />

                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <BrainCircuit className="h-16 w-16 text-blue-500 mb-4" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">SilentFlow AI active</h3>
                <div className="space-y-2 w-full max-w-[200px]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5 }}
                    className="h-2 bg-blue-500 rounded-full"
                  />
                  <p className="text-xs text-center text-blue-500/80">Scoring skills and workload…</p>
                </div>
              </motion.div>
            )}

            {suggestion && (
              <motion.div
                key="suggestion"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="h-full"
              >
                <Card className="h-full glass-card border-purple-500/30 shadow-lg shadow-purple-500/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <Badge className="bg-purple-500 hover:bg-purple-600 mb-2">Optimal match</Badge>
                        <CardTitle className="text-2xl flex items-center gap-2 truncate">{suggestion.name}</CardTitle>
                        <CardDescription>{suggestion.role}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">
                          {suggestion.matchScore}%
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Match score</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {effectiveProject && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Project: <span className="font-semibold text-slate-800 dark:text-slate-200">{effectiveProject}</span>
                      </p>
                    )}
                    <div className="rounded-lg bg-purple-500/10 p-4 border border-purple-500/20 text-sm">
                      <p>
                        <strong className="text-purple-700 dark:text-purple-300">Reasoning:</strong>{" "}
                        {suggestion.reason}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2 text-slate-900 dark:text-slate-100">Matching skills</h4>
                      <div className="flex gap-2 flex-wrap">
                        {suggestion.skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="border-purple-200 dark:border-purple-800">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="button"
                      onClick={handleAssign}
                      disabled={assigned}
                      className={`w-full ${assigned ? "bg-green-500 hover:bg-green-600 text-white" : "bg-primary"}`}
                    >
                      {assigned ? (
                        <>
                          <Check className="mr-2 h-4 w-4" /> Assigned successfully
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" /> Assign to {suggestion.name.split(" ")[0]}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
