import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS, RAZORPAY_CHECKOUT_SCRIPT_URL } from "./types";

describe("Razorpay Checkout security policy boundary", () => {
  it("documents exact Razorpay origins without wildcards", () => {
    const all = [
      ...RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS.scriptSrc,
      ...RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS.frameSrc,
      ...RAZORPAY_CHECKOUT_DOCUMENTED_ORIGINS.connectSrc,
    ];
    expect(all.every((origin) => origin.startsWith("https://") && !origin.includes("*"))).toBe(true);
    expect(RAZORPAY_CHECKOUT_SCRIPT_URL.startsWith("https://checkout.razorpay.com/")).toBe(true);
  });

  it("does not introduce a wildcard CSP in Next or Nginx", () => {
    const nextConfig = readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    const nginx = readFileSync(path.join(process.cwd(), "docker/nginx/nginx.conf"), "utf8");
    expect(nextConfig).not.toMatch(/script-src[^;\n]*\*/);
    expect(nginx).not.toMatch(/Content-Security-Policy[^;\n]*\*/);
    expect(nginx).not.toMatch(/script-src\s+[^;\n]*\*/);
  });
});
