"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as LucideIcons from "lucide-react"
import { Expand } from "lucide-react"
import QRCode from "qrcode"

import { useHeaderActions } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  id: string
  type: "button"
  buttonKind: "button" | "swap" | "undo" | "redo" | "submit" | "reset"
  tag?: string
  x: number
  y: number
  width: number
  height: number
  text?: string
}

type IconButtonAsset = {
  id: string
  type: "icon-button"
  tag?: string
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
  tag?: string
  x: number
  y: number
  width: number
  height: number
  placeholder?: string
  label?: string
}

type AutoToggleAsset = {
  id: string
  type: "auto-toggle"
  x: number
  y: number
  width: number
  height: number
}

type ToggleSwitchAsset = {
  id: string
  type: "toggle-switch"
  tag?: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  value: boolean
}

type LogAsset = {
  id: string
  type: "log"
  x: number
  y: number
  width: number
  height: number
}

type MirrorLine = {
  startX: number
  startY: number
  endX: number
  endY: number
}

type BoxSize = {
  width: number
  height: number
}

type BoxBounds = {
  left: number
  top: number
  width: number
  height: number
}

type ScoutAsset =
  | ButtonAsset
  | IconButtonAsset
  | CoverAsset
  | InputAsset
  | AutoToggleAsset
  | ToggleSwitchAsset
  | LogAsset

type ControlMode = "auto" | "teleop"

const AUTO_TIMER_DURATION_MS = 25_000

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function getActiveFullscreenElement(doc: Document) {
  const webkitDocument = doc as FullscreenDocument
  return doc.fullscreenElement ?? webkitDocument.webkitFullscreenElement ?? null
}

function canUseNativeFullscreen(element: HTMLElement) {
  const webkitElement = element as FullscreenElement
  return (
    typeof element.requestFullscreen === "function" ||
    typeof webkitElement.webkitRequestFullscreen === "function"
  )
}

function toPercentFromScale(value: number) {
  return ((value + 100) / 200) * 100
}

function toSizePercentFromScale(value: number) {
  return value
}

function getContainedBounds(containerSize: BoxSize, contentSize: BoxSize): BoxBounds {
  const { width: containerWidth, height: containerHeight } = containerSize
  const { width: contentWidth, height: contentHeight } = contentSize

  if (containerWidth <= 0 || containerHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return {
      left: 0,
      top: 0,
      width: Math.max(0, containerWidth),
      height: Math.max(0, containerHeight),
    }
  }

  const scale = Math.min(containerWidth / contentWidth, containerHeight / contentHeight)
  const width = contentWidth * scale
  const height = contentHeight * scale

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function toFiniteNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value

  if (typeof value === "string") {
    const normalized = value.trim()
    if (normalized.length === 0) return null

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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

function normalizeAutoToggleKind(value: unknown): value is "auto-toggle" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return normalized === "auto-toggle" || normalized === "autotoggle" || normalized === "auto_toggle"
}

function normalizeToggleSwitchKind(value: unknown): value is "toggle-switch" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return (
    normalized === "toggle-switch" ||
    normalized === "toggleswitch" ||
    normalized === "toggle_switch" ||
    normalized === "toggle"
  )
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (normalized === "true") return true
    if (normalized === "false") return false
  }
  return null
}

function looksLikeToggleSwitch(item: Record<string, unknown>) {
  if (
    toFiniteNumber(item.x) === null ||
    toFiniteNumber(item.y) === null ||
    toFiniteNumber(item.width) === null ||
    toFiniteNumber(item.height) === null
  ) {
    return false
  }

  const booleanValue = toBoolean(item.value)
  if (booleanValue === null) return false

  return true
}

function normalizeLogKind(value: unknown): value is "log" {
  return typeof value === "string" && value.toLowerCase() === "log"
}

function stripModePrefix(tag: string) {
  return tag.replace(/^(auto|teleop)\./, "")
}

function toModePrefixedTag(tag: string, mode: ControlMode) {
  const normalizedTag = stripModePrefix(tag.trim())
  return `${mode}.${normalizedTag}`
}

function parseAssetTag(item: Record<string, unknown>) {
  const rawTag =
    typeof item.tag === "string"
      ? item.tag
      : typeof item.inputTag === "string"
        ? item.inputTag
        : typeof item.input_tag === "string"
          ? item.input_tag
          : typeof item.name === "string"
            ? item.name
            : undefined

  if (!rawTag) return undefined

  const normalized = rawTag.trim()
  return normalized.length > 0 ? normalized : undefined
}

