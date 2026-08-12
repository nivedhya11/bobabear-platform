import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// A small number of true end-to-end invocations of the actual CLI, run in a
// clean child environment so the developer's real `.env.local` cannot hide
// a negative scenario. Kept deliberately few — this is a safety net on top
// of the pure-function tests in schema.test.ts, not a substitute for them.
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const cliPath = path.join(projectRoot, "scripts", "check-config.ts");

function runCli(
  args: string[],
  env: Record<string, string | undefined>,
): { status: number; stdout: string; stderr: string } {
  try {
    const childEnv: NodeJS.ProcessEnv = {
      NODE_ENV: process.env.NODE_ENV ?? "test",
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      ...env,
    };
    const stdout = execFileSync("npx", ["tsx", cliPath, ...args], {
      cwd: projectRoot,
      env: childEnv,
      encoding: "utf8",
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const execError = error as { status: number | null; stdout: string; stderr: string };
    return {
      status: execError.status ?? 1,
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
    };
  }
}

describe("scripts/check-config.ts (real CLI, clean child environment)", () => {
  it(
    "exits 0 and prints a safe summary for a valid local web configuration",
    () => {
      const result = runCli(["--process", "web"], {
        BOBA_BEAR_ENV: "local",
        BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("BOBA Bear configuration OK");
    },
    20_000,
  );

  it(
    "exits non-zero for an unknown BOBA_BEAR_* variable regardless of an otherwise-valid .env.local",
    () => {
      // The repository's own .env.local (created from .env.example for
      // local development) always supplies a valid base configuration, so
      // this does not rely on BOBA_BEAR_ENV being absent — it proves the
      // unknown-key rejection fires even on top of a valid base.
      const result = runCli(["--process", "web"], {
        BOBA_BEAR_ENVIROMENT: "production",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("BOBA_BEAR_ENVIROMENT");
    },
    20_000,
  );

  it(
    "never prints a sentinel secret-like value, even on failure",
    () => {
      const SENTINEL = "DO_NOT_LEAK_THIS_SECRET_74291";
      const result = runCli(["--process", "web"], {
        BOBA_BEAR_ENV: "local",
        BOBA_BEAR_PUBLIC_ORIGIN: "http://localhost:3000",
        BOBA_BEAR_SECRET_TOKEN: SENTINEL,
      });
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain(SENTINEL);
      expect(result.stderr).not.toContain(SENTINEL);
    },
    20_000,
  );
});
