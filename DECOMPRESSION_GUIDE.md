# GoonScout Compressed Payload Decompression Guide (Lossless)

This document explains, in **implementation-level detail**, how to decode both compressed payload formats into rich scouting JSON without losing information.

It is designed so another AI (or developer) can implement decoding deterministically and produce output like your two target formats.

---

## 1) Purpose and Scope

This guide covers **both** input formats:

1. **Event-time-tracking enabled** (timeline format)
   - Shape: `{ t: string, s: string, b: array, d: array }`
2. **Event-time-tracking disabled** (flat compact mapped IDs)
   - Shape: `{ "0": 24, "1": 33, ..., "10.s": 2, "10.f": 1, match, team, scouter }`

And maps them into expanded JSON shaped like:

- Mode-aware buckets (`auto`, `teleop`)
- Metric objects (`l1`, `passing`, `outpost`, etc.)
- Optional timeline `events` arrays (only with time tracking)
- Accuracy/attempt stats for metrics listed in `field_mapping.success`
- Text/meta restoration via `field_mapping.text` / `field_mapping.meta`

---

## 2) Required Inputs

Decoder requires:

1. `compressedPayload` (one of the two compressed formats)
2. `fieldMappingJson` with this structure:

```json
{
  "meta": [16, 20],
  "text": [17, 18, 19],
  "mapping": {
    "0": "auto.fuel",
    "1": "teleop.fuel",
    "2": "auto.l1",
    "3": "teleop.l1",
    "4": "auto.l3",
    "5": "teleop.l3",
    "6": "auto.passing",
    "7": "teleop.passing",
    "8": "auto.defense",
    "9": "teleop.defense",
    "10": "auto.outpost",
    "11": "teleop.outpost",
    "12": "auto.depot",
    "13": "teleop.depot",
    "14": "auto.humanplayer",
    "15": "teleop.humanplayer",
    "16": "bricked",
    "17": "good",
    "18": "bad",
    "19": "area",
    "20": "slider"
  },
  "success": [10, 11]
}
```

---

## 3) Core Concepts

## 3.1 ID ↔ Tag map

Build both directions:

- `idToTag`: from `mapping` (`"10" -> "auto.outpost"`)
- `tagToId`: inverse (`"auto.outpost" -> "10"`)

All compressed data uses IDs; all expanded output uses human-readable names.

## 3.2 Mode + metric

For mapped tags like `"auto.outpost"`, split at first dot:

- mode = `auto`
- metric = `outpost`

Supported mode keys for nested output:

- `auto`
- `teleop`

## 3.3 Success metrics

`success` array in field mapping contains IDs whose events/counters include success/fail semantics.

For these metrics:

- attempts = successes + fails
- accuracy = successes / attempts (0 if attempts = 0)

---

## 4) Detect Which Compressed Format You Have

Use strict shape detection:

### Event-time-tracking enabled if:

- payload has key `t` (string), and
- payload has key `s` (string), and
- payload has key `b` (array), and
- payload has key `d` (array)

### Otherwise treat as disabled flat format:

- payload has many numeric string keys (`"0"`, `"1"`, ...)
- may include success suffix keys (`"10.s"`, `"10.f"`)

---

## 5) Output Shape Targets

## 5.1 Shared top-level fields

Always restore these top-level fields when available:

- `match`
- `team`
- `scouter`
- all non-mode scalar tags (e.g. `bricked`, `slider`, `good`, `bad`, `area`)

## 5.2 Mode buckets

Create:

- `auto: {}`
- `teleop: {}`

Populate each mode with decoded metrics.

---

## 6) Decompressing Event-Time-Tracking Enabled Payload

Input shape:

```json
{
  "t": "10:139:1:s,0:515:3,8:730:69,...",
  "s": "thats rly good|they suck|WOWO",
  "b": [0,50],
  "d": [6,2374,"wdadw"]
}
```

## 6.1 Decode `d` (match metadata)

`d` index order is fixed:

- `d[0]` = `match`
- `d[1]` = `team`
- `d[2]` = `scouter`

Preserve team type as provided (string or number); if your target schema expects string, stringify.

## 6.2 Decode `s` (text values)

1. Split `s` by `|` into list `textParts`
2. Iterate `fieldMapping.text` by index order
3. For each text ID at index `i`:
   - tag = `idToTag[textId]` (e.g. `17 -> good`)
   - value = `textParts[i]` if present else `""`
   - assign output[tag] = value

Important:
- Preserve order from `fieldMapping.text`
- Do not reorder by tag name

