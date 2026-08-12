/**
 * Test-only stand-in for the `server-only` npm package (IMP-006).
 *
 * The real package throws unconditionally unless the resolver has the
 * `react-server` export condition active (which only Next.js's server
 * compilation sets). Vitest runs in plain Node, so importing the real
 * package here would fail every persistence test at import time. This
 * stub is wired in via `resolve.alias` in the Vitest configs — it does
 * NOT touch Next.js's own client-bundle resolution, so the real
 * client-import guard stays fully enforced in the actual app build.
 */
export {};
