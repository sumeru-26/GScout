# Mini Scout View Rendering Guide (Button-Only, No Functionality)

This guide shows exactly how to build a **mini scout renderer** that:

- draws the field image,
- places assets from payload coordinates correctly,
- scales correctly when the container resizes,
- renders only button-like assets,
- ignores covers, text fields, toggles, and user action buttons (`undo`, `redo`, `submit`, `reset`).

The implementation below is intentionally **render-only** (no click behavior/state logic).

---

## 1) Scope and Render Rules

### Included asset types

- `button` (except user action buttons)
- `icon-button`
- `button-slider` (rendered as a static button-style tile)

### Excluded asset types

- `cover`
- `text-input`
- `toggle-switch`
- `auto-toggle`
- `log-view`
- `team-select`
- `match-select`
- `slider`
- `start-position`
- `swap-sides`
- any unknown types

### Extra exclusion for user-action buttons

If a `button` has:

- `action` in `{undo, redo, submit, reset}`
- OR `text` in `{Undo, Redo, Submit, Reset}` (case-insensitive)

then skip rendering.

---

## 2) Coordinate System and Scaling

Payload uses normalized coordinate space:

- Position axes: $x, y \in [-100, 100]$
- Width/height are percentage-like values relative to field size.

### Convert payload position to percentages

$$x_{pct} = \frac{x + 100}{200} \cdot 100$$

$$y_{pct} = 100 - \left(\frac{y + 100}{200} \cdot 100\right)$$

The y expression flips vertical axis so top-left DOM origin aligns with scout coordinates.

### Convert to pixels inside field bounds

If `fieldBounds = { left, top, width, height }`:

$$left_{px} = left + width \cdot \frac{x_{pct}}{100}$$

$$top_{px} = top + height \cdot \frac{y_{pct}}{100}$$

$$width_{px} = width \cdot \frac{assetWidth}{100}$$

$$height_{px} = height \cdot \frac{assetHeight}{100}$$

Render each asset with `transform: translate(-50%, -50%)` so x/y stays center-based (matching editor behavior).

---

## 3) Why `getContainedBounds` is Required

The field image usually uses `object-fit: contain`. That means there may be letterboxing (empty side/top bars).

If you map coordinates against the full container instead of the **contained image rectangle**, assets drift off correct positions.

So compute:

1. container size
2. image natural size (or known aspect ratio)
3. contained rectangle (`left`, `top`, `width`, `height`)

Then place assets inside that rectangle.

---

## 4) Complete Mini Renderer Code

```tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type CompactEntry = Record<string, Record<string, unknown>>

type MiniButtonAsset = {
  id: string
  kind: "button" | "icon-button" | "button-slider"
  x: number
  y: number
  width: number
  height: number
  text?: string
  icon?: string
  tag?: string
}

type BoxSize = { width: number; height: number }
type BoxBounds = { left: number; top: number; width: number; height: number }

type MiniScoutFieldProps = {
  payloadObject: unknown
  fieldImageUrl: string
  className?: string
}

const EXCLUDED_ACTIONS = new Set(["undo", "redo", "submit", "reset"])
const EXCLUDED_BUTTON_TEXT = new Set(["undo", "redo", "submit", "reset"])

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null
  return Number.isFinite(value) ? value : null
}

function clampPositionScale(value: number) {
  return Math.max(-100, Math.min(100, value))
}

function clampSizeScale(value: number) {
  return Math.max(0, Math.min(100, value))
}

function toPercentFromScale(value: number) {
  return ((value + 100) / 200) * 100
}

function getContainedBounds(containerSize: BoxSize, contentSize: BoxSize): BoxBounds {
  const { width: cw, height: ch } = containerSize
  const { width: iw, height: ih } = contentSize

  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
    return { left: 0, top: 0, width: Math.max(0, cw), height: Math.max(0, ch) }
  }

  const scale = Math.min(cw / iw, ch / ih)
  const width = iw * scale
  const height = ih * scale

  return {
    left: (cw - width) / 2,
    top: (ch - height) / 2,
    width,
    height,
  }
}

function normalizeCompactPayloadItems(payloadEntries: unknown[]): Record<string, unknown>[] {
  return payloadEntries.reduce<Record<string, unknown>[]>((acc, entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return acc

    const sourceEntry = entry as CompactEntry
    const keys = Object.keys(sourceEntry)
    if (keys.length !== 1) return acc

    const sourceKind = keys[0]
    const sourceValue = sourceEntry[sourceKind]
    if (!sourceValue || typeof sourceValue !== "object" || Array.isArray(sourceValue)) return acc

    const source = sourceValue as Record<string, unknown>

    const left = toFiniteNumber(source.x1)
    const right = toFiniteNumber(source.x2)
    const top = toFiniteNumber(source.y1)
    const bottom = toFiniteNumber(source.y2)
    const hasBounds = left !== null && right !== null && top !== null && bottom !== null

    const x = toFiniteNumber(source.x) ?? (hasBounds ? ((left as number) + (right as number)) / 2 : null)
    const y = toFiniteNumber(source.y) ?? (hasBounds ? ((top as number) + (bottom as number)) / 2 : null)
    const width =
      toFiniteNumber(source.width) ?? (hasBounds ? Math.abs((right as number) - (left as number)) : null)
    const height =
      toFiniteNumber(source.height) ?? (hasBounds ? Math.abs((top as number) - (bottom as number)) : null)

    if (x === null || y === null || width === null || height === null) return acc

    const normalizedKind = sourceKind.trim().toLowerCase()
    const resolvedKind =
      normalizedKind === "icon-button"
        ? "icon-button"
        : normalizedKind === "button-slider"
          ? "button-slider"
          : normalizedKind

    acc.push({
      ...source,
      id:
        typeof source.id === "string" && source.id.trim().length > 0
          ? source.id.trim()
          : `${resolvedKind}-${index}`,
      type: resolvedKind,
      kind: resolvedKind,
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
      icon:
        typeof source.icon === "string"
          ? source.icon
          : typeof source.iconName === "string"
            ? source.iconName
            : undefined,
    })

    return acc
  }, [])
}

function getPayloadItems(payloadObject: unknown): Record<string, unknown>[] {
  if (!payloadObject || typeof payloadObject !== "object") return []

  const source = payloadObject as {
    payload?: unknown
    editorState?: { items?: unknown }
  }

  if (Array.isArray(source.payload)) {
    return normalizeCompactPayloadItems(source.payload)
  }

  if (Array.isArray(source.editorState?.items)) {
    return source.editorState.items.filter(
      (v): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v))
    )
  }

  return []
}

function shouldSkipUserActionButton(item: Record<string, unknown>) {
  const action = typeof item.action === "string" ? item.action.trim().toLowerCase() : ""
  if (EXCLUDED_ACTIONS.has(action)) return true

  const text = typeof item.text === "string" ? item.text.trim().toLowerCase() : ""
  return EXCLUDED_BUTTON_TEXT.has(text)
}

function parseMiniAssets(payloadObject: unknown): MiniButtonAsset[] {
  const items = getPayloadItems(payloadObject)

  return items
    .filter((item) => {
      const type = typeof item.type === "string" ? item.type.toLowerCase() : ""
      const kind = typeof item.kind === "string" ? item.kind.toLowerCase() : ""
      const resolved = type || kind

      // Only render button-like assets.
      if (resolved !== "button" && resolved !== "icon-button" && resolved !== "button-slider") {
        return false
      }

      if (resolved === "button" && shouldSkipUserActionButton(item)) {
        return false
      }

      return true
    })
    .map((item, index) => {
      const type = (typeof item.type === "string" ? item.type.toLowerCase() : "") as
        | "button"
        | "icon-button"
        | "button-slider"

      return {
        id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : `asset-${index}`,
        kind: type,
        x: clampPositionScale(toFiniteNumber(item.x) ?? 0),
        y: clampPositionScale(toFiniteNumber(item.y) ?? 0),
        width: clampSizeScale(toFiniteNumber(item.width) ?? 0),
        height: clampSizeScale(toFiniteNumber(item.height) ?? 0),
        text:
          typeof item.text === "string"
            ? item.text
            : typeof item.label === "string"
              ? item.label
              : undefined,
        icon: typeof item.icon === "string" ? item.icon : typeof item.iconName === "string" ? item.iconName : undefined,
        tag: typeof item.tag === "string" ? item.tag : undefined,
      }
    })
}

function iconGlyph(iconName?: string) {
  if (!iconName) return "◯"
  const cleaned = iconName.replace(/icon$/i, "").replace(/[^a-zA-Z0-9]/g, "")
  const short = cleaned.slice(0, 2).toUpperCase()
  return short.length > 0 ? short : "◯"
}

export function MiniScoutField({ payloadObject, fieldImageUrl, className }: MiniScoutFieldProps) {
  const [containerSize, setContainerSize] = useState<BoxSize>({ width: 0, height: 0 })
  const [imageNaturalSize, setImageNaturalSize] = useState<BoxSize | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const assets = useMemo(() => parseMiniAssets(payloadObject), [payloadObject])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const update = () => {
      setContainerSize({ width: element.clientWidth, height: element.clientHeight })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!fieldImageUrl) {
      setImageNaturalSize(null)
      return
    }

    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      setImageNaturalSize({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      if (cancelled) return
      setImageNaturalSize(null)
    }
    image.src = fieldImageUrl

    return () => {
      cancelled = true
    }
  }, [fieldImageUrl])

  const fieldBounds = useMemo(() => {
    if (containerSize.width <= 0 || containerSize.height <= 0) {
      return { left: 0, top: 0, width: 0, height: 0 }
    }

    if (!imageNaturalSize) {
      return {
        left: 0,
        top: 0,
        width: containerSize.width,
        height: containerSize.height,
      }
    }

    return getContainedBounds(containerSize, imageNaturalSize)
  }, [containerSize, imageNaturalSize])

  const getAssetStyle = (asset: MiniButtonAsset): React.CSSProperties => {
    const xPercent = toPercentFromScale(asset.x) / 100
    const yPercent = (100 - toPercentFromScale(asset.y)) / 100
    const widthPercent = asset.width / 100
    const heightPercent = asset.height / 100

    return {
      position: "absolute",
      left: fieldBounds.left + fieldBounds.width * xPercent,
      top: fieldBounds.top + fieldBounds.height * yPercent,
      width: Math.max(8, fieldBounds.width * widthPercent),
      height: Math.max(8, fieldBounds.height * heightPercent),
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.3)",
      background: "rgba(15, 23, 42, 0.92)",
      color: "white",
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1,
      pointerEvents: "none", // Render-only preview
      userSelect: "none",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      padding: "0 6px",
    }
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 320,
        background: "#020617",
        overflow: "hidden",
      }}
    >
      <img
        src={fieldImageUrl}
        alt="Field"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {assets.map((asset) => {
        const label =
          asset.kind === "icon-button"
            ? iconGlyph(asset.icon)
            : asset.kind === "button-slider"
              ? asset.text || asset.tag || "Slider"
              : asset.text || asset.tag || "Button"

        return (
          <div key={asset.id} style={getAssetStyle(asset)} title={asset.tag || asset.text || asset.icon || asset.id}>
            {label}
          </div>
        )
      })}
    </div>
  )
}
```

