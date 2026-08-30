#!/usr/bin/env node
/**
 * Project governance consistency checker (read-only).
 *
 * Validates canonical authority documents, ROADMAP↔STATE alignment, decision
 * register structural integrity, and robust technical/static-web checks.
 * Does not rewrite docs or mutate source.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { computeWorkingTreeFingerprint } from "./working-tree-fingerprint.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {"roadmap" | "state"} kind
 * @param {string} version
 */
export function isAllowedGovernanceVersion(kind, version) {
  if (kind === "roadmap") return /^GTM-R[1-9]\d*$/.test(version);
  if (kind === "state") return /^STATE-R[1-9]\d*$/.test(version);
  return false;
}

export function isValidCanonicalRevision(kind, version) {
  if (kind === "vision") return /^VISION-[1-9]\d*$/.test(version);
  if (kind === "architecture") return /^ARCH-R[1-9]\d*$/.test(version);
  if (kind === "decision") return /^DR-[1-9]\d*$/.test(version);
  return isAllowedGovernanceVersion(kind, version);
}

/** @typedef {{ ok: boolean, code?: string, message: string }} Finding */

/** @type {Finding[]} */
const findings = [];

function fail(code, message) {
  findings.push({ ok: false, code, message });
}

function note(message) {
  findings.push({ ok: true, message });
}

/**
 * Resolve a path under docs/platform with case-insensitive fallback (NTFS/WSL).
 * Prefer {@link resolveExactRelativeFile} for CURRENT canonical authorities that
 * must be portable across case-sensitive checkouts.
 * @param {string} preferredRelative
 */
function resolvePlatformDoc(preferredRelative) {
  const preferred = path.join(projectRoot, preferredRelative);
  if (existsSync(preferred)) return preferred;
  const dir = path.dirname(preferred);
  const base = path.basename(preferred);
  if (!existsSync(dir)) return preferred;
  const match = readdirSync(dir).find((name) => name.toLowerCase() === base.toLowerCase());
  return match ? path.join(dir, match) : preferred;
}

/**
 * Resolve a repository-relative file by exact directory-entry basename match.
 * Does not accept case-insensitive aliases (critical on /mnt/c 9p).
 * @param {string} relativePath
 * @returns {string | null} absolute path, or null if exact entry missing
 */
function resolveExactRelativeFile(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const abs = path.join(projectRoot, normalized);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  if (!names.includes(base)) return null;
  const exactAbs = path.join(dir, base);
  try {
    if (!statSync(exactAbs).isFile()) return null;
  } catch {
    return null;
  }
  return exactAbs;
}

/** Canonical Decision Register pathname (tracked + portable). */
const DECISION_REGISTER_REL = "docs/platform/decision-register.md";

/**
 * Formal ROADMAP ledger IMP identifier: numeric id with optional single uppercase suffix.
 * Examples: IMP-001, IMP-005A, IMP-026C. Rejects IMP-026AA, IMP-26a, IMP-026-C, IMP_026C.
 */
export const FORMAL_LEDGER_IMP_ID_RE = /^IMP-\d+[A-Z]?$/;

/** Table-row capture for formal ledger IMP ids (see {@link FORMAL_LEDGER_IMP_ID_RE}). */
export const LEDGER_ROW_IMP_RE = /\|\s*(IMP-\d+[A-Z]?)\s*\|\s*([^|]+)\|/g;

/**
 * Validate lifecycle relationships from canonical capability facts rather than
 * a historical lifecycle checkpoint.
 * @param {{ acceptedThrough: string, currentProductSlice: string, pendingAcceptance: string, capabilities: Array<{ id: string, accepted?: boolean, implementationComplete?: boolean }> }} position
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function evaluateCapabilityLifecycle(position) {
  const capabilities = new Map(position.capabilities.map((capability) => [capability.id, capability]));
  const capabilityIndex = new Map(position.capabilities.map((capability, index) => [capability.id, index]));
  const accepted = capabilities.get(position.acceptedThrough);
  const current = position.currentProductSlice === "NONE" ? null : capabilities.get(position.currentProductSlice);
  const pending = position.pendingAcceptance === "NONE" ? null : capabilities.get(position.pendingAcceptance);

  if (!accepted) {
    return { ok: false, code: "ACCEPTED_THROUGH_MISSING", message: `acceptedThrough ${position.acceptedThrough} is not in the capability ledger` };
  }
  if (!accepted.accepted) {
    return { ok: false, code: "ACCEPTED_THROUGH_UNACCEPTED", message: `acceptedThrough ${position.acceptedThrough} is not marked accepted` };
  }
  if (!current && pending) {
    return { ok: false, code: "PENDING_WITHOUT_CURRENT", message: `pendingAcceptance ${position.pendingAcceptance} requires a current product slice` };
  }
  if (position.currentProductSlice !== "NONE" && !current) {
    return { ok: false, code: "CURRENT_SLICE_MISSING", message: `currentProductSlice ${position.currentProductSlice} is not in the capability ledger` };
  }
  if (position.pendingAcceptance !== "NONE" && !pending) {
    return { ok: false, code: "PENDING_ACCEPTANCE_MISSING", message: `pendingAcceptance ${position.pendingAcceptance} is not in the capability ledger` };
  }
  if (current?.accepted) {
    return { ok: false, code: "CURRENT_SLICE_ACCEPTED", message: `currentProductSlice ${current.id} is already accepted` };
  }
  if (pending?.accepted) {
    return { ok: false, code: "PENDING_ACCEPTANCE_ACCEPTED", message: `pendingAcceptance ${pending.id} is already accepted` };
  }
  if (pending && pending.id !== current?.id) {
    return { ok: false, code: "PENDING_ACCEPTANCE_NOT_CURRENT", message: `pendingAcceptance ${pending.id} must be the current product slice ${current?.id ?? "NONE"}` };
  }
  if (current && capabilityIndex.get(current.id) <= capabilityIndex.get(accepted.id)) {
    return { ok: false, code: "CURRENT_SLICE_NOT_SUCCESSOR", message: `currentProductSlice ${current.id} must follow acceptedThrough ${accepted.id} in the capability ledger` };
  }
  if (pending && !pending.implementationComplete) {
    return { ok: false, code: "PENDING_ACCEPTANCE_INCOMPLETE", message: `pendingAcceptance ${pending.id} is not implementation complete` };
  }
  if (current?.implementationComplete && !pending) {
    return { ok: false, code: "COMPLETE_CURRENT_NOT_PENDING", message: `implementation-complete currentProductSlice ${current.id} must be pending acceptance` };
  }
  return { ok: true };
}

/**
 * @param {{ acceptedThrough: string, currentProductSlice: string, nextProductSlice: string, pendingAcceptance: string }} roadmap
 * @param {{ acceptedThrough: string, currentProductSlice: string, nextProductSlice: string, pendingAcceptance: string }} state
 */
export function evaluateLifecycleAuthorityAlignment(roadmap, state) {
  for (const key of ["acceptedThrough", "currentProductSlice", "nextProductSlice", "pendingAcceptance"]) {
    if (!nullishEqual(roadmap[key], state[key])) {
      return {
        ok: false,
        code: "ROADMAP_STATE_MISMATCH",
        message: `${key}: ROADMAP=${JSON.stringify(roadmap[key])} STATE=${JSON.stringify(state[key])}`,
      };
    }
  }
  return { ok: true };
}

/**
 * Detect IMP-025 lifecycle claims without false positives from nearby IMP-026C text.
 * @param {string} text
 * @param {string} impId
 */
export function claimsImpLifecycleImplementationInProgress(text, impId) {
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const idx = text.indexOf(impId, searchFrom);
    if (idx === -1) break;
    const window = text.slice(idx, idx + 120);
    const implIdx = window.indexOf("IMPLEMENTATION_IN_PROGRESS");
    if (implIdx !== -1) {
      const between = window.slice(0, implIdx);
      const otherImp = between.match(/\bIMP-\d+[A-Z]?\b/g)?.filter((id) => id !== impId) ?? [];
      if (otherImp.length === 0) {
        return true;
      }
    }
    searchFrom = idx + impId.length;
  }
  return false;
}

/**
 * True when `slice` is IMP-026C or a later numeric IMP (IMP-027+).
 * Used to keep pendingAcceptance on the oldest unresolved gate (IMP-026).
 * @param {string | null | undefined} slice
 */
export function isLaterThanImp026(slice) {
  if (slice === "IMP-026C") return true;
  const match = /^IMP-(\d+)[A-Z]?$/.exec(String(slice ?? ""));
  if (!match) return false;
  return Number(match[1]) >= 27;
}

/**
 * GTM-R15–R23 narrow founder exception: IMP-026C may be the current product slice while
 * IMP-026 remains IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE with deferred public HTTPS
 * webhook debt. GTM-R16 requires IMP-026C ARCHITECTURE_LOCKED. GTM-R17 may promote IMP-026C to
 * IMPLEMENTATION_IN_PROGRESS under explicit founder implementation authorization. GTM-R18 may
 * promote IMP-026C to IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE behind oldest pending
 * acceptance IMP-026. GTM-R19 may set currentProductSlice=IMP-027 with ARCHITECTURE_IN_PROGRESS
 * only (architecture not locked; implementation not authorized) while IMP-026 and IMP-026C
 * remain unaccepted. GTM-R20 may promote IMP-027 to ARCHITECTURE_LOCKED with implementation
 * still NOT_AUTHORIZED behind the same oldest pending gate. GTM-R21 may promote IMP-027 to
 * IMPLEMENTATION_IN_PROGRESS under explicit founder implementation authorization, with
 * architecture remaining LOCKED, behind the same oldest pending gate. GTM-R22 may promote
 * IMP-027 to IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE behind the same oldest pending gate
 * after complete implementation evidence and independent implementation review PASS. GTM-R23 may
 * set currentProductSlice=IMP-028 with ARCHITECTURE_IN_PROGRESS only (architecture not locked;
 * implementation not authorized) while IMP-026, IMP-026C, and IMP-027 remain unaccepted.
 * GTM-R24 may promote IMP-028 to ARCHITECTURE_LOCKED with implementation still NOT_AUTHORIZED
 * behind the same oldest pending gate. GTM-R25 may authorize IMP-028 implementation
 * (IMP-028_IMPLEMENTATION_AUTHORIZED: YES) while architecture remains LOCKED and implementation
 * remains NOT_STARTED (IMP-028_IMPLEMENTATION_STARTED: NO) behind the same oldest pending gate.
 * GTM-R25 authorization does not auto-start implementation. GTM-R26 may promote IMP-028 to
 * IMPLEMENTATION_IN_PROGRESS (IMP-028_IMPLEMENTATION_STARTED: YES) under that authorization
 * behind the same oldest pending gate.
 * pendingAcceptance identifies the oldest unresolved formal
 * acceptance gate; it does not mean a later authorized slice remains in progress. Does not
 * legalize arbitrary simultaneous active slices, predecessor formal acceptance, automatic IMP-028
 * complete/acceptance, or automatic IMP-029 activation.
 *
 * @param {{
 *   acceptedThrough: string,
 *   currentProductSlice: string,
 *   pendingAcceptance: string | null | undefined,
 *   imp026Implementation: string,
 *   imp026Accepted: boolean,
 *   deferredExternalWebhookGate: string,
 *   deferredExternalWebhookSatisfied: boolean,
 *   imp026cLifecycle: string,
 *   imp026cImplementationAuthorized: boolean,
 *   imp026cAccepted?: boolean,
 *   imp027Lifecycle?: string,
 *   imp027ImplementationAuthorized?: boolean,
 *   imp027Accepted?: boolean,
 *   imp027CapabilityArtifactLocked?: boolean,
 *   imp027IndependentImplementationReview?: string,
 *   imp028Lifecycle?: string,
 *   imp028ImplementationAuthorized?: boolean,
 *   imp028ArchitectureLocked?: boolean,
 *   imp028CapabilityArtifactLocked?: boolean,
 *   imp028Accepted?: boolean,
 *   imp028ImplementationStarted?: boolean,
 *   imp028aImplementationAuthorized?: boolean,
 *   imp028aImplementationStarted?: boolean,
 *   imp028aArchitectureLocked?: boolean,
 *   imp028aCapabilityArtifactLocked?: boolean,
 *   imp028aAccepted?: boolean,
 *   imp028bImplementationAuthorized?: boolean,
 *   imp028bImplementationStarted?: boolean,
 *   imp028bArchitectureLocked?: boolean,
 *   imp028bAccepted?: boolean,
 * }} position
 * @returns {{ ok: true, kind: "aligned" | "imp028b_complete_and_accepted" | "imp028b_canonical_activation" | "imp028b_implementation_authorized" | "imp028a_canonical_activation" | "imp028a_implementation_authorized" | "imp028a_implementation_in_progress" | "imp028a_implementation_complete_pending_acceptance" | "imp028a_complete_and_accepted" | "imp026_deferred_external_gate" | "imp026_deferred_external_gate_impl_authorized" | "imp026_deferred_external_gate_impl_complete" | "imp026_deferred_external_gate_imp027_architecture" | "imp026_deferred_external_gate_imp027_architecture_locked" | "imp026_deferred_external_gate_imp027_implementation" | "imp026_deferred_external_gate_imp027_implementation_complete" | "imp026_deferred_external_gate_imp028_architecture" | "imp026_deferred_external_gate_imp028_architecture_locked" | "imp026_deferred_external_gate_imp028_implementation_authorized" | "imp026_deferred_external_gate_imp028_implementation" | "imp028c_authorized_not_started" | "imp028c_implementation_started" | "imp028c_implementation_complete_pending_acceptance" } | { ok: false, code: string, message: string }}
 */
export function evaluatePendingAcceptanceSplit(position) {
  const pending = position.pendingAcceptance ?? "NONE";
  const current = position.currentProductSlice;
  const imp028cImplementationAuthorized = position.imp028cImplementationAuthorized === true;
  const imp028cImplementationStarted = position.imp028cImplementationStarted === true;
  const imp028cImplementationComplete = position.imp028cImplementationComplete === true;
  const imp028cArchitectureLocked = position.imp028cArchitectureLocked === true;

  if (position.acceptedThrough === "IMP-028C" && position.imp028cAccepted !== true) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "acceptedThrough cannot advance to IMP-028C before IMP-028C is formally accepted (IMP-028C_ACCEPTED: YES)",
    };
  }
  const imp027Lifecycle = position.imp027Lifecycle ?? "UNKNOWN";
  const imp027ImplementationAuthorized = position.imp027ImplementationAuthorized === true;
  const imp028Lifecycle = position.imp028Lifecycle ?? "UNKNOWN";
  const imp028ImplementationAuthorized = position.imp028ImplementationAuthorized === true;
  const imp028ArchitectureLocked = position.imp028ArchitectureLocked === true;
  const imp028ImplementationStarted = position.imp028ImplementationStarted === true;
  const imp028aImplementationAuthorized = position.imp028aImplementationAuthorized === true;
  const imp028aImplementationStarted = position.imp028aImplementationStarted === true;
  const imp028aArchitectureLocked = position.imp028aArchitectureLocked === true;
  const imp028aAccepted = position.imp028aAccepted === true;
  const imp028bImplementationAuthorized = position.imp028bImplementationAuthorized === true;
  const imp028bImplementationStarted = position.imp028bImplementationStarted === true;
  const imp028bImplementationComplete = position.imp028bImplementationComplete === true;
  const imp028bArchitectureLocked = position.imp028bArchitectureLocked === true;
  const imp028bAccepted = position.imp028bAccepted === true;

  if (position.acceptedThrough === "IMP-028B") {
    const imp028bAcceptedEvidence =
      position.imp026Accepted === true &&
      position.imp026cAccepted === true &&
      position.imp027Accepted === true &&
      position.imp028Accepted === true &&
      imp028aAccepted &&
      imp028bImplementationAuthorized &&
      imp028bImplementationStarted &&
      imp028bImplementationComplete &&
      imp028bArchitectureLocked &&
      imp028bAccepted;
    const imp028bFullyAccepted = pending === "NONE" && imp028bAcceptedEvidence;

    if (current === "NONE" && imp028bFullyAccepted) {
      return { ok: true, kind: "imp028b_complete_and_accepted" };
    }
    if (current === "IMP-028C" && imp028bAcceptedEvidence) {
      if (!position.imp028cCanonicallyAssigned) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "currentProductSlice=IMP-028C but IMP-028C is not canonically assigned in governance",
        };
      }
      if (!imp028cArchitectureLocked) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "currentProductSlice=IMP-028C but IMP-028C architecture is not locked",
        };
      }
      if (!imp028cImplementationAuthorized) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "currentProductSlice=IMP-028C but IMP-028C implementation is not authorized",
        };
      }
      if (position.imp029ImplementationAuthorized === true) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message:
            "currentProductSlice=IMP-028C requires IMP-029 to remain NOT_AUTHORIZED (IMP-029_IMPLEMENTATION_AUTHORIZED: NO)",
        };
      }
      if (position.imp029Started === true) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message:
            "currentProductSlice=IMP-028C requires IMP-029 to remain NOT_STARTED (IMP-029_STARTED: NO)",
        };
      }
      if (position.imp028cAccepted) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "IMP-028C cannot be accepted while acceptedThrough remains IMP-028B",
        };
      }
      if (pending === "IMP-028C") {
        if (!imp028cImplementationStarted) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP-028C_IMPLEMENTATION_STARTED: YES",
          };
        }
        if (!imp028cImplementationComplete) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "pendingAcceptance=IMP-028C requires IMP-028C_IMPLEMENTATION_COMPLETE: YES",
          };
        }
        return { ok: true, kind: "imp028c_implementation_complete_pending_acceptance" };
      }
      if (pending === "NONE") {
        if (imp028cImplementationComplete) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message: "IMP-028C implementation complete requires pendingAcceptance = IMP-028C",
          };
        }
        if (imp028cImplementationStarted) {
          return { ok: true, kind: "imp028c_implementation_started" };
        }
        return { ok: true, kind: "imp028c_authorized_not_started" };
      }
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          `acceptedThrough=IMP-028B with currentProductSlice=IMP-028C requires pendingAcceptance=NONE or IMP-028C, got ${JSON.stringify(pending)}`,
      };
    }
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "IMP-028B acceptance requires currentProductSlice=NONE or IMP-028C with complete accepted IMP-028B evidence",
    };
  }

  if (position.acceptedThrough === "IMP-028A") {
    if (pending === "IMP-028A") {
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          "pendingAcceptance cannot remain IMP-028A after acceptedThrough advances to IMP-028A",
      };
    }
    if (
      current === "IMP-028B" &&
      position.imp026Accepted === true &&
      position.imp026cAccepted === true &&
      position.imp027Accepted === true &&
      position.imp028Accepted === true &&
      imp028aAccepted
    ) {
      if (imp028bImplementationAuthorized && !imp028bArchitectureLocked) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "IMP-028B implementation cannot be authorized unless architecture is locked",
        };
      }
      if (imp028bImplementationStarted && !imp028bImplementationAuthorized) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "IMP-028B implementation cannot start before founder implementation authorization",
        };
      }
      if (imp028bAccepted) {
        return {
          ok: false,
          code: "PENDING_ACCEPTANCE_SPLIT",
          message: "IMP-028B cannot be marked accepted while acceptedThrough remains IMP-028A",
        };
      }
      if (pending === "IMP-028B") {
        if (!imp028bImplementationAuthorized || !imp028bArchitectureLocked) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028B IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires authorization and locked architecture",
          };
        }
        if (!imp028bImplementationStarted) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028B IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP-028B_IMPLEMENTATION_STARTED: YES",
          };
        }
        if (!imp028bImplementationComplete) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028B IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP-028B_IMPLEMENTATION_COMPLETE: YES",
          };
        }
        return { ok: true, kind: "imp028b_implementation_complete_pending_acceptance" };
      }
      if (pending === "NONE") {
        if (imp028bImplementationStarted) {
          if (imp028bImplementationComplete) {
            return {
              ok: false,
              code: "PENDING_ACCEPTANCE_SPLIT",
              message:
                "IMP-028B implementation complete requires pendingAcceptance = IMP-028B",
            };
          }
          if (!imp028bImplementationAuthorized || !imp028bArchitectureLocked) {
            return {
              ok: false,
              code: "PENDING_ACCEPTANCE_SPLIT",
              message:
                "IMP-028B implementation cannot start before founder implementation authorization",
            };
          }
          return { ok: true, kind: "imp028b_implementation_in_progress" };
        }
        if (imp028bImplementationAuthorized) {
          if (position.imp028bCapabilityArtifactLocked === false) {
            return {
              ok: false,
              code: "PENDING_ACCEPTANCE_SPLIT",
              message: "IMP-028B implementation authorization requires locked capability architecture",
            };
          }
          return { ok: true, kind: "imp028b_implementation_authorized" };
        }
        return { ok: true, kind: "imp028b_canonical_activation" };
      }
    }
    if (
      current === "NONE" &&
      pending === "NONE" &&
      position.imp026Accepted === true &&
      position.imp026cAccepted === true &&
      position.imp027Accepted === true &&
      position.imp028Accepted === true &&
      imp028aAccepted
    ) {
      return { ok: true, kind: "imp028a_complete_and_accepted" };
    }
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "After IMP-028A acceptance, currentProductSlice must be NONE or IMP-028B with IMP-028A_ACCEPTED: YES",
    };
  }

  if (position.imp026cAccepted === true && position.imp026Accepted === false) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-026C cannot be accepted while IMP-026 remains unaccepted",
    };
  }

  if (position.imp027Accepted === true && position.imp026Accepted === false) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-027 cannot be accepted while IMP-026 remains unaccepted",
    };
  }

  if (
    position.imp027Accepted === true &&
    position.imp026cAccepted === false &&
    !(
      position.acceptedThrough === "IMP-027" &&
      pending === "IMP-026C" &&
      current === "IMP-028"
    )
  ) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-027 cannot be accepted while IMP-026C remains unaccepted",
    };
  }

  if (position.imp028Accepted === true && position.imp026Accepted === false) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-028 cannot be accepted while IMP-026 remains unaccepted",
    };
  }

  if (
    position.imp026Accepted === true &&
    position.deferredExternalWebhookGate === "DEFERRED_NOT_SATISFIED"
  ) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "IMP-026 cannot be marked accepted while IMP-026_EXTERNAL_WEBHOOK_GATE remains DEFERRED_NOT_SATISFIED",
    };
  }

  if (position.imp026Accepted === false && isLaterThanImp026(position.acceptedThrough)) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "acceptedThrough cannot skip unresolved IMP-026",
    };
  }

  if (position.imp026Accepted === false && isLaterThanImp026(current) && pending !== "IMP-026") {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "pendingAcceptance cannot skip IMP-026; pendingAcceptance identifies the oldest unresolved acceptance gate",
    };
  }

  if (
    current === "IMP-027" &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
  ) {
    if (position.imp027CapabilityArtifactLocked === false) {
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          "IMP-027 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires locked capability artifact",
      };
    }
    if (
      position.imp027IndependentImplementationReview !== undefined &&
      position.imp027IndependentImplementationReview !== "PASS"
    ) {
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          "IMP-027 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
      };
    }
  }

  if (current === "IMP-028" && imp028ImplementationAuthorized && !imp028ArchitectureLocked) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message:
        "IMP-028 implementation cannot be authorized unless architecture is locked",
    };
  }

  if (
    current === "IMP-028" &&
    (imp028Lifecycle === "IMPLEMENTATION_IN_PROGRESS" ||
      imp028Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" ||
      imp028ImplementationStarted) &&
    !imp028ImplementationAuthorized
  ) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-028 implementation cannot start before founder implementation authorization",
    };
  }

  if (
    current === "IMP-028A" &&
    imp028aImplementationAuthorized &&
    !imp028aArchitectureLocked
  ) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-028A implementation cannot be authorized unless architecture is locked",
    };
  }

  if (
    current === "IMP-028A" &&
    imp028aImplementationStarted &&
    !imp028aImplementationAuthorized
  ) {
    return {
      ok: false,
      code: "PENDING_ACCEPTANCE_SPLIT",
      message: "IMP-028A implementation cannot start before founder implementation authorization",
    };
  }

  if (pending === "NONE" || pending === current) {
    if (
      current === "IMP-026C" &&
      pending === "NONE" &&
      position.imp026Accepted === false
    ) {
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          "pendingAcceptance=NONE cannot hide IMP-026 acceptance debt while currentProductSlice=IMP-026C",
      };
    }
    if (
      position.acceptedThrough === "IMP-028" &&
      current === "IMP-028A" &&
      position.imp026Accepted === true &&
      position.imp026cAccepted === true &&
      position.imp027Accepted === true &&
      position.imp028Accepted === true
    ) {
      if (pending === "IMP-028A") {
        if (!imp028aImplementationAuthorized || !imp028aArchitectureLocked) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028A IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires authorization and locked architecture",
          };
        }
        if (!imp028aImplementationStarted) {
          return {
            ok: false,
            code: "PENDING_ACCEPTANCE_SPLIT",
            message:
              "IMP-028A IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP-028A_IMPLEMENTATION_STARTED: YES",
          };
        }
        return { ok: true, kind: "imp028a_implementation_complete_pending_acceptance" };
      }
      if (pending === "NONE") {
        if (imp028aImplementationStarted) {
          if (!imp028aImplementationAuthorized || !imp028aArchitectureLocked) {
            return {
              ok: false,
              code: "PENDING_ACCEPTANCE_SPLIT",
              message:
                "IMP-028A implementation cannot start before founder implementation authorization",
            };
          }
          return { ok: true, kind: "imp028a_implementation_in_progress" };
        }
        if (imp028aImplementationAuthorized) {
          if (position.imp028aCapabilityArtifactLocked === false) {
            return {
              ok: false,
              code: "PENDING_ACCEPTANCE_SPLIT",
              message:
                "IMP-028A implementation authorization requires locked capability architecture",
            };
          }
          return { ok: true, kind: "imp028a_implementation_authorized" };
        }
        return { ok: true, kind: "imp028a_canonical_activation" };
      }
    }
    if (
      position.imp026Accepted === true &&
      pending === "NONE" &&
      isLaterThanImp026(current)
    ) {
      return {
        ok: false,
        code: "PENDING_ACCEPTANCE_SPLIT",
        message:
          "pendingAcceptance=NONE cannot hide unresolved acceptance while currentProductSlice is later than IMP-026",
      };
    }
    return { ok: true, kind: "aligned" };
  }

  const imp026AcceptedCommon =
    position.acceptedThrough === "IMP-026" &&
    pending === "IMP-027" &&
    position.imp026Implementation === "COMPLETE_AND_ACCEPTED" &&
    position.imp026Accepted === true &&
    position.deferredExternalWebhookGate === "SATISFIED" &&
    position.deferredExternalWebhookSatisfied === true;

  const imp026AcceptedImp028Implementation =
    imp026AcceptedCommon &&
    current === "IMP-028" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    imp028Lifecycle === "IMPLEMENTATION_IN_PROGRESS" &&
    imp028ImplementationAuthorized &&
    imp028ArchitectureLocked &&
    imp028ImplementationStarted &&
    position.imp028Accepted !== true &&
    position.imp028CapabilityArtifactLocked !== false;

  if (imp026AcceptedImp028Implementation) {
    return {
      ok: true,
      kind: "imp026_accepted_pending_imp027_imp028_implementation",
    };
  }

  const imp027AcceptedImp028Implementation =
    position.acceptedThrough === "IMP-027" &&
    pending === "IMP-026C" &&
    current === "IMP-028" &&
    position.imp026Implementation === "COMPLETE_AND_ACCEPTED" &&
    position.imp026Accepted === true &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "COMPLETE_AND_ACCEPTED" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted === true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    imp028Lifecycle === "IMPLEMENTATION_IN_PROGRESS" &&
    imp028ImplementationAuthorized &&
    imp028ArchitectureLocked &&
    imp028ImplementationStarted &&
    position.imp028Accepted !== true &&
    position.imp028CapabilityArtifactLocked !== false;

  if (imp027AcceptedImp028Implementation) {
    return {
      ok: true,
      kind: "imp027_accepted_pending_imp026c_imp028_implementation",
    };
  }

  const deferredGateCommon =
    position.acceptedThrough === "IMP-025" &&
    pending === "IMP-026" &&
    position.imp026Implementation === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026Accepted === false &&
    position.deferredExternalWebhookGate === "DEFERRED_NOT_SATISFIED" &&
    position.deferredExternalWebhookSatisfied === false;

  const deferredGateBase =
    deferredGateCommon &&
    current === "IMP-026C";

  const architectureLockedNotAuthorized =
    deferredGateBase &&
    position.imp026cLifecycle === "ARCHITECTURE_LOCKED" &&
    position.imp026cImplementationAuthorized === false;

  const implementationInProgressAuthorized =
    deferredGateBase &&
    position.imp026cLifecycle === "IMPLEMENTATION_IN_PROGRESS" &&
    position.imp026cImplementationAuthorized === true;

  const implementationCompletePendingAcceptance =
    deferredGateBase &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false;

  const imp027ArchitectureInProgress =
    deferredGateCommon &&
    current === "IMP-027" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "ARCHITECTURE_IN_PROGRESS" &&
    !imp027ImplementationAuthorized;

  const imp027ArchitectureLocked =
    deferredGateCommon &&
    current === "IMP-027" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "ARCHITECTURE_LOCKED" &&
    !imp027ImplementationAuthorized;

  const imp027ImplementationInProgress =
    deferredGateCommon &&
    current === "IMP-027" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_IN_PROGRESS" &&
    imp027ImplementationAuthorized;

  const imp027ImplementationComplete =
    deferredGateCommon &&
    current === "IMP-027" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS");

  const imp028ArchitectureInProgress =
    deferredGateCommon &&
    current === "IMP-028" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    imp028Lifecycle === "ARCHITECTURE_IN_PROGRESS" &&
    !imp028ImplementationAuthorized &&
    !imp028ArchitectureLocked &&
    position.imp028Accepted !== true;

  const imp028ArchitectureLockedKind =
    deferredGateCommon &&
    current === "IMP-028" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    imp028Lifecycle === "ARCHITECTURE_LOCKED" &&
    !imp028ImplementationAuthorized &&
    imp028ArchitectureLocked &&
    position.imp028Accepted !== true &&
    position.imp028CapabilityArtifactLocked !== false;

  const imp028ImplementationAuthorizedKind =
    deferredGateCommon &&
    current === "IMP-028" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    (imp028Lifecycle === "ARCHITECTURE_LOCKED" ||
      imp028Lifecycle === "IMPLEMENTATION_AUTHORIZED") &&
    imp028ImplementationAuthorized &&
    imp028ArchitectureLocked &&
    !imp028ImplementationStarted &&
    imp028Lifecycle !== "IMPLEMENTATION_IN_PROGRESS" &&
    imp028Lifecycle !== "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp028Accepted !== true &&
    position.imp028CapabilityArtifactLocked !== false;

  const imp028ImplementationInProgressKind =
    deferredGateCommon &&
    current === "IMP-028" &&
    position.imp026cLifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    position.imp026cImplementationAuthorized === true &&
    position.imp026cAccepted === false &&
    imp027Lifecycle === "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" &&
    imp027ImplementationAuthorized &&
    position.imp027Accepted !== true &&
    position.imp027CapabilityArtifactLocked !== false &&
    (position.imp027IndependentImplementationReview === undefined ||
      position.imp027IndependentImplementationReview === "PASS") &&
    imp028Lifecycle === "IMPLEMENTATION_IN_PROGRESS" &&
    imp028ImplementationAuthorized &&
    imp028ArchitectureLocked &&
    imp028ImplementationStarted &&
    position.imp028Accepted !== true &&
    position.imp028CapabilityArtifactLocked !== false;

  if (architectureLockedNotAuthorized) {
    return { ok: true, kind: "imp026_deferred_external_gate" };
  }
  if (implementationInProgressAuthorized) {
    return { ok: true, kind: "imp026_deferred_external_gate_impl_authorized" };
  }
  if (implementationCompletePendingAcceptance) {
    return { ok: true, kind: "imp026_deferred_external_gate_impl_complete" };
  }
  if (imp028ImplementationInProgressKind) {
    return {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_implementation",
    };
  }
  if (imp028ImplementationAuthorizedKind) {
    return {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_implementation_authorized",
    };
  }
  if (imp028ArchitectureLockedKind) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp028_architecture_locked" };
  }
  if (imp028ArchitectureInProgress) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp028_architecture" };
  }
  if (imp027ImplementationComplete) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp027_implementation_complete" };
  }
  if (imp027ImplementationInProgress) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp027_implementation" };
  }
  if (imp027ArchitectureLocked) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp027_architecture_locked" };
  }
  if (imp027ArchitectureInProgress) {
    return { ok: true, kind: "imp026_deferred_external_gate_imp027_architecture" };
  }

  return {
    ok: false,
    code: "PENDING_ACCEPTANCE_SPLIT",
    message:
      `pendingAcceptance=${JSON.stringify(pending)} is not currentProductSlice=${JSON.stringify(current)} and is not the documented IMP-026 deferred-external-gate exception`,
  };
}

