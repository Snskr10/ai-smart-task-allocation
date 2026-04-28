import { useEffect, useState } from "react"
import type React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, CheckSquare, Users, BarChart3,
  Bell, LogOut, Users2, FolderKanban, Layers, LayoutGrid,
  Search, Sun, Moon,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"
import { endpoints } from "../../lib/api"

interface Props {
  onSearchOpen: () => void
}

export function Sidebar({ onSearchOpen }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const isManager = user?.role === "manager"
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    if (!isManager) return
    let alive = true
    endpoints
      .silentFailures()
      .then((alerts) => { if (alive) setAlertCount(alerts.length) })
      .catch(() => void 0)
    return () => { alive = false }
  }, [isManager])

  type NavItem = { icon: React.ElementType; label: string; href: string; badge?: number }

  const managerNav: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FolderKanban, label: "Plan Project", href: "/plan-project" },
    { icon: CheckSquare, label: "Task Allocation", href: "/allocate" },
    { icon: Users, label: "Employee View", href: "/employee" },
    { icon: Users2, label: "Team", href: "/team" },
    { icon: Layers, label: "Sprints", href: "/sprints" },
    { icon: LayoutGrid, label: "Sprint Board", href: "/sprint-board" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Bell, label: "Alerts", href: "/alerts", badge: alertCount },
  ]

  const employeeNav: NavItem[] = [
    { icon: Users, label: "My Tasks", href: "/employee" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
  ]

  const navItems = isManager ? managerNav : employeeNav

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 transition-transform sm:translate-x-0">
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
        {/* Logo */}
        <div className="mb-6 flex items-center pl-2.5">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-bold text-sm">AI</span>
          </div>
          <span className="self-center whitespace-nowrap text-xl font-semibold text-slate-900 dark:text-slate-50">
            SilentFlow
          </span>
        </div>

        {/* Search button */}
        <button
          onClick={onSearchOpen}
          className="mb-4 flex items-center gap-2.5 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] border border-slate-300 dark:border-slate-600 rounded px-1">
            Ctrl K
          </kbd>
        </button>

        {/* Nav */}
        <ul className="space-y-1 font-medium">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href))
            return (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={`flex items-center rounded-lg p-2 transition-colors relative ${
                    isActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="ml-3 flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="mt-auto space-y-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">Signed in</h4>
              {/* Theme toggle */}
              <button
                onClick={toggle}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="flex items-center justify-center w-6 h-6 rounded-md text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs text-slate-700 truncate dark:text-slate-200">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize dark:text-slate-400">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate("/login")
            }}
            className="flex w-full items-center rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3">Log out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
