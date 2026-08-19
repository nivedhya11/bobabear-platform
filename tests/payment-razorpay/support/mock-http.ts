import type {
  RazorpayHttpRequest,
  RazorpayHttpResult,
  RazorpayHttpTransport,
} from "../../../src/server/payment/provider/razorpay/http";

export type MockRazorpayOrder = Readonly<{
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status?: string;
}>;

export type MockRazorpayPayment = Readonly<{
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}>;

export function createMockRazorpayHttp() {
  const ordersById = new Map<string, MockRazorpayOrder>();
  const ordersByReceipt = new Map<string, MockRazorpayOrder[]>();
  const paymentsByOrder = new Map<string, MockRazorpayPayment[]>();
  const paymentsById = new Map<string, MockRazorpayPayment>();
  const requests: RazorpayHttpRequest[] = [];
  let orderSeq = 1;

  function putOrder(order: MockRazorpayOrder): void {
    ordersById.set(order.id, order);
    const list = ordersByReceipt.get(order.receipt) ?? [];
    list.push(order);
    ordersByReceipt.set(order.receipt, list);
  }

  function putPayment(payment: MockRazorpayPayment): void {
    paymentsById.set(payment.id, payment);
    const list = (paymentsByOrder.get(payment.order_id) ?? []).filter((row) => row.id !== payment.id);
    list.push(payment);
    paymentsByOrder.set(payment.order_id, list);
  }

  const transport: RazorpayHttpTransport = Object.freeze({
    async request(input: RazorpayHttpRequest): Promise<RazorpayHttpResult> {
      requests.push(input);
      if (input.method === "POST" && input.path === "/orders") {
        const body = input.body as {
          amount: number;
          currency: string;
          receipt: string;
        };
        const existing = ordersByReceipt.get(body.receipt) ?? [];
        if (existing[0]) {
          return Object.freeze({ kind: "ok", status: 200, json: existing[0] });
        }
        const order: MockRazorpayOrder = {
          id: `order_mock_${String(orderSeq++).padStart(4, "0")}`,
          amount: body.amount,
          currency: body.currency,
          receipt: body.receipt,
          status: "created",
        };
        putOrder(order);
        return Object.freeze({ kind: "ok", status: 200, json: order });
      }
      if (input.method === "GET" && input.path === "/orders") {
        return Object.freeze({
          kind: "ok",
          status: 200,
          json: { items: ordersByReceipt.get(input.query?.receipt ?? "") ?? [] },
        });
      }
      if (input.method === "GET" && input.path.endsWith("/payments") && input.path.startsWith("/orders/")) {
        const orderId = decodeURIComponent(
          input.path.slice("/orders/".length, -"/payments".length),
        );
        return Object.freeze({
          kind: "ok",
          status: 200,
          json: { items: paymentsByOrder.get(orderId) ?? [] },
        });
      }
      if (input.method === "GET" && input.path.startsWith("/payments/")) {
        const paymentId = decodeURIComponent(input.path.slice("/payments/".length));
        const payment = paymentsById.get(paymentId);
        if (!payment) return Object.freeze({ kind: "http_error", status: 404, json: {} });
        return Object.freeze({ kind: "ok", status: 200, json: payment });
      }
      return Object.freeze({ kind: "http_error", status: 404, json: {} });
    },
  });

  return { transport, requests, putOrder, putPayment, paymentsById };
}