## 6.3 Decode `b` (meta values)

1. Iterate `fieldMapping.meta` by index order
2. For each meta ID at index `i`:
   - tag = `idToTag[metaId]`
   - raw = `b[i]` if present else `0`
3. Type handling:
   - if tag is boolean metric (e.g. `bricked`), map 0/1 to false/true
   - if tag is slider-like metric (`slider`), keep numeric
   - fallback: keep numeric raw

Recommended boolean rule:
- If raw is boolean, keep it
- Else boolean = `Number(raw) !== 0`

## 6.4 Decode `t` timeline events

Timeline token format:

- normal event: `id:timeCs:value`
- success event: `id:timeCs:value:s`
- fail event: `id:timeCs:value:f`

Where:
- `id` = mapping ID as integer/string
- `timeCs` = centiseconds from match timeline start
- `value` = increment OR hold duration (also centiseconds for hold metrics)
- optional `s`/`f` only for success metrics

### Parsing algorithm

1. If `t` is empty string, no timeline events.
2. Else split by comma into event tokens.
3. For each token:
   - split by `:`
   - must have length 3 or 4
   - parts:
     - `idPart`
     - `timePart`
     - `valuePart`
     - optional `resultPart` (`s` or `f`)
4. Resolve tag via `idToTag[idPart]`. If unknown ID, store in `unknownEvents[]` (optional) and skip or preserve externally.
5. For known tag:
   - if tag has mode prefix (`auto.`/`teleop.`), route into that bucket
   - metric name = suffix after first dot
   - eventTimeSeconds = `timeCs / 100`

### Event object shape

For non-defense non-hold metrics:

```json
{ "time": 5.15, "value": 3 }
```

For success/fail events:

```json
{ "time": 1.39, "value": 1, "result": "success" }
```

For hold-time defense-style metrics:

```json
{ "time": 7.30, "duration": 0.69 }
```

Use hold interpretation for metrics named `defense` when value represents held centiseconds.

## 6.5 Aggregate timeline into totals and stats

For each mode.metric group:

### If metric is `defense`

- `totalTimeHeld` = sum(event.duration)
- Keep `events` as `{time, duration}`

### Else if metric ID is in `success[]`

- `total` = sum(event.value)
- `successes` = count events with result=`success`
- `fails` = count events with result=`fail`
- `attempts` = `successes + fails`
- `accuracy` = `attempts > 0 ? round(successes/attempts, 2) : 0`
- keep `events`

### Else

- `total` = sum(event.value)
- keep `events`

## 6.6 Handling metrics with no events

If a mode.metric exists in mapping but never appears in timeline:
- You may omit it for compactness
- Or include with zero totals if your consumer requires fixed schema

Given your examples, both patterns are acceptable depending on usage.

---

## 7) Decompressing Event-Time-Tracking Disabled Payload

Input shape example:

```json
{
  "0":24,
  "1":33,
  "10.s":2,
  "10.f":1,
  "16":false,
  "17":"good stuff",
  "18":"bad stuff",
  "19":"idk bro",
  "20":50,
  "match":4,
  "team":"5937",
  "scouter":"daw"
}
```

## 7.1 Extract shared metadata

Read directly:

- `match`
- `team`
- `scouter`

## 7.2 Decode base ID keys (`"0"`, `"1"`, ...)

For each numeric key in payload:

1. Resolve tag with `idToTag`
2. If tag has mode prefix:
   - place under `auto` / `teleop`
3. Else place as top-level scalar (`bricked`, `slider`, `good`, `bad`, `area`)

### Metric interpretation for mode tags

Given value = numeric total/count:

- For simple count metrics (e.g. `fuel`, `depot`, `humanplayer`) use:
  - either scalar (`fuel: 24`) or object (`{ total: 24 }`) depending on target schema
- For `defense`, convert to seconds for readable output:
  - `defenseTimeHeld = rawCentiseconds / 100`
- For success-capable metrics (IDs in `success[]`), enrich with attempts/accuracy using suffix keys.

## 7.3 Decode success suffix keys (`id.s`, `id.f`)

Parse keys matching regex:

- `^(\d+)\.(s|f)$`

For each:

- `id` -> mapping tag (e.g. `10 -> auto.outpost`)
- suffix `s` = success count
- suffix `f` = fail count

For that mode.metric:

- `successes = payload[id.s] || 0`
- `fails = payload[id.f] || 0`
- `attempts = successes + fails`
- `accuracy = attempts > 0 ? round(successes / attempts, 2) : 0`
- `total = payload[id] || 0`

