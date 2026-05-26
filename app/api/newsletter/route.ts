/**
 * /api/newsletter — placeholder community signup endpoint.
 *
 * Accepts a single `contact` field that is either an email or a mobile
 * number (legacy `email` key still works). Validates the shape, applies a
 * best-effort per-IP rate limit, and returns 200 OK. Wire this to Resend / a
 * WhatsApp Business list / your CRM-of-the-week when the community list goes
 * live.
 *
 * Privacy: we deliberately do NOT log the submitted email/phone (PII). Only the
 * contact *type* is logged. Add structured logging at the CRM hand-off instead.
 *
 * Returns:
 *   200  { ok: true }                — accepted
 *   400  { ok: false, error: ... }   — bad payload
 *   429  { ok: false, error: ... }   — too many requests
 */

import { NextResponse } from "next/server";

// Permissive enough for real-world inputs, strict enough to catch typos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Optional leading +, then digits/spaces/dashes/parens/dots.
const PHONE_RE = /^\+?[\d\s().-]{8,18}$/;

// ── Rate limit ────────────────────────────────────────────────────────────────
// Best-effort, in-memory sliding window keyed by client IP. Caps casual abuse /
// bot floods of this placeholder endpoint. NOTE: module memory is per-instance,
// so on serverless (e.g. Vercel) this isn't shared across lambdas — treat it as
// a soft guard and add a durable limiter (Upstash/Redis) when wiring a real CRM.
const RATE_LIMIT = 5; // max submissions…
const RATE_WINDOW_MS = 60_000; // …per IP per 60s
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_LIMIT;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(req: Request) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please try again in a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const pick = (key: "contact" | "email") =>
    body && typeof body === "object" && key in body
      ? String((body as Record<string, unknown>)[key]).trim()
      : "";

  // Prefer the new `contact` field; fall back to legacy `email`.
  const contact = pick("contact") || pick("email");
  const digits = contact.replace(/\D/g, "");

  const isEmail = EMAIL_RE.test(contact);
  const isPhone = PHONE_RE.test(contact) && digits.length >= 8 && digits.length <= 15;

  if (!isEmail && !isPhone) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email or mobile number." },
      { status: 400 },
    );
  }

  // TODO: hand off to your email list / WhatsApp Business / CRM here.
  // Log only the contact *type* — never the email/phone value (PII).
  console.log("[community] signup accepted:", isEmail ? "email" : "phone");

  return NextResponse.json({ ok: true });
}
