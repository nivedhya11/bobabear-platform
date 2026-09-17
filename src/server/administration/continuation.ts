/**
 * Authorized-set cursor continuation (IMP-036G).
 *
 * Authorize/filter the eligible set first, then emit a bounded page.
 * Never DB-LIMIT then authorize-skip.
 */
import { AdministrationError } from "./errors";

export const ADMIN_LIST_PAGE_SIZE = 50;

export type AdminContinuationPage<T> = Readonly<{
  items: T[];
  nextCursor: string | null;
  more: boolean;
}>;

export type NameIdCursorKey = Readonly<{ name: string; id: string }>;

type CursorPayload = Readonly<{ k: "ni" | "ti" | "ci"; a: string; b: string }>;

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as CursorPayload;
    if (
      (parsed.k !== "ni" && parsed.k !== "ti" && parsed.k !== "ci") ||
      typeof parsed.a !== "string" ||
      typeof parsed.b !== "string"
    ) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "cursor is invalid.", { field: "cursor" });
  }
}

function compareNameId(a: NameIdCursorKey, b: NameIdCursorKey): number {
  const byName = a.name.localeCompare(b.name);
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

/** Page after authorizing the full eligible set (name+id total order). */
export function pageByNameId<T>(
  eligible: readonly T[],
  keyOf: (item: T) => NameIdCursorKey,
  options: Readonly<{ cursor?: string; pageSize?: number }> = {},
): AdminContinuationPage<T> {
  const pageSize = options.pageSize ?? ADMIN_LIST_PAGE_SIZE;
  const sorted = [...eligible].sort((left, right) => compareNameId(keyOf(left), keyOf(right)));
  let start = 0;
  if (options.cursor) {
    const payload = decodeCursor(options.cursor);
    if (payload.k !== "ni") {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "cursor is invalid.", { field: "cursor" });
    }
    const after: NameIdCursorKey = { name: payload.a, id: payload.b };
    start = sorted.findIndex((item) => compareNameId(keyOf(item), after) > 0);
    if (start < 0) start = sorted.length;
  }
  const slice = sorted.slice(start, start + pageSize + 1);
  const more = slice.length > pageSize;
  const items = more ? slice.slice(0, pageSize) : slice;
  const last = items[items.length - 1];
  const nextCursor =
    more && last
      ? encodeCursor({ k: "ni", a: keyOf(last).name, b: keyOf(last).id })
      : null;
  return { items, nextCursor, more };
}

/** Descending time+id order (audit / membership createdAt). */
export function pageByTimeIdDesc<T>(
  eligible: readonly T[],
  keyOf: (item: T) => Readonly<{ at: Date; id: string }>,
  options: Readonly<{ cursor?: string; pageSize?: number }> = {},
): AdminContinuationPage<T> {
  const pageSize = options.pageSize ?? ADMIN_LIST_PAGE_SIZE;
  const sorted = [...eligible].sort((left, right) => {
    const lk = keyOf(left);
    const rk = keyOf(right);
    const byTime = rk.at.getTime() - lk.at.getTime();
    if (byTime !== 0) return byTime;
    return rk.id.localeCompare(lk.id);
  });
  let start = 0;
  if (options.cursor) {
    const payload = decodeCursor(options.cursor);
    if (payload.k !== "ti") {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "cursor is invalid.", { field: "cursor" });
    }
    const afterAt = Date.parse(payload.a);
    if (!Number.isFinite(afterAt)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "cursor is invalid.", { field: "cursor" });
    }
    const after = { at: new Date(afterAt), id: payload.b };
    start = sorted.findIndex((item) => {
      const key = keyOf(item);
      const byTime = after.at.getTime() - key.at.getTime();
      if (byTime !== 0) return byTime > 0;
      return after.id.localeCompare(key.id) > 0;
    });
    if (start < 0) start = sorted.length;
  }
  const slice = sorted.slice(start, start + pageSize + 1);
  const more = slice.length > pageSize;
  const items = more ? slice.slice(0, pageSize) : slice;
  const last = items[items.length - 1];
  const nextCursor =
    more && last
      ? encodeCursor({
          k: "ti",
          a: keyOf(last).at.toISOString(),
          b: keyOf(last).id,
        })
      : null;
  return { items, nextCursor, more };
}

export function parseOptionalCursor(query: Readonly<Record<string, string>>): string | undefined {
  if (query.cursor === undefined) return undefined;
  if (typeof query.cursor !== "string" || query.cursor.length === 0) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "cursor must be a non-empty string.", {
      field: "cursor",
    });
  }
  return query.cursor;
}

export function parseExpectedRevision(body: Readonly<Record<string, unknown>>): bigint {
  const raw = body.expectedRevision;
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return BigInt(raw);
  if (typeof raw === "string" && /^(0|[1-9]\d*)$/.test(raw)) {
    const value = BigInt(raw);
    if (value > BigInt(0)) return value;
  }
  throw new AdministrationError("ADMIN_REQUEST_INVALID", "expectedRevision is required.", {
    field: "expectedRevision",
  });
}
