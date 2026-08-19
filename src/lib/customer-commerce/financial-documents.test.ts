import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { customerFinancialDocumentPdfPath } from "./financial-documents";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("customer-commerce financial-documents client", () => {
  it("builds the Slice-6 PDF path from the opaque financialDocumentId", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(customerFinancialDocumentPdfPath(id)).toBe(
      `/api/v1/financial-documents/${id}/pdf`,
    );
  });

  it("FD-UI14/15 list client uses order financial-documents path only", () => {
    const source = readFileSync(path.join(HERE, "financial-documents.ts"), "utf8");
    expect(source).toMatch(/\/api\/v1\/orders\/\$\{encodeURIComponent\(orderId\)\}\/financial-documents/);
    expect(source).toMatch(/\/api\/v1\/financial-documents\/\$\{encodeURIComponent\(financialDocumentId\)\}\/pdf/);
    expect(source).not.toMatch(/\/html/);
    expect(source).not.toMatch(/\bpriorFinancialDocumentId\b/);
    expect(source).not.toMatch(/issueFinancialDocument/);
  });
});