/**
 * @param {{ text: string, meta: Record<string, unknown> } | null} state
 * @param {{ text: string, meta: Record<string, unknown> } | null} roadmap
 */
export function extractPendingAcceptanceSplitPosition(state, roadmap) {
  const blob = `${state?.text ?? ""}\n${roadmap?.text ?? ""}`;
  const hasSatisfiedGate = /IMP-026_EXTERNAL_WEBHOOK_GATE:\s*SATISFIED/.test(blob);
  const hasDeferredGate =
    !hasSatisfiedGate && /IMP-026_EXTERNAL_WEBHOOK_GATE:\s*DEFERRED_NOT_SATISFIED/.test(blob);
  const imp026Implementation = /IMP-026 implementation:[\s\S]{0,40}COMPLETE_AND_ACCEPTED/.test(
    state?.text ?? "",
  )
    ? "COMPLETE_AND_ACCEPTED"
    : /IMP-026 implementation:[\s\S]{0,40}IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(
          state?.text ?? "",
        )
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : "UNKNOWN";
  return {
    acceptedThrough: String(state?.meta.acceptedThrough ?? ""),
    currentProductSlice: String(state?.meta.currentProductSlice ?? ""),
    pendingAcceptance: String(state?.meta.pendingAcceptance ?? "NONE"),
    imp026Implementation,
    imp026Accepted: /IMP-026_ACCEPTED:\s*YES/.test(blob),
    deferredExternalWebhookGate: hasDeferredGate
      ? "DEFERRED_NOT_SATISFIED"
      : hasSatisfiedGate
        ? "SATISFIED"
        : "UNKNOWN",
    deferredExternalWebhookSatisfied: hasSatisfiedGate,
    imp026cLifecycle: /IMP-026C:\s*COMPLETE_AND_ACCEPTED/.test(blob)
      ? "COMPLETE_AND_ACCEPTED"
      : /IMP-026C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : /IMP-026C:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob)
        ? "IMPLEMENTATION_IN_PROGRESS"
        : /IMP-026C:\s*ARCHITECTURE_LOCKED/.test(blob) ||
            /IMP-026C architecture:\s*ARCHITECTURE_LOCKED/.test(blob)
          ? "ARCHITECTURE_LOCKED"
          : /IMP-026C:\s*ARCHITECTURE_IN_PROGRESS/.test(blob)
            ? "ARCHITECTURE_IN_PROGRESS"
            : "UNKNOWN",
    imp026cImplementationAuthorized: /IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob),
    imp026cAccepted: /IMP-026C_ACCEPTED:\s*YES/.test(blob),
    imp027Lifecycle: /IMP-027:\s*COMPLETE_AND_ACCEPTED/.test(blob)
      ? "COMPLETE_AND_ACCEPTED"
      : /IMP-027:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob)
        ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
        : /IMP-027:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob)
        ? "IMPLEMENTATION_IN_PROGRESS"
        : /IMP-027:\s*ARCHITECTURE_LOCKED/.test(blob) ||
            /IMP-027 architecture:\s*ARCHITECTURE_LOCKED/.test(blob)
          ? "ARCHITECTURE_LOCKED"
          : /IMP-027:\s*ARCHITECTURE_IN_PROGRESS/.test(blob)
            ? "ARCHITECTURE_IN_PROGRESS"
            : "UNKNOWN",
    imp027ImplementationAuthorized:
      /IMP-027_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob) ||
      /IMP-027_IMPLEMENTATION:\s*(?!NOT_)AUTHORIZED\b/.test(blob) ||
      /IMP-027 implementation:\s*(?!NOT_)AUTHORIZED\b/.test(blob),
    imp027Accepted: /IMP-027_ACCEPTED:\s*YES/.test(blob),
    imp027CapabilityArtifactLocked: (() => {
      const artifact = resolveExactRelativeFile(
        "docs/platform/capabilities/IMP-027-refund-foundation.md",
      );
      if (!artifact) return false;
      return /ARCHITECTURE_LOCKED/.test(readFileSync(artifact, "utf8"));
    })(),
    imp027IndependentImplementationReview: /IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(
      blob,
    )
      ? "PASS"
      : /IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*\S+/.test(blob)
        ? "NOT_PASS"
        : undefined,
    imp028Lifecycle: /IMP-028:\s*COMPLETE_AND_ACCEPTED/.test(blob)
      ? "COMPLETE_AND_ACCEPTED"
      : /IMP-028:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : /IMP-028:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob)
        ? "IMPLEMENTATION_IN_PROGRESS"
        : /IMP-028:\s*IMPLEMENTATION_AUTHORIZED\b/.test(blob)
          ? "IMPLEMENTATION_AUTHORIZED"
          : /IMP-028:\s*ARCHITECTURE_LOCKED/.test(blob) ||
              /IMP-028 architecture:\s*ARCHITECTURE_LOCKED/.test(blob)
            ? "ARCHITECTURE_LOCKED"
            : /IMP-028:\s*ARCHITECTURE_IN_PROGRESS/.test(blob)
              ? "ARCHITECTURE_IN_PROGRESS"
              : "UNKNOWN",
    imp028ImplementationAuthorized:
      /IMP-028_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob) ||
      /IMP-028_IMPLEMENTATION:\s*(?!NOT_)AUTHORIZED\b/.test(blob) ||
      /IMP-028 implementation:\s*(?!NOT_)AUTHORIZED\b/.test(blob),
    imp028ImplementationStarted:
      /IMP-028_IMPLEMENTATION_STARTED:\s*YES/.test(blob) ||
      /IMP-028:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob) ||
      /IMP-028:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob) ||
      /IMP-028_IMPLEMENTATION_COMPLETE:\s*YES/.test(blob),
    imp028ArchitectureLocked:
      /IMP-028_ARCHITECTURE_LOCKED:\s*YES/.test(blob) ||
      /IMP-028_ARCHITECTURE:\s*LOCKED\b/.test(blob) ||
      /IMP-028 architecture:\s*ARCHITECTURE_LOCKED/.test(blob),
    imp028CapabilityArtifactLocked: (() => {
      const artifact = resolveExactRelativeFile(
        "docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md",
      );
      if (!artifact) return false;
      return /ARCHITECTURE_LOCKED/.test(readFileSync(artifact, "utf8"));
    })(),
    imp028Accepted: /IMP-028_ACCEPTED:\s*YES/.test(blob),
    imp028aImplementationAuthorized: /IMP-028A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob),
    imp028aImplementationStarted: /IMP-028A_IMPLEMENTATION_STARTED:\s*YES/.test(blob),
    imp028aArchitectureLocked:
      /IMP-028A_ARCHITECTURE_LOCKED:\s*YES/.test(blob) ||
      /IMP-028A architecture:\s*ARCHITECTURE_LOCKED/.test(blob) ||
      /IMP-028A:\s*IMPLEMENTATION_AUTHORIZED/.test(blob),
    imp028aAccepted: /IMP-028A_ACCEPTED:\s*YES/.test(blob),
    imp028aCapabilityArtifactLocked: (() => {
      const artifact = resolveExactRelativeFile(
        "docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md",
      );
      if (!artifact) return false;
      return /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(readFileSync(artifact, "utf8"));
    })(),
    imp028bImplementationAuthorized: /IMP-028B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob),
    imp028bImplementationStarted: /IMP-028B_IMPLEMENTATION_STARTED:\s*YES/.test(blob),
    imp028bImplementationComplete: /IMP-028B_IMPLEMENTATION_COMPLETE:\s*YES/.test(blob),
    imp028bArchitectureLocked:
      /IMP-028B_ARCHITECTURE_LOCKED:\s*YES/.test(blob) ||
      /IMP-028B architecture:\s*ARCHITECTURE_LOCKED/.test(blob),
    imp028bAccepted: /IMP-028B_ACCEPTED:\s*YES/.test(blob),
    imp028bCapabilityArtifactLocked: (() => {
      const artifact = resolveExactRelativeFile(
        "docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md",
      );
      if (!artifact) return false;
      return /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(readFileSync(artifact, "utf8"));
    })(),
    imp028cImplementationAuthorized: /IMP-028C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob),
    imp028cImplementationStarted: /IMP-028C_IMPLEMENTATION_STARTED:\s*YES/.test(blob),
    imp028cImplementationComplete: /IMP-028C_IMPLEMENTATION_COMPLETE:\s*YES/.test(blob),
    imp029ImplementationAuthorized: /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob),
    imp029Started: /IMP-029_STARTED:\s*YES/.test(blob),
    imp028cArchitectureLocked:
      /IMP-028C_ARCHITECTURE_LOCKED:\s*YES/.test(blob) ||
      /IMP-028C architecture:\s*ARCHITECTURE_LOCKED/.test(blob),
    imp028cAccepted: /IMP-028C_ACCEPTED:\s*YES/.test(blob),
    imp028cCanonicallyAssigned: /IMP-028C/.test(blob) && (
      /currentProductSlice.*IMP-028C/.test(blob) ||
      /IMP-028C_IMPLEMENTATION_AUTHORIZED/.test(blob) ||
      /IMP-028C_ARCHITECTURE_LOCKED/.test(blob)
    ),
    imp028cCapabilityArtifactPresent: (() => {
      const artifact = resolveExactRelativeFile(
        "docs/platform/capabilities/IMP-028C-food-direct-customization.md",
      );
      return !!artifact;
    })(),
  };
}

/**
 * Confirm git tracks the exact relative pathname when a real HEAD exists.
 * @param {string} relativePath
 * @returns {"exact" | "missing" | "unavailable"}
 */
function gitTracksExactPath(relativePath) {
  const head = spawnSync("git", ["-C", projectRoot, "rev-parse", "--verify", "HEAD"], {
    encoding: "utf8",
  });
  if (head.error || head.status !== 0) return "unavailable";

  const result = spawnSync(
    "git",
    ["-C", projectRoot, "ls-files", "--full-name", "--", relativePath],
    { encoding: "utf8" },
  );
  if (result.error || result.status !== 0) return "unavailable";
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines.includes(relativePath) ? "exact" : "missing";
}

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null}
 */
function parseGovernanceMeta(text) {
  const match = text.match(/<!--\s*governance-meta\s*([\s\S]*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * @param {string} relativePath
 * @param {string} expectedAuthority
 * @param {string[]} requiredKeys
 * @param {{ exact?: boolean }} [options]
 */
function loadCanonical(relativePath, expectedAuthority, requiredKeys, options = {}) {
  const abs = options.exact ? resolveExactRelativeFile(relativePath) : resolvePlatformDoc(relativePath);
  if (!abs || !existsSync(abs)) {
    if (options.exact && !resolveExactRelativeFile(relativePath)) {
      const dir = path.join(projectRoot, path.dirname(relativePath));
      let hint = "";
      try {
        const base = path.basename(relativePath);
        const ci = readdirSync(dir).find((n) => n.toLowerCase() === base.toLowerCase());
        if (ci && ci !== base) {
          fail(
            "CANONICAL_PATH_CASE",
            `Expected exact path ${relativePath} but directory entry is ${path.posix.join(path.dirname(relativePath).replace(/\\/g, "/"), ci)}`,
          );
          return null;
        }
      } catch {
        /* missing dir handled below */
      }
      fail("CANONICAL_MISSING", `Missing exact canonical document: ${relativePath}${hint}`);
      return null;
    }
    fail("CANONICAL_MISSING", `Missing canonical document: ${relativePath}`);
    return null;
  }
  const text = readFileSync(abs, "utf8");
  const meta = parseGovernanceMeta(text);
  if (!meta) {
    fail("META_MISSING", `${relativePath}: missing or unparseable governance-meta block`);
    return null;
  }
  if (meta.status !== "CURRENT") {
    fail("META_STATUS", `${relativePath}: status must be CURRENT (got ${JSON.stringify(meta.status)})`);
  }
  if (meta.authority !== expectedAuthority) {
    fail(
      "META_AUTHORITY",
      `${relativePath}: authority must be ${expectedAuthority} (got ${JSON.stringify(meta.authority)})`,
    );
  }
  for (const key of requiredKeys) {
    if (!(key in meta)) {
      fail("META_KEY", `${relativePath}: missing metadata key ${key}`);
    }
  }
  note(`${relativePath}: governance-meta OK`);
  return { abs, text, meta };
}

function nullishEqual(a, b) {
  const norm = (v) => (v === undefined || v === null || v === "null" ? null : v);
  return norm(a) === norm(b);
}

function checkRoadmapState(roadmap, state) {
  if (!roadmap || !state) return;
  const pairs = [
    ["acceptedThrough", roadmap.meta.acceptedThrough, state.meta.acceptedThrough],
    ["currentProductSlice", roadmap.meta.currentProductSlice, state.meta.currentProductSlice],
    ["nextProductSlice", roadmap.meta.nextProductSlice, state.meta.nextProductSlice],
  ];
  for (const [name, a, b] of pairs) {
    if (!nullishEqual(a, b)) {
      fail("ROADMAP_STATE_MISMATCH", `${name}: ROADMAP=${JSON.stringify(a)} STATE=${JSON.stringify(b)}`);
    } else {
      note(`ROADMAP↔STATE ${name} aligned (${JSON.stringify(a)})`);
    }
  }

  // Slice ledger uniqueness from CURRENT ROADMAP tables only (exclude historical notice).
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const ledgerText = `${acceptedSection}\n${futureSection}`;
  const idName = new Map();
  const rowRe = new RegExp(LEDGER_ROW_IMP_RE.source, LEDGER_ROW_IMP_RE.flags);
  let m;
  while ((m = rowRe.exec(ledgerText)) !== null) {
    const id = m[1];
    const name = m[2].trim();
    if (name.toLowerCase() === "capability") continue;
    if (!FORMAL_LEDGER_IMP_ID_RE.test(id)) {
      fail("IMP_LEDGER_GRAMMAR", `Ledger row id ${id} does not match IMP-\\d+[A-Z]?`);
      continue;
    }
    if (idName.has(id) && idName.get(id) !== name) {
      fail("IMP_IDENTITY_COLLISION", `${id} maps to both "${idName.get(id)}" and "${name}"`);
    }
    idName.set(id, name);
  }
  if (!idName.has(String(roadmap.meta.acceptedThrough))) {
    fail("ACCEPTED_THROUGH_MISSING", `acceptedThrough ${roadmap.meta.acceptedThrough} not in ROADMAP ledger`);
  } else {
    note(`acceptedThrough ${roadmap.meta.acceptedThrough} present in ledger`);
  }
  if (String(roadmap.meta.currentProductSlice) === "NONE") {
    note("currentProductSlice NONE (no active product slice)");
  } else if (!idName.has(String(roadmap.meta.currentProductSlice))) {
    fail(
      "CURRENT_SLICE_MISSING",
      `currentProductSlice ${roadmap.meta.currentProductSlice} not in ROADMAP ledger`,
    );
  } else {
    note(`currentProductSlice ${roadmap.meta.currentProductSlice} present in ledger`);
  }
  if (!idName.has(String(roadmap.meta.nextProductSlice))) {
    fail("NEXT_SLICE_MISSING", `nextProductSlice ${roadmap.meta.nextProductSlice} not in ROADMAP ledger`);
  } else {
    note(`nextProductSlice ${roadmap.meta.nextProductSlice} present in ledger`);
  }
  if (!idName.has(String(roadmap.meta.gtmBoundary))) {
    fail("GTM_BOUNDARY_MISSING", `gtmBoundary ${roadmap.meta.gtmBoundary} not in ROADMAP ledger`);
  } else {
    note(`gtmBoundary ${roadmap.meta.gtmBoundary} present in ledger`);
  }

  // Hard identity checks
  const requiredMeanings = {
    "IMP-021": "Checkout",
    "IMP-022": "Payment",
    "IMP-023": "Order",
    "IMP-024": "Customer Ordering Transport",
    "IMP-025": "Customer Ordering UX",
    "IMP-026": "Razorpay",
    "IMP-026C": "Pilot Customer-Commerce UX",
    "IMP-027": "Refund",
    "IMP-028": "Invoice",
    "IMP-028A": "Food Direct UX Foundation",
    "IMP-028B": "Customer Menu Projection",
    "IMP-035": "Initial Administration",
    "IMP-040": "Launch Validation",
  };
  for (const [id, needle] of Object.entries(requiredMeanings)) {
    const name = idName.get(id) || "";
    if (!name.includes(needle)) {
      fail("IMP_MEANING", `${id} expected to include "${needle}", got "${name}"`);
    } else {
      note(`${id} meaning OK (${name})`);
    }
  }

  const roadmapPending = roadmap.text.match(/## 2\. Current Position[\s\S]*?Pending Acceptance:\s+(\S+)/)?.[1];
  if (!roadmapPending) {
    fail("ROADMAP_PENDING_MISSING", "ROADMAP current position must state Pending Acceptance");
    return;
  }
  const alignment = evaluateLifecycleAuthorityAlignment(
    { ...roadmap.meta, pendingAcceptance: roadmapPending },
    state.meta,
  );
  if (!alignment.ok) {
    fail(alignment.code, alignment.message);
  } else {
    note("ROADMAP↔STATE lifecycle metadata aligned");
  }

  const currentId = String(state.meta.currentProductSlice);
  const currentImplementationComplete = new RegExp(
    `^${currentId}_IMPLEMENTATION_COMPLETE:\\s*(YES|NO)\\s*$`,
    "m",
  ).exec(state.text)?.[1];
  const lifecycleFacts = [...idName.keys()].map((id) => ({
    id,
    accepted: new RegExp(`${id}_ACCEPTED:\\s*YES|${id}:\\s*COMPLETE_AND_ACCEPTED`).test(
      `${roadmap.text}\n${state.text}`,
    ),
    implementationComplete:
      id === currentId && currentImplementationComplete
        ? currentImplementationComplete === "YES"
        : new RegExp(`${id}_IMPLEMENTATION_COMPLETE:\\s*YES|${id}:\\s*COMPLETE_AND_ACCEPTED`).test(
            `${roadmap.text}\n${state.text}`,
          ),
  }));
  const lifecycle = evaluateCapabilityLifecycle({
    acceptedThrough: String(state.meta.acceptedThrough),
    currentProductSlice: String(state.meta.currentProductSlice),
    pendingAcceptance: String(state.meta.pendingAcceptance ?? "NONE"),
    capabilities: lifecycleFacts,
  });
  if (!lifecycle.ok) {
    fail(lifecycle.code, lifecycle.message);
  } else {
    note("capability lifecycle relationships valid");
  }
}

function isImp029ArchitectureLockCheckpoint(roadmap, state) {
  return (
    (roadmap?.meta.roadmapVersion === "GTM-R62" &&
      state?.meta.stateVersion === "STATE-R60") ||
    (roadmap?.meta.roadmapVersion === "GTM-R63" &&
      state?.meta.stateVersion === "STATE-R61") ||
    (roadmap?.meta.roadmapVersion === "GTM-R64" &&
      state?.meta.stateVersion === "STATE-R62") ||
    (roadmap?.meta.roadmapVersion === "GTM-R65" &&
      state?.meta.stateVersion === "STATE-R63") ||
    isImp030ArchitectureCheckpoint(roadmap, state)
  );
}

function isImp029AcceptanceCheckpoint(roadmap, state) {
  return (
    (roadmap?.meta.roadmapVersion === "GTM-R65" &&
      state?.meta.stateVersion === "STATE-R63") ||
    isImp030GovernanceCheckpoint(roadmap, state)
  );
}

function isImp030ArchitectureActivationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "activation");
}

function isImp030ArchitectureLockCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "lock");
}

function isImp030ImplementationAuthorizationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "authorization");
}

function isImp030ImplementationStartCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "start");
}

function isImp030DetailRouteAmendmentCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "routeAmendment");
}

function isImp030CanonicalConsistencyCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "consistencyRepair");
}

function isImp030AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "acceptance");
}

function isImp031ArchitectureDraftCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Draft");
}

function isImp031ArchitectureLockCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Lock");
}

function isImp031ImplementationAuthorizationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Authorization");
}

function isImp031ImplementationStartCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Start");
}

/** @param {string} roadmapVersion @param {string} stateVersion @param {"activation" | "lock" | "authorization" | "start" | "routeAmendment" | "consistencyRepair" | "acceptance" | "imp031Activation" | "imp031Draft" | "imp031Lock" | "imp031Authorization" | "imp031Start"} [kind] */
export function isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, kind) {
  const activation = roadmapVersion === "GTM-R66" && stateVersion === "STATE-R64";
  const lock = roadmapVersion === "GTM-R67" && stateVersion === "STATE-R65";
  const authorization = roadmapVersion === "GTM-R68" && stateVersion === "STATE-R66";
  const start = roadmapVersion === "GTM-R69" && stateVersion === "STATE-R67";
  const routeAmendment = roadmapVersion === "GTM-R70" && stateVersion === "STATE-R68";
  const consistencyRepair = roadmapVersion === "GTM-R71" && stateVersion === "STATE-R69";
  const acceptance = roadmapVersion === "GTM-R72" && stateVersion === "STATE-R70";
  const imp031Activation = roadmapVersion === "GTM-R73" && stateVersion === "STATE-R71";
  const imp031Draft = roadmapVersion === "GTM-R74" && stateVersion === "STATE-R72";
  const imp031Lock = roadmapVersion === "GTM-R75" && stateVersion === "STATE-R73";
  const imp031Authorization = roadmapVersion === "GTM-R76" && stateVersion === "STATE-R74";
  const imp031Start = roadmapVersion === "GTM-R77" && stateVersion === "STATE-R75";
  if (kind === "activation") return activation;
  if (kind === "lock") return lock;
  if (kind === "authorization") return authorization;
  if (kind === "start") return start;
  if (kind === "routeAmendment") return routeAmendment;
  if (kind === "consistencyRepair") return consistencyRepair;
  if (kind === "acceptance") return acceptance;
  if (kind === "imp031Activation") return imp031Activation;
  if (kind === "imp031Draft") return imp031Draft;
  if (kind === "imp031Lock") return imp031Lock;
  if (kind === "imp031Authorization") return imp031Authorization;
  if (kind === "imp031Start") return imp031Start;
  return activation || lock || authorization || start || routeAmendment || consistencyRepair || acceptance || imp031Activation || imp031Draft || imp031Lock || imp031Authorization || imp031Start;
}

function isImp030ArchitectureCheckpoint(roadmap, state) {
  return isImp030ArchitectureActivationCheckpoint(roadmap, state) || isImp030ArchitectureLockCheckpoint(roadmap, state);
}

