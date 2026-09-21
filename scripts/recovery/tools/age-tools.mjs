/**
 * Resolve age / age-keygen for IMP-037 Layer 2.
 *
 * Prefer host binaries. When absent, use a disposable container that already
 * ships age (pinned recovery postgres image). Does not install host-global
 * packages and does not weaken production encrypt semantics.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveContainerCli } from "../docker-exec.mjs";
import { resolveAgeBinary } from "../layer2/age.mjs";

const AGE_IMAGE_CANDIDATES = [
  "boba-bear-postgres:local",
  "localhost/boba-bear-postgres:local",
];

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true, ageBin: string, ageKeygenBin: string, via: "host"|"container"|"env", image?: string, cleanupDir?: string } | { ok: false, reason: string }}
 */
export function resolveAgeTools(env = process.env) {
  const ageBinEnv = resolveAgeBinary(env);
  const keygenEnv =
    typeof env.BOBA_RECOVERY_AGE_KEYGEN_BIN === "string" && env.BOBA_RECOVERY_AGE_KEYGEN_BIN.trim()
      ? env.BOBA_RECOVERY_AGE_KEYGEN_BIN.trim()
      : "age-keygen";

  const ageProbe = spawnSync(ageBinEnv, ["--version"], { encoding: "utf8", timeout: 10_000 });
  const keygenProbe = spawnSync(keygenEnv, ["--version"], { encoding: "utf8", timeout: 10_000 });
  const ageOk =
    !ageProbe.error &&
    (ageProbe.status === 0 || String(ageProbe.stdout ?? "").toLowerCase().includes("age"));
  const keygenOk = !keygenProbe.error && keygenProbe.status === 0;
  if (ageOk && keygenOk) {
    return {
      ok: true,
      ageBin: ageBinEnv,
      ageKeygenBin: keygenEnv,
      via: ageBinEnv === "age" ? "host" : "env",
    };
  }

  const cli = resolveContainerCli();
  if (!cli) {
    return {
      ok: false,
      reason: "age/age-keygen unavailable on host and no container runtime for disposable age tools",
    };
  }

  let image = null;
  for (const candidate of AGE_IMAGE_CANDIDATES) {
    const inspect = spawnSync(cli, ["image", "inspect", candidate], {
      encoding: "utf8",
      timeout: 20_000,
    });
    if (inspect.status === 0) {
      image = candidate;
      break;
    }
  }
  if (!image) {
    return {
      ok: false,
      reason:
        "age/age-keygen unavailable on host; build boba-bear-postgres:local (ships age) or install age",
    };
  }

  const ageInImage = spawnSync(cli, ["run", "--rm", image, "age", "--version"], {
    encoding: "utf8",
    timeout: 60_000,
  });
  if (ageInImage.status !== 0) {
    return {
      ok: false,
      reason: `recovery image ${image} does not provide age`,
    };
  }

  const dir = mkdtempSync(path.join(os.tmpdir(), "boba-age-tools-"));
  const ageWrapper = path.join(dir, "age");
  const keygenWrapper = path.join(dir, "age-keygen");
  // Mount host root so absolute -o / -i paths used by encrypt/decrypt work.
  // Test-only disposable identities; never Founder custody material.
  writeFileSync(
    ageWrapper,
    `#!/bin/sh
set -eu
exec ${shellQuote(cli)} run --rm -i \\
  -v /tmp:/tmp \\
  -v /home:/home \\
  -v /var/tmp:/var/tmp \\
  ${shellQuote(image)} age "$@"
`,
    "utf8",
  );
  writeFileSync(
    keygenWrapper,
    `#!/bin/sh
set -eu
exec ${shellQuote(cli)} run --rm -i \\
  -v /tmp:/tmp \\
  -v /home:/home \\
  -v /var/tmp:/var/tmp \\
  ${shellQuote(image)} age-keygen "$@"
`,
    "utf8",
  );
  chmodSync(ageWrapper, 0o755);
  chmodSync(keygenWrapper, 0o755);

  return {
    ok: true,
    ageBin: ageWrapper,
    ageKeygenBin: keygenWrapper,
    via: "container",
    image,
    cleanupDir: dir,
  };
}

/**
 * @param {string} value
 */
function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

/**
 * @param {string | undefined} cleanupDir
 */
export function cleanupAgeTools(cleanupDir) {
  if (!cleanupDir || !existsSync(cleanupDir)) return;
  try {
    spawnSync("rm", ["-rf", cleanupDir], { encoding: "utf8" });
  } catch {
    // ignore
  }
}
