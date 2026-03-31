# Pit QR Extraction Guide

This guide explains how to extract pit question answers from:
- the original form payload (`editorState.postMatchQuestions`)
- the scanned QR JSON (`pqv`, `pq`, plus metadata)

This is compact encoding, not encryption.

## When To Use This

Apply this only when the QR JSON is pit scouting:
- `scoutType === "pit"` or `ft[0] === 2`
- `pqv === 1`
- `pq` exists as a string

## Inputs

1. Form payload JSON (source of question order and options)
2. QR JSON (source of submitted answers)

Important:
- Question number mapping is positional.
- Question `1` means the first entry in `postMatchQuestions`, `2` means second, and so on.

## Pit QR JSON Shape

For pit submits, the QR JSON is intentionally compact and contains only metadata plus the compressed pit answer block:

- `scouter`
- `team`
- `match`
- `scoutType` (pit)
- `ft` (contains 2)
- `pqv` (currently 1)
- `pq` (questionNumber=answerToken list)

## QR Answer Format

`pq` format:

`<questionNumber>=<answerToken>;<questionNumber>=<answerToken>;...`

Answer token types:
- Text: `t:<rawTextWithEscapes>`
- Slider: `s:<integerValue>`
- Multi-select: `m:<commaSeparatedOptionIndexes>`
- Single-select: `o:<selectedOptionIndex>`

Text escaping rules:
- `\\` = literal backslash
- `\;` = literal semicolon
- `\=` = literal equals

## Output Shape

Minimum decoded output can be simple question-number to answer:

```json
{
  "1": "hello",
  "2": 5,
  "3": [0],
  "4": 1
}
```

You can optionally enrich with option text using `postMatchQuestions[index].options`.

## Extraction Steps

1. Validate pit conditions (`scoutType/ft`, `pqv`, `pq`).
2. Read `questions = payload.editorState.postMatchQuestions`.
3. Split `pq` into records by unescaped `;`.
4. For each record, split by first unescaped `=` into `questionNumber` and `answerToken`.
5. Parse token by prefix:
   - `t:` -> unescape raw text
   - `s:` -> integer
   - `m:` -> integer array (option indexes)
   - `o:` -> integer index (`-1` means none)
6. Store as `decoded[questionNumber] = parsedAnswer`.

## Decoder Example (JavaScript)

```js
function decodePitAnswers(payloadJson, qrJson) {
  const decoded = {};
  const questions = payloadJson?.editorState?.postMatchQuestions ?? [];
  const pq = typeof qrJson?.pq === "string" ? qrJson.pq : "";

  if (!pq) return decoded;

  const splitUnescaped = (input, delimiter) => {
    const chunks = [];
    let current = "";
    let escaping = false;

    for (const ch of input) {
      if (escaping) {
        current += ch;
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        escaping = true;
        continue;
      }
      if (ch === delimiter) {
        chunks.push(current);
        current = "";
        continue;
      }
      current += ch;
    }

    if (escaping) current += "\\";
    chunks.push(current);
    return chunks;
  };

  const unescapeText = (value) => {
    let output = "";
    let escaping = false;

    for (const ch of value) {
      if (escaping) {
        output += ch;
        escaping = false;
        continue;
      }
      if (ch === "\\") {
        escaping = true;
        continue;
      }
      output += ch;
    }

    if (escaping) output += "\\";
    return output;
  };

  for (const record of splitUnescaped(pq, ";").filter(Boolean)) {
    const [questionPart, ...rest] = splitUnescaped(record, "=");
    const token = rest.join("=");

    const questionNumber = Number(questionPart);
    if (!Number.isInteger(questionNumber) || !token) continue;
    if (!questions[questionNumber - 1]) continue;

    const tokenType = token.slice(0, 2);
    const tokenValue = token.slice(2);

    if (tokenType === "t:") {
      decoded[String(questionNumber)] = unescapeText(tokenValue || "");
    } else if (tokenType === "s:") {
      decoded[String(questionNumber)] = Number(tokenValue);
    } else if (tokenType === "m:") {
      decoded[String(questionNumber)] = tokenValue
        ? tokenValue
            .split(",")
            .map((v) => Number(v))
            .filter((n) => Number.isInteger(n) && n >= 0)
        : [];
    } else if (tokenType === "o:") {
      decoded[String(questionNumber)] = Number(tokenValue);
    }
  }

  return decoded;
}
```

## Keep These Metadata Fields

When you process decoded answers downstream, keep these from QR JSON:
- `scouter`
- `team`
- `match`
- `scoutType`
- `ft`
