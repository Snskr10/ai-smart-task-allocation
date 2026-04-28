import { useState, useEffect, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Trash2, Calendar, LayoutGrid, CheckCircle2,
  Pencil, X, TrendingUp, PlayCircle, BarChart3, BookOpen,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import { endpoints, type Sprint } from "../lib/api"
import { formatShortDate } from "../lib/format"

const STATUS_OPTS = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
]

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "none",
    borderRadius: "8px",
    color: "white",
  },
  itemStyle: { color: "white" },
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 text-[10px]">Active</Badge>
  if (status === "completed")
    return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px]">Completed</Badge>
  return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-400/30 text-[10px]">Planned</Badge>
}

type FormState = {
  name: string
  goal: string
  startDate: string
  endDate: string
  status: "planned" | "active" | "completed"
}

const EMPTY_FORM: FormState = { name: "", goal: "", startDate: "", endDate: "", status: "planned" as const }

export function SprintManagement() {
  const navigate = useNavigate()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Retrospective modal
  const [retroSprint, setRetroSprint] = useState<Sprint | null>(null)
  const [retroText, setRetroText] = useState("")
  const [retroSaving, setRetroSaving] = useState(false)
  // Expanded retrospective view
  const [expandedRetro, setExpandedRetro] = useState<string | null>(null)

  const load = useCallback(() => {
    endpoints.sprints().then(setSprints).catch((e: Error) => setErr(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setErr(null)
    setShowForm(true)
  }

  const openEdit = (s: Sprint) => {
    setEditId(s.id)
    setForm({
      name: s.name,
      goal: s.goal,
      startDate: s.startDate.split("T")[0],
      endDate: s.endDate.split("T")[0],
      status: s.status,
    })
    setErr(null)
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!form.name || !form.startDate || !form.endDate) {
      setErr("Sprint name, start date, and end date are required")
      return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        startDate: `${form.startDate}T00:00:00.000Z`,
        endDate: `${form.endDate}T23:59:59.000Z`,
      }
      if (editId) {
        await endpoints.updateSprint(editId, body)
      } else {
        await endpoints.createSprint(body)
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      setEditId(null)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteBusy(true)
    setErr(null)
    try {
      await endpoints.deleteSprint(id)
      setDeleteId(null)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleStatusChange = async (sprint: Sprint, status: string, retrospective?: string) => {
    try {
      await endpoints.updateSprint(sprint.id, {
        status: status as Sprint["status"],
        ...(retrospective !== undefined ? { retrospective } : {}),
      })
      load()
    } catch {
      void 0
    }
  }

  const handleCompleteClick = (sprint: Sprint) => {
    setRetroSprint(sprint)
    setRetroText("")
  }

  const handleRetroConfirm = async () => {
    if (!retroSprint) return
    setRetroSaving(true)
    await handleStatusChange(retroSprint, "completed", retroText)
    setRetroSaving(false)
    setRetroSprint(null)
    setRetroText("")
  }

  // Velocity chart data
  const velocityData = useMemo(() =>
    sprints.map((s) => ({
      name: s.name.length > 16 ? s.name.slice(0, 13) + "…" : s.name,
      Planned: s.taskCount ?? 0,
      Completed: s.completedCount ?? 0,
    })),
    [sprints]
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sprint Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Create and manage sprints. Assign tasks and track progress in the Sprint Board.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> New Sprint
        </Button>
      </div>

      {err && !showForm && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-4 pb-4 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className="glass-card border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{editId ? "Edit Sprint" : "New Sprint"}</CardTitle>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Sprint name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Sprint 1 — Auth & Onboarding"
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                    >
                      {STATUS_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Start date *</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">End date *</label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="bg-background text-foreground"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">Sprint goal (optional)</label>
                    <Input
                      value={form.goal}
                      onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                      placeholder="e.g. Ship user authentication and onboarding flow"
                      className="bg-background text-foreground"
                    />
                  </div>
                  {err && <p className="sm:col-span-2 text-sm text-destructive">{err}</p>}
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : editId ? "Update Sprint" : "Create Sprint"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprint cards */}
      {sprints.length === 0 && !showForm ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <TrendingUp className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">No sprints yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create your first sprint to start organising tasks by time-box.
              </p>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          {sprints.map((sprint) => {
            const pct = sprint.taskCount
              ? Math.round(((sprint.completedCount ?? 0) / sprint.taskCount) * 100)
              : 0
            return (
              <motion.div
                key={sprint.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <Card className="glass-card h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={sprint.status} />
                        </div>
                        <CardTitle className="text-base leading-snug truncate">{sprint.name}</CardTitle>
                        {sprint.goal && (
                          <CardDescription className="mt-1 line-clamp-2 text-xs">{sprint.goal}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(sprint)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit sprint"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(sprint.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete sprint"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {formatShortDate(sprint.startDate)} – {formatShortDate(sprint.endDate)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>{sprint.completedCount ?? 0}/{sprint.taskCount ?? 0} tasks done</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                        />
                      </div>
                    </div>

                    {/* Retrospective display */}
                    {sprint.status === "completed" && sprint.retrospective && (
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
                        <button
                          onClick={() => setExpandedRetro(expandedRetro === sprint.id ? null : sprint.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors w-full text-left"
                        >
                          <BookOpen className="h-3 w-3" />
                          Retrospective notes
                        </button>
                        <AnimatePresence>
                          {expandedRetro === sprint.id && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="text-xs text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap"
                            >
                              {sprint.retrospective}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => navigate(`/sprint-board?sprint=${sprint.id}`)}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" /> Sprint Board
                      </Button>
                      {sprint.status === "planned" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleStatusChange(sprint, "active")}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> Start
                        </Button>
                      )}
                      {sprint.status === "active" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => handleCompleteClick(sprint)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Velocity Chart */}
      {sprints.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Sprint Velocity
              </CardTitle>
              <CardDescription>Planned vs. completed tasks across all sprints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend verticalAlign="top" height={28} iconType="circle" />
                    <Bar dataKey="Planned" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="glass-card w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle>Delete sprint</CardTitle>
              <CardDescription>Tasks in this sprint will be moved back to the backlog.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {err && <p className="text-sm text-destructive">{err}</p>}
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Delete <strong>{sprints.find((s) => s.id === deleteId)?.name}</strong>? This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteBusy}>Cancel</Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleteBusy}
                >
                  {deleteBusy ? "Deleting…" : "Delete Sprint"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Retrospective modal */}
      <AnimatePresence>
        {retroSprint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg"
            >
              <Card className="glass-card shadow-2xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Sprint Retrospective
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Completing <strong>{retroSprint.name}</strong> — add optional notes about what went well, what didn't, and improvements.
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => setRetroSprint(null)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sprint summary */}
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{retroSprint.taskCount ?? 0}</p>
                      <p className="text-xs text-slate-500">Planned</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{retroSprint.completedCount ?? 0}</p>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-primary">
                        {retroSprint.taskCount ? Math.round(((retroSprint.completedCount ?? 0) / retroSprint.taskCount) * 100) : 0}%
                      </p>
                      <p className="text-xs text-slate-500">Velocity</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Retrospective notes <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      value={retroText}
                      onChange={(e) => setRetroText(e.target.value)}
                      rows={5}
                      placeholder={"What went well?\nWhat didn't go well?\nWhat can be improved?"}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setRetroSprint(null)} disabled={retroSaving}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRetroConfirm}
                      disabled={retroSaving}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {retroSaving ? "Completing…" : "Complete Sprint"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
