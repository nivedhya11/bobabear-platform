"use client";

import { useEffect, useState } from "react";

import { commerceErrorCopy } from "@/components/ordering/error-copy";
import {
  financialDocumentCustomerTitle,
  financialDocumentDownloadAccessibleName,
  formatFinancialDocumentIssuedAt,
} from "@/components/ordering/financial-document-presentation";
import {
  customerFinancialDocumentPdfPath,
  downloadCustomerFinancialDocumentPdf,
  listCustomerOrderFinancialDocuments,
  type CommerceFinancialDocumentListItem,
} from "@/lib/customer-commerce";

type DocsState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "error"; message: string }>
  | Readonly<{ status: "ready"; documents: readonly CommerceFinancialDocumentListItem[] }>;

/**
 * Localized Order Financial Documents panel (IMP-028 Slice 7).
 * Reflects Slice-6 list/PDF transport only — no client issuance or auth.
 */
export function OrderFinancialDocuments(props: { orderId: string }) {
  const { orderId } = props;
  const [state, setState] = useState<DocsState>({ status: "loading" });
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setDownloadError(null);
    void (async () => {
      const result = await listCustomerOrderFinancialDocuments(orderId);
      if (cancelled) return;
      if (!result || !result.ok) {
        setState({
          status: "error",
          message: commerceErrorCopy(result && "code" in result ? result.code : undefined),
        });
        return;
      }
      setState({ status: "ready", documents: result.data.financialDocuments });
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function onDownload(doc: CommerceFinancialDocumentListItem): Promise<void> {
    setDownloadError(null);
    setDownloadingId(doc.financialDocumentId);
    const result = await downloadCustomerFinancialDocumentPdf(doc.financialDocumentId);
    setDownloadingId(null);
    if (!result.ok) {
      setDownloadError(commerceErrorCopy(result.code));
    }
  }

  if (state.status === "loading") {
    return (
      <div
        className="flex flex-col gap-2 min-h-[1.5rem]"
        data-testid="order-financial-documents-loading"
        aria-busy="true"
      >
        <p className="font-body text-[13px] text-[var(--text-secondary)]">Loading documents…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-2" data-testid="order-financial-documents-error">
        <p role="alert" className="font-body text-[14px] text-[var(--text-secondary)]">
          {state.message}
        </p>
      </div>
    );
  }

  if (state.documents.length === 0) {
    // Server truth: no issued customer-accessible documents — no fake Download Invoice.
    return null;
  }

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="order-financial-documents"
      aria-labelledby="order-financial-documents-heading"
    >
      <h2
        id="order-financial-documents-heading"
        className="font-body text-[15px] font-semibold text-[var(--text-primary)]"
      >
        Documents
      </h2>

      {downloadError ? (
        <p
          role="alert"
          data-testid="order-financial-document-download-error"
          className="font-body text-[14px] text-[var(--text-secondary)]"
        >
          {downloadError}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {state.documents.map((doc) => {
          const title = financialDocumentCustomerTitle(doc.documentType);
          const accessibleName = financialDocumentDownloadAccessibleName(
            doc.documentType,
            doc.statutoryDocumentNumber,
          );
          const pdfHref = customerFinancialDocumentPdfPath(doc.financialDocumentId);
          const busy = downloadingId === doc.financialDocumentId;
          return (
            <li
              key={doc.financialDocumentId}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              data-testid="order-financial-document"
              data-document-type={doc.documentType}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-body text-[14px] font-semibold text-[var(--text-primary)]">
                  {title}
                </p>
                <p className="font-body text-[13px] text-[var(--text-secondary)] break-all">
                  {doc.statutoryDocumentNumber}
                </p>
                <p className="font-body text-[13px] text-[var(--text-secondary)]">
                  {formatFinancialDocumentIssuedAt(doc.issueAt)}
                </p>
              </div>
              <a
                href={pdfHref}
                className="inline-flex items-center justify-center self-start sm:self-center min-h-[44px] px-4 rounded-md font-body font-bold text-[14px] border border-[var(--border-strong)] focus-ring whitespace-nowrap"
                aria-label={accessibleName}
                aria-busy={busy || undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (busy) return;
                  void onDownload(doc);
                }}
              >
                Download PDF
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