function isImp030GovernanceCheckpoint(roadmap, state) {
  return (
    isImp030ArchitectureActivationCheckpoint(roadmap, state) ||
    isImp030ArchitectureLockCheckpoint(roadmap, state) ||
    isImp030ImplementationAuthorizationCheckpoint(roadmap, state) ||
    isImp030ImplementationStartCheckpoint(roadmap, state) ||
    isImp030DetailRouteAmendmentCheckpoint(roadmap, state) ||
    isImp030CanonicalConsistencyCheckpoint(roadmap, state) ||
    isImp030AcceptanceCheckpoint(roadmap, state) ||
    isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Activation") ||
    isImp031ArchitectureDraftCheckpoint(roadmap, state) ||
    isImp031ArchitectureLockCheckpoint(roadmap, state) ||
    isImp031ImplementationAuthorizationCheckpoint(roadmap, state) ||
    isImp031ImplementationStartCheckpoint(roadmap, state)
  );
}

function isArchR17GovernanceCheckpoint(roadmap, state) {
  return (
    isImp029ArchitectureLockCheckpoint(roadmap, state) ||
    isImp030ImplementationAuthorizationCheckpoint(roadmap, state) ||
    isImp030ImplementationStartCheckpoint(roadmap, state) ||
    isImp030DetailRouteAmendmentCheckpoint(roadmap, state) ||
    isImp030CanonicalConsistencyCheckpoint(roadmap, state) ||
    isImp030AcceptanceCheckpoint(roadmap, state) ||
    isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Activation")
  );
}

/**
 * Validate the exact IMP-031 architecture-activation lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ArchitectureActivationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R73", stateVersion: "STATE-R71", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_ARCHITECTURE_ACTIVATION", message: `${key} must be ${value}` };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 reviewable architecture-draft checkpoint.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ArchitectureDraftCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R74", stateVersion: "STATE-R72", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED", architectureLocked: "NO",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_ARCHITECTURE_DRAFT", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 architecture draft must exist and remain NOT_LOCKED" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  return { ok: true };
}

/**
 * Validate the bounded IMP-031 draft artifact without accepting contradictory lock/progression text.
 * @param {string} text
 */
export function evaluateImp031ArchitectureDraftArtifact(text) {
  const required = [
    /"status":\s*"DRAFT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/,
    /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/,
    /\| `REQUESTED` \|[^\n]+\| No \|/,
    /\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\| No \|/,
    /\| `BOOKED` \|[^\n]+\| No \|/,
    /\| `PICKED_UP` \|[^\n]+\| No \|/,
    /\| `DELIVERED` \|[^\n]+\| Yes \|/,
    /\| `FAILED` \|[^\n]+\| Yes \|/,
    /\| `CANCELLED` \|[^\n]+\| Yes \|/,
    /`REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`/,
    /`BOOKING_OUTCOME_UNKNOWN` → `BOOKED`/,
    /`BOOKED` → `PICKED_UP`/,
    /`PICKED_UP` → `DELIVERED`/,
    /RETURN_REQUESTED → RETURNING → RETURNED/,
    /Duplicate observations produce no\s+duplicate transition or downstream effect/,
    /Provider\s+status or callback processing must never directly write Order state/,
    /eligible Order `ACCEPTED` → `FULFILLED`/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_DRAFT", message: "IMP-031 artifact must record the complete NOT_LOCKED review candidate" };
  }
  const forbidden = [
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 draft must not claim lock, authorization, start, or D-373" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 architecture-lock lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ArchitectureLockCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R75", stateVersion: "STATE-R73", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_LOCKED", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_ARCHITECTURE_LOCK", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  return { ok: true };
}

/**
 * Validate the locked IMP-031 capability artifact without accepting authorization/start progression.
 * @param {string} text
 */
export function evaluateImp031ArchitectureLockArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/,
    /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/,
    /\| `REQUESTED` \|[^\n]+\| No \|/,
    /\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\| No \|/,
    /\| `BOOKED` \|[^\n]+\| No \|/,
    /\| `PICKED_UP` \|[^\n]+\| No \|/,
    /\| `DELIVERED` \|[^\n]+\| Yes \|/,
    /\| `FAILED` \|[^\n]+\| Yes \|/,
    /\| `CANCELLED` \|[^\n]+\| Yes \|/,
    /`REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`/,
    /`BOOKING_OUTCOME_UNKNOWN` → `BOOKED`/,
    /`BOOKED` → `PICKED_UP`/,
    /`PICKED_UP` → `DELIVERED`/,
    /RETURN_REQUESTED → RETURNING → RETURNED/,
    /Duplicate observations produce no\s+duplicate transition or downstream effect/,
    /Provider\s+status or callback processing must never directly write Order state/,
    /eligible Order `ACCEPTED` → `FULFILLED`/,
    /IMP-031:\s*ARCHITECTURE_LOCKED/,
    /IMP-031_ARCHITECTURE:\s*LOCKED/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*NO/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_LOCK", message: "IMP-031 artifact must record the complete ARCHITECTURE_LOCKED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 lock must not claim authorization, start, unlock, or D-373" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 implementation-authorization lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ImplementationAuthorizationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R76", stateVersion: "STATE-R74", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / NOT_STARTED", implementationAuthorized: "YES", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_IMPLEMENTATION_AUTHORIZATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  if (!checkpoint.boundaryC) return { ok: false, code: "IMP031_BOUNDARY_C", message: "IMP-031 authorization must retain Boundary C" };
  return { ok: true };
}

/**
 * Validate the authorized-not-started IMP-031 capability artifact without accepting start progression.
 * @param {string} text
 */
export function evaluateImp031ImplementationAuthorizationArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*true/,
    /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/,
    /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/,
    /\| `REQUESTED` \|[^\n]+\| No \|/,
    /\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\| No \|/,
    /\| `BOOKED` \|[^\n]+\| No \|/,
    /\| `PICKED_UP` \|[^\n]+\| No \|/,
    /\| `DELIVERED` \|[^\n]+\| Yes \|/,
    /\| `FAILED` \|[^\n]+\| Yes \|/,
    /\| `CANCELLED` \|[^\n]+\| Yes \|/,
    /`REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`/,
    /`BOOKING_OUTCOME_UNKNOWN` → `BOOKED`/,
    /`BOOKED` → `PICKED_UP`/,
    /`PICKED_UP` → `DELIVERED`/,
    /RETURN_REQUESTED → RETURNING → RETURNED/,
    /Duplicate observations produce no\s+duplicate transition or downstream effect/,
    /Provider\s+status or callback processing must never directly write Order state/,
    /eligible Order `ACCEPTED` → `FULFILLED`/,
    /IMP-031:\s*IMPLEMENTATION_AUTHORIZED/,
    /IMP-031_ARCHITECTURE:\s*LOCKED/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*NO/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_AUTHORIZATION", message: "IMP-031 artifact must record the complete AUTHORIZED / NOT_STARTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 authorization must not claim start, unlock, unauthorized, or D-373" };
  }
  return { ok: true };
}

/**
 * Validate CURRENT ARCHITECTURE.md Delivery / IMP-031 status wording for the authorization checkpoint.
 * Does not rewrite historical ROADMAP/STATE revision narratives; only CURRENT ARCH rows.
 * @param {string} architectureText
 */
export function evaluateImp031CurrentArchitectureStatus(architectureText) {
  const staleCurrent = [
    /\| Delivery \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
  ];
  if (staleCurrent.some((pattern) => pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS_STALE",
      message: "CURRENT ARCHITECTURE must not claim Delivery / IMP-031 implementation NOT_AUTHORIZED while authorization is YES",
    };
  }
  const required = [
    /\| Delivery \|[^\n]*capability architecture LOCKED under IMP-031; implementation AUTHORIZED \/ NOT_STARTED;/,
    /\| Delivery \|[^\n]*is `ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ NOT_STARTED;/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*\(`ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ NOT_STARTED\)/,
  ];
  if (required.some((pattern) => !pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS",
      message: "CURRENT ARCHITECTURE must record Delivery / IMP-031 architecture LOCKED and implementation AUTHORIZED / NOT_STARTED",
    };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-031 AUTHORIZED / NOT_STARTED across capability, ROADMAP, STATE, and CURRENT ARCHITECTURE.
 * @param {{ architectureText: string, capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp031ImplementationAuthorizationCrossDocumentAlignment(documents) {
  const artifact = evaluateImp031ImplementationAuthorizationArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const archStatus = evaluateImp031CurrentArchitectureStatus(documents.architectureText);
  if (!archStatus.ok) return archStatus;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const authorizationYes =
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(documents.capabilityText);
  const startedYes =
    /IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-031_STARTED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-031_STARTED:\s*YES/.test(documents.capabilityText);
  const authorizationNo =
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(documents.capabilityText);

  if (authorizationYes && /\| Delivery \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/.test(documents.architectureText)) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS_STALE",
      message: "authorization YES elsewhere while CURRENT ARCHITECTURE says NOT_AUTHORIZED",
    };
  }
  if (startedYes && authorizationNo) {
    return {
      ok: false,
      code: "IMP031_STARTED_WITHOUT_AUTHORIZATION",
      message: "IMP-031_STARTED=YES while IMP-031_IMPLEMENTATION_AUTHORIZED=NO",
    };
  }
  if (!authorizationYes) {
    return {
      ok: false,
      code: "IMP031_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-031 AUTHORIZED / NOT_STARTED",
    };
  }
  if (!/IMP-031_STARTED:\s*NO/.test(currentRoadmapSection) || !/IMP-031_STARTED:\s*NO/.test(currentStateAcceptance)) {
    return {
      ok: false,
      code: "IMP031_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE markers must keep IMP-031_STARTED=NO",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 implementation-start lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ImplementationStartCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R77", stateVersion: "STATE-R75", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED", implementationAuthorized: "YES", started: "YES",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_IMPLEMENTATION_START", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  if (!checkpoint.boundaryC) return { ok: false, code: "IMP031_BOUNDARY_C", message: "IMP-031 start must retain Boundary C" };
  return { ok: true };
}

/**
 * Detect stale present-tense AUTHORIZED / NOT_STARTED status in CURRENT IMP-031 capability §§10–11
 * while the STARTED checkpoint requires AUTHORIZED / STARTED.
 * Historical architecture-lock criteria (e.g. "implementation remains unauthorized until a separate
 * gate") outside those current-status sentences are ignored by scoping to §§10–11 conclusions and
 * not banning NOT_STARTED globally.
 * @param {string} text
 */
export function evaluateImp031ImplementationStartCapabilityCurrentStatus(text) {
  const section10 = extractLiveCanonicalSection(text, "## 10. Architecture-lock acceptance criteria");
  if (!section10.ok) {
    return { ok: false, code: "IMP031_CAPABILITY_SECTION_10", message: section10.message };
  }
  const section11 = extractLiveCanonicalSection(text, "## 11. Open questions for architecture review");
  if (!section11.ok) {
    return { ok: false, code: "IMP031_CAPABILITY_SECTION_11", message: section11.message };
  }

  const staleAuthorizedNotStarted =
    /`AUTHORIZED`\s*\/\s*`NOT_STARTED`|AUTHORIZED\s*\/\s*NOT_STARTED/;
  const staleStartGate = /start remains a separate gate/i;

  // §10: keep historical lock-criteria bullets; reject only stale current-status conclusion.
  const section10AfterCriteria = section10.section.slice(
    Math.max(0, section10.section.search(/These are architecture-lock criteria/)),
  );
  if (
    staleAuthorizedNotStarted.test(section10AfterCriteria) ||
    staleStartGate.test(section10AfterCriteria)
  ) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS_STALE",
      message: "IMP-031 capability §10 current status must not claim AUTHORIZED / NOT_STARTED while STARTED=YES",
    };
  }
  if (!/`AUTHORIZED`\s*\/\s*`STARTED`|AUTHORIZED\s*\/\s*STARTED/.test(section10AfterCriteria)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS",
      message: "IMP-031 capability §10 current status must record AUTHORIZED / STARTED",
    };
  }

  if (staleAuthorizedNotStarted.test(section11.section)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS_STALE",
      message: "IMP-031 capability §11 current status must not claim AUTHORIZED / NOT_STARTED while STARTED=YES",
    };
  }
  if (!/`AUTHORIZED`\s*\/\s*`STARTED`|AUTHORIZED\s*\/\s*STARTED/.test(section11.section)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS",
      message: "IMP-031 capability §11 current status must record AUTHORIZED / STARTED",
    };
  }

  return { ok: true };
}

/**
 * Validate the authorized-started IMP-031 capability artifact without accepting completion progression.
 * @param {string} text
 */
export function evaluateImp031ImplementationStartArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED"/,
    /"implementationAuthorized":\s*true/,
    /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/,
    /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/,
    /\| `REQUESTED` \|[^\n]+\| No \|/,
    /\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\| No \|/,
    /\| `BOOKED` \|[^\n]+\| No \|/,
    /\| `PICKED_UP` \|[^\n]+\| No \|/,
    /\| `DELIVERED` \|[^\n]+\| Yes \|/,
    /\| `FAILED` \|[^\n]+\| Yes \|/,
    /\| `CANCELLED` \|[^\n]+\| Yes \|/,
    /`REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`/,
    /`BOOKING_OUTCOME_UNKNOWN` → `BOOKED`/,
    /`BOOKED` → `PICKED_UP`/,
    /`PICKED_UP` → `DELIVERED`/,
    /RETURN_REQUESTED → RETURNING → RETURNED/,
    /Duplicate observations produce no\s+duplicate transition or downstream effect/,
    /Provider\s+status or callback processing must never directly write Order state/,
    /eligible Order `ACCEPTED` → `FULFILLED`/,
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-031_ARCHITECTURE:\s*LOCKED/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
    /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_START", message: "IMP-031 artifact must record the complete AUTHORIZED / STARTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*NO/,
    /IMP-031:\s*IMPLEMENTATION_AUTHORIZED/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 start must not claim unstarted, unlocked, unauthorized, or D-373" };
  }
  const currentStatus = evaluateImp031ImplementationStartCapabilityCurrentStatus(text);
  if (!currentStatus.ok) return currentStatus;
  return { ok: true };
}

/**
 * Validate CURRENT ARCHITECTURE.md Delivery / IMP-031 status wording for the start checkpoint.
 * @param {string} architectureText
 */
export function evaluateImp031ImplementationStartCurrentArchitectureStatus(architectureText) {
  const staleCurrent = [
    /\| Delivery \|[^\n]*implementation AUTHORIZED \/ NOT_STARTED/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation AUTHORIZED \/ NOT_STARTED/,
    /\| Delivery \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
  ];
  if (staleCurrent.some((pattern) => pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS_STALE",
      message: "CURRENT ARCHITECTURE must not claim Delivery / IMP-031 implementation NOT_STARTED while STARTED=YES",
    };
  }
  const required = [
    /\| Delivery \|[^\n]*capability architecture LOCKED under IMP-031; implementation AUTHORIZED \/ STARTED;/,
    /\| Delivery \|[^\n]*is `ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED;/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*\(`ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED\)/,
  ];
  if (required.some((pattern) => !pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS",
      message: "CURRENT ARCHITECTURE must record Delivery / IMP-031 architecture LOCKED and implementation AUTHORIZED / STARTED",
    };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-031 AUTHORIZED / STARTED across capability, ROADMAP, STATE, and CURRENT ARCHITECTURE.
 * @param {{ architectureText: string, capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp031ImplementationStartCrossDocumentAlignment(documents) {
  const artifact = evaluateImp031ImplementationStartArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const archStatus = evaluateImp031ImplementationStartCurrentArchitectureStatus(documents.architectureText);
  if (!archStatus.ok) return archStatus;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const authorizationYes =
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(documents.capabilityText);
  const startedYes =
    /IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_STARTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_STARTED:\s*YES/.test(documents.capabilityText);
  const startedNo =
    /IMP-031_STARTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_STARTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_STARTED:\s*NO/.test(documents.capabilityText);
  const authorizationNo =
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(documents.capabilityText);
  const inProgress =
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) &&
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) &&
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const architectureUnlocked =
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(documents.capabilityText) ||
    /"architectureLock":\s*"NOT_LOCKED"/.test(documents.capabilityText);

  if (startedYes && authorizationNo) {
    return {
      ok: false,
      code: "IMP031_STARTED_WITHOUT_AUTHORIZATION",
      message: "IMP-031_STARTED=YES while IMP-031_IMPLEMENTATION_AUTHORIZED=NO",
    };
  }
  if (inProgress && startedNo) {
    return {
      ok: false,
      code: "IMP031_IN_PROGRESS_WITHOUT_START",
      message: "IMPLEMENTATION_IN_PROGRESS while IMP-031_STARTED=NO",
    };
  }
  if (startedYes && architectureUnlocked) {
    return {
      ok: false,
      code: "IMP031_STARTED_WITHOUT_LOCK",
      message: "implementation started while architecture is unlocked",
    };
  }
  if (!authorizationYes || !startedYes || !inProgress || !architectureLocked) {
    return {
      ok: false,
      code: "IMP031_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-031 AUTHORIZED / STARTED / IMPLEMENTATION_IN_PROGRESS",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-030 architecture-lock lifecycle facts.
 * @param {{ roadmapVersion: string, stateVersion: string, acceptedThrough: string, currentProductSlice: string, nextProductSlice: string, pendingAcceptance: string, imp029: string, imp030: string, architecture: string, architectureLocked: string, implementationAuthorized: string, started: string, implementationComplete: string, accepted: string, imp031: string, architectureVersion: string, decisionRegisterVersion: string, d372Current: boolean, d373Exists: boolean, artifact: boolean }} checkpoint
 */
export function evaluateImp030ArchitectureLockCheckpoint(checkpoint) {
  const expected = { roadmapVersion: "GTM-R67", stateVersion: "STATE-R65", acceptedThrough: "IMP-029", currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE", imp029: "COMPLETE_AND_ACCEPTED", imp030: "ARCHITECTURE_LOCKED", architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO", imp031: "PLANNED", architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14" };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_ARCHITECTURE_LOCK", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

/**
 * Validate the exact IMP-030 architecture-activation lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030ArchitectureActivationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R66", stateVersion: "STATE-R64", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementationAuthorized: "NO", started: "NO",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_ARCHITECTURE_ACTIVATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  return { ok: true };
}

/**
 * Validate the exact IMP-030 implementation-authorization lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030ImplementationAuthorizationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R68", stateVersion: "STATE-R66", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "NO",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_IMPLEMENTATION_AUTHORIZATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

/**
 * Validate the exact IMP-030 implementation-start lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030ImplementationStartCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R69", stateVersion: "STATE-R67", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_IMPLEMENTATION_START", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

const IMP030_LIFECYCLE_FIELDS = [
  "IMP-030",
  "IMP-030_ARCHITECTURE",
  "IMP-030_ARCHITECTURE_LOCKED",
  "IMP-030_IMPLEMENTATION",
  "IMP-030_IMPLEMENTATION_AUTHORIZED",
  "IMP-030_STARTED",
  "IMP-030_IMPLEMENTATION_COMPLETE",
  "IMP-030_ACCEPTED",
];

/**
 * Extract the one authoritative current IMP-030 lifecycle block, excluding
 * changelog checkpoints that may legitimately contain earlier lifecycle facts.
 * @param {string} text
 * @returns {{ ok: true, facts: Record<string, string> } | { ok: false, message: string }}
 */
export function extractCurrentImp030Lifecycle(text) {
  const currentStart = text.indexOf("## 2.");
  const currentEnd = currentStart === -1 ? -1 : text.indexOf("## 3.", currentStart);
  if (currentStart === -1 || currentEnd === -1) {
    return { ok: false, message: "current position section is missing" };
  }
  const currentSection = text.slice(currentStart, currentEnd);
  const blocks = [...currentSection.matchAll(/```text\n([\s\S]*?)```/g)]
    .map((match) => match[1])
    .filter((block) => /^IMP-030:\s*/m.test(block));
  if (blocks.length !== 1) {
    return { ok: false, message: "current IMP-030 lifecycle block must be present exactly once" };
  }
  const facts = {};
  for (const field of IMP030_LIFECYCLE_FIELDS) {
    const matches = [...blocks[0].matchAll(new RegExp(`^${field}:\\s*(.+)$`, "gm"))];
    if (matches.length !== 1) {
      return { ok: false, message: `current IMP-030 lifecycle field ${field} must be present exactly once` };
    }
    facts[field] = matches[0][1].trim();
  }
  return { ok: true, facts };
}

/**
 * Validate the R67/S65 checkpoint from the current canonical document blocks.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean }} documents
 */
export function evaluateImp030ArchitectureLockDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "ARCHITECTURE_LOCKED",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "NOT_AUTHORIZED / NOT_STARTED",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "NO",
    "IMP-030_STARTED": "NO",
    "IMP-030_IMPLEMENTATION_COMPLETE": "NO",
    "IMP-030_ACCEPTED": "NO",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030ArchitectureLockCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

/**
 * Validate the R68/S66 checkpoint from the current canonical document blocks.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean, artifactText?: string }} documents
 */
export function evaluateImp030ImplementationAuthorizationDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "IMPLEMENTATION_AUTHORIZED",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "AUTHORIZED / NOT_STARTED",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "YES",
    "IMP-030_STARTED": "NO",
    "IMP-030_IMPLEMENTATION_COMPLETE": "NO",
    "IMP-030_ACCEPTED": "NO",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const imp030Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/IMPLEMENTATION_AUTHORIZED/.test(imp030Row)) {
    return { ok: false, code: "IMP030_ROADMAP_LIFECYCLE", message: "ROADMAP future ledger must list IMP-030 Operations Console UI as IMPLEMENTATION_AUTHORIZED" };
  }

  const artifactText = documents.artifactText ?? "";
  if (
    documents.artifact &&
    (
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) ||
      !/"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/.test(artifactText) ||
      !/"implementationAuthorized":\s*true/.test(artifactText) ||
      !/"bindingDecisions":\s*\["D-372"\]/.test(artifactText) ||
      !/"dependsOn":\s*\["IMP-029"\]/.test(artifactText)
    )
  ) {
    return { ok: false, code: "IMP030_CAPABILITY_AUTHORIZATION", message: "IMP-030 capability artifact must record authorized-not-started implementation" };
  }

  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030ImplementationAuthorizationCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

/**
 * Validate the R69/S67 checkpoint from the current canonical document blocks.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean, artifactText?: string }} documents
 */
export function evaluateImp030ImplementationStartDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "IMPLEMENTATION_IN_PROGRESS",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "AUTHORIZED / STARTED",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "YES",
    "IMP-030_STARTED": "YES",
    "IMP-030_IMPLEMENTATION_COMPLETE": "NO",
    "IMP-030_ACCEPTED": "NO",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const imp030Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/IMPLEMENTATION_IN_PROGRESS/.test(imp030Row)) {
    return { ok: false, code: "IMP030_ROADMAP_LIFECYCLE", message: "ROADMAP future ledger must list IMP-030 Operations Console UI as IMPLEMENTATION_IN_PROGRESS" };
  }

  const artifactText = documents.artifactText ?? "";
  if (
    documents.artifact &&
    (
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) ||
      !/"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) ||
      !/"implementationAuthorized":\s*true/.test(artifactText) ||
      !/"bindingDecisions":\s*\["D-372"\]/.test(artifactText) ||
      !/"dependsOn":\s*\["IMP-029"\]/.test(artifactText)
    )
  ) {
    return { ok: false, code: "IMP030_CAPABILITY_START", message: "IMP-030 capability artifact must record authorized-started implementation" };
  }

  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030ImplementationStartCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

const IMP030_ROUTE_FACT_FIELDS = [
  "IMP-030_DETAIL_UI_ROUTE",
  "IMP-030_DETAIL_ID_TRANSPORT",
  "IMP-030_DYNAMIC_DETAIL_ROUTE",
  "IMP-030_STATIC_EXPORT_DETAIL_SHELL",
  "IMP-030_API_DETAIL_ROUTE",
];

const IMP030_CURRENT_DETAIL_UI_ROUTE = "/workforce/operations/orders/detail/";
const IMP030_CURRENT_DETAIL_ID_TRANSPORT = "QUERY_PARAMETER_ORDER_ID";
const IMP030_CURRENT_DYNAMIC_DETAIL_ROUTE = "NO";
const IMP030_CURRENT_STATIC_EXPORT_DETAIL_SHELL = "YES";
const IMP030_CURRENT_API_DETAIL_ROUTE = "GET /api/operations/v1/orders/{orderId}";

/**
 * Extract the one authoritative current IMP-030 route-facts block from section 1 only,
 * excluding historical amendment prose and later sections.
 * @param {string} text
 * @returns {{ ok: true, facts: Record<string, string> } | { ok: false, message: string }}
 */
export function extractCurrentImp030RouteFacts(text) {
  const sectionStart = text.indexOf("## 1.");
  const sectionEnd = sectionStart === -1 ? -1 : text.indexOf("## 2.", sectionStart);
  if (sectionStart === -1 || sectionEnd === -1) {
    return { ok: false, message: "IMP-030 route section is missing" };
  }
  const routeSection = text.slice(sectionStart, sectionEnd);
  const blocks = [...routeSection.matchAll(/```text\n([\s\S]*?)```/g)]
    .map((match) => match[1])
    .filter((block) => /^IMP-030_DETAIL_UI_ROUTE:\s*/m.test(block));
  if (blocks.length !== 1) {
    return { ok: false, message: "current IMP-030 route facts block must be present exactly once" };
  }
  const facts = {};
  for (const field of IMP030_ROUTE_FACT_FIELDS) {
    const matches = [...blocks[0].matchAll(new RegExp(`^${field}:\\s*(.+)$`, "gm"))];
    if (matches.length !== 1) {
      return { ok: false, message: `current IMP-030 route field ${field} must be present exactly once` };
    }
    facts[field] = matches[0][1].trim();
  }
  return { ok: true, facts };
}

/**
 * Validate amended IMP-030 detail route facts from the bounded current route block.
 * @param {Record<string, string>} facts
 */
export function evaluateImp030CurrentRouteFacts(facts) {
  if (facts["IMP-030_DETAIL_UI_ROUTE"] !== IMP030_CURRENT_DETAIL_UI_ROUTE) {
    return { ok: false, code: "IMP030_DETAIL_UI_ROUTE", message: `detail UI route must be ${IMP030_CURRENT_DETAIL_UI_ROUTE}` };
  }
  if (facts["IMP-030_DETAIL_ID_TRANSPORT"] !== IMP030_CURRENT_DETAIL_ID_TRANSPORT) {
    return { ok: false, code: "IMP030_DETAIL_ID_TRANSPORT", message: `detail ID transport must be ${IMP030_CURRENT_DETAIL_ID_TRANSPORT}` };
  }
  if (facts["IMP-030_DYNAMIC_DETAIL_ROUTE"] !== IMP030_CURRENT_DYNAMIC_DETAIL_ROUTE) {
    return { ok: false, code: "IMP030_DYNAMIC_DETAIL_ROUTE", message: `dynamic detail route must be ${IMP030_CURRENT_DYNAMIC_DETAIL_ROUTE}` };
  }
  if (facts["IMP-030_STATIC_EXPORT_DETAIL_SHELL"] !== IMP030_CURRENT_STATIC_EXPORT_DETAIL_SHELL) {
    return { ok: false, code: "IMP030_STATIC_EXPORT_DETAIL_SHELL", message: `static export detail shell must be ${IMP030_CURRENT_STATIC_EXPORT_DETAIL_SHELL}` };
  }
  if (facts["IMP-030_API_DETAIL_ROUTE"] !== IMP030_CURRENT_API_DETAIL_ROUTE) {
    return { ok: false, code: "IMP030_API_DETAIL_ROUTE", message: `API detail route must be ${IMP030_CURRENT_API_DETAIL_ROUTE}` };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-030 detail-route amendment lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030DetailRouteAmendmentCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R70", stateVersion: "STATE-R68", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
    detailUiRoute: IMP030_CURRENT_DETAIL_UI_ROUTE,
    detailIdTransport: IMP030_CURRENT_DETAIL_ID_TRANSPORT,
    dynamicDetailRoute: IMP030_CURRENT_DYNAMIC_DETAIL_ROUTE,
    staticExportDetailShell: IMP030_CURRENT_STATIC_EXPORT_DETAIL_SHELL,
    apiDetailRoute: IMP030_CURRENT_API_DETAIL_ROUTE,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_DETAIL_ROUTE_AMENDMENT", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

/**
 * Validate the R70/S68 checkpoint from the current canonical document blocks.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean, artifactText?: string }} documents
 */
export function evaluateImp030DetailRouteAmendmentDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "IMPLEMENTATION_IN_PROGRESS",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "AUTHORIZED / STARTED",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "YES",
    "IMP-030_STARTED": "YES",
    "IMP-030_IMPLEMENTATION_COMPLETE": "NO",
    "IMP-030_ACCEPTED": "NO",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const imp030Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/IMPLEMENTATION_IN_PROGRESS/.test(imp030Row)) {
    return { ok: false, code: "IMP030_ROADMAP_LIFECYCLE", message: "ROADMAP future ledger must list IMP-030 Operations Console UI as IMPLEMENTATION_IN_PROGRESS" };
  }

  const artifactText = documents.artifactText ?? "";
  if (
    documents.artifact &&
    (
      !/"status":\s*"CURRENT"/.test(artifactText) ||
      !/"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) ||
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) ||
      !/"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) ||
      !/"implementationAuthorized":\s*true/.test(artifactText) ||
      !/"bindingDecisions":\s*\["D-372"\]/.test(artifactText) ||
      !/"dependsOn":\s*\["IMP-029"\]/.test(artifactText)
    )
  ) {
    return { ok: false, code: "IMP030_CAPABILITY_ROUTE_AMENDMENT", message: "IMP-030 capability artifact must record locked authorized-started implementation with D-372 and IMP-029 dependency" };
  }

  const routeFacts = extractCurrentImp030RouteFacts(artifactText);
  if (!routeFacts.ok) return { ok: false, code: "IMP030_CURRENT_ROUTE_FACTS", message: routeFacts.message };
  const routeValidation = evaluateImp030CurrentRouteFacts(routeFacts.facts);
  if (!routeValidation.ok) return routeValidation;

  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030DetailRouteAmendmentCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    detailUiRoute: routeFacts.facts["IMP-030_DETAIL_UI_ROUTE"],
    detailIdTransport: routeFacts.facts["IMP-030_DETAIL_ID_TRANSPORT"],
    dynamicDetailRoute: routeFacts.facts["IMP-030_DYNAMIC_DETAIL_ROUTE"],
    staticExportDetailShell: routeFacts.facts["IMP-030_STATIC_EXPORT_DETAIL_SHELL"],
    apiDetailRoute: routeFacts.facts["IMP-030_API_DETAIL_ROUTE"],
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

/**
 * Extract a live markdown section bounded by `## N.` headings.
 * @param {string} text
 * @param {string} heading
 * @returns {{ ok: true, section: string } | { ok: false, message: string }}
 */
export function extractLiveCanonicalSection(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return { ok: false, message: `${heading} section is missing` };
  const afterHeading = start + heading.length;
  const next = text.indexOf("\n## ", afterHeading);
  // Last section may end at EOF (e.g. capability §11).
  return { ok: true, section: text.slice(start, next === -1 ? undefined : next) };
}

/**
 * Detect stale present-tense IMP-030 prose in live ROADMAP §4 / STATE §5 while
 * authoritative current lifecycle is IMPLEMENTATION_IN_PROGRESS / LOCKED / AUTHORIZED / STARTED.
 * Historical changelog / STATE-R64 narrative outside these live sections is ignored.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> } }} documents
 */
export function evaluateImp030LiveInProgressProseConsistency(documents) {
  const roadmapLive = extractLiveCanonicalSection(documents.roadmap.text, "## 4. Current Product Slice");
  if (!roadmapLive.ok) return { ok: false, code: "IMP030_LIVE_ROADMAP_SECTION", message: roadmapLive.message };
  const stateLive = extractLiveCanonicalSection(documents.state.text, "## 5. Acceptance Position");
  if (!stateLive.ok) return { ok: false, code: "IMP030_LIVE_STATE_SECTION", message: stateLive.message };

  const roadmapSection = roadmapLive.section;
  const stateSection = stateLive.section;

  if (
    /IMP-030[^\n]*architecture is not locked/i.test(roadmapSection) ||
    /IMP-030 architecture is not locked/i.test(roadmapSection) ||
    /^IMP-030_ARCHITECTURE:\s*NOT_LOCKED$/m.test(roadmapSection) ||
    /^IMP-030_ARCHITECTURE_LOCKED:\s*NO$/m.test(roadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP030_LIVE_ROADMAP_STALE_LOCK",
      message: "ROADMAP §4 live current-slice prose must not claim IMP-030 architecture NOT_LOCKED while current lifecycle is LOCKED",
    };
  }

  if (
    /IMP-030[^\n]*implementation is not authorized/i.test(roadmapSection) ||
    /IMP-030[^\n]*not authorized or started/i.test(roadmapSection) ||
    /IMP-030[^\n]*for architecture work only/i.test(roadmapSection) ||
    /current product slice for architecture work only/i.test(roadmapSection) ||
    /^IMP-030_IMPLEMENTATION:\s*NOT_AUTHORIZED\b/m.test(roadmapSection) ||
    /^IMP-030_IMPLEMENTATION_AUTHORIZED:\s*NO$/m.test(roadmapSection) ||
    /^IMP-030_STARTED:\s*NO$/m.test(roadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP030_LIVE_ROADMAP_STALE_AUTHORIZATION",
      message: "ROADMAP §4 live current-slice prose must not claim IMP-030 NOT_AUTHORIZED / NOT_STARTED while current lifecycle is AUTHORIZED / STARTED",
    };
  }

  if (
    documents.roadmap.meta.currentProductSlice === "IMP-030" &&
    documents.roadmap.meta.nextProductSlice === "IMP-031" &&
    /^Next product slice:\s*IMP-030\b/m.test(roadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP030_LIVE_ROADMAP_STALE_NEXT_SLICE",
      message: "ROADMAP §4 live current-slice block must not list Next product slice: IMP-030 when currentProductSlice is IMP-030 and nextProductSlice is IMP-031",
    };
  }

  const stateBlocks = [...stateSection.matchAll(/```text\n([\s\S]*?)```/g)].map((match) => match[1]);
  const stateImp030Block = stateBlocks.find((block) => /^IMP-030:\s*/m.test(block));
  if (!stateImp030Block) {
    return { ok: false, code: "IMP030_LIVE_STATE_ACCEPTANCE", message: "STATE §5 Acceptance Position must include an IMP-030 lifecycle block" };
  }

  if (/^IMP-030:\s*ARCHITECTURE_IN_PROGRESS$/m.test(stateImp030Block)) {
    return {
      ok: false,
      code: "IMP030_LIVE_STATE_STALE_STATUS",
      message: "STATE §5 Acceptance Position must not claim IMP-030 ARCHITECTURE_IN_PROGRESS while current lifecycle is IMPLEMENTATION_IN_PROGRESS",
    };
  }
  if (
    /^IMP-030_ARCHITECTURE:\s*NOT_LOCKED$/m.test(stateImp030Block) ||
    /^IMP-030_ARCHITECTURE_LOCKED:\s*NO$/m.test(stateImp030Block)
  ) {
    return {
      ok: false,
      code: "IMP030_LIVE_STATE_STALE_LOCK",
      message: "STATE §5 Acceptance Position must not claim IMP-030 architecture NOT_LOCKED while current lifecycle is LOCKED",
    };
  }
  if (
    /^IMP-030_IMPLEMENTATION:\s*NOT_AUTHORIZED\b/m.test(stateImp030Block) ||
    /^IMP-030_IMPLEMENTATION_AUTHORIZED:\s*NO$/m.test(stateImp030Block) ||
    /^IMP-030_STARTED:\s*NO$/m.test(stateImp030Block)
  ) {
    return {
      ok: false,
      code: "IMP030_LIVE_STATE_STALE_AUTHORIZATION",
      message: "STATE §5 Acceptance Position must not claim IMP-030 NOT_AUTHORIZED / NOT_STARTED while current lifecycle is AUTHORIZED / STARTED",
    };
  }

  return { ok: true };
}

/**
 * Validate the exact IMP-030 canonical-consistency repair lifecycle facts (R71/R69).
 * Same substantive IMP-030 lifecycle as R70/S68; versions only differ.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030CanonicalConsistencyCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R71", stateVersion: "STATE-R69", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
    detailUiRoute: IMP030_CURRENT_DETAIL_UI_ROUTE,
    detailIdTransport: IMP030_CURRENT_DETAIL_ID_TRANSPORT,
    dynamicDetailRoute: IMP030_CURRENT_DYNAMIC_DETAIL_ROUTE,
    staticExportDetailShell: IMP030_CURRENT_STATIC_EXPORT_DETAIL_SHELL,
    apiDetailRoute: IMP030_CURRENT_API_DETAIL_ROUTE,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_CANONICAL_CONSISTENCY", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

/**
 * Validate the R71/S69 canonical-consistency checkpoint from current document blocks.
 * Reuses R70/S68 substantive lifecycle + route facts and adds live §4/§5 prose protection.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean, artifactText?: string }} documents
 */
export function evaluateImp030CanonicalConsistencyDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "IMPLEMENTATION_IN_PROGRESS",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "AUTHORIZED / STARTED",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "YES",
    "IMP-030_STARTED": "YES",
    "IMP-030_IMPLEMENTATION_COMPLETE": "NO",
    "IMP-030_ACCEPTED": "NO",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const imp030Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/IMPLEMENTATION_IN_PROGRESS/.test(imp030Row)) {
    return { ok: false, code: "IMP030_ROADMAP_LIFECYCLE", message: "ROADMAP future ledger must list IMP-030 Operations Console UI as IMPLEMENTATION_IN_PROGRESS" };
  }

  const artifactText = documents.artifactText ?? "";
  if (
    documents.artifact &&
    (
      !/"status":\s*"CURRENT"/.test(artifactText) ||
      !/"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) ||
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) ||
      !/"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) ||
      !/"implementationAuthorized":\s*true/.test(artifactText) ||
      !/"bindingDecisions":\s*\["D-372"\]/.test(artifactText) ||
      !/"dependsOn":\s*\["IMP-029"\]/.test(artifactText)
    )
  ) {
    return { ok: false, code: "IMP030_CAPABILITY_ROUTE_AMENDMENT", message: "IMP-030 capability artifact must record locked authorized-started implementation with D-372 and IMP-029 dependency" };
  }

  const routeFacts = extractCurrentImp030RouteFacts(artifactText);
  if (!routeFacts.ok) return { ok: false, code: "IMP030_CURRENT_ROUTE_FACTS", message: routeFacts.message };
  const routeValidation = evaluateImp030CurrentRouteFacts(routeFacts.facts);
  if (!routeValidation.ok) return routeValidation;

  const liveProse = evaluateImp030LiveInProgressProseConsistency(documents);
  if (!liveProse.ok) return liveProse;

  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030CanonicalConsistencyCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    detailUiRoute: routeFacts.facts["IMP-030_DETAIL_UI_ROUTE"],
    detailIdTransport: routeFacts.facts["IMP-030_DETAIL_ID_TRANSPORT"],
    dynamicDetailRoute: routeFacts.facts["IMP-030_DYNAMIC_DETAIL_ROUTE"],
    staticExportDetailShell: routeFacts.facts["IMP-030_STATIC_EXPORT_DETAIL_SHELL"],
    apiDetailRoute: routeFacts.facts["IMP-030_API_DETAIL_ROUTE"],
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

