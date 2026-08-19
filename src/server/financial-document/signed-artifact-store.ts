/**
 * Provider-neutral durable signed PDF byte storage (IMP-028 / D-367 Slice 2).
 *
 * MVP backing store: PostgreSQL BYTEA via opaque `artifact:<uuid>` references.
 */
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { financialDocumentSignedArtifactObjectsTable } from "../../platform/database/schema/financial-document-signed-artifact-storage";
import {
  canonicalizeSha256HexDigest,
  SignatureFoundationError,
} from "../../shared/financial-document";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type SignedArtifactStoredObject = Readonly<{
  id: string;
  objectReference: string;
  contentHashAlgorithm: "SHA-256";
  contentHash: string;
  contentLength: bigint;
  createdAt: Date;
}>;

export type SignedArtifactStorePutResult = Readonly<{
  objectReference: string;
  contentHashAlgorithm: "SHA-256";
  contentHash: string;
  contentLength: bigint;
}>;

function computeSha256FromBytes(bytes: Uint8Array): string {
  return canonicalizeSha256HexDigest(
    createHash("sha256").update(bytes).digest("hex"),
  );
}

function mapStoredObjectRow(
  row: typeof financialDocumentSignedArtifactObjectsTable.$inferSelect,
): SignedArtifactStoredObject {
  return Object.freeze({
    id: row.id,
    objectReference: row.objectReference,
    contentHashAlgorithm: "SHA-256",
    contentHash: row.contentHash,
    contentLength: row.contentLength,
    createdAt: row.createdAt,
  });
}

/**
 * Persist exact bytes immutably. Hash is derived from bytes — never caller-supplied.
 */
export async function putImmutableSignedArtifactBytes(
  context: PersistenceTransactionContext,
  input: {
    bytes: Uint8Array;
    now: Date;
  },
): Promise<SignedArtifactStorePutResult> {
  assertTransactionContext(context, "putImmutableSignedArtifactBytes");
  if (input.bytes.byteLength === 0) {
    throw new SignatureFoundationError(
      "SIGNED_PDF_CONTAINER_INVALID",
      "Cannot persist empty signed artifact bytes.",
    );
  }

  const contentHash = computeSha256FromBytes(input.bytes);
  const id = randomUUID();
  const objectReference = `artifact:${id}`;
  const contentLength = BigInt(input.bytes.byteLength);

  const rows = await context.db
    .insert(financialDocumentSignedArtifactObjectsTable)
    .values({
      id,
      objectReference,
      contentHashAlgorithm: "SHA-256",
      contentHash,
      contentBytes: input.bytes,
      contentLength,
      createdAt: input.now,
    })
    .returning({
      objectReference: financialDocumentSignedArtifactObjectsTable.objectReference,
      contentHashAlgorithm:
        financialDocumentSignedArtifactObjectsTable.contentHashAlgorithm,
      contentHash: financialDocumentSignedArtifactObjectsTable.contentHash,
      contentLength: financialDocumentSignedArtifactObjectsTable.contentLength,
    });

  const row = rows[0]!;
  return Object.freeze({
    objectReference: row.objectReference,
    contentHashAlgorithm: "SHA-256",
    contentHash: row.contentHash,
    contentLength: row.contentLength,
  });
}

export async function getExactSignedArtifactBytes(
  context: PersistenceQueryContext,
  objectReference: string,
): Promise<Uint8Array> {
  assertApplicationRole(context, "getExactSignedArtifactBytes");
  const rows = await context.db
    .select({
      contentBytes: financialDocumentSignedArtifactObjectsTable.contentBytes,
    })
    .from(financialDocumentSignedArtifactObjectsTable)
    .where(
      eq(
        financialDocumentSignedArtifactObjectsTable.objectReference,
        objectReference,
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new SignatureFoundationError(
      "SIGNED_ARTIFACT_OBJECT_NOT_FOUND",
      `Signed artifact object not found: ${objectReference}`,
    );
  }
  const bytes = row.contentBytes;
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

export async function verifyExactSignedArtifactHash(
  context: PersistenceQueryContext,
  input: {
    objectReference: string;
    expectedHash: string;
  },
): Promise<Uint8Array> {
  assertApplicationRole(context, "verifyExactSignedArtifactHash");
  const expected = canonicalizeSha256HexDigest(input.expectedHash);
  const rows = await context.db
    .select({
      contentBytes: financialDocumentSignedArtifactObjectsTable.contentBytes,
      contentHash: financialDocumentSignedArtifactObjectsTable.contentHash,
    })
    .from(financialDocumentSignedArtifactObjectsTable)
    .where(
      eq(
        financialDocumentSignedArtifactObjectsTable.objectReference,
        input.objectReference,
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new SignatureFoundationError(
      "SIGNED_ARTIFACT_OBJECT_NOT_FOUND",
      `Signed artifact object not found: ${input.objectReference}`,
    );
  }
  if (row.contentHash !== expected) {
    throw new SignatureFoundationError(
      "SIGNED_ARTIFACT_HASH_MISMATCH",
      `Stored signed artifact hash mismatch for ${input.objectReference}.`,
    );
  }
  const bytes = row.contentBytes;
  const normalized =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const actual = computeSha256FromBytes(normalized);
  if (actual !== expected) {
    throw new SignatureFoundationError(
      "SIGNED_ARTIFACT_HASH_MISMATCH",
      `Signed artifact byte integrity mismatch for ${input.objectReference}.`,
    );
  }
  return normalized;
}

export async function findSignedArtifactStoredObjectByReference(
  context: PersistenceQueryContext,
  objectReference: string,
): Promise<SignedArtifactStoredObject | null> {
  assertApplicationRole(context, "findSignedArtifactStoredObjectByReference");
  const rows = await context.db
    .select()
    .from(financialDocumentSignedArtifactObjectsTable)
    .where(
      eq(
        financialDocumentSignedArtifactObjectsTable.objectReference,
        objectReference,
      ),
    )
    .limit(1);
  return rows[0] ? mapStoredObjectRow(rows[0]) : null;
}
