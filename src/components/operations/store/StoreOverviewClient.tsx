"use client";

import { useEffect, useState } from "react";

import { listAdminMembershipsFiltered } from "@/lib/administration/api";
import {
  getStoreAssortment,
  getStoreOperatingProfile,
  getStoreOperatingSchedule,
  getStoreOperatingState,
  getStoreServiceability,
  listStoreAvailability,
  operatingStateLabel,
  type StoreAvailabilityItem,
  type StoreOperatingState,
  type StoreServiceability,
} from "@/lib/operations/store";

import { useStoreOutlet } from "./StoreOutletContext";

type OverviewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      operating: StoreOperatingState | null;
      timezone: string | null;
      unavailableCount: number | null;
      serviceability: StoreServiceability | null;
      assortmentCount: number | null;
      assortmentEscalation: boolean;
      teamCount: number | null;
      warnings: readonly string[];
    }>;

export function StoreOverviewClient() {
  const { outletId, capabilities, staleOutletId } = useStoreOutlet();
  const [state, setState] = useState<OverviewState>({ kind: "loading" });

  useEffect(() => {
    if (!outletId || staleOutletId || capabilities === null) return;
    let cancelled = false;
    void (async () => {
      const caps = capabilities;
      const warnings: string[] = [];

      const operatingPromise =
        caps["outlet.operating_state.read"] === true
          ? getStoreOperatingState(outletId)
          : Promise.resolve(null);
      const schedulePromise =
        caps["outlet.operating_schedule.read"] === true
          ? Promise.all([getStoreOperatingProfile(outletId), getStoreOperatingSchedule(outletId)])
          : Promise.resolve(null);
      const availabilityPromise =
        caps["availability.read"] === true
          ? listStoreAvailability(outletId)
          : Promise.resolve(null);
      const serviceabilityPromise =
        caps["serviceability.read"] === true
          ? getStoreServiceability(outletId)
          : Promise.resolve(null);
      const assortmentPromise =
        caps["assortment.read"] === true
          ? getStoreAssortment(outletId)
          : Promise.resolve(null);
      const teamPromise =
        caps["access.membership.read"] === true
          ? listAdminMembershipsFiltered(outletId)
          : Promise.resolve(null);

      const [operatingResult, scheduleResult, availabilityResult, serviceabilityResult, assortmentResult, teamResult] =
        await Promise.all([
          operatingPromise,
          schedulePromise,
          availabilityPromise,
          serviceabilityPromise,
          assortmentPromise,
          teamPromise,
        ]);

      if (cancelled) return;

      const authFail = [operatingResult, availabilityResult, serviceabilityResult, assortmentResult].some(
        (result) =>
          result &&
          !result.ok &&
          (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED"),
      );
      if (authFail || (teamResult && !teamResult.ok && teamResult.status === 401)) {
        setState({ kind: "unauthorized" });
        return;
      }

      let operating: StoreOperatingState | null = null;
      if (operatingResult) {
        if (operatingResult.ok) {
          operating = {
            controlState: operatingResult.data.controlState,
            effectiveState: operatingResult.data.effectiveState,
            timezone: operatingResult.data.timezone,
            pausedUntil: operatingResult.data.pausedUntil,
            code: operatingResult.data.code,
          };
        } else if (operatingResult.status !== 403) {
          warnings.push("Operating status could not be loaded.");
        }
      }

      let timezone: string | null = operating?.timezone ?? null;
      if (scheduleResult) {
        const [profileResult, intervalsResult] = scheduleResult;
        if (profileResult.ok && profileResult.data.profile) {
          timezone = profileResult.data.profile.timezone;
        } else if (!profileResult.ok && profileResult.status !== 403) {
          warnings.push("Operating hours profile could not be loaded.");
        }
        if (
          intervalsResult.ok &&
          intervalsResult.data.intervals.length === 0 &&
          caps["outlet.operating_schedule.read"] === true
        ) {
          warnings.push("No weekly open intervals are configured yet.");
        }
      }

      let unavailableCount: number | null = null;
      if (availabilityResult) {
        if (availabilityResult.ok) {
          unavailableCount = availabilityResult.data.items.filter(
            (item: StoreAvailabilityItem) => item.effectiveState !== "available",
          ).length;
        } else if (availabilityResult.status !== 403) {
          warnings.push("Availability summary could not be loaded.");
        }
      }

      let serviceability: StoreServiceability | null = null;
      if (serviceabilityResult) {
        if (serviceabilityResult.ok) {
          serviceability = serviceabilityResult.data.serviceability;
          if (!serviceability.configured) {
            warnings.push("Delivery distance policy is not fully configured.");
          }
          if (!serviceability.routingPriorityConfigured) {
            warnings.push(
              "Delivery routing priority must be configured before distance policy can be saved.",
            );
          }
        } else if (serviceabilityResult.status !== 403) {
          warnings.push("Serviceability could not be loaded.");
        }
      }

      let assortmentCount: number | null = null;
      let assortmentEscalation = false;
      if (caps["assortment.read"] !== true) {
        assortmentEscalation = true;
      } else if (assortmentResult) {
        if (assortmentResult.ok) {
          assortmentCount = assortmentResult.data.items.length;
        } else if (assortmentResult.status === 403) {
          assortmentEscalation = true;
        } else {
          warnings.push("Assortment could not be loaded.");
        }
      }

      let teamCount: number | null = null;
      if (teamResult) {
        if (teamResult.ok) {
          teamCount = teamResult.data.items.length;
        } else if (teamResult.status !== 403) {
          warnings.push("Team memberships could not be loaded.");
        }
      }

      setState({
        kind: "ready",
        operating,
        timezone,
        unavailableCount,
        serviceability,
        assortmentCount,
        assortmentEscalation,
        teamCount,
        warnings,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [outletId, capabilities, staleOutletId]);

  if (staleOutletId) return null;
  if (!outletId) return null;
  if (capabilities === null || state.kind === "loading") {
    return <p aria-live="polite" data-testid="store-overview-loading">Loading overview…</p>;
  }
  if (state.kind === "unauthorized") {
    return (
      <p role="alert" data-testid="store-overview-unauthorized">
        Sign in required. <a href="/workforce/login/">Workforce sign in</a>
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <p role="alert" data-testid="store-overview-error">
        {state.message}
      </p>
    );
  }

  const panel = "rounded-lg border border-[var(--enterprise-border,#3D6026)] bg-[var(--enterprise-bg-panel,#22361A)] px-4 py-4";

  return (
    <div className="flex flex-col gap-4" data-testid="store-overview">
      <section className={panel} aria-labelledby="store-overview-status-heading">
        <h2 id="store-overview-status-heading" className="text-base font-semibold tracking-tight">
          Current status
        </h2>
        {state.operating ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--enterprise-muted,#C4D4A8)]">
                Effective status
              </dt>
              <dd className="mt-1 font-medium">{operatingStateLabel(state.operating.effectiveState)}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-[var(--enterprise-muted,#C4D4A8)]">
                Control
              </dt>
              <dd className="mt-1 font-medium">
                {state.operating.controlState
                  ? operatingStateLabel(state.operating.controlState)
                  : "Not set"}
              </dd>
            </div>
            {state.timezone ? (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-[var(--enterprise-muted,#C4D4A8)]">
                  Timezone
                </dt>
                <dd className="mt-1 font-medium">{state.timezone}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[var(--enterprise-muted,#C4D4A8)]">
            Operating status is not available for this outlet.
          </p>
        )}
      </section>

      {state.unavailableCount !== null ? (
        <section className={panel} aria-labelledby="store-overview-availability-heading">
          <h2 id="store-overview-availability-heading" className="text-base font-semibold tracking-tight">
            Availability
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            {state.unavailableCount === 0
              ? "All listed items are currently available."
              : `${state.unavailableCount} item${state.unavailableCount === 1 ? "" : "s"} currently unavailable or sold out.`}
          </p>
        </section>
      ) : null}

      {state.serviceability ? (
        <section className={panel} aria-labelledby="store-overview-serviceability-heading">
          <h2 id="store-overview-serviceability-heading" className="text-base font-semibold tracking-tight">
            Serviceability
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            {state.serviceability.configured
              ? `Distance policy configured (max ${state.serviceability.maxServiceDistanceMeters ?? "—"} m).`
              : "Distance policy is incomplete."}
          </p>
        </section>
      ) : null}

      <section className={panel} aria-labelledby="store-overview-assortment-heading">
        <h2 id="store-overview-assortment-heading" className="text-base font-semibold tracking-tight">
          Assortment
        </h2>
        {state.assortmentEscalation ? (
          <p className="mt-2 text-sm leading-relaxed text-[var(--enterprise-muted,#C4D4A8)]" data-testid="store-overview-assortment-escalate">
            Assortment is managed at brand level. Ask a brand administrator if you need assortment
            changes.
          </p>
        ) : state.assortmentCount !== null ? (
          <p className="mt-2 text-sm leading-relaxed">{state.assortmentCount} assortment item(s) in projection.</p>
        ) : (
          <p className="mt-2 text-sm text-[var(--enterprise-muted,#C4D4A8)]">Assortment not loaded.</p>
        )}
      </section>

      {state.teamCount !== null ? (
        <section className={panel} aria-labelledby="store-overview-team-heading">
          <h2 id="store-overview-team-heading" className="text-base font-semibold tracking-tight">
            Team
          </h2>
          <p className="mt-2 text-sm leading-relaxed">{state.teamCount} membership(s) for this outlet.</p>
        </section>
      ) : null}

      {state.warnings.length > 0 ? (
        <section
          className="rounded-lg border border-amber-500/50 bg-amber-950/40 px-4 py-4 text-amber-100"
          aria-labelledby="store-overview-warnings-heading"
        >
          <h2 id="store-overview-warnings-heading" className="text-base font-semibold tracking-tight">
            Attention
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed" data-testid="store-overview-warnings">
            {state.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