/**
 * Validate the exact IMP-030 formal-acceptance lifecycle facts (R72/S70).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp030AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R72", stateVersion: "STATE-R70", acceptedThrough: "IMP-030",
    currentProductSlice: "NONE", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP030_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.d372Current) return { ok: false, code: "IMP030_D372", message: "D-372 must remain CURRENT" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP030_D373", message: "D-373 must not be created" };
  if (!checkpoint.artifact) return { ok: false, code: "IMP030_CAPABILITY_MISSING", message: "IMP-030 capability artifact must exist" };
  return { ok: true };
}

/**
 * Validate the R72/S70 formal-acceptance checkpoint from current document blocks.
 * @param {{ roadmap: { text: string, meta: Record<string, string> }, state: { text: string, meta: Record<string, string> }, architecture: { meta: Record<string, string> }, decision: { text: string, meta: Record<string, string> }, artifact: boolean, artifactText?: string }} documents
 */
export function evaluateImp030AcceptanceDocuments(documents) {
  const roadmapLifecycle = extractCurrentImp030Lifecycle(documents.roadmap.text);
  const stateLifecycle = extractCurrentImp030Lifecycle(documents.state.text);
  if (!roadmapLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_ROADMAP", message: roadmapLifecycle.message };
  if (!stateLifecycle.ok) return { ok: false, code: "IMP030_CURRENT_STATE", message: stateLifecycle.message };

  const expectedFacts = {
    "IMP-030": "COMPLETE_AND_ACCEPTED",
    "IMP-030_ARCHITECTURE": "LOCKED",
    "IMP-030_ARCHITECTURE_LOCKED": "YES",
    "IMP-030_IMPLEMENTATION": "AUTHORIZED / STARTED / COMPLETE",
    "IMP-030_IMPLEMENTATION_AUTHORIZED": "YES",
    "IMP-030_STARTED": "YES",
    "IMP-030_IMPLEMENTATION_COMPLETE": "YES",
    "IMP-030_ACCEPTED": "YES",
  };
  for (const [field, expected] of Object.entries(expectedFacts)) {
    if (roadmapLifecycle.facts[field] !== expected || stateLifecycle.facts[field] !== expected) {
      return { ok: false, code: "IMP030_CURRENT_LIFECYCLE", message: `${field} must be ${expected} in both current lifecycle blocks` };
    }
  }

  const futureSection = documents.roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const imp030FutureRow = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (imp030FutureRow) {
    return { ok: false, code: "IMP030_ROADMAP_FUTURE", message: "ROADMAP future ledger must not retain IMP-030 after acceptance" };
  }
  const acceptedSection = documents.roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const imp030AcceptedRow = [...acceptedSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
  if (!imp030AcceptedRow || !/Operations Console UI/.test(imp030AcceptedRow) || !/COMPLETE_AND_ACCEPTED/.test(imp030AcceptedRow)) {
    return { ok: false, code: "IMP030_ROADMAP_LIFECYCLE", message: "ROADMAP accepted ledger must list IMP-030 Operations Console UI as COMPLETE_AND_ACCEPTED" };
  }
  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    return { ok: false, code: "IMP031_ROADMAP_NOT_PLANNED", message: "ROADMAP future ledger must keep IMP-031 Provider-Neutral Delivery Foundation PLANNED" };
  }
  if (!/^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3.")))) {
    return { ok: false, code: "IMP031_NOT_ACTIVATED", message: "ROADMAP current position must keep IMP-031 PLANNED / NOT_ACTIVATED" };
  }

  const artifactText = documents.artifactText ?? "";
  if (
    documents.artifact &&
    (
      !/"status":\s*"CURRENT"/.test(artifactText) ||
      !/"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) ||
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) ||
      !/"implementation":\s*"COMPLETE_AND_ACCEPTED"/.test(artifactText) ||
      !/"implementationAuthorized":\s*true/.test(artifactText) ||
      !/"bindingDecisions":\s*\["D-372"\]/.test(artifactText) ||
      !/"dependsOn":\s*\["IMP-029"\]/.test(artifactText) ||
      !/IMP-030_ACCEPTED:\s*YES/.test(artifactText) ||
      !/IMP-030_IMPLEMENTATION_COMPLETE:\s*YES/.test(artifactText) ||
      !/D-373:\s*NOT_CREATED/.test(artifactText)
    )
  ) {
    return { ok: false, code: "IMP030_CAPABILITY_ACCEPTANCE", message: "IMP-030 capability artifact must record COMPLETE_AND_ACCEPTED with D-372 and IMP-029 dependency" };
  }

  const requiredAcceptedTokens = [
    [documents.roadmap.text, /IMP-030:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record current IMP-030 lifecycle COMPLETE_AND_ACCEPTED"],
    [documents.roadmap.text, /IMP-030_IMPLEMENTATION_COMPLETE:\s*YES/, "ROADMAP must record current IMP-030 complete"],
    [documents.roadmap.text, /IMP-030_ACCEPTED:\s*YES/, "ROADMAP must record current IMP-030 accepted"],
    [documents.state.text, /IMP-030:\s*COMPLETE_AND_ACCEPTED/, "STATE must record current IMP-030 lifecycle COMPLETE_AND_ACCEPTED"],
    [documents.state.text, /IMP-030_IMPLEMENTATION_COMPLETE:\s*YES/, "STATE must record current IMP-030 complete"],
    [documents.state.text, /IMP-030_ACCEPTED:\s*YES/, "STATE must record current IMP-030 accepted"],
    [documents.state.text, /acceptedThrough:\s*IMP-030/, "STATE Acceptance Position must record acceptedThrough IMP-030"],
    [documents.state.text, /currentProductSlice:\s*NONE/, "STATE Acceptance Position must record currentProductSlice NONE"],
  ];
  for (const [text, pattern, message] of requiredAcceptedTokens) {
    if (!pattern.test(text)) return { ok: false, code: "IMP030_ACCEPTANCE_CHECKPOINT", message };
  }

  const d372Row = documents.decision.text.split("\n").find((line) => /^\|\s*D-372\s*\|/.test(line));
  return evaluateImp030AcceptanceCheckpoint({
    roadmapVersion: documents.roadmap.meta.roadmapVersion, stateVersion: documents.state.meta.stateVersion,
    acceptedThrough: documents.state.meta.acceptedThrough, currentProductSlice: documents.state.meta.currentProductSlice,
    nextProductSlice: documents.state.meta.nextProductSlice, pendingAcceptance: documents.state.meta.pendingAcceptance,
    imp029: /IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(`${documents.roadmap.text}\n${documents.state.text}`) ? "COMPLETE_AND_ACCEPTED" : "",
    imp030: stateLifecycle.facts["IMP-030"], architecture: stateLifecycle.facts["IMP-030_ARCHITECTURE"],
    architectureLocked: stateLifecycle.facts["IMP-030_ARCHITECTURE_LOCKED"],
    implementationAuthorized: stateLifecycle.facts["IMP-030_IMPLEMENTATION_AUTHORIZED"],
    started: stateLifecycle.facts["IMP-030_STARTED"], implementationComplete: stateLifecycle.facts["IMP-030_IMPLEMENTATION_COMPLETE"],
    accepted: stateLifecycle.facts["IMP-030_ACCEPTED"],
    imp031: /^IMP-031:\s*PLANNED \/ NOT_ACTIVATED$/m.test(documents.roadmap.text.slice(documents.roadmap.text.indexOf("## 2."), documents.roadmap.text.indexOf("## 3."))) && /IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: documents.architecture.meta.architectureVersion, decisionRegisterVersion: documents.decision.meta.decisionRegisterVersion,
    d372Current: Boolean(d372Row && /\|\s*CURRENT\s*\|/.test(d372Row)),
    d373Exists: /\|\s*D-373\s*\|/.test(documents.decision.text), artifact: documents.artifact,
  });
}

function isImp029ImplementationAuthorizationCheckpoint(roadmap, state) {
  return (
    roadmap?.meta.roadmapVersion === "GTM-R63" &&
    state?.meta.stateVersion === "STATE-R61"
  );
}

function isImp029ImplementationStartCheckpoint(roadmap, state) {
  return (
    roadmap?.meta.roadmapVersion === "GTM-R64" &&
    state?.meta.stateVersion === "STATE-R62"
  );
}

function checkDecisionRegister(decision, roadmap, state) {
  if (!decision) return;
  const text = decision.text;
  // Unique decision IDs from the Current Global Decisions table only.
  const globalSection =
    text.split("## 2. Current Global Decisions")[1]?.split("## 3.")[0] || text;
  const ids = [...globalSection.matchAll(/\|\s*(D-\d+)\s*\|/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail("DECISION_ID_DUP", `Duplicate decision ID ${id}`);
    seen.add(id);
  }
  note(`Decision IDs unique (${seen.size} table IDs scanned)`);

  // ADR references that appear as ADR-xxx should exist as files (explicit paths;
  // avoid readdir on /mnt/c decisions/ which can ENOMEM under WSL/NTFS).
  const adrRefs = [...new Set([...text.matchAll(/\bADR-(\d{3})\b/g)].map((m) => m[1]))];
  for (const num of adrRefs) {
    const prefix = path.join(projectRoot, "docs/platform/decisions", `ADR-${num}-`);
    // Probe common existence via known filenames from register + glob-free check
    const known = [
      "001-digitalocean-platform",
      "002-environments-ci-cd-release-model",
      "003-modular-monolith-node-typescript",
      "004-identity-authentication-sessions",
      "005-organization-outlet-authorization",
      "006-food-catalog-assortment-availability",
      "007-pricing-tax-charges-promotions",
      "008-serviceability-cart-checkout",
      "009-payments-webhooks-refunds-reconciliation",
      "010-order-lifecycle-operations-console",
      "011-delivery-providers-dispatch-fulfilment",
      "012-notifications-whatsapp-assisted-commerce",
      "013-postgresql-drizzle-migrations-persistence",
      "014-http-api-route-handlers-contracts",
      "015-configuration-secrets-feature-flags",
    ];
    const slug = known.find((k) => k.startsWith(`${num}-`));
    const candidate = slug
      ? path.join(projectRoot, "docs/platform/decisions", `ADR-${slug}.md`)
      : `${prefix}.md`;
    if (!existsSync(candidate)) {
      fail("ADR_MISSING", `Referenced ADR-${num} file not found (expected ${path.relative(projectRoot, candidate)})`);
    }
  }

  // Supersession structural: D-356 should mention ADR-014; ADR-014 file should mention D-356
  const adr014 = resolvePlatformDoc("docs/platform/decisions/ADR-014-http-api-route-handlers-contracts.md");
  if (existsSync(adr014)) {
    const body = readFileSync(adr014, "utf8");
    if (!/SUPERSEDED/i.test(body) || !/D-356/.test(body)) {
      fail("ADR014_SUPERSESSION", "ADR-014 must be marked SUPERSEDED and reference D-356");
    } else {
      note("ADR-014 ↔ D-356 supersession references present");
    }
  }

  const requiredIds = ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363", "D-364", "D-365", "D-366", "D-367", "D-368", "D-369", "D-370", "D-371"];
  if (isImp029ArchitectureLockCheckpoint(roadmap, state)) requiredIds.push("D-372");
  for (const id of requiredIds) {
    if (!seen.has(id)) {
      fail("DECISION_REQUIRED_IDS", `DECISION-REGISTER must register ${id}`);
    }
  }

  const d356Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-356\s*\|/.test(line));
  if (d356Row && !/\|\s*AMENDED\s*\|/.test(d356Row)) {
    fail("D356_AMENDMENT", "D-356 must be AMENDED (topology decided by D-359)");
  } else if (d356Row) {
    note("D-356 status AMENDED (topology amendment via D-359)");
  }

  const d359Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-359\s*\|/.test(line));
  const d360Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-360\s*\|/.test(line));
  const d361Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-361\s*\|/.test(line));
  const d362Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-362\s*\|/.test(line));
  const d363Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-363\s*\|/.test(line));
  if (d359Row && !/\|\s*CURRENT\s*\|/.test(d359Row)) {
    fail("D359_STATUS", "D-359 must be CURRENT");
  }
  if (d360Row && !/\|\s*CURRENT\s*\|/.test(d360Row)) {
    fail("D360_STATUS", "D-360 must be CURRENT");
  }
  if (d361Row && !/\|\s*CURRENT\s*\|/.test(d361Row)) {
    fail("D361_STATUS", "D-361 must be CURRENT");
  }
  if (d361Row && !/Razorpay/.test(d361Row)) {
    fail("D361_PROVIDER", "D-361 must select Razorpay as the V1 production payment provider");
  }
  if (d362Row && !/\|\s*CURRENT\s*\|/.test(d362Row)) {
    fail("D362_STATUS", "D-362 must be CURRENT");
  }
  if (
    d362Row &&
    (!/recoverMissingOrdersBatch/.test(d362Row) || !/D-363/.test(d362Row))
  ) {
    fail(
      "D362_WEBHOOK_BOUNDARY",
      "D-362 must remain CURRENT for recoverMissingOrdersBatch and record D-363 acknowledgement-timing amendment",
    );
  }
  if (d363Row && !/\|\s*CURRENT\s*\|/.test(d363Row)) {
    fail("D363_STATUS", "D-363 must be CURRENT");
  }
  if (
    d363Row &&
    (!/inbox/i.test(d363Row) ||
      !/customer-commerce/.test(d363Row) ||
      !/schema/i.test(d363Row))
  ) {
    fail(
      "D363_WEBHOOK_INBOX",
      "D-363 must lock durable webhook inbox, customer-commerce processing, and Payment/provider ingress schema change",
    );
  }
  const d364Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-364\s*\|/.test(line));
  if (d364Row && !/\|\s*CURRENT\s*\|/.test(d364Row)) {
    fail("D364_STATUS", "D-364 must be CURRENT");
  }
  if (
    d364Row &&
    (!/Refund/.test(d364Row) || !/IMP-027/.test(d364Row) || !/SUCCEEDED/.test(d364Row))
  ) {
    fail(
      "D364_CONTRACT",
      "D-364 must lock Refund Foundation independent of Payment SUCCEEDED collection truth for IMP-027",
    );
  }
  if (isImp029ArchitectureLockCheckpoint(roadmap, state)) {
    const d372Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-372\s*\|/.test(line));
    if (
      !d372Row ||
      !/\|\s*CURRENT\s*\|/.test(d372Row) ||
      !/Operations Console API/.test(d372Row) ||
      !/\/api\/operations\/v1\/\*/.test(d372Row) ||
      !/IMP-029/.test(d372Row)
    ) {
      fail(
        "D372_CONTRACT",
        "D-372 must be CURRENT and lock the IMP-029 Operations Console API /api/operations/v1/* boundary",
      );
    } else {
      note("D-372 registered as CURRENT (Operations Console API Authority)");
    }
    if (!/Next free decision ID advanced to \*\*D-373\*\*/.test(text)) {
      fail("NEXT_DECISION_ID", "Decision register must advance next free ID to D-373 after D-372");
    } else {
      note("Next free decision ID D-373 recorded");
    }
  } else if (!/Next free decision ID advanced to \*\*D-372\*\*/.test(text)) {
    fail("NEXT_DECISION_ID", "Decision register must advance next free ID to D-372 after D-371");
  } else {
    note("Next free decision ID D-372 recorded");
  }
  if (d359Row && d360Row) {
    note("D-359 and D-360 registered as CURRENT");
  }
  if (d361Row && /\|\s*CURRENT\s*\|/.test(d361Row) && /Razorpay/.test(d361Row)) {
    note("D-361 registered as CURRENT (Razorpay)");
  }
  if (
    d362Row &&
    /\|\s*CURRENT\s*\|/.test(d362Row) &&
    /recoverMissingOrdersBatch/.test(d362Row)
  ) {
    note("D-362 registered as CURRENT (missing-Order recovery / post-ack Order effect)");
  }
  if (
    d363Row &&
    /\|\s*CURRENT\s*\|/.test(d363Row) &&
    /inbox/i.test(d363Row) &&
    /customer-commerce/.test(d363Row)
  ) {
    note("D-363 registered as CURRENT (durable webhook inbox / async Payment processing)");
  }
  if (d364Row && /\|\s*CURRENT\s*\|/.test(d364Row) && /Refund/.test(d364Row)) {
    note("D-364 registered as CURRENT (Refund Foundation)");
  }
  const d365Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-365\s*\|/.test(line));
  if (d365Row && !/\|\s*CURRENT\s*\|/.test(d365Row)) {
    fail("D365_STATUS", "D-365 must be CURRENT");
  }
  if (
    d365Row &&
    (!/Financial Document/.test(d365Row) ||
      !/IMP-028/.test(d365Row) ||
      !/TAX_INVOICE/.test(d365Row) ||
      !/CREDIT_NOTE/.test(d365Row))
  ) {
    fail(
      "D365_CONTRACT",
      "D-365 must lock Financial Document authority and statutory classes for IMP-028",
    );
  }
  if (d365Row && /\|\s*CURRENT\s*\|/.test(d365Row) && /Financial Document/.test(d365Row)) {
    note("D-365 registered as CURRENT (Financial Document Authority)");
  }
  const d366Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-366\s*\|/.test(line));
  if (d366Row && !/\|\s*CURRENT\s*\|/.test(d366Row)) {
    fail("D366_STATUS", "D-366 must be CURRENT");
  }
  if (
    d366Row &&
    (!/RefundStatutoryDecision/.test(d366Row) ||
      !/IMP-028/.test(d366Row) ||
      !/REFUND_VOUCHER/.test(d366Row) ||
      !/CREDIT_NOTE/.test(d366Row) ||
      !/NO_STATUTORY_DOCUMENT/.test(d366Row))
  ) {
    fail(
      "D366_CONTRACT",
      "D-366 must lock RefundStatutoryDecision and refund statutory dispositions for IMP-028",
    );
  }
  if (d366Row && /\|\s*CURRENT\s*\|/.test(d366Row) && /RefundStatutoryDecision/.test(d366Row)) {
    note("D-366 registered as CURRENT (Refund Statutory Reversal Decision Authority)");
  }
  const d367Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-367\s*\|/.test(line));
  if (d367Row && !/\|\s*CURRENT\s*\|/.test(d367Row)) {
    fail("D367_STATUS", "D-367 must be CURRENT");
  }
  if (
    d367Row &&
    (!/SignatureArtifact/.test(d367Row) ||
      !/IMP-028/.test(d367Row) ||
      !/ATTENDED_ASYNC_SIGNING/.test(d367Row) ||
      !/DOCUMENT_SIGNER_AS_SOLE_SIGNATURE_AUTHORITY:\s*PROHIBITED/.test(d367Row))
  ) {
    fail(
      "D367_CONTRACT",
      "D-367 must lock SignatureArtifact signing authority, ATTENDED_ASYNC_SIGNING, and Document Signer prohibition for IMP-028",
    );
  }
  if (d367Row && /\|\s*CURRENT\s*\|/.test(d367Row) && /SignatureArtifact/.test(d367Row)) {
    note("D-367 registered as CURRENT (Statutory Financial Document Signing and Signed Artifact Authority)");
  }
  const d368Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-368\s*\|/.test(line));
  if (d368Row && !/\|\s*CURRENT\s*\|/.test(d368Row)) {
    fail("D368_STATUS", "D-368 must be CURRENT");
  }
  if (
    d368Row &&
    (!/READ PROJECTION/.test(d368Row) ||
      !/IMP-025/.test(d368Row) ||
      !/ordering-catalog/.test(d368Row) ||
      !/Checkout Snapshot/.test(d368Row) ||
      !/customer-commerce/.test(d368Row))
  ) {
    fail(
      "D368_CONTRACT",
      "D-368 must lock Customer Menu READ PROJECTION TARGET over existing authorities without replacing Checkout Snapshot or accepted IMP-025 current storefront delivery",
    );
  }
  if (d368Row && /\|\s*CURRENT\s*\|/.test(d368Row) && /READ PROJECTION/.test(d368Row)) {
    note("D-368 registered as CURRENT (Customer Menu Read Projection Authority)");
  }
  const d369Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-369\s*\|/.test(line));
  if (d369Row && !/\|\s*CURRENT\s*\|/.test(d369Row)) {
    fail("D369_STATUS", "D-369 must be CURRENT");
  }
  if (
    d369Row &&
    (!/explicit/.test(d369Row) ||
      !/purchase intent/.test(d369Row) ||
      !/default_quantity/.test(d369Row) ||
      !/price_delta/.test(d369Row) ||
      !/Checkout Snapshot/.test(d369Row))
  ) {
    fail(
      "D369_CONTRACT",
      "D-369 must lock explicit current-interaction selection for positive-price modifiers entering purchase intent without making catalog default_quantity or Checkout Snapshot a silent paid-intent source",
    );
  }
  if (d369Row && /\|\s*CURRENT\s*\|/.test(d369Row) && /purchase intent/.test(d369Row)) {
    note("D-369 registered as CURRENT (Customer Paid Modifier Explicit Selection Authority)");
  }
  const d370Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-370\s*\|/.test(line));
  if (d370Row && !/\|\s*CURRENT\s*\|/.test(d370Row)) {
    fail("D370_STATUS", "D-370 must be CURRENT");
  }
  if (
    d370Row &&
    (!/purchase intent/.test(d370Row) ||
      !/silent/.test(d370Row) ||
      !/CUSTOMER OWNED/.test(d370Row) ||
      !/sign-out/.test(d370Row) ||
      !/ANONYMOUS/.test(d370Row) ||
      !/Checkout Snapshot/.test(d370Row) ||
      !/KEEP_GUEST/.test(d370Row))
  ) {
    fail(
      "D370_CONTRACT",
      "D-370 must lock guest→customer compatible purchase-intent merge without silent whole-cart winner, customer-owned result, logout isolation, and Checkout Snapshot authority preservation",
    );
  }
  if (d370Row && /\|\s*CURRENT\s*\|/.test(d370Row) && /purchase intent/.test(d370Row)) {
    note("D-370 registered as CURRENT (Cart Identity Transition Authority)");
  }
  const d371Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-371\s*\|/.test(line));
  if (!d371Row || !/\|\s*CURRENT\s*\|/.test(d371Row) || !/unit-sequence/.test(d371Row) || !/D-370/.test(d371Row)) {
    fail("D371_CONTRACT", "D-371 must be CURRENT and lock durable unit-sequence authority composed with D-370");
  } else {
    note("D-371 registered as CURRENT (Durable Cart Unit Sequence Authority)");
  }
}

