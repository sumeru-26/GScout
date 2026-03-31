import { NextResponse } from "next/server";

import { db } from "@/lib/db";

type CandidateTable = {
  table_schema: string;
  table_name: string;
};

type LoginRow = {
  payload: unknown;
  background_image: string | null;
  background_location?: string | null;
  field_mapping?: unknown;
};

function parseEventKey(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const source = payload as {
    eventKey?: unknown;
    editorState?: {
      eventKey?: unknown;
    };
  };

  const candidates = [source.eventKey, source.editorState?.eventKey];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const normalized = candidate.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

async function fetchEventSchedule(eventKey: string): Promise<unknown | null> {
  const authKey =
    process.env.X_TBA_AUTH_KEY?.trim() ||
    process.env.TBA_AUTH_KEY?.trim() ||
    process.env["X-TBA-Auth-Key"]?.trim();

  if (!authKey) {
    console.warn("[login/validate] Missing The Blue Alliance auth key. Set X_TBA_AUTH_KEY in .env.");
    return null;
  }

  const response = await fetch(
    `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}/matches/simple`,
    {
      headers: {
        "X-TBA-Auth-Key": authKey,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    console.warn("[login/validate] TBA request failed", {
      eventKey,
      status: response.status,
      statusText: response.statusText,
      responseBody,
    });
    return null;
  }

  return response.json();
}

async function fetchEventTeams(eventKey: string): Promise<unknown | null> {
  const authKey =
    process.env.X_TBA_AUTH_KEY?.trim() ||
    process.env.TBA_AUTH_KEY?.trim() ||
    process.env["X-TBA-Auth-Key"]?.trim();

  if (!authKey) {
    console.warn("[login/validate] Missing The Blue Alliance auth key. Set X_TBA_AUTH_KEY in .env.");
    return null;
  }

  const response = await fetch(
    `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}/teams/simple`,
    {
      headers: {
        "X-TBA-Auth-Key": authKey,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    console.warn("[login/validate] TBA teams request failed", {
      eventKey,
      status: response.status,
      statusText: response.statusText,
      responseBody,
    });
    return null;
  }

  return response.json();
}

function isSafeIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { loginCode?: string };
    const loginCode = body.loginCode?.trim();

    if (!loginCode) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const candidateTablesResult = await db.query<CandidateTable>(`
      SELECT c1.table_schema, c1.table_name
      FROM information_schema.columns c1
      JOIN information_schema.columns c2
        ON c1.table_schema = c2.table_schema
       AND c1.table_name = c2.table_name
      JOIN information_schema.columns c3
        ON c1.table_schema = c3.table_schema
       AND c1.table_name = c3.table_name
      WHERE c1.column_name = 'content_hash'
        AND c2.column_name = 'payload'
        AND c3.column_name = 'background_image'
      ORDER BY
        CASE
          WHEN c1.table_schema = 'public' THEN 0
          ELSE 1
        END,
        c1.table_name
      LIMIT 1;
    `);

    const candidateTables = candidateTablesResult.rows;

    const table = candidateTables[0];
    if (!table) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }

    if (!isSafeIdentifier(table.table_schema) || !isSafeIdentifier(table.table_name)) {
      return NextResponse.json({ valid: false }, { status: 500 });
    }

    const schemaName = quoteIdentifier(table.table_schema);
    const tableName = quoteIdentifier(table.table_name);

    const tableColumnsResult = await db.query<{ column_name: string }>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
      `,
      [table.table_schema, table.table_name]
    );

    const tableColumns = new Set(
      tableColumnsResult.rows
        .map((row) => row.column_name)
        .filter((value): value is string => typeof value === "string")
    );

    const hasBackgroundLocationColumn = tableColumns.has("background_location");
    const hasFieldMappingColumn = tableColumns.has("field_mapping");

    const selectColumns = ["payload", "background_image"];
    if (hasBackgroundLocationColumn) {
      selectColumns.push("background_location");
    }
    if (hasFieldMappingColumn) {
      selectColumns.push("field_mapping");
    }

    const sql = `
      SELECT ${selectColumns.join(", ")}
      FROM ${schemaName}.${tableName}
      WHERE content_hash = $1
      LIMIT 1
    `;

    const rows = await db.query<LoginRow>(sql, [loginCode]);
    const record = rows.rows[0];

    if (!record) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    const eventKey = parseEventKey(record.payload);
    let eventSchedule: unknown | null = null;
    let eventTeams: unknown | null = null;

    if (eventKey) {
      try {
        eventSchedule = await fetchEventSchedule(eventKey);
        eventTeams = await fetchEventTeams(eventKey);
        console.log("[login/validate] TBA event schedule response:", {
          eventKey,
          eventSchedule,
          eventTeams,
        });
      } catch {
        eventSchedule = null;
        eventTeams = null;
      }
    }

    return NextResponse.json({
      valid: true,
      payload: record.payload,
      backgroundImage: record.background_image,
      backgroundLocation: hasBackgroundLocationColumn ? (record.background_location ?? null) : null,
      fieldMapping: hasFieldMappingColumn ? (record.field_mapping ?? null) : null,
      eventKey,
      eventSchedule,
      eventTeams,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
