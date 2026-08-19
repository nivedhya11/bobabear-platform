/**
 * Financial Document PDF / artifact generation (IMP-028 Slice 4).
 *
 * Topology (one rendering truth):
 *   FinancialDocument
 *   → projectFinancialDocumentRenderModel
 *   → renderFinancialDocumentHtml
 *   → PDF conversion
 *
 * PDF bytes are a presentation artifact — never domain authority.
 * No storage, HTTP transport, or live catalog/issuer/customer lookups.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderHtmlToPdf } from "html2pdfsmith";

import { FinancialDocumentError } from "./errors";
import { formatStatutoryDocumentTitle } from "./format";
import {
  renderFinancialDocument,
  type FinancialDocumentRenderAuthorityDependencies,
} from "./render";
import type { FinancialDocument } from "./types";

export const FINANCIAL_DOCUMENT_PDF_MEDIA_TYPE = "application/pdf" as const;

export type FinancialDocumentArtifact = Readonly<{
  mediaType: typeof FINANCIAL_DOCUMENT_PDF_MEDIA_TYPE;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
  suggestedFilename: string;
}>;

const FONT_FAMILY = "DejaVu Sans";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_REGULAR_SOURCE = path.join(HERE, "assets", "fonts", "DejaVuSans.ttf");
const FONT_BOLD_SOURCE = path.join(HERE, "assets", "fonts", "DejaVuSans-Bold.ttf");

/**
 * Materialize packaged fonts into a stable local temp directory.
 * html2pdfsmith/pdfkit register fonts by filesystem path; loading via a
 * process-local copy avoids Vitest/transform path quirks while keeping
 * HTML resourcePolicy.allowFile=false (fonts are not HTML resources).
 */
let cachedFontPaths: Readonly<{ regularPath: string; boldPath: string }> | null =
  null;

function resolveBundledFontPaths(): Readonly<{
  regularPath: string;
  boldPath: string;
}> {
  if (cachedFontPaths) {
    return cachedFontPaths;
  }
  const regularBytes = readFileSync(FONT_REGULAR_SOURCE);
  const boldBytes = readFileSync(FONT_BOLD_SOURCE);
  const dir = path.join(tmpdir(), "boba-bear-fd-fonts");
  mkdirSync(dir, { recursive: true });
  const regularPath = path.join(dir, "DejaVuSans.ttf");
  const boldPath = path.join(dir, "DejaVuSans-Bold.ttf");
  writeFileSync(regularPath, regularBytes);
  writeFileSync(boldPath, boldBytes);
  cachedFontPaths = Object.freeze({ regularPath, boldPath });
  return cachedFontPaths;
}

/** Deny remote/file/data fetches during HTML→PDF conversion. */
const ARTIFACT_RESOURCE_POLICY = Object.freeze({
  allowHttp: false,
  allowFile: false,
  allowData: false,
});

function assertValidPdfSignature(bytes: Uint8Array): void {
  if (bytes.byteLength < 5) {
    throw new FinancialDocumentError(
      "ARTIFACT_GENERATION_FAILED",
      "PDF artifact is empty or too short",
    );
  }
  const signature = String.fromCharCode(
    bytes[0]!,
    bytes[1]!,
    bytes[2]!,
    bytes[3]!,
    bytes[4]!,
  );
  if (signature !== "%PDF-") {
    throw new FinancialDocumentError(
      "ARTIFACT_GENERATION_FAILED",
      "PDF artifact lacks a valid PDF signature",
    );
  }
}

/**
 * Deterministic suggested download filename from public sealed facts only.
 * Never includes internal UUIDs, provider ids, or Order ids.
 */
export function suggestFinancialDocumentArtifactFilename(
  document: FinancialDocument,
): string {
  const titleSlug = formatStatutoryDocumentTitle(document.documentType)
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "");
  const numberSlug = document.statutoryDocumentNumber
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!titleSlug || !numberSlug) {
    throw new FinancialDocumentError(
      "ARTIFACT_GENERATION_FAILED",
      "Cannot derive a safe artifact filename from sealed document facts",
    );
  }
  return `BOBA-${titleSlug}-${numberSlug}.pdf`;
}

/**
 * Generate an ephemeral PDF artifact for an already-issued Financial Document.
 *
 * Consumes the accepted deterministic renderer. Does not persist bytes.
 * Does not expose an HTTP endpoint.
 */
export async function generateFinancialDocumentArtifact(
  document: FinancialDocument,
  authority: FinancialDocumentRenderAuthorityDependencies = {},
): Promise<FinancialDocumentArtifact> {
  // Authority / identity validation remains entirely in the render path.
  const { model, html } = renderFinancialDocument(document, authority);

  const suggestedFilename = suggestFinancialDocumentArtifactFilename(document);
  const title = `${model.statutoryTitle} ${model.statutoryDocumentNumber}`;
  const fonts = resolveBundledFontPaths();

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderHtmlToPdf({
      html,
      title,
      hideHeader: true,
      resourcePolicy: ARTIFACT_RESOURCE_POLICY,
      page: {
        size: "A4",
        orientation: "portrait",
        marginMm: 12,
      },
      font: {
        autoDiscover: false,
        bundled: {
          family: FONT_FAMILY,
          regularPath: fonts.regularPath,
          boldPath: fonts.boldPath,
        },
      },
    });
  } catch (error) {
    if (error instanceof FinancialDocumentError) {
      throw error;
    }
    throw new FinancialDocumentError(
      "ARTIFACT_GENERATION_FAILED",
      "PDF engine failed while generating Financial Document artifact",
    );
  }

  assertValidPdfSignature(pdfBytes);

  const bytes =
    pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  return Object.freeze({
    mediaType: FINANCIAL_DOCUMENT_PDF_MEDIA_TYPE,
    bytes,
    byteLength: bytes.byteLength,
    sha256,
    suggestedFilename,
  });
}
