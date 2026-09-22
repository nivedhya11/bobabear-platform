import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSecurityHeadersConf } from "./generate-nginx-security-headers.mjs";

describe("generate-nginx-security-headers", () => {
  it("omits GA hosts by default (GA disabled)", () => {
    const conf = buildSecurityHeadersConf(false);
    assert.match(conf, /Content-Security-Policy-Report-Only/);
    assert.match(conf, /https:\/\/challenges\.cloudflare\.com/);
    assert.match(conf, /https:\/\/checkout\.razorpay\.com/);
    assert.match(conf, /https:\/\/maps\.googleapis\.com/);
    assert.doesNotMatch(conf, /googletagmanager/);
    assert.doesNotMatch(conf, /google-analytics/);
    assert.doesNotMatch(conf, /script-src[^;]*\*/);
  });

  it("includes GA hosts only when GA enabled", () => {
    const conf = buildSecurityHeadersConf(true);
    assert.match(conf, /https:\/\/www\.googletagmanager\.com/);
    assert.match(conf, /https:\/\/www\.google-analytics\.com/);
    assert.match(conf, /https:\/\/challenges\.cloudflare\.com/);
  });
});
