"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
import { Expand } from "lucide-react"

import { useHeaderActions } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  id: string
  type: "button"
  buttonKind: "button" | "swap" | "undo" | "redo" | "submit" | "reset"
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

type CoverAsset = {
  id: string
  type: "cover"
  x: number
  y: number
  width: number
  height: number
}

type InputAsset = {
  id: string
  type: "input"
  x: number
  y: number
  width: number
  height: number
  placeholder?: string
  label?: string
}

type MirrorLine = {
  startX: number
  startY: number
  endX: number
  endY: number
}

type ScoutAsset = ButtonAsset | IconButtonAsset | CoverAsset | InputAsset

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

function normalizeActionButtonKind(value: unknown): value is "undo" | "redo" | "submit" | "reset" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return normalized === "undo" || normalized === "redo" || normalized === "submit" || normalized === "reset"
}

function toActionButtonLabel(kind: "undo" | "redo" | "submit" | "reset") {
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

function normalizeMirrorKind(value: unknown): value is "mirror" {
  return typeof value === "string" && value.toLowerCase() === "mirror"
}

function normalizeCoverKind(value: unknown): value is "cover" {
  return typeof value === "string" && value.toLowerCase() === "cover"
}

function normalizeInputKind(value: unknown): value is "input" {
  return typeof value === "string" && value.toLowerCase() === "input"
}

function getPayloadItems(payload: unknown): unknown[] {
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

  return [...directItems, ...nestedItems]
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

function reflectPointAcrossLine(
  x: number,
  y: number,
  mirrorLine: MirrorLine
): { x: number; y: number } {
  const ax = mirrorLine.startX
  const ay = mirrorLine.startY
  const bx = mirrorLine.endX
  const by = mirrorLine.endY

  const abx = bx - ax
  const aby = by - ay
  const abLengthSquared = abx * abx + aby * aby

  if (abLengthSquared === 0) {
    return { x, y }
  }

  const apx = x - ax
  const apy = y - ay
  const projectionScale = (apx * abx + apy * aby) / abLengthSquared

  const qx = ax + projectionScale * abx
  const qy = ay + projectionScale * aby

  return {
    x: 2 * qx - x,
    y: 2 * qy - y,
  }
}

function parseMirrorLine(payload: unknown): MirrorLine | null {
  const items = getPayloadItems(payload)

  const mirror = items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .find((item) => normalizeMirrorKind(item.type) || normalizeMirrorKind(item.kind))

  if (!mirror) return null

  if (
    !isFiniteNumber(mirror.startX) ||
    !isFiniteNumber(mirror.startY) ||
    !isFiniteNumber(mirror.endX) ||
    !isFiniteNumber(mirror.endY)
  ) {
    return null
  }

  return {
    startX: clampPositionScale(mirror.startX),
    startY: clampPositionScale(mirror.startY),
    endX: clampPositionScale(mirror.endX),
    endY: clampPositionScale(mirror.endY),
  }
}

function parseScoutAssets(payload: unknown): ScoutAsset[] {
  const items = getPayloadItems(payload)

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .filter(
      (item) =>
        normalizeButtonKind(item.type) ||
        normalizeButtonKind(item.kind) ||
        normalizeSwapButtonKind(item.type) ||
        normalizeSwapButtonKind(item.kind) ||
        normalizeActionButtonKind(item.type) ||
        normalizeActionButtonKind(item.kind) ||
        normalizeCoverKind(item.type) ||
        normalizeCoverKind(item.kind) ||
        normalizeInputKind(item.type) ||
        normalizeInputKind(item.kind) ||
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
      const isCover = normalizeCoverKind(item.type) || normalizeCoverKind(item.kind)
      const isInput = normalizeInputKind(item.type) || normalizeInputKind(item.kind)
      const isSwapButton = normalizeSwapButtonKind(item.type) || normalizeSwapButtonKind(item.kind)
      const actionButtonKind = normalizeActionButtonKind(item.type)
        ? item.type
        : normalizeActionButtonKind(item.kind)
          ? item.kind
          : null

      if (isCover) {
        return {
          id,
          type: "cover",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
        } satisfies CoverAsset
      }

      if (isInput) {
        return {
          id,
          type: "input",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          placeholder:
            typeof item.placeholder === "string" && item.placeholder.trim().length > 0
              ? item.placeholder
              : undefined,
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label
              : undefined,
        } satisfies InputAsset
      }

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
        buttonKind: isSwapButton ? "swap" : actionButtonKind ?? "button",
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
                : actionButtonKind
                  ? toActionButtonLabel(actionButtonKind)
                : undefined,
      } satisfies ButtonAsset
    })
}

