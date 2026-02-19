"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Expand } from "lucide-react"

import { useHeaderActions } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function ScoutPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    const element = containerRef.current
    if (!element) return

    if (!document.fullscreenElement) {
      await element.requestFullscreen()
      return
    }

    if (document.fullscreenElement === element) {
      await document.exitFullscreen()
    }
  }, [])

  const fullscreenAction = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={
          isFullscreen ? "Exit fullscreen scouting view" : "Fullscreen scouting view"
        }
        onClick={handleToggleFullscreen}
      >
        <Expand className="size-4" />
      </Button>
    ),
    [handleToggleFullscreen, isFullscreen]
  )

  useEffect(() => {
    setHeaderActions(fullscreenAction)
    return () => setHeaderActions(null)
  }, [fullscreenAction, setHeaderActions])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg border border-dashed bg-muted/20",
        isFullscreen ? "min-h-screen" : "min-h-[calc(100vh-3.5rem)]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center",
          isFullscreen ? "min-h-screen" : "min-h-[calc(100vh-3.5rem)]"
        )}
      >
        <p className="text-sm text-muted-foreground">
          Scouting page coming soon.
        </p>
      </div>
    </div>
  )
}
