import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SERVER_KEY = "BOBA_BEAR_GOOGLE_MAPS_API_KEY";
const BROWSER_KEY = "NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY";

function walkClientSources(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "server") continue;
      walkClientSources(full, files);
    } else if (/\.(tsx|ts)$/.test(entry) && !/\.test\./.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("IMP-036B Google Maps key boundary", () => {
  it("never references the server Google key in customer client modules", () => {
    const locationDir = path.join(ROOT, "src/components/location");
    const libDir = path.join(ROOT, "src/lib/customer-location");
    const sources = [...walkClientSources(locationDir), ...walkClientSources(libDir)];
    for (const file of sources) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain(SERVER_KEY);
    }
  });

  it("uses the approved browser Maps JS env key name", () => {
    const configFile = path.join(ROOT, "src/lib/customer-location/maps-js-config.ts");
    const text = readFileSync(configFile, "utf8");
    expect(text).toContain(BROWSER_KEY);
    expect(text).not.toContain(SERVER_KEY);
  });
});
