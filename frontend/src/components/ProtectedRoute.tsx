import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function ProtectedRoute() {
  const { user, ready } = useAuth()
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-muted-foreground">
        Loading
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
