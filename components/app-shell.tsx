"use client"
import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

const SIDEBAR_HIDDEN_ROUTES = new Set(["/login"])

type HeaderActionsContextValue = {
  setHeaderActions: React.Dispatch<React.SetStateAction<ReactNode | null>>
}

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null)

export function useHeaderActions() {
  const context = useContext(HeaderActionsContext)
  if (!context) {
    throw new Error("useHeaderActions must be used within AppShell")
  }
  return context
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hideSidebar = SIDEBAR_HIDDEN_ROUTES.has(pathname)
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null)
  const headerActionsValue = useMemo(
    () => ({ setHeaderActions }),
    [setHeaderActions]
  )

  useEffect(() => {
    const storedValue = localStorage.getItem("loggedIn")
    const loggedInValue = storedValue ?? "false"

    if (storedValue === null) {
      localStorage.setItem("loggedIn", loggedInValue)
    }

    if (loggedInValue !== "true" && !SIDEBAR_HIDDEN_ROUTES.has(pathname)) {
      router.replace("/login")
    }
  }, [pathname, router])

  if (hideSidebar) {
    return (
      <HeaderActionsContext.Provider value={headerActionsValue}>
        {children}
      </HeaderActionsContext.Provider>
    )
  }

  return (
    <HeaderActionsContext.Provider value={headerActionsValue}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <span className="text-sm font-medium">GoonScout</span>
              <div className="ml-auto flex items-center gap-2">
                {headerActions}
              </div>
            </header>
            <main className="flex-1 p-4">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </HeaderActionsContext.Provider>
  )
}
