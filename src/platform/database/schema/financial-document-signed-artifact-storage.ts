/**
 * Durable exact-byte signed PDF storage (IMP-028 / D-367 Slice 2 MVP).
 *
 * Provider-neutral opaque object references (`artifact:<uuid>`).
 * SignatureArtifact remains signature authority; this table stores bytes only.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  customType,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { appSchema } from "./index";

const pgBytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Uint8Array): Buffer {
    return Buffer.from(value);
  },
  fromDriver(value: Buffer): Uint8Array {
    return new Uint8Array(value);
  },
});

export const financialDocumentSignedArtifactObjectsTable = appSchema.table(
  "financial_document_signed_artifact_objects",
  {
    id: uuid("id").primaryKey(),
    objectReference: text("object_reference").notNull(),
    contentHashAlgorithm: text("content_hash_algorithm").notNull(),
    contentHash: text("content_hash").notNull(),
    contentBytes: pgBytea("content_bytes").notNull(),
    contentLength: bigint("content_length", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("financial_document_signed_artifact_objects_object_ref_uidx").on(
      table.objectReference,
    ),
    check(
      "financial_document_signed_artifact_objects_hash_algorithm_check",
      sql`${table.contentHashAlgorithm} = 'SHA-256'`,
    ),
    check(
      "financial_document_signed_artifact_objects_content_hash_format_check",
      sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "financial_document_signed_artifact_objects_content_length_positive_check",
      sql`${table.contentLength} > 0`,
    ),
    check(
      "financial_document_signed_artifact_objects_object_reference_format_check",
      sql`${table.objectReference} ~ '^artifact:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
    ),
  ],
);