function checkImp024ArchitectureLock(roadmap, state, architecture) {
  const artifactRel = "docs/platform/capabilities/IMP-024-customer-ordering-transport.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP024_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-024 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP024_CAPABILITY_LOCK", "IMP-024 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/COMPLETE_AND_ACCEPTED/.test(body)) {
      fail(
        "IMP024_CAPABILITY_IMPL",
        "IMP-024 capability artifact must declare COMPLETE_AND_ACCEPTED after independent acceptance",
      );
    }
    for (const id of ["D-359", "D-360"]) {
      if (!body.includes(id)) {
        fail("IMP024_CAPABILITY_DECISIONS", `IMP-024 capability artifact must cite ${id}`);
      }
    }
  }

  if (roadmap) {
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-024\s*\|/.test(line),
    );
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-024\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP024_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-024 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-024 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (futureRow) {
      fail(
        "IMP024_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-024 after acceptance",
      );
    }
    if (!/ARCHITECTURE_LOCKED/.test(roadmap.text)) {
      fail(
        "IMP024_ARCH_LOCK_RETAINED",
        "ROADMAP must retain ARCHITECTURE_LOCKED language for IMP-024 architecture",
      );
    } else {
      note("IMP-024 architecture lock retained in ROADMAP");
    }
  }

  if (state) {
    if (!/ARCHITECTURE_LOCKED/.test(state.text) || !/COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP024_STATE_IMPL",
        "STATE must record IMP-024 ARCHITECTURE_LOCKED and COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("STATE records IMP-024 architecture locked / COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-025 implementation:[\s\S]{0,40}COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP025_STATE_IMPL",
        "STATE must record IMP-025 implementation COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("STATE records IMP-025 COMPLETE_AND_ACCEPTED");
    }
  }

  if (architecture) {
    if (/IMP-024[\s\S]{0,120}NOT_DECIDED/.test(architecture.text)) {
      fail("IMP024_ARCH_UNDECIDED", "ARCHITECTURE.md must not leave IMP-024 topology as NOT_DECIDED");
    } else {
      note("ARCHITECTURE.md no longer marks IMP-024 topology NOT_DECIDED");
    }
    if (!/customer-commerce/.test(architecture.text) || !/D-359/.test(architecture.text)) {
      fail("IMP024_ARCH_TOPOLOGY", "ARCHITECTURE.md must reference customer-commerce and D-359");
    } else {
      note("ARCHITECTURE.md references customer-commerce / D-359");
    }
    if (/Compose wiring awaits implementation/.test(architecture.text)) {
      fail(
        "IMP024_ARCH_STALE_WIRING",
        "ARCHITECTURE.md must not claim customer-commerce Compose wiring still awaits implementation",
      );
    } else {
      note("ARCHITECTURE.md does not claim customer-commerce wiring awaits implementation");
    }
  }
}

function checkImp025ArchitectureLock(roadmap, state, architecture) {
  const artifactRel = "docs/platform/capabilities/IMP-025-customer-ordering-ux.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP025_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-025 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP025_CAPABILITY_LOCK", "IMP-025 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/COMPLETE_AND_ACCEPTED/.test(body)) {
      fail(
        "IMP025_CAPABILITY_IMPL",
        "IMP-025 capability artifact must declare COMPLETE_AND_ACCEPTED after independent acceptance",
      );
    }
    for (const id of ["D-356", "D-357", "D-359", "D-360", "D-368", "D-370"]) {
      if (!body.includes(id)) {
        fail("IMP025_CAPABILITY_DECISIONS", `IMP-025 capability artifact must cite ${id}`);
      }
    }
    if (!/sessionStorage/.test(body)) {
      fail("IMP025_GUEST_TOKEN_STORAGE", "IMP-025 capability artifact must lock sessionStorage");
    }
    if (!/ordering-catalog\.json/.test(body)) {
      fail(
        "IMP025_ORDERING_CATALOG",
        "IMP-025 capability artifact must lock src/data/ordering-catalog.json destination",
      );
    }
  }

  if (roadmap) {
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-025\s*\|/.test(line),
    );
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-025\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP025_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-025 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-025 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (futureRow) {
      fail(
        "IMP025_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-025 after acceptance",
      );
    }
    if (claimsImpLifecycleImplementationInProgress(roadmap.text, "IMP-025")) {
      fail(
        "IMP025_ROADMAP_IMPL_STARTED",
        "ROADMAP must not mark IMP-025 IMPLEMENTATION_IN_PROGRESS after acceptance",
      );
    }
  }

  if (state) {
    if (!/IMP-025 architecture:[\s\S]{0,40}ARCHITECTURE_LOCKED/.test(state.text)) {
      fail("IMP025_STATE_ARCH_LOCK", "STATE must record IMP-025 architecture ARCHITECTURE_LOCKED");
    } else {
      note("STATE records IMP-025 architecture locked");
    }
    if (claimsImpLifecycleImplementationInProgress(state.text, "IMP-025")) {
      fail(
        "IMP025_STATE_IMPL_STARTED",
        "STATE must not mark IMP-025 IMPLEMENTATION_IN_PROGRESS after acceptance",
      );
    }
  }

  if (architecture) {
    if (!/IMP-025-customer-ordering-ux\.md/.test(architecture.text)) {
      fail(
        "IMP025_ARCH_REFERENCE",
        "ARCHITECTURE.md must reference IMP-025 capability architecture artifact",
      );
    } else {
      note("ARCHITECTURE.md references IMP-025 capability artifact");
    }
  }
}

function checkImp026ArchitectureLock(roadmap, state, architecture, decision) {
  const artifactRel = "docs/platform/capabilities/IMP-026-razorpay-productionization.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP026_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-026 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP026_CAPABILITY_LOCK", "IMP-026 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/COMPLETE_AND_ACCEPTED/.test(body)) {
      fail(
        "IMP026_CAPABILITY_IMPL",
        "IMP-026 capability artifact must declare COMPLETE_AND_ACCEPTED after independent acceptance",
      );
    }
    if (!/IMP-026_EXTERNAL_WEBHOOK_GATE:\s*SATISFIED/.test(body)) {
      fail(
        "IMP026_CAPABILITY_EXTERNAL_GATE",
        "IMP-026 capability artifact must record IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED after acceptance",
      );
    }
    if (/implementationAuthorized": false/.test(body) || /Implementation authorized \| \*\*NO\*\*/.test(body)) {
      fail(
        "IMP026_CAPABILITY_AUTH",
        "IMP-026 capability artifact must authorize IMP-026A implementation",
      );
    }
    for (const needle of [
      "D-361",
      "D-362",
      "D-363",
      "Razorpay",
      "razorpay_standard_checkout",
      "/api/integrations/payments/razorpay/webhook",
      "/api/v1/payments/{paymentId}/client-evidence",
      "recoverMissingOrdersBatch",
      "tryMaterializeOrderAfterPaymentCompletion",
      "payment_provider_event_inbox",
    ]) {
      if (!body.includes(needle)) {
        fail("IMP026_CAPABILITY_CONTRACT", `IMP-026 capability artifact must include ${needle}`);
      }
    }
    if (!/SCHEMA_CHANGE_REQUIRED: YES/.test(body)) {
      fail(
        "IMP026_CAPABILITY_SCHEMA",
        "IMP-026 capability artifact must lock SCHEMA_CHANGE_REQUIRED: YES for the durable webhook inbox",
      );
    }
    if (/SCHEMA_CHANGE_REQUIRED: NO/.test(body)) {
      fail(
        "IMP026_CAPABILITY_SCHEMA_STALE",
        "IMP-026 capability artifact must not retain SCHEMA_CHANGE_REQUIRED: NO after D-363",
      );
    }
    if (!/durable webhook inbox/.test(body) || !/provider-ack/.test(body)) {
      fail(
        "IMP026_CAPABILITY_ACK",
        "IMP-026 capability artifact must distinguish durable webhook inbox acknowledgement from provider-ack Order materialization",
      );
    }
  }

  if (roadmap) {
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-026\s*\|/.test(line),
    );
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-026\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP026_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-026 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-026 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (futureRow) {
      fail(
        "IMP026_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-026 after acceptance",
      );
    }
    if (!/ARCHITECTURE_LOCKED/.test(roadmap.text)) {
      fail(
        "IMP026_ARCH_LOCK_RETAINED",
        "ROADMAP must retain ARCHITECTURE_LOCKED language for IMP-026 architecture",
      );
    } else {
      note("IMP-026 architecture lock retained in ROADMAP");
    }
  }

  if (state) {
    if (!/IMP-026 architecture:[\s\S]{0,40}ARCHITECTURE_LOCKED/.test(state.text)) {
      fail("IMP026_STATE_ARCH_LOCK", "STATE must record IMP-026 architecture ARCHITECTURE_LOCKED");
    } else {
      note("STATE records IMP-026 architecture locked");
    }
    if (!/IMP-026 implementation:[\s\S]{0,40}COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP026_STATE_IMPL",
        "STATE must record IMP-026 implementation COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("STATE records IMP-026 implementation COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-026_ACCEPTED:\s*YES/.test(state.text)) {
      fail("IMP026_STATE_ACCEPTED", "STATE must record IMP-026_ACCEPTED: YES");
    } else {
      note("STATE records IMP-026_ACCEPTED: YES");
    }
    if (!/IMP-026_EXTERNAL_WEBHOOK_GATE:\s*SATISFIED/.test(state.text)) {
      fail(
        "IMP026_SATISFIED_GATE_TOKEN",
        "STATE must record IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED",
      );
    } else {
      note("STATE records IMP-026_EXTERNAL_WEBHOOK_GATE SATISFIED");
    }
  }

  if (architecture) {
    if (!/IMP-026-razorpay-productionization\.md/.test(architecture.text)) {
      fail(
        "IMP026_ARCH_REFERENCE",
        "ARCHITECTURE.md must reference IMP-026 capability architecture artifact",
      );
    } else {
      note("ARCHITECTURE.md references IMP-026 capability artifact");
    }
    if (!/D-361/.test(architecture.text) || !/Razorpay/.test(architecture.text)) {
      fail("IMP026_ARCH_PROVIDER", "ARCHITECTURE.md must reference D-361 / Razorpay");
    } else {
      note("ARCHITECTURE.md references D-361 / Razorpay");
    }
    if (!/D-362/.test(architecture.text) || !/recoverMissingOrdersBatch/.test(architecture.text)) {
      fail(
        "IMP026_ARCH_WEBHOOK",
        "ARCHITECTURE.md must reference D-362 / recoverMissingOrdersBatch webhook recovery boundary",
      );
    } else {
      note("ARCHITECTURE.md references D-362 / recoverMissingOrdersBatch");
    }
    if (!/D-363/.test(architecture.text) || !/payment_provider_event_inbox/.test(architecture.text)) {
      fail(
        "IMP026_ARCH_INBOX",
        "ARCHITECTURE.md must reference D-363 / payment_provider_event_inbox durable webhook inbox",
      );
    } else {
      note("ARCHITECTURE.md references D-363 / payment_provider_event_inbox");
    }
  }
}

