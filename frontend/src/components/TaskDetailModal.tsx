import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Calendar, User, Tag, Layers, AlertTriangle, CheckCircle2,
  Clock, MessageSquare, Link2, ChevronDown, ChevronUp, Send,
} from "lucide-react"
import { endpoints, type Task, type Employee } from "../lib/api"
import { formatShortDate } from "../lib/format"

function taskIsOverdue(deadline: string, status: string) {
  return status !== "Done" && new Date(deadline) < new Date()
}

interface Props {
  task: Task | null
  allTasks: Task[]
  employees: Employee[]
  canEdit: boolean
  currentUserId?: string | null
  onClose: () => void
  onUpdated: (task: Task) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

const STATUS_COLORS: Record<string, string> = {
  "To Do": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Testing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
}

const STATUSES = ["To Do", "In Progress", "Testing", "Done"]

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function TaskDetailModal({ task, allTasks, employees, canEdit, currentUserId, onClose, onUpdated }: Props) {
  const [newStatus, setNewStatus] = useState("")
  const [newProgress, setNewProgress] = useState(0)
  const [comment, setComment] = useState("")
  const [selectedDeps, setSelectedDeps] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showDepsSelector, setShowDepsSelector] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "comments" | "dependencies">("details")

  useEffect(() => {
    if (task) {
      setNewStatus(task.status)
      setNewProgress(task.progress)
      setSelectedDeps(task.dependencies || [])
      setComment("")
      setActiveTab("details")
    }
  }, [task])

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  if (!task) return null

  const blockingTasks = allTasks.filter((t) => selectedDeps.includes(t.id))
  const isBlocked = blockingTasks.some((t) => t.status !== "Done")
  const overdue = taskIsOverdue(task.deadline, task.status)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await endpoints.updateProgress(task.id, {
        status: newStatus,
        progress: newProgress,
        comment: comment.trim() || undefined,
        authorId: currentUserId || null,
        dependencies: selectedDeps,
      })
      onUpdated(updated)
      setComment("")
    } catch {
      void 0
    } finally {
      setSaving(false)
    }
  }

  const toggleDep = (id: string) => {
    setSelectedDeps((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const availableForDep = allTasks.filter((t) => t.id !== task.id)

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[task.status] ?? ""}`}>
                  {task.status}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                  {task.priority}
                </span>
                {isBlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" /> Blocked
                  </span>
                )}
                {overdue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <Clock className="h-3 w-3" /> Overdue
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-snug">
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
            {(["details", "comments", "dependencies"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab}
                {tab === "comments" && task.comments.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {task.comments.length}
                  </span>
                )}
                {tab === "dependencies" && selectedDeps.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    {selectedDeps.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "details" && (
              <div className="p-6 space-y-5">
                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Assignee:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {task.assignedEmployeeName || "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className={`h-4 w-4 shrink-0 ${overdue ? "text-red-500" : ""}`} />
                    <span className="font-medium">Deadline:</span>
                    <span className={`${overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-800 dark:text-slate-200"}`}>
                      {formatShortDate(task.deadline)}
                    </span>
                  </div>
                  {task.project && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Layers className="h-4 w-4 shrink-0" />
                      <span className="font-medium">Project:</span>
                      <span className="text-slate-800 dark:text-slate-200">{task.project}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {task.description && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Description
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {task.requiredSkills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {task.requiredSkills.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Progress
                    </h3>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {canEdit ? newProgress : task.progress}%
                    </span>
                  </div>
                  {canEdit ? (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={newProgress}
                      onChange={(e) => setNewProgress(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  ) : (
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                  )}
                </div>

                {/* Status selector (edit mode) */}
                {canEdit && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      Status
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setNewStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            newStatus === s
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          {newStatus === s && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="p-6 space-y-4">
                {task.comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...task.comments].reverse().map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {employees.find((e) => e.id === c.authorId)?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-slate-400">{timeAgo(c.at)}</span>
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="flex gap-2 pt-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="flex-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && comment.trim()) handleSave() }}
                    />
                    <button
                      onClick={handleSave}
                      disabled={!comment.trim() || saving}
                      className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "dependencies" && (
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This task is blocked by the following tasks. If any dependency is not Done, the task is considered blocked.
                </p>

                {blockingTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <Link2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No dependencies set</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockingTasks.map((dep) => (
                      <div key={dep.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${dep.status === "Done" ? "bg-emerald-500" : "bg-red-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{dep.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{dep.status} · {dep.assignedEmployeeName || "Unassigned"}</p>
                        </div>
                        {dep.status === "Done" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        {canEdit && (
                          <button
                            onClick={() => toggleDep(dep.id)}
                            className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors ml-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div>
                    <button
                      onClick={() => setShowDepsSelector(!showDepsSelector)}
                      className="flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                    >
                      {showDepsSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Add dependencies
                    </button>
                    {showDepsSelector && (
                      <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                        {availableForDep.filter((t) => !selectedDeps.includes(t.id)).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => toggleDep(t.id)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "Done" ? "bg-emerald-500" : "bg-slate-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                              <p className="text-xs text-slate-500">{t.status}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          {canEdit && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
