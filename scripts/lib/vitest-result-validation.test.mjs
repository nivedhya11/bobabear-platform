// Runs under Node's built-in test runner (`node --test`), deliberately not
// Vitest — this validates the logic that decides whether Vitest itself is
// trustworthy, so it must not depend on Vitest already working.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseResultJson, validateVitestResult } from "./vitest-result-validation.mjs";

test("parseResultJson rejects an empty file", () => {
  const result = parseResultJson("");
  assert.equal(result.ok, false);
  assert.match(result.reason, /empty/);
});

test("parseResultJson rejects malformed JSON", () => {
  const result = parseResultJson("{not json");
  assert.equal(result.ok, false);
  assert.match(result.reason, /not valid JSON/);
});

test("parseResultJson rejects a JSON array", () => {
  const result = parseResultJson("[]");
  assert.equal(result.ok, false);
});

test("parseResultJson accepts valid JSON", () => {
  const result = parseResultJson('{"a":1}');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { a: 1 });
});

test("validateVitestResult accepts a valid passing result", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 5,
    numTotalTests: 25,
    numPassedTests: 25,
    numFailedTests: 0,
    success: true,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, { testFiles: 5, tests: 25, passed: 25, failed: 0 });
});

test("validateVitestResult rejects zero test files", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 0,
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    success: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /zero test files/);
});

test("validateVitestResult rejects zero executed tests with files present", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 3,
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    success: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /zero tests executed/);
});

test("validateVitestResult rejects failed tests", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 2,
    numTotalTests: 10,
    numPassedTests: 8,
    numFailedTests: 2,
    success: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /2 test\(s\) failed/);
});

test("validateVitestResult rejects success=false even with zero failed count", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 2,
    numTotalTests: 10,
    numPassedTests: 10,
    numFailedTests: 0,
    success: false,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /unsuccessful/);
});

test("validateVitestResult rejects missing required fields", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 2,
    numTotalTests: 10,
    success: true,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /numFailedTests/);
});

test("validateVitestResult rejects a non-object result", () => {
  assert.equal(validateVitestResult(null).ok, false);
  assert.equal(validateVitestResult("oops").ok, false);
  assert.equal(validateVitestResult([]).ok, false);
});

test("validateVitestResult rejects a non-boolean success field", () => {
  const result = validateVitestResult({
    numTotalTestSuites: 2,
    numTotalTests: 10,
    numPassedTests: 10,
    numFailedTests: 0,
    success: "true",
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /success/);
});
