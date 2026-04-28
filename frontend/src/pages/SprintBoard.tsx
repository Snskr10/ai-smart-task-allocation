import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams, useNavigate } from "react-router-dom"
import {
  Clock, CircleDashed, CheckCircle2, TrendingDown,
  ArrowLeft, ChevronDown, ChevronUp, Plus, X, Calendar,
  Filter,
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { TaskDetailModal } from "../components/TaskDetailModal"
import { endpoints, type Sprint, type Task, type SprintBurndown, type Employee } from "../lib/api"
import { formatShortDate, isOverdue } from "../lib/format"

const COLUMNS = ["To Do", "In Progress", "Testing", "Done"] as const
type Col = (typeof COLUMNS)[number]

const COL_BORDER: Record<Col, string> = {
  "To Do": "border-slate-300 dark:border-slate-600",
  "In Progress": "border-blue-400 dark:border-blue-600",
  Testing: "border-amber-400 dark:border-amber-600",
  Done: "border-emerald-400 dark:border-emerald-600",
}

const COL_OVER: Record<Col, string> = {
  "To Do": "ring-2 ring-slate-400 dark:ring-slate-500",
  "In Progress": "ring-2 ring-blue-400 dark:ring-blue-500",
  Testing: "ring-2 ring-amber-400 dark:ring-amber-500",
  Done: "ring-2 ring-emerald-400 dark:ring-emerald-500",
}

const PRIORITY_DOT: Record<string, string> = {
  Critical: "bg-red-600",
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
}

const NEXT_STATUS: Partial<Record<Col, Col>> = {
  "To Do": "In Progress",
  "In Progress": "Testing",
  Testing: "Done",
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "rgba(15,23,42,0.92)",
    border: "none",
    borderRadius: "8px",
    color: "white",
    fontSize: "12px",
  },
}

function ColIcon({ col }: { col: Col }) {
  if (col === "To Do") return <Clock className="h-4 w-4 text-slate-400" />
  if (col === "In Progress") return <CircleDashed className="h-4 w-4 text-blue-500 animate-spin" />
  if (col === "Testing") return <ChevronDown className="h-4 w-4 text-amber-500" />
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
}

// Droppable column wrapper
function DroppableColumn({
  col, children, count,
}: { col: Col; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: col })
  return (
    <div
      className={`rounded-xl border-2 ${COL_BORDER[col]} ${isOver ? COL_OVER[col] : ""} bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col transition-all`}
    >
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ColIcon col={col} />
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{col}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
      </div>
      <div ref={setNodeRef} className="p-3 space-y-3 flex-1 min-h-[180px]">
        {children}
      </div>
    </div>
  )
}

