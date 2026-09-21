import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { decryptFromAge, encryptToAge, fingerprintRecipient } from "./age.mjs";
import {
  assertPrivateKeyNotOnBackupPath,
  planAgeRecipientRotation,
} from "./rotation.mjs";
import { cleanupAgeTools, resolveAgeTools } from "../tools/age-tools.mjs";

test("Layer-2 backup-only path refuses private identity env", () => {
  const blocked = assertPrivateKeyNotOnBackupPath({
    AGE_SECRET_KEY: "AGE-SECRET-KEY-1fake",
  });
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /AGE_SECRET_KEY/);

  const blockedPath = assertPrivateKeyNotOnBackupPath({
    BOBA_RECOVERY_AGE_IDENTITY_FILE: "/tmp/id.txt",
  });
  assert.equal(blockedPath.ok, false);

  const ok = assertPrivateKeyNotOnBackupPath({ BOBA_BEAR_ENV: "local" });
  assert.equal(ok.ok, true);
});

test("Layer-2 rotation refuses falsely discarded old identities", () => {
  const refused = planAgeRecipientRotation({
    newRecipient: "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3waw4h",
    oldPrivateIdentitiesRetained: false,
    retainedRecipientFingerprints: ["abc"],
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /RETIRED_KEYS|retained/i);
});

test("Layer-2 disposable recipient rotation encrypt/decrypt with retained A", async (t) => {
  const tools = resolveAgeTools();
  if (!tools.ok) {
    t.skip(`age tools unavailable: ${tools.reason}`);
    return;
  }
  const root = mkdtempSync(path.join(os.tmpdir(), "boba-l2-rot-"));
  const identityA = path.join(root, "id-a.txt");
  const identityB = path.join(root, "id-b.txt");
  try {
    const keygenA = spawnSync(tools.ageKeygenBin, ["-o", identityA], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(keygenA.status, 0, keygenA.stderr || keygenA.stdout);
    const keygenB = spawnSync(tools.ageKeygenBin, ["-o", identityB], {
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.equal(keygenB.status, 0, keygenB.stderr || keygenB.stdout);

    let recipientA = `${keygenA.stdout ?? ""}\n${keygenA.stderr ?? ""}`
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("age1") || line.startsWith("Public key:"));
    let recipientB = `${keygenB.stdout ?? ""}\n${keygenB.stderr ?? ""}`
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("age1") || line.startsWith("Public key:"));
    if (recipientA?.startsWith("Public key:")) recipientA = recipientA.replace("Public key:", "").trim();
    if (recipientB?.startsWith("Public key:")) recipientB = recipientB.replace("Public key:", "").trim();
    assert.ok(recipientA?.startsWith("age1"), "recipient A required");
    assert.ok(recipientB?.startsWith("age1"), "recipient B required");

    const fpA = fingerprintRecipient(recipientA);
    const fpB = fingerprintRecipient(recipientB);
    assert.notEqual(fpA, fpB);

    const plan = planAgeRecipientRotation({
      newRecipient: recipientB,
      oldPrivateIdentitiesRetained: true,
      retainedRecipientFingerprints: [fpA],
      keyVersion: `age-gen-${fpB}`,
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.metadata.recordsPrivateKeyMaterial, false);
    assert.equal(plan.metadata.recipientFingerprint, fpB);
    assert.deepEqual(plan.metadata.retainedRecipientFingerprints, [fpA]);

    const artifactA = path.join(root, "artifact-a.bin.age");
    const artifactB = path.join(root, "artifact-b.bin.age");
    const encA = await encryptToAge({
      recipients: [recipientA],
      plaintext: Buffer.from("layer2-artifact-A"),
      outputPath: artifactA,
      ageBin: tools.ageBin,
    });
    assert.equal(encA.ok, true, encA.reason);

    const backupEnvCheck = assertPrivateKeyNotOnBackupPath({
      BOBA_RECOVERY_AGE_RECIPIENT: recipientB,
    });
    assert.equal(backupEnvCheck.ok, true);

    const encB = await encryptToAge({
      recipients: [recipientB],
      plaintext: Buffer.from("layer2-artifact-B"),
      outputPath: artifactB,
      ageBin: tools.ageBin,
    });
    assert.equal(encB.ok, true, encB.reason);

    const decA = await decryptFromAge({
      identityFile: identityA,
      ciphertext: readFileSync(artifactA),
      ageBin: tools.ageBin,
    });
    assert.equal(decA.ok, true, decA.reason);
    assert.equal(Buffer.from(decA.plaintext).toString("utf8"), "layer2-artifact-A");

    const decB = await decryptFromAge({
      identityFile: identityB,
      ciphertext: readFileSync(artifactB),
      ageBin: tools.ageBin,
    });
    assert.equal(decB.ok, true, decB.reason);
    assert.equal(Buffer.from(decB.plaintext).toString("utf8"), "layer2-artifact-B");

    const wrong = await decryptFromAge({
      identityFile: identityB,
      ciphertext: readFileSync(artifactA),
      ageBin: tools.ageBin,
    });
    assert.equal(wrong.ok, false);

    const metaText = JSON.stringify(plan.metadata);
    assert.equal(metaText.includes("AGE-SECRET-KEY"), false);
    assert.equal(readFileSync(identityA, "utf8").includes("AGE-SECRET-KEY"), true);
  } finally {
    cleanupAgeTools(tools.cleanupDir);
    rmSync(root, { recursive: true, force: true });
  }
});
