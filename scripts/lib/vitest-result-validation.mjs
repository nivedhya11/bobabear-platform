// Pure, dependency-free validation for Vitest's `json` reporter output.
// Kept separate from run-vitest.mjs so it can be unit-tested directly with
// `node --test`, without needing Vitest itself to already be trustworthy.

/**
 * @param {string} raw
 * @returns {{ok: true, value: any} | {ok: false, reason: string}}
 */
export function parseResultJson(raw) {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, reason: "result file was empty" };
  }
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "result file was not valid JSON" };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "result JSON was not an object" };
  }
  return { ok: true, value };
}

const REQUIRED_NUMERIC_FIELDS = [
  "numTotalTestSuites",
  "numTotalTests",
  "numFailedTests",
  "numPassedTests",
];

/**
 * Validates a parsed Vitest `json` reporter result object.
 * Fails closed: any missing, malformed, or out-of-range field rejects the run.
 *
 * @param {any} result
 * @returns {{ok: true, summary: {testFiles: number, tests: number, passed: number, failed: number}} | {ok: false, reason: string}}
 */
export function validateVitestResult(result) {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return { ok: false, reason: "result was not an object" };
  }

  for (const field of REQUIRED_NUMERIC_FIELDS) {
    const value = result[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return { ok: false, reason: `result field "${field}" was missing or not a valid number` };
    }
  }

  if (typeof result.success !== "boolean") {
    return { ok: false, reason: 'result field "success" was missing or not a boolean' };
  }

  const summary = {
    testFiles: result.numTotalTestSuites,
    tests: result.numTotalTests,
    passed: result.numPassedTests,
    failed: result.numFailedTests,
  };

  if (summary.testFiles === 0) {
    return { ok: false, reason: "zero test files executed", summary };
  }

  if (summary.tests === 0) {
    return { ok: false, reason: "zero tests executed", summary };
  }

  if (summary.failed > 0) {
    return { ok: false, reason: `${summary.failed} test(s) failed`, summary };
  }

  if (!result.success) {
    return { ok: false, reason: "Vitest reported an unsuccessful run", summary };
  }

  return { ok: true, summary };
}
