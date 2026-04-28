import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { User } from "../lib/api"
import { endpoints } from "../lib/api"

const STORAGE_KEY = "silentflow_auth"

type AuthState = {
  user: User | null
  token: string | null
}

type AuthContextValue = AuthState & {
  login: (role: "manager" | "employee", employeeId?: string) => Promise<void>
  logout: () => void
  ready: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStored(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { user: null, token: null }
    const p = JSON.parse(raw) as AuthState
    if (p && p.user && p.token) return p
  } catch {
    void 0
  }
  return { user: null, token: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = loadStored()
    setUser(s.user)
    setToken(s.token)
    setReady(true)
  }, [])

  const login = useCallback(async (role: "manager" | "employee", employeeId?: string) => {
    const res = await endpoints.login(
      role === "employee" ? { role, employeeId: employeeId! } : { role }
    )
    const next = { user: res.user, token: res.token }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setUser(res.user)
    setToken(res.token)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, login, logout, ready }),
    [user, token, login, logout, ready]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth requires AuthProvider")
  return ctx
}
