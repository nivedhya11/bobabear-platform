import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSecurityHeadersConf } from "./generate-nginx-security-headers.mjs";

describe("generate-nginx-security-headers", () => {
  it("omits GA hosts by default (GA disabled) and includes D-376 Maps Fonts hosts", () => {
    const conf = buildSecurityHeadersConf(false);
    assert.match(conf, /Content-Security-Policy-Report-Only/);
    assert.match(conf, /https:\/\/challenges\.cloudflare\.com/);
    assert.match(conf, /https:\/\/checkout\.razorpay\.com/);
    assert.match(conf, /https:\/\/maps\.googleapis\.com/);
    assert.match(conf, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
    assert.match(conf, /font-src 'self' https:\/\/fonts\.gstatic\.com/);
    assert.doesNotMatch(conf, /googletagmanager/);
    assert.doesNotMatch(conf, /google-analytics/);
    assert.doesNotMatch(conf, /script-src[^;]*\*/);
    assert.doesNotMatch(conf, /\*\.googleapis\.com/);
    assert.doesNotMatch(conf, /\*\.gstatic\.com/);
  });

  it("includes GA hosts only when GA enabled", () => {
    const conf = buildSecurityHeadersConf(true);
    assert.match(conf, /https:\/\/www\.googletagmanager\.com/);
    assert.match(conf, /https:\/\/www\.google-analytics\.com/);
    assert.match(conf, /https:\/\/challenges\.cloudflare\.com/);
    assert.match(conf, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  });

  it("emits enforcing Content-Security-Policy when enforce=true (committed default)", () => {
    const conf = buildSecurityHeadersConf(false, true);
    assert.match(conf, /Content-Security-Policy "/);
    assert.doesNotMatch(conf, /Content-Security-Policy-Report-Only/);
    assert.match(conf, /CSP_PHASE=ENFORCE/);
    assert.match(conf, /font-src 'self' https:\/\/fonts\.gstatic\.com/);
    assert.match(conf, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  });
});
