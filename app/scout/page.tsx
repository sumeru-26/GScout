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
import { useSidebar } from "@/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

type ButtonAsset = {
  id: string
  type: "button"
  buttonKind: "button" | "swap" | "undo" | "redo" | "submit" | "reset"
  tag?: string
  teamSelectRootTag?: string
  teamSelectLinkEachTeamToStage?: boolean
  teamSelectAddGeneralComments?: boolean
  teamSelectShowStageWithoutSelection?: boolean
  teamSelectDefaultTab?: TeamStageTab
  autoTeleopScope?: "auto" | "teleop"
  increment?: number
  buttonPressMode?: "tap" | "hold"
  successTrackingEnabled?: boolean
  successPopoverOffsetX?: number
  successPopoverOffsetY?: number
  stageParentId?: string
  stageParentTag?: string
  stageHideAfterSelection?: boolean
  stageBlurBackgroundOnClick?: boolean
  stageHideOtherElementsInStage?: boolean
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
  autoTeleopScope?: "auto" | "teleop"
  increment?: number
  buttonPressMode?: "tap" | "hold"
  successTrackingEnabled?: boolean
  successPopoverOffsetX?: number
  successPopoverOffsetY?: number
  stageParentId?: string
  stageParentTag?: string
  stageHideAfterSelection?: boolean
  stageBlurBackgroundOnClick?: boolean
  stageHideOtherElementsInStage?: boolean
  x: number
  y: number
  width: number
  height: number
  iconName: string
  outlineColor?: string
  fillColor?: string
}

type ButtonSliderAsset = {
  id: string
  type: "button-slider"
  tag?: string
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  iconName?: string
  outlineColor?: string
  fillColor?: string
  increaseDirection: "left" | "right"
  buttonSliderDisplayMode?: "label" | "icon"
}

type SliderAsset = {
  id: string
  type: "slider"
  tag?: string
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  sliderMax?: number
  sliderMid?: number
  sliderLeftText?: string
  sliderRightText?: string
}

type CoverAsset = {
  id: string
  type: "cover"
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
}

type InputAsset = {
  id: string
  type: "input"
  tag?: string
  teamStageScope?: TeamStageScope
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  placeholder?: string
  label?: string
  multiline?: boolean
}

type AutoToggleAsset = {
  id: string
  type: "auto-toggle"
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  mode?: "auto" | "teleop"
  durationSeconds?: number
  teleopDurationSeconds?: number
}

type ToggleSwitchAsset = {
  id: string
  type: "toggle-switch"
  tag?: string
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  value: boolean
  toggleStyle?: "switch" | "box"
  textAlign?: "left" | "center" | "right"
  textSize?: number
}

type MatchSelectAsset = {
  id: string
  type: "match-select"
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
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
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
}

type StartPositionAsset = {
  id: string
  type: "start-position"
  tag?: string
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  startPositionVisible: boolean
}

type MovementAsset = {
  id: string
  type: "movement"
  tag?: string
  autoTeleopScope?: "auto" | "teleop"
  stageParentId?: string
  stageParentTag?: string
  stageHideAfterSelection?: boolean
  stageBlurBackgroundOnClick?: boolean
  stageHideOtherElementsInStage?: boolean
  x: number
  y: number
  width: number
  height: number
  label?: string
  movementDirection: "left" | "right"
}

type RuntimeActionEvent = {
  type: string
  atMs: number
  assetId?: string
  key?: string
  value?: string | number | boolean
  valueDelta?: number
  durationMs?: number
  zone?: string
  action?: "entered" | "exited" | "crossed"
  xRatio?: number
  yRatio?: number
}

type HoldSegment = {
  startMs: number
  endMs: number
  durationMs: number
}

type HoldStats = {
  assetId: string
  mode: "hold"
  totalMs: number
  pressCount: number
  segments: HoldSegment[]
}

type TbaSimpleMatch = {
  key: string
  compLevel: string
  matchNumber: number
  blueTeamKeys: string[]
  redTeamKeys: string[]
}

type TbaEventTeamInfo = {
  teamNumber: string
  displayName: string
}

type PitQuestionType = "text" | "slider" | "all-that-apply" | "single-select"

type PitQuestion = {
  id: string
  text: string
  type: PitQuestionType
  options: string[]
  sliderMin: number
  sliderMax: number
  sliderLeftText: string
  sliderRightText: string
}

type PitAnswerValue = string | number | number[] | null

type TeamSelectOption = {
  value: TeamStageTab
  label: string
  colorClassName: string
}

type TeamStageBaseTab = "b1" | "b2" | "b3" | "r1" | "r2" | "r3"
type TeamStageTab = TeamStageBaseTab | "general"
type TeamStageScope = "teams" | "general"

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

type FieldMapping = {
  mapping: Record<string, string>
  meta?: number[]
  text?: number[]
  success?: number[]
}

type FieldAspectRatio = {
  width: number
  height: number
}

type ButtonSliderDragInfo = {
  startX: number
  currentX: number
  signedDistance: number
  buttonLeft: number
  buttonWidth: number
}

type ScoutAsset =
  | ButtonAsset
  | IconButtonAsset
  | ButtonSliderAsset
  | SliderAsset
  | CoverAsset
  | InputAsset
  | AutoToggleAsset
  | ToggleSwitchAsset
  | MatchSelectAsset
  | StartPositionAsset
  | MovementAsset
  | LogAsset

type ControlMode = "auto" | "teleop"

const AUTO_TIMER_DURATION_MS = 25_000
const TEAM_STAGE_BASE_TABS: readonly TeamStageBaseTab[] = ["b1", "b2", "b3", "r1", "r2", "r3"]
const TOGGLE_SIZE = { width: 52, height: 28 } as const
const LOG_SIZE = { width: 280, height: 120 } as const
const BUTTON_SLIDER_DRAG_DEADZONE_PX = 6
const BUTTON_SLIDER_MIN_SPEED_PER_SECOND = 0.7
const BUTTON_SLIDER_MAX_SPEED_PER_SECOND = 24
const BUTTON_SLIDER_DISTANCE_TO_MAX_SPEED_PX = 880
const BUTTON_SLIDER_SPEED_CURVE_EXPONENT = 1.6
const BUTTON_SLIDER_SPEED_SMOOTHING = 0.18

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

function toXScaleFromRatio(ratio: number) {
  return clampPositionScale(ratio * 200 - 100)
}

function toYScaleFromRatio(ratio: number) {
  return clampPositionScale(100 - ratio * 200)
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
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return normalized === "input" || normalized === "text-input" || normalized === "textinput" || normalized === "text_input"
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

function normalizeToggleStyle(value: unknown): "switch" | "box" {
  return value === "box" ? "box" : "switch"
}

function normalizeStartPositionKind(value: unknown): value is "start-position" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return (
    normalized === "start-position" ||
    normalized === "startposition" ||
    normalized === "start_position"
  )
}

function normalizeMovementKind(value: unknown): value is "movement" {
  return typeof value === "string" && value.toLowerCase() === "movement"
}

function normalizePressMode(value: unknown): "tap" | "hold" {
  return value === "hold" ? "hold" : "tap"
}

function normalizeMovementDirection(value: unknown): "left" | "right" {
  if (typeof value !== "string") return "left"
  return value.trim().toLowerCase() === "right" ? "right" : "left"
}

function parseScoutFormTypeCode(value: unknown): 0 | 1 | 2 {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value)
    if (rounded === 1 || rounded === 2) return rounded
    return 0
  }

  if (typeof value !== "string") return 0
  const normalized = value.trim().toLowerCase()

  if (normalized === "qualitative" || normalized === "qual") return 1
  if (normalized === "pit") return 2
  return 0
}

function normalizePitQuestionType(value: unknown): PitQuestionType {
  if (typeof value !== "string") return "text"

  const normalized = value.trim().toLowerCase()
  if (normalized === "slider") return "slider"
  if (normalized === "all-that-apply" || normalized === "allthatapply" || normalized === "multi-select") {
    return "all-that-apply"
  }
  if (normalized === "single-select" || normalized === "singleselect" || normalized === "multiple-choice") {
    return "single-select"
  }

  return "text"
}

function normalizePitQuestions(payload: unknown): PitQuestion[] {
  if (!payload || typeof payload !== "object") return []

  const source = payload as {
    postMatchQuestions?: unknown
    editorState?: {
      postMatchQuestions?: unknown
    }
  }

  const rawQuestions =
    Array.isArray(source.editorState?.postMatchQuestions)
      ? source.editorState.postMatchQuestions
      : Array.isArray(source.postMatchQuestions)
        ? source.postMatchQuestions
        : []

  return rawQuestions
    .filter((question): question is Record<string, unknown> => Boolean(question && typeof question === "object"))
    .map((question, index) => {
      const sliderMin =
        toFiniteNumber(question.sliderMin) ??
        toFiniteNumber(question.slider_min) ??
        0
      const sliderMaxCandidate =
        toFiniteNumber(question.sliderMax) ??
        toFiniteNumber(question.slider_max) ??
        10
      const sliderMax = sliderMaxCandidate > sliderMin ? sliderMaxCandidate : sliderMin + 1

      const options = Array.isArray(question.options)
        ? question.options
            .filter((option): option is string => typeof option === "string")
            .map((option) => option.trim())
            .filter((option) => option.length > 0)
        : []

      return {
        id:
          typeof question.id === "string" && question.id.trim().length > 0
            ? question.id.trim()
            : `pit-question-${index + 1}`,
        text:
          typeof question.text === "string" && question.text.trim().length > 0
            ? question.text.trim()
            : `Question ${index + 1}`,
        type: normalizePitQuestionType(question.type),
        options,
        sliderMin,
        sliderMax,
        sliderLeftText:
          typeof question.sliderLeftText === "string" && question.sliderLeftText.trim().length > 0
            ? question.sliderLeftText.trim()
            : "Low",
        sliderRightText:
          typeof question.sliderRightText === "string" && question.sliderRightText.trim().length > 0
            ? question.sliderRightText.trim()
            : "High",
      } satisfies PitQuestion
    })
}

function getDefaultPitAnswer(question: PitQuestion): PitAnswerValue {
  if (question.type === "slider") return Math.round(question.sliderMin)
  if (question.type === "all-that-apply") return []
  if (question.type === "single-select") return null
  return ""
}

function encodePitRawText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/=/g, "\\=")
    .replace(/;/g, "\\;")
}

function encodePitQuestionAnswer(question: PitQuestion, answer: PitAnswerValue): string {
  if (question.type === "slider") {
    const rawSlider = typeof answer === "number" && Number.isFinite(answer) ? answer : question.sliderMin
    const sliderValue = Math.round(Math.max(question.sliderMin, Math.min(question.sliderMax, rawSlider)))
    return `s:${sliderValue}`
  }

  if (question.type === "all-that-apply") {
    const selectedIndexes = Array.isArray(answer)
      ? answer
          .filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry))
          .filter((entry) => entry >= 0 && entry < question.options.length)
      : []

    return `m:${selectedIndexes.join(",")}`
  }

  if (question.type === "single-select") {
    const selectedIndex =
      typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < question.options.length
        ? answer
        : -1
    return `o:${selectedIndex}`
  }

  const textValue = typeof answer === "string" ? answer : ""
  return `t:${encodePitRawText(textValue)}`
}

function normalizeIncreaseDirection(value: unknown): "left" | "right" {
  if (typeof value !== "string") return "right"
  return value.trim().toLowerCase() === "left" ? "left" : "right"
}

function normalizeAutoTeleopScope(value: unknown): "auto" | "teleop" | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === "auto" || normalized === "teleop") return normalized
  return undefined
}

function parseStageParentId(item: Record<string, unknown>): string | undefined {
  if (typeof item.stageParentId === "string" && item.stageParentId.trim().length > 0) {
    return item.stageParentId.trim()
  }

  return undefined
}

function parseStageParentTag(item: Record<string, unknown>): string | undefined {
  if (typeof item.stageParentTag === "string" && item.stageParentTag.trim().length > 0) {
    return item.stageParentTag.trim()
  }

  return undefined
}

function parseStageFlag(value: unknown, fallback = false) {
  const parsed = toBoolean(value)
  return parsed ?? fallback
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

function normalizeEventTeamsByKey(source: unknown): Record<string, TbaEventTeamInfo> {
  if (!Array.isArray(source)) return {}

  return source
    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate && typeof candidate === "object"))
    .reduce<Record<string, TbaEventTeamInfo>>((accumulator, candidate) => {
      const normalizedTeamKey = normalizeTeamKey(candidate.key)
      if (!normalizedTeamKey) return accumulator

      const parsedTeamNumber =
        typeof candidate.team_number === "number" && Number.isFinite(candidate.team_number)
          ? String(Math.round(candidate.team_number))
          : teamKeyToTeamNumber(normalizedTeamKey)

      const nickname =
        typeof candidate.nickname === "string" && candidate.nickname.trim().length > 0
          ? candidate.nickname.trim()
          : null

      const fullName =
        typeof candidate.name === "string" && candidate.name.trim().length > 0
          ? candidate.name.trim()
          : null

      accumulator[normalizedTeamKey] = {
        teamNumber: parsedTeamNumber,
        displayName: nickname ?? fullName ?? parsedTeamNumber,
      }

      return accumulator
    }, {})
}

function normalizeMatchSelectKind(value: unknown): value is "match-select" {
  if (typeof value !== "string") return false

  const normalized = value.trim().toLowerCase()
  return normalized === "match-select" || normalized === "matchselect" || normalized === "match_select"
}

function normalizeTeamSelectTag(value: unknown): value is "team-select" {
  return typeof value === "string" && value.trim().toLowerCase() === "team-select"
}

function normalizeTeamStageTab(value: unknown): TeamStageTab | undefined {
  if (typeof value !== "string") return undefined

  const normalized = value.trim().toLowerCase()
  if (normalized === "b1" || normalized === "b2" || normalized === "b3") return normalized
  if (normalized === "r1" || normalized === "r2" || normalized === "r3") return normalized
  if (normalized === "general") return "general"

  return undefined
}

function getTeamStageTabs(addGeneralComments: boolean): TeamStageTab[] {
  return addGeneralComments ? [...TEAM_STAGE_BASE_TABS, "general"] : [...TEAM_STAGE_BASE_TABS]
}

function normalizeTeamStageScope(value: unknown): TeamStageScope | undefined {
  if (typeof value !== "string") return undefined

  const normalized = value.trim().toLowerCase()
  if (normalized === "general") return "general"
  if (normalized === "teams") return "teams"
  return undefined
}

function stripTeamStageSuffix(tag: string) {
  return tag.trim().replace(/-(b[1-3]|r[1-3]|general)$/i, "")
}

function getTeamStageTagSuffix(tag: string): TeamStageTab | undefined {
  const match = /-(b[1-3]|r[1-3]|general)$/i.exec(tag.trim())
  if (!match) return undefined

  return normalizeTeamStageTab(match[1])
}

