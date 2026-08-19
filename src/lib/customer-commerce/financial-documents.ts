/**
 * Customer Financial Document transport wrappers (IMP-028 Slice 7).
 *
 * Thin `/api/v1/*` client only. No issuance, authorization, or HTML access.
 */
import { parseCommerceErrorBody } from "./errors";
import { commerceRequest, type CommerceHttpResult } from "./http";
import type { CommerceFinancialDocumentListItem } from "./types";

type ListEnvelope = Readonly<{
  ok: true;
  financialDocuments: readonly CommerceFinancialDocumentListItem[];
}>;

export function customerFinancialDocumentPdfPath(financialDocumentId: string): string {
  return `/api/v1/financial-documents/${encodeURIComponent(financialDocumentId)}/pdf`;
}

export async function listCustomerOrderFinancialDocuments(
  orderId: string,
): Promise<
  CommerceHttpResult<{ financialDocuments: readonly CommerceFinancialDocumentListItem[] }>
> {
  const result = await commerceRequest<ListEnvelope>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/financial-documents`,
    { method: "GET" },
  );
  if (!result.ok) return result;
  if (!Array.isArray(result.data.financialDocuments)) {
    return { ok: false, code: "INVALID_RESPONSE", status: result.status };
  }
  return {
    ok: true,
    status: result.status,
    data: { financialDocuments: result.data.financialDocuments },
  };
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="([A-Za-z0-9._-]+\.pdf)"/i.exec(header);
  return match?.[1] ?? null;
}

/**
 * Download an already-issued PDF via the Slice-6 endpoint.
 * Same-origin cookie auth only. Does not accept prior document ids from the UI.
 * Does not call any HTML endpoint.
 */
export async function downloadCustomerFinancialDocumentPdf(
  financialDocumentId: string,
): Promise<CommerceHttpResult<{ ok: true }>> {
  const path = customerFinancialDocumentPdfPath(financialDocumentId);
  let response: Response;
  try {
    response = await fetch(path, {
      method: "GET",
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR", status: 0 };
  }

  if (!response.ok) {
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      return { ok: false, code: "INVALID_RESPONSE", status: response.status };
    }
    const error = parseCommerceErrorBody(parsed);
    if (!error) return { ok: false, code: "INVALID_RESPONSE", status: response.status };
    return { ...error, status: response.status };
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/pdf")) {
    try {
      await response.arrayBuffer();
    } catch {
      // ignore
    }
    return { ok: false, code: "INVALID_RESPONSE", status: response.status };
  }

  // Attachment-compatible download. Blob is used only so failure can be
  // reported before the browser commits to a navigation/download.
  let bytes: Blob;
  try {
    bytes = await response.blob();
  } catch {
    return { ok: false, code: "NETWORK_ERROR", status: 0 };
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const objectUrl = URL.createObjectURL(bytes);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.rel = "noopener";
    const filename = filenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
    );
    if (filename) anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return { ok: true, status: response.status, data: { ok: true } };
}
