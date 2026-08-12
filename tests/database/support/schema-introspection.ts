/**
 * Deterministic, normalized schema introspection for the reproducible-schema
 * and idempotency integration tests (IMP-005). Captures the shape of every
 * non-system schema (tables, columns, constraints, indexes, comments) while
 * deliberately excluding volatile values (OIDs, physical identifiers,
 * connection PIDs, database names, uncontrolled creation times) so two
 * independently-migrated databases produce byte-identical output.
 */
import { createHash } from "node:crypto";
import type { DatabaseClient } from "../../../src/platform/database";

export interface NormalizedColumn {
  readonly name: string;
  readonly dataType: string;
  readonly nullable: boolean;
  readonly columnDefault: string | null;
}

export interface NormalizedConstraint {
  readonly type: string;
  readonly name: string;
  readonly columns: string[];
}

export interface NormalizedCheck {
  readonly name: string;
  readonly clause: string;
}

export interface NormalizedIndex {
  readonly name: string;
  readonly definition: string;
}

export interface NormalizedTable {
  readonly schema: string;
  readonly name: string;
  readonly comment: string | null;
  readonly columns: NormalizedColumn[];
  readonly constraints: NormalizedConstraint[];
  readonly checks: NormalizedCheck[];
  readonly indexes: NormalizedIndex[];
}

export interface NormalizedSchema {
  readonly schemas: string[];
  readonly schemaComments: Record<string, string | null>;
  readonly tables: NormalizedTable[];
}

const SYSTEM_SCHEMA_PATTERN = /^(pg_catalog|information_schema|pg_toast.*|pg_temp.*)$/;

async function listApplicationSchemas(client: DatabaseClient): Promise<string[]> {
  const result = await client.pool.query<{ nspname: string }>(
    "SELECT nspname FROM pg_namespace ORDER BY nspname",
  );
  return result.rows.map((row) => row.nspname).filter((name) => !SYSTEM_SCHEMA_PATTERN.test(name));
}

async function captureTable(
  client: DatabaseClient,
  schema: string,
  table: string,
): Promise<NormalizedTable> {
  const columns = await client.pool.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, table],
  );

  const constraints = await client.pool.query<{
    constraint_type: string;
    constraint_name: string;
    column_name: string | null;
  }>(
    `SELECT tc.constraint_type, tc.constraint_name, kcu.column_name
     FROM information_schema.table_constraints tc
     LEFT JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
     WHERE tc.table_schema = $1 AND tc.table_name = $2 AND tc.constraint_type <> 'CHECK'
     ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position`,
    [schema, table],
  );

  const grouped = new Map<string, NormalizedConstraint>();
  for (const row of constraints.rows) {
    const key = `${row.constraint_type}:${row.constraint_name}`;
    const existing = grouped.get(key);
    if (existing) {
      if (row.column_name) existing.columns.push(row.column_name);
    } else {
      grouped.set(key, {
        type: row.constraint_type,
        name: row.constraint_name,
        columns: row.column_name ? [row.column_name] : [],
      });
    }
  }

  const checks = await client.pool.query<{ constraint_name: string; check_clause: string }>(
    `SELECT cc.constraint_name, cc.check_clause
     FROM information_schema.check_constraints cc
     JOIN information_schema.table_constraints tc
       ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
     WHERE tc.table_schema = $1 AND tc.table_name = $2
     ORDER BY cc.constraint_name`,
    [schema, table],
  );

  const indexes = await client.pool.query<{ indexname: string; indexdef: string }>(
    "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
    [schema, table],
  );

  const comment = await client.pool.query<{ comment: string | null }>(
    "SELECT obj_description(($1 || '.' || $2)::regclass, 'pg_class') AS comment",
    [schema, table],
  );

  return {
    schema,
    name: table,
    comment: comment.rows[0]?.comment ?? null,
    columns: columns.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES",
      columnDefault: row.column_default,
    })),
    constraints: [...grouped.values()].sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`)),
    checks: checks.rows.map((row) => ({ name: row.constraint_name, clause: row.check_clause })),
    indexes: indexes.rows.map((row) => ({ name: row.indexname, definition: row.indexdef })),
  };
}

/**
 * Capture a deterministic, normalized representation of every
 * non-system-schema object in the database `client` is connected to.
 */
export async function captureNormalizedSchema(client: DatabaseClient): Promise<NormalizedSchema> {
  const schemas = await listApplicationSchemas(client);

  const schemaComments: Record<string, string | null> = {};
  for (const schema of schemas) {
    const result = await client.pool.query<{ comment: string | null }>(
      "SELECT obj_description($1::regnamespace, 'pg_namespace') AS comment",
      [schema],
    );
    schemaComments[schema] = result.rows[0]?.comment ?? null;
  }

  const tablesResult = await client.pool.query<{ table_schema: string; table_name: string }>(
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_schema = ANY($1)
     ORDER BY table_schema, table_name`,
    [schemas],
  );

  const tables: NormalizedTable[] = [];
  for (const row of tablesResult.rows) {
    tables.push(await captureTable(client, row.table_schema, row.table_name));
  }

  return { schemas, schemaComments, tables };
}

/** Stable, order-independent JSON fingerprint of a normalized schema — safe
 * for direct string/hash comparison between two independently-migrated
 * databases. */
export function fingerprintSchema(schema: NormalizedSchema): string {
  return createHash("sha256").update(JSON.stringify(schema)).digest("hex");
}
