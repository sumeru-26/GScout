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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  id: string
  type: "button"
  buttonKind: "button" | "swap" | "undo" | "redo" | "submit" | "reset"
  tag?: string
  increment?: number
  stageParentTag?: string
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
  increment?: number
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  iconName: string
  outlineColor?: string
  fillColor?: string
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
  textAlign?: "left" | "center" | "right"
  textSize?: number
}

type MatchSelectAsset = {
  id: string
  type: "match-select"
  x: number
  y: number
  width: number
  height: number
  label?: string
  valueText?: string
  decrementText?: string
  incrementText?: string
}

type LogAsset = {
  id: string
  type: "log"
  x: number
  y: number
  width: number
  height: number
}

type TbaSimpleMatch = {
  key: string
  compLevel: string
  matchNumber: number
  blueTeamKeys: string[]
  redTeamKeys: string[]
}

type TeamSelectOption = {
  value: string
  label: string
  colorClassName: string
}

type TagStackAction = {
  tag: string
  count: number
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
  | MatchSelectAsset
  | LogAsset

type ControlMode = "auto" | "teleop"

const AUTO_TIMER_DURATION_MS = 25_000
const TOGGLE_SIZE = { width: 52, height: 28 } as const
const LOG_SIZE = { width: 280, height: 120 } as const

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

function toNonNegativeWholeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null
    return value
  }

  if (typeof value === "string") {
    const normalized = value.trim()
    if (!/^\d+$/.test(normalized)) return null

    const parsed = Number(normalized)
    if (!Number.isSafeInteger(parsed) || parsed < 0) return null
    return parsed
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

function normalizeTeamKey(value: unknown): string | null {
  if (typeof value !== "string") return null

  const normalized = value.trim().toLowerCase()
  if (!/^frc\d+$/.test(normalized)) return null
  return normalized
}

function teamKeyToTeamNumber(teamKey: string): string {
  const parsed = /^frc(\d+)$/.exec(teamKey)
  return parsed?.[1] ?? teamKey
}

function normalizeTeamKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map((candidate) => normalizeTeamKey(candidate))
    .filter((candidate): candidate is string => candidate !== null)
}

function normalizeEventScheduleMatches(source: unknown): TbaSimpleMatch[] {
  const candidateMatches =
    Array.isArray(source)
      ? source
      : source && typeof source === "object" && Array.isArray((source as { matches?: unknown }).matches)
        ? (source as { matches: unknown[] }).matches
        : []

  return candidateMatches
    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate && typeof candidate === "object"))
    .map((candidate, index) => {
      const key =
        typeof candidate.key === "string" && candidate.key.trim().length > 0
          ? candidate.key.trim()
          : `match-${index}`

      const compLevel =
        typeof candidate.comp_level === "string"
          ? candidate.comp_level.trim().toLowerCase()
          : typeof candidate.compLevel === "string"
            ? candidate.compLevel.trim().toLowerCase()
            : ""

      const matchNumber =
        toNonNegativeWholeNumber(candidate.match_number) ??
        toNonNegativeWholeNumber(candidate.matchNumber) ??
        -1

      const alliances =
        candidate.alliances && typeof candidate.alliances === "object"
          ? (candidate.alliances as {
              blue?: { team_keys?: unknown; teamKeys?: unknown }
              red?: { team_keys?: unknown; teamKeys?: unknown }
            })
          : undefined

      const blueTeamKeys = normalizeTeamKeyList(
        alliances?.blue?.team_keys ?? alliances?.blue?.teamKeys
      )
      const redTeamKeys = normalizeTeamKeyList(
        alliances?.red?.team_keys ?? alliances?.red?.teamKeys
      )

      return {
        key,
        compLevel,
        matchNumber,
        blueTeamKeys,
        redTeamKeys,
      } satisfies TbaSimpleMatch
    })
    .filter((match) => match.matchNumber >= 0)
}

