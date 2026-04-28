import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Login } from "./pages/Login"
import { Layout } from "./components/layout/Layout"
import { ManagerDashboard } from "./pages/ManagerDashboard"
import { EmployeeDashboard } from "./pages/EmployeeDashboard"
import { TaskAllocation } from "./pages/TaskAllocation"
import { Analytics } from "./pages/Analytics"
import { SilentFailureAlerts } from "./pages/SilentFailureAlerts"
import { TeamRoster } from "./pages/TeamRoster"
import { ProjectPlanner } from "./pages/ProjectPlanner"
import { SprintManagement } from "./pages/SprintManagement"
import { SprintBoard } from "./pages/SprintBoard"
import { EmployeeProfile } from "./pages/EmployeeProfile"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { ManagerOnly } from "./components/ManagerOnly"
import { useAuth } from "./context/AuthContext"

function RoleHome() {
  const { user } = useAuth()
  if (user?.role === "manager") return <Navigate to="/dashboard" replace />
  return <Navigate to="/employee" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<RoleHome />} />
            <Route
              path="dashboard"
              element={
                <ManagerOnly>
                  <ManagerDashboard />
                </ManagerOnly>
              }
            />
            <Route path="employee" element={<EmployeeDashboard />} />
            <Route
              path="allocate"
              element={
                <ManagerOnly>
                  <TaskAllocation />
                </ManagerOnly>
              }
            />
            <Route path="analytics" element={<Analytics />} />
            <Route
              path="team"
              element={
                <ManagerOnly>
                  <TeamRoster />
                </ManagerOnly>
              }
            />
            <Route
              path="plan-project"
              element={
                <ManagerOnly>
                  <ProjectPlanner />
                </ManagerOnly>
              }
            />
            <Route
              path="alerts"
              element={
                <ManagerOnly>
                  <SilentFailureAlerts />
                </ManagerOnly>
              }
            />
            <Route
              path="sprints"
              element={
                <ManagerOnly>
                  <SprintManagement />
                </ManagerOnly>
              }
            />
            <Route
              path="sprint-board"
              element={
                <ManagerOnly>
                  <SprintBoard />
                </ManagerOnly>
              }
            />
            <Route
              path="employees/:id"
              element={
                <ManagerOnly>
                  <EmployeeProfile />
                </ManagerOnly>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
