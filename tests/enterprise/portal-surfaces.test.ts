import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("portal surface isolation", () => {
  it("keeps customer chrome in the customer route-group layout only", () => {
    const customerLayout = read("src/app/(customer)/layout.tsx");
    const rootLayout = read("src/app/layout.tsx");
    const workforcePortalLayout = read("src/app/workforce/(portal)/layout.tsx");
    const administrationLayout = read("src/app/workforce/(administration)/layout.tsx");

    expect(customerLayout).toContain("<Ticker />");
    expect(customerLayout).toContain("<Nav />");
    expect(customerLayout).toContain("<Footer />");
    expect(customerLayout).toContain('data-surface="customer"');

    expect(rootLayout).not.toContain("<Ticker />");
    expect(rootLayout).not.toContain("<Footer />");
    expect(workforcePortalLayout).not.toContain("Ticker");
    expect(workforcePortalLayout).not.toContain("Footer");
    expect(administrationLayout).not.toContain("Ticker");
    expect(administrationLayout).not.toContain("Footer");
  });

  it("uses enterprise metadata defaults for workforce and administration layouts", () => {
    const workforcePortalLayout = read("src/app/workforce/(portal)/layout.tsx");
    const administrationLayout = read("src/app/workforce/(administration)/layout.tsx");

    expect(workforcePortalLayout).toContain("robots: { index: false, follow: false }");
    expect(administrationLayout).toContain("robots: { index: false, follow: false }");
    expect(workforcePortalLayout).not.toContain("SITE_DESCRIPTION");
    expect(administrationLayout).not.toContain("schema.org/Restaurant");
  });

  it("registers permission-driven destinations without future dead links", () => {
    const destinations = read("src/lib/workforce-hub/destinations.ts");
    expect(destinations).toContain('id: "operations"');
    expect(destinations).toContain('id: "administration"');
    expect(destinations).not.toMatch(/store management|commercial|menu management/i);
  });

  it("keeps customer Analytics off the root and workforce/admin layouts", () => {
    const rootLayout = read("src/app/layout.tsx");
    const customerLayout = read("src/app/(customer)/layout.tsx");
    const workforcePortalLayout = read("src/app/workforce/(portal)/layout.tsx");
    const administrationLayout = read("src/app/workforce/(administration)/layout.tsx");

    expect(customerLayout).toContain('from "@/components/Analytics"');
    expect(customerLayout).toContain("<Analytics />");
    expect(rootLayout).not.toContain("Analytics");
    expect(workforcePortalLayout).not.toContain("Analytics");
    expect(administrationLayout).not.toContain("Analytics");
  });
});
