#!/usr/bin/env node
/**
 * Refresh docker/nginx/cloudflare-real-ip.conf from Cloudflare published CIDR lists.
 * IMP-038 / ADR-017 — does not change real_ip_header / recursive policy.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "docker/nginx/cloudflare-real-ip.conf");

async function fetchLines(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return (await response.text())
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

const ipv4 = await fetchLines("https://www.cloudflare.com/ips-v4/");
const ipv6 = await fetchLines("https://www.cloudflare.com/ips-v6/");

const body = [
  "# IMP-038 / ADR-017 — Cloudflare published CIDRs for Nginx real_ip.",
  "# Source: https://www.cloudflare.com/ips/ (IPv4 + IPv6 lists).",
  "# Refresh via: node scripts/refresh-cloudflare-real-ip.mjs",
  "# When CF-Connecting-IP is absent (local Compose without Cloudflare), Nginx",
  "# leaves $remote_addr as the TCP peer — safe for TRUST_PROXY_HOPS=1 local defaults.",
  "",
  "# Cloudflare IPv4",
  ...ipv4.map((cidr) => `set_real_ip_from ${cidr};`),
  "",
  "# Cloudflare IPv6",
  ...ipv6.map((cidr) => `set_real_ip_from ${cidr};`),
  "",
  "real_ip_header CF-Connecting-IP;",
  "real_ip_recursive on;",
  "",
].join("\n");

writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${ipv4.length} IPv4 + ${ipv6.length} IPv6 CIDRs to ${outPath}`);
