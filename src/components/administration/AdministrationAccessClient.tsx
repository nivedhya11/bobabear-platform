"use client";

import { useState } from "react";

import { Alert } from "@/components/enterprise/Alert";
import { PageHeader } from "@/components/enterprise/PageHeader";
import { Button } from "@/components/ui/Button";
import { fetchEffectivePermissions } from "@/lib/administration/api";

export function AdministrationAccessClient() {
  const [membershipId, setMembershipId] = useState("");
  const [resourceType, setResourceType] = useState("outlet");
  const [brandId, setBrandId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [subjectLabel, setSubjectLabel] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onInspect() {
    setBusy(true);
    setError(null);
    const query: Record<string, string> = {
      resourceType,
      membershipId,
    };
    if (brandId) query.brandId = brandId;
    if (organizationId) query.organizationId = organizationId;
    if (territoryId) query.territoryId = territoryId;
    if (outletId) query.outletId = outletId;
    const result = await fetchEffectivePermissions(query);
    setBusy(false);
    if (!result.ok) {
      setError(result.code);
      setPermissions([]);
      setSubjectLabel(null);
      return;
    }
    setPermissions(result.data.permissions);
    setSubjectLabel(result.data.subject?.memberLabel ?? null);
  }

  return (
    <div data-testid="admin-access" className="space-y-6">
      <PageHeader
        title="Access"
        description="Inspect managed-subject effective permissions. This diagnostic is read-only and does not impersonate the member."
      />
      <Alert tone="info" title="Managed subject diagnostic">
        Provide a membershipId locator. The projection labels the managed member — never the caller.
      </Alert>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm" htmlFor="access-membership">
          Membership ID
          <input
            id="access-membership"
            className="mt-1 w-full border px-2 py-1"
            value={membershipId}
            onChange={(event) => setMembershipId(event.target.value)}
          />
        </label>
        <label className="text-sm" htmlFor="access-resource-type">
          Resource type
          <select
            id="access-resource-type"
            className="mt-1 w-full border px-2 py-1"
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          >
            <option value="platform">platform</option>
            <option value="brand">brand</option>
            <option value="organization">organization</option>
            <option value="territory">territory</option>
            <option value="outlet">outlet</option>
          </select>
        </label>
        <label className="text-sm" htmlFor="access-brand">
          Brand ID
          <input
            id="access-brand"
            className="mt-1 w-full border px-2 py-1"
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
          />
        </label>
        <label className="text-sm" htmlFor="access-org">
          Organization ID
          <input
            id="access-org"
            className="mt-1 w-full border px-2 py-1"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          />
        </label>
        <label className="text-sm" htmlFor="access-terr">
          Territory ID
          <input
            id="access-terr"
            className="mt-1 w-full border px-2 py-1"
            value={territoryId}
            onChange={(event) => setTerritoryId(event.target.value)}
          />
        </label>
        <label className="text-sm" htmlFor="access-outlet">
          Outlet ID
          <input
            id="access-outlet"
            className="mt-1 w-full border px-2 py-1"
            value={outletId}
            onChange={(event) => setOutletId(event.target.value)}
          />
        </label>
      </div>
      <Button type="button" disabled={busy || !membershipId} onClick={() => void onInspect()}>
        Inspect subject permissions
      </Button>
      {error ? (
        <Alert tone="danger" title="Diagnostic failed">
          {error}
        </Alert>
      ) : null}
      {subjectLabel ? (
        <p data-testid="admin-access-subject" className="text-sm font-medium">
          Managed subject: {subjectLabel}
        </p>
      ) : null}
      <p data-testid="admin-access-permissions" className="text-sm">
        {permissions.length === 0 ? "No permissions projected." : permissions.join(", ")}
      </p>
      <p className="text-sm">
        Role grant/revoke with consequence confirmation lives on the membership detail surface under
        Workforce.
      </p>
      <Button asChild variant="secondary">
        <a href="/workforce/admin/memberships/">Open Workforce</a>
      </Button>
    </div>
  );
}