// Draggable card
function DraggableCard({
  task, onMove, onRemove, onOpen, isDragging: externalDragging,
}: {
  task: Task
  onMove: (newStatus: string) => void
  onRemove: () => void
  onOpen: () => void
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const overdue = isOverdue(task.deadline, task.status)
  const next = NEXT_STATUS[task.status as Col]
  const initials = task.assignedEmployeeName
    ? task.assignedEmployeeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"
  const isBlocked = (task.dependencies?.length ?? 0) > 0

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging || externalDragging ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`group relative rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow overflow-hidden select-none ${isDragging ? "z-50 shadow-2xl" : ""}`}
    >
      {/* Priority stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${PRIORITY_DOT[task.priority] ?? "bg-slate-400"}`} />

      {/* Drag handle area + card content */}
      <div
        {...listeners}
        {...attributes}
        className="pl-3 pr-3 pt-3 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <button
            className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 flex-1 text-left hover:text-primary transition-colors"
            onClick={(e) => { e.stopPropagation(); onOpen() }}
          >
            {task.title}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-destructive shrink-0 mt-0.5"
            title="Remove from sprint"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pl-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.project && (
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary max-w-full truncate">
              {task.project}
            </Badge>
          )}
          {isBlocked && (
            <Badge className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
              Blocked
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
            {initials}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {task.assignedEmployeeName ?? "Unassigned"}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${task.progress}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1 text-xs ${overdue ? "text-red-500 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
            <Calendar className="h-3 w-3" />
            {formatShortDate(task.deadline)}
            {overdue && <span className="text-[10px] ml-0.5">(overdue)</span>}
          </div>
          {next && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(next) }}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              → {next}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Simplified card for drag overlay
function DragOverlayCard({ task }: { task: Task }) {
  const initials = task.assignedEmployeeName
    ? task.assignedEmployeeName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?"
  return (
    <div className="rounded-lg border border-primary/40 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden w-56 rotate-2 opacity-95">
      <div className={`h-1 ${PRIORITY_DOT[task.priority] ?? "bg-slate-400"}`} />
      <div className="p-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{task.title}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">
            {initials}
          </div>
          <span className="text-xs text-slate-500 truncate">{task.assignedEmployeeName ?? "Unassigned"}</span>
        </div>
      </div>
    </div>
  )
}

export function SprintBoard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [sprints, setSprints] = useState<Sprint[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [burndown, setBurndown] = useState<SprintBurndown | null>(null)
  const [showBurndown, setShowBurndown] = useState(false)
  const [showBacklog, setShowBacklog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSprintId, setSelectedSprintId] = useState(searchParams.get("sprint") || "")
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Filters
  const [filterAssignee, setFilterAssignee] = useState<string>("All")
  const [filterPriority, setFilterPriority] = useState<string>("All")

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadSprints = useCallback(() => {
    endpoints.sprints().then((data) => {
      setSprints(data)
      if (!selectedSprintId && data.length > 0) {
        const active = data.find((s) => s.status === "active") || data[0]
        setSelectedSprintId(active.id)
      }
    }).catch((e: Error) => setErr(e.message))
  }, [selectedSprintId])

  const loadTasks = useCallback(() => {
    endpoints.tasks().then(setAllTasks).catch((e: Error) => setErr(e.message))
  }, [])

  useEffect(() => {
    loadSprints()
    loadTasks()
    endpoints.employees().then(setAllEmployees).catch(() => void 0)
  }, [loadSprints, loadTasks])

  useEffect(() => {
    if (!selectedSprintId) return
    setSearchParams({ sprint: selectedSprintId }, { replace: true })
    setBurndown(null)
  }, [selectedSprintId, setSearchParams])

  useEffect(() => {
    if (showBurndown && selectedSprintId) {
      endpoints.sprintBurndown(selectedSprintId).then(setBurndown).catch(() => void 0)
    }
  }, [showBurndown, selectedSprintId])

  const sprintTasks = useMemo(
    () => allTasks.filter((t) => t.sprintId === selectedSprintId),
    [allTasks, selectedSprintId]
  )

  const backlogTasks = useMemo(
    () => allTasks.filter((t) => !t.sprintId && t.status !== "Done"),
    [allTasks]
  )

  // Unique assignees in sprint tasks
  const assigneeOptions = useMemo(() => {
    const names = new Set<string>()
    for (const t of sprintTasks) {
      if (t.assignedEmployeeName) names.add(t.assignedEmployeeName)
    }
    return Array.from(names).sort()
  }, [sprintTasks])

  const filteredSprintTasks = useMemo(() => {
    return sprintTasks.filter((t) => {
      if (filterAssignee !== "All" && t.assignedEmployeeName !== filterAssignee) return false
      if (filterPriority !== "All" && t.priority !== filterPriority) return false
      return true
    })
  }, [sprintTasks, filterAssignee, filterPriority])

  const columnTasks = useMemo(() => {
    const map: Record<Col, Task[]> = { "To Do": [], "In Progress": [], Testing: [], Done: [] }
    for (const t of filteredSprintTasks) {
      const col = (COLUMNS as readonly string[]).includes(t.status) ? (t.status as Col) : "To Do"
      map[col].push(t)
    }
    return map
  }, [filteredSprintTasks])

  const handleMoveStatus = async (task: Task, newStatus: string) => {
    if (busyTaskId) return
    setBusyTaskId(task.id)
    // Optimistic update
    setAllTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t))
    try {
      await endpoints.updateProgress(task.id, { status: newStatus })
      loadTasks()
    } catch (e) {
      setAllTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
      setErr(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleRemoveFromSprint = async (task: Task) => {
    if (busyTaskId) return
    setBusyTaskId(task.id)
    try {
      await endpoints.assignTaskSprint(task.id, null)
      loadTasks()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove from sprint")
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleAddToSprint = async (task: Task) => {
    if (!selectedSprintId || busyTaskId) return
    setBusyTaskId(task.id)
    try {
      await endpoints.assignTaskSprint(task.id, selectedSprintId)
      loadTasks()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add to sprint")
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleTaskUpdated = (updated: Task) => {
    setAllTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.id as string
    if (!(COLUMNS as readonly string[]).includes(newStatus)) return
    const task = filteredSprintTasks.find((t) => t.id === taskId)
    if (task && task.status !== newStatus) {
      handleMoveStatus(task, newStatus)
    }
  }

  const sprintDone = sprintTasks.filter((t) => t.status === "Done").length
  const sprintTotal = sprintTasks.length
  const hasFilters = filterAssignee !== "All" || filterPriority !== "All"

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sprints")}
            className="text-slate-500 hover:text-primary transition-colors"
            title="Back to sprints"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sprint Board</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Drag & drop tasks between stages, or click to open details
            </p>
          </div>
        </div>

        <div className="sm:ml-auto flex flex-wrap items-center gap-3">
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {sprints.length === 0 && <option value="">No sprints</option>}
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className={`gap-1.5 ${hasFilters ? "border-primary text-primary" : ""}`}
          >
            <Filter className="h-4 w-4" />
            Filters {hasFilters && `(${[filterAssignee !== "All", filterPriority !== "All"].filter(Boolean).length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowBurndown((prev) => !prev)}
            className="gap-1.5"
          >
            <TrendingDown className="h-4 w-4" />
            {showBurndown ? "Hide" : "Show"} Burndown
          </Button>
        </div>
      </div>

      {err && (
        <Card className="border-destructive/50 glass-card">
          <CardContent className="pt-4 pb-4 text-destructive text-sm">{err}</CardContent>
        </Card>
      )}

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 backdrop-blur-sm"
          >
            <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Assignee:</label>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                <option value="All">All</option>
                {assigneeOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Priority:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                <option value="All">All</option>
                {["Critical", "High", "Medium", "Low"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button
                onClick={() => { setFilterAssignee("All"); setFilterPriority("All") }}
                className="text-xs text-primary hover:underline"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
              Showing {filteredSprintTasks.length} of {sprintTasks.length} tasks
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sprint info bar */}
      {selectedSprint && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-semibold text-slate-900 dark:text-white">{selectedSprint.name}</span>
              {selectedSprint.status === "active" && (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 text-[10px]">
                  Active
                </Badge>
              )}
            </div>
            {selectedSprint.goal && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{selectedSprint.goal}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            {formatShortDate(selectedSprint.startDate)} – {formatShortDate(selectedSprint.endDate)}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{sprintDone}/{sprintTotal} done</span>
            <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: sprintTotal ? `${(sprintDone / sprintTotal) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Burndown chart */}
      <AnimatePresence>
        {showBurndown && burndown && burndown.points.length > 0 && (
          <motion.div
            key="burndown"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  Burndown Chart
                </CardTitle>
                <CardDescription>Remaining tasks vs ideal progress line</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={burndown.points} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                      <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls={false} />
                      <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban board */}
      {sprints.length === 0 ? (
        <Card className="glass-card border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <p className="font-semibold text-slate-700 dark:text-slate-300">No sprints yet</p>
            <p className="text-sm text-slate-500">Create a sprint in Sprint Management first.</p>
            <Button onClick={() => navigate("/sprints")} className="gap-2 mt-2">
              <Plus className="h-4 w-4" /> Create Sprint
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colTasks = columnTasks[col]
              return (
                <DroppableColumn key={col} col={col} count={colTasks.length}>
                  <AnimatePresence>
                    {colTasks.map((task) => (
                      <DraggableCard
                        key={task.id}
                        task={task}
                        onMove={(newStatus) => handleMoveStatus(task, newStatus)}
                        onRemove={() => handleRemoveFromSprint(task)}
                        onOpen={() => setSelectedTask(task)}
                        isDragging={activeTask?.id === task.id}
                      />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <div className="h-20 flex items-center justify-center text-xs text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      {hasFilters ? "No matching tasks" : "Drop tasks here"}
                    </div>
                  )}
                </DroppableColumn>
              )
            })}
          </div>
          <DragOverlay>
            {activeTask ? <DragOverlayCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Backlog */}
      <div>
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary transition-colors"
          onClick={() => setShowBacklog((v) => !v)}
        >
          {showBacklog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Backlog — {backlogTasks.length} unassigned task{backlogTasks.length !== 1 ? "s" : ""}
        </button>

        <AnimatePresence>
          {showBacklog && (
            <motion.div
              key="backlog"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Backlog</CardTitle>
                  <CardDescription>
                    Tasks not yet in any sprint. Click <Plus className="inline h-3 w-3" /> to add to the current sprint.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {backlogTasks.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">All tasks are assigned to sprints.</p>
                  ) : (
                    <div className="space-y-2">
                      {backlogTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                        >
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="flex items-center gap-2 min-w-0 text-left hover:text-primary transition-colors flex-1"
                          >
                            <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-slate-400"}`} />
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              {task.title}
                            </span>
                            {task.project && (
                              <Badge variant="outline" className="text-[10px] shrink-0">{task.project}</Badge>
                            )}
                          </button>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-slate-500 hidden sm:block">
                              {task.assignedEmployeeName ?? "Unassigned"}
                            </span>
                            {selectedSprintId && (
                              <button
                                onClick={() => handleAddToSprint(task)}
                                disabled={busyTaskId === task.id}
                                className="h-6 w-6 rounded-full bg-primary/15 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors disabled:opacity-50"
                                title="Add to current sprint"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        allTasks={allTasks}
        employees={allEmployees}
        canEdit={true}
        currentUserId={null}
        onClose={() => setSelectedTask(null)}
        onUpdated={handleTaskUpdated}
      />
    </div>
  )
}
