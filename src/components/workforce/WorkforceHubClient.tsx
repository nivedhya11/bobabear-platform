"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchAdminSession } from "@/lib/administration/api";
import {
  resolveAuthorizedDestinations,
  type WorkforceDestination,
} from "@/lib/workforce-hub/destinations";
import { workforceLoginUrlWithReturn } from "@/lib/workforce-hub/return-to";

import { AccessDenied } from "@/components/enterprise/AccessDenied";
import { EmptyState } from "@/components/enterprise/EmptyState";
import { ErrorState } from "@/components/enterprise/ErrorState";
import { LoadingState } from "@/components/enterprise/LoadingState";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { enterprisePanelClass } from "@/components/enterprise/enterprise-tokens";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "ready";
      workforceUserId: string;
      destinations: readonly WorkforceDestination[];
    }>;

function DestinationCard({ destination }: Readonly<{ destination: WorkforceDestination }>) {
  return (
    <a
      href={destination.href}
      className={`${enterprisePanelClass} block px-5 py-4 transition-shadow hover:shadow-md focus-ring`}
    >
      <h2 className="text-base font-semibold text-[var(--enterprise-text-primary,#1a2210)]">
        {destination.label}
      </h2>
      <p className="mt-1 text-sm text-[var(--enterprise-text-secondary,#4b5542)]">{destination.description}</p>
    </a>
  );
}

async function resolveHubView(): Promise<ViewState> {
  const result = await fetchAdminSession();
  if (!result.ok) {
    if (result.status === 401 || result.code === "WORKFORCE_AUTH_REQUIRED") {
      window.location.assign(workforceLoginUrlWithReturn("/workforce/"));
      return { kind: "loading" };
    }
    return { kind: "error", message: "Workforce session could not be loaded." };
  }
  const destinations = resolveAuthorizedDestinations(result.data.session.capabilities);
  if (destinations.length === 1) {
    window.location.assign(destinations[0]!.href);
    return { kind: "loading" };
  }
  return {
    kind: "ready",
    workforceUserId: result.data.session.workforceUserId,
    destinations,
  };
}

export function WorkforceHubClient() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextView = await resolveHubView();
      if (!cancelled) setView(nextView);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = useCallback(() => {
    setView({ kind: "loading" });
    void (async () => {
      setView(await resolveHubView());
    })();
  }, []);

  if (view.kind === "loading") {
    return <LoadingState label="Loading workforce applications…" />;
  }
  if (view.kind === "error") {
    return <ErrorState message={view.message} onRetry={retry} />;
  }
  if (view.kind === "unauthorized") {
    return <AccessDenied message="Workforce sign-in is required." backHref="/workforce/login/" />;
  }

  return (
    <div data-testid="workforce-hub" className="space-y-6">
      <PageHeader
        title="Workforce"
        description="Choose an application based on your authorized scope."
      />
      <p className="text-sm text-[var(--enterprise-text-secondary,#4b5542)]">
        Signed in as <span className="font-medium">{view.workforceUserId}</span>
      </p>
      {view.destinations.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {view.destinations.map((destination) => (
            <li key={destination.id}>
              <DestinationCard destination={destination} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No applications available"
          description="Your account is signed in, but no workforce applications are currently authorized for your scope."
        />
      )}
    </div>
  );
}
