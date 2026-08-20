/**
 * IMP-028 Slice 6 — Customer Financial Document HTTP transport (FD-T01…FD-T22).
 *
 * Real Testcontainers/PostgreSQL + customer-commerce HTTP façade.
 * Ownership / prior authority remain Slice-5 application boundaries.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { issueFinancialDocument } from "../../src/server/financial-document";
import { signFinancialDocumentWithRenderedPdf } from "../database/support/manual-signed-upload-fixtures";
import { suggestFinancialDocumentArtifactFilename } from "../../src/shared/financial-document";
import {
  mintCustomerSessionCookieHeader,
  withCustomerCommerceHttpService,
} from "./support/service-harness";
import {
  buildIssueCommand,
  closeTrackedPersistenceHandles,
  withFinancialDocumentIssuanceHarness,
} from "../database/support/financial-document-issuance-fixtures";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");

const ALLOWED_LIST_KEYS = [
  "currency",
  "documentType",
  "financialDocumentId",
  "grandTotalPaise",
  "issueAt",
  "orderId",
  "statutoryDocumentNumber",
].sort();

const noCustomerCommerce = {
  checkoutId: null,
  checkoutSnapshotId: null,
  paymentId: null,
  orderId: null,
  refundId: null,
} as const;

afterEach(async () => {
  await closeTrackedPersistenceHandles();
  vi.restoreAllMocks();
});

async function authCookie(
  connectionString: string,
  customerAuthUserId: string,
): Promise<string> {
  return mintCustomerSessionCookieHeader(connectionString, customerAuthUserId);
}

function assertNoStoreAndRequestId(response: Response): void {
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-request-id")).toBeTruthy();
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    text += "\n";
  }
  return text;
}

describe("IMP-028 Slice 6 — Financial Document customer transport (FD-T01…FD-T22)", () => {
  it("FD-T01 Authenticated customer lists own Order Financial Documents", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t01-${randomUUID()}` }),
      );
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(200);
        assertNoStoreAndRequestId(response);
        const body = await response.json();
        expect(body.ok).toBe(true);
        expect(Array.isArray(body.financialDocuments)).toBe(true);
        expect(
          body.financialDocuments.some(
            (item: { financialDocumentId: string }) =>
              item.financialDocumentId === doc.id,
          ),
        ).toBe(true);
      });
    });
  });

  it("FD-T02 Other customer's Order does not disclose documents", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t02-${randomUUID()}` }),
      );
      const otherCookie = await authCookie(
        h.connectionString,
        h.actors.customerBId,
      );

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
          { headers: { cookie: otherCookie } },
        );
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body).toEqual({
          ok: false,
          code: "DOCUMENT_NOT_FOUND",
          requestId: expect.any(String),
        });
        expect(body).not.toHaveProperty("financialDocuments");
        expect(body).not.toHaveProperty("message");
      });
    });
  });

  it("FD-T03 Unknown Order follows non-oracle convention", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);
      const unknownOrderId = randomUUID();

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/orders/${unknownOrderId}/financial-documents`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(404);
        expect((await response.json()).code).toBe("DOCUMENT_NOT_FOUND");
      });
    });
  });

  it("FD-T04 Unauthenticated list request rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
        );
        expect(response.status).toBe(401);
        expect((await response.json()).code).toBe("CUSTOMER_AUTH_REQUIRED");
      });
    });
  });

  it("FD-T05 / FD-T06 / FD-T07 Authorized Tax Invoice PDF download", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t05-${randomUUID()}` }),
      );
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const expectedFilename = suggestFinancialDocumentArtifactFilename(doc);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("content-disposition")).toBe(
          `attachment; filename="${expectedFilename}"`,
        );
        assertNoStoreAndRequestId(response);

        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(response.headers.get("content-length")).toBe(String(bytes.byteLength));
        expect(Buffer.from(bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
        expect(expectedFilename).not.toContain(doc.id);
      });
    });
  });

  it("FD-T08 Filename/header injection cannot occur (transport unit + live disposition)", async () => {
    // Live disposition is covered by FD-T07; injection rejection is unit-tested in
    // helpers.test.ts. Prove live header never contains CR/LF/quotes breakout.
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t08-${randomUUID()}` }),
      );
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
          { headers: { cookie } },
        );
        const disposition = response.headers.get("content-disposition") ?? "";
        expect(disposition).toMatch(/^attachment; filename="[A-Za-z0-9._-]+\.pdf"$/);
        expect(disposition).not.toMatch(/[\r\n]/);
        expect(disposition.split('"').length).toBe(3);
      });
    });
  });

  it("FD-T09 Other customer's Financial Document does not disclose existence", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t09-${randomUUID()}` }),
      );
      const otherCookie = await authCookie(
        h.connectionString,
        h.actors.customerBId,
      );

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
          { headers: { cookie: otherCookie } },
        );
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.code).toBe("DOCUMENT_NOT_FOUND");
        expect(response.headers.get("content-type")).toMatch(/application\/json/);
      });
    });
  });

  it("FD-T10 Unknown Financial Document matches unauthorized disclosure behavior", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);
      const unknownId = randomUUID();

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${unknownId}/pdf`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(404);
        expect((await response.json()).code).toBe("DOCUMENT_NOT_FOUND");
      });
    });
  });

  it("FD-T11 Non-customer-associated issued Financial Document matches non-oracle behavior", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const orphan = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-t11-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${orphan.id}/pdf`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(404);
        expect((await response.json()).code).toBe("DOCUMENT_NOT_FOUND");
      });
    });
  });

  it("FD-T12 Unauthenticated PDF request rejected", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t12-${randomUUID()}` }),
      );

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
        );
        expect(response.status).toBe(401);
        expect((await response.json()).code).toBe("CUSTOMER_AUTH_REQUIRED");
      });
    });
  });

  it("FD-T13 Credit Note PDF resolves verified prior automatically", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t13-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-t13-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, creditNote.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${creditNote.id}/pdf`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        const bytes = new Uint8Array(await response.arrayBuffer());
        expect(Buffer.from(bytes.subarray(0, 5)).toString("utf8")).toBe("%PDF-");
        const text = await extractPdfText(bytes);
        expect(text).toContain(creditNote.statutoryDocumentNumber);
        expect(text).toContain(invoice.statutoryDocumentNumber);
      });
    });
  });

  it("FD-T14 Request cannot supply/substitute prior authority", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const invoice = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t14-ti-${randomUUID()}` }),
      );
      const creditNote = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          documentType: "CREDIT_NOTE",
          logicalIssuanceKey: `fd-t14-cn-${randomUUID()}`,
          priorFinancialDocumentId: invoice.id,
        }),
      );
      const foreignPrior = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-t14-foreign-${randomUUID()}`,
          ...noCustomerCommerce,
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, creditNote.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const withQuery = await fetch(
          `${baseUrl}/api/v1/financial-documents/${creditNote.id}/pdf?priorFinancialDocumentId=${foreignPrior.id}&priorDocumentType=TAX_INVOICE`,
          { headers: { cookie } },
        );
        expect(withQuery.status).toBe(200);
        const bytes = new Uint8Array(await withQuery.arrayBuffer());
        const text = await extractPdfText(bytes);
        expect(text).toContain(invoice.statutoryDocumentNumber);
        expect(text).not.toContain(foreignPrior.statutoryDocumentNumber);

        const post = await fetch(
          `${baseUrl}/api/v1/financial-documents/${creditNote.id}/pdf`,
          {
            method: "POST",
            headers: {
              cookie,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              priorFinancialDocumentId: foreignPrior.id,
            }),
          },
        );
        expect(post.status).toBe(405);
      });
    });
  });

  it("FD-T15 Listing response contains only allowed projection keys", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t15-${randomUUID()}` }),
      );
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
          { headers: { cookie } },
        );
        const body = await response.json();
        expect(body.financialDocuments.length).toBeGreaterThan(0);
        for (const item of body.financialDocuments) {
          expect(Object.keys(item).sort()).toEqual(ALLOWED_LIST_KEYS);
          expect(item).not.toHaveProperty("issuerProfileId");
          expect(item).not.toHaveProperty("numberingSeriesId");
          expect(item).not.toHaveProperty("checkoutId");
          expect(item).not.toHaveProperty("checkoutSnapshotId");
          expect(item).not.toHaveProperty("paymentId");
          expect(item).not.toHaveProperty("refundId");
          expect(item).not.toHaveProperty("lines");
          expect(typeof item.grandTotalPaise).toBe("string");
          expect(item.grandTotalPaise).toMatch(/^\d+$/);
          expect(item.documentType).not.toBe("TAX_RECEIPT");
        }
      });
    });
  });

  it("FD-T16 Metadata/PDF responses have private/no-shared-cache policy", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t16-${randomUUID()}` }),
      );
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const list = await fetch(
          `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
          { headers: { cookie } },
        );
        const pdf = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
          { headers: { cookie } },
        );
        expect(list.headers.get("cache-control")).toBe("no-store");
        expect(pdf.headers.get("cache-control")).toBe("no-store");
      });
    });
  });

  it("FD-T17 No internal UUID in PDF content (route id may appear only in HTTP path/logs)", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-t17-${randomUUID()}`,
          recipientDisplayName: "Transport Customer",
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
          { headers: { cookie } },
        );
        const bytes = new Uint8Array(await response.arrayBuffer());
        const text = await extractPdfText(bytes);
        const raw = Buffer.from(bytes).toString("latin1");
        for (const id of [
          doc.id,
          doc.issuerProfileId,
          doc.numberingSeriesId,
          doc.checkoutId,
          doc.orderId,
          doc.paymentId,
          h.checkoutId,
          h.orderId,
        ]) {
          if (id) {
            expect(text).not.toContain(id);
            expect(raw).not.toContain(id);
          }
        }
      });
    });
  });

  it("FD-T18 Malformed Financial Document identifier does not produce 500", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        const response = await fetch(
          `${baseUrl}/api/v1/financial-documents/not-a-uuid/pdf`,
          { headers: { cookie } },
        );
        expect(response.status).toBe(400);
        expect((await response.json()).code).toBe("INVALID_ACCESS_INPUT");
        expect(response.status).not.toBe(500);
      });
    });
  });

  it("FD-T19 No raw HTML endpoint introduced", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t19-${randomUUID()}` }),
      );
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        for (const pathSuffix of [
          `/api/v1/financial-documents/${doc.id}/html`,
          `/api/v1/financial-documents/${doc.id}`,
          `/api/v1/orders/${h.orderId}/financial-documents/${doc.id}/html`,
        ]) {
          const response = await fetch(`${baseUrl}${pathSuffix}`, {
            headers: { cookie },
          });
          expect(response.status).toBe(404);
          expect((await response.json()).code).toBe("NOT_FOUND");
        }
      });
    });
  });

  it("FD-T20 No write/state-changing document endpoint introduced", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, { logicalIssuanceKey: `fd-t20-${randomUUID()}` }),
      );
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);

      await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
          const list = await fetch(
            `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
            { method, headers: { cookie } },
          );
          expect(list.status).toBe(405);

          const pdf = await fetch(
            `${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`,
            { method, headers: { cookie } },
          );
          expect(pdf.status).toBe(405);
        }
      });
    });
  });

  it("FD-T21 No transport PII logging added", async () => {
    await withFinancialDocumentIssuanceHarness(async (h) => {
      const doc = await issueFinancialDocument(
        h.persistence,
        buildIssueCommand(h, {
          logicalIssuanceKey: `fd-t21-${randomUUID()}`,
          recipientDisplayName: "PII Transport Name",
        }),
      );
      await signFinancialDocumentWithRenderedPdf(h, doc.id);
      const cookie = await authCookie(h.connectionString, h.actors.customerAId);
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(" "));
      };

      try {
        await withCustomerCommerceHttpService(h.connectionString, async ({ baseUrl }) => {
          await fetch(
            `${baseUrl}/api/v1/orders/${h.orderId}/financial-documents`,
            { headers: { cookie } },
          );
          await fetch(`${baseUrl}/api/v1/financial-documents/${doc.id}/pdf`, {
            headers: { cookie },
          });
        });
      } finally {
        console.log = originalLog;
      }

      const joined = logs.join("\n");
      expect(joined).not.toContain("PII Transport Name");
      expect(joined).not.toMatch(/<!DOCTYPE html/i);
      expect(joined).not.toContain("%PDF-");
      expect(joined).not.toContain(doc.statutoryDocumentNumber);
    });
  });

  it("FD-T22 Slice-5 access service remains the only ownership authority path", () => {
    const router = readFileSync(
      path.join(REPO_ROOT, "src/server/customer-commerce/http/router.ts"),
      "utf8",
    );
    expect(router).toMatch(/\blistFinancialDocumentsForCustomerOrder\b/);
    expect(router).toMatch(/\bgenerateCustomerFinancialDocumentArtifact\b/);
    expect(router).not.toMatch(/\bgenerateFinancialDocumentArtifact\b/);
    expect(router).not.toMatch(/\bloadFinancialDocument\b/);
    expect(router).not.toMatch(/\blistFinancialDocumentsForOrder\b/);
    expect(router).not.toMatch(/financial-document\/repository/);
    expect(router).not.toMatch(/shared\/financial-document\/artifact/);
    expect(router).not.toMatch(/resolveCustomerFinancialDocumentOwnership/);
  });
});
