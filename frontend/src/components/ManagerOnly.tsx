import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import type { ReactNode } from "react"

export function ManagerOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== "manager") return <Navigate to="/employee" replace />
  return <>{children}</>
}
