/**
 * Financial Document rendering entrypoint (IMP-028 Slice 3).
 *
 * Pure projection: sealed Financial Document (+ identity-bound prior
 * Financial Document when required) → render model + HTML.
 * No live lookups of menu, issuer, recipient, tax policy,
 * Payment, Refund, or Order.
 */
import {
  projectFinancialDocumentRenderModel,
  type FinancialDocumentRenderAuthorityDependencies,
  type FinancialDocumentRenderModel,
} from "./render-model";
import { renderFinancialDocumentHtml } from "./render-html";
import type { FinancialDocument } from "./types";

export type FinancialDocumentRenderResult = Readonly<{
  model: FinancialDocumentRenderModel;
  html: string;
}>;

/**
 * Deterministically render an already-issued Financial Document.
 *
 * Does not decide issuance policy. Does not transport documents.
 * Does not load prior documents — pass priorFinancialDocument when the
 * current document seals a priorFinancialDocumentId.
 */
export function renderFinancialDocument(
  document: FinancialDocument,
  authority: FinancialDocumentRenderAuthorityDependencies = {},
): FinancialDocumentRenderResult {
  const model = projectFinancialDocumentRenderModel(document, authority);
  const html = renderFinancialDocumentHtml(model);
  return Object.freeze({ model, html });
}

export {
  projectFinancialDocumentRenderModel,
  renderFinancialDocumentHtml,
};
export type {
  FinancialDocumentRenderAuthorityDependencies,
  FinancialDocumentRenderModel,
} from "./render-model";