function normalizeMatchSelectKind(value: unknown): value is "match-select" {
  if (typeof value !== "string") return false

  const normalized = value.trim().toLowerCase()
  return normalized === "match-select" || normalized === "matchselect" || normalized === "match_select"
}

function normalizeTeamSelectTag(value: unknown): value is "team-select" {
  return typeof value === "string" && value.trim().toLowerCase() === "team-select"
}

function isTeamSelectAsset(item: Record<string, unknown>) {
  return (
    normalizeTeamSelectTag(item.kind) ||
    normalizeTeamSelectTag(item.type) ||
    normalizeTeamSelectTag(item.tag) ||
    normalizeTeamSelectTag(item.key) ||
    normalizeTeamSelectTag(item.name)
  )
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
          : typeof item.key === "string"
            ? item.key
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
        normalizeMatchSelectKind(item.type) ||
        normalizeMatchSelectKind(item.kind) ||
        normalizeMatchSelectKind(item.key) ||
        normalizeIconButtonKind(item.type) ||
        normalizeIconButtonKind(item.kind) ||
        isTeamSelectAsset(item)
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
      const parsedIncrement = toNonNegativeWholeNumber(item.increment)
      const isLog = normalizeLogKind(item.type) || normalizeLogKind(item.kind) || normalizeLogKind(item.key)
      const isMatchSelect =
        normalizeMatchSelectKind(item.type) ||
        normalizeMatchSelectKind(item.kind) ||
        normalizeMatchSelectKind(item.key)
      const isTeamSelect = isTeamSelectAsset(item)
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
        const toggleTextAlign =
          typeof item.textAlign === "string"
            ? item.textAlign.toLowerCase()
            : typeof item.toggleTextAlign === "string"
              ? item.toggleTextAlign.toLowerCase()
              : undefined

        const toggleTextSize =
          typeof item.textSize === "number" && Number.isFinite(item.textSize)
            ? item.textSize
            : typeof item.toggleTextSize === "number" && Number.isFinite(item.toggleTextSize)
              ? item.toggleTextSize
              : undefined

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
          textAlign:
            toggleTextAlign === "left" || toggleTextAlign === "right" || toggleTextAlign === "center"
              ? toggleTextAlign
              : "center",
          textSize: toggleTextSize,
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

      if (isMatchSelect) {
        const parsedMatchValue =
          toNonNegativeWholeNumber(item.valueText) ??
          toNonNegativeWholeNumber(item.value) ??
          toNonNegativeWholeNumber(item.matchNumber) ??
          toNonNegativeWholeNumber(item.match) ??
          toNonNegativeWholeNumber(item.number) ??
          1

        return {
          id,
          type: "match-select",
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label.trim()
              : typeof item.text === "string" && item.text.trim().length > 0
                ? item.text.trim()
                : "Match Select",
          valueText: String(parsedMatchValue),
          decrementText:
            typeof item.decrementText === "string" && item.decrementText.trim().length > 0
              ? item.decrementText.trim()
              : "-",
          incrementText:
            typeof item.incrementText === "string" && item.incrementText.trim().length > 0
              ? item.incrementText.trim()
              : "+",
        } satisfies MatchSelectAsset
      }

      if (isIconButton) {
        return {
          id,
          type: "icon-button",
          tag: parseAssetTag(item),
          increment: parsedIncrement ?? undefined,
          stageParentTag:
            typeof item.stageParentTag === "string" && item.stageParentTag.trim().length > 0
              ? item.stageParentTag
              : undefined,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          iconName:
            typeof item.iconName === "string" && item.iconName.trim().length > 0
              ? item.iconName.trim().toLowerCase()
              : "circle",
          outlineColor:
            typeof item.outlineColor === "string" && item.outlineColor.trim().length > 0
              ? item.outlineColor
              : undefined,
          fillColor:
            typeof item.fillColor === "string" && item.fillColor.trim().length > 0
              ? item.fillColor
              : undefined,
        } satisfies IconButtonAsset
      }

      return {
        id,
        type: "button",
        buttonKind: isTeamSelect ? "button" : isSwapButton ? "swap" : actionButtonKind ?? "button",
        // Team-select assets can come through with an empty tag, so set a stable internal tag.
        tag: isTeamSelect ? "team-select" : parseAssetTag(item),
        increment: parsedIncrement ?? undefined,
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
  const TEAM_SELECT_TAG = "team-select"
  const TEAM_DEFAULT_VALUE = ""

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
  const [tagStackActions, setTagStackActions] = useState<TagStackAction[]>([])
  const [redoTagStackActions, setRedoTagStackActions] = useState<TagStackAction[]>([])
  const [inputValuesByKey, setInputValuesByKey] = useState<Record<string, string>>({})
  const [toggleValuesByKey, setToggleValuesByKey] = useState<Record<string, boolean>>({})
  const [matchValuesByKey, setMatchValuesByKey] = useState<Record<string, number>>({})
  const [editingMatchKey, setEditingMatchKey] = useState<string | null>(null)
  const [editingMatchDraft, setEditingMatchDraft] = useState<string>("")
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [submitQrCodeUrl, setSubmitQrCodeUrl] = useState<string | null>(null)
  const [submitPayloadJson, setSubmitPayloadJson] = useState<string>("{}")
  const [scouterName, setScouterName] = useState<string>("")
  const [controlMode, setControlMode] = useState<ControlMode>("auto")
  const [autoTimerStartedAtMs, setAutoTimerStartedAtMs] = useState<number | null>(null)
  const [autoTimerRemainingMs, setAutoTimerRemainingMs] = useState<number>(AUTO_TIMER_DURATION_MS)
  const [teamValue, setTeamValue] = useState<string>(TEAM_DEFAULT_VALUE)
  const [eventScheduleMatches, setEventScheduleMatches] = useState<TbaSimpleMatch[]>([])
  const isPreviewMode = true
  const { setHeaderActions } = useHeaderActions()

  useEffect(() => {
    const storedScouterName = localStorage.getItem("scouterName")
    setScouterName(storedScouterName?.trim() ?? "")

    const storedBackgroundImage = localStorage.getItem("backgroundImage")
    setBackgroundImage(storedBackgroundImage || null)

    const storedEventSchedule = localStorage.getItem("eventSchedule")
    if (!storedEventSchedule) {
      setEventScheduleMatches([])
    } else {
      try {
        const parsedSchedule = JSON.parse(storedEventSchedule) as unknown
        setEventScheduleMatches(normalizeEventScheduleMatches(parsedSchedule))
      } catch {
        setEventScheduleMatches([])
      }
    }

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

  const isSwapMirrored = useMemo(() => isSwapped, [isSwapped])

  const coverAssets = useMemo(
    () => displayedAssets.filter((asset): asset is CoverAsset => asset.type === "cover"),
    [displayedAssets]
  )

  const primaryMatchSelectAsset = useMemo(
    () => scoutAssets.find((asset): asset is MatchSelectAsset => asset.type === "match-select") ?? null,
    [scoutAssets]
  )

  const selectedMatchNumber = useMemo(() => {
    if (!primaryMatchSelectAsset) return null

    const liveValue = matchValuesByKey[primaryMatchSelectAsset.id]
    if (typeof liveValue === "number" && Number.isInteger(liveValue) && liveValue >= 0) {
      return liveValue
    }

    return toNonNegativeWholeNumber(primaryMatchSelectAsset.valueText)
  }, [matchValuesByKey, primaryMatchSelectAsset])

  const selectedScheduleMatch = useMemo(() => {
    if (selectedMatchNumber === null) return null

    const sameNumberMatches = eventScheduleMatches.filter(
      (match) => match.matchNumber === selectedMatchNumber
    )

    if (sameNumberMatches.length === 0) return null
    return sameNumberMatches.find((match) => match.compLevel === "qm") ?? sameNumberMatches[0]
  }, [eventScheduleMatches, selectedMatchNumber])

  const teamSelectOptions = useMemo<TeamSelectOption[]>(() => {
    if (!selectedScheduleMatch) return []

    const blueOptions = selectedScheduleMatch.blueTeamKeys.map((teamKey, index) => {
      const teamNumber = teamKeyToTeamNumber(teamKey)
      return {
        value: teamNumber,
        label: `B${index + 1}: ${teamNumber}`,
        colorClassName: "text-sky-300",
      } satisfies TeamSelectOption
    })

    const redOptions = selectedScheduleMatch.redTeamKeys.map((teamKey, index) => {
      const teamNumber = teamKeyToTeamNumber(teamKey)
      return {
        value: teamNumber,
        label: `R${index + 1}: ${teamNumber}`,
        colorClassName: "text-red-300",
      } satisfies TeamSelectOption
    })

    return [...blueOptions, ...redOptions]
  }, [selectedScheduleMatch])

  useEffect(() => {
    if (!teamValue) return

    if (!teamSelectOptions.some((option) => option.value === teamValue)) {
      setTeamValue(TEAM_DEFAULT_VALUE)
    }
  }, [TEAM_DEFAULT_VALUE, teamSelectOptions, teamValue])

  const buttonAssets = useMemo(
    () =>
      displayedAssets.filter(
        (asset): asset is ButtonAsset | IconButtonAsset | InputAsset | AutoToggleAsset | ToggleSwitchAsset | MatchSelectAsset | LogAsset =>
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

  useEffect(() => {
    const initialMatchValues = scoutAssets
      .filter((asset): asset is MatchSelectAsset => asset.type === "match-select")
      .reduce<Record<string, number>>((accumulator, asset) => {
        const matchKey = asset.id
        accumulator[matchKey] = toNonNegativeWholeNumber(asset.valueText) ?? 1
        return accumulator
      }, {})

    setMatchValuesByKey(initialMatchValues)
    setEditingMatchKey(null)
    setEditingMatchDraft("")
  }, [scoutAssets])

  const startEditingMatchValue = useCallback((matchKey: string, currentValue: number) => {
    setEditingMatchKey(matchKey)
    setEditingMatchDraft(String(currentValue))
  }, [])

  const commitEditingMatchValue = useCallback(
    (matchKey: string) => {
      const parsed = toNonNegativeWholeNumber(editingMatchDraft)

      if (parsed !== null) {
        setMatchValuesByKey((previous) => ({
          ...previous,
          [matchKey]: parsed,
        }))
      }

      setEditingMatchKey((previous) => (previous === matchKey ? null : previous))
      setEditingMatchDraft("")
    },
    [editingMatchDraft]
  )

  const cancelEditingMatchValue = useCallback((matchKey: string) => {
    setEditingMatchKey((previous) => (previous === matchKey ? null : previous))
    setEditingMatchDraft("")
  }, [])

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
      if (nextValue === "teleop") {
        setTeleopMode()
        return
      }

      if (nextValue === "auto") {
        // Selecting Auto explicitly should switch modes without re-starting the timer.
        setAutoMode(false)
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

  const pushTagToStack = useCallback((tag?: string, increment = 1) => {
    if (!tag || tag.trim().length === 0) return
    const repeatCount = Math.max(0, Math.floor(increment))
    if (repeatCount === 0) return

    const prefixedTag = toModePrefixedTag(tag, controlMode)

    setTagStack((previous) => [
      ...previous,
      ...Array.from({ length: repeatCount }, () => prefixedTag),
    ])
    setTagStackActions((previous) => [
      ...previous,
      {
        tag: prefixedTag,
        count: repeatCount,
      },
    ])
    setRedoTagStack([])
    setRedoTagStackActions([])
  }, [controlMode])

  const handleUndo = useCallback(() => {
    const lastAction = tagStackActions[tagStackActions.length - 1]
    if (!lastAction) return

    setTagStack((previous) => previous.slice(0, Math.max(0, previous.length - lastAction.count)))
    setTagStackActions((previous) => previous.slice(0, -1))
    setRedoTagStack((previous) => [
      ...previous,
      ...Array.from({ length: lastAction.count }, () => lastAction.tag),
    ])
    setRedoTagStackActions((previous) => [...previous, lastAction])
  }, [tagStackActions])

  const handleRedo = useCallback(() => {
    const lastRedoAction = redoTagStackActions[redoTagStackActions.length - 1]
    if (!lastRedoAction) return

    setRedoTagStack((previous) => previous.slice(0, Math.max(0, previous.length - lastRedoAction.count)))
    setRedoTagStackActions((previous) => previous.slice(0, -1))
    setTagStack((previous) => [
      ...previous,
      ...Array.from({ length: lastRedoAction.count }, () => lastRedoAction.tag),
    ])
    setTagStackActions((previous) => [...previous, lastRedoAction])
  }, [redoTagStackActions])

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
          .filter((tag) => tag !== TEAM_SELECT_TAG)
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

    output.match = selectedMatchNumber ?? 0
    output.team = teamValue
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
  }, [
    TEAM_SELECT_TAG,
    inputValuesByKey,
    scoutAssets,
    scouterName,
    selectedMatchNumber,
    tagStack,
    teamValue,
    toggleValuesByKey,
  ])

  useEffect(() => {
    console.log("[ScoutPage] tagStack:", tagStack)
    console.log("[ScoutPage] redoTagStack:", redoTagStack)
    console.log("[ScoutPage] tagStackActions:", tagStackActions)
    console.log("[ScoutPage] redoTagStackActions:", redoTagStackActions)
  }, [redoTagStack, redoTagStackActions, tagStack, tagStackActions])

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
        "relative overflow-hidden border border-white/10 bg-slate-950",
        isFullscreen
          ? "h-[100dvh] w-full rounded-none border-0"
          : "min-h-[calc(100vh-3.5rem)] rounded-xl"
      )}
      style={
        backgroundImage
          ? {
              backgroundColor: "#030919",
              backgroundImage: `url("${backgroundImage}")`,
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : { backgroundColor: "#030919" }
      }
    >
      <div
        className={cn(
          "relative",
          isFullscreen ? "h-[100dvh]" : "min-h-[calc(100vh-3.5rem)]"
        )}
      >
        {isFallbackFullscreen ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-white/15 bg-slate-900/90 px-3 py-1 text-xs text-white/80 shadow-sm">
            App fullscreen mode (native fullscreen is not available on this browser)
          </div>
        ) : null}

        {coverAssets.map((asset, index) => {
          const commonStyle = getAssetStyle(asset, true)

          return (
            <div
              key={asset.id ?? `cover-${index}`}
              className="absolute rounded-md border border-white/10 bg-slate-900 transition-all duration-150 ease-out"
              style={commonStyle}
            />
          )
        })}
        {buttonAssets.map((asset, index) => {
          const baseStyle = getAssetStyle(asset, false)
          const sizedStyle = getAssetStyle(asset, true)

          if (asset.type === "icon-button") {
            const Icon = getLucideIcon(asset.iconName)
            const hasStageBadge = Boolean(asset.stageParentTag)

            return (
              <Button
                key={asset.id ?? `icon-button-${index}`}
                type="button"
                variant="outline"
                className="absolute rounded-lg border border-white/20 bg-slate-900 p-0 text-white hover:bg-slate-900 active:scale-[0.97] active:ring-2 active:ring-sky-300/70"
                style={sizedStyle}
                onClick={() => pushTagToStack(asset.tag, asset.increment ?? 1)}
              >
                <Icon
                  className="h-5 w-5"
                  style={{
                    stroke: asset.outlineColor ?? "currentColor",
                    fill: asset.fillColor ?? "none",
                  }}
                />
                {hasStageBadge ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                    <LucideIcons.ChevronDown className="h-3 w-3" />
                  </span>
                ) : null}
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
                className="absolute flex h-full flex-col gap-2 transition-all duration-150 ease-out"
                style={sizedStyle}
              >
                {asset.label ? <FieldLabel className="text-xs text-white/80">{asset.label}</FieldLabel> : null}
                <Input
                  value={inputValuesByKey[inputStateKey] ?? ""}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const nextValue = event.target.value
                    setInputValuesByKey((previous) => ({
                      ...previous,
                      [inputStateKey]: nextValue,
                    }))
                  }}
                  placeholder={asset.placeholder}
                  aria-label={asset.label ?? "Input"}
                  className="h-full border-white/15 bg-slate-900/90 text-white placeholder:text-white/50"
                />
              </Field>
            )
          }

          if (asset.type === "auto-toggle") {
            const orderedModes: readonly ControlMode[] = isSwapMirrored
              ? ["teleop", "auto"]
              : ["auto", "teleop"]

            return (
              <ToggleGroup
                key={asset.id ?? `auto-toggle-${index}`}
                type="single"
                value={controlMode}
                onValueChange={handleAutoToggleGroupChange}
                className="absolute grid h-full w-full grid-cols-2 gap-1 rounded-md border border-white/20 bg-slate-900/90 p-1 transition-all duration-150 ease-out"
                style={sizedStyle}
              >
                {orderedModes.map((mode) => (
                  <ToggleGroupItem
                    key={`${asset.id ?? `auto-toggle-${index}`}-${mode}`}
                    value={mode}
                    className="h-full rounded-sm border border-transparent text-[11px] text-white/85 data-[state=on]:border-2 data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
                  >
                    {mode === "auto" ? autoTimerLabel : "Teleop"}
                  </ToggleGroupItem>
                ))}
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
            const textAlign = asset.textAlign ?? "center"
            const textClass =
              textAlign === "left"
                ? "text-left"
                : textAlign === "right"
                  ? "text-right"
                  : "text-center"
            const textSize = asset.textSize ?? 10
            const fieldBoundsWidth = measuredFieldBounds?.width ?? containerSize.width
            const fieldBoundsHeight = measuredFieldBounds?.height ?? containerSize.height
            const togglePixelWidth = fieldBoundsWidth * (asset.width / 100)
            const togglePixelHeight = fieldBoundsHeight * (asset.height / 100)
            const switchScale = Math.max(
              0.35,
              Math.min(
                3.5,
                Math.min(togglePixelWidth / TOGGLE_SIZE.width, togglePixelHeight / TOGGLE_SIZE.height)
              )
            )
            const switchPixelWidth = 32 * switchScale
            const switchPixelHeight = 18 * switchScale
            const resolvedTextSize = Math.max(6, textSize * switchScale)
            const toggleGap = Math.max(2, Math.round(8 * switchScale))

            return (
              <div
                key={asset.id ?? `toggle-switch-${index}`}
                className="absolute flex items-center justify-center"
                style={sizedStyle}
              >
                <div
                  className="flex h-full w-full items-center overflow-visible"
                  style={{
                    gap: toggleGap,
                    transform: isSwapMirrored ? "scaleX(-1)" : undefined,
                    transformOrigin: "center center",
                  }}
                >
                  <div
                    className="flex flex-none items-center justify-center"
                    style={{
                      width: switchPixelWidth,
                      height: switchPixelHeight,
                      transform: isSwapMirrored
                        ? `scaleX(-1) scale(${switchScale})`
                        : `scale(${switchScale})`,
                      transformOrigin: "center center",
                    }}
                  >
                    <Switch
                      id={toggleId}
                      checked={isChecked}
                      disabled={!isPreviewMode}
                      onCheckedChange={(checked: boolean) => {
                        if (!isPreviewMode) return

                        setToggleValuesByKey((previous) => ({
                          ...previous,
                          [toggleKey]: checked,
                        }))
                      }}
                    />
                  </div>
                  {asset.label ? (
                    <Label
                      htmlFor={toggleId}
                      className={`shrink-0 whitespace-nowrap leading-none text-white/80 ${textClass}`}
                      style={{
                        fontSize: resolvedTextSize,
                        transform: isSwapMirrored ? "scaleX(-1)" : undefined,
                        transformOrigin: "center center",
                      }}
                    >
                      {asset.label}
                    </Label>
                  ) : null}
                </div>
              </div>
            )
          }

          if (asset.type === "log") {
            const fieldBoundsWidth = measuredFieldBounds?.width ?? containerSize.width
            const fieldBoundsHeight = measuredFieldBounds?.height ?? containerSize.height
            const logPixelWidth = fieldBoundsWidth * (asset.width / 100)
            const logPixelHeight = fieldBoundsHeight * (asset.height / 100)
            const logScale = Math.max(
              0.45,
              Math.min(3.5, Math.min(logPixelWidth / LOG_SIZE.width, logPixelHeight / LOG_SIZE.height))
            )
            const resolvedLogFontSize = Math.max(8, 11 * logScale)
            const logLineHeightMultiplier = 1.35
            const estimatedAvailableHeight = Math.max(0, logPixelHeight - 36)
            const visibleLineCount = Math.max(
              1,
              Math.floor(estimatedAvailableHeight / (resolvedLogFontSize * logLineHeightMultiplier))
            )
            const tagCounts = new Map<string, number>()
            const orderedTagsByMostRecent: string[] = []

            for (let index = tagStack.length - 1; index >= 0; index -= 1) {
              const stackTag = tagStack[index]
              const previousCount = tagCounts.get(stackTag) ?? 0
              tagCounts.set(stackTag, previousCount + 1)

              if (previousCount === 0) {
                orderedTagsByMostRecent.push(stackTag)
              }
            }

            const visibleLogEntries = orderedTagsByMostRecent
              .slice(0, visibleLineCount)
              .map((stackTag) => `${stackTag}: ${tagCounts.get(stackTag) ?? 0}`)

            return (
              <div
                key={asset.id ?? `log-${index}`}
                className="absolute overflow-hidden rounded-md border border-white/15 bg-slate-900/90 p-2 transition-all duration-150 ease-out"
                style={sizedStyle}
              >
                <div
                  className="h-full overflow-auto rounded border border-white/10 bg-slate-950/90 p-2 text-white/80"
                  style={{
                    fontSize: `${resolvedLogFontSize}px`,
                    lineHeight: logLineHeightMultiplier,
                  }}
                >
                  <pre className="whitespace-pre-wrap break-words font-sans">
                    {visibleLogEntries.length > 0
                      ? visibleLogEntries.join("\n")
                      : "No tags logged yet."}
                  </pre>
                </div>
              </div>
            )
          }

          if (asset.type === "match-select") {
            const matchKey = asset.id
            const currentMatchValue = matchValuesByKey[matchKey] ?? toNonNegativeWholeNumber(asset.valueText) ?? 1
            const isEditingThisMatch = editingMatchKey === matchKey

            return (
              <div
                key={asset.id ?? `match-select-${index}`}
                className="absolute"
                style={sizedStyle}
              >
                <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 px-1 text-center text-[11px] font-semibold text-white/85">
                  {asset.label ?? "Match Select"}
                </div>
                <div className="grid h-full min-h-0 grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-full w-full rounded-md border-white/20 bg-slate-800/40 text-sm font-semibold text-white/70 opacity-100"
                    onClick={() => {
                      setMatchValuesByKey((previous) => ({
                        ...previous,
                        [matchKey]: Math.max(0, currentMatchValue - 1),
                      }))
                    }}
                  >
                    {asset.decrementText ?? "-"}
                  </Button>
                  {isEditingThisMatch ? (
                    <Input
                      value={editingMatchDraft}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        const nextValue = event.target.value
                        if (!/^\d*$/.test(nextValue)) return
                        setEditingMatchDraft(nextValue)
                      }}
                      onBlur={() => commitEditingMatchValue(matchKey)}
                      onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          commitEditingMatchValue(matchKey)
                          return
                        }

                        if (event.key === "Escape") {
                          event.preventDefault()
                          cancelEditingMatchValue(matchKey)
                        }
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                      className="h-full w-full rounded-md border-white/30 bg-slate-950 text-center text-base font-bold text-white"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-full w-full rounded-md border-white/30 bg-slate-950 text-base font-bold text-white opacity-100"
                      onClick={() => startEditingMatchValue(matchKey, currentMatchValue)}
                    >
                      {String(currentMatchValue)}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-full w-full rounded-md border-white/20 bg-slate-800/40 text-sm font-semibold text-white/70 opacity-100"
                    onClick={() => {
                      setMatchValuesByKey((previous) => ({
                        ...previous,
                        [matchKey]: currentMatchValue + 1,
                      }))
                    }}
                  >
                    {asset.incrementText ?? "+"}
                  </Button>
                </div>
              </div>
            )
          }

          if (asset.tag === TEAM_SELECT_TAG) {
            return (
              <div
                key={asset.id ?? `team-select-${index}`}
                className="absolute"
                style={sizedStyle}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant={asset.buttonKind === "submit" ? "default" : "outline"}
                      className="h-full w-full"
                    >
                      {teamValue.trim().length > 0 ? teamValue : "Select Team"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <RadioGroup value={teamValue} onValueChange={setTeamValue}>
                      {teamSelectOptions.map((option, optionIndex) => (
                        <label
                          key={`team-option-${option.value}-${optionIndex}`}
                          className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
                        >
                          <RadioGroupItem value={option.value} id={`team-option-${optionIndex}`} />
                          <span className={`text-sm font-medium ${option.colorClassName}`}>{option.label}</span>
                        </label>
                      ))}
                      {teamSelectOptions.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No teams found for this match.
                        </div>
                      ) : null}
                    </RadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          }

          const hasStageBadge = Boolean(asset.stageParentTag)
          const isSwapButton = asset.buttonKind === "swap"
          const isSubmitButton = asset.buttonKind === "submit"
          const isResetButton = asset.buttonKind === "reset"
          const swapBorderClass = isSwapButton
            ? isSwapped
              ? "!border-2 !border-blue-400"
              : "!border-2 !border-red-400"
            : "border-white/20"
          const buttonToneClass = isSubmitButton
            ? "!bg-white !text-black hover:!bg-white/90"
            : isResetButton
              ? "!bg-[#9e4042] !text-white hover:!bg-[#9e4042]/90"
              : "!bg-slate-900 !text-white hover:!bg-slate-900"

          return (
            <Button
              key={asset.id ?? `button-${index}`}
              type="button"
              variant="outline"
              className={cn(
                "group absolute rounded-lg",
                swapBorderClass,
                buttonToneClass,
                "transition-all duration-150 ease-out active:scale-[0.97] active:ring-2 active:ring-sky-300/70"
              )}
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
                  pushTagToStack(asset.tag, asset.increment ?? 1)
                }

                if (asset.buttonKind === "submit") {
                  handleSubmit()
                }

                if (asset.buttonKind === "reset") {
                  setTagStack([])
                  setRedoTagStack([])
                  setTagStackActions([])
                  setRedoTagStackActions([])
                  setInputValuesByKey({})
                  setTeamValue(TEAM_DEFAULT_VALUE)
                  setEditingMatchKey(null)
                  setEditingMatchDraft("")
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
                <span className="inline-flex items-center gap-1.5">
                  <LucideIcons.Undo2 className="h-4 w-4" />
                  <span>Undo</span>
                </span>
              ) : asset.buttonKind === "redo" ? (
                <span className="inline-flex items-center gap-1.5">
                  <LucideIcons.Redo2 className="h-4 w-4" />
                  <span>Redo</span>
                </span>
              ) : (
                asset.text ?? "Button"
              )}
              {hasStageBadge ? (
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                  <LucideIcons.ChevronDown className="h-3 w-3" />
                </span>
              ) : null}
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
