import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { ShieldCheck, User, Mail, Lock, ArrowRight } from "lucide-react"

import { Button } from "../components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/Card"
import { Input } from "../components/ui/Input"
import { useAuth } from "../context/AuthContext"
import { endpoints, type Employee } from "../lib/api"

export function Login() {
  const [role, setRole] = useState<"manager" | "employee">("manager")
  const [employeeId, setEmployeeId] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user, login, ready } = useAuth()

  useEffect(() => {
    if (!ready || !user) return
    navigate(user.role === "manager" ? "/dashboard" : "/employee", { replace: true })
  }, [ready, user, navigate])

  useEffect(() => {
    if (role !== "employee") return
    let alive = true
    endpoints
      .employees()
      .then((list) => {
        if (alive) {
          setEmployees(list)
          if (list.length && !employeeId) setEmployeeId(list[0].id)
        }
      })
      .catch(() => void 0)
    return () => {
      alive = false
    }
  }, [role])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (role === "employee" && !employeeId) {
      setError("Select an employee profile")
      return
    }
    setIsLoading(true)
    try {
      if (role === "manager") await login("manager")
      else await login("employee", employeeId)
      navigate(role === "manager" ? "/dashboard" : "/employee", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[120px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="z-10 w-full max-w-md px-4"
      >
        <Card className="glass border-white/10 bg-slate-900/60 text-white shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
            >
              <ShieldCheck className="h-8 w-8 text-white" />
            </motion.div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight">SilentFlow</CardTitle>
              <CardDescription className="text-slate-400">AI-Driven Task Intelligence</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={role === "manager" ? "default" : "outline"}
                  className={`h-24 flex-col gap-2 border-slate-700 ${
                    role === "manager"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                  onClick={() => setRole("manager")}
                >
                  <ShieldCheck className="h-6 w-6" />
                  Manager
                </Button>
                <Button
                  type="button"
                  variant={role === "employee" ? "default" : "outline"}
                  className={`h-24 flex-col gap-2 border-slate-700 ${
                    role === "employee"
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                  onClick={() => setRole("employee")}
                >
                  <User className="h-6 w-6" />
                  Employee
                </Button>
              </div>

              {role === "employee" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Profile</label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 py-1 text-sm text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <Input
                    placeholder="Email address"
                    type="email"
                    className="border-slate-700 bg-slate-900/50 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                  <Input
                    placeholder="Password"
                    type="password"
                    className="border-slate-700 bg-slate-900/50 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-lg shadow-lg hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
                  />
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-slate-500">Demo login — any email/password</p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
