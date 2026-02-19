"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChartLine, LogOut, PiggyBank } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const primaryItems = [
  {
    title: "Scouting",
    href: "/scout",
    icon: ChartLine,
  },
  {
    title: "Predictions",
    href: "/predict",
    icon: PiggyBank,
  },
]

const footerItems = [
  {
    title: "Log Out",
    href: "/login",
    icon: LogOut,
    className: "text-destructive hover:bg-destructive hover:text-foreground",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.setItem("loggedIn", "false")
    localStorage.removeItem("loginCode")
    localStorage.removeItem("scouterName")
    localStorage.removeItem("payload")
    localStorage.removeItem("backgroundImage")
    router.replace("/login")
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-sm font-semibold">GS</span>
          </div>
          <div className="flex flex-col group-data-[state=collapsed]/sidebar:hidden">
            <span className="text-sm font-semibold">GoonScout</span>
            <span className="text-xs text-muted-foreground">
              Scouting Suite
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {primaryItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.href}>
                    <Icon className="size-4" />
                    <span className="group-data-[state=collapsed]/sidebar:hidden">
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.title === "Log Out") {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={item.className}
                  >
                    <button type="button" onClick={handleLogout}>
                      <Icon className="size-4" />
                      <span className="group-data-[state=collapsed]/sidebar:hidden">
                        {item.title}
                      </span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={item.className}
                >
                  <Link href={item.href}>
                    <Icon className="size-4" />
                    <span className="group-data-[state=collapsed]/sidebar:hidden">
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
