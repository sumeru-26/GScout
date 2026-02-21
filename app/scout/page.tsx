"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
import { Expand } from "lucide-react"

import { useHeaderActions } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  id: string
  type: "button"
  x: number
  y: number
  width: number
  height: number
  text?: string
}

type IconButtonAsset = {
  id: string
  type: "icon-button"
  x: number
  y: number
  width: number
  height: number
  iconName: string
}

type ScoutAsset = ButtonAsset | IconButtonAsset

function toPercentFromScale(value: number) {
  return ((value + 100) / 200) * 100
}

function toSizePercentFromScale(value: number) {
  return value
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function clampPositionScale(value: number) {
  return Math.max(-100, Math.min(100, value))
}

function clampSizeScale(value: number) {
  return Math.max(0, Math.min(100, value))
}

function normalizeButtonKind(value: unknown): value is "button" {
  return typeof value === "string" && value.toLowerCase() === "button"
}

function normalizeSwapButtonKind(value: unknown): value is "swap" {
  return typeof value === "string" && value.toLowerCase() === "swap"
}

function normalizeIconButtonKind(value: unknown): value is "icon-button" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return (
    normalized === "icon" ||
    normalized === "icon-button" ||
    normalized === "iconbutton" ||
    normalized === "icon_button"
  )
}

function toLucideExportName(iconName: string) {
  return iconName
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
}

function normalizeIconLookupName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function isRenderableIconComponent(value: unknown): value is React.ComponentType<{ className?: string }> {
  if (typeof value === "function") return true

  if (typeof value === "object" && value !== null) {
    return "$$typeof" in value
  }

  return false
}

const lucideIconLookup = Object.entries(LucideIcons).reduce<Record<string, React.ComponentType<{ className?: string }>>>(
  (accumulator, [exportName, exportedValue]) => {
    if (!isRenderableIconComponent(exportedValue)) return accumulator

    const normalized = normalizeIconLookupName(exportName)
    if (!normalized || normalized.endsWith("iconnode") || normalized === "icon") {
      return accumulator
    }

    accumulator[normalized] = exportedValue as React.ComponentType<{ className?: string }>
    return accumulator
  },
  {}
)

const unknownIconNamesLogged = new Set<string>()

function getLucideIcon(iconName: string) {
  const lookupInput = iconName.trim().toLowerCase()

  const directExportName = toLucideExportName(lookupInput)
  const directIcon = (LucideIcons as Record<string, unknown>)[directExportName]
  if (isRenderableIconComponent(directIcon)) {
    return directIcon as React.ComponentType<{ className?: string }>
  }

  const normalizedInput = normalizeIconLookupName(lookupInput)
  if (lucideIconLookup[normalizedInput]) {
    return lucideIconLookup[normalizedInput]
  }

  const normalizedWithoutIconSuffix = normalizedInput.endsWith("icon")
    ? normalizedInput.slice(0, -4)
    : normalizedInput

  if (normalizedWithoutIconSuffix && lucideIconLookup[normalizedWithoutIconSuffix]) {
    return lucideIconLookup[normalizedWithoutIconSuffix]
  }

  const lookupKey = lookupInput || "(empty iconName)"
  if (!unknownIconNamesLogged.has(lookupKey)) {
    unknownIconNamesLogged.add(lookupKey)
    console.warn(`[ScoutPage] Unknown iconName in payload: "${lookupKey}". Falling back to Circle.`)
  }

  return LucideIcons.Circle
}

function parseScoutAssets(payload: unknown): ScoutAsset[] {
  if (!payload) return []

  const directItems = Array.isArray(payload) ? payload : []

  const nestedItems =
    payload && typeof payload === "object"
      ? (() => {
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
      : []

  const items = [...directItems, ...nestedItems]

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .filter(
      (item) =>
        normalizeButtonKind(item.type) ||
        normalizeButtonKind(item.kind) ||
        normalizeSwapButtonKind(item.type) ||
        normalizeSwapButtonKind(item.kind) ||
        normalizeIconButtonKind(item.type) ||
        normalizeIconButtonKind(item.kind)
    )
    .filter(
      (item) =>
        isFiniteNumber(item.x) &&
        isFiniteNumber(item.y) &&
        isFiniteNumber(item.width) &&
        isFiniteNumber(item.height)
    )
    .map((item, index) => {
      const id =
        typeof item.id === "string" && item.id.trim().length > 0
          ? item.id
          : `button-${index}`

      const isIconButton = normalizeIconButtonKind(item.type) || normalizeIconButtonKind(item.kind)
      const isSwapButton = normalizeSwapButtonKind(item.type) || normalizeSwapButtonKind(item.kind)

      if (isIconButton) {
        return {
          id,
          type: "icon-button",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          iconName:
            typeof item.iconName === "string" && item.iconName.trim().length > 0
              ? item.iconName.trim().toLowerCase()
              : "circle",
        } satisfies IconButtonAsset
      }

      return {
        id,
        type: "button",
        x: clampPositionScale(item.x as number),
        y: clampPositionScale(item.y as number),
        width: clampSizeScale(item.width as number),
        height: clampSizeScale(item.height as number),
        text:
          typeof item.text === "string"
            ? item.text
            : typeof item.label === "string"
              ? item.label
              : isSwapButton
                ? "Swap Sides"
              : undefined,
                  } satisfies ButtonAsset
    })
}

export default function ScoutPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [scoutAssets, setScoutAssets] = useState<ScoutAsset[]>([])
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const storedBackgroundImage = localStorage.getItem("backgroundImage")
    setBackgroundImage(storedBackgroundImage || null)

    const storedPayload = localStorage.getItem("payload")
    if (!storedPayload) {
      setScoutAssets([])
      return
    }

    try {
      const parsedPayload = JSON.parse(storedPayload) as unknown
      setScoutAssets(parseScoutAssets(parsedPayload))
    } catch {
      setScoutAssets([])
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
              backgroundSize: "contain",
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
        {scoutAssets.map((asset, index) => {
          const commonStyle = {
            left: `${toPercentFromScale(asset.x)}%`,
            top: `${100 - toPercentFromScale(asset.y)}%`,
            width: `${toSizePercentFromScale(asset.width)}%`,
            height: `${toSizePercentFromScale(asset.height)}%`,
            transform: "translate(-50%, -50%)",
          }

          if (asset.type === "icon-button") {
            const Icon = getLucideIcon(asset.iconName)

            return (
              <Button
                key={asset.id ?? `icon-button-${index}`}
                type="button"
                variant="outline"
                className="absolute p-0"
                style={commonStyle}
              >
                <Icon />
              </Button>
            )
          }

          return (
            <Button
              key={asset.id ?? `button-${index}`}
              type="button"
              variant="outline"
              className="absolute"
              style={commonStyle}
            >
              {asset.text ?? "Button"}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
