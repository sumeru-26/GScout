import { NextResponse } from "next/server";

import { db } from "@/lib/db";

type CandidateTable = {
  table_schema: string;
  table_name: string;
};

type LoginRow = {
  payload: unknown;
  background_image: string | null;
};

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
    const sql = `
      SELECT payload, background_image
      FROM ${schemaName}.${tableName}
      WHERE content_hash = $1
      LIMIT 1
    `;

    const rows = await db.query<LoginRow>(sql, [loginCode]);
    const record = rows.rows[0];

    if (!record) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      payload: record.payload,
      backgroundImage: record.background_image,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
