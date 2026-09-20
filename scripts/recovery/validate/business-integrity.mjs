/**
 * Business-integrity validation against a recovered PostgreSQL (IMP-037 §12 / AC-004).
 *
 * Uses information_schema / known app schema table existence and count sanity —
 * does NOT invent domain semantics. Distinguishes DB_REACHABLE from BUSINESS_INTEGRITY_VALIDATED.
 */
import { PROOF_CODE } from "../constants.mjs";

const APP_SCHEMA = "app";

/**
 * Representative tables from the locked application schema, grouped by architecture category.
 * Existence + non-negative count checks only.
 */
export const BUSINESS_INTEGRITY_CHECKS = Object.freeze([
  {
    category: "customer_auth",
    code: "TABLE_CUSTOMER_AUTH",
    tables: ["customer_auth_users", "customer_auth_sessions"],
  },
  {
    category: "workforce_auth",
    code: "TABLE_WORKFORCE_AUTH",
    tables: ["workforce_auth_users", "workforce_auth_sessions"],
  },
  {
    category: "access_control",
    code: "TABLE_ACCESS_CONTROL",
    tables: ["access_permissions", "access_roles", "access_memberships"],
  },
  {
    category: "organizations",
    code: "TABLE_ORGANIZATIONS",
    tables: ["organizations", "outlets", "brands"],
  },
  {
    category: "customer_profiles",
    code: "TABLE_CUSTOMER_PROFILES",
    tables: ["customer_profiles"],
  },
  {
    category: "catalog_menu",
    code: "TABLE_CATALOG_MENU",
    tables: ["menus", "menu_sections", "menu_entries"],
  },
  {
    category: "assortment",
    code: "TABLE_ASSORTMENT",
    tables: ["assortment_rules", "outlet_variant_availability"],
  },
  {
    category: "pricing",
    code: "TABLE_PRICING",
    tables: ["price_books", "price_book_variant_prices"],
  },
  {
    category: "cart",
    code: "TABLE_CART",
    tables: ["carts", "cart_lines"],
  },
  {
    category: "checkout",
    code: "TABLE_CHECKOUT",
    tables: ["checkouts", "checkout_snapshots"],
  },
  {
    category: "order",
    code: "TABLE_ORDER",
    tables: ["orders"],
  },
  {
    category: "payment",
    code: "TABLE_PAYMENT",
    tables: ["payments", "payment_attempts"],
  },
  {
    category: "refund",
    code: "TABLE_REFUND",
    tables: ["refunds"],
  },
  {
    category: "outbox",
    code: "TABLE_OUTBOX",
    tables: ["outbox_events"],
  },
  {
    category: "idempotency",
    code: "TABLE_IDEMPOTENCY",
    tables: ["idempotency_records"],
  },
  {
    category: "financial_documents",
    code: "TABLE_FINANCIAL_DOCUMENTS",
    tables: ["financial_documents", "financial_document_lines"],
  },
  {
    category: "signed_artifacts",
    code: "TABLE_SIGNED_ARTIFACTS",
    tables: ["financial_document_signed_artifact_objects", "signature_artifacts"],
  },
  {
    category: "delivery",
    code: "TABLE_DELIVERY",
    tables: ["deliveries", "delivery_assignments"],
  },
]);

/**
 * @param {object} options
 * @param {(sql: string, params?: unknown[]) => Promise<unknown> | unknown} options.queryFn
 * @returns {Promise<{ ok: boolean, results: Array<{ category: string, code: string, ok: boolean, detail: string }> }>}
 */
export async function runBusinessIntegrityValidation(options) {
  if (typeof options?.queryFn !== "function") {
    return {
      ok: false,
      results: [
        {
          category: "database",
          code: PROOF_CODE.DB_REACHABLE,
          ok: false,
          detail: "queryFn is required",
        },
      ],
    };
  }

  /** @type {Array<{ category: string, code: string, ok: boolean, detail: string }>} */
  const results = [];

  try {
    await options.queryFn("SELECT 1");
    results.push({
      category: "database",
      code: PROOF_CODE.DB_REACHABLE,
      ok: true,
      detail: "database accepted a simple query",
    });
  } catch (error) {
    results.push({
      category: "database",
      code: PROOF_CODE.DB_REACHABLE,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, results };
  }

  let allOk = true;
  for (const check of BUSINESS_INTEGRITY_CHECKS) {
    const tableResults = [];
    let checkOk = true;
    for (const table of check.tables) {
      try {
        const existsRows = await options.queryFn(
          `SELECT 1 AS ok
             FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2
            LIMIT 1`,
          [APP_SCHEMA, table],
        );
        const exists = rowCount(existsRows) > 0 || truthyFirst(existsRows);
        if (!exists) {
          checkOk = false;
          tableResults.push(`${table}: MISSING`);
          continue;
        }
        const countRows = await options.queryFn(`SELECT COUNT(*)::bigint AS count FROM ${APP_SCHEMA}.${table}`);
        const count = extractCount(countRows);
        if (count == null || count < 0) {
          checkOk = false;
          tableResults.push(`${table}: COUNT_UNAVAILABLE`);
        } else {
          tableResults.push(`${table}: count=${count}`);
        }
      } catch (error) {
        checkOk = false;
        tableResults.push(`${table}: ERROR`);
        void error;
      }
    }
    results.push({
      category: check.category,
      code: check.code,
      ok: checkOk,
      detail: tableResults.join("; "),
    });
    if (!checkOk) allOk = false;
  }

  results.push({
    category: "business_integrity",
    code: PROOF_CODE.BUSINESS_INTEGRITY_VALIDATED,
    ok: allOk,
    detail: allOk
      ? "required app schema tables present with sane counts"
      : "one or more required business tables failed existence/count checks",
  });

  return { ok: allOk, results };
}

/**
 * @param {unknown} rows
 * @returns {number}
 */
function rowCount(rows) {
  if (Array.isArray(rows)) return rows.length;
  if (rows && typeof rows === "object" && Array.isArray(/** @type {any} */ (rows).rows)) {
    return /** @type {any} */ (rows).rows.length;
  }
  return 0;
}

/**
 * @param {unknown} rows
 * @returns {boolean}
 */
function truthyFirst(rows) {
  if (Array.isArray(rows) && rows.length > 0) return true;
  if (rows && typeof rows === "object" && Array.isArray(/** @type {any} */ (rows).rows)) {
    return /** @type {any} */ (rows).rows.length > 0;
  }
  return Boolean(rows);
}

/**
 * @param {unknown} rows
 * @returns {number | null}
 */
function extractCount(rows) {
  const list = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object" && Array.isArray(/** @type {any} */ (rows).rows)
      ? /** @type {any} */ (rows).rows
      : [];
  if (list.length === 0) return null;
  const first = list[0];
  if (typeof first === "number") return first;
  if (first && typeof first === "object") {
    const value = first.count ?? first.COUNT ?? Object.values(first)[0];
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}
