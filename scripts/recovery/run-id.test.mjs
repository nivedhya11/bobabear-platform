import assert from "node:assert/strict";
import { test } from "node:test";
import { generateRunId, isValidRunId, parseRunId, runIdInstant } from "./run-id.mjs";

test("generateRunId is unique, UTC-timestamped, filesystem-safe, and secret-free", () => {
  const ids = new Set();
  for (let i = 0; i < 200; i += 1) {
    const id = generateRunId();
    assert.equal(isValidRunId(id), true, id);
    assert.match(id, /^\d{8}T\d{6}Z-[0-9a-f]{16}$/);
    assert.doesNotMatch(id, /password|secret|token|customer|@/i);
    ids.add(id);
  }
  assert.equal(ids.size, 200);
});

test("generateRunId encodes the supplied UTC timestamp", () => {
  const now = new Date(Date.UTC(2026, 8, 20, 1, 2, 3));
  const id = generateRunId({ now, randomHex: "aaaaaaaaaaaaaaaa" });
  assert.equal(id, "20260920T010203Z-aaaaaaaaaaaaaaaa");
  assert.equal(runIdInstant(id).toISOString(), "2026-09-20T01:02:03.000Z");
  const parsed = parseRunId(id);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.timestampUtc, "20260920T010203Z");
    assert.equal(parsed.randomHex, "aaaaaaaaaaaaaaaa");
  }
});

test("parseRunId rejects malformed IDs", () => {
  for (const value of [
    "",
    null,
    "latest",
    "20260920-aaaaaaaaaaaaaaaa",
    "20260920T010203Z",
    "20260920T010203Z-ZZ",
    "20260920T010203Z-aaaaaaaaaaaaaaaG",
    "20261301T010203Z-aaaaaaaaaaaaaaaa",
    "20260920T250203Z-aaaaaaaaaaaaaaaa",
    "not-a-run-id",
    "20260920T010203Z-aaaaaaaaaaaaaaaa-extra",
  ]) {
    const parsed = parseRunId(value);
    assert.equal(parsed.ok, false, String(value));
    assert.equal(isValidRunId(value), false);
  }
});

test("later timestamps sort after earlier timestamps", () => {
  const earlier = generateRunId({ now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)), randomHex: "1111111111111111" });
  const later = generateRunId({ now: new Date(Date.UTC(2026, 0, 1, 0, 0, 1)), randomHex: "0000000000000000" });
  assert.equal(earlier < later, true);
});
