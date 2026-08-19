import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OrderFinancialDocuments } from "./OrderFinancialDocuments";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const listCustomerOrderFinancialDocuments = vi.fn<(...args: unknown[]) => unknown>();
const downloadCustomerFinancialDocumentPdf = vi.fn<(...args: unknown[]) => unknown>();
const customerFinancialDocumentPdfPath = vi.fn((id: string) => {
  return `/api/v1/financial-documents/${encodeURIComponent(id)}/pdf`;
});

vi.mock("@/lib/customer-commerce", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-commerce")>(
    "@/lib/customer-commerce",
  );
  return {
    ...actual,
    listCustomerOrderFinancialDocuments: (...args: unknown[]) =>
      listCustomerOrderFinancialDocuments(...args),
    downloadCustomerFinancialDocumentPdf: (...args: unknown[]) =>
      downloadCustomerFinancialDocumentPdf(...args),
    customerFinancialDocumentPdfPath: (id: string) => customerFinancialDocumentPdfPath(id),
  };
});

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const DOC_ID_TI = "22222222-2222-4222-8222-222222222222";
const DOC_ID_CN = "33333333-3333-4333-8333-333333333333";
const DOC_ID_BOS = "44444444-4444-4444-8444-444444444444";
const DOC_ID_RV = "55555555-5555-4555-8555-555555555555";
const DOC_ID_RF = "66666666-6666-4666-8666-666666666666";

function doc(overrides: Record<string, string | null>) {
  return {
    financialDocumentId: DOC_ID_TI,
    documentType: "TAX_INVOICE",
    statutoryDocumentNumber: "TI/2526/000001",
    issueAt: "2026-08-15T10:00:00.000Z",
    grandTotalPaise: "27195",
    currency: "INR",
    orderId: ORDER_ID,
    ...overrides,
  };
}

beforeEach(() => {
  listCustomerOrderFinancialDocuments.mockReset();
  downloadCustomerFinancialDocumentPdf.mockReset();
  customerFinancialDocumentPdfPath.mockClear();
  downloadCustomerFinancialDocumentPdf.mockResolvedValue({
    ok: true,
    status: 200,
    data: { ok: true },
  });
});

