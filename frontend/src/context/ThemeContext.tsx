import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Theme = "dark" | "light"

type ThemeContextValue = {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => void 0 })

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("silentflow_theme") as Theme | null
    if (stored === "light" || stored === "dark") return stored
  } catch {
    void 0
  }
  return "dark"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    try {
      localStorage.setItem("silentflow_theme", theme)
    } catch {
      void 0
    }
  }, [theme])

  // Apply on first mount immediately
  useEffect(() => {
    if (getInitialTheme() === "dark") {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