export default function ScoutPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSwapped, setIsSwapped] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [scoutAssets, setScoutAssets] = useState<ScoutAsset[]>([])
  const [mirrorLine, setMirrorLine] = useState<MirrorLine | null>(null)
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const storedBackgroundImage = localStorage.getItem("backgroundImage")
    setBackgroundImage(storedBackgroundImage || null)

    const storedPayload = localStorage.getItem("payload")
    if (!storedPayload) {
      setScoutAssets([])
      setMirrorLine(null)
      return
    }

    try {
      const parsedPayload = JSON.parse(storedPayload) as unknown
      setScoutAssets(parseScoutAssets(parsedPayload))
      setMirrorLine(parseMirrorLine(parsedPayload))
    } catch {
      setScoutAssets([])
      setMirrorLine(null)
    }
  }, [])

  const displayedAssets = useMemo(() => {
    if (!isSwapped || !mirrorLine) return scoutAssets

    return scoutAssets.map((asset) => {
      const reflected = reflectPointAcrossLine(asset.x, asset.y, mirrorLine)

      return {
        ...asset,
        x: clampPositionScale(reflected.x),
        y: clampPositionScale(reflected.y),
      }
    })
  }, [isSwapped, mirrorLine, scoutAssets])

  const coverAssets = useMemo(
    () => displayedAssets.filter((asset): asset is CoverAsset => asset.type === "cover"),
    [displayedAssets]
  )

  const buttonAssets = useMemo(
    () =>
      displayedAssets.filter(
        (asset): asset is ButtonAsset | IconButtonAsset | InputAsset => asset.type !== "cover"
      ),
    [displayedAssets]
  )

  const handleSwapSides = useCallback(() => {
    if (!mirrorLine) return
    setIsSwapped((previous) => !previous)
  }, [mirrorLine])

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
        {coverAssets.map((asset, index) => {
          const commonStyle = {
            left: `${toPercentFromScale(asset.x)}%`,
            top: `${100 - toPercentFromScale(asset.y)}%`,
            width: `${toSizePercentFromScale(asset.width)}%`,
            height: `${toSizePercentFromScale(asset.height)}%`,
            transform: "translate(-50%, -50%)",
          }

          return (
            <div
              key={asset.id ?? `cover-${index}`}
              className="absolute bg-background"
              style={commonStyle}
            />
          )
        })}
        {buttonAssets.map((asset, index) => {
          const baseStyle = {
            left: `${toPercentFromScale(asset.x)}%`,
            top: `${100 - toPercentFromScale(asset.y)}%`,
            width: `${toSizePercentFromScale(asset.width)}%`,
            transform: "translate(-50%, -50%)",
          }

          const sizedStyle = {
            ...baseStyle,
            height: `${toSizePercentFromScale(asset.height)}%`,
          }

          if (asset.type === "icon-button") {
            const Icon = getLucideIcon(asset.iconName)

            return (
              <Button
                key={asset.id ?? `icon-button-${index}`}
                type="button"
                variant="outline"
                className="absolute p-0"
                style={sizedStyle}
              >
                <Icon />
              </Button>
            )
          }

          if (asset.type === "input") {
            return (
              <Field
                key={asset.id ?? `input-${index}`}
                className="absolute"
                style={baseStyle}
              >
                {asset.label ? <FieldLabel>{asset.label}</FieldLabel> : null}
                <Input
                  placeholder={asset.placeholder}
                  aria-label={asset.label ?? "Input"}
                />
              </Field>
            )
          }

          return (
            <Button
              key={asset.id ?? `button-${index}`}
              type="button"
              variant="outline"
              className="absolute"
              style={sizedStyle}
              onClick={asset.buttonKind === "swap" ? handleSwapSides : undefined}
            >
              {asset.text ?? "Button"}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
