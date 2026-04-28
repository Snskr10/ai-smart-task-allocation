# Frontend — React Application

React/TypeScript single-page application for the AI-Based Smart Task Allocation System.

---

## Stack

| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations and transitions |
| Recharts | Data visualization (bar, line, pie charts) |
| @dnd-kit/core | Drag-and-drop Kanban board |
| React Router DOM 7 | Client-side routing |

---

## Structure

```
frontend/
├── index.html
├── vite.config.ts          # Vite config — proxies /api → localhost:3001
├── tailwind.config.js      # darkMode: 'class' enabled
├── nginx.conf              # Nginx config for production container
├── Dockerfile              # Multi-stage: Node build → Nginx serve
├── src/
│   ├── main.tsx            # Entry point — wraps App in ThemeProvider
│   ├── App.tsx             # Route definitions
│   ├── context/
│   │   ├── AuthContext.tsx         # Login state + role management
│   │   └── ThemeContext.tsx        # Dark/light mode toggle
│   ├── lib/
│   │   ├── api.ts                  # All API calls + TypeScript types
│   │   ├── format.ts               # Date formatting utilities
│   │   └── utils.ts                # General helpers
│   ├── components/
│   │   ├── GlobalSearch.tsx        # Ctrl+K command-palette search
│   │   ├── TaskDetailModal.tsx     # Task detail / edit modal
│   │   ├── ProtectedRoute.tsx      # Auth guard HOC
│   │   ├── ManagerOnly.tsx         # Role guard HOC
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # App shell with sidebar
│   │   │   └── Sidebar.tsx         # Navigation + theme toggle + alerts badge
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   └── pages/
│       ├── Login.tsx               # Auth page
│       ├── ManagerDashboard.tsx    # Manager home — overview metrics
│       ├── EmployeeDashboard.tsx   # Employee home — personal tasks
│       ├── TaskAllocation.tsx      # AI task assignment + ML control panel
│       ├── ProjectPlanner.tsx      # NL → task generation
│       ├── TeamRoster.tsx          # Employee list with profile links
│       ├── EmployeeProfile.tsx     # Individual employee stats + task history
│       ├── Analytics.tsx           # Charts — tasks, workload, projects
│       ├── SilentFailureAlerts.tsx # At-risk task alerts + AI re-assign
│       ├── SprintManagement.tsx    # Sprint CRUD + velocity chart + retro notes
│       └── SprintBoard.tsx         # Kanban board with DnD + filters
```

---

## Setup

```bash
npm install
npm run dev
# → http://localhost:5173
```

### Build for production
```bash
npm run build
# Output in dist/
```

### Type check
```bash
npx tsc --noEmit
```

---

## Pages & Features

### Manager Pages

| Page | Route | Key Features |
|---|---|---|
| Dashboard | `/dashboard` | Task counts, priority breakdown, recent alerts |
| Task Allocation | `/tasks` | AI-powered assignment, ML model status panel, train button |
| Project Planner | `/planner` | Natural language → task list generation |
| Team Roster | `/team` | Employee list with links to profile pages |
| Analytics | `/analytics` | Task status chart, workload chart, project overview, employee performance |
| Alerts | `/alerts` | Silent failure list, AI re-assignment modal |
| Sprint Management | `/sprints` | Sprint CRUD, velocity chart, retrospective notes |
| Sprint Board | `/sprint-board` | Kanban board, drag-and-drop, filters, task detail modal |

### Employee Pages

| Page | Route | Key Features |
|---|---|---|
| Dashboard | `/employee-dashboard` | Personal task list, progress updates |
| Employee Profile | `/employees/:id` | Stats, skill list, performance metrics, task history |

### Global Features
- **Global Search** (`Ctrl+K`) — search tasks and employees from anywhere
- **Dark / Light Mode** — toggle in sidebar, persisted to localStorage
- **Task Detail Modal** — click any task card to view full details, add comments, manage dependencies

---

## API Integration

All API calls go through `src/lib/api.ts`. The Vite dev server proxies `/api/*` to `http://localhost:3001`.

```typescript
import { endpoints } from './lib/api'

// Example: fetch tasks
const tasks = await endpoints.tasks()

// Example: trigger ML training
const result = await endpoints.mlTrain()
```

---

## Theme (Dark Mode)

Dark mode uses Tailwind's `class` strategy. The `ThemeContext` toggles the `dark` class on `<html>`:

```tsx
const { theme, toggleTheme } = useTheme()
// theme: 'dark' | 'light'
```

---

## Docker

```bash
# Build
docker build -t silentflow-frontend .

# Run (serves on port 80)
docker run -p 80:80 silentflow-frontend
```

The Nginx config (`nginx.conf`) handles:
- Serving the React build from `/usr/share/nginx/html`
- Falling back to `index.html` for client-side routing
- Proxying `/api/` requests to the backend service
- Gzip compression + long-lived static asset caching
