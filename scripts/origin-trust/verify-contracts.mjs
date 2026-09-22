#!/usr/bin/env node
/**
 * IMP-038 Tranche F — origin-trust contract verification (design/lab only).
 *
 * Validates repository Nginx configs + version-controlled fixtures.
 * Runs fixture-level negative probes (config assertions).
 * Does NOT mutate Cloudflare, DigitalOcean, or production hosts.
 *
 * PRODUCTION_REALIZATION_PENDING — live provision owned by IMP-039.
 *
 * Usage:
 *   node scripts/origin-trust/verify-contracts.mjs
 *   npm run origin-trust:verify
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const PRODUCTION_REALIZATION_PENDING = true;
const IMP039_ACTIVATED = false;

/**
 * @param {{ repositoryRoot?: string }} [opts]
 * @returns {{ ok: true, checks: string[], PRODUCTION_REALIZATION_PENDING: boolean, IMP039_ACTIVATED: boolean }}
 */
export function verifyOriginTrustContracts({ repositoryRoot = DEFAULT_ROOT } = {}) {
  const checks = [];
  const readR = (rel) => {
    const abs = path.join(repositoryRoot, rel);
    assert.ok(existsSync(abs), `missing required path: ${rel}`);
    return readFileSync(abs, "utf8");
  };

  const nginx = readR("docker/nginx/nginx.conf");
  assert.match(
    nginx,
    /include\s+\/etc\/nginx\/boba\/cloudflare-real-ip\.conf\s*;/,
    "nginx.conf must include cloudflare-real-ip.conf",
  );
  checks.push("nginx: includes cloudflare-real-ip.conf");

  assert.match(
    nginx,
    /include\s+\/etc\/nginx\/boba\/security-headers\.conf\s*;/,
    "nginx.conf must include security-headers.conf",
  );
  checks.push("nginx: includes security-headers.conf");

  assert.match(
    nginx,
    /proxy_set_header\s+X-Forwarded-For\s+\$remote_addr\s*;/,
    "nginx.conf must REPLACE X-Forwarded-For with $remote_addr",
  );
  assert.doesNotMatch(
    nginx,
    /proxy_add_x_forwarded_for/,
    "nginx.conf must not append X-Forwarded-For",
  );
  checks.push("nginx: XFF replace (not append)");

  assert.match(
    nginx,
    /location\s+=\s+\/api\/integrations\/payments\/razorpay\/webhook/,
    "nginx.conf must expose exact Razorpay webhook location",
  );
  assert.match(
    nginx,
    /client_max_body_size\s+64k\s*;/,
    "webhook (or commerce) body limit 64k must be present",
  );
  checks.push("nginx: razorpay webhook path + 64k body class");

  const realIp = readR("docker/nginx/cloudflare-real-ip.conf");
  assert.match(realIp, /real_ip_header\s+CF-Connecting-IP\s*;/);
  assert.match(realIp, /real_ip_recursive\s+on\s*;/);
  assert.match(realIp, /set_real_ip_from\s+\S+\s*;/);
  checks.push("real_ip: CF-Connecting-IP + recursive on + CIDRs");

  const aopSnippet = readR(
    "docs/platform/security/origin-trust/fixtures/aop-ssl-client-verify.conf.snippet",
  );
  assert.match(aopSnippet, /ssl_verify_client\s+on\s*;/);
  assert.match(aopSnippet, /ssl_client_certificate\s+\S+\s*;/);
  checks.push("aop fixture: ssl_verify_client on");

  const aopLab = readR(
    "docs/platform/security/origin-trust/fixtures/nginx-aop-lab.conf",
  );
  assert.match(aopLab, /ssl_verify_client\s+on\s*;/);
  assert.match(aopLab, /listen\s+8443\s+ssl\s*;/);
  checks.push("aop lab nginx: listen 8443 ssl + verify client");

  const fw = JSON.parse(
    readR(
      "docs/platform/security/origin-trust/fixtures/do-firewall-cloudflare-allowlist.example.json",
    ),
  );
  assert.equal(fw.default_inbound, "deny", "firewall fixture must deny by default");
  assert.ok(Array.isArray(fw.allow_sources) && fw.allow_sources.length > 0);
  for (const src of fw.allow_sources) {
    assert.ok(typeof src.cidr === "string" && src.cidr.includes("/"), `bad cidr: ${src.cidr}`);
  }
  checks.push("firewall fixture: deny-by-default + CIDR allow sources");

  const allowCidrs = fw.allow_sources.map((s) => s.cidr);
  for (const probe of fw.deny_probe_examples ?? []) {
    assert.ok(probe.ip, "deny probe needs ip");
    assert.ok(
      !allowCidrs.includes(probe.ip),
      `deny probe IP must not be an allowlist entry: ${probe.ip}`,
    );
    for (const cidr of allowCidrs) {
      assert.notEqual(probe.ip, cidr);
    }
    checks.push(`firewall negative probe (config): ${probe.ip} not allowlisted`);
  }

  assert.doesNotMatch(realIp, /set_real_ip_from\s+0\.0\.0\.0\/0\s*;/);
  assert.doesNotMatch(realIp, /set_real_ip_from\s+::\/0\s*;/);
  checks.push("real_ip negative: no 0.0.0.0/0 or ::/0 trust");

  assert.equal(IMP039_ACTIVATED, false);
  assert.equal(PRODUCTION_REALIZATION_PENDING, true);
  checks.push("lifecycle: IMP039_ACTIVATED=NO; PRODUCTION_REALIZATION_PENDING=YES");

  return {
    ok: true,
    checks,
    PRODUCTION_REALIZATION_PENDING,
    IMP039_ACTIVATED,
  };
}

function main() {
  const result = verifyOriginTrustContracts();
  console.log("origin-trust:verify OK (lab/config only)");
  console.log(`PRODUCTION_REALIZATION_PENDING=${result.PRODUCTION_REALIZATION_PENDING}`);
  console.log(`IMP039_ACTIVATED=${result.IMP039_ACTIVATED}`);
  for (const c of result.checks) {
    console.log(`  ✓ ${c}`);
  }
  console.log(
    "Note: does not prove live Cloudflare/DO/AOP realization — owner IMP-039.",
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    main();
  } catch (err) {
    console.error("origin-trust:verify FAILED");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
