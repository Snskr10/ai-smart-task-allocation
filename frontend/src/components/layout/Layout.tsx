import { useState, useEffect, useCallback } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { GlobalSearch } from "../GlobalSearch"

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-foreground antialiased dark:bg-slate-950">
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[50%] w-[50%] rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute top-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-purple-400/10 blur-[100px]" />
      </div>

      <Sidebar onSearchOpen={openSearch} />
      <GlobalSearch open={searchOpen} onClose={closeSearch} />

      <div className="p-4 sm:ml-64 sm:p-8 text-slate-900 dark:text-slate-50 [&_p]:text-slate-700 dark:[&_p]:text-slate-200 [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:text-slate-900 dark:[&_h3]:text-white">
        <Outlet />
      </div>
    </div>
  )
}
