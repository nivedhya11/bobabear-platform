/**
 * Layer 1 repository cipher rotation via NEW_ENCRYPTED_REPOSITORY_GENERATION.
 *
 * In-place cipher passphrase change is FORBIDDEN.
 * A new passphrase creates repo-gen-{N+1}; prior generation metadata is preserved.
 * No fake native per-object key versions — keyVersion is BOBA recovery metadata.
 */
/**
 * @param {object} input
 * @param {number|string} input.currentGeneration
 * @param {boolean} input.newPassphrasePresent
 * @param {boolean} [input.preservePriorGeneration]
 * @param {boolean} [input.inPlaceCipherChange]
 * @returns {{ ok: true, plan: object } | { ok: false, reason: string }}
 */
export function planRepositoryGenerationRotation(input) {
  if (input?.inPlaceCipherChange === true) {
    return {
      ok: false,
      reason: "PGBACKREST_CIPHER_ROTATION_IN_PLACE is FORBIDDEN",
    };
  }
  const current = Number(input?.currentGeneration);
  if (!Number.isInteger(current) || current < 1) {
    return { ok: false, reason: "currentGeneration must be a positive integer" };
  }
  if (input.newPassphrasePresent !== true) {
    return {
      ok: false,
      reason:
        "new repository cipher material must be present and recoverable off-host before rotation",
    };
  }
  if (input.preservePriorGeneration === false) {
    return {
      ok: false,
      reason: "prior encrypted repository generation metadata must be preserved",
    };
  }

  const nextGeneration = current + 1;
  return {
    ok: true,
    plan: {
      model: "NEW_ENCRYPTED_REPOSITORY_GENERATION",
      currentGeneration: current,
      nextGeneration,
      currentRepoPath: `repo-gen-${current}`,
      nextRepoPath: `repo-gen-${nextGeneration}`,
      preservePriorGeneration: true,
      inPlaceCipherChange: false,
      nativePerObjectKeyVersions: false,
      keyVersion: `repo-gen-${nextGeneration}`,
      priorKeyVersion: `repo-gen-${current}`,
      note: "Old passphrase remains required in off-host custody for retained prior-generation artifacts",
      bootstrapAfterRotation:
        "After rendering/starting postgres for the new generation, run `recovery pgbackrest init --generation N` (stanza-create + check) before scheduled backup",
    },
  };
}
