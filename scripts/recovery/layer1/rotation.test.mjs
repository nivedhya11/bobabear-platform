import assert from "node:assert/strict";
import { test } from "node:test";
import { planRepositoryGenerationRotation } from "./rotation.mjs";

test("Layer-1 in-place cipher rotation is refused", () => {
  const refused = planRepositoryGenerationRotation({
    currentGeneration: 1,
    newPassphrasePresent: true,
    inPlaceCipherChange: true,
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /IN_PLACE|FORBIDDEN/i);
});

test("Layer-1 NEW_ENCRYPTED_REPOSITORY_GENERATION advances repo-gen path", () => {
  const plan = planRepositoryGenerationRotation({
    currentGeneration: 1,
    newPassphrasePresent: true,
    preservePriorGeneration: true,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.plan.model, "NEW_ENCRYPTED_REPOSITORY_GENERATION");
  assert.equal(plan.plan.currentRepoPath, "repo-gen-1");
  assert.equal(plan.plan.nextRepoPath, "repo-gen-2");
  assert.equal(plan.plan.inPlaceCipherChange, false);
  assert.equal(plan.plan.preservePriorGeneration, true);
  assert.equal(plan.plan.keyVersion, "repo-gen-2");
  assert.equal(plan.plan.priorKeyVersion, "repo-gen-1");
});

test("Layer-1 rotation refuses discarding prior generation", () => {
  const refused = planRepositoryGenerationRotation({
    currentGeneration: 2,
    newPassphrasePresent: true,
    preservePriorGeneration: false,
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /prior|preserve/i);
});