---

## 5) How Rendering Works for Your Sample Payload

Given your sample payload, this renderer will:

1. Read `payload[]` compact entries (single-key objects like `{ "button": {...} }`).
2. Normalize each item into common shape (`type`, `x`, `y`, `width`, `height`, `text`, `icon`).
3. Keep only `button`, `icon-button`, `button-slider`.
4. Remove user-action buttons (`Submit`, `Reset`, `Undo`, `Redo`).
5. Ignore `cover`, `text-input`, `toggle-switch`, etc.
6. Measure visible image bounds inside container.
7. Convert each normalized coordinate to pixel position and size.
8. Draw all resulting assets as static overlays.

This means staged children like `+1`, `+3`, `+5`, `+10`, `L1`, `L2/3`, etc. all render as long as they are button-like assets.

---

## 6) Example Usage

```tsx
import { MiniScoutField } from "./MiniScoutField"

const payloadObject = YOUR_SAMPLE_PAYLOAD_OBJECT

export default function MiniPreviewPage() {
  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <MiniScoutField
        payloadObject={payloadObject}
        fieldImageUrl="/fields/2026/your-field-image.png"
      />
    </div>
  )
}
```

---

## 7) Optional Tightening (If You Need It Later)

If you later want this mini view to mimic production visibility rules, add:

- stage-parent filtering,
- auto/teleop scope filtering,
- side-swapping reflection,
- true icon component mapping.

For your current goal (render-only, all button assets, no functionality), the code above is the simplest robust approach.