function getTeamStageScopedKey(baseKey: string, teamSelectRootId: string, selectedTab: TeamStageTab) {
  return `${baseKey}::${teamSelectRootId}::${selectedTab}`
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

function normalizeCompactPayloadItems(payloadEntries: unknown[]): Record<string, unknown>[] {
  return payloadEntries.reduce<Record<string, unknown>[]>((accumulator, entry, index) => {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return accumulator

      const sourceEntry = entry as Record<string, unknown>
      const keys = Object.keys(sourceEntry)
      if (keys.length !== 1) return accumulator

      const sourceKind = keys[0]
      const sourceValue = sourceEntry[sourceKind]
      if (!sourceValue || typeof sourceValue !== "object" || Array.isArray(sourceValue)) return accumulator

      const source = sourceValue as Record<string, unknown>
      const left = toFiniteNumber(source.x1)
      const right = toFiniteNumber(source.x2)
      const top = toFiniteNumber(source.y1)
      const bottom = toFiniteNumber(source.y2)
      const hasBounds = left !== null && right !== null && top !== null && bottom !== null

      const normalizedKind = sourceKind.trim().toLowerCase()
      const resolvedKind =
        normalizedKind === "mirror-line"
          ? "mirror"
          : normalizedKind === "log-view"
            ? "log"
            : normalizedKind === "icon-button"
              ? "icon"
              : normalizedKind === "toggle-switch"
                ? "toggle-switch"
                : normalizedKind === "text-input"
                  ? "input"
                  : normalizedKind

      const action =
        typeof source.action === "string" && source.action.trim().length > 0
          ? source.action.trim().toLowerCase()
          : undefined

      const x =
        toFiniteNumber(source.x) ??
        (hasBounds ? ((left as number) + (right as number)) / 2 : null)

      const y =
        toFiniteNumber(source.y) ??
        (hasBounds ? ((top as number) + (bottom as number)) / 2 : null)

      const width =
        toFiniteNumber(source.width) ??
        (hasBounds ? Math.abs((right as number) - (left as number)) : null)

      const height =
        toFiniteNumber(source.height) ??
        (hasBounds ? Math.abs((top as number) - (bottom as number)) : null)

      if (x === null || y === null || width === null || height === null) return accumulator

      const itemId =
        typeof source.id === "string" && source.id.trim().length > 0
          ? source.id.trim()
          : `${resolvedKind}-${index}`

      const normalizedItem = {
        ...source,
        id: itemId,
        kind: action ?? resolvedKind,
        type: action ?? resolvedKind,
        x,
        y,
        width,
        height,
        text:
          typeof source.text === "string"
            ? source.text
            : typeof source.label === "string"
              ? source.label
              : undefined,
        iconName:
          typeof source.icon === "string"
            ? source.icon
            : typeof source.iconName === "string"
              ? source.iconName
              : undefined,
        outlineColor:
          typeof source.outline === "string"
            ? source.outline
            : typeof source.outlineColor === "string"
              ? source.outlineColor
              : undefined,
        fillColor:
          typeof source.fill === "string"
            ? source.fill
            : typeof source.fillColor === "string"
              ? source.fillColor
              : undefined,
        coverVisible: parseStageFlag(source.visible, true),
        startX:
          normalizedKind === "mirror-line"
            ? (toFiniteNumber(source.x1) ?? toFiniteNumber(source.startX) ?? 0)
            : source.startX,
        startY:
          normalizedKind === "mirror-line"
            ? (toFiniteNumber(source.y1) ?? toFiniteNumber(source.startY) ?? 0)
            : source.startY,
        endX:
          normalizedKind === "mirror-line"
            ? (toFiniteNumber(source.x2) ?? toFiniteNumber(source.endX) ?? 0)
            : source.endX,
        endY:
          normalizedKind === "mirror-line"
            ? (toFiniteNumber(source.y2) ?? toFiniteNumber(source.endY) ?? 0)
            : source.endY,
        autoToggleDurationSeconds:
          toFiniteNumber(source.timerSeconds) ?? toFiniteNumber(source.autoToggleDurationSeconds) ?? undefined,
        autoToggleTeleopDurationSeconds:
          toFiniteNumber(source.teleopTimerSeconds) ?? toFiniteNumber(source.autoToggleTeleopDurationSeconds) ?? undefined,
        autoToggleMode:
          typeof source.mode === "string"
            ? source.mode
            : typeof source.autoToggleMode === "string"
              ? source.autoToggleMode
              : undefined,
        buttonPressMode:
          typeof source.pressMode === "string"
            ? source.pressMode
            : typeof source.buttonPressMode === "string"
              ? source.buttonPressMode
              : undefined,
        inputIsTextArea:
          typeof source.multiline === "boolean"
            ? source.multiline
            : typeof source.inputIsTextArea === "boolean"
              ? source.inputIsTextArea
              : undefined,
        stageParentTag:
          typeof source.stageParentTag === "string" && source.stageParentTag.trim().length > 0
            ? source.stageParentTag
            : undefined,
        stageHideAfterSelection:
          parseStageFlag(source.hideAfterSelection) || parseStageFlag(source.stageHideAfterSelection),
        stageBlurBackgroundOnClick:
          parseStageFlag(source.blurBackgroundOnClick) || parseStageFlag(source.stageBlurBackgroundOnClick),
        stageHideOtherElementsInStage:
          parseStageFlag(source.hideOtherElementsInStage) || parseStageFlag(source.stageHideOtherElementsInStage),
        buttonSliderIncreaseDirection:
          typeof source.increaseDirection === "string"
            ? source.increaseDirection
            : typeof source.buttonSliderIncreaseDirection === "string"
              ? source.buttonSliderIncreaseDirection
              : undefined,
        autoTeleopScope: normalizeAutoTeleopScope(source.autoTeleopScope),
        successTrackingEnabled:
          parseStageFlag(source.trackSuccess) || parseStageFlag(source.successTrackingEnabled),
        successPopoverOffsetX:
          toFiniteNumber(source.successPopoverOffsetX) ??
          toFiniteNumber(source.success_popover_offset_x) ??
          0,
        successPopoverOffsetY:
          toFiniteNumber(source.successPopoverOffsetY) ??
          toFiniteNumber(source.success_popover_offset_y) ??
          0,
      } satisfies Record<string, unknown>

      accumulator.push(normalizedItem)
      return accumulator
    }, [])
}

function getPayloadItems(payload: unknown): unknown[] {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === "object") {
    const source = payload as {
      items?: unknown
      payload?: unknown
      editorState?: {
        items?: unknown
      }
    }

    if (Array.isArray(source.editorState?.items)) {
      return source.editorState.items
    }

    if (Array.isArray(source.payload)) {
      return normalizeCompactPayloadItems(source.payload)
    }

    if (Array.isArray(source.items)) {
      return source.items
    }

    return collectNamedAssetItems(payload)
  }

  return []
}

function resolveStageParentIdsByTag(assets: ScoutAsset[]): ScoutAsset[] {
  const tagToAssetId = new Map<string, string>()

  assets.forEach((asset) => {
    if (!("tag" in asset) || typeof asset.tag !== "string") return
    const normalizedTag = asset.tag.trim().toLowerCase()
    if (!normalizedTag) return
    if (!tagToAssetId.has(normalizedTag)) {
      tagToAssetId.set(normalizedTag, asset.id)
    }

    if (
      asset.type === "button" &&
      typeof asset.teamSelectRootTag === "string" &&
      asset.teamSelectRootTag.trim().length > 0
    ) {
      const normalizedTeamSelectRootTag = asset.teamSelectRootTag.trim().toLowerCase()
      if (!tagToAssetId.has(normalizedTeamSelectRootTag)) {
        tagToAssetId.set(normalizedTeamSelectRootTag, asset.id)
      }
    }
  })

  return assets.map((asset) => {
    if (asset.stageParentId) return asset
    if (!("stageParentTag" in asset) || typeof asset.stageParentTag !== "string") return asset

    const normalizedStageTag = asset.stageParentTag.trim().toLowerCase()
    if (!normalizedStageTag) return asset

    const resolvedParentId = tagToAssetId.get(normalizedStageTag)
    if (!resolvedParentId) return asset

    return {
      ...asset,
      stageParentId: resolvedParentId,
    }
  })
}

function parseFieldMapping(value: unknown): FieldMapping | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const source = value as { mapping?: unknown; meta?: unknown; text?: unknown; success?: unknown }
  if (!source.mapping || typeof source.mapping !== "object" || Array.isArray(source.mapping)) {
    return null
  }

  const mapping = Object.entries(source.mapping as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [index, key]) => {
      if (typeof key !== "string" || !key.trim()) return accumulator
      accumulator[index] = key.trim()
      return accumulator
    },
    {}
  )

  const parseIndexArray = (candidate: unknown) => {
    if (!Array.isArray(candidate)) return undefined

    return candidate
      .map((entry) => toFiniteNumber(entry))
      .filter((entry): entry is number => typeof entry === "number")
      .map((entry) => Math.max(0, Math.round(entry)))
  }

  return {
    mapping,
    meta: parseIndexArray(source.meta),
    text: parseIndexArray(source.text),
    success: parseIndexArray(source.success),
  }
}

function applyFieldMappingToOutput(
  output: Record<string, number | string | boolean>,
  fieldMapping: FieldMapping | null
) {
  if (!fieldMapping || Object.keys(fieldMapping.mapping).length === 0) {
    return output
  }

  const keyToIndex = Object.entries(fieldMapping.mapping).reduce<Record<string, string>>(
    (accumulator, [index, mappedKey]) => {
      accumulator[mappedKey] = index
      return accumulator
    },
    {}
  )

  return Object.entries(output).reduce<Record<string, number | string | boolean>>((accumulator, [key, value]) => {
    const mappedDirectKey = keyToIndex[key]
    if (mappedDirectKey) {
      accumulator[mappedDirectKey] = value
      return accumulator
    }

    const successMatch = /^(.*)\.(success|fail|s|f)$/.exec(key)
    if (successMatch) {
      const baseKey = successMatch[1]
      const mappedBaseKey = keyToIndex[baseKey]
      if (mappedBaseKey) {
        const suffix = successMatch[2] === "success" || successMatch[2] === "s" ? "s" : "f"
        accumulator[`${mappedBaseKey}.${suffix}`] = value
        return accumulator
      }
    }

    accumulator[key] = value
    return accumulator
  }, {})
}

function parseFieldAspectRatio(payload: unknown): FieldAspectRatio | null {
  if (!payload || typeof payload !== "object") return null

  const source = payload as {
    aspectWidth?: unknown
    aspectHeight?: unknown
    editorState?: {
      aspectWidth?: unknown
      aspectHeight?: unknown
    }
  }

  const widthCandidate =
    toFiniteNumber(source.editorState?.aspectWidth) ?? toFiniteNumber(source.aspectWidth)
  const heightCandidate =
    toFiniteNumber(source.editorState?.aspectHeight) ?? toFiniteNumber(source.aspectHeight)

  if (
    typeof widthCandidate !== "number" ||
    typeof heightCandidate !== "number" ||
    widthCandidate <= 0 ||
    heightCandidate <= 0
  ) {
    return null
  }

  return {
    width: widthCandidate,
    height: heightCandidate,
  }
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

function normalizeButtonSliderKind(value: unknown): value is "button-slider" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return (
    normalized === "button-slider" ||
    normalized === "buttonslider" ||
    normalized === "button_slider"
  )
}

function normalizeSliderKind(value: unknown): value is "slider" {
  if (typeof value !== "string") return false

  const normalized = value.toLowerCase()
  return normalized === "slider"
}

function getButtonSliderSpeedPerSecond(distancePx: number) {
  const clampedDistance = Math.max(0, Math.min(BUTTON_SLIDER_DISTANCE_TO_MAX_SPEED_PX, distancePx))
  const normalizedDistance = clampedDistance / BUTTON_SLIDER_DISTANCE_TO_MAX_SPEED_PX
  const curvedDistance = Math.pow(normalizedDistance, BUTTON_SLIDER_SPEED_CURVE_EXPONENT)
  return (
    BUTTON_SLIDER_MIN_SPEED_PER_SECOND +
    (BUTTON_SLIDER_MAX_SPEED_PER_SECOND - BUTTON_SLIDER_MIN_SPEED_PER_SECOND) * curvedDistance
  )
}