function checkImp026cArchitectureLock(roadmap, state) {
  const artifactRel = "docs/platform/capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP026C_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    note(`IMP-026C capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP026C_CAPABILITY_LOCK", "IMP-026C capability artifact must declare ARCHITECTURE_LOCKED");
    }
    const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
    const claimsCompleteAndAccepted = /IMP-026C:\s*COMPLETE_AND_ACCEPTED/.test(blob);
    const claimsImplementationComplete =
      /IMP-026C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob);
    const claimsImplementationInProgress =
      /IMP-026C:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob);
    const implementationAuthorizedInGovernance =
      /IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob);
    if (claimsCompleteAndAccepted || claimsImplementationComplete || claimsImplementationInProgress) {
      if (
        !/"implementationAuthorized": true/.test(body) &&
        !/implementationAuthorized": true/.test(body)
      ) {
        fail(
          "IMP026C_CAPABILITY_AUTH",
          "IMP-026C capability artifact must record implementationAuthorized: true when implementation is authorized",
        );
      }
    } else if (implementationAuthorizedInGovernance) {
      fail(
        "IMP026C_CAPABILITY_AUTH",
        "IMP-026C capability artifact must not authorize implementation before IMPLEMENTATION_IN_PROGRESS",
      );
    } else if (
      !/"implementationAuthorized": false/.test(body) &&
      !/Implementation authorized \| \*\*NO\*\*/.test(body)
    ) {
      fail(
        "IMP026C_CAPABILITY_AUTH",
        "IMP-026C capability artifact must not authorize implementation while architecture-only",
      );
    }
    if (!/DOMAIN:\s*NONE/.test(body) || !/SERVER_API:\s*NONE/.test(body) || !/DATABASE:\s*NONE/.test(body)) {
      fail(
        "IMP026C_CAPABILITY_SCOPE",
        "IMP-026C capability artifact must lock DOMAIN/SERVER_API/DATABASE as NONE",
      );
    }
    if (/SCHEMA_CHANGE_REQUIRED:\s*YES/.test(body)) {
      fail("IMP026C_CAPABILITY_SCHEMA", "IMP-026C must not require a schema change");
    }
  }

  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const claimsCompleteAndAccepted = /IMP-026C:\s*COMPLETE_AND_ACCEPTED/.test(blob);
  const claimsImplementationComplete =
    /IMP-026C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob);
  const claimsImplementationInProgress =
    /IMP-026C:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob);
  const implementationAuthorized = /IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob);
  if (claimsImplementationComplete && claimsImplementationInProgress) {
    fail(
      "IMP026C_LIFECYCLE_AMBIGUOUS",
      "IMP-026C cannot claim both IMPLEMENTATION_IN_PROGRESS and IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE as current tokens",
    );
  }
  if ((claimsImplementationComplete || claimsImplementationInProgress || claimsCompleteAndAccepted) && !artifact) {
    fail(
      "IMP026C_IMPL_WITHOUT_ARTIFACT",
      "IMP-026C cannot be implementation-active unless its locked capability artifact exists",
    );
  }
  if (claimsImplementationInProgress && !implementationAuthorized) {
    fail(
      "IMP026C_ROADMAP_IMPL_STARTED",
      "IMP-026C IMPLEMENTATION_IN_PROGRESS requires IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
    );
  }
  if (claimsImplementationComplete && !implementationAuthorized) {
    fail(
      "IMP026C_ROADMAP_IMPL_COMPLETE",
      "IMP-026C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE requires IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
    );
  }
  if (claimsCompleteAndAccepted && implementationAuthorized) {
    note("IMP-026C COMPLETE_AND_ACCEPTED as supplemental inserted gate");
  } else if (claimsImplementationComplete && implementationAuthorized) {
    note("IMP-026C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE behind oldest pending acceptance IMP-026");
  } else if (claimsImplementationInProgress && implementationAuthorized) {
    note("IMP-026C IMPLEMENTATION_IN_PROGRESS authorized under locked capability artifact");
  }

  if (roadmap) {
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-026C\s*\|/.test(line),
    );
    const imp027Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-027\s*\|/.test(line),
    );
    if (imp027Row && !/IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(imp027Row)) {
      fail(
        "IMP027_ROADMAP_LIFECYCLE",
        "ROADMAP future ledger must list IMP-027 as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE under GTM-R23",
      );
    } else if (imp027Row) {
      note("IMP-027 ROADMAP lifecycle IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
    }
    const imp028Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-028\s*\|/.test(line),
    );
    if (imp028Row) {
      fail(
        "IMP028_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-028 after GTM-R30 acceptance",
      );
    }
    const imp029Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-029\s*\|/.test(line),
    );
    if (!isImp029ArchitectureLockCheckpoint(roadmap, state) && imp029Row && !imp029Row.includes("PLANNED")) {
      fail(
        "IMP029_ROADMAP_ACTIVATED",
        "ROADMAP future ledger must keep IMP-029 PLANNED until separately authorized",
      );
    }
    if (claimsCompleteAndAccepted) {
      const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
      const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
        /^\|\s*IMP-026C\s*\|/.test(line),
      );
      if (futureRow) {
        fail(
          "IMP026C_ROADMAP_FUTURE",
          "ROADMAP future ledger must not retain IMP-026C after acceptance",
        );
      }
      if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
        fail(
          "IMP026C_ROADMAP_LIFECYCLE",
          "ROADMAP accepted ledger must list IMP-026C as COMPLETE_AND_ACCEPTED",
        );
      } else {
        note("IMP-026C ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_AUTHORIZED",
          "ROADMAP must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      } else {
        note("ROADMAP records IMP-026C implementation authorized");
      }
      if (!/IMP_026C_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_EVIDENCE",
          "ROADMAP must record IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE",
        );
      }
      if (!/IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_REVIEW",
          "ROADMAP must record IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
        );
      }
      if (!/IMP-026C_ACCEPTED:\s*YES/.test(roadmap.text)) {
        fail("IMP026C_ROADMAP_ACCEPTED", "ROADMAP must record IMP-026C_ACCEPTED: YES");
      }
    } else if (claimsImplementationComplete) {
      if (!futureRow || !futureRow.includes("IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")) {
        fail(
          "IMP026C_ROADMAP_LIFECYCLE",
          "ROADMAP future ledger must list IMP-026C as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
        );
      } else {
        note("IMP-026C ROADMAP lifecycle IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_AUTHORIZED",
          "ROADMAP must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      } else {
        note("ROADMAP records IMP-026C implementation authorized");
      }
      if (!/IMP_026C_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_EVIDENCE",
          "ROADMAP must record IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE",
        );
      }
      if (!/IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_REVIEW",
          "ROADMAP must record IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
        );
      }
      if (!/IMP-026C_ACCEPTED:\s*NO/.test(roadmap.text)) {
        fail("IMP026C_ROADMAP_NOT_ACCEPTED", "ROADMAP must record IMP-026C_ACCEPTED: NO");
      }
    } else if (claimsImplementationInProgress) {
      if (!futureRow || !futureRow.includes("IMPLEMENTATION_IN_PROGRESS")) {
        fail(
          "IMP026C_ROADMAP_LIFECYCLE",
          "ROADMAP future ledger must list IMP-026C as IMPLEMENTATION_IN_PROGRESS when authorized",
        );
      } else {
        note("IMP-026C ROADMAP lifecycle IMPLEMENTATION_IN_PROGRESS");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_AUTHORIZED",
          "ROADMAP must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      } else {
        note("ROADMAP records IMP-026C implementation authorized");
      }
    } else {
      if (!futureRow || !futureRow.includes("ARCHITECTURE_LOCKED")) {
        fail(
          "IMP026C_ROADMAP_LIFECYCLE",
          "ROADMAP future ledger must list IMP-026C as ARCHITECTURE_LOCKED",
        );
      } else {
        note("IMP-026C ROADMAP lifecycle ARCHITECTURE_LOCKED");
      }
      if (!/IMP-026C[\s\S]{0,200}NOT_AUTHORIZED/.test(roadmap.text)) {
        fail(
          "IMP026C_ROADMAP_NOT_AUTHORIZED",
          "ROADMAP must record IMP-026C implementation NOT_AUTHORIZED",
        );
      }
    }
    if (!/production Razorpay launch/.test(roadmap.text) || !/Live Mode/.test(roadmap.text)) {
      fail(
        "IMP026_PRODUCTION_SAFETY",
        "ROADMAP must record that deferred webhook proof does not authorize production Razorpay launch or Live Mode",
      );
    } else {
      note("ROADMAP records production / Live Mode safety boundary for deferred IMP-026 webhook gate");
    }
    if (!/IMP-026C-pilot-customer-commerce-ux-hardening\.md/.test(roadmap.text)) {
      fail(
        "IMP026C_ROADMAP_ARTIFACT",
        "ROADMAP must reference the IMP-026C locked capability architecture artifact",
      );
    }
  }

  if (state) {
    if (!/IMP-026C architecture:\s*ARCHITECTURE_LOCKED/.test(state.text)) {
      fail(
        "IMP026C_STATE_ARCH",
        "STATE must record IMP-026C architecture ARCHITECTURE_LOCKED",
      );
    } else {
      note("STATE records IMP-026C architecture ARCHITECTURE_LOCKED");
    }
    if (claimsCompleteAndAccepted) {
      if (!/IMP-026C:\s*COMPLETE_AND_ACCEPTED/.test(state.text)) {
        fail(
          "IMP026C_STATE_LIFECYCLE",
          "STATE must record IMP-026C COMPLETE_AND_ACCEPTED",
        );
      } else {
        note("STATE records IMP-026C COMPLETE_AND_ACCEPTED");
      }
      if (!/IMP-026C implementation:[\s\S]{0,40}AUTHORIZED/.test(state.text)) {
        fail(
          "IMP026C_STATE_AUTHORIZED",
          "STATE must record IMP-026C implementation AUTHORIZED after acceptance",
        );
      } else {
        note("STATE records IMP-026C implementation AUTHORIZED");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
        fail(
          "IMP026C_STATE_IMPL_FLAG",
          "STATE must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      }
      if (!/IMP_026C_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(state.text)) {
        fail(
          "IMP026C_STATE_EVIDENCE",
          "STATE must record IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE",
        );
      }
      if (!/IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(state.text)) {
        fail(
          "IMP026C_STATE_REVIEW",
          "STATE must record IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
        );
      }
      if (!/IMP-026C_ACCEPTED:\s*YES/.test(state.text)) {
        fail("IMP026C_STATE_ACCEPTED", "STATE must record IMP-026C_ACCEPTED: YES");
      }
      if (
        !/pendingAcceptance=NONE/.test(state.text) &&
        !/Pending Acceptance:\s+NONE/.test(state.text)
      ) {
        fail(
          "IMP026C_STATE_OLDEST_PENDING",
          "STATE must explain that pendingAcceptance=NONE after IMP-028 acceptance",
        );
      }
    } else if (claimsImplementationComplete) {
      if (!/IMP-026C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(state.text)) {
        fail(
          "IMP026C_STATE_LIFECYCLE",
          "STATE must record IMP-026C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
        );
      } else {
        note("STATE records IMP-026C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
      }
      if (!/IMP-026C implementation:[\s\S]{0,40}AUTHORIZED/.test(state.text)) {
        fail(
          "IMP026C_STATE_AUTHORIZED",
          "STATE must record IMP-026C implementation AUTHORIZED when complete pending acceptance",
        );
      } else {
        note("STATE records IMP-026C implementation AUTHORIZED");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
        fail(
          "IMP026C_STATE_IMPL_FLAG",
          "STATE must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      }
      if (!/IMP_026C_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(state.text)) {
        fail(
          "IMP026C_STATE_EVIDENCE",
          "STATE must record IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE",
        );
      }
      if (!/IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(state.text)) {
        fail(
          "IMP026C_STATE_REVIEW",
          "STATE must record IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
        );
      }
      if (!/IMP-026C_ACCEPTED:\s*NO/.test(state.text)) {
        fail("IMP026C_STATE_NOT_ACCEPTED", "STATE must record IMP-026C_ACCEPTED: NO");
      }
      if (
        !/pendingAcceptance=IMP-026C/.test(state.text) &&
        !/Pending Acceptance:\s+IMP-026C/.test(state.text)
      ) {
        fail(
          "IMP026C_STATE_OLDEST_PENDING",
          "STATE must explain that pendingAcceptance=IMP-026C is the current remaining acceptance gate",
        );
      }
    } else if (claimsImplementationInProgress) {
      if (!/IMP-026C:\s*IMPLEMENTATION_IN_PROGRESS/.test(state.text)) {
        fail("IMP026C_STATE_LIFECYCLE", "STATE must record IMP-026C IMPLEMENTATION_IN_PROGRESS");
      } else {
        note("STATE records IMP-026C IMPLEMENTATION_IN_PROGRESS");
      }
      if (!/IMP-026C implementation:[\s\S]{0,40}AUTHORIZED/.test(state.text)) {
        fail(
          "IMP026C_STATE_AUTHORIZED",
          "STATE must record IMP-026C implementation AUTHORIZED when in progress",
        );
      } else {
        note("STATE records IMP-026C implementation AUTHORIZED");
      }
      if (!/IMP-026C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
        fail(
          "IMP026C_STATE_IMPL_FLAG",
          "STATE must record IMP-026C_IMPLEMENTATION_AUTHORIZED: YES",
        );
      }
    } else {
      if (!/IMP-026C:\s*ARCHITECTURE_LOCKED/.test(state.text)) {
        fail("IMP026C_STATE_LIFECYCLE", "STATE must record IMP-026C ARCHITECTURE_LOCKED");
      }
      if (!/IMP-026C implementation:[\s\S]{0,40}NOT_AUTHORIZED/.test(state.text)) {
        fail(
          "IMP026C_STATE_NOT_AUTHORIZED",
          "STATE must record IMP-026C implementation NOT_AUTHORIZED",
        );
      } else {
        note("STATE records IMP-026C implementation NOT_AUTHORIZED");
      }
    }
    if (/IMP-026C architecture:\s*NOT_LOCKED/.test(state.text)) {
      fail(
        "IMP026C_STATE_ARCH_UNLOCKED",
        "STATE must not leave IMP-026C architecture NOT_LOCKED after GTM-R16",
      );
    }
    if (!/IMP-026_EXTERNAL_WEBHOOK_GATE:\s*SATISFIED/.test(state.text)) {
      fail(
        "IMP026_SATISFIED_GATE_TOKEN",
        "STATE must record IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED",
      );
    } else {
      note("STATE records IMP-026_EXTERNAL_WEBHOOK_GATE SATISFIED");
    }
    if (!/production Razorpay launch/.test(state.text) || !/Live Mode/.test(state.text)) {
      fail(
        "IMP026_STATE_PRODUCTION_SAFETY",
        "STATE must record that deferral does not authorize production Razorpay launch or Live Mode",
      );
    }
    if (!/IMP-026C-pilot-customer-commerce-ux-hardening\.md/.test(state.text)) {
      fail(
        "IMP026C_STATE_ARTIFACT",
        "STATE must reference the IMP-026C locked capability architecture artifact",
      );
    }
  }
}

function checkImp027ArchitectureLock(roadmap, state, architecture) {
  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const artifactRel = "docs/platform/capabilities/IMP-027-refund-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactPresent = Boolean(artifact);

  const claimsArchitectureLocked =
    /IMP-027_ARCHITECTURE:\s*LOCKED/.test(blob) ||
    /IMP-027 architecture:\s*ARCHITECTURE_LOCKED/.test(blob);
  const claimsNotLocked =
    /IMP-027_ARCHITECTURE:\s*NOT_LOCKED/.test(blob) ||
    /IMP-027 architecture:\s*NOT_LOCKED/.test(blob);
  const claimsImplementationInProgress = /IMP-027:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob);
  const claimsImplementationComplete =
    /IMP-027:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob);
  const claimsCompleteAndAccepted = /IMP-027:\s*COMPLETE_AND_ACCEPTED/.test(blob);
  const implementationAuthorized = /IMP-027_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob);
  const implementationEvidenceComplete = /IMP_027_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(blob);
  const independentReviewPass = /IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(blob);
  const acceptedNo = /IMP-027_ACCEPTED:\s*NO/.test(blob);
  const acceptedYes = /IMP-027_ACCEPTED:\s*YES/.test(blob);

  if (!claimsArchitectureLocked) {
    fail(
      "IMP027_STATE_ARCH_LOCK",
      "GTM-R23 requires IMP-027 architecture LOCKED in ROADMAP/STATE",
    );
  } else {
    note("IMP-027 architecture LOCKED recorded");
  }

  if (!claimsCompleteAndAccepted) {
    fail(
      "IMP027_STATE_LIFECYCLE",
      "Current ROADMAP/STATE must record IMP-027: COMPLETE_AND_ACCEPTED",
    );
  } else {
    note("IMP-027 COMPLETE_AND_ACCEPTED recorded");
  }

  if (claimsImplementationInProgress && claimsImplementationComplete) {
    fail(
      "IMP027_LIFECYCLE_AMBIGUOUS",
      "IMP-027 cannot claim both IMPLEMENTATION_IN_PROGRESS and IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE as current tokens",
    );
  }

  if (!artifactPresent) {
    fail(
      "IMP027_CAPABILITY_MISSING",
      `Missing locked capability architecture at ${artifactRel}`,
    );
  } else {
    note(`IMP-027 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP027_CAPABILITY_LOCK", "IMP-027 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (!/"implementationAuthorized": true/.test(body) && !/implementationAuthorized": true/.test(body)) {
      fail(
        "IMP027_CAPABILITY_AUTH",
        "IMP-027 capability artifact must record implementation authorization after acceptance",
      );
    }
    if (!/D-364/.test(body)) {
      fail("IMP027_CAPABILITY_DECISION", "IMP-027 capability artifact must cite D-364");
    }
    if (!/Open Questions[\s\S]{0,200}\(none\)/.test(body)) {
      fail(
        "IMP027_OPEN_QUESTIONS",
        "IMP-027 capability artifact must lock with empty Open Questions",
      );
    }
  }

  if (claimsNotLocked) {
    fail(
      "IMP027_ARCHITECTURE_UNLOCKED",
      "GTM-R23 must not leave IMP-027 architecture NOT_LOCKED after architecture lock",
    );
  }

  if ((claimsImplementationComplete || claimsCompleteAndAccepted) && !artifactPresent) {
    fail(
      "IMP027_COMPLETE_WITHOUT_ARTIFACT",
      "IMP-027 accepted/completed state requires locked capability artifact",
    );
  }

  if (claimsImplementationComplete && !implementationAuthorized) {
    fail(
      "IMP027_IMPLEMENTATION_AUTH",
      "GTM-R23 requires IMP-027_IMPLEMENTATION_AUTHORIZED: YES when implementation is complete pending acceptance",
    );
  } else if (implementationAuthorized) {
    note("IMP-027 implementation AUTHORIZED");
  }

  if (claimsImplementationComplete && !implementationEvidenceComplete) {
    fail(
      "IMP027_IMPLEMENTATION_EVIDENCE",
      "GTM-R23 requires IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE",
    );
  } else if (implementationEvidenceComplete) {
    note("IMP-027 implementation evidence COMPLETE");
  }

  if (claimsImplementationComplete && !independentReviewPass) {
    fail(
      "IMP027_IMPLEMENTATION_REVIEW",
      "GTM-R23 requires IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
    );
  } else if (independentReviewPass) {
    note("IMP-027 independent implementation review PASS");
  }

  if (!claimsCompleteAndAccepted) {
    fail("IMP027_STATE_LIFECYCLE", "Current ROADMAP/STATE must record IMP-027: COMPLETE_AND_ACCEPTED");
  } else {
    note("IMP-027 COMPLETE_AND_ACCEPTED recorded");
  }
  if (!acceptedYes) {
    fail("IMP027_ACCEPTED_MISSING", "Current ROADMAP/STATE must record IMP-027_ACCEPTED: YES");
  } else {
    note("IMP-027_ACCEPTED: YES");
  }

  if (roadmap) {
    if (!/GTM-R23/.test(roadmap.text) && !/GTM-R24/.test(roadmap.text)) {
      fail("IMP027_ROADMAP_VERSION_NOTE", "ROADMAP must retain GTM-R23/R24 continuation history for IMP-027/028");
    }
    if (!/Refund Foundation/.test(roadmap.text)) {
      fail("IMP027_IDENTITY", "ROADMAP must preserve IMP-027 Refund Foundation identity");
    }
    if (!/IMP-027-refund-foundation\.md/.test(roadmap.text)) {
      fail(
        "IMP027_ROADMAP_ARTIFACT",
        "ROADMAP must reference the IMP-027 locked capability architecture artifact",
      );
    }
    if (!/IMP-027_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP027_ROADMAP_AUTHORIZED",
        "ROADMAP must record IMP-027_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP_027_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(roadmap.text)) {
      fail(
        "IMP027_ROADMAP_EVIDENCE",
        "ROADMAP must record IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE",
      );
    }
    if (!/IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(roadmap.text)) {
      fail(
        "IMP027_ROADMAP_REVIEW",
        "ROADMAP must record IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
      );
    }
    if (!/IMP-027:\s*COMPLETE_AND_ACCEPTED/.test(roadmap.text)) {
      fail("IMP027_ROADMAP_LIFECYCLE", "ROADMAP must record IMP-027 COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-027_ACCEPTED:\s*YES/.test(roadmap.text)) {
      fail("IMP027_ROADMAP_ACCEPTED", "ROADMAP must record IMP-027_ACCEPTED: YES");
    }
  }

  if (state) {
    if (!/IMP-027:\s*COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP027_STATE_POSITION",
        "STATE must record IMP-027 COMPLETE_AND_ACCEPTED",
      );
    }
    if (!/IMP-027_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
      fail("IMP027_STATE_AUTHORIZED", "STATE must record IMP-027_IMPLEMENTATION_AUTHORIZED: YES");
    }
    if (!/IMP_027_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(state.text)) {
      fail("IMP027_STATE_EVIDENCE", "STATE must record IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE");
    }
    if (!/IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(state.text)) {
      fail(
        "IMP027_STATE_REVIEW",
        "STATE must record IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
      );
    }
    if (!/IMP-027_ACCEPTED:\s*YES/.test(state.text)) {
      fail("IMP027_STATE_ACCEPTED", "STATE must record IMP-027_ACCEPTED: YES");
    }
    if (!/IMP-027-refund-foundation\.md/.test(state.text)) {
      fail(
        "IMP027_STATE_ARTIFACT",
        "STATE must reference the IMP-027 locked capability architecture artifact",
      );
    }
    if (!/pendingAcceptance=NONE/.test(state.text) && !/Pending Acceptance:\s+NONE/.test(state.text)) {
      fail(
        "IMP026C_STATE_PENDING",
        "STATE must explain that pendingAcceptance=NONE after IMP-028 acceptance",
      );
    }
  }

  if (architecture) {
    if (!/IMP-027-refund-foundation\.md/.test(architecture.text)) {
      fail(
        "IMP027_ARCH_REFERENCE",
        "ARCHITECTURE.md must reference IMP-027 capability architecture artifact",
      );
    } else {
      note("ARCHITECTURE.md references IMP-027 capability artifact");
    }
    if (!/ARCH-G15/.test(architecture.text) || !/D-364/.test(architecture.text)) {
      fail(
        "IMP027_ARCH_INVARIANTS",
        "ARCHITECTURE.md must record ARCH-G15 and D-364 for Refund Foundation",
      );
    } else {
      note("ARCHITECTURE.md records ARCH-G15 / D-364");
    }
  }
}

function checkImp028ArchitectureLock(roadmap, state, architecture, decision) {
  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const artifactRel = "docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactPresent = Boolean(artifact);

  const claimsArchitectureLocked =
    /IMP-028_ARCHITECTURE_LOCKED:\s*YES/.test(blob) ||
    /IMP-028_ARCHITECTURE:\s*LOCKED\b/.test(blob) ||
    /IMP-028 architecture:\s*ARCHITECTURE_LOCKED/.test(blob);
  const claimsNotLocked =
    /IMP-028_ARCHITECTURE:\s*NOT_LOCKED/.test(blob) ||
    /IMP-028 architecture:\s*NOT_LOCKED/.test(blob) ||
    /IMP-028_ARCHITECTURE_LOCKED:\s*NO/.test(blob);
  const claimsArchitectureInProgress = /IMP-028:\s*ARCHITECTURE_IN_PROGRESS/.test(blob);
  const claimsImplementationInProgress = /IMP-028:\s*IMPLEMENTATION_IN_PROGRESS/.test(blob);
  const claimsImplementationComplete =
    /IMP-028:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob);
  const implementationAuthorized = /IMP-028_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(blob);
  const implementationStartedYes = /IMP-028_IMPLEMENTATION_STARTED:\s*YES/.test(blob);
  const implementationCompleteYes = /IMP-028_IMPLEMENTATION_COMPLETE:\s*YES/.test(blob);
  const implementationCompleteNo = /IMP-028_IMPLEMENTATION_COMPLETE:\s*NO/.test(blob);
  const acceptedYes = /IMP-028_ACCEPTED:\s*YES/.test(blob);
  const acceptedNo = /IMP-028_ACCEPTED:\s*NO/.test(blob);

  const claimsCompleteAndAccepted = /IMP-028:\s*COMPLETE_AND_ACCEPTED/.test(blob);

  if (!claimsArchitectureLocked) {
    fail(
      "IMP028_STATE_ARCH_LOCK",
      "GTM-R30 requires IMP-028 architecture LOCKED in ROADMAP/STATE",
    );
  } else {
    note("IMP-028 architecture LOCKED recorded");
  }

  if (claimsNotLocked) {
    fail(
      "IMP028_ARCHITECTURE_UNLOCKED",
      "GTM-R30 must not leave IMP-028 architecture NOT_LOCKED / IMP-028_ARCHITECTURE_LOCKED: NO after lock",
    );
  }

  if (!implementationAuthorized) {
    fail(
      "IMP028_IMPLEMENTATION_AUTHORIZED",
      "GTM-R30 requires IMP-028_IMPLEMENTATION_AUTHORIZED: YES",
    );
  } else {
    note("IMP-028 implementation AUTHORIZED");
  }

  if (!claimsCompleteAndAccepted) {
    fail(
      "IMP028_LIFECYCLE_ACCEPTED",
      "GTM-R30 requires IMP-028: COMPLETE_AND_ACCEPTED lifecycle token",
    );
  } else {
    note("IMP-028 lifecycle COMPLETE_AND_ACCEPTED");
  }

  if (!implementationStartedYes) {
    fail(
      "IMP028_IMPLEMENTATION_STARTED",
      "GTM-R30 requires IMP-028_IMPLEMENTATION_STARTED: YES",
    );
  } else {
    note("IMP-028 implementation STARTED");
  }

  if (!implementationCompleteYes) {
    fail(
      "IMP028_IMPLEMENTATION_NOT_COMPLETE",
      "GTM-R30 requires IMP-028_IMPLEMENTATION_COMPLETE: YES",
    );
  } else {
    note("IMP-028 implementation COMPLETE");
  }

  if (!acceptedYes) {
    fail("IMP028_ACCEPTED_MISSING", "GTM-R30 must record IMP-028_ACCEPTED: YES");
  } else {
    note("IMP-028_ACCEPTED: YES");
  }

  if (!artifactPresent) {
    fail(
      "IMP028_CAPABILITY_MISSING",
      `Missing locked capability architecture at ${artifactRel}`,
    );
  } else {
    note(`IMP-028 capability architecture present (${artifactRel})`);
    const body = readFileSync(artifact, "utf8");
    if (!/ARCHITECTURE_LOCKED/.test(body)) {
      fail("IMP028_CAPABILITY_LOCK", "IMP-028 capability artifact must declare ARCHITECTURE_LOCKED");
    }
    if (
      !/"implementationAuthorized": true/.test(body) &&
      !/implementationAuthorized": true/.test(body)
    ) {
      fail(
        "IMP028_CAPABILITY_AUTH",
        "IMP-028 capability artifact must authorize implementation (implementationAuthorized: true)",
      );
    }
    if (!/"implementation": "COMPLETE_AND_ACCEPTED"/.test(body)) {
      fail(
        "IMP028_CAPABILITY_AUTH_STATE",
        "IMP-028 capability artifact must record implementation COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-028 capability artifact records implementation COMPLETE_AND_ACCEPTED");
    }
    if (!/D-365/.test(body) || !/D-366/.test(body) || !/D-367/.test(body)) {
      fail("IMP028_CAPABILITY_DECISION", "IMP-028 capability artifact must cite D-365, D-366, and D-367");
    }
    if (/IMP-028_IMPLEMENTATION_COMPLETE\s*[=:]\s*NO/.test(body)) {
      fail(
        "IMP028_CAPABILITY_STILL_INCOMPLETE",
        "IMP-028 capability artifact must not leave IMP-028_IMPLEMENTATION_COMPLETE = NO after working-tree completion",
      );
    }
    if (!/IMP-028_IMPLEMENTATION_COMPLETE\s*[=:]\s*YES/.test(body)) {
      fail(
        "IMP028_CAPABILITY_IMPLEMENTATION_COMPLETE",
        "IMP-028 capability artifact must record IMP-028_IMPLEMENTATION_COMPLETE = YES",
      );
    } else {
      note("IMP-028 capability artifact records working-tree IMP-028_IMPLEMENTATION_COMPLETE = YES");
    }
    if (!/IMP-028_ACCEPTED\s*[=:]\s*YES/.test(body)) {
      fail(
        "IMP028_CAPABILITY_NOT_ACCEPTED",
        "IMP-028 capability artifact must record IMP-028_ACCEPTED = YES",
      );
    } else {
      note("IMP-028 capability artifact records IMP-028_ACCEPTED = YES");
    }
    if (!/Open Questions[\s\S]{0,200}\(none\)/.test(body)) {
      fail(
        "IMP028_OPEN_QUESTIONS",
        "IMP-028 capability artifact must lock with empty Open Questions",
      );
    }
    if (!/SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE/.test(body)) {
      fail(
        "IMP028_SECTION34_INVARIANT",
        "IMP-028 capability artifact must record Section 34 Credit Note requires prior Tax Invoice",
      );
    }
    if (!/BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED/.test(body)) {
      fail(
        "IMP028_BOS_CREDIT_NOTE_BOUNDARY",
        "IMP-028 capability artifact must prohibit BoS-only automatic Credit Note",
      );
    }
    if (
      !/TAX_RECEIPT/.test(body) ||
      (!/Do \*\*NOT\*\*[^\n]{0,120}TAX_RECEIPT/.test(body) &&
        !/Do NOT[^\n]{0,120}TAX_RECEIPT/i.test(body) &&
        !/no statutory TAX_RECEIPT/i.test(body) &&
        !/not.*statutory document type named TAX_RECEIPT/i.test(body))
    ) {
      fail(
        "IMP028_TAX_RECEIPT_BOUNDARY",
        "IMP-028 capability artifact must forbid TAX_RECEIPT as a statutory type",
      );
    }
  }

  if (roadmap) {
    if (!/Invoice \/ Tax Receipt \/ Credit Note/.test(roadmap.text)) {
      fail("IMP028_IDENTITY", "ROADMAP must preserve IMP-028 Invoice / Tax Receipt / Credit Note identity");
    }
    if (!/GTM-R27/.test(roadmap.text) && !/GTM-R26/.test(roadmap.text)) {
      fail("IMP028_ROADMAP_VERSION_NOTE", "ROADMAP must retain GTM-R27/R26 continuation history for IMP-028");
    }
    if (!/IMP-028_ARCHITECTURE_LOCKED:\s*YES/.test(roadmap.text)) {
      fail("IMP028_ROADMAP_LOCKED", "ROADMAP must record IMP-028_ARCHITECTURE_LOCKED: YES");
    }
    if (!/IMP-028_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028_ROADMAP_AUTHORIZED",
        "ROADMAP must record IMP-028_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028_IMPLEMENTATION_STARTED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028_ROADMAP_STARTED",
        "ROADMAP must record IMP-028_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028-invoice-tax-receipt-credit-note\.md/.test(roadmap.text)) {
      fail(
        "IMP028_ROADMAP_ARTIFACT",
        "ROADMAP must reference the IMP-028 locked capability architecture artifact",
      );
    }
    if (!/D-365/.test(roadmap.text) || !/D-366/.test(roadmap.text) || !/D-367/.test(roadmap.text)) {
      fail("IMP028_ROADMAP_DECISION", "ROADMAP must cite binding decisions D-365, D-366, and D-367");
    }
    const futureSection =
      roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const imp028Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-028\s*\|/.test(line),
    );
    if (imp028Row) {
      fail(
        "IMP028_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-028 after GTM-R30 acceptance",
      );
    } else {
      note("IMP-028 removed from ROADMAP future ledger after acceptance");
    }
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-028\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP028_ROADMAP_LEDGER",
        "ROADMAP accepted ledger must list IMP-028 as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-028 ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-028_ACCEPTED:\s*YES/.test(roadmap.text)) {
      fail("IMP028_ROADMAP_ACCEPTED", "ROADMAP must record IMP-028_ACCEPTED: YES");
    }
    const imp029Accepted = isImp029AcceptanceCheckpoint(roadmap, state);
    const imp029Started =
      isImp029ImplementationStartCheckpoint(roadmap, state) || imp029Accepted;
    const imp029Authorized =
      isImp029ImplementationAuthorizationCheckpoint(roadmap, state) || imp029Started;
    if (!new RegExp(`IMP-029_IMPLEMENTATION_AUTHORIZED:\\s*${imp029Authorized ? "YES" : "NO"}`).test(roadmap.text)) {
      fail(
        "IMP029_ROADMAP_AUTHORIZATION",
        `ROADMAP must record IMP-029_IMPLEMENTATION_AUTHORIZED: ${imp029Authorized ? "YES" : "NO"}`,
      );
    }
    if (imp029Accepted) {
      if (!/IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(state.text)) {
        fail("IMP029_STATE_ACCEPTED", "STATE must record IMP-029 COMPLETE_AND_ACCEPTED");
      } else {
        note("IMP-029 COMPLETE_AND_ACCEPTED");
      }
    } else if (imp029Started) {
      if (!/IMP-029_STARTED:\s*YES/.test(roadmap.text)) {
        fail("IMP029_ROADMAP_STARTED", "ROADMAP must record IMP-029_STARTED: YES");
      } else {
        note("IMP-029 ROADMAP implementation STARTED");
      }
    } else if (!/IMP-029_STARTED:\s*NO/.test(roadmap.text)) {
      fail("IMP029_ROADMAP_NOT_STARTED", "ROADMAP must record IMP-029_STARTED: NO");
    }
  }

  if (state) {
    if (!/IMP-028:\s*COMPLETE_AND_ACCEPTED/.test(state.text)) {
      fail(
        "IMP028_STATE_POSITION",
        "STATE must record IMP-028 COMPLETE_AND_ACCEPTED",
      );
    }
    if (!/IMP-028_ARCHITECTURE_LOCKED:\s*YES/.test(state.text)) {
      fail("IMP028_STATE_LOCKED", "STATE must record IMP-028_ARCHITECTURE_LOCKED: YES");
    }
    if (!/IMP-028_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
      fail(
        "IMP028_STATE_AUTHORIZED",
        "STATE must record IMP-028_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028_IMPLEMENTATION_STARTED:\s*YES/.test(state.text)) {
      fail(
        "IMP028_STATE_STARTED",
        "STATE must record IMP-028_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028_IMPLEMENTATION_COMPLETE:\s*YES/.test(state.text)) {
      fail(
        "IMP028_STATE_COMPLETE",
        "STATE must record IMP-028_IMPLEMENTATION_COMPLETE: YES (working-tree completion)",
      );
    } else {
      note("STATE records IMP-028_IMPLEMENTATION_COMPLETE: YES");
    }
    if (!/IMP-028_ACCEPTED:\s*YES/.test(state.text)) {
      fail("IMP028_STATE_NOT_ACCEPTED", "STATE must record IMP-028_ACCEPTED: YES");
    }
    const imp029Accepted = isImp029AcceptanceCheckpoint(roadmap, state);
    const imp029Started =
      isImp029ImplementationStartCheckpoint(roadmap, state) || imp029Accepted;
    if (imp029Accepted) {
      if (!/IMP-029:\s*COMPLETE_AND_ACCEPTED/.test(state.text)) {
        fail("IMP029_STATE_ACCEPTED", "STATE must record IMP-029 COMPLETE_AND_ACCEPTED");
      } else {
        note("IMP-029 COMPLETE_AND_ACCEPTED");
      }
    } else if (imp029Started) {
      if (!/IMP-029:\s*IMPLEMENTATION_IN_PROGRESS/.test(state.text)) {
        fail("IMP029_STATE_IN_PROGRESS", "STATE must record IMP-029 IMPLEMENTATION_IN_PROGRESS");
      } else {
        note("IMP-029 IMPLEMENTATION_IN_PROGRESS");
      }
    } else if (!/IMP-029:\s*(?:IMPLEMENTATION_AUTHORIZED|ARCHITECTURE_LOCKED|NOT_STARTED)/.test(state.text) && !/IMP-029 remains not started/.test(state.text)) {
      fail("IMP029_STATE_STARTED", "STATE must record IMP-029 NOT_STARTED");
    } else {
      note("IMP-029 remains NOT_STARTED");
    }
    const imp029Authorized =
      isImp029ImplementationAuthorizationCheckpoint(roadmap, state) || imp029Started;
    if (!new RegExp(`IMP-029_IMPLEMENTATION_AUTHORIZED:\\s*${imp029Authorized ? "YES" : "NO"}`).test(state.text)) {
      fail(
        "IMP029_STATE_AUTHORIZATION",
        `STATE must record IMP-029_IMPLEMENTATION_AUTHORIZED: ${imp029Authorized ? "YES" : "NO"}`,
      );
    }
    if (!/pendingAcceptance=NONE/.test(state.text) && !/Pending Acceptance:\s+NONE/.test(state.text)) {
      fail(
        "IMP028_STATE_OLDEST_PENDING",
        "STATE must explain that pendingAcceptance=NONE after IMP-028 acceptance",
      );
    }
    const ati = state.text.split("## 3. Accepted Technical Inventory")[1]?.split("## 4.")[0] || "";
    if (!/`0018_payment_provider_event_inbox`/.test(ati) && !/0018_payment_provider_event_inbox/.test(ati)) {
      fail(
        "IMP026_ATI_BOUNDED",
        "Accepted Technical Inventory must include accepted IMP-026 migration 0018_payment_provider_event_inbox",
      );
    } else {
      note("Accepted Technical Inventory includes IMP-026 migration 0018_payment_provider_event_inbox");
    }
    if (!/0019_refund/.test(ati)) {
      fail(
        "IMP027_ATI_MISSING",
        "Accepted Technical Inventory must include accepted IMP-027 migration 0019_refund",
      );
    }
    if (
      !/0020_financial_document/.test(ati) ||
      !/0029_refund_statutory_issuance_allocation/.test(ati)
    ) {
      fail(
        "IMP028_ATI_MISSING",
        "Accepted Technical Inventory must include accepted IMP-028 migrations 0020_financial_document through 0029_refund_statutory_issuance_allocation",
      );
    } else {
      note("Accepted Technical Inventory includes accepted IMP-028 migrations through 0029");
    }
  }

  if (architecture) {
    if (!/IMP-028-invoice-tax-receipt-credit-note\.md/.test(architecture.text)) {
      fail(
        "IMP028_ARCH_ARTIFACT",
        "ARCHITECTURE.md must reference IMP-028 capability architecture artifact",
      );
    } else {
      note("ARCHITECTURE.md references IMP-028 capability artifact");
    }
    if (
      !/ARCH-G16/.test(architecture.text) ||
      !/ARCH-G17/.test(architecture.text) ||
      !/ARCH-G18/.test(architecture.text) ||
      !/D-365/.test(architecture.text) ||
      !/D-366/.test(architecture.text) ||
      !/D-367/.test(architecture.text)
    ) {
      fail(
        "IMP028_ARCH_INVARIANTS",
        "ARCHITECTURE.md must record ARCH-G16/ARCH-G17/ARCH-G18 and D-365/D-366/D-367 for Financial Document / refund statutory / signing authority",
      );
    } else {
      note("ARCHITECTURE.md records ARCH-G16 / ARCH-G17 / ARCH-G18 / D-365 / D-366 / D-367");
    }
    const expectedArchitectureVersion = isImp031ArchitectureDraftCheckpoint(roadmap, state) ||
      isImp031ArchitectureLockCheckpoint(roadmap, state) ||
      isImp031ImplementationAuthorizationCheckpoint(roadmap, state) ||
      isImp031ImplementationStartCheckpoint(roadmap, state)
      ? "ARCH-R18"
      : isArchR17GovernanceCheckpoint(roadmap, state)
        ? "ARCH-R17"
        : "ARCH-R16";
    if (architecture.meta.architectureVersion !== expectedArchitectureVersion) {
      fail(
        "IMP028_ARCH_VERSION",
        `ARCHITECTURE must be ${expectedArchitectureVersion} for the current architecture checkpoint, got ${architecture.meta.architectureVersion}`,
      );
    }
    if (!/ARCH-G19/.test(architecture.text) || !/D-368/.test(architecture.text)) {
      fail(
        "D368_ARCH_INVARIANTS",
        "ARCHITECTURE.md must record ARCH-G19 and D-368 for Customer Menu Read Projection Authority",
      );
    } else {
      note("ARCHITECTURE.md records ARCH-G19 / D-368");
    }
    if (!/ARCH-G20/.test(architecture.text) || !/D-369/.test(architecture.text)) {
      fail(
        "D369_ARCH_INVARIANTS",
        "ARCHITECTURE.md must record ARCH-G20 and D-369 for Customer Paid Modifier Explicit Selection Authority",
      );
    } else {
      note("ARCHITECTURE.md records ARCH-G20 / D-369");
    }
    if (!/ARCH-G21/.test(architecture.text) || !/D-370/.test(architecture.text)) {
      fail(
        "D370_ARCH_INVARIANTS",
        "ARCHITECTURE.md must record ARCH-G21 and D-370 for Cart Identity Transition Authority",
      );
    } else {
      note("ARCHITECTURE.md records ARCH-G21 / D-370");
    }
    if (!/ARCH-G22/.test(architecture.text) || !/D-371/.test(architecture.text)) {
      fail("D371_ARCH_INVARIANTS", "ARCHITECTURE.md must record ARCH-G22 and D-371 for Durable Cart Unit Sequence Authority");
    } else {
      note("ARCHITECTURE.md records ARCH-G22 / D-371");
    }
  }

  if (decision) {
    const expectedDecisionRegisterVersion = isArchR17GovernanceCheckpoint(roadmap, state) ||
      isImp031ArchitectureDraftCheckpoint(roadmap, state) ||
      isImp031ArchitectureLockCheckpoint(roadmap, state) ||
      isImp031ImplementationAuthorizationCheckpoint(roadmap, state) ||
      isImp031ImplementationStartCheckpoint(roadmap, state)
      ? "DR-14"
      : "DR-13";
    if (decision.meta.decisionRegisterVersion !== expectedDecisionRegisterVersion) {
      fail(
        "IMP028_DR_VERSION",
        `Decision register must be ${expectedDecisionRegisterVersion} for the current architecture checkpoint, got ${decision.meta.decisionRegisterVersion}`,
      );
    }
  }
}

function checkImp028aImplementationAuthorization(roadmap, state) {
  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const artifactRel = "docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP028A_CAPABILITY_MISSING", `Missing canonical capability definition at ${artifactRel}`);
    return;
  }
  const artifactText = readFileSync(artifact, "utf8");
  note(`IMP-028A canonical capability present (${artifactRel})`);

  if (!/"implementationAuthorized":\s*true/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_AUTHORIZED",
      "IMP-028A capability artifact must record implementationAuthorized: true",
    );
  }
  if (!/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_LOCK",
      "IMP-028A capability artifact must declare architectureLock ARCHITECTURE_LOCKED",
    );
  }
  if (!/"implementation":\s*"COMPLETE_AND_ACCEPTED"/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_ACCEPTED_IMPL",
      "IMP-028A capability artifact must declare implementation COMPLETE_AND_ACCEPTED",
    );
  }
  if (!/IMP-028A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_AUTH_TOKEN",
      "IMP-028A capability artifact must record IMP-028A_IMPLEMENTATION_AUTHORIZED: YES",
    );
  }
  if (!/IMP-028A_IMPLEMENTATION_STARTED:\s*YES/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_STARTED_TOKEN",
      "IMP-028A capability artifact must record IMP-028A_IMPLEMENTATION_STARTED: YES",
    );
  }
  if (!/IMP-028A_IMPLEMENTATION_COMPLETE:\s*YES/.test(artifactText)) {
    fail(
      "IMP028A_CAPABILITY_COMPLETE_TOKEN",
      "IMP-028A capability artifact must record IMP-028A_IMPLEMENTATION_COMPLETE: YES",
    );
  }
  if (!/IMP-028A_ACCEPTED:\s*YES/.test(artifactText)) {
    fail("IMP028A_CAPABILITY_ACCEPTED", "IMP-028A capability artifact must record IMP-028A_ACCEPTED: YES");
  }
  if (/D-371/.test(artifactText) && /NEW_DECISION:\s*D-371/.test(artifactText)) {
    fail("IMP028A_D371", "IMP-028A must not create D-371");
  }
  if (!/Food Direct UX Foundation/.test(artifactText)) {
    fail("IMP028A_TITLE", "IMP-028A capability artifact must use title Food Direct UX Foundation");
  }
  if (!/\*\*AC-01\*\*/.test(artifactText) || !/\*\*AC-12\*\*/.test(artifactText)) {
    fail("IMP028A_AC_PRESERVED", "IMP-028A capability artifact must retain AC-01 through AC-12");
  }
  if (
    !/TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED/.test(artifactText) ||
    !/CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT/.test(artifactText)
  ) {
    fail(
      "IMP028A_ACCEPTANCE_LIMITATIONS",
      "IMP-028A capability artifact must preserve typecheck and customer-ordering environment limitations",
    );
  }

  if (roadmap) {
    if (!/IMP-028A-food-direct-ux-foundation\.md/.test(roadmap.text)) {
      fail(
        "IMP028A_ROADMAP_ARTIFACT",
        "ROADMAP must reference the IMP-028A canonical capability artifact",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028A_ROADMAP_AUTHORIZED",
        "ROADMAP must record IMP-028A_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_STARTED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028A_ROADMAP_STARTED",
        "ROADMAP must record IMP-028A_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_COMPLETE:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028A_ROADMAP_COMPLETE",
        "ROADMAP must record IMP-028A_IMPLEMENTATION_COMPLETE: YES",
      );
    }
    if (!/IMP-028A_ACCEPTED:\s*YES/.test(roadmap.text)) {
      fail("IMP028A_ROADMAP_ACCEPTED_TOKEN", "ROADMAP must record IMP-028A_ACCEPTED: YES");
    }
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-028A\s*\|/.test(line),
    );
    if (futureRow) {
      fail(
        "IMP028A_ROADMAP_FUTURE",
        "ROADMAP future ledger must not retain IMP-028A after acceptance",
      );
    } else {
      note("IMP-028A removed from ROADMAP future ledger after acceptance");
    }
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-028A\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP028A_ROADMAP_LIFECYCLE",
        "ROADMAP accepted ledger must list IMP-028A as COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-028A ROADMAP lifecycle COMPLETE_AND_ACCEPTED");
    }
    const imp029Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-029\s*\|/.test(line),
    );
    if (
      !isImp029ArchitectureLockCheckpoint(roadmap, state) &&
      !isImp029AcceptanceCheckpoint(roadmap, state) &&
      (!imp029Row || !imp029Row.includes("Operations Console API") || !imp029Row.includes("PLANNED"))
    ) {
      fail(
        "IMP029_ROADMAP_PRESERVED",
        "ROADMAP future ledger must keep IMP-029 Operations Console API PLANNED",
      );
    }
  }

  if (state) {
    if (!/IMP-028A-food-direct-ux-foundation\.md/.test(state.text)) {
      fail(
        "IMP028A_STATE_ARTIFACT",
        "STATE must reference the IMP-028A canonical capability artifact",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
      fail(
        "IMP028A_STATE_AUTHORIZED",
        "STATE must record IMP-028A_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_STARTED:\s*YES/.test(state.text)) {
      fail(
        "IMP028A_STATE_STARTED",
        "STATE must record IMP-028A_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028A_IMPLEMENTATION_COMPLETE:\s*YES/.test(state.text)) {
      fail(
        "IMP028A_STATE_COMPLETE",
        "STATE must record IMP-028A_IMPLEMENTATION_COMPLETE: YES",
      );
    }
    if (
      !/IMP-028A:\s*COMPLETE_AND_ACCEPTED/.test(state.text) &&
      !/IMP-028A:\s+COMPLETE_AND_ACCEPTED/.test(blob)
    ) {
      fail(
        "IMP028A_STATE_LIFECYCLE",
        "STATE must record IMP-028A COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-028A is COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-028A_ACCEPTED:\s*YES/.test(state.text)) {
      fail("IMP028A_STATE_ACCEPTED", "STATE must mark IMP-028A accepted");
    }
    if (
      !/TYPECHECK_STATUS:\s*FAIL_PRE_EXISTING_UNRELATED/.test(state.text) ||
      !/CUSTOMER_ORDERING_E2E:\s*BLOCKED_ENVIRONMENT/.test(state.text)
    ) {
      fail(
        "IMP028A_STATE_LIMITATIONS",
        "STATE must preserve IMP-028A typecheck and customer-ordering environment limitations",
      );
    }
  }
}

function checkImp028bCanonicalActivation(roadmap, state) {
  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const artifactRel = "docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP028B_CAPABILITY_MISSING", `Missing canonical capability definition at ${artifactRel}`);
    return;
  }
  const artifactText = readFileSync(artifact, "utf8");
  note(`IMP-028B canonical capability present (${artifactRel})`);

  if (!/"implementationAuthorized":\s*true/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_NOT_AUTHORIZED",
      "IMP-028B capability artifact must record implementationAuthorized: true",
    );
  }
  if (!/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_NOT_LOCKED",
      "IMP-028B capability artifact must declare architectureLock ARCHITECTURE_LOCKED",
    );
  }
  if (!/"implementation":\s*"COMPLETE_AND_ACCEPTED"/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_COMPLETE_META",
      "IMP-028B capability artifact must declare implementation COMPLETE_AND_ACCEPTED",
    );
  }
  if (!/IMP-028B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_AUTH_TOKEN",
      "IMP-028B capability artifact must record IMP-028B_IMPLEMENTATION_AUTHORIZED: YES",
    );
  }
  if (!/IMP-028B_IMPLEMENTATION_STARTED:\s*YES/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_STARTED_TOKEN",
      "IMP-028B capability artifact must record IMP-028B_IMPLEMENTATION_STARTED: YES",
    );
  }
  if (!/IMP-028B_IMPLEMENTATION_COMPLETE:\s*YES/.test(artifactText)) {
    fail(
      "IMP028B_CAPABILITY_COMPLETE_TOKEN",
      "IMP-028B capability artifact must record IMP-028B_IMPLEMENTATION_COMPLETE: YES",
    );
  }
  if (!/IMP-028B_ACCEPTED:\s*YES/.test(artifactText)) {
    fail("IMP028B_CAPABILITY_ACCEPTED", "IMP-028B capability artifact must record IMP-028B_ACCEPTED: YES");
  }
  if (!/FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText) || !/FOUNDER_UAT:\s*PASS/.test(artifactText)) {
    fail("IMP028B_FOUNDER_UAT", "IMP-028B capability artifact must record required founder UAT PASS");
  }
  if (!/FOUNDER_UAT_CANDIDATE_HEAD:\s*ddca0c319a5e80b2cfe38a2c32481b636277010e/.test(artifactText)) {
    fail("IMP028B_FOUNDER_UAT_HEAD", "IMP-028B founder UAT evidence must record the accepted HEAD");
  }
  if (!/FOUNDER_UAT_CANDIDATE_FINGERPRINT:\s*1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7/.test(artifactText)) {
    fail("IMP028B_FOUNDER_UAT_FINGERPRINT", "IMP-028B founder UAT evidence must record the accepted fingerprint");
  }
  if (/D-371/.test(artifactText) && /NEW_DECISION:\s*D-371/.test(artifactText)) {
    fail("IMP028B_D371", "IMP-028B must not create D-371");
  }
  if (!/GET \/api\/v1\/menu/.test(artifactText)) {
    fail("IMP028B_ROUTE", "IMP-028B capability artifact must lock GET /api/v1/menu");
  }
  if (!/Customer Menu Projection \+ Discovery/.test(artifactText)) {
    fail("IMP028B_TITLE", "IMP-028B capability artifact must use title Customer Menu Projection + Discovery");
  }
  if (!/\*\*AC-01\*\*/.test(artifactText) || !/\*\*AC-12\*\*/.test(artifactText)) {
    fail("IMP028B_AC_PRESERVED", "IMP-028B capability artifact must retain AC-01 through AC-12");
  }
  if (!/D-368/.test(artifactText) || !/ARCH-G19/.test(artifactText)) {
    fail("IMP028B_D368", "IMP-028B capability artifact must preserve D-368 / ARCH-G19");
  }

  if (roadmap) {
    if (!/IMP-028B-customer-menu-projection-and-discovery\.md/.test(roadmap.text)) {
      fail(
        "IMP028B_ROADMAP_ARTIFACT",
        "ROADMAP must reference the IMP-028B canonical capability artifact",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028B_ROADMAP_AUTHORIZED",
        "ROADMAP must record IMP-028B_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_STARTED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028B_ROADMAP_STARTED",
        "ROADMAP must record IMP-028B_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_COMPLETE:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028B_ROADMAP_COMPLETE",
        "ROADMAP must record IMP-028B_IMPLEMENTATION_COMPLETE: YES",
      );
    }
    if (!/IMP-028B_ACCEPTED:\s*YES/.test(roadmap.text)) {
      fail("IMP028B_ROADMAP_ACCEPTED_TOKEN", "ROADMAP must record IMP-028B_ACCEPTED: YES");
    }
    if (!/IMP-028B_ARCHITECTURE_LOCKED:\s*YES/.test(roadmap.text)) {
      fail(
        "IMP028B_ROADMAP_LOCK",
        "ROADMAP must record IMP-028B_ARCHITECTURE_LOCKED: YES",
      );
    }
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const futureRow = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-028B\s*\|/.test(line),
    );
    if (
      futureRow
    ) {
      fail(
        "IMP028B_ROADMAP_LIFECYCLE",
        "ROADMAP future ledger must not list IMP-028B after acceptance",
      );
    } else {
      note("IMP-028B removed from ROADMAP future ledger after acceptance");
    }
    const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
    const acceptedRow = [...acceptedSection.split("\n")].find((line) =>
      /^\|\s*IMP-028B\s*\|/.test(line),
    );
    if (!acceptedRow || !acceptedRow.includes("Customer Menu Projection") || !acceptedRow.includes("COMPLETE_AND_ACCEPTED")) {
      fail(
        "IMP028B_ROADMAP_ACCEPTED_LEDGER",
        "ROADMAP accepted ledger must list IMP-028B Customer Menu Projection + Discovery as COMPLETE_AND_ACCEPTED",
      );
    }
    const imp029Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-029\s*\|/.test(line),
    );
    if (
      !isImp029ArchitectureLockCheckpoint(roadmap, state) &&
      !isImp029AcceptanceCheckpoint(roadmap, state) &&
      (!imp029Row || !imp029Row.includes("Operations Console API") || !imp029Row.includes("PLANNED"))
    ) {
      fail(
        "IMP029_ROADMAP_PRESERVED",
        "ROADMAP future ledger must keep IMP-029 Operations Console API PLANNED",
      );
    }
  }

  if (state) {
    if (!/IMP-028B-customer-menu-projection-and-discovery\.md/.test(state.text)) {
      fail(
        "IMP028B_STATE_ARTIFACT",
        "STATE must reference the IMP-028B canonical capability artifact",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(state.text)) {
      fail(
        "IMP028B_STATE_AUTHORIZED",
        "STATE must record IMP-028B_IMPLEMENTATION_AUTHORIZED: YES",
      );
    }
    if (!/IMP-028B_ARCHITECTURE_LOCKED:\s*YES/.test(state.text)) {
      fail(
        "IMP028B_STATE_LOCK",
        "STATE must record IMP-028B_ARCHITECTURE_LOCKED: YES",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_STARTED:\s*YES/.test(state.text)) {
      fail(
        "IMP028B_STATE_STARTED",
        "STATE must record IMP-028B_IMPLEMENTATION_STARTED: YES",
      );
    }
    if (!/IMP-028B_IMPLEMENTATION_COMPLETE:\s*YES/.test(state.text)) {
      fail(
        "IMP028B_STATE_COMPLETE",
        "STATE must record IMP-028B_IMPLEMENTATION_COMPLETE: YES",
      );
    }
    if (
      !/IMP-028B:\s*COMPLETE_AND_ACCEPTED/.test(state.text) &&
      !/IMP-028B:\s+COMPLETE_AND_ACCEPTED/.test(blob)
    ) {
      fail(
        "IMP028B_STATE_LIFECYCLE",
        "STATE must record IMP-028B COMPLETE_AND_ACCEPTED",
      );
    } else {
      note("IMP-028B is COMPLETE_AND_ACCEPTED");
    }
    if (!/IMP-028B_ACCEPTED:\s*YES/.test(state.text)) {
      fail("IMP028B_STATE_ACCEPTED", "STATE must mark IMP-028B accepted");
    }
  }

  const supportingRel =
    "docs/platform/experience/slices/customer-menu-projection-and-discovery.md";
  const supporting = resolveExactRelativeFile(supportingRel);
  if (!supporting) {
    fail("IMP028B_SUPPORTING_MISSING", `Missing supporting Capability B definition at ${supportingRel}`);
  } else {
    const supportingText = readFileSync(supporting, "utf8");
    if (!/CANONICALIZED_AS\s*=\s*IMP-028B/.test(supportingText) && !/CANONICALIZED_AS:\s*IMP-028B/.test(supportingText)) {
      fail(
        "IMP028B_SUPPORTING_CANONICALIZED",
        "Supporting Capability B definition must record CANONICALIZED_AS = IMP-028B",
      );
    }
    if (!/IMP028B_IMPLEMENTATION_AUTHORIZED\s*=\s*YES/.test(supportingText) && !/IMPLEMENTATION_AUTHORIZED:\s*YES/.test(supportingText)) {
      fail(
        "IMP028B_SUPPORTING_AUTHORIZED",
        "Supporting Capability B definition must record implementation authorized",
      );
    }
    if (/IMP028B_IMPLEMENTATION_COMPLETE\s*=\s*NO/.test(supportingText)) {
      fail(
        "IMP028B_SUPPORTING_COMPLETE",
        "Supporting Capability B definition must not claim implementation incomplete after GTM-R41",
      );
    }
    if (!/IMP028B_IMPLEMENTATION_COMPLETE\s*=\s*YES/.test(supportingText)) {
      note("Supporting Capability B definition may omit IMP028B_IMPLEMENTATION_COMPLETE token");
    }
  }
}

function checkImp029ArchitectureLock(roadmap, state, architecture, decision) {
  if (!isImp029ArchitectureLockCheckpoint(roadmap, state)) return;

  const accepted = isImp029AcceptanceCheckpoint(roadmap, state);
  const started = isImp029ImplementationStartCheckpoint(roadmap, state) || accepted;
  const authorized =
    started || isImp029ImplementationAuthorizationCheckpoint(roadmap, state);
  const imp030Activated = isImp030ArchitectureCheckpoint(roadmap, state);

  const artifactRel = "docs/platform/capabilities/IMP-029-operations-console-api.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  if (!artifact) {
    fail("IMP029_CAPABILITY_MISSING", `Missing locked capability architecture at ${artifactRel}`);
  } else {
    const body = readFileSync(artifact, "utf8");
    const expectedImplementation = accepted
      ? "COMPLETE_AND_ACCEPTED"
      : started
      ? "AUTHORIZED / STARTED"
      : authorized
        ? "AUTHORIZED / NOT_STARTED"
        : "NOT_AUTHORIZED / NOT_STARTED";
    if (
      !/"capability":\s*"IMP-029"/.test(body) ||
      !/"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(body) ||
      !new RegExp(`"implementation":\\s*"${expectedImplementation.replace(/\//g, "\\/")}"`).test(body) ||
      !new RegExp(`"implementationAuthorized":\\s*${authorized}`).test(body) ||
      !/D-372/.test(body)
    ) {
      fail(
        "IMP029_CAPABILITY_LOCK",
        `IMP-029 capability artifact must record the locked D-372 architecture with implementation ${expectedImplementation}`,
      );
    } else {
      note(`IMP-029 capability architecture locked (${artifactRel})`);
    }
  }

  const blob = `${roadmap?.text ?? ""}\n${state?.text ?? ""}`;
  const requiredTokens = [
    ["IMP029_ARCHITECTURE_LOCKED", /IMP-029_ARCHITECTURE_LOCKED:\s*YES/, "IMP-029 architecture must be locked"],
    ["IMP029_AUTHORIZATION", new RegExp(`IMP-029_IMPLEMENTATION_AUTHORIZED:\\s*${authorized ? "YES" : "NO"}`), `IMP-029 implementation must be ${authorized ? "AUTHORIZED" : "NOT_AUTHORIZED"}`],
    [
      started ? "IMP029_STARTED" : "IMP029_NOT_STARTED",
      started ? /IMP-029_STARTED:\s*YES/ : /IMP-029_STARTED:\s*NO/,
      started
        ? "IMP-029 implementation must be STARTED"
        : "IMP-029 implementation must remain NOT_STARTED",
    ],
    accepted
      ? ["IMP029_ACCEPTED", /IMP-029_ACCEPTED:\s*YES/, "IMP-029 must be accepted"]
      : ["IMP029_NOT_ACCEPTED", /IMP-029_ACCEPTED:\s*NO/, "IMP-029 must remain unaccepted"],
    ...(accepted
      ? [["IMP029_COMPLETE", /IMP-029_IMPLEMENTATION_COMPLETE:\s*YES/, "IMP-029 implementation must be complete"]]
      : []),
  ];
  for (const [code, pattern, message] of requiredTokens) {
    if (!pattern.test(blob)) fail(code, message);
  }

  if (authorized && !started && roadmap && state) {
    const requiredCurrentTokens = [
      [roadmap.text, /IMP-029:\s*IMPLEMENTATION_AUTHORIZED/, "ROADMAP must record current IMP-029 lifecycle IMPLEMENTATION_AUTHORIZED"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record current IMP-029 authorization"],
      [roadmap.text, /IMP-029_STARTED:\s*NO/, "ROADMAP must record current IMP-029 not started"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record current IMP-029 incomplete"],
      [roadmap.text, /IMP-029_ACCEPTED:\s*NO/, "ROADMAP must record current IMP-029 unaccepted"],
      [state.text, /IMP-029:\s*IMPLEMENTATION_AUTHORIZED/, "STATE must record current IMP-029 lifecycle IMPLEMENTATION_AUTHORIZED"],
      [state.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record current IMP-029 authorization"],
      [state.text, /IMP-029_STARTED:\s*NO/, "STATE must record current IMP-029 not started"],
      [state.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record current IMP-029 incomplete"],
      [state.text, /IMP-029_ACCEPTED:\s*NO/, "STATE must record current IMP-029 unaccepted"],
    ];
    for (const [text, pattern, message] of requiredCurrentTokens) {
      if (!pattern.test(text)) fail("IMP029_AUTHORIZATION_CHECKPOINT", message);
    }
  }

  if (accepted && roadmap && state) {
    const requiredAcceptedTokens = [
      [roadmap.text, /IMP-029:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record current IMP-029 lifecycle COMPLETE_AND_ACCEPTED"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record current IMP-029 authorization"],
      [roadmap.text, /IMP-029_STARTED:\s*YES/, "ROADMAP must record current IMP-029 started"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*YES/, "ROADMAP must record current IMP-029 complete"],
      [roadmap.text, /IMP-029_ACCEPTED:\s*YES/, "ROADMAP must record current IMP-029 accepted"],
      [state.text, /IMP-029:\s*COMPLETE_AND_ACCEPTED/, "STATE must record current IMP-029 lifecycle COMPLETE_AND_ACCEPTED"],
      [state.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record current IMP-029 authorization"],
      [state.text, /IMP-029_STARTED:\s*YES/, "STATE must record current IMP-029 started"],
      [state.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*YES/, "STATE must record current IMP-029 complete"],
      [state.text, /IMP-029_ACCEPTED:\s*YES/, "STATE must record current IMP-029 accepted"],
    ];
    for (const [text, pattern, message] of requiredAcceptedTokens) {
      if (!pattern.test(text)) fail("IMP029_ACCEPTANCE_CHECKPOINT", message);
    }
  } else if (started && roadmap && state) {
    const requiredStartTokens = [
      [roadmap.text, /IMP-029:\s*IMPLEMENTATION_IN_PROGRESS/, "ROADMAP must record current IMP-029 lifecycle IMPLEMENTATION_IN_PROGRESS"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record current IMP-029 authorization"],
      [roadmap.text, /IMP-029_STARTED:\s*YES/, "ROADMAP must record current IMP-029 started"],
      [roadmap.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record current IMP-029 incomplete"],
      [roadmap.text, /IMP-029_ACCEPTED:\s*NO/, "ROADMAP must record current IMP-029 unaccepted"],
      [state.text, /IMP-029:\s*IMPLEMENTATION_IN_PROGRESS/, "STATE must record current IMP-029 lifecycle IMPLEMENTATION_IN_PROGRESS"],
      [state.text, /IMP-029_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record current IMP-029 authorization"],
      [state.text, /IMP-029_STARTED:\s*YES/, "STATE must record current IMP-029 started"],
      [state.text, /IMP-029_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record current IMP-029 incomplete"],
      [state.text, /IMP-029_ACCEPTED:\s*NO/, "STATE must record current IMP-029 unaccepted"],
    ];
    for (const [text, pattern, message] of requiredStartTokens) {
      if (!pattern.test(text)) fail("IMP029_START_CHECKPOINT", message);
    }
  }

  if (roadmap) {
    const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
    const imp029Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-029\s*\|/.test(line));
    const imp030Row = [...futureSection.split("\n")].find((line) => /^\|\s*IMP-030\s*\|/.test(line));
    const expectedLifecycle = accepted
      ? "COMPLETE_AND_ACCEPTED"
      : started
      ? "IMPLEMENTATION_IN_PROGRESS"
      : authorized
        ? "IMPLEMENTATION_AUTHORIZED"
        : "ARCHITECTURE_LOCKED";
    if (accepted && imp029Row) {
      fail("IMP029_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-029 after acceptance");
    } else if (!accepted && (!imp029Row || !/Operations Console API/.test(imp029Row) || !imp029Row.includes(expectedLifecycle))) {
      fail("IMP029_ROADMAP_LIFECYCLE", `ROADMAP future ledger must list IMP-029 Operations Console API as ${expectedLifecycle}`);
    }
    if (isImp030ArchitectureActivationCheckpoint(roadmap, state)) {
      const requiredImp030Tokens = [
        [roadmap.text, /IMP-030:\s*ARCHITECTURE_IN_PROGRESS/, "ROADMAP must record IMP-030 architecture in progress"],
        [roadmap.text, /IMP-030_ARCHITECTURE:\s*NOT_LOCKED/, "ROADMAP must record IMP-030 architecture not locked"],
        [roadmap.text, /IMP-030_ARCHITECTURE_LOCKED:\s*NO/, "ROADMAP must record IMP-030 architecture lock NO"],
        [roadmap.text, /IMP-030_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-030 implementation not authorized"],
        [roadmap.text, /IMP-030_STARTED:\s*NO/, "ROADMAP must record IMP-030 not started"],
        [roadmap.text, /IMP-030_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-030 incomplete"],
        [roadmap.text, /IMP-030_ACCEPTED:\s*NO/, "ROADMAP must record IMP-030 unaccepted"],
        [state.text, /IMP-030:\s*ARCHITECTURE_IN_PROGRESS/, "STATE must record IMP-030 architecture in progress"],
        [state.text, /IMP-030_ARCHITECTURE:\s*NOT_LOCKED/, "STATE must record IMP-030 architecture not locked"],
        [state.text, /IMP-030_ARCHITECTURE_LOCKED:\s*NO/, "STATE must record IMP-030 architecture lock NO"],
        [state.text, /IMP-030_IMPLEMENTATION_AUTHORIZED:\s*NO/, "STATE must record IMP-030 implementation not authorized"],
        [state.text, /IMP-030_STARTED:\s*NO/, "STATE must record IMP-030 not started"],
        [state.text, /IMP-030_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-030 incomplete"],
        [state.text, /IMP-030_ACCEPTED:\s*NO/, "STATE must record IMP-030 unaccepted"],
      ];
      for (const [text, pattern, message] of requiredImp030Tokens) {
        if (!pattern.test(text)) fail("IMP030_ARCHITECTURE_ACTIVATION", message);
      }
      const prematureImp030Patterns = [
        /IMP-030_ARCHITECTURE_LOCKED:\s*YES/,
        /IMP-030_IMPLEMENTATION_AUTHORIZED:\s*YES/,
        /IMP-030_STARTED:\s*YES/,
        /IMP-030_IMPLEMENTATION_COMPLETE:\s*YES/,
        /IMP-030_ACCEPTED:\s*YES/,
      ];
      for (const text of [roadmap.text, state.text]) {
        if (prematureImp030Patterns.some((pattern) => pattern.test(text))) {
          fail("IMP030_PREMATURE_PROGRESSION", "IMP-030 must not progress beyond architecture activation");
        }
      }
      if (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/ARCHITECTURE_IN_PROGRESS/.test(imp030Row)) {
        fail("IMP030_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-030 Operations Console UI as ARCHITECTURE_IN_PROGRESS");
      }
      if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*PLANNED/.test(futureSection)) {
        fail("IMP031_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-031 Provider-Neutral Delivery Foundation PLANNED");
      }
      if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
        fail("IMP030_D373_CREATED", "D-373 must not be created during IMP-030 architecture activation");
      }
    } else if (!isImp030ArchitectureLockCheckpoint(roadmap, state) && (!imp030Row || !/Operations Console UI/.test(imp030Row) || !/PLANNED/.test(imp030Row) ||
      /IMP-030_(?:IMPLEMENTATION_AUTHORIZED|STARTED):\s*YES/.test(roadmap.text))) {
      fail("IMP030_ROADMAP_NOT_ACTIVATED", "ROADMAP future ledger must keep IMP-030 Operations Console UI PLANNED");
    }
  }

  if (state) {
    const expectedLifecycle = accepted
      ? "COMPLETE_AND_ACCEPTED"
      : started
      ? "IMPLEMENTATION_IN_PROGRESS"
      : authorized
        ? "IMPLEMENTATION_AUTHORIZED"
        : "ARCHITECTURE_LOCKED";
    if (!new RegExp(`IMP-029:\\s*${expectedLifecycle}`).test(state.text) || !/IMP-029_ARCHITECTURE:\s*LOCKED/.test(state.text)) {
      fail("IMP029_STATE_LIFECYCLE", `STATE must record IMP-029 ${expectedLifecycle} with architecture LOCKED`);
    }
    if (
      (accepted && (state.meta.acceptedThrough !== "IMP-029" || state.meta.currentProductSlice !== (imp030Activated ? "IMP-030" : "NONE") || state.meta.pendingAcceptance !== "NONE" || state.meta.nextProductSlice !== (imp030Activated ? "IMP-031" : "IMP-030"))) ||
      (!accepted && (state.meta.acceptedThrough !== "IMP-028D" || state.meta.pendingAcceptance !== "NONE"))
    ) {
      fail("IMP029_STATE_POSITION", accepted
        ? `STATE must record acceptedThrough IMP-029, currentProductSlice ${imp030Activated ? "IMP-030" : "NONE"}, nextProductSlice ${imp030Activated ? "IMP-031" : "IMP-030"}, and pendingAcceptance NONE`
        : "STATE must retain acceptedThrough IMP-028D and pendingAcceptance NONE");
    }
  }

  if (architecture) {
    if (
      architecture.meta.architectureVersion !== "ARCH-R17" ||
      !/ARCH-G23/.test(architecture.text) ||
      !/D-372/.test(architecture.text)
    ) {
      fail("IMP029_ARCHITECTURE_LOCK", "ARCH-R17 must record ARCH-G23 and D-372");
    }
  }

  if (decision && decision.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP029_DECISION_VERSION", "IMP-029 architecture lock requires decision register DR-14");
  }
}

function checkImp030ArchitectureLock(roadmap, state, architecture, decision) {
  if (!isImp030ArchitectureLockCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*false/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText);
  const checkpoint = evaluateImp030ArchitectureLockDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 capability architecture locked (${artifactRel})`);
}

function checkImp030ImplementationAuthorization(roadmap, state, architecture, decision) {
  if (!isImp030ImplementationAuthorizationCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*true/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText) &&
    !/"bindingDecisions":\s*\[[^\]]*D-373/.test(artifactText);
  const checkpoint = evaluateImp030ImplementationAuthorizationDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
    artifactText,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 implementation authorized (${artifactRel})`);
}

function checkImp030ImplementationStart(roadmap, state, architecture, decision) {
  if (!isImp030ImplementationStartCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*true/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText) &&
    !/"bindingDecisions":\s*\[[^\]]*D-373/.test(artifactText);
  const checkpoint = evaluateImp030ImplementationStartDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
    artifactText,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 implementation started (${artifactRel})`);
}

function checkImp030DetailRouteAmendment(roadmap, state, architecture, decision) {
  if (!isImp030DetailRouteAmendmentCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"status":\s*"CURRENT"/.test(artifactText) &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*true/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText) &&
    !/"bindingDecisions":\s*\[[^\]]*D-373/.test(artifactText);
  const checkpoint = evaluateImp030DetailRouteAmendmentDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
    artifactText,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 detail route architecture amended (${artifactRel})`);
}

function checkImp030CanonicalConsistency(roadmap, state, architecture, decision) {
  if (!isImp030CanonicalConsistencyCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"status":\s*"CURRENT"/.test(artifactText) &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"AUTHORIZED \/ STARTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*true/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText) &&
    !/"bindingDecisions":\s*\[[^\]]*D-373/.test(artifactText);
  const checkpoint = evaluateImp030CanonicalConsistencyDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
    artifactText,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 canonical consistency repaired (${artifactRel})`);
}

