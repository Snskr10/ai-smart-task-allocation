import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, FileText, Users, ArrowRight, Layers } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { endpoints, type Task, type Employee } from "../lib/api"

type SearchResult =
  | { type: "task"; item: Task }
  | { type: "employee"; item: Employee }

interface Props {
  open: boolean
  onClose: () => void
}

const statusColors: Record<string, string> = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Testing: "bg-amber-500",
  Done: "bg-emerald-500",
}

export function GlobalSearch({ open, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open && !loaded) {
      setLoading(true)
      Promise.all([endpoints.tasks(), endpoints.employees()])
        .then(([t, e]) => {
          setTasks(t)
          setEmployees(e)
          setLoaded(true)
        })
        .catch(() => void 0)
        .finally(() => setLoading(false))
    }
    if (open) {
      setQuery("")
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [open, loaded])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const taskResults: SearchResult[] = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.project?.toLowerCase().includes(q) ||
          t.assignedEmployeeName?.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((item) => ({ type: "task", item }))

    const empResults: SearchResult[] = employees
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.skills.some((s) => s.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map((item) => ({ type: "employee", item }))

    return [...taskResults, ...empResults]
  }, [query, tasks, employees])

  const handleSelect = (result: SearchResult) => {
    onClose()
    if (result.type === "task") {
      navigate("/employee")
    } else {
      navigate(`/employees/${result.item.id}`)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, employees, projects…"
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 outline-none text-sm"
              />
              {loading && (
                <span className="text-xs text-slate-400 animate-pulse">Loading…</span>
              )}
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      {result.type === "task" ? (
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {result.type === "task" ? result.item.title : result.item.name}
                        </p>
                        {result.type === "task" ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${statusColors[result.item.status] ?? "bg-slate-400"}`}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {result.item.status}
                              {result.item.assignedEmployeeName
                                ? ` · ${result.item.assignedEmployeeName}`
                                : ""}
                              {result.item.project ? ` · ${result.item.project}` : ""}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {(result.item as Employee).role} ·{" "}
                            {(result.item as Employee).skills.slice(0, 3).join(", ")}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : query ? (
                <div className="py-10 text-center">
                  <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No results for "<span className="font-medium">{query}</span>"
                  </p>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <Search className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Search tasks, employees, or projects
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Press <kbd className="border border-slate-300 dark:border-slate-600 rounded px-1">Ctrl+K</kbd> to open anytime
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