function normalizeButtonSliderDisplayMode(value: unknown): "label" | "icon" | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === "label" || normalized === "text") return "label"
  if (normalized === "icon") return "icon"
  return undefined
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

  const parsedAssets = items
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
        normalizeStartPositionKind(item.type) ||
        normalizeStartPositionKind(item.kind) ||
        normalizeStartPositionKind(item.key) ||
        normalizeMovementKind(item.type) ||
        normalizeMovementKind(item.kind) ||
        normalizeMovementKind(item.key) ||
        normalizeButtonSliderKind(item.type) ||
        normalizeButtonSliderKind(item.kind) ||
        normalizeButtonSliderKind(item.key) ||
        normalizeSliderKind(item.type) ||
        normalizeSliderKind(item.kind) ||
        normalizeSliderKind(item.key) ||
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
      const isStartPosition =
        normalizeStartPositionKind(item.type) ||
        normalizeStartPositionKind(item.kind) ||
        normalizeStartPositionKind(item.key)
      const isMovement =
        normalizeMovementKind(item.type) ||
        normalizeMovementKind(item.kind) ||
        normalizeMovementKind(item.key)
      const isButtonSlider =
        normalizeButtonSliderKind(item.type) ||
        normalizeButtonSliderKind(item.kind) ||
        normalizeButtonSliderKind(item.key)
      const isSlider =
        normalizeSliderKind(item.type) ||
        normalizeSliderKind(item.kind) ||
        normalizeSliderKind(item.key)
      const isTeamSelect = isTeamSelectAsset(item)
      const isSwapButton = normalizeSwapButtonKind(item.type) || normalizeSwapButtonKind(item.kind)
      const actionButtonKind = normalizeActionButtonKind(item.type)
        ? item.type
        : normalizeActionButtonKind(item.kind)
          ? item.kind
          : normalizeActionButtonKind(item.action)
            ? item.action
          : null
      const stageParentId = parseStageParentId(item)
      const stageParentTag = parseStageParentTag(item)
      const stageHideAfterSelection = parseStageFlag(item.stageHideAfterSelection)
      const stageBlurBackgroundOnClick = parseStageFlag(item.stageBlurBackgroundOnClick)
      const stageHideOtherElementsInStage = parseStageFlag(item.stageHideOtherElementsInStage)
      const autoTeleopScope = normalizeAutoTeleopScope(item.autoTeleopScope)
      const successTrackingEnabled =
        parseStageFlag(item.trackSuccess) || parseStageFlag(item.successTrackingEnabled)
      const successPopoverOffsetX =
        toFiniteNumber(item.successPopoverOffsetX) ??
        toFiniteNumber(item.success_popover_offset_x) ??
        0
      const successPopoverOffsetY =
        toFiniteNumber(item.successPopoverOffsetY) ??
        toFiniteNumber(item.success_popover_offset_y) ??
        0
      const parsedAssetTag = parseAssetTag(item)
      const parsedTagSuffix = parsedAssetTag ? getTeamStageTagSuffix(parsedAssetTag) : undefined
      const parsedTeamStageScope =
        normalizeTeamStageScope(item.teamStageScope ?? item.team_stage_scope) ??
        (parsedTagSuffix === "general" ? "general" : undefined)
      const teamSelectRootTag = isTeamSelect ? parsedAssetTag : undefined
      const teamSelectLinkEachTeamToStage =
        parseStageFlag(item.linkEachTeamToStage) ||
        parseStageFlag(item.teamSelectLinkToStage) ||
        parseStageFlag(item.teamSelectLinkEachTeamToStage)
      const teamSelectAddGeneralComments =
        parseStageFlag(item.addGeneralComments) ||
        parseStageFlag(item.teamSelectIncludeGeneralComments)
      const teamSelectShowStageWithoutSelection =
        parseStageFlag(item.showStageWithoutSelection) ||
        parseStageFlag(item.teamSelectAlwaysShowStagedElements)
      const teamSelectDefaultTab = normalizeTeamStageTab(item.teamSelectValue ?? item.value)

      if (isCover) {
        return {
          id,
          type: "cover",
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
        } satisfies CoverAsset
      }

      if (isInput) {
        const parsedMultiline =
          parseStageFlag(item.multiline) ||
          parseStageFlag(item.inputIsTextArea) ||
          parseStageFlag(item.input_is_text_area)

        return {
          id,
          type: "input",
          tag: parsedAssetTag,
          teamStageScope: parsedTeamStageScope,
          autoTeleopScope,
          stageParentId,
          stageParentTag,
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
          multiline: parsedMultiline,
        } satisfies InputAsset
      }

      if (isAutoToggle) {
        const autoDurationSeconds =
          toNonNegativeWholeNumber(item.autoToggleDurationSeconds) ??
          toNonNegativeWholeNumber(item.durationSeconds) ??
          undefined

        const autoMode =
          typeof item.autoToggleMode === "string" && item.autoToggleMode.trim().toLowerCase() === "teleop"
            ? "teleop"
            : "auto"

        return {
          id,
          type: "auto-toggle",
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          mode: autoMode,
          durationSeconds: autoDurationSeconds,
          teleopDurationSeconds:
            toNonNegativeWholeNumber(item.autoToggleTeleopDurationSeconds) ??
            toNonNegativeWholeNumber(item.teleopTimerSeconds) ??
            undefined,
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

        const toggleStyle = normalizeToggleStyle(item.style ?? item.toggleStyle)

        return {
          id,
          type: "toggle-switch",
          tag: parsedAssetTag,
          autoTeleopScope,
          stageParentId,
          stageParentTag,
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
          value: toBoolean(item.value) ?? toBoolean(item.toggleOn) ?? false,
          toggleStyle,
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
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
        } satisfies LogAsset
      }

      if (isStartPosition) {
        return {
          id,
          type: "start-position",
          tag: parseAssetTag(item),
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label.trim()
              : "Start Position",
          startPositionVisible: parseStageFlag(item.startPositionVisible, true),
        } satisfies StartPositionAsset
      }

      if (isMovement) {
        return {
          id,
          type: "movement",
          tag: parseAssetTag(item),
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          stageHideAfterSelection,
          stageBlurBackgroundOnClick,
          stageHideOtherElementsInStage,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label.trim()
              : "Movement",
          movementDirection: normalizeMovementDirection(item.movementDirection),
        } satisfies MovementAsset
      }

      if (isMatchSelect) {
        const parsedMatchValue =
          toNonNegativeWholeNumber(item.valueText) ??
          toNonNegativeWholeNumber(item.value) ??
          toNonNegativeWholeNumber(item.matchSelectValue) ??
          toNonNegativeWholeNumber(item.matchNumber) ??
          toNonNegativeWholeNumber(item.match) ??
          toNonNegativeWholeNumber(item.number) ??
          1

        return {
          id,
          type: "match-select",
          autoTeleopScope,
          stageParentId,
          stageParentTag,
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

      if (isButtonSlider) {
        return {
          id,
          type: "button-slider",
          tag: parseAssetTag(item),
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label.trim()
              : typeof item.text === "string" && item.text.trim().length > 0
                ? item.text.trim()
                : "Button Slider",
          iconName:
            typeof item.iconName === "string" && item.iconName.trim().length > 0
              ? item.iconName.trim().toLowerCase()
              : typeof item.icon === "string" && item.icon.trim().length > 0
                ? item.icon.trim().toLowerCase()
              : undefined,
          outlineColor:
            typeof item.outlineColor === "string" && item.outlineColor.trim().length > 0
              ? item.outlineColor
              : typeof item.outline === "string" && item.outline.trim().length > 0
                ? item.outline
              : undefined,
          fillColor:
            typeof item.fillColor === "string" && item.fillColor.trim().length > 0
              ? item.fillColor
              : typeof item.fill === "string" && item.fill.trim().length > 0
                ? item.fill
              : undefined,
          increaseDirection: normalizeIncreaseDirection(
            item.increaseDirection ?? item.buttonSliderIncreaseDirection ?? item.button_slider_increase_direction
          ),
          buttonSliderDisplayMode:
            normalizeButtonSliderDisplayMode(item.buttonSliderDisplayMode) ??
            normalizeButtonSliderDisplayMode(item.displayMode),
        } satisfies ButtonSliderAsset
      }

      if (isSlider) {
        return {
          id,
          type: "slider",
          tag: parseAssetTag(item),
          autoTeleopScope,
          stageParentId,
          stageParentTag,
          x: clampPositionScale(item.x as number),
          y: clampPositionScale(item.y as number),
          width: clampSizeScale(item.width as number),
          height: clampSizeScale(item.height as number),
          label:
            typeof item.label === "string" && item.label.trim().length > 0
              ? item.label.trim()
              : "Slider",
          sliderMax: Math.max(
            1,
            Math.round(toFiniteNumber(item.sliderMax) ?? toFiniteNumber(item.max) ?? 100)
          ),
          sliderMid: Math.max(
            0,
            Math.round(toFiniteNumber(item.sliderMid) ?? toFiniteNumber(item.mid) ?? 50)
          ),
          sliderLeftText:
            typeof item.sliderLeftText === "string" && item.sliderLeftText.trim().length > 0
              ? item.sliderLeftText
              : typeof item.leftText === "string" && item.leftText.trim().length > 0
                ? item.leftText
                : "Low",
          sliderRightText:
            typeof item.sliderRightText === "string" && item.sliderRightText.trim().length > 0
              ? item.sliderRightText
              : typeof item.rightText === "string" && item.rightText.trim().length > 0
                ? item.rightText
                : "High",
        } satisfies SliderAsset
      }

      if (isIconButton) {
        return {
          id,
          type: "icon-button",
          tag: parsedAssetTag,
          autoTeleopScope,
          increment: parsedIncrement ?? undefined,
          buttonPressMode: normalizePressMode(item.buttonPressMode ?? item.pressMode),
          successTrackingEnabled,
          successPopoverOffsetX,
          successPopoverOffsetY,
          stageParentId,
          stageParentTag:
            typeof item.stageParentTag === "string" && item.stageParentTag.trim().length > 0
              ? item.stageParentTag
              : undefined,
          stageHideAfterSelection,
          stageBlurBackgroundOnClick,
          stageHideOtherElementsInStage,
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
        tag: isTeamSelect ? "team-select" : parsedAssetTag,
        teamSelectRootTag,
        teamSelectLinkEachTeamToStage: isTeamSelect ? teamSelectLinkEachTeamToStage : undefined,
        teamSelectAddGeneralComments: isTeamSelect ? teamSelectAddGeneralComments : undefined,
        teamSelectShowStageWithoutSelection: isTeamSelect ? teamSelectShowStageWithoutSelection : undefined,
        teamSelectDefaultTab: isTeamSelect ? teamSelectDefaultTab : undefined,
        autoTeleopScope,
        increment: parsedIncrement ?? undefined,
        buttonPressMode: normalizePressMode(item.buttonPressMode ?? item.pressMode),
        successTrackingEnabled,
        successPopoverOffsetX,
        successPopoverOffsetY,
        stageParentId,
        stageParentTag,
        stageHideAfterSelection,
        stageBlurBackgroundOnClick,
        stageHideOtherElementsInStage,
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

  return resolveStageParentIdsByTag(parsedAssets)
}

function isStageableAsset(asset: ScoutAsset): asset is ButtonAsset | IconButtonAsset | MovementAsset {
  return asset.type === "button" || asset.type === "icon-button" || asset.type === "movement"
}

function getAssetRuntimeKey(asset: ScoutAsset) {
  if ("tag" in asset && typeof asset.tag === "string" && asset.tag.trim().length > 0) {
    return asset.tag.trim()
  }

  return asset.id
}

function normalizeRuntimeTag(tag: string) {
  return tag.trim()
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
  const [toggleTransitionCountByKey, setToggleTransitionCountByKey] = useState<Record<string, number>>({})
  const [toggleLastChangedAtByKey, setToggleLastChangedAtByKey] = useState<Record<string, number>>({})
  const [editingMatchKey, setEditingMatchKey] = useState<string | null>(null)
  const [editingMatchDraft, setEditingMatchDraft] = useState<string>("")
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [submitQrCodeUrl, setSubmitQrCodeUrl] = useState<string | null>(null)
  const [submitPayloadJson, setSubmitPayloadJson] = useState<string>("{}")
  const [submitPayloadPreviewJson, setSubmitPayloadPreviewJson] = useState<string>("{}")
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null)
  const [isEventTimeTrackingEnabled, setIsEventTimeTrackingEnabled] = useState(false)
  const [scoutFormTypeCode, setScoutFormTypeCode] = useState<0 | 1 | 2>(0)
  const [fieldAspectRatio, setFieldAspectRatio] = useState<FieldAspectRatio | null>(null)
  const [eventKey, setEventKey] = useState<string>("")
  const [scouterName, setScouterName] = useState<string>("")
  const [pitQuestions, setPitQuestions] = useState<PitQuestion[]>([])
  const [pitAnswersByQuestionId, setPitAnswersByQuestionId] = useState<Record<string, PitAnswerValue>>({})
  const [controlMode, setControlMode] = useState<ControlMode>("auto")
  const [autoTimerStartedAtMs, setAutoTimerStartedAtMs] = useState<number | null>(null)
  const [autoTimerRemainingMs, setAutoTimerRemainingMs] = useState<number>(AUTO_TIMER_DURATION_MS)
  const [sessionStartedAtMs, setSessionStartedAtMs] = useState<number>(Date.now())
  const [teamValue, setTeamValue] = useState<string>(TEAM_DEFAULT_VALUE)
  const [teamStageTabByRootId, setTeamStageTabByRootId] = useState<Record<string, TeamStageTab>>({})
  const [eventScheduleMatches, setEventScheduleMatches] = useState<TbaSimpleMatch[]>([])
  const [eventTeamsByKey, setEventTeamsByKey] = useState<Record<string, TbaEventTeamInfo>>({})
  const [previewStageParentId, setPreviewStageParentId] = useState<string | null>(null)
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeActionEvent[]>([])
  const [matchTimelineStartAtMs, setMatchTimelineStartAtMs] = useState<number | null>(null)
  const [previewHoldDurationsById, setPreviewHoldDurationsById] = useState<Record<string, number>>({})
  const [previewButtonSliderValues, setPreviewButtonSliderValues] = useState<Record<string, number>>({})
  const [previewSliderValues, setPreviewSliderValues] = useState<Record<string, number>>({})
  const [previewButtonSliderDragById, setPreviewButtonSliderDragById] = useState<
    Record<string, ButtonSliderDragInfo>
  >({})
  const isPreviewButtonSliderDragging = useMemo(
    () => Object.keys(previewButtonSliderDragById).length > 0,
    [previewButtonSliderDragById]
  )
  const [previewButtonSliderSpeedById, setPreviewButtonSliderSpeedById] = useState<Record<string, number>>({})
  const [previewTagStacks, setPreviewTagStacks] = useState<Record<string, number[]>>({})
  const [holdStatsByKey, setHoldStatsByKey] = useState<Record<string, HoldStats>>({})
  const previewButtonSliderAnimationFramesRef = useRef<Record<string, number>>({})
  const previewButtonSliderLoopStateRef = useRef<
    Record<string, { lastFrameMs: number; accumulator: number; smoothedRatePerSecond: number; increaseSign: number }>
  >({})
  const previewButtonSliderDragByIdRef = useRef<Record<string, ButtonSliderDragInfo>>({})
  const holdStartByAssetIdRef = useRef<Record<string, number>>({})
  const holdKeyByAssetIdRef = useRef<Record<string, string>>({})
  const holdIntervalRef = useRef<number | null>(null)
  const [startPositionsByAssetId, setStartPositionsByAssetId] = useState<
    Record<string, { xRatio: number; yRatio: number; selectedAtMs: number }>
  >({})
  const [hiddenStartPositionIds, setHiddenStartPositionIds] = useState<Record<string, true>>({})
  const [lockedStartPositionByAssetId, setLockedStartPositionByAssetId] = useState<
    Record<string, { xRatio: number | null; yRatio: number | null; lockedAtMs: number }>
  >({})
  const [movementSharedDirection, setMovementSharedDirection] = useState<"left" | "right">("left")
  const [movementToggleCount, setMovementToggleCount] = useState<number>(0)
  const [movementPositionEvents, setMovementPositionEvents] = useState<RuntimeActionEvent[]>([])
  const [previewSuccessOpenByAssetId, setPreviewSuccessOpenByAssetId] = useState<Record<string, boolean>>({})
  const isPreviewMode = true
  const { setHeaderActions } = useHeaderActions()
  const { open: isSidebarOpen } = useSidebar()

  const getNowMs = useCallback(() => Math.max(0, Date.now() - sessionStartedAtMs), [sessionStartedAtMs])

  const recordRuntimeEvent = useCallback(
    (event: Omit<RuntimeActionEvent, "atMs"> & { atMs?: number }) => {
      setRuntimeEvents((previous) => [
        ...previous,
        {
          ...event,
          atMs: typeof event.atMs === "number" ? event.atMs : getNowMs(),
        },
      ])
    },
    [getNowMs]
  )

  const clearHoldInterval = useCallback(() => {
    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  const stopHoldForAsset = useCallback(
    (assetId: string, key: string) => {
      const activeStart = holdStartByAssetIdRef.current[assetId]
      if (typeof activeStart !== "number") return

      const activeKey = holdKeyByAssetIdRef.current[assetId] ?? key

      const endMs = getNowMs()
      const durationMs = Math.max(0, endMs - activeStart)

      const nextStarts = { ...holdStartByAssetIdRef.current }
      delete nextStarts[assetId]
      holdStartByAssetIdRef.current = nextStarts

      const nextKeys = { ...holdKeyByAssetIdRef.current }
      delete nextKeys[assetId]
      holdKeyByAssetIdRef.current = nextKeys

      setPreviewHoldDurationsById((previous) => {
        if (!(assetId in previous)) return previous

        const next = { ...previous }
        delete next[assetId]
        return next
      })

      setHoldStatsByKey((previous) => {
        const existing = previous[activeKey]

        if (!existing) {
          return {
            ...previous,
            [activeKey]: {
              assetId,
              mode: "hold",
              totalMs: durationMs,
              pressCount: 1,
              segments: [
                {
                  startMs: activeStart,
                  endMs,
                  durationMs,
                },
              ],
            },
          }
        }

        return {
          ...previous,
          [activeKey]: {
            ...existing,
            totalMs: existing.totalMs + durationMs,
            pressCount: existing.pressCount + 1,
            segments: [
              ...existing.segments,
              {
                startMs: activeStart,
                endMs,
                durationMs,
              },
            ],
          },
        }
      })

      recordRuntimeEvent({
        type: "hold-end",
        assetId,
        key: activeKey,
        atMs: endMs,
        durationMs,
      })

      if (Object.keys(nextStarts).length === 0) {
        clearHoldInterval()
      }
    },
    [clearHoldInterval, getNowMs, recordRuntimeEvent]
  )

  const stopAllActiveHolds = useCallback(() => {
    const activeIds = Object.keys(holdStartByAssetIdRef.current)
    if (activeIds.length === 0) return

    const stageAssetById = new Map(scoutAssets.map((asset) => [asset.id, asset] as const))
    activeIds.forEach((assetId) => {
      const asset = stageAssetById.get(assetId)
      if (!asset) return
      stopHoldForAsset(assetId, normalizeRuntimeTag(getAssetRuntimeKey(asset)))
    })
  }, [scoutAssets, stopHoldForAsset])

  useEffect(() => {
    setSessionStartedAtMs(Date.now())

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

    const storedEventTeams = localStorage.getItem("eventTeams")
    if (!storedEventTeams) {
      setEventTeamsByKey({})
    } else {
      try {
        const parsedEventTeams = JSON.parse(storedEventTeams) as unknown
        setEventTeamsByKey(normalizeEventTeamsByKey(parsedEventTeams))
      } catch {
        setEventTeamsByKey({})
      }
    }

    const storedPayload = localStorage.getItem("payload")
    const storedFieldMapping = localStorage.getItem("fieldMapping")

    if (!storedFieldMapping) {
      setFieldMapping(null)
    } else {
      try {
        const parsedFieldMapping = JSON.parse(storedFieldMapping) as unknown
        setFieldMapping(parseFieldMapping(parsedFieldMapping))
      } catch {
        setFieldMapping(null)
      }
    }

    if (!storedPayload) {
      setScoutAssets([])
      setMirrorLine(null)
      setFieldAspectRatio(null)
      setIsEventTimeTrackingEnabled(false)
      setPitQuestions([])
      setPitAnswersByQuestionId({})
      return
    }

    try {
      const parsedPayload = JSON.parse(storedPayload) as unknown
      const normalizedPayload = typeof parsedPayload === "string" ? tryParseJson(parsedPayload) : parsedPayload
      const parsedAssets = parseScoutAssets(normalizedPayload)
      setScoutAssets(parsedAssets)
      setPitQuestions(normalizePitQuestions(normalizedPayload))
      setMirrorLine(parseMirrorLine(normalizedPayload))
      setFieldAspectRatio(parseFieldAspectRatio(normalizedPayload))

      if (normalizedPayload && typeof normalizedPayload === "object") {
        const rootPayload = normalizedPayload as {
          eventKey?: unknown
          scoutType?: unknown
          enableEventTimeTracking?: unknown
          eventTimeTracking?: unknown
          editorState?: {
            eventKey?: unknown
            scoutType?: unknown
            enableEventTimeTracking?: unknown
            eventTimeTracking?: unknown
          }
        }

        const parsedEventKey =
          typeof rootPayload.editorState?.eventKey === "string"
            ? rootPayload.editorState.eventKey.trim()
            : typeof rootPayload.eventKey === "string"
              ? rootPayload.eventKey.trim()
              : ""

        const parsedEventTimeTrackingEnabled =
          toBoolean(rootPayload.editorState?.enableEventTimeTracking) ??
          toBoolean(rootPayload.enableEventTimeTracking) ??
          toBoolean(rootPayload.editorState?.eventTimeTracking) ??
          toBoolean(rootPayload.eventTimeTracking) ??
          false

        const parsedScoutFormTypeCode = parseScoutFormTypeCode(
          rootPayload.editorState?.scoutType ?? rootPayload.scoutType
        )

        setEventKey(parsedEventKey)
        setIsEventTimeTrackingEnabled(parsedEventTimeTrackingEnabled)
        setScoutFormTypeCode(parsedScoutFormTypeCode)
      }
    } catch {
      setScoutAssets([])
      setMirrorLine(null)
      setFieldAspectRatio(null)
      setEventKey("")
      setIsEventTimeTrackingEnabled(false)
      setScoutFormTypeCode(0)
      setPitQuestions([])
      setPitAnswersByQuestionId({})
    }
  }, [])

  useEffect(() => {
    setPitAnswersByQuestionId((previous) =>
      pitQuestions.reduce<Record<string, PitAnswerValue>>((accumulator, question) => {
        const existingValue = previous[question.id]

        if (question.type === "text") {
          accumulator[question.id] = typeof existingValue === "string" ? existingValue : ""
          return accumulator
        }

        if (question.type === "slider") {
          const fallback = getDefaultPitAnswer(question) as number
          const existingSliderValue =
            typeof existingValue === "number" && Number.isFinite(existingValue) ? existingValue : fallback
          accumulator[question.id] = Math.max(question.sliderMin, Math.min(question.sliderMax, existingSliderValue))
          return accumulator
        }

        if (question.type === "all-that-apply") {
          accumulator[question.id] = Array.isArray(existingValue)
            ? existingValue.filter(
                (entry): entry is number =>
                  typeof entry === "number" && Number.isInteger(entry) && entry >= 0 && entry < question.options.length
              )
            : []
          return accumulator
        }

        accumulator[question.id] =
          typeof existingValue === "number" &&
          Number.isInteger(existingValue) &&
          existingValue >= 0 &&
          existingValue < question.options.length
            ? existingValue
            : null

        return accumulator
      }, {})
    )
  }, [pitQuestions])

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

    let animationFrameId: number | null = null
    const transitionStartTime = performance.now()
    const transitionRemeasureMs = 420

    const remeasureDuringTransition = () => {
      updateSize()

      if (performance.now() - transitionStartTime < transitionRemeasureMs) {
        animationFrameId = window.requestAnimationFrame(remeasureDuringTransition)
      }
    }

    animationFrameId = window.requestAnimationFrame(remeasureDuringTransition)

    const observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isFullscreen, isSidebarOpen])

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

    if (fieldAspectRatio) {
      return getContainedBounds(containerSize, {
        width: fieldAspectRatio.width,
        height: fieldAspectRatio.height,
      })
    }

    if (!backgroundImage || !backgroundImageSize) {
      return {
        left: 0,
        top: 0,
        width: containerSize.width,
        height: containerSize.height,
      } satisfies BoxBounds
    }

    return getContainedBounds(containerSize, backgroundImageSize)
  }, [backgroundImage, backgroundImageSize, containerSize, fieldAspectRatio])

  const renderedBackgroundBounds = useMemo(() => {
    if (!measuredFieldBounds) return null

    if (
      !backgroundImageSize ||
      backgroundImageSize.width <= 0 ||
      backgroundImageSize.height <= 0
    ) {
      return measuredFieldBounds
    }

    const containScale = Math.min(
      measuredFieldBounds.width / backgroundImageSize.width,
      measuredFieldBounds.height / backgroundImageSize.height,
      1
    )

    const width = backgroundImageSize.width * containScale
    const height = backgroundImageSize.height * containScale

    return {
      left: measuredFieldBounds.left + (measuredFieldBounds.width - width) / 2,
      top: measuredFieldBounds.top + (measuredFieldBounds.height - height) / 2,
      width,
      height,
    } satisfies BoxBounds
  }, [backgroundImageSize, measuredFieldBounds])

  const stageBlurRootId = useMemo(() => {
    if (!previewStageParentId) return null

    const stageRoot = scoutAssets.find((asset) => asset.id === previewStageParentId)
    if (!stageRoot || !isStageableAsset(stageRoot) || !stageRoot.stageBlurBackgroundOnClick) {
      return null
    }

    return stageRoot.id
  }, [previewStageParentId, scoutAssets])

  const getAssetStyle = useCallback(
    (
      asset: { id?: string; stageParentId?: string; x: number; y: number; width: number; height: number },
      includeHeight: boolean
    ) => {
      const stageZIndex = stageBlurRootId
        ? asset.id === stageBlurRootId || asset.stageParentId === stageBlurRootId
          ? 20
          : 5
        : undefined

      if (!measuredFieldBounds) {
        const percentBaseStyle = {
          left: `${toPercentFromScale(asset.x)}%`,
          top: `${100 - toPercentFromScale(asset.y)}%`,
          width: `${toSizePercentFromScale(asset.width)}%`,
          transform: "translate(-50%, -50%)",
          zIndex: stageZIndex,
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
        zIndex: stageZIndex,
      }

      if (!includeHeight) {
        return baseStyle
      }

      return {
        ...baseStyle,
        height: measuredFieldBounds.height * heightPercent,
      }
    },
    [measuredFieldBounds, stageBlurRootId]
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

  const activePreviewStageRoot = useMemo(() => {
    if (!previewStageParentId) return null
    const stageRoot = displayedAssets.find((asset) => asset.id === previewStageParentId)
    if (!stageRoot || !isStageableAsset(stageRoot)) return null
    return stageRoot
  }, [displayedAssets, previewStageParentId])

  const linkedTeamSelectStageByRootId = useMemo(() => {
    const stageByRootId = new Map<
      string,
      {
        selectedTab: TeamStageTab
        addGeneralComments: boolean
        showStageWithoutSelection: boolean
      }
    >()

    displayedAssets.forEach((asset) => {
      if (asset.type !== "button") return
      if (asset.tag !== TEAM_SELECT_TAG) return
      if (asset.teamSelectLinkEachTeamToStage !== true) return

      const availableTabs = getTeamStageTabs(asset.teamSelectAddGeneralComments === true)
      const preferredTab =
        teamStageTabByRootId[asset.id] ??
        normalizeTeamStageTab(asset.teamSelectDefaultTab) ??
        availableTabs[0] ??
        "b1"
      const selectedTab = availableTabs.includes(preferredTab) ? preferredTab : availableTabs[0] ?? "b1"

      stageByRootId.set(asset.id, {
        selectedTab,
        addGeneralComments: asset.teamSelectAddGeneralComments === true,
        showStageWithoutSelection: asset.teamSelectShowStageWithoutSelection === true,
      })
    })

    return stageByRootId
  }, [displayedAssets, teamStageTabByRootId])

  const doesLinkedTeamStageChildMatchSelectedTab = useCallback(
    (asset: ScoutAsset) => {
      if (!asset.stageParentId) return true

      const linkedStage = linkedTeamSelectStageByRootId.get(asset.stageParentId)
      if (!linkedStage) return true

      if (!linkedStage.showStageWithoutSelection && !linkedStage.selectedTab) {
        return false
      }

      const selectedTab = linkedStage.selectedTab
      const taggedValue =
        "tag" in asset && typeof asset.tag === "string" ? asset.tag.trim() : ""
      const explicitTabSuffix = taggedValue ? getTeamStageTagSuffix(taggedValue) : undefined

      if (explicitTabSuffix) {
        return explicitTabSuffix === selectedTab
      }

      const resolvedScope: TeamStageScope =
        asset.type === "input" && asset.teamStageScope === "general"
          ? "general"
          : "teams"

      if (selectedTab === "general") {
        return resolvedScope === "general"
      }

      return resolvedScope !== "general"
    },
    [linkedTeamSelectStageByRootId]
  )

  const visibleAssets = useMemo(() => {
    const applyScopeFilter = (assets: ScoutAsset[]) =>
      assets.filter((asset) => {
        if (!asset.autoTeleopScope) return true
        return asset.autoTeleopScope === controlMode
      })

    const topLevelAndLinkedTeamStageAssets = displayedAssets.filter((asset) => {
      if (!asset.stageParentId) return true
      if (!linkedTeamSelectStageByRootId.has(asset.stageParentId)) return false
      return doesLinkedTeamStageChildMatchSelectedTab(asset)
    })

    if (!previewStageParentId) {
      return applyScopeFilter(topLevelAndLinkedTeamStageAssets)
    }

    const stageRoot = displayedAssets.find((asset) => asset.id === previewStageParentId)
    if (!stageRoot || !isStageableAsset(stageRoot)) {
      return applyScopeFilter(topLevelAndLinkedTeamStageAssets)
    }

    const hideRoot = Boolean(stageRoot.stageHideAfterSelection)
    const hideOthers = Boolean(stageRoot.stageHideOtherElementsInStage)

    if (hideOthers) {
      return applyScopeFilter(displayedAssets.filter(
        (asset) =>
          (asset.stageParentId === previewStageParentId && doesLinkedTeamStageChildMatchSelectedTab(asset)) ||
          (!hideRoot && asset.id === previewStageParentId)
      ))
    }

    return applyScopeFilter(displayedAssets.filter((asset) => {
      if (asset.stageParentId === previewStageParentId) {
        return doesLinkedTeamStageChildMatchSelectedTab(asset)
      }
      if (asset.id === previewStageParentId) return !hideRoot
      if (!asset.stageParentId) return true
      if (!linkedTeamSelectStageByRootId.has(asset.stageParentId)) return false
      return doesLinkedTeamStageChildMatchSelectedTab(asset)
    }))
  }, [
    controlMode,
    displayedAssets,
    doesLinkedTeamStageChildMatchSelectedTab,
    linkedTeamSelectStageByRootId,
    previewStageParentId,
  ])

  const isSwapMirrored = useMemo(() => isSwapped, [isSwapped])

  const coverAssets = useMemo(
    () => visibleAssets.filter((asset): asset is CoverAsset => asset.type === "cover"),
    [visibleAssets]
  )

  const primaryMatchSelectAsset = useMemo(
    () => scoutAssets.find((asset): asset is MatchSelectAsset => asset.type === "match-select") ?? null,
    [scoutAssets]
  )

  const primaryAutoToggleAsset = useMemo(
    () => scoutAssets.find((asset): asset is AutoToggleAsset => asset.type === "auto-toggle") ?? null,
    [scoutAssets]
  )

  const autoTimerDurationMs = useMemo(() => {
    const parsedDurationSeconds = primaryAutoToggleAsset?.durationSeconds
    if (typeof parsedDurationSeconds !== "number" || parsedDurationSeconds <= 0) {
      return AUTO_TIMER_DURATION_MS
    }

    return parsedDurationSeconds * 1000
  }, [primaryAutoToggleAsset?.durationSeconds])

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

  const selectedScheduleTeamInfoByTab = useMemo<Partial<Record<TeamStageBaseTab, TbaEventTeamInfo>>>(() => {
    if (!selectedScheduleMatch) return {}

    const resolveTeamInfo = (teamKey: string | undefined) => {
      if (!teamKey) return null

      const normalizedTeamKey = normalizeTeamKey(teamKey)
      if (!normalizedTeamKey) return null

      const teamFromLookup = eventTeamsByKey[normalizedTeamKey]
      const teamNumber = teamFromLookup?.teamNumber ?? teamKeyToTeamNumber(normalizedTeamKey)
      const displayName = teamFromLookup?.displayName ?? teamNumber

      return {
        teamNumber,
        displayName,
      } satisfies TbaEventTeamInfo
    }

    return {
      b1: resolveTeamInfo(selectedScheduleMatch.blueTeamKeys[0]) ?? undefined,
      b2: resolveTeamInfo(selectedScheduleMatch.blueTeamKeys[1]) ?? undefined,
      b3: resolveTeamInfo(selectedScheduleMatch.blueTeamKeys[2]) ?? undefined,
      r1: resolveTeamInfo(selectedScheduleMatch.redTeamKeys[0]) ?? undefined,
      r2: resolveTeamInfo(selectedScheduleMatch.redTeamKeys[1]) ?? undefined,
      r3: resolveTeamInfo(selectedScheduleMatch.redTeamKeys[2]) ?? undefined,
    }
  }, [eventTeamsByKey, selectedScheduleMatch])

  useEffect(() => {
    const linkedTeamSelectRoots = scoutAssets.filter(
      (asset): asset is ButtonAsset =>
        asset.type === "button" &&
        asset.tag === TEAM_SELECT_TAG &&
        asset.teamSelectLinkEachTeamToStage === true
    )

    const initializedTabs = linkedTeamSelectRoots.reduce<Record<string, TeamStageTab>>(
      (accumulator, asset) => {
        const availableTabs = getTeamStageTabs(asset.teamSelectAddGeneralComments === true)
        const preferredTab =
          normalizeTeamStageTab(asset.teamSelectDefaultTab) ??
          availableTabs[0] ??
          "b1"

        accumulator[asset.id] = availableTabs.includes(preferredTab)
          ? preferredTab
          : availableTabs[0] ?? "b1"

        return accumulator
      },
      {}
    )

    setTeamStageTabByRootId(initializedTabs)

    const firstRootId = Object.keys(initializedTabs)[0]
    if (firstRootId) {
      setTeamValue(initializedTabs[firstRootId])
    }
  }, [TEAM_SELECT_TAG, scoutAssets])

  useEffect(() => {
    if (!primaryAutoToggleAsset) {
      setControlMode("auto")
      setAutoTimerRemainingMs(AUTO_TIMER_DURATION_MS)
      setAutoTimerStartedAtMs(null)
      return
    }

    setControlMode(primaryAutoToggleAsset.mode ?? "auto")
    setAutoTimerRemainingMs(autoTimerDurationMs)
    setAutoTimerStartedAtMs(null)
  }, [autoTimerDurationMs, primaryAutoToggleAsset])

  const buttonAssets = useMemo(
    () =>
      visibleAssets.filter(
        (asset): asset is
          | ButtonAsset
          | IconButtonAsset
          | ButtonSliderAsset
          | SliderAsset
          | InputAsset
          | AutoToggleAsset
          | ToggleSwitchAsset
          | MatchSelectAsset
          | StartPositionAsset
          | MovementAsset
          | LogAsset =>
          asset.type !== "cover"
      ),
    [visibleAssets]
  )

  const movementStatsByKey = useMemo(() => {
    const nowMs = getNowMs()
    const sortedMovementEvents = runtimeEvents
      .filter((event): event is RuntimeActionEvent & { key: string } => {
        return event.type === "movement-toggle" && typeof event.key === "string" && event.key.trim().length > 0
      })
      .slice()
      .sort((left, right) => left.atMs - right.atMs)

    const statsByKey: Record<string, { toggleCount: number; totalMs: number; lastDirection: string }> = {}

    sortedMovementEvents.forEach((event) => {
      const key = event.key.trim()
      const existing = statsByKey[key] ?? { toggleCount: 0, totalMs: 0, lastDirection: movementSharedDirection }
      const lastToggleAtMs = (existing as { lastToggleAtMs?: number }).lastToggleAtMs

      if (typeof lastToggleAtMs === "number") {
        existing.totalMs += Math.max(0, event.atMs - lastToggleAtMs)
      }

      ;(existing as { lastToggleAtMs?: number }).lastToggleAtMs = event.atMs
      existing.toggleCount += 1
      existing.lastDirection = typeof event.value === "string" ? event.value : existing.lastDirection

      statsByKey[key] = existing
    })

    Object.values(statsByKey).forEach((stats) => {
      const lastToggleAtMs = (stats as { lastToggleAtMs?: number }).lastToggleAtMs
      if (typeof lastToggleAtMs === "number") {
        stats.totalMs += Math.max(0, nowMs - lastToggleAtMs)
      }
      delete (stats as { lastToggleAtMs?: number }).lastToggleAtMs
    })

    return statsByKey
  }, [getNowMs, movementSharedDirection, runtimeEvents])

  const stageRootIds = useMemo(
    () =>
      new Set(
        scoutAssets
          .map((asset) => asset.stageParentId)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      ),
    [scoutAssets]
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
    setToggleTransitionCountByKey({})
    setToggleLastChangedAtByKey({})
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

  useEffect(() => {
    const initialMovementAsset = scoutAssets.find(
      (asset): asset is MovementAsset => asset.type === "movement"
    )

    setMovementSharedDirection(initialMovementAsset?.movementDirection ?? "left")
    setMovementToggleCount(0)
    setMovementPositionEvents([])
    setPreviewStageParentId(null)
    setStartPositionsByAssetId({})
    setHiddenStartPositionIds({})
    setLockedStartPositionByAssetId({})
    setRuntimeEvents([])
    setMatchTimelineStartAtMs(null)
    setPreviewButtonSliderValues({})
    setPreviewSliderValues({})
    setPreviewButtonSliderDragById({})
    setPreviewButtonSliderSpeedById({})
    setPreviewTagStacks({})
    setPreviewSuccessOpenByAssetId({})
    Object.values(previewButtonSliderAnimationFramesRef.current).forEach((frameId) => {
      window.cancelAnimationFrame(frameId)
    })
    previewButtonSliderAnimationFramesRef.current = {}
    previewButtonSliderLoopStateRef.current = {}
    previewButtonSliderDragByIdRef.current = {}
    setHoldStatsByKey({})
    setPreviewHoldDurationsById({})
    holdStartByAssetIdRef.current = {}
    holdKeyByAssetIdRef.current = {}
    clearHoldInterval()
  }, [clearHoldInterval, scoutAssets])

  useEffect(() => {
    if (!previewStageParentId) return
    if (scoutAssets.some((asset) => asset.id === previewStageParentId)) return
    setPreviewStageParentId(null)
  }, [previewStageParentId, scoutAssets])

  useEffect(
    () => () => {
      clearHoldInterval()
      Object.values(previewButtonSliderAnimationFramesRef.current).forEach((frameId) => {
        window.cancelAnimationFrame(frameId)
      })
      previewButtonSliderAnimationFramesRef.current = {}
      previewButtonSliderLoopStateRef.current = {}
      previewButtonSliderDragByIdRef.current = {}
    },
    [clearHoldInterval]
  )

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

        recordRuntimeEvent({
          type: "match-change",
          key: matchKey,
          value: parsed,
        })
      }

      setEditingMatchKey((previous) => (previous === matchKey ? null : previous))
      setEditingMatchDraft("")
    },
    [editingMatchDraft, recordRuntimeEvent]
  )

  const cancelEditingMatchValue = useCallback((matchKey: string) => {
    setEditingMatchKey((previous) => (previous === matchKey ? null : previous))
    setEditingMatchDraft("")
  }, [])

  const setTeleopMode = useCallback(() => {
    stopAllActiveHolds()
    setControlMode("teleop")
    setAutoTimerStartedAtMs(null)
    setAutoTimerRemainingMs(autoTimerDurationMs)
    recordRuntimeEvent({ type: "mode-change", value: "teleop" })
  }, [autoTimerDurationMs, recordRuntimeEvent, stopAllActiveHolds])

  const setAutoMode = useCallback(
    (startTimer: boolean) => {
      stopAllActiveHolds()
      setControlMode("auto")

      if (startTimer) {
        const startedAtMs = Date.now()
        setAutoTimerStartedAtMs(startedAtMs)
        setAutoTimerRemainingMs(autoTimerDurationMs)
        setMatchTimelineStartAtMs(getNowMs())

        setHiddenStartPositionIds((previous) => {
          const next = { ...previous }
          scoutAssets
            .filter((asset): asset is StartPositionAsset => asset.type === "start-position")
            .forEach((asset) => {
              next[asset.id] = true
            })
          return next
        })

        const lockAtMs = getNowMs()
        setLockedStartPositionByAssetId((previous) => {
          const next = { ...previous }

          scoutAssets
            .filter((asset): asset is StartPositionAsset => asset.type === "start-position")
            .forEach((asset) => {
              const existing = startPositionsByAssetId[asset.id]
              next[asset.id] = {
                xRatio: existing?.xRatio ?? null,
                yRatio: existing?.yRatio ?? null,
                lockedAtMs: lockAtMs,
              }

              recordRuntimeEvent({
                type: "start-position-lock",
                assetId: asset.id,
                key: normalizeRuntimeTag(getAssetRuntimeKey(asset)),
                atMs: lockAtMs,
                xRatio: existing?.xRatio,
                yRatio: existing?.yRatio,
              })
            })

          return next
        })

        recordRuntimeEvent({ type: "mode-change", value: "auto-running" })
        return
      }

      setAutoTimerStartedAtMs(null)
      setAutoTimerRemainingMs(autoTimerDurationMs)
      recordRuntimeEvent({ type: "mode-change", value: "auto" })
    },
    [
      autoTimerDurationMs,
      getNowMs,
      recordRuntimeEvent,
      scoutAssets,
      stopAllActiveHolds,
      startPositionsByAssetId,
    ]
  )

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
      const remainingMs = Math.max(0, autoTimerDurationMs - elapsedMs)
      setAutoTimerRemainingMs(remainingMs)

      if (remainingMs <= 0) {
        setTeleopMode()
      }
    }, 10)

    return () => window.clearInterval(timerId)
  }, [autoTimerDurationMs, autoTimerStartedAtMs, controlMode, setTeleopMode])

  const handleSwapSides = useCallback(() => {
    if (!mirrorLine) return
    setIsSwapped((previous) => !previous)
  }, [mirrorLine])

  const pushTagToStack = useCallback((tag?: string, increment = 1, assetId?: string, rawTag?: string) => {
    if (!tag || tag.trim().length === 0) return
    const repeatCount = Math.max(0, Math.floor(increment))
    if (repeatCount === 0) return

    const prefixedTag = toModePrefixedTag(tag, controlMode)
    const atMs = getNowMs()

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

    recordRuntimeEvent({
      type: "tap",
      assetId,
      key: prefixedTag,
      atMs,
      valueDelta: repeatCount,
    })
  }, [controlMode, getNowMs, recordRuntimeEvent])

  const commitSliderValueToTagStack = useCallback((asset: ButtonSliderAsset, value: number) => {
    const normalizedTag =
      typeof asset.tag === "string" && asset.tag.trim().length > 0
        ? normalizeRuntimeTag(asset.tag)
        : ""
    if (!normalizedTag || value <= 0) return

    setPreviewTagStacks((previous) => ({
      ...previous,
      [normalizedTag]: [...(previous[normalizedTag] ?? []), value],
    }))
  }, [])

  const handlePreviewSliderChange = useCallback((itemId: string, value: number) => {
    setPreviewSliderValues((previous) => ({
      ...previous,
      [itemId]: Math.max(0, Math.round(value)),
    }))
  }, [])

  const runPreviewButtonSliderFrame = useCallback((itemId: string, frameTimeMs: number) => {
    const drag = previewButtonSliderDragByIdRef.current[itemId]
    const loopState = previewButtonSliderLoopStateRef.current[itemId]

    if (!drag || !loopState) {
      delete previewButtonSliderAnimationFramesRef.current[itemId]
      return
    }

    const elapsedMs = Math.max(0, Math.min(80, frameTimeMs - loopState.lastFrameMs))
    loopState.lastFrameMs = frameTimeMs

    const absoluteDistance = Math.abs(drag.signedDistance)
    const hasDirection = absoluteDistance >= BUTTON_SLIDER_DRAG_DEADZONE_PX
    const direction = hasDirection ? (drag.signedDistance > 0 ? 1 : -1) : 0
    const targetRatePerSecond = hasDirection
      ? getButtonSliderSpeedPerSecond(absoluteDistance) * direction * loopState.increaseSign
      : 0

    const smoothedRatePerSecond =
      loopState.smoothedRatePerSecond +
      (targetRatePerSecond - loopState.smoothedRatePerSecond) * BUTTON_SLIDER_SPEED_SMOOTHING

    loopState.smoothedRatePerSecond = smoothedRatePerSecond

    setPreviewButtonSliderSpeedById((previous) => ({
      ...previous,
      [itemId]: smoothedRatePerSecond,
    }))

    if (elapsedMs > 0) {
      loopState.accumulator += (smoothedRatePerSecond * elapsedMs) / 1000

      let wholeStepDelta = 0
      if (loopState.accumulator >= 1) {
        wholeStepDelta = Math.floor(loopState.accumulator)
        loopState.accumulator -= wholeStepDelta
      } else if (loopState.accumulator <= -1) {
        wholeStepDelta = -Math.floor(-loopState.accumulator)
        loopState.accumulator -= wholeStepDelta
      }

      if (wholeStepDelta !== 0) {
        setPreviewButtonSliderValues((previous) => ({
          ...previous,
          [itemId]: Math.max(0, (previous[itemId] ?? 0) + wholeStepDelta),
        }))
      }
    }

    previewButtonSliderAnimationFramesRef.current[itemId] = window.requestAnimationFrame((nextFrameMs) => {
      runPreviewButtonSliderFrame(itemId, nextFrameMs)
    })
  }, [])

  const startPreviewButtonSliderLoop = useCallback(
    (itemId: string, increaseSign: number) => {
      if (typeof previewButtonSliderAnimationFramesRef.current[itemId] === "number") return

      previewButtonSliderLoopStateRef.current = {
        ...previewButtonSliderLoopStateRef.current,
        [itemId]: {
          lastFrameMs: performance.now(),
          accumulator: 0,
          smoothedRatePerSecond: 0,
          increaseSign,
        },
      }

      setPreviewButtonSliderSpeedById((previous) => ({
        ...previous,
        [itemId]: 0,
      }))

      previewButtonSliderAnimationFramesRef.current[itemId] = window.requestAnimationFrame((frameMs) => {
        runPreviewButtonSliderFrame(itemId, frameMs)
      })
    },
    [runPreviewButtonSliderFrame]
  )

  const clearPreviewButtonSliderLoop = useCallback((itemId: string) => {
    const frameId = previewButtonSliderAnimationFramesRef.current[itemId]
    if (typeof frameId === "number") {
      window.cancelAnimationFrame(frameId)
      delete previewButtonSliderAnimationFramesRef.current[itemId]
    }

    const nextLoopState = { ...previewButtonSliderLoopStateRef.current }
    delete nextLoopState[itemId]
    previewButtonSliderLoopStateRef.current = nextLoopState

    setPreviewButtonSliderDragById((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })

    setPreviewButtonSliderSpeedById((previous) => {
      if (!(itemId in previous)) return previous
      const next = { ...previous }
      delete next[itemId]
      return next
    })

    const nextRef = { ...previewButtonSliderDragByIdRef.current }
    delete nextRef[itemId]
    previewButtonSliderDragByIdRef.current = nextRef
  }, [])

  const handlePreviewButtonSliderDragStart = useCallback(
    (asset: ButtonSliderAsset, event: React.PointerEvent<HTMLButtonElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const startX = event.clientX
      const configuredIncreaseSign = asset.increaseDirection === "left" ? -1 : 1
      const effectiveIncreaseSign = isSwapped ? configuredIncreaseSign * -1 : configuredIncreaseSign
      const info: ButtonSliderDragInfo = {
        startX,
        currentX: startX,
        signedDistance: 0,
        buttonLeft: rect.left,
        buttonWidth: rect.width,
      }

      clearPreviewButtonSliderLoop(asset.id)

      previewButtonSliderDragByIdRef.current = {
        ...previewButtonSliderDragByIdRef.current,
        [asset.id]: info,
      }
      setPreviewButtonSliderDragById((previous) => ({ ...previous, [asset.id]: info }))
      setPreviewButtonSliderValues((previous) => ({ ...previous, [asset.id]: 1 }))

      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // no-op
      }

      startPreviewButtonSliderLoop(asset.id, effectiveIncreaseSign)
    },
    [clearPreviewButtonSliderLoop, isSwapped, startPreviewButtonSliderLoop]
  )

  const handlePreviewButtonSliderDragMove = useCallback(
    (itemId: string, clientX: number) => {
      const drag = previewButtonSliderDragByIdRef.current[itemId]
      if (!drag) return

      const info: ButtonSliderDragInfo = {
        ...drag,
        currentX: clientX,
        signedDistance: clientX - drag.startX,
      }

      previewButtonSliderDragByIdRef.current = {
        ...previewButtonSliderDragByIdRef.current,
        [itemId]: info,
      }
      setPreviewButtonSliderDragById((previous) => ({ ...previous, [itemId]: info }))
    },
    []
  )

  const handlePreviewButtonSliderDragEnd = useCallback(
    (asset: ButtonSliderAsset) => {
      const value = previewButtonSliderValues[asset.id] ?? 0
      const runtimeKey =
        typeof asset.tag === "string" && asset.tag.trim().length > 0
          ? normalizeRuntimeTag(asset.tag)
          : ""

      if (value > 0 && runtimeKey) {
        commitSliderValueToTagStack(asset, value)
        pushTagToStack(runtimeKey, value, asset.id, runtimeKey)

        recordRuntimeEvent({
          type: "button-slider-commit",
          assetId: asset.id,
          key: runtimeKey,
          value,
        })
      }

      clearPreviewButtonSliderLoop(asset.id)
      setPreviewButtonSliderValues((previous) => {
        if (!(asset.id in previous)) return previous
        const next = { ...previous }
        delete next[asset.id]
        return next
      })
    },
    [clearPreviewButtonSliderLoop, commitSliderValueToTagStack, previewButtonSliderValues, pushTagToStack, recordRuntimeEvent]
  )

  const handleStageToggle = useCallback(
    (asset: ButtonAsset | IconButtonAsset | MovementAsset) => {
      const hasChildren = scoutAssets.some((candidate) => candidate.stageParentId === asset.id)
      if (!hasChildren) return false

      setPreviewStageParentId((previous) => {
        const nextValue = previous === asset.id ? null : asset.id

        recordRuntimeEvent({
          type: nextValue ? "stage-enter" : "stage-exit",
          assetId: asset.id,
          key: normalizeRuntimeTag(getAssetRuntimeKey(asset)),
          value: nextValue ? "open" : "closed",
        })

        return nextValue
      })

      return true
    },
    [recordRuntimeEvent, scoutAssets]
  )

  const startHoldForAsset = useCallback(
    (asset: ButtonAsset | IconButtonAsset) => {
      const pressMode = asset.buttonPressMode ?? "tap"
      if (pressMode !== "hold") return

      const runtimeKey = normalizeRuntimeTag(getAssetRuntimeKey(asset))
      const key = toModePrefixedTag(runtimeKey, controlMode)
      if (typeof holdStartByAssetIdRef.current[asset.id] === "number") return

      const startMs = getNowMs()
      holdStartByAssetIdRef.current = {
        ...holdStartByAssetIdRef.current,
        [asset.id]: startMs,
      }
      holdKeyByAssetIdRef.current = {
        ...holdKeyByAssetIdRef.current,
        [asset.id]: key,
      }

      setPreviewHoldDurationsById((previous) => ({
        ...previous,
        [asset.id]: 0,
      }))

      recordRuntimeEvent({
        type: "hold-start",
        assetId: asset.id,
        key,
        atMs: startMs,
      })

      if (holdIntervalRef.current !== null) return

      holdIntervalRef.current = window.setInterval(() => {
        const activeStartById = holdStartByAssetIdRef.current
        const activeIds = Object.keys(activeStartById)

        if (activeIds.length === 0) {
          clearHoldInterval()
          return
        }

        const nowMs = getNowMs()
        setPreviewHoldDurationsById((previous) => {
          const next: Record<string, number> = {}
          let changed = false

          activeIds.forEach((activeId) => {
            const elapsed = Math.max(0, nowMs - activeStartById[activeId])
            next[activeId] = elapsed
            if (previous[activeId] !== elapsed) {
              changed = true
            }
          })

          if (Object.keys(previous).length !== activeIds.length) {
            changed = true
          }

          return changed ? next : previous
        })
      }, 25)
    },
    [clearHoldInterval, controlMode, getNowMs, recordRuntimeEvent]
  )

  const handleMovementAssetClick = useCallback(
    (asset: MovementAsset) => {
      if (handleStageToggle(asset)) return

      setMovementSharedDirection((previous) => {
        const nextDirection = previous === "left" ? "right" : "left"
        const runtimeKey = normalizeRuntimeTag(getAssetRuntimeKey(asset))
        const key = toModePrefixedTag(runtimeKey, controlMode)

        setMovementToggleCount((count) => count + 1)
        setMovementPositionEvents((previousEvents) => [
          ...previousEvents,
          {
            type: "movement-position",
            assetId: asset.id,
            key,
            atMs: getNowMs(),
            zone: key,
            action: "crossed",
            value: nextDirection,
          },
        ])

        recordRuntimeEvent({
          type: "movement-toggle",
          assetId: asset.id,
          key,
          value: nextDirection,
        })

        return nextDirection
      })
    },
    [controlMode, getNowMs, handleStageToggle, recordRuntimeEvent]
  )

  const onPreviewSuccessToggle = useCallback((assetId: string) => {
    setPreviewSuccessOpenByAssetId((previous) => ({
      ...previous,
      [assetId]: !previous[assetId],
    }))
  }, [])

  const onPreviewSuccessSelect = useCallback(
    (asset: ButtonAsset | IconButtonAsset, result: "success" | "fail") => {
      setPreviewSuccessOpenByAssetId((previous) => ({
        ...previous,
        [asset.id]: false,
      }))

      const runtimeKey = normalizeRuntimeTag(getAssetRuntimeKey(asset))
      if (!runtimeKey) return

      const prefixedRuntimeKey = toModePrefixedTag(runtimeKey, controlMode)
      const increment = asset.increment ?? 1

      pushTagToStack(`${runtimeKey}.${result}`, 1, asset.id, runtimeKey)
      recordRuntimeEvent({
        type: "success-select",
        assetId: asset.id,
        key: prefixedRuntimeKey,
        value: result,
        valueDelta: increment,
      })
    },
    [controlMode, pushTagToStack, recordRuntimeEvent]
  )

  const handleStartPositionTap = useCallback(
    (asset: StartPositionAsset, event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
      const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
      const atMs = getNowMs()

      setStartPositionsByAssetId((previous) => ({
        ...previous,
        [asset.id]: {
          xRatio,
          yRatio,
          selectedAtMs: atMs,
        },
      }))

      setHiddenStartPositionIds((previous) => {
        if (!(asset.id in previous)) return previous
        const next = { ...previous }
        delete next[asset.id]
        return next
      })

      recordRuntimeEvent({
        type: "start-position-set",
        assetId: asset.id,
        key: normalizeRuntimeTag(getAssetRuntimeKey(asset)),
        atMs,
        xRatio,
        yRatio,
      })
    },
    [getNowMs, recordRuntimeEvent]
  )

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

    recordRuntimeEvent({
      type: "undo",
      key: lastAction.tag,
      valueDelta: -lastAction.count,
    })
  }, [recordRuntimeEvent, tagStackActions])

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

    recordRuntimeEvent({
      type: "redo",
      key: lastRedoAction.tag,
      valueDelta: lastRedoAction.count,
    })
  }, [recordRuntimeEvent, redoTagStackActions])

  const handleResetScoutingData = useCallback(() => {
    stopAllActiveHolds()
    setTagStack([])
    setRedoTagStack([])
    setTagStackActions([])
    setRedoTagStackActions([])
    setInputValuesByKey({})
    setPitAnswersByQuestionId(
      pitQuestions.reduce<Record<string, PitAnswerValue>>((accumulator, question) => {
        accumulator[question.id] = getDefaultPitAnswer(question)
        return accumulator
      }, {})
    )
    setTeamStageTabByRootId({})
    setTeamValue(TEAM_DEFAULT_VALUE)
    setEditingMatchKey(null)
    setEditingMatchDraft("")
    setRuntimeEvents([])
    setMatchTimelineStartAtMs(null)
    setPreviewButtonSliderValues({})
    setPreviewSliderValues({})
    setPreviewButtonSliderDragById({})
    setPreviewButtonSliderSpeedById({})
    setPreviewTagStacks({})
    setPreviewSuccessOpenByAssetId({})
    Object.values(previewButtonSliderAnimationFramesRef.current).forEach((frameId) => {
      window.cancelAnimationFrame(frameId)
    })
    previewButtonSliderAnimationFramesRef.current = {}
    previewButtonSliderLoopStateRef.current = {}
    previewButtonSliderDragByIdRef.current = {}
    setStartPositionsByAssetId({})
    setHiddenStartPositionIds({})
    setLockedStartPositionByAssetId({})
    setMovementToggleCount(0)
    setMovementPositionEvents([])
    setHoldStatsByKey({})
    setPreviewHoldDurationsById({})
    setToggleTransitionCountByKey({})
    setToggleLastChangedAtByKey({})
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

    recordRuntimeEvent({ type: "reset" })
  }, [TEAM_DEFAULT_VALUE, pitQuestions, recordRuntimeEvent, scoutAssets, stopAllActiveHolds])

  const handleSubmit = useCallback(async () => {
    stopAllActiveHolds()

    const output: Record<string, number | string | boolean> = {}

    const buttonAndIconTagScopeEntries = scoutAssets
      .filter(
        (asset): asset is ButtonAsset | IconButtonAsset | ButtonSliderAsset =>
          asset.type === "button" || asset.type === "icon-button" || asset.type === "button-slider"
      )
      .flatMap((asset) => {
        const normalizedTag = typeof asset.tag === "string" ? asset.tag.trim() : ""
        if (!normalizedTag || normalizedTag === TEAM_SELECT_TAG) return []
        return [{ tag: normalizedTag, autoTeleopScope: asset.autoTeleopScope }]
      })

    const successTagScopeEntries = scoutAssets
      .filter(
        (asset): asset is ButtonAsset | IconButtonAsset =>
          (asset.type === "button" || asset.type === "icon-button") &&
          asset.successTrackingEnabled === true &&
          typeof asset.tag === "string" &&
          asset.tag.trim().length > 0
      )
      .flatMap((asset) => {
        const normalizedTag = asset.tag?.trim() ?? ""
        if (!normalizedTag) return []

        return [
          { tag: `${normalizedTag}.success`, autoTeleopScope: asset.autoTeleopScope },
          { tag: `${normalizedTag}.fail`, autoTeleopScope: asset.autoTeleopScope },
        ]
      })

    const linkedTeamSelectRootsById = scoutAssets.reduce<
      Record<string, { addGeneralComments: boolean; selectedTab: TeamStageTab }>
    >((accumulator, asset) => {
      if (asset.type !== "button") return accumulator
      if (asset.tag !== TEAM_SELECT_TAG) return accumulator
      if (asset.teamSelectLinkEachTeamToStage !== true) return accumulator

      const availableTabs = getTeamStageTabs(asset.teamSelectAddGeneralComments === true)
      const preferredTab =
        teamStageTabByRootId[asset.id] ??
        normalizeTeamStageTab(asset.teamSelectDefaultTab) ??
        availableTabs[0] ??
        "b1"

      accumulator[asset.id] = {
        addGeneralComments: asset.teamSelectAddGeneralComments === true,
        selectedTab: availableTabs.includes(preferredTab) ? preferredTab : availableTabs[0] ?? "b1",
      }

      return accumulator
    }, {})

    const inputOutputByTag = scoutAssets
      .filter((asset): asset is InputAsset => asset.type === "input")
      .reduce<Record<string, string>>((accumulator, asset) => {
        const rawTag = typeof asset.tag === "string" && asset.tag.trim().length > 0 ? asset.tag.trim() : asset.id
        if (!rawTag) return accumulator

        const stageParentId = asset.stageParentId
        const linkedTeamRoot = stageParentId ? linkedTeamSelectRootsById[stageParentId] : undefined

        if (!linkedTeamRoot || !stageParentId) {
          accumulator[rawTag] = inputValuesByKey[rawTag] ?? ""
          return accumulator
        }

        const baseTag = stripTeamStageSuffix(rawTag)
        const explicitTab = getTeamStageTagSuffix(rawTag)
        const scope = asset.teamStageScope ?? (explicitTab === "general" ? "general" : "teams")

        const tabsToPopulate = explicitTab
          ? [explicitTab]
          : getTeamStageTabs(linkedTeamRoot.addGeneralComments).filter((tab) =>
              tab === "general" ? scope === "general" : scope !== "general"
            )

        tabsToPopulate.forEach((tab) => {
          const outputTag = `${baseTag}-${tab}`
          const scopedKey = getTeamStageScopedKey(baseTag, stageParentId, tab)
          const fallbackValue = tab === linkedTeamRoot.selectedTab ? inputValuesByKey[rawTag] : undefined

          accumulator[outputTag] = inputValuesByKey[scopedKey] ?? fallbackValue ?? accumulator[outputTag] ?? ""
        })

        return accumulator
      }, {})

    const uniqueToggleTags = [
      ...new Set(
        scoutAssets
          .filter((asset): asset is ToggleSwitchAsset => asset.type === "toggle-switch")
          .map((asset) => (asset.tag && asset.tag.trim().length > 0 ? asset.tag : asset.id))
      ),
    ]

    const sliderAssetsByTag = scoutAssets.reduce<Record<string, SliderAsset>>((accumulator, asset) => {
      if (asset.type !== "slider") return accumulator
      if (typeof asset.tag !== "string" || asset.tag.trim().length === 0) return accumulator

      accumulator[asset.tag] = asset
      return accumulator
    }, {})

    const uniqueSliderTags = Object.keys(sliderAssetsByTag)

    const uniqueModePrefixedTags = [
      ...new Set(
        [...buttonAndIconTagScopeEntries, ...successTagScopeEntries].flatMap((entry) => {
          const normalizedTag = stripModePrefix(entry.tag)
          if (!normalizedTag) return []

          if (entry.autoTeleopScope === "auto" || entry.autoTeleopScope === "teleop") {
            return [`${entry.autoTeleopScope}.${normalizedTag}`]
          }

          return [`auto.${normalizedTag}`, `teleop.${normalizedTag}`]
        })
      ),
    ]

    uniqueModePrefixedTags.forEach((tag) => {
      output[tag] = 0
    })

    Object.entries(inputOutputByTag).forEach(([tag, value]) => {
      output[tag] = value
    })

    uniqueToggleTags.forEach((tag) => {
      output[tag] = false
    })

    uniqueSliderTags.forEach((tag) => {
      const asset = sliderAssetsByTag[tag]
      const max = Math.max(1, Math.round(asset.sliderMax ?? 100))
      const defaultValue = Math.max(0, Math.min(max, Math.round(asset.sliderMid ?? 50)))
      const liveValue = previewSliderValues[asset.id]
      output[tag] = Math.max(0, Math.min(max, Math.round(liveValue ?? defaultValue)))
    })

    uniqueModePrefixedTags.forEach((tag) => {
      output[tag] = tagStack.filter((stackTag) => stackTag === tag).length
    })

    uniqueToggleTags.forEach((tag) => {
      output[tag] = toggleValuesByKey[tag] ?? false
    })

    const encodedPitAnswers =
      scoutFormTypeCode === 2 && pitQuestions.length > 0
        ? pitQuestions
            .map((question, index) => `${index + 1}=${encodePitQuestionAnswer(question, pitAnswersByQuestionId[question.id])}`)
            .join(";")
        : ""

    if (encodedPitAnswers.length > 0) {
      output.pqv = 1
      output.pq = encodedPitAnswers
    }

    const selectedTeamTab = normalizeTeamStageTab(teamValue)
    const mappedTeamValueFromSchedule =
      selectedScheduleMatch && selectedTeamTab && selectedTeamTab !== "general"
        ? selectedTeamTab === "b1"
          ? selectedScheduleMatch.blueTeamKeys[0]
          : selectedTeamTab === "b2"
            ? selectedScheduleMatch.blueTeamKeys[1]
            : selectedTeamTab === "b3"
              ? selectedScheduleMatch.blueTeamKeys[2]
              : selectedTeamTab === "r1"
                ? selectedScheduleMatch.redTeamKeys[0]
                : selectedTeamTab === "r2"
                  ? selectedScheduleMatch.redTeamKeys[1]
                  : selectedScheduleMatch.redTeamKeys[2]
        : null
    const outputTeamValue = mappedTeamValueFromSchedule
      ? teamKeyToTeamNumber(mappedTeamValueFromSchedule)
      : teamValue

    const scoutTypeLabel = scoutFormTypeCode === 1 ? "qualitative" : scoutFormTypeCode === 2 ? "pit" : "match"

    output.match = selectedMatchNumber ?? 0
    output.team = outputTeamValue
    output.scouter = scouterName
    output.scoutType = scoutTypeLabel

    const startPositionAssets = scoutAssets.filter(
      (asset): asset is StartPositionAsset => asset.type === "start-position"
    )

    const firstSelectedStartPosition = startPositionAssets
      .map((asset) => {
        const locked = lockedStartPositionByAssetId[asset.id]
        if (
          locked &&
          typeof locked.xRatio === "number" &&
          Number.isFinite(locked.xRatio) &&
          typeof locked.yRatio === "number" &&
          Number.isFinite(locked.yRatio)
        ) {
          return { xRatio: locked.xRatio, yRatio: locked.yRatio }
        }

        const live = startPositionsByAssetId[asset.id]
        if (
          live &&
          typeof live.xRatio === "number" &&
          Number.isFinite(live.xRatio) &&
          typeof live.yRatio === "number" &&
          Number.isFinite(live.yRatio)
        ) {
          return { xRatio: live.xRatio, yRatio: live.yRatio }
        }

        return null
      })
      .find((position) => position !== null)

    const robotPositionPayload =
      startPositionAssets.length > 0 && firstSelectedStartPosition
        ? [
            Number(firstSelectedStartPosition.xRatio.toFixed(6)),
            Number(firstSelectedStartPosition.yRatio.toFixed(6)),
          ]
        : []

    const scoutTypePayload: [0 | 1 | 2] = [scoutFormTypeCode]

    const mapping = fieldMapping?.mapping ?? {}
    const tagToId = Object.entries(mapping).reduce<Record<string, string>>((accumulator, [id, tag]) => {
      accumulator[tag] = id
      return accumulator
    }, {})

    let finalPayloadObject: unknown

    if (scoutFormTypeCode === 2) {
      finalPayloadObject = {
        scouter: scouterName,
        team: outputTeamValue,
        match: selectedMatchNumber ?? 0,
        scoutType: scoutTypeLabel,
        ft: scoutTypePayload,
        pqv: 1,
        pq: encodedPitAnswers,
      }
    } else if (isEventTimeTrackingEnabled && fieldMapping) {
      const timelineEntries: string[] = []
      const successIds = new Set((fieldMapping.success ?? []).map((id) => String(id)))
      const timelineStartAtMs = matchTimelineStartAtMs
      const timelineStopAtMs = getNowMs()
      const sortedRuntimeEvents = runtimeEvents.slice().sort((left, right) => left.atMs - right.atMs)

      if (typeof timelineStartAtMs === "number") {
        sortedRuntimeEvents.forEach((event) => {
          if (event.atMs < timelineStartAtMs) return
          if (event.atMs > timelineStopAtMs) return
          if (typeof event.key !== "string" || event.key.trim().length === 0) return

          const eventKey = event.key.trim()
          const mappedId = tagToId[eventKey]
          if (!mappedId) return

          const timeCs = Math.max(0, Math.round((event.atMs - timelineStartAtMs) / 10))

          if (event.type === "tap") {
            if (eventKey.endsWith(".success") || eventKey.endsWith(".fail")) return
            const value = Math.max(0, Math.round(event.valueDelta ?? 0))
            if (value <= 0) return
            timelineEntries.push(`${mappedId}:${timeCs}:${value}`)
            return
          }

          if (event.type === "hold-end") {
            const holdValueCs = Math.max(0, Math.round((event.durationMs ?? 0) / 10))
            if (holdValueCs <= 0) return
            timelineEntries.push(`${mappedId}:${timeCs}:${holdValueCs}`)
            return
          }

          if (event.type === "success-select") {
            const value = Math.max(1, Math.round(event.valueDelta ?? 1))
            const suffix = event.value === "success" ? "s" : event.value === "fail" ? "f" : null
            if (suffix && successIds.has(mappedId)) {
              timelineEntries.push(`${mappedId}:${timeCs}:${value}:${suffix}`)
              return
            }
            timelineEntries.push(`${mappedId}:${timeCs}:${value}`)
          }
        })
      }

      const textValues = (fieldMapping.text ?? []).map((id) => {
        const mappedTag = mapping[String(id)]
        if (!mappedTag) return ""
        const textValue = inputValuesByKey[mappedTag]
        return typeof textValue === "string" ? textValue : ""
      })

      const metaValues = (fieldMapping.meta ?? []).map((id) => {
        const mappedTag = mapping[String(id)]
        if (!mappedTag) return 0

        const toggleValue = toggleValuesByKey[mappedTag]
        if (typeof toggleValue === "boolean") {
          return toggleValue ? 1 : 0
        }

        const sliderAsset = sliderAssetsByTag[mappedTag]
        if (sliderAsset) {
          const max = Math.max(1, Math.round(sliderAsset.sliderMax ?? 100))
          const fallbackValue = Math.max(0, Math.min(max, Math.round(sliderAsset.sliderMid ?? 50)))
          const sliderValue = previewSliderValues[sliderAsset.id]
          return Math.max(0, Math.min(max, Math.round(sliderValue ?? fallbackValue)))
        }

        const numericOutput = output[mappedTag]
        if (typeof numericOutput === "number" && Number.isFinite(numericOutput)) {
          return Math.round(numericOutput)
        }

        if (typeof numericOutput === "boolean") {
          return numericOutput ? 1 : 0
        }

        return 0
      })

      const parsedTeamNumber = toNonNegativeWholeNumber(outputTeamValue)

      finalPayloadObject = {
        t: timelineEntries.join(","),
        s: textValues.join("|"),
        b: metaValues,
        d: [selectedMatchNumber ?? 0, parsedTeamNumber ?? outputTeamValue, scouterName],
        p: robotPositionPayload,
        ft: scoutTypePayload,
        scoutType: scoutTypeLabel,
      }
    } else {
      const payloadObject = {
        ...output,
        match: selectedMatchNumber ?? 0,
        team: outputTeamValue,
        scouter: scouterName,
      }

      const mappedPayload = applyFieldMappingToOutput(payloadObject, fieldMapping)
      finalPayloadObject = {
        ...mappedPayload,
        p: robotPositionPayload,
        ft: scoutTypePayload,
      }
    }

    const previewPayloadObject =
      scoutFormTypeCode === 2
        ? {
            ...(finalPayloadObject as Record<string, unknown>),
            pitAnswersEncoded: encodedPitAnswers,
          }
        : {
            ...output,
            pitAnswersEncoded: encodedPitAnswers || null,
            robotPosition:
              robotPositionPayload.length === 2
                ? { x: robotPositionPayload[0], y: robotPositionPayload[1] }
                : null,
            scoutType: {
              code: scoutFormTypeCode,
              label: scoutTypeLabel,
            },
          }

    const payloadJson = JSON.stringify(finalPayloadObject)
    const previewPayloadJson = JSON.stringify(previewPayloadObject, null, 2)
    setSubmitPayloadJson(payloadJson)
    setSubmitPayloadPreviewJson(previewPayloadJson)

    try {
      const qrDataUrl = await QRCode.toDataURL(payloadJson, {
        width: 1600,
        margin: 1,
      })
      setSubmitQrCodeUrl(qrDataUrl)
    } catch {
      setSubmitQrCodeUrl(null)
    }

    setIsSubmitDialogOpen(true)

    console.log("[ScoutPage] submit payload:", finalPayloadObject)
  }, [
    TEAM_SELECT_TAG,
    fieldMapping,
    getNowMs,
    inputValuesByKey,
    isEventTimeTrackingEnabled,
    matchTimelineStartAtMs,
    runtimeEvents,
    scoutAssets,
    scoutFormTypeCode,
    scouterName,
    selectedMatchNumber,
    selectedScheduleMatch,
    startPositionsByAssetId,
    tagStack,
    teamValue,
    teamStageTabByRootId,
    lockedStartPositionByAssetId,
    previewSliderValues,
    pitAnswersByQuestionId,
    pitQuestions,
    toggleValuesByKey,
    stopAllActiveHolds,
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
      style={{ backgroundColor: "#030919" }}
    >
      <div
        className={cn(
          "relative",
          isFullscreen ? "h-[100dvh]" : "min-h-[calc(100vh-3.5rem)]"
        )}
        onPointerDownCapture={(event) => {
          if (!isPreviewButtonSliderDragging) return
          const target = event.target as HTMLElement | null
          if (target?.closest("[data-button-slider-drag='true']")) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onClickCapture={(event) => {
          if (!isPreviewButtonSliderDragging) return
          const target = event.target as HTMLElement | null
          if (target?.closest("[data-button-slider-drag='true']")) return
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (!previewStageParentId) return

          setPreviewStageParentId(null)
          recordRuntimeEvent({
            type: "stage-exit",
            key: previewStageParentId,
            value: "background",
          })
        }}
      >
        {scoutFormTypeCode === 2 ? (
          <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-4">
              <div className="rounded-xl border border-white/20 bg-slate-900/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-white">Pit Scouting Form</h2>
                    <p className="text-sm text-white/70">Complete each question, then submit the QR payload.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                    <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-1">
                      Scouter: {scouterName || "Unknown"}
                    </span>
                    <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-1">Type: pit</span>
                    {selectedMatchNumber !== null ? (
                      <span className="rounded-md border border-white/20 bg-slate-950/70 px-2 py-1">
                        Match: {selectedMatchNumber}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={teamValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setTeamValue(event.target.value)}
                    placeholder="Team number"
                    aria-label="Team number"
                    className="border-white/20 bg-slate-950/90 text-white placeholder:text-white/45"
                  />
                  <Button type="button" onClick={handleSubmit} className="sm:w-28">
                    Submit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(true)} className="sm:w-28">
                    Reset
                  </Button>
                </div>
              </div>

              {pitQuestions.length === 0 ? (
                <div className="rounded-xl border border-white/15 bg-slate-900/70 p-6 text-sm text-white/75">
                  No pit questions were found in payload.editorState.postMatchQuestions.
                </div>
              ) : (
                pitQuestions.map((question, questionIndex) => {
                  const rawAnswer = pitAnswersByQuestionId[question.id] ?? getDefaultPitAnswer(question)

                  return (
                    <div
                      key={question.id}
                      className="rounded-xl border border-white/15 bg-slate-900/80 p-4 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                        Question {questionIndex + 1}
                      </p>
                      <p className="mt-1 text-base font-medium text-white">{question.text}</p>

                      {question.type === "text" ? (
                        <textarea
                          value={typeof rawAnswer === "string" ? rawAnswer : ""}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                            setPitAnswersByQuestionId((previous) => ({
                              ...previous,
                              [question.id]: event.target.value,
                            }))
                          }}
                          rows={4}
                          placeholder="Type your answer"
                          className="mt-3 w-full resize-y rounded-md border border-white/20 bg-slate-950/90 px-3 py-2 text-sm text-white placeholder:text-white/45"
                        />
                      ) : null}

                      {question.type === "slider" ? (
                        <div className="mt-3 space-y-2">
                          <div className="text-sm font-semibold text-white">
                            {typeof rawAnswer === "number" ? Math.round(rawAnswer) : Math.round(question.sliderMin)}
                          </div>
                          <input
                            type="range"
                            min={Math.round(question.sliderMin)}
                            max={Math.round(question.sliderMax)}
                            step={1}
                            value={typeof rawAnswer === "number" ? Math.round(rawAnswer) : Math.round(question.sliderMin)}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                              const nextValue = Number(event.target.value)
                              setPitAnswersByQuestionId((previous) => ({
                                ...previous,
                                [question.id]: Number.isFinite(nextValue) ? nextValue : question.sliderMin,
                              }))
                            }}
                            className="h-6 w-full accent-sky-300"
                          />
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>{question.sliderLeftText}</span>
                            <span>{question.sliderRightText}</span>
                          </div>
                        </div>
                      ) : null}

                      {question.type === "all-that-apply" ? (
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const selectedIndexes = Array.isArray(rawAnswer)
                              ? rawAnswer.filter((entry): entry is number => typeof entry === "number")
                              : []
                            const isChecked = selectedIndexes.includes(optionIndex)

                            return (
                              <label key={`${question.id}-multi-${optionIndex}`} className="flex items-center gap-2 text-sm text-white/85">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setPitAnswersByQuestionId((previous) => {
                                      const current = Array.isArray(previous[question.id])
                                        ? (previous[question.id] as number[]).filter((entry) => Number.isInteger(entry))
                                        : []

                                      const next = event.target.checked
                                        ? [...current, optionIndex]
                                        : current.filter((entry) => entry !== optionIndex)

                                      return {
                                        ...previous,
                                        [question.id]: [...new Set(next)].sort((left, right) => left - right),
                                      }
                                    })
                                  }}
                                  className="h-4 w-4 rounded border-white/30 bg-slate-950 accent-sky-400"
                                />
                                <span>{option}</span>
                              </label>
                            )
                          })}
                        </div>
                      ) : null}

                      {question.type === "single-select" ? (
                        <RadioGroup
                          value={typeof rawAnswer === "number" && rawAnswer >= 0 ? String(rawAnswer) : ""}
                          onValueChange={(nextValue) => {
                            const parsed = Number(nextValue)
                            setPitAnswersByQuestionId((previous) => ({
                              ...previous,
                              [question.id]: Number.isInteger(parsed) ? parsed : null,
                            }))
                          }}
                          className="mt-3 space-y-2"
                        >
                          {question.options.map((option, optionIndex) => (
                            <label key={`${question.id}-single-${optionIndex}`} className="flex items-center gap-2 text-sm text-white/85">
                              <RadioGroupItem value={String(optionIndex)} id={`${question.id}-single-${optionIndex}`} />
                              <span>{option}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div
            className="absolute inset-0 select-none"
            style={{
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
            onCopy={(event) => {
              event.preventDefault()
            }}
            onDragStart={(event) => {
              event.preventDefault()
            }}
          >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt="Field background"
            className="pointer-events-none absolute select-none"
            style={
              renderedBackgroundBounds
                ? {
                    left: renderedBackgroundBounds.left,
                    top: renderedBackgroundBounds.top,
                    width: renderedBackgroundBounds.width,
                    height: renderedBackgroundBounds.height,
                    objectFit: "fill",
                  }
                : {
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }
            }
          />
        ) : null}

        {isFallbackFullscreen ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border border-white/15 bg-slate-900/90 px-3 py-1 text-xs text-white/80 shadow-sm">
            App fullscreen mode (native fullscreen is not available on this browser)
          </div>
        ) : null}

        {activePreviewStageRoot?.stageBlurBackgroundOnClick ? (
          <div className="pointer-events-none absolute inset-0 z-10 backdrop-blur-[2px]" />
        ) : null}

        {coverAssets.map((asset, index) => {
          const commonStyle = getAssetStyle(asset, true)

          return (
            <div
              key={asset.id ?? `cover-${index}`}
              className="absolute rounded-md border border-white/10 bg-slate-900 transition-all duration-150 ease-out"
              style={commonStyle}
              onClick={() => {
                if (!previewStageParentId) return
                setPreviewStageParentId(null)
                recordRuntimeEvent({
                  type: "stage-exit",
                  key: previewStageParentId,
                  value: "cover",
                })
              }}
            />
          )
        })}
        {buttonAssets.map((asset, index) => {
          const baseStyle = getAssetStyle(asset, false)
          const sizedStyle = getAssetStyle(asset, true)

          if (asset.type === "icon-button") {
            const Icon = getLucideIcon(asset.iconName)
            const hasStageBadge = Boolean(asset.stageParentTag) || stageRootIds.has(asset.id)
            const runtimeKey = normalizeRuntimeTag(getAssetRuntimeKey(asset))
            const isHoldMode = (asset.buttonPressMode ?? "tap") === "hold"
            const holdDurationMs = previewHoldDurationsById[asset.id]
            const showHoldTimer = isHoldMode && typeof holdDurationMs === "number"
            const previewSuccessOpen = previewSuccessOpenByAssetId[asset.id] === true

            return (
              <Button
                key={asset.id ?? `icon-button-${index}`}
                type="button"
                variant="outline"
                className="absolute rounded-lg border border-white/20 bg-slate-900 p-0 text-white hover:bg-slate-900 active:scale-[0.97] active:ring-2 active:ring-sky-300/70"
                style={sizedStyle}
                onClick={() => {
                  if (asset.successTrackingEnabled) {
                    onPreviewSuccessToggle(asset.id)
                    return
                  }
                  if (isHoldMode) return
                  if (handleStageToggle(asset)) return
                  pushTagToStack(runtimeKey, asset.increment ?? 1, asset.id, runtimeKey)
                }}
                onPointerDown={() => startHoldForAsset(asset)}
                onPointerUp={() => stopHoldForAsset(asset.id, runtimeKey)}
                onPointerCancel={() => stopHoldForAsset(asset.id, runtimeKey)}
                onPointerLeave={() => stopHoldForAsset(asset.id, runtimeKey)}
              >
                {showHoldTimer ? (
                  <span className="font-mono text-xs tabular-nums">{(holdDurationMs / 1000).toFixed(2)}s</span>
                ) : (
                  <Icon
                    className="h-5 w-5"
                    style={{
                      stroke: asset.outlineColor ?? "currentColor",
                      fill: asset.fillColor ?? "none",
                    }}
                  />
                )}
                {asset.successTrackingEnabled ? (
                  <span className="pointer-events-none absolute -left-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-900 text-emerald-200">
                    <LucideIcons.Check className="h-2.5 w-2.5" />
                  </span>
                ) : null}
                {hasStageBadge ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                    <LucideIcons.ChevronDown className="h-3 w-3" />
                  </span>
                ) : null}
                {previewSuccessOpen ? (
                  <span
                    className="absolute inset-0 z-40 grid grid-cols-2 overflow-hidden rounded-md"
                    style={{
                      transform: `translate(${asset.successPopoverOffsetX ?? 0}px, ${asset.successPopoverOffsetY ?? 0}px)`,
                    }}
                  >
                    <button
                      type="button"
                      className="flex items-center justify-center bg-emerald-600/90 text-white"
                      onClick={(event) => {
                        event.stopPropagation()
                        onPreviewSuccessSelect(asset, "success")
                      }}
                    >
                      <LucideIcons.Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center bg-rose-600/90 text-white"
                      onClick={(event) => {
                        event.stopPropagation()
                        onPreviewSuccessSelect(asset, "fail")
                      }}
                    >
                      <LucideIcons.X className="h-4 w-4" />
                    </button>
                  </span>
                ) : null}
              </Button>
            )
          }

          if (asset.type === "button-slider") {
            const drag = previewButtonSliderDragById[asset.id]
            const sliderValue = previewButtonSliderValues[asset.id]
            const sliderSpeedPerSecond = previewButtonSliderSpeedById[asset.id] ?? 0
            const isPressed = Boolean(drag)
            const shouldShowLiveValue = isPressed && typeof sliderValue === "number"
            const fieldBoundsWidth = measuredFieldBounds?.width ?? containerSize.width
            const fieldBoundsHeight = measuredFieldBounds?.height ?? containerSize.height
            const sliderPixelWidth = fieldBoundsWidth * (asset.width / 100)
            const sliderPixelHeight = fieldBoundsHeight * (asset.height / 100)
            const sliderValueFontSizePx = Math.max(
              12,
              Math.min(36, Math.round(Math.min(sliderPixelWidth * 0.24, sliderPixelHeight * 0.55)))
            )
            const resolvedDisplayMode =
              asset.buttonSliderDisplayMode ?? (asset.iconName && asset.iconName.trim().length > 0 ? "icon" : "label")
            const shouldShowIcon = !shouldShowLiveValue && resolvedDisplayMode === "icon"
            const SliderIcon = shouldShowIcon && asset.iconName ? getLucideIcon(asset.iconName) : null

            const lineLeft = drag ? Math.min(drag.startX, drag.currentX) - drag.buttonLeft : 0
            const lineWidth = drag ? Math.max(1, Math.abs(drag.currentX - drag.startX)) : 0
            const lineMidpoint = lineLeft + lineWidth / 2
            const markerLeft = drag ? drag.currentX - drag.buttonLeft : 0

            return (
              <Button
                key={asset.id ?? `button-slider-${index}`}
                type="button"
                variant="outline"
                data-button-slider-drag="true"
                className="absolute overflow-visible rounded-lg border border-white/20 bg-slate-900 p-0 text-white hover:bg-slate-900 active:scale-[0.97] active:ring-2 active:ring-sky-300/70"
                style={sizedStyle}
                onPointerDown={(event) => {
                  handlePreviewButtonSliderDragStart(asset, event)
                }}
                onPointerMove={(event) => {
                  handlePreviewButtonSliderDragMove(asset.id, event.clientX)
                }}
                onPointerUp={() => {
                  handlePreviewButtonSliderDragEnd(asset)
                }}
                onPointerCancel={() => {
                  handlePreviewButtonSliderDragEnd(asset)
                }}
              >
                {shouldShowLiveValue ? (
                  <span
                    className="relative z-30 rounded bg-slate-900/90 px-1 font-mono tabular-nums"
                    style={{ fontSize: `${sliderValueFontSizePx}px`, lineHeight: 1 }}
                  >
                    {sliderValue}
                  </span>
                ) : shouldShowIcon && SliderIcon ? (
                  <SliderIcon
                    className="relative z-30 h-5 w-5"
                    style={{
                      stroke: asset.outlineColor ?? "currentColor",
                      fill: asset.fillColor ?? "none",
                    }}
                  />
                ) : (
                  <span className="relative z-30">{asset.label ?? "Button Slider"}</span>
                )}

                {drag ? (
                  <div className="pointer-events-none absolute left-0 top-1/2 z-10 h-0 w-full -translate-y-1/2 overflow-visible">
                    <div
                      className="absolute h-1.5 rounded-full bg-sky-300"
                      style={{
                        left: lineLeft,
                        width: lineWidth,
                      }}
                    />
                    <div
                      className="absolute -translate-x-1/2 rounded border border-white/20 bg-slate-900/95 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200"
                      style={{
                        left: lineMidpoint,
                        top: -20,
                      }}
                    >
                      {sliderSpeedPerSecond >= 0 ? "+" : ""}
                      {sliderSpeedPerSecond.toFixed(1)}/s
                    </div>
                    <span
                      className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200 bg-slate-950"
                      style={{
                        left: markerLeft,
                        top: 0,
                      }}
                    />
                  </div>
                ) : null}
              </Button>
            )
          }

          if (asset.type === "slider") {
            const max = Math.max(1, Math.round(asset.sliderMax ?? 100))
            const value = Math.max(
              0,
              Math.min(
                max,
                previewSliderValues[asset.id] ?? Math.max(0, Math.min(max, Math.round(asset.sliderMid ?? 50)))
              )
            )
            const percent = max > 0 ? (value / max) * 100 : 0

            return (
              <div
                key={asset.id ?? `slider-${index}`}
                className="absolute rounded-md border border-white/15 bg-slate-900/90 p-2 transition-all duration-150 ease-out"
                style={sizedStyle}
              >
                <div className="relative flex h-full w-full flex-col justify-end gap-1 pt-4">
                  <div className="pointer-events-none absolute left-0 top-0 max-w-full truncate text-[10px] font-medium text-white/85">
                    {asset.label || "Slider"}
                  </div>

                  <div
                    className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-slate-950/95 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white"
                    style={{ left: `${percent}%` }}
                  >
                    {value}
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={1}
                    value={value}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      if (!isPreviewMode) return

                      const nextValue = Number(event.target.value)
                      const normalizedValue = Number.isFinite(nextValue) ? nextValue : 0
                      handlePreviewSliderChange(asset.id, normalizedValue)

                      recordRuntimeEvent({
                        type: "slider-change",
                        assetId: asset.id,
                        key: normalizeRuntimeTag(getAssetRuntimeKey(asset)),
                        value: Math.max(0, Math.round(normalizedValue)),
                      })
                    }}
                    className="h-5 w-full accent-sky-300"
                    aria-label={asset.label ?? "Slider"}
                  />

                  <div className="flex items-center justify-between text-[10px] text-white/70">
                    <span>{asset.sliderLeftText ?? "Low"}</span>
                    <span>{asset.sliderRightText ?? "High"}</span>
                  </div>
                </div>
              </div>
            )
          }

          if (asset.type === "input") {
            const baseInputKey =
              typeof asset.tag === "string" && asset.tag.trim().length > 0
                ? asset.tag
                : asset.id
            const linkedTeamStage =
              asset.stageParentId ? linkedTeamSelectStageByRootId.get(asset.stageParentId) : undefined
            const scopedInputStateKey =
              linkedTeamStage && asset.stageParentId
                ? getTeamStageScopedKey(
                    stripTeamStageSuffix(baseInputKey),
                    asset.stageParentId,
                    linkedTeamStage.selectedTab
                  )
                : baseInputKey
            const inputValue = inputValuesByKey[scopedInputStateKey] ?? inputValuesByKey[baseInputKey] ?? ""

            return (
              <Field
                key={asset.id ?? `input-${index}`}
                className="absolute flex h-full flex-col gap-2 transition-all duration-150 ease-out"
                style={sizedStyle}
              >
                {asset.label ? <FieldLabel className="text-xs text-white/80">{asset.label}</FieldLabel> : null}
                {asset.multiline ? (
                  <textarea
                    value={inputValue}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
                      const nextValue = event.target.value
                      setInputValuesByKey((previous) => ({
                        ...previous,
                        [scopedInputStateKey]: nextValue,
                      }))

                      recordRuntimeEvent({
                        type: "input-change",
                        assetId: asset.id,
                        key: scopedInputStateKey,
                        value: nextValue,
                      })
                    }}
                    placeholder={asset.placeholder}
                    aria-label={asset.label ?? "Input"}
                    className="h-full w-full resize-none rounded-md border border-white/15 bg-slate-900/90 px-3 py-2 text-sm text-white placeholder:text-white/50"
                  />
                ) : (
                  <Input
                    value={inputValue}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      const nextValue = event.target.value
                      setInputValuesByKey((previous) => ({
                        ...previous,
                        [scopedInputStateKey]: nextValue,
                      }))

                      recordRuntimeEvent({
                        type: "input-change",
                        assetId: asset.id,
                        key: scopedInputStateKey,
                        value: nextValue,
                      })
                    }}
                    placeholder={asset.placeholder}
                    aria-label={asset.label ?? "Input"}
                    className="h-full border-white/15 bg-slate-900/90 text-white placeholder:text-white/50"
                  />
                )}
              </Field>
            )
          }

          if (asset.type === "auto-toggle") {
            const orderedModes: readonly ControlMode[] = isSwapMirrored
              ? ["teleop", "auto"]
              : ["auto", "teleop"]
            const groupGap = 4
            const groupPadding = 4
            const fieldBoundsWidth = measuredFieldBounds?.width ?? containerSize.width
            const fieldBoundsHeight = measuredFieldBounds?.height ?? containerSize.height
            const togglePixelWidth = fieldBoundsWidth * (asset.width / 100)
            const togglePixelHeight = fieldBoundsHeight * (asset.height / 100)
            const textSize = Math.max(11, Math.min(15, Math.round(Math.min(togglePixelWidth * 0.09, togglePixelHeight * 0.42))))

            return (
              <ToggleGroup
                key={asset.id ?? `auto-toggle-${index}`}
                type="single"
                value={controlMode}
                onValueChange={handleAutoToggleGroupChange}
                className="absolute grid h-full w-full grid-cols-2 rounded-md border border-white/20 bg-slate-900/90 transition-all duration-150 ease-out"
                style={{ ...sizedStyle, gap: groupGap, padding: groupPadding }}
              >
                {orderedModes.map((mode) => (
                  <ToggleGroupItem
                    key={`${asset.id ?? `auto-toggle-${index}`}-${mode}`}
                    value={mode}
                    aria-label={mode === "auto" ? "Toggle auto" : "Toggle teleop"}
                    className="!h-full min-h-0 min-w-0 rounded-sm border border-transparent px-1 text-white/85 data-[state=on]:border-2 data-[state=on]:border-white data-[state=on]:bg-white data-[state=on]:font-semibold data-[state=on]:text-black"
                    style={{ fontSize: `${textSize}px` }}
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
            const toggleStyle = normalizeToggleStyle(asset.toggleStyle)
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
            const boxPixelSize = Math.max(12, Math.round(18 * switchScale))
            const boxIconSize = Math.max(9, Math.round(12 * switchScale))
            const resolvedTextSize = Math.max(6, textSize * switchScale)
            const toggleGap = Math.max(2, Math.round(8 * switchScale))

            const handleToggleValueChange = (checked: boolean) => {
              if (!isPreviewMode) return

              const atMs = getNowMs()

              setToggleValuesByKey((previous) => ({
                ...previous,
                [toggleKey]: checked,
              }))

              setToggleTransitionCountByKey((previous) => ({
                ...previous,
                [toggleKey]: (previous[toggleKey] ?? 0) + 1,
              }))

              setToggleLastChangedAtByKey((previous) => ({
                ...previous,
                [toggleKey]: atMs,
              }))

              recordRuntimeEvent({
                type: "toggle-change",
                assetId: asset.id,
                key: toggleKey,
                atMs,
                value: checked,
              })
            }

            const switchControl = (
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
                  onCheckedChange={handleToggleValueChange}
                />
              </div>
            )

            const boxControl = (
              <button
                type="button"
                className={`flex flex-none items-center justify-center rounded-md border transition-colors ${
                  isChecked
                    ? "border-emerald-300/60 bg-emerald-500/20 text-emerald-200"
                    : "border-white/20 bg-slate-800/80 text-white/70"
                }`}
                style={{
                  width: boxPixelSize,
                  height: boxPixelSize,
                }}
                onClick={() => {
                  if (!isPreviewMode) return
                  handleToggleValueChange(!isChecked)
                }}
                disabled={!isPreviewMode}
                aria-label={isChecked ? "Toggle true" : "Toggle false"}
              >
                {isChecked ? (
                  <LucideIcons.Check style={{ width: boxIconSize, height: boxIconSize }} />
                ) : (
                  <LucideIcons.X style={{ width: boxIconSize, height: boxIconSize }} />
                )}
              </button>
            )

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
                  {toggleStyle === "box" ? boxControl : switchControl}
                  {asset.label ? (
                    <Label
                      htmlFor={toggleId}
                      className={`min-w-0 truncate whitespace-nowrap leading-none text-white/80 ${textClass}`}
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

          if (asset.type === "start-position") {
            if (!isPreviewMode && asset.startPositionVisible === false) {
              return null
            }

            if (isPreviewMode && hiddenStartPositionIds[asset.id]) {
              return null
            }

            const selectedPoint = startPositionsByAssetId[asset.id]

            return (
              <div
                key={asset.id ?? `start-position-${index}`}
                className="absolute overflow-hidden rounded-md border border-emerald-300/55 bg-emerald-950/35 transition-all duration-150 ease-out"
                style={sizedStyle}
                onPointerDown={(event) => {
                  if (!isPreviewMode) return
                  handleStartPositionTap(asset, event)
                }}
              >
                <div className="pointer-events-none absolute left-2 top-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/90">
                  {asset.label ?? "Start Position"}
                </div>

                {selectedPoint ? (
                  <div
                    className="pointer-events-none absolute"
                    style={{
                      left: `${selectedPoint.xRatio * 100}%`,
                      top: `${selectedPoint.yRatio * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <span className="absolute -left-4 -top-4 h-8 w-8 rounded-full border border-emerald-200/40 bg-emerald-300/10 animate-ping" />
                    <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-emerald-200/70" />
                    <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-emerald-300" />
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-emerald-200/80">
                    Tap to mark start
                  </div>
                )}
              </div>
            )
          }

          if (asset.type === "movement") {
            const hasStageBadge = stageRootIds.has(asset.id)

            return (
              <Button
                key={asset.id ?? `movement-${index}`}
                type="button"
                variant="outline"
                className="group absolute rounded-lg border border-white/20 bg-slate-900 text-white transition-all duration-150 ease-out active:bg-slate-900 active:scale-[0.97] active:ring-2 active:ring-sky-300/70"
                style={sizedStyle}
                onClick={() => handleMovementAssetClick(asset)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {movementSharedDirection === "left" ? (
                    <LucideIcons.ArrowLeft className="h-4 w-4" />
                  ) : (
                    <LucideIcons.ArrowRight className="h-4 w-4" />
                  )}
                  <span>{asset.label ?? "Movement"}</span>
                </span>
                {hasStageBadge ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                    <LucideIcons.ChevronDown className="h-3 w-3" />
                  </span>
                ) : null}
              </Button>
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

            const visibleLogEntries = orderedTagsByMostRecent.map((stackTag) => {
              const holdMs = holdStatsByKey[stackTag]?.totalMs ?? 0
              const holdSuffix = holdMs > 0 ? ` | hold ${(holdMs / 1000).toFixed(2)}s` : ""
              return `${stackTag}: ${tagCounts.get(stackTag) ?? 0}${holdSuffix}`
            })

            const holdOnlyEntries = Object.entries(holdStatsByKey)
              .filter(([, stats]) => stats.totalMs > 0)
              .sort(([, left], [, right]) => {
                const leftMostRecent = left.segments[left.segments.length - 1]?.endMs ?? 0
                const rightMostRecent = right.segments[right.segments.length - 1]?.endMs ?? 0
                return rightMostRecent - leftMostRecent
              })
              .filter(([key]) => !tagCounts.has(key))
              .map(([key, stats]) => `${key}: hold ${(stats.totalMs / 1000).toFixed(2)}s`)

            const movementEntries = Object.entries(movementStatsByKey)
              .filter(([, stats]) => stats.toggleCount > 0 || stats.totalMs > 0)
              .sort(([, left], [, right]) => right.totalMs - left.totalMs)
              .map(
                ([key, stats]) =>
                  `${key}: move ${(stats.totalMs / 1000).toFixed(2)}s | toggles ${stats.toggleCount}`
              )

            const limitedLogEntries = [...visibleLogEntries, ...holdOnlyEntries, ...movementEntries].slice(
              0,
              visibleLineCount
            )

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
                    {limitedLogEntries.length > 0
                      ? limitedLogEntries.join("\n")
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
                    className="h-full w-full rounded-md border-white/20 bg-slate-800 text-sm font-semibold text-white/70 opacity-100 hover:bg-slate-800 active:bg-slate-800"
                    onClick={() => {
                      const nextValue = Math.max(0, currentMatchValue - 1)
                      setMatchValuesByKey((previous) => ({
                        ...previous,
                        [matchKey]: nextValue,
                      }))

                      recordRuntimeEvent({
                        type: "match-change",
                        assetId: asset.id,
                        key: matchKey,
                        value: nextValue,
                      })
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
                    className="h-full w-full rounded-md border-white/20 bg-slate-800 text-sm font-semibold text-white/70 opacity-100 hover:bg-slate-800 active:bg-slate-800"
                    onClick={() => {
                      const nextValue = currentMatchValue + 1
                      setMatchValuesByKey((previous) => ({
                        ...previous,
                        [matchKey]: nextValue,
                      }))

                      recordRuntimeEvent({
                        type: "match-change",
                        assetId: asset.id,
                        key: matchKey,
                        value: nextValue,
                      })
                    }}
                  >
                    {asset.incrementText ?? "+"}
                  </Button>
                </div>
              </div>
            )
          }

          if (asset.tag === TEAM_SELECT_TAG) {
            const teamTabs = getTeamStageTabs(asset.teamSelectAddGeneralComments === true)
            const preferredTab =
              teamStageTabByRootId[asset.id] ??
              normalizeTeamStageTab(asset.teamSelectDefaultTab) ??
              teamTabs[0] ??
              "b1"
            const selectedTeamTab = teamTabs.includes(preferredTab) ? preferredTab : teamTabs[0] ?? "b1"

            const teamSelectOptions = teamTabs.map((tab) => {
              const colorClassName = tab.startsWith("b")
                ? "text-sky-300"
                : tab.startsWith("r")
                  ? "text-rose-300"
                  : "text-slate-300"

              const teamInfo = tab === "general" ? undefined : selectedScheduleTeamInfoByTab[tab]
              const slotLabel = tab.toUpperCase()
              const teamLabel =
                teamInfo && teamInfo.displayName !== teamInfo.teamNumber
                  ? `${slotLabel}: ${teamInfo.teamNumber} ${teamInfo.displayName}`
                  : teamInfo
                    ? `${slotLabel}: ${teamInfo.teamNumber}`
                    : slotLabel

              return {
                value: tab,
                label: tab === "general" ? "general" : teamLabel,
                colorClassName,
              } satisfies TeamSelectOption
            })

            const selectedTeamOption =
              teamSelectOptions.find((option) => option.value === selectedTeamTab) ?? null

            const triggerToneClass = selectedTeamTab.startsWith("b")
              ? "!border-sky-300/60 !bg-sky-500/15 !text-sky-100 hover:!bg-sky-500/20"
              : selectedTeamTab.startsWith("r")
                ? "!border-rose-300/60 !bg-rose-500/15 !text-rose-100 hover:!bg-rose-500/20"
                : "!border-slate-300/60 !bg-slate-400/20 !text-slate-100 hover:!bg-slate-400/30"

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
                      className={cn(
                        "h-full w-full truncate px-2 text-left font-semibold",
                        triggerToneClass
                      )}
                    >
                      {selectedTeamOption?.label ?? selectedTeamTab}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <RadioGroup
                      value={selectedTeamTab}
                      onValueChange={(nextTeamValue) => {
                        const normalizedTeamTab = normalizeTeamStageTab(nextTeamValue)
                        if (!normalizedTeamTab) return

                        setTeamStageTabByRootId((previous) => ({
                          ...previous,
                          [asset.id]: normalizedTeamTab,
                        }))
                        setTeamValue(normalizedTeamTab)

                        recordRuntimeEvent({
                          type: "team-select-change",
                          assetId: asset.id,
                          key: TEAM_SELECT_TAG,
                          value: normalizedTeamTab,
                        })
                      }}
                    >
                      {teamSelectOptions.map((option, optionIndex) => (
                        <label
                          key={`team-option-${option.value}-${optionIndex}`}
                          className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5"
                        >
                          <RadioGroupItem value={option.value} id={`team-option-${optionIndex}`} />
                          <span className={`text-sm font-medium ${option.colorClassName}`}>{option.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          }

          const hasStageBadge = Boolean(asset.stageParentTag) || stageRootIds.has(asset.id)
          const runtimeKey = normalizeRuntimeTag(getAssetRuntimeKey(asset))
          const isHoldMode = (asset.buttonPressMode ?? "tap") === "hold" && asset.buttonKind === "button"
          const holdDurationMs = previewHoldDurationsById[asset.id]
          const holdContent =
            isHoldMode && typeof holdDurationMs === "number" ? `${(holdDurationMs / 1000).toFixed(2)}s` : null
          const previewSuccessOpen = previewSuccessOpenByAssetId[asset.id] === true
          const isSwapButton = asset.buttonKind === "swap"
          const isSubmitButton = asset.buttonKind === "submit"
          const isResetButton = asset.buttonKind === "reset"
          const swapBorderClass = isSwapButton
            ? isSwapped
              ? "!border-2 !border-blue-400"
              : "!border-2 !border-red-400"
            : "border-white/20"
          const buttonToneClass = isSubmitButton
            ? "!bg-white !text-black hover:!bg-white active:!bg-white"
            : isResetButton
              ? "!bg-[#9e4042] !text-white hover:!bg-[#9e4042] active:!bg-[#9e4042]"
              : "!bg-slate-900 !text-white hover:!bg-slate-900 active:!bg-slate-900"

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
                if (asset.buttonKind === "button" && asset.successTrackingEnabled) {
                  onPreviewSuccessToggle(asset.id)
                  return
                }

                if (asset.buttonKind === "button" && handleStageToggle(asset)) {
                  return
                }

                if (asset.buttonKind === "undo") {
                  handleUndo()
                  return
                }

                if (asset.buttonKind === "redo") {
                  handleRedo()
                  return
                }

                if (
                  asset.buttonKind !== "submit" &&
                  asset.buttonKind !== "reset" &&
                  asset.buttonKind !== "swap"
                ) {
                  if (!isHoldMode) {
                    pushTagToStack(runtimeKey, asset.increment ?? 1, asset.id, runtimeKey)
                  }
                }

                if (asset.buttonKind === "submit") {
                  handleSubmit()
                }

                if (asset.buttonKind === "reset") {
                  setIsResetDialogOpen(true)
                  return
                }

                if (asset.buttonKind === "swap") {
                  handleSwapSides()
                }
              }}
              onPointerDown={() => {
                if (!isHoldMode) return
                startHoldForAsset(asset)
              }}
              onPointerUp={() => {
                if (!isHoldMode) return
                stopHoldForAsset(asset.id, runtimeKey)
              }}
              onPointerCancel={() => {
                if (!isHoldMode) return
                stopHoldForAsset(asset.id, runtimeKey)
              }}
              onPointerLeave={() => {
                if (!isHoldMode) return
                stopHoldForAsset(asset.id, runtimeKey)
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
                holdContent ?? asset.text ?? "Button"
              )}
              {asset.buttonKind === "button" && asset.successTrackingEnabled ? (
                <span className="pointer-events-none absolute -left-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-900 text-emerald-200">
                  <LucideIcons.Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
              {hasStageBadge ? (
                <span className="pointer-events-none absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-sky-300">
                  <LucideIcons.ChevronDown className="h-3 w-3" />
                </span>
              ) : null}
              {asset.buttonKind === "button" && previewSuccessOpen ? (
                <span
                  className="absolute inset-0 z-40 grid grid-cols-2 overflow-hidden rounded-md"
                  style={{
                    transform: `translate(${asset.successPopoverOffsetX ?? 0}px, ${asset.successPopoverOffsetY ?? 0}px)`,
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center justify-center bg-emerald-600/90 text-white"
                    onClick={(event) => {
                      event.stopPropagation()
                      onPreviewSuccessSelect(asset, "success")
                    }}
                  >
                    <LucideIcons.Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center bg-rose-600/90 text-white"
                    onClick={(event) => {
                      event.stopPropagation()
                      onPreviewSuccessSelect(asset, "fail")
                    }}
                  >
                    <LucideIcons.X className="h-4 w-4" />
                  </button>
                </span>
              ) : null}
            </Button>
          )
        })}
          </div>
        )}
      </div>
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="flex h-[94vh] w-[96vw] max-w-[96vw] flex-col sm:max-w-6xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>Submit QR Code</DialogTitle>
            <DialogDescription>
              Scan to read the submitted scouting JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-slate-950/70 p-2">
              {submitQrCodeUrl ? (
                <img
                  src={submitQrCodeUrl}
                  alt="Submitted scouting JSON QR code"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="text-muted-foreground text-sm">Unable to generate QR code.</div>
              )}
            </div>
            <pre className="text-muted-foreground max-h-[26vh] overflow-auto rounded-md bg-muted/30 p-3 text-xs whitespace-pre-wrap">
              {submitPayloadPreviewJson}
            </pre>
          </div>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Scouting Data?</DialogTitle>
            <DialogDescription>
              This will clear all current scouting entries for this match and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                handleResetScoutingData()
                setIsResetDialogOpen(false)
              }}
            >
              Reset Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
