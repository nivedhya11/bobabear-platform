/**
 * Deterministic HTML / print projection for Financial Documents
 * (IMP-028 Slice 3).
 *
 * Semantic HTML suitable for later PDF generation. No JavaScript.
 * No remote assets required for correctness. Internal UUIDs are never emitted.
 */
import { escapeHtml } from "./format";
import type { FinancialDocumentRenderModel } from "./render-model";

function optionalRow(label: string, value: string | null | undefined): string {
  if (value == null || value.trim().length === 0) {
    return "";
  }
  return `<div class="fd-field"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderSupplier(model: FinancialDocumentRenderModel): string {
  const { supplier } = model;
  return `<section class="fd-supplier" aria-label="Supplier">
  <h2>Supplier</h2>
  <dl>
    <div class="fd-field"><dt>Legal name</dt><dd>${escapeHtml(supplier.legalName)}</dd></div>
    ${optionalRow("GSTIN", supplier.gstin)}
    ${optionalRow("Registered address", supplier.registeredAddress)}
    ${optionalRow("State code", supplier.stateCode)}
    ${optionalRow("Registration scheme", supplier.registrationSchemeDisplay)}
  </dl>
</section>`;
}

function renderRecipient(model: FinancialDocumentRenderModel): string {
  const { recipient } = model;
  const hasAny =
    (recipient.displayName && recipient.displayName.trim()) ||
    (recipient.phoneE164 && recipient.phoneE164.trim()) ||
    (recipient.address && recipient.address.trim());
  if (!hasAny) {
    return "";
  }
  return `<section class="fd-recipient" aria-label="Recipient">
  <h2>Recipient</h2>
  <dl>
    ${optionalRow("Name", recipient.displayName)}
    ${optionalRow("Phone", recipient.phoneE164)}
    ${optionalRow("Address", recipient.address)}
  </dl>
</section>`;
}

function renderPrior(model: FinancialDocumentRenderModel): string {
  if (!model.priorDocument) {
    return "";
  }
  const prior = model.priorDocument;
  return `<section class="fd-prior-document" aria-label="Prior document">
  <h2>Prior document</h2>
  <dl>
    <div class="fd-field"><dt>Type</dt><dd>${escapeHtml(prior.documentTypeDisplay)}</dd></div>
    <div class="fd-field"><dt>Document number</dt><dd>${escapeHtml(prior.statutoryDocumentNumber)}</dd></div>
    <div class="fd-field"><dt>Issue date</dt><dd>${escapeHtml(prior.issueDateDisplay)}</dd></div>
  </dl>
</section>`;
}

function renderLineTax(line: FinancialDocumentRenderModel["lines"][number]): string {
  if (line.taxComponents.length === 0) {
    return "";
  }
  const rows = line.taxComponents
    .map(
      (tax) =>
        `<li>${escapeHtml(tax.label)} ${escapeHtml(tax.rateDisplay)} on ${escapeHtml(tax.taxableAmountDisplay)} = ${escapeHtml(tax.taxAmountDisplay)}</li>`,
    )
    .join("");
  return `<ul class="fd-line-tax">${rows}</ul>`;
}

function renderLines(model: FinancialDocumentRenderModel): string {
  const rows = model.lines
    .map((line) => {
      const sacHsn = [
        line.sacCode ? `SAC ${line.sacCode}` : null,
        line.hsnCode ? `HSN ${line.hsnCode}` : null,
      ]
        .filter(Boolean)
        .join(" / ");
      return `<tr>
  <td>${line.lineNumber}</td>
  <td>
    <div class="fd-line-description">${escapeHtml(line.description)}</div>
    ${sacHsn ? `<div class="fd-line-codes">${escapeHtml(sacHsn)}</div>` : ""}
    ${renderLineTax(line)}
  </td>
  <td class="fd-num">${line.quantity}</td>
  <td class="fd-num">${escapeHtml(line.unitDisplay)}</td>
  <td class="fd-num">${escapeHtml(line.discountDisplay)}</td>
  <td class="fd-num">${escapeHtml(line.chargeDisplay)}</td>
  <td class="fd-num">${escapeHtml(line.taxableValueDisplay)}</td>
  <td class="fd-num">${escapeHtml(line.lineTotalDisplay)}</td>
</tr>`;
    })
    .join("\n");

  return `<section class="fd-lines" aria-label="Line items">
  <h2>Particulars</h2>
  <table>
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Description</th>
        <th scope="col">Qty</th>
        <th scope="col">Unit</th>
        <th scope="col">Discount</th>
        <th scope="col">Charge</th>
        <th scope="col">Taxable</th>
        <th scope="col">Line total</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</section>`;
}

function renderTaxSummary(model: FinancialDocumentRenderModel): string {
  const parts: string[] = [];
  if (model.tax.placeOfSupplyStateName && model.tax.placeOfSupplyStateCode) {
    parts.push(
      `<div class="fd-field"><dt>Place of supply (state)</dt><dd>${escapeHtml(model.tax.placeOfSupplyStateName)}</dd></div>`,
    );
    parts.push(
      `<div class="fd-field"><dt>Place of supply (state code)</dt><dd>${escapeHtml(model.tax.placeOfSupplyStateCode)}</dd></div>`,
    );
  } else if (model.tax.placeOfSupplyStateCode) {
    parts.push(
      `<div class="fd-field"><dt>Place of supply (state code)</dt><dd>${escapeHtml(model.tax.placeOfSupplyStateCode)}</dd></div>`,
    );
  }
  if (model.tax.reverseChargeDisplay) {
    parts.push(
      `<div class="fd-field"><dt>Reverse charge applicable</dt><dd>${escapeHtml(model.tax.reverseChargeDisplay)}</dd></div>`,
    );
  }
  if (model.tax.components.length > 0) {
    const items = model.tax.components
      .map(
        (tax) =>
          `<li>${escapeHtml(tax.label)} ${escapeHtml(tax.rateDisplay)}: ${escapeHtml(tax.taxAmountDisplay)}</li>`,
      )
      .join("");
    parts.push(`<ul class="fd-tax-summary">${items}</ul>`);
  }
  if (parts.length === 0) {
    return "";
  }
  return `<section class="fd-tax" aria-label="Tax">
  <h2>Tax</h2>
  <dl>${parts.join("\n")}</dl>
</section>`;
}

function renderTotals(model: FinancialDocumentRenderModel): string {
  const { totals } = model;
  return `<section class="fd-totals" aria-label="Totals">
  <h2>Totals</h2>
  <dl>
    <div class="fd-field"><dt>Taxable</dt><dd>${escapeHtml(totals.taxableTotalDisplay)}</dd></div>
    <div class="fd-field"><dt>Discount</dt><dd>${escapeHtml(totals.discountTotalDisplay)}</dd></div>
    <div class="fd-field"><dt>Charges</dt><dd>${escapeHtml(totals.chargeTotalDisplay)}</dd></div>
    <div class="fd-field"><dt>Tax</dt><dd>${escapeHtml(totals.taxTotalDisplay)}</dd></div>
    <div class="fd-field fd-grand-total"><dt>Grand total</dt><dd>${escapeHtml(totals.grandTotalDisplay)}</dd></div>
  </dl>
</section>`;
}

const PRINT_SAFE_CSS = `/* Financial Document print-safe projection — no remote assets */
.fd-document{font-family:"DejaVu Sans",Georgia,"Times New Roman",serif;color:#111;max-width:800px;margin:0 auto;padding:24px}
.fd-document h1{font-size:1.5rem;margin:0 0 0.25rem}
.fd-document h2{font-size:1.1rem;margin:1.25rem 0 0.5rem;border-bottom:1px solid #ccc;padding-bottom:0.25rem}
.fd-meta,.fd-field{margin:0.2rem 0}
.fd-meta dt,.fd-field dt{font-weight:600;display:inline}
.fd-meta dd,.fd-field dd{display:inline;margin:0 0 0 0.75rem}
.fd-document table{width:100%;border-collapse:collapse;font-size:0.9rem}
.fd-document th,.fd-document td{border:1px solid #ccc;padding:0.4rem 0.5rem;vertical-align:top}
.fd-document th{background:#f5f5f5;text-align:left}
.fd-num{text-align:right;white-space:nowrap}
.fd-line-description{overflow-wrap:anywhere;word-wrap:break-word}
.fd-line-codes,.fd-line-tax{font-size:0.85rem;color:#333;margin:0.25rem 0 0}
.fd-grand-total dd{font-weight:700}
@media print{.fd-document{max-width:none;padding:0}}`;

/**
 * Render a Financial Document render model to deterministic HTML/print markup.
 */
export function renderFinancialDocumentHtml(
  model: FinancialDocumentRenderModel,
): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(model.statutoryTitle)} ${escapeHtml(model.statutoryDocumentNumber)}</title>
<style>
${PRINT_SAFE_CSS}
</style>
</head>
<body>
<article class="fd-document" data-document-type="${escapeHtml(model.documentType)}">
  <section class="fd-header" aria-label="Document identity">
    <h1>${escapeHtml(model.statutoryTitle)}</h1>
    <dl class="fd-meta">
      <div class="fd-field"><dt>Document number</dt><dd>${escapeHtml(model.statutoryDocumentNumber)}</dd></div>
      <div class="fd-field"><dt>Issue date</dt><dd>${escapeHtml(model.issueDateTimeDisplay)}</dd></div>
      <div class="fd-field"><dt>Financial year</dt><dd>${escapeHtml(model.financialYear)}</dd></div>
      <div class="fd-field"><dt>Currency</dt><dd>${escapeHtml(model.currency)}</dd></div>
    </dl>
  </section>
  ${renderSupplier(model)}
  ${renderRecipient(model)}
  ${renderPrior(model)}
  ${renderLines(model)}
  ${renderTaxSummary(model)}
  ${renderTotals(model)}
</article>
</body>
</html>`;

  // Normalize whitespace between sections for byte-stable regeneration:
  // collapse runs of blank lines introduced by empty optional sections.
  return html.replace(/\n{3,}/g, "\n\n");
}
