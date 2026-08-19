/**
 * IMP-028 D-367 Slice 2 — manual signed PDF intake tests (FD-MSI01..FD-MSI24).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  ensurePendingSignatureArtifactForFinancialDocument,
  exportUnsignedFinancialDocumentPdf,
  generateCustomerFinancialDocumentArtifact,
  getExactSignedArtifactBytes,
  hasProductionAuthorisedSignerProfile,
  insertAuthorisedSignerProfile,
  listOutstandingSignatureWork,
  loadSignatureArtifactByFinancialDocumentId,
  putImmutableSignedArtifactBytes,
  sealSignatureArtifactSigned,
  uploadManualSignedPdf,
  verifyExactSignedArtifactHash,
  issueFinancialDocument,
} from "../../src/server/financial-document";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  DEFAULT_SIGNED_PDF_MAX_BYTES,
} from "../../src/shared/financial-document";
import {
  executeSigningCli,
  loadSigningCliWorkerConfig,
} from "../../scripts/financial-document/signing";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "./support/cart-fixtures";
import {
  closeTrackedPersistenceHandles,
  issueTaxInvoiceForHarness,
  withFinancialDocumentReadyHarness,
} from "./support/financial-document-fixtures";
import {
  insertActiveSignerForHarness,
  minimalValidPdfBytes,
  sha256Hex,
  uploadSignedPdfForHarness,
} from "./support/manual-signed-upload-fixtures";
import {
  buildIssueCommand,
  withFinancialDocumentIssuanceHarness,
} from "./support/financial-document-issuance-fixtures";

afterEach(async () => {
  await closeTrackedPersistenceHandles();
});

function postgresErrorMessage(error: unknown): string {
  let current: unknown = error;
  const parts: string[] = [];
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

async function expectPostgresFailure(
  run: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeTruthy();
  expect(postgresErrorMessage(caught)).toMatch(pattern);
}

describe("IMP-028 D-367 Slice 2 — manual signed PDF intake (FD-MSI01..FD-MSI24)", () => {
  it("FD-MSI01 valid exact PDF bytes stored", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes("stored");
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      const loaded = await h.persistence.withContext((ctx) =>
        getExactSignedArtifactBytes(ctx, result.objectReference),
      );
      expect(Buffer.from(loaded)).toEqual(Buffer.from(bytes));
    });
  });

  it("FD-MSI02 stored SHA-256 equals digest calculated from bytes", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes("hash");
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      expect(result.contentHash).toBe(sha256Hex(bytes));
    });
  });

  it("FD-MSI03 non-PDF rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: signer.id,
          bytes: new TextEncoder().encode("not-a-pdf"),
        }),
      ).rejects.toMatchObject({ code: "SIGNED_PDF_CONTAINER_INVALID" });
    });
  });

  it("FD-MSI04 oversized PDF rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const oversized = new Uint8Array(DEFAULT_SIGNED_PDF_MAX_BYTES + 1);
      oversized.set(minimalValidPdfBytes().subarray(0, 8));
      await expect(
        h.persistence.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: oversized,
            authorisedSignerProfileId: signer.id,
            signedAt: h.clock.now(),
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: true,
            now: h.clock.now(),
            maxPdfBytes: DEFAULT_SIGNED_PDF_MAX_BYTES,
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNED_PDF_OVERSIZED" });
    });
  });

  it("FD-MSI05 stored bytes/hash/objectRef immutable", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.financial_document_signed_artifact_objects
              set content_hash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
              where object_reference = ${result.objectReference}
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("FD-MSI06 referenced successful object cannot be deleted", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              delete from app.financial_document_signed_artifact_objects
              where object_reference = ${result.objectReference}
            `),
          ),
        /cannot be deleted/i,
      );
    });
  });

  it("FD-MSI07 unsigned export does not mark artifact SIGNED", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-msi07-${randomUUID()}` }),
      );
      await exportUnsignedFinancialDocumentPdf(h.persistence, doc.id);
      const artifact = await h.persistence.withContext((ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact).toBeNull();
    });
  });

  it("FD-MSI08 upload without attestation rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await expect(
        h.persistence.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: minimalValidPdfBytes(),
            authorisedSignerProfileId: signer.id,
            signedAt: h.clock.now(),
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: false,
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "MANUAL_UPLOAD_ATTESTATION_REQUIRED" });
    });
  });

  it("FD-MSI09 unknown signer rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "AUTHORISED_SIGNER_PROFILE_NOT_FOUND" });
    });
  });

  it("FD-MSI10 signer legal-entity mismatch rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const otherSigner = await h.persistence.transaction(async (tx) =>
        insertAuthorisedSignerProfile(tx, {
          legalEntityId: h.tree.leB.id,
          signerDisplayName: "Other Entity Signer",
          authorisationReference: "OTHER-1",
          effectiveFrom: h.clock.now(),
          signingMethod: "DSC",
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: otherSigner.id,
        }),
      ).rejects.toMatchObject({ code: "AUTHORISED_SIGNER_LEGAL_ENTITY_MISMATCH" });
    });
  });

  it("FD-MSI11 signedAt outside signer effective window rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const future = new Date(h.clock.now().getTime() + 86400000);
      const signer = await h.persistence.transaction(async (tx) =>
        insertAuthorisedSignerProfile(tx, {
          legalEntityId: h.legalEntityId,
          signerDisplayName: "Future Signer",
          authorisationReference: "FUT-1",
          effectiveFrom: future,
          signingMethod: "DSC",
          lifecycleStatus: "active",
          now: h.clock.now(),
        }),
      );
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: signer.id,
        }),
      ).rejects.toMatchObject({
        code: "AUTHORISED_SIGNER_EFFECTIVE_WINDOW_VIOLATION",
      });
    });
  });

  it("FD-MSI12 BoS upload fails closed", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-msi12-${randomUUID()}`,
          documentType: "BILL_OF_SUPPLY",
          numberingSeriesId: h.billOfSupplySeriesId,
        }),
      );
      const signer = await insertActiveSignerForHarness(h);
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: signer.id,
        }),
      ).rejects.toMatchObject({ code: "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED" });
    });
  });

  it("FD-MSI13 TI manual signed upload succeeds", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      expect(result.signatureArtifact.status).toBe("SIGNED");
      expect(result.signatureArtifact.financialDocumentId).toBe(doc.id);
    });
  });

  it("FD-MSI14 RV manual signed upload succeeds", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-msi14-${randomUUID()}`,
          documentType: "RECEIPT_VOUCHER",
          numberingSeriesId: h.receiptVoucherSeriesId,
        }),
      );
      const signer = await insertActiveSignerForHarness(h);
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      expect(result.signatureArtifact.status).toBe("SIGNED");
    });
  });

  it("FD-MSI15 exact successful retry idempotent/no second blob", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes(`idempotent-${doc.id}`);
      const first = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      const second = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      expect(second.idempotentReplay).toBe(true);
      expect(second.objectReference).toBe(first.objectReference);
      const count = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_document_signed_artifact_objects
          where content_hash = ${first.contentHash}
        `);
        return rows.rows[0]?.c as number;
      });
      expect(count).toBe(1);
    });
  });

  it("FD-MSI16 conflicting retry rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes: minimalValidPdfBytes("first"),
      });
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: signer.id,
          bytes: minimalValidPdfBytes("second"),
        }),
      ).rejects.toMatchObject({ code: "SIGNATURE_ARTIFACT_CONFLICT" });
    });
  });

  it("FD-MSI17 concurrent equivalent uploads safe", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes("concurrent");
      const now = h.clock.now();
      const second = getApplicationPersistence(applicationConfig(h.connectionString));
      trackPersistenceHandle(second);
      const input = {
        financialDocumentId: doc.id,
        signedPdfBytes: bytes,
        authorisedSignerProfileId: signer.id,
        signedAt: now,
        signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
        attestSignedArtifact: true,
        now,
      };
      const [a, b] = await Promise.all([
        h.persistence.transaction((tx) => uploadManualSignedPdf(tx, input)),
        second.transaction((tx) => uploadManualSignedPdf(tx, input)),
      ]);
      expect(a.signatureArtifact.id).toBe(b.signatureArtifact.id);
      expect(a.objectReference).toBe(b.objectReference);
    });
  });

  it("FD-MSI18 concurrent conflicting uploads at most one success", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const now = h.clock.now();
      const second = getApplicationPersistence(applicationConfig(h.connectionString));
      trackPersistenceHandle(second);
      const results = await Promise.allSettled([
        h.persistence.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: minimalValidPdfBytes("winner"),
            authorisedSignerProfileId: signer.id,
            signedAt: now,
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: true,
            now,
          }),
        ),
        second.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: minimalValidPdfBytes("loser"),
            authorisedSignerProfileId: signer.id,
            signedAt: now,
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: true,
            now,
          }),
        ),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  it("FD-MSI19 customer required PDF denied before SIGNED", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-msi19-${randomUUID()}` }),
      );
      await expect(
        generateCustomerFinancialDocumentArtifact(h.persistence, h.actor, {
          financialDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-MSI20 customer signed PDF equals uploaded bytes byte-for-byte", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-msi20-${randomUUID()}` }),
      );
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes("customer-exact");
      await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      const artifact = await generateCustomerFinancialDocumentArtifact(
        h.persistence,
        h.actor,
        { financialDocumentId: doc.id },
      );
      expect(Buffer.from(artifact.bytes)).toEqual(Buffer.from(bytes));
    });
  });

  it("FD-MSI21 read-time hash integrity verified", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes("integrity");
      const uploaded = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      await h.persistence.withContext(async (ctx) => {
        const verified = await verifyExactSignedArtifactHash(ctx, {
          objectReference: uploaded.objectReference,
          expectedHash: uploaded.contentHash,
        });
        expect(Buffer.from(verified)).toEqual(Buffer.from(bytes));
      });
    });
  });

  it("FD-MSI22 unauthorized customer preserves non-oracle semantics", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-msi22-${randomUUID()}` }),
      );
      const signer = await insertActiveSignerForHarness(h);
      await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      await expect(
        generateCustomerFinancialDocumentArtifact(h.persistence, h.actors.customerB, {
          financialDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
    });
  });

  it("FD-MSI23 Payment/Order truth unaffected by PENDING signing", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensurePendingSignatureArtifactForFinancialDocument(tx, {
          financialDocumentId: doc.id,
          now: h.clock.now(),
        });
      });
      const order = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select status from app.orders where id = ${h.orderId}::uuid
        `);
        return rows.rows[0]?.status;
      });
      expect(order).toBeTruthy();
      expect(order).not.toBe("CANCELLED");
    });
  });

  it("FD-MSI24 no crypto/provider/D-366/IMP-029 bleed", async () => {
    const forbidden = [
      "private key",
      "PFX",
      "PKCS12",
      "HSM",
      "eSign API",
      "RefundStatutoryDecision",
      "IMP-029",
    ];
    const files = [
      "src/server/financial-document/manual-signed-upload.ts",
      "src/server/financial-document/signed-artifact-store.ts",
      "src/server/financial-document/signing-operator.ts",
      "scripts/financial-document/signing.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(path.join(process.cwd(), rel), "utf8");
      for (const term of forbidden) {
        expect(text.toLowerCase()).not.toContain(term.toLowerCase());
      }
    }
  });
});

describe("IMP-028 D-367 Slice 2 — outstanding discovery + operator export", () => {
  it("lists required documents missing signature work", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const items = await h.persistence.withContext((ctx) =>
        listOutstandingSignatureWork(ctx, { limit: 50 }),
      );
      expect(items.some((i) => i.financialDocumentId === doc.id)).toBe(true);
      expect(items.find((i) => i.financialDocumentId === doc.id)?.signatureArtifactStatus).toBe(
        "ABSENT",
      );
    });
  });

  it("ensurePending catch-up creates PENDING artifact", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const artifact = await h.persistence.transaction(async (tx) =>
        ensurePendingSignatureArtifactForFinancialDocument(tx, {
          financialDocumentId: doc.id,
          now: h.clock.now(),
        }),
      );
      expect(artifact.status).toBe("PENDING");
    });
  });

  it("production authorised signer profile probe is a boolean and is not seeded by this slice", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const present = await h.persistence.withContext((ctx) =>
        hasProductionAuthorisedSignerProfile(ctx),
      );
      expect(typeof present).toBe("boolean");
    });
  });
});

describe("IMP-028 D-367 Slice 2 — durable operator attestation authority", () => {
  it("FD-OAA01 upload without explicit attestation is rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await expect(
        h.persistence.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: minimalValidPdfBytes(),
            authorisedSignerProfileId: signer.id,
            signedAt: h.clock.now(),
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: false,
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "MANUAL_UPLOAD_ATTESTATION_REQUIRED" });
      const artifact = await h.persistence.withContext((ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact).toBeNull();
    });
  });

  it("FD-OAA02 successful manual upload persists attestation authority", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const result = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      expect(result.signatureArtifact.status).toBe("SIGNED");
      expect(result.signatureArtifact.operatorAttestedSignedArtifact).toBe(true);
      expect(result.signatureArtifact.signatureProfile).toBe(
        "OPERATOR_ATTESTED_EXTERNAL",
      );
      const row = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select operator_attested_signed_artifact, signature_profile
          from app.signature_artifacts
          where financial_document_id = ${doc.id}::uuid
        `);
        return rows.rows[0];
      });
      expect(row?.operator_attested_signed_artifact).toBe(true);
      expect(row?.signature_profile).toBe("OPERATOR_ATTESTED_EXTERNAL");
    });
  });

  it("FD-OAA03 persisted attestation cannot be removed or changed after SIGNED", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
      });
      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set operator_attested_signed_artifact = null
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /immutable/i,
      );
      const artifact = await h.persistence.withContext((ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact?.operatorAttestedSignedArtifact).toBe(true);
    });
  });

  it("FD-OAA04 attestation is transactionally atomic with blob + SIGNED seal", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes(`atomic-${doc.id}`);
      const future = new Date(h.clock.now().getTime() + 60_000);
      await h.persistence.transaction(async (tx) => {
        await ensurePendingSignatureArtifactForFinancialDocument(tx, {
          financialDocumentId: doc.id,
          now: future,
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.transaction((tx) =>
            uploadManualSignedPdf(tx, {
              financialDocumentId: doc.id,
              signedPdfBytes: bytes,
              authorisedSignerProfileId: signer.id,
              signedAt: h.clock.now(),
              signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
              attestSignedArtifact: true,
              now: h.clock.now(),
            }),
          ),
        /updated_at|check constraint|23514/i,
      );

      const after = await h.persistence.withContext(async (ctx) => {
        const artifact = await loadSignatureArtifactByFinancialDocumentId(
          ctx,
          doc.id,
        );
        const blobs = await ctx.db.execute(sql`
          select count(*)::int as c
          from app.financial_document_signed_artifact_objects
          where content_hash = ${sha256Hex(bytes)}
        `);
        return {
          status: artifact?.status,
          attestation: artifact?.operatorAttestedSignedArtifact ?? null,
          blobCount: blobs.rows[0]?.c as number,
        };
      });
      expect(after.status).toBe("PENDING");
      expect(after.attestation).toBeNull();
      expect(after.blobCount).toBe(0);
    });
  });

  it("FD-OAA05 exact retry remains idempotent including durable attestation", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes(`oaa-idempotent-${doc.id}`);
      const first = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      const second = await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes,
      });
      expect(second.idempotentReplay).toBe(true);
      expect(second.objectReference).toBe(first.objectReference);
      expect(second.signatureArtifact.operatorAttestedSignedArtifact).toBe(true);
      expect(first.signatureArtifact.operatorAttestedSignedArtifact).toBe(true);
    });
  });

  it("FD-OAA06 conflicting retry and concurrent upload remain safe", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      await uploadSignedPdfForHarness(h, {
        financialDocumentId: doc.id,
        signerProfileId: signer.id,
        bytes: minimalValidPdfBytes("oaa-first"),
      });
      await expect(
        uploadSignedPdfForHarness(h, {
          financialDocumentId: doc.id,
          signerProfileId: signer.id,
          bytes: minimalValidPdfBytes("oaa-second"),
        }),
      ).rejects.toMatchObject({ code: "SIGNATURE_ARTIFACT_CONFLICT" });

      const concurrentDoc = await issueTaxInvoiceForHarness(h);
      const concurrentSigner = await insertActiveSignerForHarness(h);
      const now = h.clock.now();
      const second = getApplicationPersistence(
        applicationConfig(h.connectionString),
      );
      trackPersistenceHandle(second);
      const input = {
        financialDocumentId: concurrentDoc.id,
        signedPdfBytes: minimalValidPdfBytes("oaa-concurrent"),
        authorisedSignerProfileId: concurrentSigner.id,
        signedAt: now,
        signatureProfile: "OPERATOR_ATTESTED_EXTERNAL" as const,
        attestSignedArtifact: true,
        now,
      };
      const [a, b] = await Promise.all([
        h.persistence.transaction((tx) => uploadManualSignedPdf(tx, input)),
        second.transaction((tx) => uploadManualSignedPdf(tx, input)),
      ]);
      expect(a.signatureArtifact.id).toBe(b.signatureArtifact.id);
      expect(a.signatureArtifact.operatorAttestedSignedArtifact).toBe(true);
      expect(b.signatureArtifact.operatorAttestedSignedArtifact).toBe(true);
    });
  });

  it("FD-OAA07 signature_profile alone cannot substitute for attestation", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertActiveSignerForHarness(h);
      const bytes = minimalValidPdfBytes(`profile-not-attest-${doc.id}`);
      const now = h.clock.now();
      await h.persistence.transaction(async (tx) => {
        await ensurePendingSignatureArtifactForFinancialDocument(tx, {
          financialDocumentId: doc.id,
          now,
        });
        const stored = await putImmutableSignedArtifactBytes(tx, {
          bytes,
          now,
        });
        await sealSignatureArtifactSigned(tx, {
          financialDocumentId: doc.id,
          artifactContentHash: stored.contentHash,
          immutableObjectReference: stored.objectReference,
          signedAt: now,
          signatureMethod: "DSC",
          authorisedSignerProfileId: signer.id,
          sealedSignerDisplayName: signer.signerDisplayName,
          sealedAuthorisationReference: signer.authorisationReference,
          sealedSigningMethod: "DSC",
          sealedExternalSignerIdentity: signer.externalSignerIdentity,
          signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
          now,
        });
      });

      const artifact = await h.persistence.withContext((ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact?.status).toBe("SIGNED");
      expect(artifact?.signatureProfile).toBe("OPERATOR_ATTESTED_EXTERNAL");
      expect(artifact?.operatorAttestedSignedArtifact).toBeNull();

      await expect(
        h.persistence.transaction((tx) =>
          uploadManualSignedPdf(tx, {
            financialDocumentId: doc.id,
            signedPdfBytes: bytes,
            authorisedSignerProfileId: signer.id,
            signedAt: now,
            signatureProfile: "OPERATOR_ATTESTED_EXTERNAL",
            attestSignedArtifact: true,
            now,
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_ARTIFACT_CONFLICT" });
    });
  });
});

describe("IMP-028 D-367 fd:signing operator entrypoint", () => {
  it("supplies worker source, loads CLI config, and reaches executeSigningCli", async () => {
    const scriptSource = readFileSync(
      path.join(process.cwd(), "scripts/financial-document/signing.ts"),
      "utf8",
    );
    expect(scriptSource).toMatch(
      /loadSigningCliWorkerConfig\(process\.env\)/,
    );
    expect(scriptSource).not.toMatch(
      /loadConfig\(\{\s*processKind:\s*"worker"\s*\}\)/,
    );

    const config = loadSigningCliWorkerConfig({
      BOBA_BEAR_ENV: "local",
      BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      BOBA_BEAR_DATABASE_URL:
        "postgresql://boba_bear_app@127.0.0.1:5433/boba_bear_local",
      BOBA_BEAR_DATABASE_MIGRATION_URL:
        "postgresql://boba_bear_migrator@127.0.0.1:5433/boba_bear_local",
    });
    expect(config.processKind).toBe("worker");
    expect(config.databaseUrl).toContain("postgresql://");

    await withFinancialDocumentReadyHarness(async (h) => {
      const helpLines: string[] = [];
      const helpCode = await executeSigningCli({
        persistence: h.persistence,
        argv: ["help"],
        write: (line) => helpLines.push(line),
      });
      expect(helpCode).toBe(0);
      expect(JSON.parse(helpLines[0]!).ok).toBe(true);

      const pendingLines: string[] = [];
      const pendingCode = await executeSigningCli({
        persistence: h.persistence,
        argv: ["pending", "--limit=5"],
        write: (line) => pendingLines.push(line),
      });
      expect(pendingCode).toBe(0);
      const pendingPayload = JSON.parse(pendingLines[0]!) as {
        ok: boolean;
        operation: string;
      };
      expect(pendingPayload.ok).toBe(true);
      expect(pendingPayload.operation).toBe("pending");
    });
  });
});