function collectNamedAssetItems(source: unknown, depth = 0): Record<string, unknown>[] {
  if (!source || typeof source !== "object" || Array.isArray(source)) return []
  if (depth > 4) return []

  const entries = Object.entries(source as Record<string, unknown>)
  const collected: Record<string, unknown>[] = []

  entries.forEach(([key, value]) => {
    if (!value || typeof value !== "object") return

    if (Array.isArray(value)) {
      value.forEach((nestedValue) => {
        collected.push(...collectNamedAssetItems(nestedValue, depth + 1))
      })
      return
    }

    const typedValue = value as Record<string, unknown>
    const parsedX = toFiniteNumber(typedValue.x)
    const parsedY = toFiniteNumber(typedValue.y)
    const parsedWidth = toFiniteNumber(typedValue.width)
    const parsedHeight = toFiniteNumber(typedValue.height)

    const hasGeometry =
      parsedX !== null &&
      parsedY !== null &&
      parsedWidth !== null &&
      parsedHeight !== null

    if (hasGeometry) {
      collected.push({
        ...typedValue,
        x: parsedX,
        y: parsedY,
        width: parsedWidth,
        height: parsedHeight,
        id:
          typeof typedValue.id === "string" && typedValue.id.trim().length > 0
            ? typedValue.id
            : key,
        kind:
          typeof typedValue.kind === "string" && typedValue.kind.trim().length > 0
            ? typedValue.kind
            : typeof typedValue.type === "string" && typedValue.type.trim().length > 0
              ? typedValue.type
              : key,
      })
      return
    }

    collected.push(...collectNamedAssetItems(typedValue, depth + 1))
  })

  return collected
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

  const namedItems = collectNamedAssetItems(payload)

  return [...directItems, ...nestedItems, ...namedItems]
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
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
        normalizeAutoToggleKind(item.type) ||
        normalizeAutoToggleKind(item.kind) ||
        normalizeAutoToggleKind(item.key) ||
        normalizeToggleSwitchKind(item.type) ||
        normalizeToggleSwitchKind(item.kind) ||
        normalizeToggleSwitchKind(item.key) ||
        looksLikeToggleSwitch(item) ||
        normalizeLogKind(item.type) ||
        normalizeLogKind(item.kind) ||
        normalizeLogKind(item.key) ||
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
      const isAutoToggle =
        normalizeAutoToggleKind(item.type) ||
        normalizeAutoToggleKind(item.kind) ||
        normalizeAutoToggleKind(item.key)
      const isToggleSwitch =
        normalizeToggleSwitchKind(item.type) ||
        normalizeToggleSwitchKind(item.kind) ||
        normalizeToggleSwitchKind(item.key) ||
        looksLikeToggleSwitch(item)
      const isLog = normalizeLogKind(item.type) || normalizeLogKind(item.kind) || normalizeLogKind(item.key)
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
          tag: parseAssetTag(item),
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

      if (isAutoToggle) {
        return {
          id,
          type: "auto-toggle",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
        } satisfies AutoToggleAsset
      }

      if (isToggleSwitch) {
        return {
          id,
          type: "toggle-switch",
          tag: parseAssetTag(item),
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label
              : typeof item.text === "string" && item.text.trim().length > 0
                ? item.text
                : undefined,
          value: toBoolean(item.value) ?? false,
        } satisfies ToggleSwitchAsset
      }

      if (isLog) {
        return {
          id,
          type: "log",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
        } satisfies LogAsset
      }

      if (isIconButton) {
        return {
          id,
          type: "icon-button",
          tag: parseAssetTag(item),
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
        tag: parseAssetTag(item),
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
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false)
  const isFullscreen = isNativeFullscreen || isFallbackFullscreen
  const [isSwapped, setIsSwapped] = useState(false)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [containerSize, setContainerSize] = useState<BoxSize>({ width: 0, height: 0 })
  const [backgroundImageSize, setBackgroundImageSize] = useState<BoxSize | null>(null)
  const [scoutAssets, setScoutAssets] = useState<ScoutAsset[]>([])
  const [mirrorLine, setMirrorLine] = useState<MirrorLine | null>(null)
  const [tagStack, setTagStack] = useState<string[]>([])
  const [redoTagStack, setRedoTagStack] = useState<string[]>([])
  const [inputValuesByKey, setInputValuesByKey] = useState<Record<string, string>>({})
  const [toggleValuesByKey, setToggleValuesByKey] = useState<Record<string, boolean>>({})
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [submitQrCodeUrl, setSubmitQrCodeUrl] = useState<string | null>(null)
  const [submitPayloadJson, setSubmitPayloadJson] = useState<string>("{}")
  const [scouterName, setScouterName] = useState<string>("")
  const [controlMode, setControlMode] = useState<ControlMode>("auto")
  const [autoTimerStartedAtMs, setAutoTimerStartedAtMs] = useState<number | null>(null)
  const [autoTimerRemainingMs, setAutoTimerRemainingMs] = useState<number>(AUTO_TIMER_DURATION_MS)
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const storedScouterName = localStorage.getItem("scouterName")
    setScouterName(storedScouterName?.trim() ?? "")

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
      const normalizedPayload = typeof parsedPayload === "string" ? tryParseJson(parsedPayload) : parsedPayload
      setScoutAssets(parseScoutAssets(normalizedPayload))
      setMirrorLine(parseMirrorLine(normalizedPayload))
    } catch {
      setScoutAssets([])
      setMirrorLine(null)
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateSize = () => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!backgroundImage) {
      setBackgroundImageSize(null)
      return
    }

    let cancelled = false
    const image = new Image()

    image.onload = () => {
      if (cancelled) return

      setBackgroundImageSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      if (cancelled) return
      setBackgroundImageSize(null)
    }

    image.src = backgroundImage

    return () => {
      cancelled = true
    }
  }, [backgroundImage])

  const measuredFieldBounds = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) return null

    if (!backgroundImage || !backgroundImageSize) {
      return {
        left: 0,
        top: 0,
        width: containerSize.width,
        height: containerSize.height,
      } satisfies BoxBounds
    }

    return getContainedBounds(containerSize, backgroundImageSize)
  }, [backgroundImage, backgroundImageSize, containerSize])

  const getAssetStyle = useCallback(
    (asset: { x: number; y: number; width: number; height: number }, includeHeight: boolean) => {
      if (!measuredFieldBounds) {
        const percentBaseStyle = {
          left: `${toPercentFromScale(asset.x)}%`,
          top: `${100 - toPercentFromScale(asset.y)}%`,
          width: `${toSizePercentFromScale(asset.width)}%`,
          transform: "translate(-50%, -50%)",
        }

        if (!includeHeight) {
          return percentBaseStyle
        }

        return {
          ...percentBaseStyle,
          height: `${toSizePercentFromScale(asset.height)}%`,
        }
      }

      const xPercent = toPercentFromScale(asset.x) / 100
      const yPercent = (100 - toPercentFromScale(asset.y)) / 100
      const widthPercent = toSizePercentFromScale(asset.width) / 100
      const heightPercent = toSizePercentFromScale(asset.height) / 100

      const baseStyle = {
        left: measuredFieldBounds.left + measuredFieldBounds.width * xPercent,
        top: measuredFieldBounds.top + measuredFieldBounds.height * yPercent,
        width: measuredFieldBounds.width * widthPercent,
        transform: "translate(-50%, -50%)",
      }

      if (!includeHeight) {
        return baseStyle
      }

      return {
        ...baseStyle,
        height: measuredFieldBounds.height * heightPercent,
      }
    },
    [measuredFieldBounds]
  )

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
        (asset): asset is ButtonAsset | IconButtonAsset | InputAsset | AutoToggleAsset | ToggleSwitchAsset | LogAsset =>
          asset.type !== "cover"
      ),
    [displayedAssets]
  )

  useEffect(() => {
    const initialToggleValues = scoutAssets
      .filter((asset): asset is ToggleSwitchAsset => asset.type === "toggle-switch")
      .reduce<Record<string, boolean>>((accumulator, asset) => {
        const toggleKey =
          typeof asset.tag === "string" && asset.tag.trim().length > 0
            ? asset.tag
            : asset.id

        accumulator[toggleKey] = asset.value
        return accumulator
      }, {})

    setToggleValuesByKey(initialToggleValues)
  }, [scoutAssets])

  const recentTagLog = useMemo(() => {
    return [...tagStack].slice(-5).reverse()
  }, [tagStack])

  const setTeleopMode = useCallback(() => {
    setControlMode("teleop")
    setAutoTimerStartedAtMs(null)
    setAutoTimerRemainingMs(AUTO_TIMER_DURATION_MS)
  }, [])

  const setAutoMode = useCallback((startTimer: boolean) => {
    setControlMode("auto")

    if (startTimer) {
      setAutoTimerStartedAtMs(Date.now())
      setAutoTimerRemainingMs(AUTO_TIMER_DURATION_MS)
      return
    }

    setAutoTimerStartedAtMs(null)
    setAutoTimerRemainingMs(AUTO_TIMER_DURATION_MS)
  }, [])

  const isAutoTimerRunning = controlMode === "auto" && autoTimerStartedAtMs !== null
  const autoTimerLabel = isAutoTimerRunning ? (autoTimerRemainingMs / 1000).toFixed(2) : "Auto"

  const handleAutoToggleGroupChange = useCallback(
    (nextValue: string) => {
      if (nextValue === "auto") {
        setAutoMode(true)
        return
      }

      if (nextValue === "teleop") {
        setTeleopMode()
        return
      }

      // Clicking the active item emits an empty value. Keep one mode selected at all times.
      if (controlMode === "auto") {
        if (autoTimerStartedAtMs !== null) {
          setTeleopMode()
          return
        }

        setAutoMode(true)
        return
      }

      setAutoMode(false)
    },
    [autoTimerStartedAtMs, controlMode, setAutoMode, setTeleopMode]
  )

  useEffect(() => {
    if (controlMode !== "auto" || autoTimerStartedAtMs === null) return

    const timerId = window.setInterval(() => {
      const elapsedMs = Date.now() - autoTimerStartedAtMs
      const remainingMs = Math.max(0, AUTO_TIMER_DURATION_MS - elapsedMs)
      setAutoTimerRemainingMs(remainingMs)

      if (remainingMs <= 0) {
        setTeleopMode()
      }
    }, 10)

    return () => window.clearInterval(timerId)
  }, [autoTimerStartedAtMs, controlMode, setTeleopMode])

  const handleSwapSides = useCallback(() => {
    if (!mirrorLine) return
    setIsSwapped((previous) => !previous)
  }, [mirrorLine])

  const pushTagToStack = useCallback((tag?: string) => {
    if (!tag || tag.trim().length === 0) return

    const prefixedTag = toModePrefixedTag(tag, controlMode)

    setTagStack((previous) => [...previous, prefixedTag])
    setRedoTagStack([])
  }, [controlMode])

  const handleUndo = useCallback(() => {
    if (tagStack.length === 0) return

    const popped = tagStack[tagStack.length - 1]
    setTagStack((previous) => previous.slice(0, -1))
    setRedoTagStack((previous) => [...previous, popped])
  }, [tagStack])

  const handleRedo = useCallback(() => {
    if (redoTagStack.length === 0) return

    const popped = redoTagStack[redoTagStack.length - 1]
    setRedoTagStack((previous) => previous.slice(0, -1))
    setTagStack((previous) => [...previous, popped])
  }, [redoTagStack])

  const handleSubmit = useCallback(async () => {
    const output: Record<string, number | string | boolean> = {}

    const uniqueButtonAndIconTags = [
      ...new Set(
        scoutAssets
          .filter(
            (asset): asset is ButtonAsset | IconButtonAsset =>
              asset.type === "button" || asset.type === "icon-button"
          )
          .map((asset) => asset.tag)
          .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      ),
    ]

    const uniqueInputTags = [
      ...new Set(
        scoutAssets
          .filter((asset): asset is InputAsset => asset.type === "input")
          .map((asset) => (asset.tag && asset.tag.trim().length > 0 ? asset.tag : asset.id))
      ),
    ]

    const uniqueToggleTags = [
      ...new Set(
        scoutAssets
          .filter((asset): asset is ToggleSwitchAsset => asset.type === "toggle-switch")
          .map((asset) => (asset.tag && asset.tag.trim().length > 0 ? asset.tag : asset.id))
      ),
    ]

    const uniqueModePrefixedTags = [
      ...new Set(
        uniqueButtonAndIconTags.flatMap((tag) => {
          const normalizedTag = stripModePrefix(tag)
          return [`auto.${normalizedTag}`, `teleop.${normalizedTag}`]
        })
      ),
    ]

    uniqueModePrefixedTags.forEach((tag) => {
      output[tag] = 0
    })

    uniqueInputTags.forEach((tag) => {
      output[tag] = ""
    })

    uniqueToggleTags.forEach((tag) => {
      output[tag] = false
    })

    uniqueModePrefixedTags.forEach((tag) => {
      output[tag] = tagStack.filter((stackTag) => stackTag === tag).length
    })

    uniqueInputTags.forEach((tag) => {
      output[tag] = inputValuesByKey[tag] ?? ""
    })

    uniqueToggleTags.forEach((tag) => {
      output[tag] = toggleValuesByKey[tag] ?? false
    })

    output.scouter = scouterName

    const payloadJson = JSON.stringify(output)
    setSubmitPayloadJson(payloadJson)

    try {
      const qrDataUrl = await QRCode.toDataURL(payloadJson, {
        width: 320,
        margin: 1,
      })
      setSubmitQrCodeUrl(qrDataUrl)
    } catch {
      setSubmitQrCodeUrl(null)
    }

    setIsSubmitDialogOpen(true)

    console.log("[ScoutPage] submit payload:", output)
  }, [inputValuesByKey, scoutAssets, scouterName, tagStack, toggleValuesByKey])

  useEffect(() => {
    console.log("[ScoutPage] tagStack:", tagStack)
    console.log("[ScoutPage] redoTagStack:", redoTagStack)
  }, [tagStack, redoTagStack])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasNativeFullscreen = Boolean(getActiveFullscreenElement(document))
      setIsNativeFullscreen(hasNativeFullscreen)

      if (hasNativeFullscreen) {
        setIsFallbackFullscreen(false)
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    const element = containerRef.current
    if (!element) return

    const webkitDocument = document as FullscreenDocument
    const activeFullscreenElement = getActiveFullscreenElement(document)

    if (activeFullscreenElement) {
      if (typeof document.exitFullscreen === "function") {
        await document.exitFullscreen()
        return
      }

      if (typeof webkitDocument.webkitExitFullscreen === "function") {
        await webkitDocument.webkitExitFullscreen()
        return
      }

      setIsFallbackFullscreen(false)
      return
    }

    if (canUseNativeFullscreen(element)) {
      const webkitElement = element as FullscreenElement

      if (typeof element.requestFullscreen === "function") {
        await element.requestFullscreen()
        return
      }

      if (typeof webkitElement.webkitRequestFullscreen === "function") {
        await webkitElement.webkitRequestFullscreen()
        return
      }
    }

    setIsFallbackFullscreen((previous) => !previous)
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
        isFullscreen ? "min-h-[100dvh]" : "min-h-[calc(100vh-3.5rem)]"
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
          isFullscreen ? "min-h-[100dvh]" : "min-h-[calc(100vh-3.5rem)]"
        )}
      >
        {isFallbackFullscreen ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            App fullscreen mode (native fullscreen is not available on this browser)
          </div>
        ) : null}

        {coverAssets.map((asset, index) => {
          const commonStyle = getAssetStyle(asset, true)

          return (
            <div
              key={asset.id ?? `cover-${index}`}
              className="absolute bg-background"
              style={commonStyle}
            />
          )
        })}
        {buttonAssets.map((asset, index) => {
          const baseStyle = getAssetStyle(asset, false)
          const sizedStyle = getAssetStyle(asset, true)

          if (asset.type === "icon-button") {
            const Icon = getLucideIcon(asset.iconName)

            return (
              <Button
                key={asset.id ?? `icon-button-${index}`}
                type="button"
                variant="outline"
                className="absolute p-0"
                style={sizedStyle}
                onClick={() => pushTagToStack(asset.tag)}
              >
                <Icon />
              </Button>
            )
          }

          if (asset.type === "input") {
            const inputStateKey =
              typeof asset.tag === "string" && asset.tag.trim().length > 0
                ? asset.tag
                : asset.id

            return (
              <Field
                key={asset.id ?? `input-${index}`}
                className="absolute"
                style={baseStyle}
              >
                {asset.label ? <FieldLabel>{asset.label}</FieldLabel> : null}
                <Input
                  value={inputValuesByKey[inputStateKey] ?? ""}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setInputValuesByKey((previous) => ({
                      ...previous,
                      [inputStateKey]: nextValue,
                    }))
                  }}
                  placeholder={asset.placeholder}
                  aria-label={asset.label ?? "Input"}
                />
              </Field>
            )
          }

          if (asset.type === "auto-toggle") {
            return (
              <ToggleGroup
                key={asset.id ?? `auto-toggle-${index}`}
                type="single"
                value={controlMode}
                onValueChange={handleAutoToggleGroupChange}
                className="absolute rounded-md border bg-background/90 p-1"
                style={sizedStyle}
              >
                <ToggleGroupItem value="auto" className="h-full flex-1">
                  {autoTimerLabel}
                </ToggleGroupItem>
                <ToggleGroupItem value="teleop" className="h-full flex-1">
                  Teleop
                </ToggleGroupItem>
              </ToggleGroup>
            )
          }

          if (asset.type === "toggle-switch") {
            const toggleKey =
              typeof asset.tag === "string" && asset.tag.trim().length > 0
                ? asset.tag
                : asset.id
            const isChecked = toggleValuesByKey[toggleKey] ?? asset.value
            const toggleId = `toggle-${asset.id ?? index}`

            return (
              <div
                key={asset.id ?? `toggle-switch-${index}`}
                className="absolute flex items-center justify-center cursor-default"
                style={sizedStyle}
              >
                <div className="flex items-center space-x-2">
                  <Switch
                    id={toggleId}
                    className="cursor-pointer"
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      setToggleValuesByKey((previous) => ({
                        ...previous,
                        [toggleKey]: checked,
                      }))
                    }}
                  />
                  <Label htmlFor={toggleId} className="cursor-pointer text-xs">
                    {asset.label ?? "Toggle"}
                  </Label>
                </div>
              </div>
            )
          }

          if (asset.type === "log") {
            return (
              <div
                key={asset.id ?? `log-${index}`}
                className="absolute overflow-hidden rounded-md border bg-background/90 p-2"
                style={sizedStyle}
              >
                <div
                  className="h-full space-y-1 overflow-hidden text-xs leading-tight"
                  style={{ fontFamily: '"Courier New", Courier, monospace' }}
                >
                  {recentTagLog.length === 0 ? (
                    <p className="text-muted-foreground">No tags yet.</p>
                  ) : (
                    recentTagLog.map((entry, entryIndex) => (
                      <p key={`${entry}-${entryIndex}`} className="truncate">
                        {entry}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )
          }

          return (
            <Button
              key={asset.id ?? `button-${index}`}
              type="button"
              variant={
                asset.buttonKind === "submit"
                  ? "default"
                  : asset.buttonKind === "reset"
                    ? "destructive"
                    : "outline"
              }
              className="absolute"
              style={sizedStyle}
              onClick={() => {
                if (asset.buttonKind === "undo") {
                  handleUndo()
                  return
                }

                if (asset.buttonKind === "redo") {
                  handleRedo()
                  return
                }

                if (asset.buttonKind !== "submit" && asset.buttonKind !== "reset") {
                  pushTagToStack(asset.tag)
                }

                if (asset.buttonKind === "submit") {
                  handleSubmit()
                }

                if (asset.buttonKind === "reset") {
                  setTagStack([])
                  setRedoTagStack([])
                  setInputValuesByKey({})
                  setToggleValuesByKey(
                    scoutAssets
                      .filter((candidate): candidate is ToggleSwitchAsset => candidate.type === "toggle-switch")
                      .reduce<Record<string, boolean>>((accumulator, candidate) => {
                        const toggleKey =
                          typeof candidate.tag === "string" && candidate.tag.trim().length > 0
                            ? candidate.tag
                            : candidate.id

                        accumulator[toggleKey] = candidate.value
                        return accumulator
                      }, {})
                  )
                }

                if (asset.buttonKind === "swap") {
                  handleSwapSides()
                }
              }}
            >
              {asset.buttonKind === "undo" ? (
                <LucideIcons.Undo2 />
              ) : asset.buttonKind === "redo" ? (
                <LucideIcons.Redo2 />
              ) : (
                asset.text ?? "Button"
              )}
            </Button>
          )
        })}
      </div>
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit QR Code</DialogTitle>
            <DialogDescription>
              Scan to read the submitted scouting JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {submitQrCodeUrl ? (
              <img src={submitQrCodeUrl} alt="Submitted scouting JSON QR code" className="size-64" />
            ) : (
              <div className="text-muted-foreground text-sm">Unable to generate QR code.</div>
            )}
          </div>
          <p className="text-muted-foreground break-all text-xs">{submitPayloadJson}</p>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
