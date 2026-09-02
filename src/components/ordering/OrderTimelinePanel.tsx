/**
 * Customer-readable order status timeline (D-357 only — no invented prep states).
 */

import { orderStatusLabel, type CustomerOrderStatus } from "@/components/ordering/order-status";

export type OrderTimelineMilestone = Readonly<{
  status: CustomerOrderStatus;
  label: string;
  reached: boolean;
  timestamp: string | null;
}>;

const TIMELINE_ORDER: readonly CustomerOrderStatus[] = Object.freeze([
  "PLACED",
  "ACCEPTED",
  "FULFILLED",
]);

export function buildOrderTimeline(input: Readonly<{
  status: string;
  createdAt: string | null;
  acceptedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
}>): readonly OrderTimelineMilestone[] {
  if (input.status === "CANCELLED") {
    return Object.freeze([
      Object.freeze({
        status: "PLACED" as const,
        label: orderStatusLabel("PLACED"),
        reached: true,
        timestamp: input.createdAt,
      }),
      Object.freeze({
        status: "CANCELLED" as const,
        label: orderStatusLabel("CANCELLED"),
        reached: true,
        timestamp: input.cancelledAt,
      }),
    ]);
  }

  const statusIndex = TIMELINE_ORDER.indexOf(input.status as CustomerOrderStatus);
  return Object.freeze(
    TIMELINE_ORDER.map((step, index) => {
      const reached = statusIndex >= index || input.status === step;
      const timestamp =
        step === "PLACED"
          ? input.createdAt
          : step === "ACCEPTED"
            ? input.acceptedAt
            : step === "FULFILLED"
              ? input.fulfilledAt
              : null;
      return Object.freeze({
        status: step,
        label: orderStatusLabel(step),
        reached,
        timestamp,
      });
    }),
  );
}

export function OrderTimelinePanel(props: {
  milestones: readonly OrderTimelineMilestone[];
}) {
  if (props.milestones.length === 0) return null;
  return (
    <section
      className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4"
      data-testid="order-timeline"
      aria-label="Order progress"
    >
      <h2 className="mb-3 font-body text-[15px] font-semibold text-[var(--text-primary)]">
        Order progress
      </h2>
      <ol className="flex flex-col gap-3">
        {props.milestones.map((milestone) => (
          <li
            key={milestone.status}
            className="flex items-start gap-3 font-body text-[14px]"
            data-testid={`order-timeline-${milestone.status.toLowerCase()}`}
          >
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                milestone.reached
                  ? "border-[var(--interactive-primary)] bg-[var(--interactive-primary)] text-[var(--text-on-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-tertiary)]"
              }`}
              aria-hidden="true"
            >
              {milestone.reached ? "✓" : "·"}
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className={
                  milestone.reached
                    ? "font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)]"
                }
              >
                {milestone.label}
              </span>
              {milestone.reached && milestone.timestamp ? (
                <time
                  className="text-[12px] text-[var(--text-secondary)]"
                  dateTime={milestone.timestamp}
                >
                  {new Date(milestone.timestamp).toLocaleString()}
                </time>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
