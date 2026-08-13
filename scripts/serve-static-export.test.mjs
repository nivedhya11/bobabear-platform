import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, before, after } from "node:test";

import { trailingSlashRedirectLocation } from "./serve-static-export.mjs";

describe("trailingSlashRedirectLocation (D-356)", () => {
  let outDir;

  before(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), "static-export-"));
    fs.mkdirSync(path.join(outDir, "order", "checkout"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "order", "checkout", "index.html"), "<html></html>");
    fs.writeFileSync(path.join(outDir, "opengraph-image"), "fake-image");
  });

  after(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it("redirects directory pages without a trailing slash", () => {
    assert.equal(
      trailingSlashRedirectLocation(outDir, "/order/checkout"),
      "/order/checkout/",
    );
    assert.equal(
      trailingSlashRedirectLocation(outDir, "/order/checkout", "?step=1"),
      "/order/checkout/?step=1",
    );
  });

  it("leaves slash-terminated pages, root, files, and missing routes alone", () => {
    assert.equal(trailingSlashRedirectLocation(outDir, "/order/checkout/"), null);
    assert.equal(trailingSlashRedirectLocation(outDir, "/"), null);
    assert.equal(trailingSlashRedirectLocation(outDir, "/opengraph-image"), null);
    assert.equal(trailingSlashRedirectLocation(outDir, "/robots.txt"), null);
    assert.equal(trailingSlashRedirectLocation(outDir, "/missing"), null);
  });
});
