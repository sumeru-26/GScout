"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Expand } from "lucide-react"

import { useHeaderActions } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  type: "button"
  x: number
  y: number
  width: number
  height: number
  text?: string
}

function toPercentFromScale(value: number) {
  return ((value + 100) / 200) * 100
}

function toSizePercentFromScale(value: number) {
  return (value / 200) * 100
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function parseButtonAssets(payload: unknown): ButtonAsset[] {
  if (!payload) return []

  const items = Array.isArray(payload)
    ? payload
    : (() => {
        if (typeof payload !== "object") return []
        const source = payload as {
          items?: unknown
          editorState?: {
            items?: unknown
          }
        }
        if (Array.isArray(source.items)) return source.items
        if (Array.isArray(source.editorState?.items)) return source.editorState.items
        return []
      })()

  return items
    .filter(
      (item): item is { button: Record<string, unknown> } =>
        Boolean(item && typeof item === "object" && "button" in item)
    )
    .map((item) => item.button)
    .filter(
      (item) =>
        isFiniteNumber(item.x) &&
        isFiniteNumber(item.y) &&
        isFiniteNumber(item.width) &&
        isFiniteNumber(item.height)
    )
    .map((item) => ({
      type: "button",
      x: item.x as number,
      y: item.y as number,
      width: item.width as number,
      height: item.height as number,
      text: typeof item.text === "string" ? item.text : undefined,
    }))
}

export default function ScoutPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [buttonAssets, setButtonAssets] = useState<ButtonAsset[]>([])
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const storedBackgroundImage = localStorage.getItem("backgroundImage")
    setBackgroundImage(storedBackgroundImage || null)

    const storedPayload = localStorage.getItem("payload")
    if (!storedPayload) {
      setButtonAssets([])
      return
    }

    try {
      const parsedPayload = JSON.parse(storedPayload) as unknown
      setButtonAssets(parseButtonAssets(parsedPayload))
    } catch {
      setButtonAssets([])
    }
  }, [])

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
        "relative rounded-lg border border-dashed",
        backgroundImage ? "bg-transparent" : "bg-muted/20",
        isFullscreen ? "min-h-screen" : "min-h-[calc(100vh-3.5rem)]"
      )}
      style={
        backgroundImage
          ? {
              backgroundImage: `url("${backgroundImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <div
        className={cn(
          "relative",
          isFullscreen ? "min-h-screen" : "min-h-[calc(100vh-3.5rem)]"
        )}
      >
        {buttonAssets.map((asset, index) => (
          <Button
            key={`button-${index}`}
            type="button"
            className="absolute"
            style={{
              left: `${toPercentFromScale(asset.x)}%`,
              top: `${100 - toPercentFromScale(asset.y)}%`,
              width: `${toSizePercentFromScale(asset.width)}%`,
              height: `${toSizePercentFromScale(asset.height)}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {asset.text ?? "Button"}
          </Button>
        ))}
      </div>
    </div>
  )
}