If metric has success data but missing base total, set total = 0.

## 7.4 Top-level non-mode keys from mapping

Keys like `16`, `17`, `18`, `19`, `20` map to:

- `bricked` (boolean)
- `good`/`bad`/`area` (strings)
- `slider` (number)

Preserve types where possible.

---

## 8) Recommended Canonical Reconstruction Rules

To avoid data loss and keep outputs consistent:

1. **Never drop unknown IDs silently**
   - collect in `_unknown` or logs.
2. **Preserve all parsed values before rounding/formatting**
   - internal math can use full precision; round only presentation fields.
3. **Keep event order stable**
   - timeline order = chronological order in source string.
4. **Accuracy precision**
   - use 2 decimals (`0.67`) unless your client needs more.
5. **Type safety**
   - convert missing/invalid numeric values to 0 (or empty string for text slots).

---

## 9) Detailed Pseudocode (Reference)

```ts
function decodeCompressed(payload, fieldMapping) {
  const idToTag = fieldMapping.mapping
  const successIds = new Set((fieldMapping.success ?? []).map(String))

  if (isTimelinePayload(payload)) {
    return decodeTimelinePayload(payload, fieldMapping, idToTag, successIds)
  }

  return decodeFlatPayload(payload, fieldMapping, idToTag, successIds)
}

function isTimelinePayload(p) {
  return (
    p &&
    typeof p === "object" &&
    typeof p.t === "string" &&
    typeof p.s === "string" &&
    Array.isArray(p.b) &&
    Array.isArray(p.d)
  )
}

function decodeTimelinePayload(p, fm, idToTag, successIds) {
  const out = { auto: {}, teleop: {} }

  // d
  out.match = toInt(p.d[0], 0)
  out.team = p.d[1] ?? ""
  out.scouter = String(p.d[2] ?? "")

  // s
  const textParts = p.s.length ? p.s.split("|") : []
  ;(fm.text ?? []).forEach((id, i) => {
    const tag = idToTag[String(id)]
    if (!tag) return
    out[tag] = textParts[i] ?? ""
  })

  // b
  ;(fm.meta ?? []).forEach((id, i) => {
    const tag = idToTag[String(id)]
    if (!tag) return
    const raw = p.b[i] ?? 0
    out[tag] = normalizeMetaValue(tag, raw)
  })

  // t
  const grouped = new Map() // key: mode.metric => event[]

  if (p.t.trim().length > 0) {
    for (const token of p.t.split(",")) {
      const parts = token.split(":")
      if (parts.length < 3 || parts.length > 4) continue

      const [idPart, timePart, valuePart, resultPart] = parts
      const tag = idToTag[idPart]
      if (!tag) continue

      const [mode, metric] = splitModeMetric(tag)
      if (!mode || !metric) continue

      const timeSec = toNum(timePart, 0) / 100
      const val = toNum(valuePart, 0)

      let evt
      if (metric === "defense") {
        evt = { time: round2(timeSec), duration: round2(val / 100) }
      } else {
        evt = { time: round2(timeSec), value: val }
        if (parts.length === 4 && successIds.has(idPart)) {
          evt.result = resultPart === "s" ? "success" : resultPart === "f" ? "fail" : undefined
        }
      }

      pushGrouped(grouped, `${mode}.${metric}`, evt)
    }
  }

  // aggregate
  for (const [key, events] of grouped.entries()) {
    const [mode, metric] = key.split(".")

    if (metric === "defense") {
      const totalTimeHeld = sum(events.map(e => e.duration || 0))
      out[mode][metric] = { totalTimeHeld: round2(totalTimeHeld), events }
      continue
    }

    const total = sum(events.map(e => e.value || 0))

    const tagId = findIdByTag(idToTag, `${mode}.${metric}`)
    if (tagId && successIds.has(tagId)) {
      const successes = events.filter(e => e.result === "success").length
      const fails = events.filter(e => e.result === "fail").length
      const attempts = successes + fails
      out[mode][metric] = {
        total,
        attempts,
        successes,
        fails,
        accuracy: attempts ? round2(successes / attempts) : 0,
        events,
      }
    } else {
      out[mode][metric] = { total, events }
    }
  }

  return out
}

function decodeFlatPayload(p, fm, idToTag, successIds) {
  const out = { auto: {}, teleop: {} }

  out.match = toInt(p.match, 0)
  out.team = p.team ?? ""
  out.scouter = String(p.scouter ?? "")

  // decode numeric ids
  for (const [k, v] of Object.entries(p)) {
    if (!/^\d+$/.test(k)) continue

    const tag = idToTag[k]
    if (!tag) continue

    const split = splitModeMetric(tag)
    if (!split) {
      out[tag] = normalizeTopLevel(tag, v)
      continue
    }

    const [mode, metric] = split
    const num = toNum(v, 0)

    if (metric === "defense") {
      out[mode].defenseTimeHeld = round2(num / 100)
    } else if (metric === "fuel") {
      out[mode].fuel = num
    } else {
      out[mode][metric] = { total: num }
    }
  }

  // apply success counters id.s/id.f
  for (const [k, v] of Object.entries(p)) {
    const m = k.match(/^(\d+)\.(s|f)$/)
    if (!m) continue

    const id = m[1]
    const kind = m[2]
    if (!successIds.has(id)) continue

    const tag = idToTag[id]
    if (!tag) continue

    const [mode, metric] = splitModeMetric(tag)
    if (!mode || !metric) continue

    if (!out[mode][metric]) out[mode][metric] = { total: toNum(p[id], 0) }

    const cur = out[mode][metric]
    if (kind === "s") cur.successes = toInt(v, 0)
    if (kind === "f") cur.fails = toInt(v, 0)

    const successes = cur.successes ?? 0
    const fails = cur.fails ?? 0
    const attempts = successes + fails

    cur.attempts = attempts
    cur.accuracy = attempts ? round2(successes / attempts) : 0
    if (cur.total == null) cur.total = toNum(p[id], 0)
  }

  // ensure text/meta restoration by ordered arrays if needed
  // (for flat payload these usually already appear as id keys)

  return out
}
```

