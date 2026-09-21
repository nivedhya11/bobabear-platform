import assert from "node:assert/strict";
import { test } from "node:test";
import { generateRunId } from "../run-id.mjs";
import { redactText, safeJson } from "../redact.mjs";
import { provisionLogicalTarget } from "./provision.mjs";

test("logical target password is not derived from RUN_ID and publish is loopback-only", async () => {
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 20, 15, 0, 0)),
    randomHex: "eeeeeeeeeeeeeeee",
  });
  const result = await provisionLogicalTarget({
    runId,
    sourceIdentity: "prod-db-1",
    sourceClassification: "production",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn: (_command, args) => {
      if (args[0] === "inspect") return { status: 1, stdout: "", stderr: "missing" };
      if (args[0] === "run") {
        assert.equal(args.includes("-P"), false);
        assert.equal(args.includes("127.0.0.1::5432"), true);
        const passwordArg = args.find((value) => String(value).startsWith("POSTGRES_PASSWORD="));
        assert.ok(passwordArg);
        const password = String(passwordArg).slice("POSTGRES_PASSWORD=".length);
        assert.doesNotMatch(password, new RegExp(runId.slice(-12)));
        assert.doesNotMatch(password, /^rec-/);
        assert.ok(password.length >= 24);
        return { status: 0, stdout: "cid", stderr: "" };
      }
      if (args[0] === "port") {
        return { status: 0, stdout: "127.0.0.1:55432", stderr: "" };
      }
      if (args[0] === "exec" && args.includes("pg_isready")) {
        return { status: 0, stdout: "accepting connections", stderr: "" };
      }
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  assert.equal(result.ok, true, result.reason);
  assert.match(result.target.databaseUrl, /^postgresql:\/\/boba_recovery:[^@]+@127\.0\.0\.1:55432\/boba_recovery$/);
  assert.equal(result.target.hostPort, 55432);

  const password = new URL(result.target.databaseUrl).password;
  assert.doesNotMatch(password, new RegExp(runId));
  assert.doesNotMatch(safeJson(result), new RegExp(password));
  assert.doesNotMatch(redactText(result.target.databaseUrl), new RegExp(password));
  assert.match(redactText(result.target.databaseUrl), /\[REDACTED\]/);

  const nonLoopback = await provisionLogicalTarget({
    runId: generateRunId({
      now: new Date(Date.UTC(2026, 8, 20, 15, 1, 0)),
      randomHex: "ffffffffffffffff",
    }),
    sourceIdentity: "prod-db-1",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn: (_command, args) => {
      if (args[0] === "inspect") return { status: 1, stdout: "", stderr: "missing" };
      if (args[0] === "run") return { status: 0, stdout: "cid", stderr: "" };
      if (args[0] === "port") return { status: 0, stdout: "0.0.0.0:55433", stderr: "" };
      if (args[0] === "rm") return { status: 0, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  assert.equal(nonLoopback.ok, false);
  assert.equal(nonLoopback.code, "TARGET_PUBLISH_NOT_LOOPBACK");
});
