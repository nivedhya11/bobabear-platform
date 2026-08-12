/**
 * Pure bundle dietary derivation inputs (IMP-012).
 *
 * Compute only — never persist authoritative "bundle is vegetarian" flags.
 * Callers supply the tags of the *selected* component variants and modifier
 * options; this helper unions and sorts them.
 */

export type DietaryTagRef = Readonly<{
  id: string;
  code: string;
}>;

export type DeriveBundleDietaryInputsArgs = Readonly<{
  componentVariantTags: readonly DietaryTagRef[];
  modifierOptionTags: readonly DietaryTagRef[];
}>;

export type BundleDietaryDerivation = Readonly<{
  tagIds: readonly string[];
  tagCodes: readonly string[];
}>;

/**
 * Union selected component-variant and modifier-option dietary tags into
 * sorted unique id/code lists for display or further computation.
 */
export function deriveBundleDietaryInputs(
  input: DeriveBundleDietaryInputsArgs,
): BundleDietaryDerivation {
  const byId = new Map<string, string>();

  for (const tag of [...input.componentVariantTags, ...input.modifierOptionTags]) {
    if (typeof tag.id !== "string" || tag.id.length === 0) continue;
    if (typeof tag.code !== "string" || tag.code.length === 0) continue;
    byId.set(tag.id, tag.code);
  }

  const tagIds = [...byId.keys()].sort();
  const tagCodes = [...new Set(byId.values())].sort();
  return { tagIds, tagCodes };
}
