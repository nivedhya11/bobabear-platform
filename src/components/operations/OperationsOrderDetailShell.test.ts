import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Operations order detail static shell", () => {
  it("keeps the fixed App Router detail shell and canonical href", async () => {
    const pagePath = path.join(
      process.cwd(),
      "src/app/workforce/operations/orders/detail/page.tsx",
    );
    await access(pagePath);
    const source = await readFile(pagePath, "utf8");
    expect(source).toContain('canonical: "/workforce/operations/orders/detail"');
    expect(source).toContain("OperationsOrderDetailClient");
    expect(source).not.toMatch(/\[\s*orderId\s*\]/);
  });
});