function checkImp030Acceptance(roadmap, state, architecture, decision) {
  if (!isImp030AcceptanceCheckpoint(roadmap, state)) return;

  const artifactRel = "docs/platform/capabilities/IMP-030-operations-console-ui.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValid = artifact !== null &&
    /"status":\s*"CURRENT"/.test(artifactText) &&
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/.test(artifactText) &&
    /"capability":\s*"IMP-030"/.test(artifactText) &&
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/.test(artifactText) &&
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/.test(artifactText) &&
    /"implementationAuthorized":\s*true/.test(artifactText) &&
    /"bindingDecisions":\s*\["D-372"\]/.test(artifactText) &&
    /"dependsOn":\s*\["IMP-029"\]/.test(artifactText) &&
    /IMP-030_ACCEPTED:\s*YES/.test(artifactText) &&
    /IMP-030_IMPLEMENTATION_COMPLETE:\s*YES/.test(artifactText) &&
    !/"bindingDecisions":\s*\[[^\]]*D-373/.test(artifactText);
  const checkpoint = evaluateImp030AcceptanceDocuments({
    roadmap,
    state,
    architecture,
    decision,
    artifact: artifactValid,
    artifactText,
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-030 COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp031ArchitectureActivation(roadmap, state) {
  if (!isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Activation")) return;
  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const checkpoint = evaluateImp031ArchitectureActivationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*ARCHITECTURE_IN_PROGRESS/.test(lifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    roadmapLifecycle: /IMP-031:\s*ARCHITECTURE_IN_PROGRESS/.test(roadmap.text) ? "ARCHITECTURE_IN_PROGRESS" : "",
    stateLifecycle: /IMP-031:\s*ARCHITECTURE_IN_PROGRESS/.test(state.text) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*NOT_LOCKED/.test(lifecycleText) ? "NOT_LOCKED" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(lifecycleText) ? "NO" : "",
    started: /IMP-031_STARTED:\s*NO/.test(lifecycleText) ? "NO" : "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note("IMP-031 architecture activation lifecycle valid");
}

function checkImp031ArchitectureDraft(roadmap, state, architecture, decision) {
  if (!isImp031ArchitectureDraftCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031ArchitectureDraftArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;

  const checkpoint = evaluateImp031ArchitectureDraftCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*ARCHITECTURE_IN_PROGRESS/.test(lifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*NOT_LOCKED/.test(lifecycleText) ? "NOT_LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(artifactText) ? "NO" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(lifecycleText) ? "NO" : "",
    started: /IMP-031_STARTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 reviewable architecture draft valid (${artifactRel})`);
}

function checkImp031ArchitectureLock(roadmap, state, architecture, decision) {
  if (!isImp031ArchitectureLockCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031ArchitectureLockArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";

  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*ARCHITECTURE_LOCKED/.test(futureSection)) {
    fail("IMP031_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-031 Provider-Neutral Delivery Foundation as ARCHITECTURE_LOCKED");
  }

  const premature = [
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
  ];
  for (const text of [roadmap.text, state.text]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP031_PREMATURE_PROGRESSION", "IMP-031 lock must keep implementation unauthorized and unstarted");
      break;
    }
  }

  const checkpoint = evaluateImp031ArchitectureLockCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*ARCHITECTURE_LOCKED/.test(lifecycleText) ? "ARCHITECTURE_LOCKED" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(lifecycleText) ? "NO" : "",
    started: /IMP-031_STARTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 capability architecture locked (${artifactRel})`);
}

function checkImp031ImplementationAuthorization(roadmap, state, architecture, decision) {
  if (!isImp031ImplementationAuthorizationCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031ImplementationAuthorizationArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";

  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*IMPLEMENTATION_AUTHORIZED/.test(futureSection)) {
    fail("IMP031_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-031 Provider-Neutral Delivery Foundation as IMPLEMENTATION_AUTHORIZED");
  }

  const premature = [
    /IMP-031_STARTED:\s*YES/,
    /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/,
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/,
  ];
  for (const text of [roadmap.text, state.text]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP031_PREMATURE_PROGRESSION", "IMP-031 authorization must keep implementation unstarted");
      break;
    }
  }

  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const currentStateAcceptance = (() => {
    const start = state.text.indexOf("## 5. Acceptance Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();
  const currentStateActivity = (() => {
    const start = state.text.indexOf("## 2. Current Work Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();

  if (
    !/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) ||
    !/IMP-031_STARTED:\s*NO/.test(currentRoadmapSection) ||
    !/IMP-031_STARTED:\s*NO/.test(currentStateAcceptance)
  ) {
    fail("IMP031_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-031 AUTHORIZED / NOT_STARTED");
  }

  if (!/implementation AUTHORIZED \/ NOT_STARTED/.test(currentStateActivity)) {
    fail("IMP031_STATE_ACTIVITY", "STATE current governance activity must record implementation AUTHORIZED / NOT_STARTED");
  }

  const crossDocument = evaluateImp031ImplementationAuthorizationCrossDocumentAlignment({
    architectureText: architecture?.text ?? "",
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp031ImplementationAuthorizationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*IMPLEMENTATION_AUTHORIZED/.test(lifecycleText) ? "IMPLEMENTATION_AUTHORIZED" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-031_STARTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-031_STARTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    boundaryC: /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/.test(artifactText) &&
      /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/.test(artifactText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 implementation authorized (${artifactRel})`);
}

function checkImp031ImplementationStart(roadmap, state, architecture, decision) {
  if (!isImp031ImplementationStartCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031ImplementationStartArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";

  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*IMPLEMENTATION_IN_PROGRESS/.test(futureSection)) {
    fail("IMP031_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-031 Provider-Neutral Delivery Foundation as IMPLEMENTATION_IN_PROGRESS");
  }

  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const currentStateAcceptance = (() => {
    const start = state.text.indexOf("## 5. Acceptance Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();
  const currentStateActivity = (() => {
    const start = state.text.indexOf("## 2. Current Work Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();

  if (
    !/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) ||
    !/IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-031_STARTED:\s*YES/.test(currentStateAcceptance) ||
    !/IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) ||
    !/IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance)
  ) {
    fail("IMP031_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-031 AUTHORIZED / STARTED / IMPLEMENTATION_IN_PROGRESS");
  }

  if (!/implementation AUTHORIZED \/ STARTED/.test(currentStateActivity)) {
    fail("IMP031_STATE_ACTIVITY", "STATE current governance activity must record implementation AUTHORIZED / STARTED");
  }

  const crossDocument = evaluateImp031ImplementationStartCrossDocumentAlignment({
    architectureText: architecture?.text ?? "",
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp031ImplementationStartCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/.test(lifecycleText) ? "IMPLEMENTATION_IN_PROGRESS" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/.test(lifecycleText) ? "AUTHORIZED / STARTED" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    boundaryC: /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/.test(artifactText) &&
      /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/.test(artifactText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 implementation started (${artifactRel})`);
}

function checkTechnicalInventory() {
  const journalPath = path.join(projectRoot, "drizzle/meta/_journal.json");
  if (!existsSync(journalPath)) {
    fail("JOURNAL_MISSING", "drizzle/meta/_journal.json missing");
    return;
  }
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries = journal.entries || [];
  const latest = entries[entries.length - 1];
  if (!latest || latest.tag !== "0030_cart_unit_sequence") {
    fail(
      "LATEST_MIGRATION",
      `Expected latest migration tag 0030_cart_unit_sequence, got ${latest && latest.tag}`,
    );
  } else {
    note("Latest migration tag 0030_cart_unit_sequence");
  }
  const sqlFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) => f.endsWith(".sql"));
  if (sqlFiles.length !== 31 || entries.length !== 31) {
    fail(
      "MIGRATION_COUNT",
      `Expected 31 migrations, got sql=${sqlFiles.length} journal=${entries.length}`,
    );
  } else {
    note("Migration count 31");
  }

  // Application tables
  const schemaDir = path.join(projectRoot, "src/platform/database/schema");
  let tableCount = 0;
  for (const name of readdirSync(schemaDir)) {
    if (!name.endsWith(".ts")) continue;
    const t = readFileSync(path.join(schemaDir, name), "utf8");
    tableCount += [...t.matchAll(/appSchema\.table\(/g)].length;
  }
  if (tableCount !== 109) {
    fail("TABLE_COUNT", `Expected 109 appSchema.table declarations, got ${tableCount}`);
  } else {
    note("Application table count 109");
  }

  const catalog = readFileSync(path.join(projectRoot, "src/shared/access-control/catalog.ts"), "utf8");
  const permMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\];/);
  const roleMatch = catalog.match(/export const ROLE_KEYS = \[([\s\S]*?)\];/);
  const perms = permMatch ? [...permMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  const roles = roleMatch ? [...roleMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  if (perms.length !== 57) fail("PERMISSION_COUNT", `Expected 57 permissions, got ${perms.length}`);
  else note("Permission count 57");
  if (roles.length !== 7) fail("ROLE_COUNT", `Expected 7 roles, got ${roles.length}`);
  else note("Role count 7");

  // Default docker services: top-level compose services without profiles, before volumes:
  const compose = readFileSync(path.join(projectRoot, "compose.yaml"), "utf8");
  const servicesSection = compose.split(/^volumes:/m)[0] || compose;
  const services = [];
  let current = null;
  let currentHasProfile = false;
  for (const line of servicesSection.split(/\r?\n/)) {
    const svc = line.match(/^  ([a-z0-9-]+):\s*$/);
    if (svc) {
      if (current && !currentHasProfile) services.push(current);
      current = svc[1];
      currentHasProfile = false;
      continue;
    }
    if (current && /^\s+profiles:/.test(line)) currentHasProfile = true;
  }
  if (current && !currentHasProfile) services.push(current);
  const defaultServices = services.filter((s) =>
    [
      "postgres",
      "app",
      "customer-auth",
      "workforce-auth",
      "customer-commerce",
      "operations",
    ].includes(s),
  );
  if (defaultServices.length !== 6 || services.length !== 6) {
    fail(
      "DOCKER_DEFAULT_COUNT",
      `Expected exactly 6 default services [postgres, app, customer-auth, workforce-auth, customer-commerce, operations], found [${services.join(", ")}]`,
    );
  } else {
    note("Default Docker service count 6");
  }
}

function checkStaticWeb() {
  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  if (!existsSync(nextConfigPath)) {
    fail("NEXT_CONFIG_MISSING", "next.config.ts missing");
    return;
  }
  const nextConfig = readFileSync(nextConfigPath, "utf8");
  if (!/output:\s*"export"/.test(nextConfig)) {
    fail("STATIC_EXPORT", 'next.config.ts must set output: "export"');
  } else {
    note('Next.js static export (output: "export") verified');
  }

  const apiDir = path.join(projectRoot, "src/app/api");
  if (existsSync(apiDir) && statSync(apiDir).isDirectory()) {
    // Allow empty or non-commerce trees only if no production route handlers for commerce
    const walk = (dir) => {
      const out = [];
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(p));
        else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
      }
      return out;
    };
    const files = walk(apiDir);
    if (files.length > 0) {
      fail(
        "APP_API_PRESENT",
        `Unexpected production files under src/app/api: ${files.map((f) => path.relative(projectRoot, f)).join(", ")}`,
      );
    } else {
      note("src/app/api has no production route files");
    }
  } else {
    note("No src/app/api production commerce tree");
  }
}

function checkAgentsPointer() {
  const agents = path.join(projectRoot, "AGENTS.md");
  if (!existsSync(agents)) {
    fail("AGENTS_MISSING", "AGENTS.md missing");
    return;
  }
  const text = readFileSync(agents, "utf8");
  for (const needle of ["VISION.md", "ROADMAP.md", "STATE.md", "ARCHITECTURE.md", "decision-register.md", "ALIGNMENT_GATE"]) {
    if (!text.includes(needle)) fail("AGENTS_POINTER", `AGENTS.md missing required pointer/content: ${needle}`);
  }
  if (/implementation-roadmap\.md/.test(text) && !/SUPERSEDED|not an independent roadmap/i.test(text)) {
    // soft: AGENTS should not treat implementation-roadmap as current
    if (/order fixed by\s*`?docs\/platform\/implementation-roadmap/i.test(text)) {
      fail("AGENTS_STALE_ROADMAP", "AGENTS.md still treats implementation-roadmap.md as sequencing authority");
    }
  }
  note("AGENTS.md points at canonical authorities");
}

function checkSupersededRoadmap() {
  const p = resolvePlatformDoc("docs/platform/implementation-roadmap.md");
  if (!existsSync(p)) {
    fail("HISTORICAL_ROADMAP_MISSING", "implementation-roadmap.md missing (should remain as SUPERSEDED history)");
    return;
  }
  const text = readFileSync(p, "utf8");
  if (!/SUPERSEDED/i.test(text) || !/ROADMAP\.md/.test(text)) {
    fail("HISTORICAL_ROADMAP_MARK", "implementation-roadmap.md must be marked SUPERSEDED by ROADMAP.md");
  } else {
    note("implementation-roadmap.md marked SUPERSEDED");
  }
}

export function runProjectConsistency() {
  findings.length = 0;

  const vision = loadCanonical("docs/platform/VISION.md", "PRODUCT_VISION", ["version", "lastReviewed"]);
  const architecture = loadCanonical("docs/platform/ARCHITECTURE.md", "GLOBAL_ARCHITECTURE", [
    "architectureVersion",
    "lastReviewed",
  ]);
  const decision = loadCanonical(
    DECISION_REGISTER_REL,
    "DECISION_AUTHORITY",
    ["decisionRegisterVersion", "lastReviewed"],
    { exact: true },
  );
  if (decision) {
    note(`Decision Register exact path OK (${DECISION_REGISTER_REL})`);
    const tracked = gitTracksExactPath(DECISION_REGISTER_REL);
    if (tracked === "missing") {
      fail(
        "DECISION_REGISTER_PATH",
        `git does not track exact path ${DECISION_REGISTER_REL}`,
      );
    } else if (tracked === "exact") {
      note(`Decision Register git-tracked exact path OK (${DECISION_REGISTER_REL})`);
    } else {
      note("Decision Register git path check unavailable; directory-entry exact check applied");
    }
  }
  const roadmap = loadCanonical("docs/platform/ROADMAP.md", "IMPLEMENTATION_SEQUENCE", [
    "roadmapVersion",
    "acceptedThrough",
    "currentProductSlice",
    "nextProductSlice",
    "gtmBoundary",
    "lastReviewed",
  ]);
  const state = loadCanonical("docs/platform/STATE.md", "ACCEPTED_STATE", [
    "stateVersion",
    "acceptedThrough",
    "currentProductSlice",
    "nextProductSlice",
    "pendingAcceptance",
    "governanceHealth",
    "lastReviewed",
  ]);

  if (vision && !isValidCanonicalRevision("vision", vision.meta.version)) {
    fail("VISION_VERSION", `version must match VISION-<positive integer>, got ${vision.meta.version}`);
  }
  if (architecture && !isValidCanonicalRevision("architecture", architecture.meta.architectureVersion)) {
    fail("ARCH_VERSION", `architectureVersion must match ARCH-R<positive integer>, got ${architecture.meta.architectureVersion}`);
  }
  if (decision && !isValidCanonicalRevision("decision", decision.meta.decisionRegisterVersion)) {
    fail("DR_VERSION", `decisionRegisterVersion must match DR-<positive integer>, got ${decision.meta.decisionRegisterVersion}`);
  }
  if (roadmap && !isAllowedGovernanceVersion("roadmap", roadmap.meta.roadmapVersion)) {
    fail(
      "ROADMAP_VERSION",
      `roadmapVersion must match GTM-R<positive integer>, got ${roadmap.meta.roadmapVersion}`,
    );
  }
  if (state && !isAllowedGovernanceVersion("state", state.meta.stateVersion)) {
    fail(
      "STATE_VERSION",
      `stateVersion must match STATE-R<positive integer>, got ${state.meta.stateVersion}`,
    );
  }
  if (roadmap && state) {
    const roadmapRevision = Number(/^GTM-R(\d+)$/.exec(roadmap.meta.roadmapVersion)?.[1] ?? 0);
    const stateRevision = Number(/^STATE-R(\d+)$/.exec(state.meta.stateVersion)?.[1] ?? 0);
    if (
      (roadmapRevision >= 66 || stateRevision >= 64) &&
      !isImp030ArchitectureActivationCheckpoint(roadmap, state) &&
      !isImp030ArchitectureLockCheckpoint(roadmap, state) &&
      !isImp030ImplementationAuthorizationCheckpoint(roadmap, state) &&
      !isImp030ImplementationStartCheckpoint(roadmap, state) &&
      !isImp030DetailRouteAmendmentCheckpoint(roadmap, state) &&
      !isImp030CanonicalConsistencyCheckpoint(roadmap, state) &&
      !isImp030AcceptanceCheckpoint(roadmap, state) &&
      !isSupportedImp030GovernanceCheckpoint(roadmap.meta.roadmapVersion, state.meta.stateVersion, "imp031Activation") &&
      !isImp031ArchitectureDraftCheckpoint(roadmap, state) &&
      !isImp031ArchitectureLockCheckpoint(roadmap, state) &&
      !isImp031ImplementationAuthorizationCheckpoint(roadmap, state) &&
      !isImp031ImplementationStartCheckpoint(roadmap, state)
    ) {
      fail("UNSUPPORTED_GOVERNANCE_CHECKPOINT", "Governance revisions at or beyond GTM-R66 / STATE-R64 require an exact supported canonical checkpoint");
    }
  }
  if (state && state.meta.governanceHealth === "ALIGNED") {
    // During reconciliation install this may still be RECONCILIATION_REQUIRED;
    // ALIGNED is allowed only after independent acceptance — do not fail either way structurally.
    note("governanceHealth=ALIGNED (independent acceptance may have applied)");
  } else if (state) {
    note(`governanceHealth=${state.meta.governanceHealth}`);
  }

  checkRoadmapState(roadmap, state);
  checkDecisionRegister(decision, roadmap, state);
  checkImp024ArchitectureLock(roadmap, state, architecture);
  checkImp025ArchitectureLock(roadmap, state, architecture);
  checkImp026ArchitectureLock(roadmap, state, architecture, decision);
  checkImp026cArchitectureLock(roadmap, state);
  checkImp027ArchitectureLock(roadmap, state, architecture);
  checkImp028ArchitectureLock(roadmap, state, architecture, decision);
  checkImp028aImplementationAuthorization(roadmap, state);
  checkImp028bCanonicalActivation(roadmap, state);
  checkImp029ArchitectureLock(roadmap, state, architecture, decision);
  checkImp030ArchitectureLock(roadmap, state, architecture, decision);
  checkImp030ImplementationAuthorization(roadmap, state, architecture, decision);
  checkImp030ImplementationStart(roadmap, state, architecture, decision);
  checkImp030DetailRouteAmendment(roadmap, state, architecture, decision);
  checkImp030CanonicalConsistency(roadmap, state, architecture, decision);
  checkImp030Acceptance(roadmap, state, architecture, decision);
  checkImp031ArchitectureActivation(roadmap, state);
  checkImp031ArchitectureDraft(roadmap, state, architecture, decision);
  checkImp031ArchitectureLock(roadmap, state, architecture, decision);
  checkImp031ImplementationAuthorization(roadmap, state, architecture, decision);
  checkImp031ImplementationStart(roadmap, state, architecture, decision);
  checkTechnicalInventory();
  checkStaticWeb();
  checkAgentsPointer();
  checkSupersededRoadmap();
  checkWorkingTreeFingerprint();

  return findings;
}

function checkWorkingTreeFingerprint() {
  try {
    const result = computeWorkingTreeFingerprint(projectRoot);
    note(
      `WORKING_TREE_FINGERPRINT ${result.digest} (${result.algorithm}; content-sensitive tracked + non-ignored untracked files)`,
    );
  } catch (err) {
    fail(
      "WORKING_TREE_FINGERPRINT",
      `working-tree fingerprint failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function main() {
  const results = runProjectConsistency();
  const failures = results.filter((f) => !f.ok);
  for (const f of results) {
    const prefix = f.ok ? "OK  " : "FAIL";
    const code = f.code ? `[${f.code}] ` : "";
    console.log(`${prefix} ${code}${f.message}`);
  }
  console.log("");
  console.log(`project:consistency — ${failures.length === 0 ? "PASS" : "FAIL"} (${failures.length} failure(s))`);
  process.exit(failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
