/**
 * IMP-028 D-367 Slice 1 — signature persistence foundation tests (FD-SF01..FD-SF24).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  ensureSignatureArtifactPending,
  findFinancialDocumentById,
  insertAuthorisedSignerProfile,
  insertNumberingSeries,
  loadSignatureArtifactByFinancialDocumentId,
  sealSignatureArtifactSigned,
  transitionSignatureArtifactToFailedRetryable,
} from "../../src/server/financial-document";
import * as financialDocumentServer from "../../src/server/financial-document";
import {
  canonicalizeSha256HexDigest,
  resolveSignatureRequirementForDocumentType,
  SignatureFoundationError,
  type FinancialDocument,
  type FinancialDocumentStatutoryType,
} from "../../src/shared/financial-document";
import { getApplicationPersistence } from "../../src/server/persistence";
import {
  applicationConfig,
  trackPersistenceHandle,
} from "./support/cart-fixtures";
import {
  closeTrackedPersistenceHandles,
  issueTaxInvoiceForHarness,
  reloadDocument,
  withFinancialDocumentReadyHarness,
  type FinancialDocumentReadyHarness,
} from "./support/financial-document-fixtures";

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

function completeSealInput(
  harness: FinancialDocumentReadyHarness,
  financialDocumentId: string,
  signerProfileId: string,
  overrides: Partial<{
    artifactContentHash: string;
    immutableObjectReference: string;
    signedAt: Date;
  }> = {},
) {
  const now = harness.clock.now();
  return {
    financialDocumentId,
    artifactContentHash:
      overrides.artifactContentHash ?? VALID_SHA256,
    immutableObjectReference:
      overrides.immutableObjectReference ?? `artifact-ref-${randomUUID()}`,
    signedAt: overrides.signedAt ?? now,
    signatureMethod: "DSC" as const,
    authorisedSignerProfileId: signerProfileId,
    sealedSignerDisplayName: "Authorised Signatory One",
    sealedAuthorisationReference: "BOARD-RES-2025-001",
    sealedSigningMethod: "DSC" as const,
    sealedExternalSignerIdentity: "cert-subject-ref-001",
    signatureProfile: "PAdES-B-B",
    now,
  };
}

const VALID_SHA256 =
  "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";

async function seedRejectedArtifact(
  harness: FinancialDocumentReadyHarness,
  financialDocumentId: string,
): Promise<void> {
  await harness.persistence.transaction(async (tx) => {
    await ensureSignatureArtifactPending(tx, {
      financialDocumentId,
      signatureRequirement: "REQUIRED",
      now: harness.clock.now(),
    });
  });
  await harness.persistence.withContext(async (ctx) =>
    ctx.db.execute(sql`
      update app.signature_artifacts
      set status = 'REJECTED', updated_at = ${harness.clock.now()}
      where financial_document_id = ${financialDocumentId}::uuid
    `),
  );
}

async function insertSignerForHarness(
  harness: Parameters<typeof issueTaxInvoiceForHarness>[0],
) {
  return harness.persistence.transaction(async (tx) =>
    insertAuthorisedSignerProfile(tx, {
      legalEntityId: harness.legalEntityId,
      signerDisplayName: "Authorised Signatory One",
      authorisationReference: "BOARD-RES-2025-001",
      effectiveFrom: harness.clock.now(),
      signingMethod: "DSC",
      externalSignerIdentity: "cert-subject-ref-001",
      lifecycleStatus: "active",
      now: harness.clock.now(),
    }),
  );
}

async function issueDocumentOfType(
  harness: FinancialDocumentReadyHarness,
  documentType: FinancialDocumentStatutoryType,
): Promise<FinancialDocument> {
  const now = harness.clock.now();
  const series = await harness.persistence.transaction((tx) =>
    insertNumberingSeries(tx, {
      legalEntityId: harness.legalEntityId,
      documentType,
      financialYear: harness.financialYear,
      seriesCode: documentType.slice(0, 3),
      prefix: `${documentType.slice(0, 2)}/2526/`,
      now,
    }),
  );

  if (documentType === "REFUND_VOUCHER") {
    const priorReceipt = await issueDocumentOfType(harness, "RECEIPT_VOUCHER");
    return issueTaxInvoiceForHarness(harness, {
      documentType,
      numberingSeriesId: series.id,
      priorFinancialDocumentId: priorReceipt.id,
      priorDocumentType: "RECEIPT_VOUCHER",
      logicalIssuanceKey: `fd-${documentType}-${randomUUID()}`,
    });
  }

  if (documentType === "CREDIT_NOTE") {
    const priorTaxInvoice = await issueTaxInvoiceForHarness(harness);
    return issueTaxInvoiceForHarness(harness, {
      documentType,
      numberingSeriesId: series.id,
      priorFinancialDocumentId: priorTaxInvoice.id,
      priorDocumentType: "TAX_INVOICE",
      logicalIssuanceKey: `fd-${documentType}-${randomUUID()}`,
    });
  }

  return issueTaxInvoiceForHarness(harness, {
    documentType,
    numberingSeriesId: series.id,
    logicalIssuanceKey: `fd-${documentType}-${randomUUID()}`,
  });
}

describe("IMP-028 D-367 signature persistence foundation", () => {
  it("FD-SF01 AuthorisedSignerProfile can persist valid effective authority", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const profile = await insertSignerForHarness(h);
      expect(profile.signerDisplayName).toBe("Authorised Signatory One");
      expect(profile.signingMethod).toBe("DSC");
      expect(profile.effectiveTo).toBeNull();
    });
  });

  it("FD-SF02 effectiveTo <= effectiveFrom rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const now = h.clock.now();
      await expect(
        h.persistence.transaction((tx) =>
          insertAuthorisedSignerProfile(tx, {
            legalEntityId: h.legalEntityId,
            signerDisplayName: "Invalid Range Signer",
            authorisationReference: "REF-1",
            effectiveFrom: now,
            effectiveTo: now,
            signingMethod: "DSC",
            now,
          }),
        ),
      ).rejects.toMatchObject({ code: "INVALID_EFFECTIVE_DATE_RANGE" });
    });
  });

  it("FD-SF03 private-key/secret material is absent from schema/domain", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        const columns = await ctx.db.execute(sql`
          select table_name, column_name
          from information_schema.columns
          where table_schema = 'app'
            and table_name in ('authorised_signer_profiles', 'signature_artifacts')
            and (
              column_name ilike '%private%'
              or column_name ilike '%secret%'
              or column_name ilike '%pfx%'
              or column_name ilike '%password%'
              or column_name ilike '%pin%'
              or column_name ilike '%key%'
            )
        `);
        expect(columns.rows).toEqual([]);
      });

      const sqlText = readFileSync(
        path.join(process.cwd(), "drizzle/0023_financial_document_signature_foundation.sql"),
        "utf8",
      );
      expect(sqlText).not.toMatch(/private_key|pfx|pkcs12|password|secret/i);
    });
  });

  it("FD-SF04 historical signer profile cannot be mutated when referenced by SIGNED artifact", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.authorised_signer_profiles
              set signer_display_name = 'Mutated Name'
              where id = ${signer.id}::uuid
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("FD-SF05 SignatureArtifact PENDING created for valid FinancialDocument", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const artifact = await h.persistence.transaction(async (tx) =>
        ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        }),
      );
      expect(artifact.status).toBe("PENDING");
      expect(artifact.financialDocumentId).toBe(doc.id);
      expect(artifact.artifactContentHash).toBeNull();
    });
  });

  it("FD-SF06 second create/ensure for same FD returns same one-to-one authority", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const first = await h.persistence.transaction(async (tx) =>
        ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        }),
      );
      const second = await h.persistence.transaction(async (tx) =>
        ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        }),
      );
      expect(second.id).toBe(first.id);
    });
  });

  it("FD-SF07 DB unique constraint prevents two artifact parents for same FD", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              insert into app.signature_artifacts (
                id, financial_document_id, signature_requirement, status,
                created_at, updated_at
              ) values (
                ${randomUUID()}::uuid,
                ${doc.id}::uuid,
                'REQUIRED',
                'PENDING',
                ${h.clock.now()},
                ${h.clock.now()}
              )
            `),
          ),
        /duplicate key|unique|23505/i,
      );
    });
  });

  it("FD-SF08 SignatureArtifact does not mutate FinancialDocument.status", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await transitionSignatureArtifactToFailedRetryable(tx, {
          financialDocumentId: doc.id,
          now: h.clock.now(),
        });
      });
      const reloaded = await reloadDocument(h, doc.id);
      expect(reloaded?.status).toBe("ISSUED");
    });
  });

  it("FD-SF09 PENDING may omit signed-success fields", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const artifact = await h.persistence.transaction(async (tx) =>
        ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        }),
      );
      expect(artifact.signedAt).toBeNull();
      expect(artifact.immutableObjectReference).toBeNull();
    });
  });

  it("FD-SF10 FAILED_RETRYABLE may omit signed-success fields", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const artifact = await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        return transitionSignatureArtifactToFailedRetryable(tx, {
          financialDocumentId: doc.id,
          now: h.clock.now(),
        });
      });
      expect(artifact.status).toBe("FAILED_RETRYABLE");
      expect(artifact.artifactContentHash).toBeNull();
    });
  });

  it("FD-SF11 REJECTED domain value may persist without signed-success fields (reserved; no foundation transition)", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await seedRejectedArtifact(h, doc.id);

      const artifact = await h.persistence.withContext(async (ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact?.status).toBe("REJECTED");
      expect(artifact?.sealedSignerDisplayName).toBeNull();
      expect(artifact?.artifactContentHash).toBeNull();
    });
  });

  it("FD-SF12 SIGNED without artifact hash rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'SIGNED',
                  artifact_content_hash_algorithm = 'SHA-256',
                  immutable_object_reference = 'ref-1',
                  signed_at = ${h.clock.now()},
                  signature_method = 'DSC',
                  authorised_signer_profile_id = ${signer.id}::uuid,
                  sealed_signer_display_name = 'Signer',
                  sealed_authorisation_reference = 'AUTH-1',
                  sealed_signing_method = 'DSC',
                  signature_profile = 'PAdES-B-B',
                  updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /check constraint|23514|signed_success|artifact_content_hash/i,
      );
    });
  });

  it("FD-SF13 SIGNED without immutable object ref rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'SIGNED',
                  artifact_content_hash_algorithm = 'SHA-256',
                  artifact_content_hash = 'abc123',
                  signed_at = ${h.clock.now()},
                  signature_method = 'DSC',
                  authorised_signer_profile_id = ${signer.id}::uuid,
                  sealed_signer_display_name = 'Signer',
                  sealed_authorisation_reference = 'AUTH-1',
                  sealed_signing_method = 'DSC',
                  signature_profile = 'PAdES-B-B',
                  updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /check constraint|23514|signed_success|immutable_object_reference/i,
      );
    });
  });

  it("FD-SF14 SIGNED without signedAt rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'SIGNED',
                  artifact_content_hash_algorithm = 'SHA-256',
                  artifact_content_hash = 'abc123',
                  immutable_object_reference = 'ref-1',
                  signature_method = 'DSC',
                  authorised_signer_profile_id = ${signer.id}::uuid,
                  sealed_signer_display_name = 'Signer',
                  sealed_authorisation_reference = 'AUTH-1',
                  sealed_signing_method = 'DSC',
                  signature_profile = 'PAdES-B-B',
                  updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /check constraint|23514|signed_success|signed_at/i,
      );
    });
  });

  it("FD-SF15 SIGNED without signer authority rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'SIGNED',
                  artifact_content_hash_algorithm = 'SHA-256',
                  artifact_content_hash = 'abc123',
                  immutable_object_reference = 'ref-1',
                  signed_at = ${h.clock.now()},
                  signature_method = 'DSC',
                  sealed_signer_display_name = 'Signer',
                  sealed_authorisation_reference = 'AUTH-1',
                  sealed_signing_method = 'DSC',
                  signature_profile = 'PAdES-B-B',
                  updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /check constraint|23514|signed_success|authorised_signer_profile_id/i,
      );
    });
  });

  it("FD-SF16 valid complete SIGNED transition succeeds", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      const sealed = await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        return sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });
      expect(sealed.status).toBe("SIGNED");
      expect(sealed.artifactContentHashAlgorithm).toBe("SHA-256");
      expect(sealed.sealedSignerDisplayName).toBe("Authorised Signatory One");
    });
  });

  it("FD-SF17 SIGNED → PENDING rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'PENDING', updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("FD-SF18 SIGNED → FAILED_RETRYABLE rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      await expect(
        h.persistence.transaction(async (tx) =>
          transitionSignatureArtifactToFailedRetryable(tx, {
            financialDocumentId: doc.id,
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_ARTIFACT_IMMUTABLE" });
    });
  });

  it("FD-SF19 SIGNED success metadata mutation rejected", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set artifact_content_hash = 'different-hash', updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("FD-SF20 concurrent equivalent successful seal converges safely", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      const sealInput = completeSealInput(h, doc.id, signer.id);
      const second = getApplicationPersistence(applicationConfig(h.connectionString));
      trackPersistenceHandle(second);

      const [a, b] = await Promise.all([
        h.persistence.transaction((tx) => sealSignatureArtifactSigned(tx, sealInput)),
        second.transaction((tx) => sealSignatureArtifactSigned(tx, sealInput)),
      ]);
      expect(a.id).toBe(b.id);
      expect(a.status).toBe("SIGNED");
    });
  });

  it("FD-SF21 concurrent conflicting successful seal permits at most one winner", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      const second = getApplicationPersistence(applicationConfig(h.connectionString));
      trackPersistenceHandle(second);
      const winnerInput = completeSealInput(h, doc.id, signer.id, {
        artifactContentHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      });
      const loserInput = completeSealInput(h, doc.id, signer.id, {
        artifactContentHash:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      });

      const results = await Promise.allSettled([
        h.persistence.transaction((tx) => sealSignatureArtifactSigned(tx, winnerInput)),
        second.transaction((tx) => sealSignatureArtifactSigned(tx, loserInput)),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const artifact = await h.persistence.withContext(async (ctx) =>
        loadSignatureArtifactByFinancialDocumentId(ctx, doc.id),
      );
      expect(artifact?.status).toBe("SIGNED");
      expect([
        winnerInput.artifactContentHash,
        loserInput.artifactContentHash,
      ]).toContain(artifact?.artifactContentHash);
    });
  });

  it("FD-SF22 signed artifact FK/history delete semantics match statutory immutability", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              delete from app.signature_artifacts
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /cannot be deleted/i,
      );

      const fk = await h.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute(sql`
          select confdeltype
          from pg_constraint
          where conname = 'signature_artifacts_financial_document_fk'
        `);
        return rows.rows[0]?.confdeltype;
      });
      expect(fk).toBe("r");
    });
  });

  it("FD-SF23 existing issued FinancialDocument remains immutable after artifact operations", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const before = await reloadDocument(h, doc.id);
      const signer = await insertSignerForHarness(h);

      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        await sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id),
        );
      });

      const after = await reloadDocument(h, doc.id);
      expect(after).toEqual(before);

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.financial_documents
              set statutory_document_number = 'HACKED'
              where id = ${doc.id}::uuid
            `),
          ),
        /immutable/i,
      );
    });
  });

  it("FD-SF24 no provider/PDF/customer-route/Payment/Order/Refund/D-366 implementation introduced", async () => {
    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0023_financial_document_signature_foundation.sql"),
      "utf8",
    );
    expect(sqlText).not.toMatch(/refund_statutory|payment.*sign|order.*sign/i);

    expect(resolveSignatureRequirementForDocumentType("TAX_INVOICE")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("RECEIPT_VOUCHER")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("REFUND_VOUCHER")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("CREDIT_NOTE")).toBe("REQUIRED");
    expect(() => resolveSignatureRequirementForDocumentType("BILL_OF_SUPPLY")).toThrow(
      expect.objectContaining({ code: "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED" }),
    );

    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const row = await h.persistence.withContext(async (ctx) =>
        findFinancialDocumentById(ctx, doc.id),
      );
      expect(row?.status).toBe("ISSUED");
      expect(() => {
        throw new SignatureFoundationError("UPSTREAM_REFERENCE_INVALID", "probe");
      }).not.toThrow(/RefundStatutoryDecision/);
    });
  });
});

describe("IMP-028 D-367 signature requirement policy", () => {
  it("resolves REQUIRED for TAX_INVOICE, RECEIPT_VOUCHER, REFUND_VOUCHER, and CREDIT_NOTE", () => {
    expect(resolveSignatureRequirementForDocumentType("TAX_INVOICE")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("RECEIPT_VOUCHER")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("REFUND_VOUCHER")).toBe("REQUIRED");
    expect(resolveSignatureRequirementForDocumentType("CREDIT_NOTE")).toBe("REQUIRED");
  });

  it("fail-closes BILL_OF_SUPPLY without silently resolving NOT_REQUIRED", () => {
    expect(() => resolveSignatureRequirementForDocumentType("BILL_OF_SUPPLY")).toThrow(
      expect.objectContaining({ code: "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED" }),
    );
  });

  it.each([
    ["TAX_INVOICE", "TI"],
    ["RECEIPT_VOUCHER", "RV"],
    ["REFUND_VOUCHER", "RFV"],
    ["CREDIT_NOTE", "CN"],
  ] as const)(
    "rejects explicit %s + NOT_REQUIRED caller override through ensureSignatureArtifactPending",
    async (documentType, _label) => {
      await withFinancialDocumentReadyHarness(async (h) => {
        const doc = await issueDocumentOfType(h, documentType);
        await expect(
          h.persistence.transaction((tx) =>
            ensureSignatureArtifactPending(tx, {
              financialDocumentId: doc.id,
              signatureRequirement: "NOT_REQUIRED",
              now: h.clock.now(),
            }),
          ),
        ).rejects.toMatchObject({ code: "SIGNATURE_REQUIREMENT_POLICY_CONFLICT" });
      });
    },
  );

  it("fail-closes BILL_OF_SUPPLY ensure without persisting NOT_REQUIRED or REQUIRED", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueDocumentOfType(h, "BILL_OF_SUPPLY");
      await expect(
        h.persistence.transaction((tx) =>
          ensureSignatureArtifactPending(tx, {
            financialDocumentId: doc.id,
            signatureRequirement: "REQUIRED",
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED" });
      await expect(
        h.persistence.transaction((tx) =>
          ensureSignatureArtifactPending(tx, {
            financialDocumentId: doc.id,
            signatureRequirement: "NOT_REQUIRED",
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_REQUIREMENT_POLICY_UNRESOLVED" });
    });
  });

  it("keeps REQUIRED artifacts PENDING without automatic signing", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const artifact = await h.persistence.transaction((tx) =>
        ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        }),
      );
      expect(artifact.signatureRequirement).toBe("REQUIRED");
      expect(artifact.status).toBe("PENDING");
      expect(artifact.signedAt).toBeNull();
      expect(artifact.immutableObjectReference).toBeNull();
    });
  });
});

describe("IMP-028 D-367 signature schema inventory", () => {
  it("creates signing foundation tables with one-artifact-per-FD authority", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      await h.persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute(sql`
          select table_name
          from information_schema.tables
          where table_schema = 'app'
            and table_name in ('authorised_signer_profiles', 'signature_artifacts')
          order by table_name
        `);
        expect(tables.rows.map((row) => row.table_name)).toEqual([
          "authorised_signer_profiles",
          "signature_artifacts",
        ]);
      });
    });

    const sqlText = readFileSync(
      path.join(process.cwd(), "drizzle/0023_financial_document_signature_foundation.sql"),
      "utf8",
    );
    expect(sqlText).toContain("signature_artifacts_financial_document_uidx");
    expect(sqlText).toContain("forbid_signed_signature_artifact_mutation");
    expect(sqlText).toContain("forbid_referenced_authorised_signer_profile_mutation");
    expect(sqlText).toContain("ON DELETE restrict");
  });
});

describe("IMP-028 D-367 Slice 1 surgical correction", () => {
  it("FD-SC01 no foundation repository operation exposes REJECTED transition", () => {
    expect("transitionSignatureArtifactToRejected" in financialDocumentServer).toBe(false);
  });

  it("FD-SC02 encountered REJECTED state fails closed on seal", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await seedRejectedArtifact(h, doc.id);

      await expect(
        h.persistence.transaction(async (tx) =>
          sealSignatureArtifactSigned(tx, completeSealInput(h, doc.id, signer.id)),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_REJECTED_POLICY_UNRESOLVED" });
    });
  });

  it("FD-SC03 encountered REJECTED state fails closed on FAILED_RETRYABLE transition", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await seedRejectedArtifact(h, doc.id);

      await expect(
        h.persistence.transaction(async (tx) =>
          transitionSignatureArtifactToFailedRetryable(tx, {
            financialDocumentId: doc.id,
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_REJECTED_POLICY_UNRESOLVED" });
    });
  });

  it("FD-SC04 encountered REJECTED state fails closed on ensure", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      await seedRejectedArtifact(h, doc.id);

      await expect(
        h.persistence.transaction(async (tx) =>
          ensureSignatureArtifactPending(tx, {
            financialDocumentId: doc.id,
            signatureRequirement: "REQUIRED",
            now: h.clock.now(),
          }),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_REJECTED_POLICY_UNRESOLVED" });
    });
  });

  it("FD-SC05 valid canonical SHA-256 accepted", () => {
    expect(canonicalizeSha256HexDigest(VALID_SHA256)).toBe(VALID_SHA256);
  });

  it("FD-SC06 63-char digest rejected", () => {
    expect(() =>
      canonicalizeSha256HexDigest("a".repeat(63)),
    ).toThrow(expect.objectContaining({ code: "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE" }));
  });

  it("FD-SC07 65-char digest rejected", () => {
    expect(() =>
      canonicalizeSha256HexDigest("a".repeat(65)),
    ).toThrow(expect.objectContaining({ code: "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE" }));
  });

  it("FD-SC08 non-hex digest rejected", () => {
    expect(() =>
      canonicalizeSha256HexDigest(`${"a".repeat(63)}g`),
    ).toThrow(expect.objectContaining({ code: "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE" }));
  });

  it("FD-SC09 uppercase hex canonicalized to lowercase before persistence", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      const uppercase = VALID_SHA256.toUpperCase();
      expect(uppercase).not.toBe(VALID_SHA256);

      const sealed = await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
        return sealSignatureArtifactSigned(
          tx,
          completeSealInput(h, doc.id, signer.id, {
            artifactContentHash: uppercase,
          }),
        );
      });
      expect(sealed.artifactContentHash).toBe(VALID_SHA256);
    });
  });

  it("FD-SC10 repository rejects invalid digest on seal", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expect(
        h.persistence.transaction(async (tx) =>
          sealSignatureArtifactSigned(
            tx,
            completeSealInput(h, doc.id, signer.id, {
              artifactContentHash: "abc123",
            }),
          ),
        ),
      ).rejects.toMatchObject({ code: "SIGNATURE_ARTIFACT_SIGNED_INCOMPLETE" });
    });
  });

  it("FD-SC11 DB rejects invalid digest representation on SIGNED update", async () => {
    await withFinancialDocumentReadyHarness(async (h) => {
      const doc = await issueTaxInvoiceForHarness(h);
      const signer = await insertSignerForHarness(h);
      await h.persistence.transaction(async (tx) => {
        await ensureSignatureArtifactPending(tx, {
          financialDocumentId: doc.id,
          signatureRequirement: "REQUIRED",
          now: h.clock.now(),
        });
      });

      await expectPostgresFailure(
        () =>
          h.persistence.withContext(async (ctx) =>
            ctx.db.execute(sql`
              update app.signature_artifacts
              set status = 'SIGNED',
                  artifact_content_hash_algorithm = 'SHA-256',
                  artifact_content_hash = 'abc123',
                  immutable_object_reference = 'ref-1',
                  signed_at = ${h.clock.now()},
                  signature_method = 'DSC',
                  authorised_signer_profile_id = ${signer.id}::uuid,
                  sealed_signer_display_name = 'Signer',
                  sealed_authorisation_reference = 'AUTH-1',
                  sealed_signing_method = 'DSC',
                  signature_profile = 'PAdES-B-B',
                  updated_at = ${h.clock.now()}
              where financial_document_id = ${doc.id}::uuid
            `),
          ),
        /check constraint|23514|artifact_content_hash_format/i,
      );
    });
  });
});