describe("OrderFinancialDocuments (FD-UI)", () => {
  it("FD-UI01 Order with one Tax Invoice displays title and statutory number", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [doc({})] },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    await waitFor(() => expect(screen.getByTestId("order-financial-documents")).toBeInTheDocument());
    expect(screen.getByText("Tax Invoice")).toBeInTheDocument();
    expect(screen.getByText("TI/2526/000001")).toBeInTheDocument();
    expect(listCustomerOrderFinancialDocuments).toHaveBeenCalledWith(ORDER_ID);
  });

  it("FD-UI02 Download action targets accepted PDF endpoint using opaque id", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [doc({})] },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    const link = await screen.findByRole("link", {
      name: /Download Tax Invoice PDF TI\/2526\/000001/i,
    });
    expect(link).toHaveAttribute(
      "href",
      `/api/v1/financial-documents/${DOC_ID_TI}/pdf`,
    );
    await userEvent.click(link);
    expect(downloadCustomerFinancialDocumentPdf).toHaveBeenCalledWith(DOC_ID_TI);
  });

  it("FD-UI03 financialDocumentId is not displayed as customer-facing text", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [doc({})] },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    await screen.findByTestId("order-financial-documents");
    expect(screen.queryByText(DOC_ID_TI)).not.toBeInTheDocument();
    expect(screen.getByText("TI/2526/000001")).toBeInTheDocument();
  });

  it("FD-UI04 Order with no Financial Documents does not show fake Download Invoice", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [] },
    });
    const { container } = render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    await waitFor(() =>
      expect(listCustomerOrderFinancialDocuments).toHaveBeenCalled(),
    );
    expect(screen.queryByTestId("order-financial-documents")).not.toBeInTheDocument();
    expect(screen.queryByText(/Download Invoice/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /download/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Invoice unavailable|Invoice pending|Generating invoice/i);
  });

  it("FD-UI05 Order with multiple documents renders all in server order", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_TI,
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: "TI/2526/000001",
          }),
          doc({
            financialDocumentId: DOC_ID_CN,
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: "CN/2526/000004",
          }),
          doc({
            financialDocumentId: DOC_ID_RV,
            documentType: "RECEIPT_VOUCHER",
            statutoryDocumentNumber: "RV/2526/000002",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    const items = await screen.findAllByTestId("order-financial-document");
    expect(items).toHaveLength(3);
    expect(within(items[0]!).getByText("Tax Invoice")).toBeInTheDocument();
    expect(within(items[1]!).getByText("Credit Note")).toBeInTheDocument();
    expect(within(items[2]!).getByText("Receipt Voucher")).toBeInTheDocument();
  });

  it("FD-UI06 Credit Note displays Credit Note, not Tax Receipt", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_CN,
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: "CN/2526/000004",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    await screen.findByText("Credit Note");
    expect(screen.queryByText(/Tax Receipt/i)).not.toBeInTheDocument();
  });

  it("FD-UI07 Bill of Supply displays correct title", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_BOS,
            documentType: "BILL_OF_SUPPLY",
            statutoryDocumentNumber: "BOS/2526/000001",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    expect(await screen.findByText("Bill of Supply")).toBeInTheDocument();
  });

  it("FD-UI08 Receipt Voucher displays correct title", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_RV,
            documentType: "RECEIPT_VOUCHER",
            statutoryDocumentNumber: "RV/2526/000001",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    expect(await screen.findByText("Receipt Voucher")).toBeInTheDocument();
  });

  it("FD-UI09 Refund Voucher displays correct title", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_RF,
            documentType: "REFUND_VOUCHER",
            statutoryDocumentNumber: "RF/2526/000001",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    expect(await screen.findByText("Refund Voucher")).toBeInTheDocument();
  });

  it("FD-UI10 No TAX_RECEIPT customer label exists in rendered documents UI", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({}),
          doc({
            financialDocumentId: DOC_ID_CN,
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: "CN/2526/000004",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    await screen.findByTestId("order-financial-documents");
    expect(screen.queryByText(/Tax Receipt/i)).not.toBeInTheDocument();
    expect(screen.queryByText("TAX_RECEIPT")).not.toBeInTheDocument();
  });

  it("FD-UI11/20 document loading keeps sibling order content; empty list shows no download action", async () => {
    let resolveDocs: ((value: unknown) => void) | undefined;
    listCustomerOrderFinancialDocuments.mockReturnValue(
      new Promise((resolve) => {
        resolveDocs = resolve;
      }),
    );
    render(
      <div data-testid="order-detail">
        <p>ORD-0123456789AB</p>
        <OrderFinancialDocuments orderId={ORDER_ID} />
        <div data-testid="order-support">Support</div>
      </div>,
    );
    expect(screen.getByTestId("order-detail")).toBeInTheDocument();
    expect(screen.getByText("ORD-0123456789AB")).toBeInTheDocument();
    expect(screen.getByTestId("order-financial-documents-loading")).toBeInTheDocument();
    expect(screen.getByTestId("order-support")).toBeInTheDocument();

    resolveDocs?.({
      ok: true,
      status: 200,
      data: { financialDocuments: [] },
    });
    await waitFor(() =>
      expect(screen.queryByTestId("order-financial-documents-loading")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("ORD-0123456789AB")).toBeInTheDocument();
    expect(screen.getByTestId("order-support")).toBeInTheDocument();
    expect(screen.queryByTestId("order-financial-documents")).not.toBeInTheDocument();
    expect(screen.queryByText(/Download Invoice/i)).not.toBeInTheDocument();
  });

  it("FD-UI12 Document-list failure is localized and does not throw", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: false,
      code: "NETWORK_ERROR",
      status: 0,
    });
    render(
      <div data-testid="order-detail">
        <p>ORD-0123456789AB</p>
        <OrderFinancialDocuments orderId={ORDER_ID} />
        <div data-testid="order-support">Support</div>
      </div>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("order-financial-documents-error")).toBeInTheDocument(),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/network problem/i);
    expect(screen.getByText("ORD-0123456789AB")).toBeInTheDocument();
    expect(screen.getByTestId("order-support")).toBeInTheDocument();
    expect(screen.queryByTestId("order-financial-documents")).not.toBeInTheDocument();
  });

  it("FD-UI13 PDF download failure follows safe customer error convention", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [doc({})] },
    });
    downloadCustomerFinancialDocumentPdf.mockResolvedValue({
      ok: false,
      code: "DOCUMENT_NOT_FOUND",
      status: 404,
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    const link = await screen.findByRole("link", {
      name: /Download Tax Invoice PDF/i,
    });
    await userEvent.click(link);
    await waitFor(() =>
      expect(screen.getByTestId("order-financial-document-download-error")).toBeInTheDocument(),
    );
    const alert = screen.getByTestId("order-financial-document-download-error");
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert.textContent).not.toMatch(/AUTHORITY_INCONSISTENT|DOCUMENT_NOT_FOUND|stack/i);
  });

  it("FD-UI17/18 Download controls have meaningful distinguishable accessible names", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        financialDocuments: [
          doc({
            financialDocumentId: DOC_ID_TI,
            documentType: "TAX_INVOICE",
            statutoryDocumentNumber: "TI/2526/000001",
          }),
          doc({
            financialDocumentId: DOC_ID_CN,
            documentType: "CREDIT_NOTE",
            statutoryDocumentNumber: "CN/2526/000004",
          }),
        ],
      },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    const ti = await screen.findByRole("link", {
      name: "Download Tax Invoice PDF TI/2526/000001",
    });
    const cn = screen.getByRole("link", {
      name: "Download Credit Note PDF CN/2526/000004",
    });
    expect(ti).toBeInTheDocument();
    expect(cn).toBeInTheDocument();
    expect(ti.getAttribute("aria-label")).not.toBe(cn.getAttribute("aria-label"));
  });

  it("FD-UI19 responsive layout uses wrapping flex without fixed overflow width", async () => {
    listCustomerOrderFinancialDocuments.mockResolvedValue({
      ok: true,
      status: 200,
      data: { financialDocuments: [doc({})] },
    });
    render(<OrderFinancialDocuments orderId={ORDER_ID} />);
    const item = await screen.findByTestId("order-financial-document");
    expect(item.className).toMatch(/flex-col/);
    expect(item.className).toMatch(/sm:flex-row/);
    expect(item.className).not.toMatch(/overflow-x-scroll|min-w-\[80rem\]|w-\[1200px\]/);
  });
});

describe("OrderFinancialDocuments source guards", () => {
  it("FD-UI14/15/16 no HTML endpoint, issuance, or client ownership checks in UI module", () => {
    const uiSource = readFileSync(
      path.join(HERE, "OrderFinancialDocuments.tsx"),
      "utf8",
    );
    const clientSource = readFileSync(
      path.join(HERE, "../../lib/customer-commerce/financial-documents.ts"),
      "utf8",
    );
    const combined = `${uiSource}\n${clientSource}`;
    expect(combined).not.toMatch(/\/html\b/);
    expect(combined).not.toMatch(/issueFinancialDocument|createInvoice|generateInvoice/i);
    expect(combined).not.toMatch(/customerId\s*===|order\.customerId|localStorage/);
    expect(combined).toMatch(/\/financial-documents/);
    expect(combined).toMatch(/\/pdf/);
  });
});