---

## 10) Walkthrough With Your Provided Enabled Example

Input:

- `d = [6,2374,"wdadw"]` -> `match=6`, `team=2374`, `scouter="wdadw"`
- `s = "thats rly good|they suck|WOWO"`
  - `text=[17,18,19]`
  - `17->good`, `18->bad`, `19->area`
- `b = [0,50]`
  - `meta=[16,20]`
  - `16->bricked=false`, `20->slider=50`
- `t` events decoded by IDs:
  - `10` -> `auto.outpost` with `:s/:f` success stats
  - `0` -> `auto.fuel`
  - `8` -> `auto.defense` hold duration
  - etc.

This reconstructs exactly the expanded sample you provided.

---

## 11) Walkthrough With Your Provided Disabled Example

Input key highlights:

- `"0":24` -> `auto.fuel = 24`
- `"1":33` -> `teleop.fuel = 33`
- `"10":0`, `"10.s":2`, `"10.f":1` -> `auto.outpost.total=0`, attempts=3, successes=2, fails=1, accuracy=0.67
- `"16":false` -> `bricked=false`
- `"17":"good stuff"`, `"18":"bad stuff"`, `"19":"idk bro"`
- `"20":50` -> `slider=50`

This reconstructs exactly the no-time-tracking expanded shape you showed.

---

## 12) Losslessness Checklist

Use this checklist to verify no data loss:

1. Every ID key in compressed payload is either decoded or logged as unknown.
2. Every `text[]` slot maps to one output field (including empty strings).
3. Every `meta[]` slot maps to one output field.
4. Timeline preserves token count/order unless token invalid.
5. For success IDs, both event-level (`s/f`) and aggregate counters survive.
6. `match/team/scouter` always preserved.
7. Defense hold values remain recoverable in seconds and original centisecond totals if needed.

---

## 13) Suggested Optional Enhancements

If you want truly perfect reversibility for analytics + re-encoding:

- store raw compressed payload under `_rawCompressed`
- store unknown IDs/tokens under `_unknown`
- keep both rounded and raw numeric totals:
  - `totalTimeHeld` (seconds)
  - `_totalTimeHeldCs` (centiseconds)

---

## 14) Summary

To decode safely:

1. Load `field_mapping` and build `idToTag`.
2. Detect format (`t/s/b/d` vs flat IDs).
3. Decode shared metadata.
4. Decode text/meta using ordered arrays.
5. Decode metric IDs into `auto/teleop` buckets.
6. Apply success logic using `success[]` + `id.s/id.f` or timeline `:s/:f`.
7. Compute totals/attempts/accuracy.
8. Emit expanded JSON.

If implemented with the rules above, decompression is deterministic and lossless for all fields represented in your compressed formats.
