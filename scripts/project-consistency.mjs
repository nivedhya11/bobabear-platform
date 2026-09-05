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
    "IMP-036": "Observability",
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

function isImp031ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Completion");
}

function isImp031AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp031Acceptance");
}

/** @param {string} roadmapVersion @param {string} stateVersion @param {"activation" | "lock" | "authorization" | "start" | "routeAmendment" | "consistencyRepair" | "acceptance" | "imp031Activation" | "imp031Draft" | "imp031Lock" | "imp031Authorization" | "imp031Start" | "imp031Completion" | "imp031Acceptance" | "imp032Activation" | "imp032Draft" | "imp032Lock" | "imp032Authorization" | "imp032Start" | "imp032BoundaryClarification" | "imp032Completion" | "imp032Acceptance" | "imp033Activation" | "imp033Completion" | "imp033Acceptance" | "imp034Completion" | "imp034Acceptance" | "imp035Completion" | "imp035Acceptance" | "imp036Completion" | "imp036Acceptance" | "enterpriseExperiencePlan" | "imp036dActivation" | "imp036dLock" | "imp036dAuthorization"} [kind] */
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
  const imp031Completion = roadmapVersion === "GTM-R78" && stateVersion === "STATE-R76";
  const imp031Acceptance = roadmapVersion === "GTM-R79" && stateVersion === "STATE-R77";
  const imp032Activation = roadmapVersion === "GTM-R80" && stateVersion === "STATE-R78";
  // Draft was never committed/promoted; GTM-R81 / STATE-R79 are reused for architecture lock.
  const imp032Draft = false;
  const imp032Lock = roadmapVersion === "GTM-R81" && stateVersion === "STATE-R79";
  const imp032Authorization = roadmapVersion === "GTM-R82" && stateVersion === "STATE-R80";
  const imp032Start = roadmapVersion === "GTM-R83" && stateVersion === "STATE-R81";
  const imp032BoundaryClarification = roadmapVersion === "GTM-R84" && stateVersion === "STATE-R82";
  const imp032Completion = roadmapVersion === "GTM-R85" && stateVersion === "STATE-R83";
  const imp032Acceptance = roadmapVersion === "GTM-R86" && stateVersion === "STATE-R84";
  const imp033Activation = roadmapVersion === "GTM-R87" && stateVersion === "STATE-R85";
  // GTM-R88 / STATE-R86 is a single combined lock + authorize + start + complete gate; no
  // intermediate lifecycle-only version pair exists for IMP-033.
  const imp033Completion = roadmapVersion === "GTM-R88" && stateVersion === "STATE-R86";
  const imp033Acceptance = roadmapVersion === "GTM-R89" && stateVersion === "STATE-R87";
  // GTM-R90 / STATE-R88 is a single combined lock + authorize + start + complete gate; no
  // intermediate lifecycle-only version pair exists for IMP-034.
  const imp034Completion = roadmapVersion === "GTM-R90" && stateVersion === "STATE-R88";
  const imp034Acceptance = roadmapVersion === "GTM-R91" && stateVersion === "STATE-R89";
  // GTM-R92 / STATE-R90 is a single combined lock + authorize + start + complete gate; no
  // intermediate lifecycle-only version pair exists for IMP-035.
  const imp035Completion = roadmapVersion === "GTM-R92" && stateVersion === "STATE-R90";
  const imp035Acceptance = roadmapVersion === "GTM-R93" && stateVersion === "STATE-R91";
  const imp036Completion = roadmapVersion === "GTM-R94" && stateVersion === "STATE-R92";
  const imp036Acceptance = roadmapVersion === "GTM-R95" && stateVersion === "STATE-R93";
  const enterpriseExperiencePlan = roadmapVersion === "GTM-R96" && stateVersion === "STATE-R94";
  const imp036aCompletion = roadmapVersion === "GTM-R97" && stateVersion === "STATE-R95";
  const imp036aAcceptance = roadmapVersion === "GTM-R98" && stateVersion === "STATE-R96";
  const imp036bCompletion = roadmapVersion === "GTM-R99" && stateVersion === "STATE-R97";
  const imp036bAcceptance = roadmapVersion === "GTM-R100" && stateVersion === "STATE-R98";
  const imp036cCompletion = roadmapVersion === "GTM-R101" && stateVersion === "STATE-R99";
  const imp036cAcceptance = roadmapVersion === "GTM-R102" && stateVersion === "STATE-R100";
  const imp036dActivation = roadmapVersion === "GTM-R103" && stateVersion === "STATE-R101";
  const imp036dLock = roadmapVersion === "GTM-R104" && stateVersion === "STATE-R102";
  const imp036dAuthorization = roadmapVersion === "GTM-R105" && stateVersion === "STATE-R103";
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
  if (kind === "imp031Completion") return imp031Completion;
  if (kind === "imp031Acceptance") return imp031Acceptance;
  if (kind === "imp032Activation") return imp032Activation;
  if (kind === "imp032Draft") return imp032Draft;
  if (kind === "imp032Lock") return imp032Lock;
  if (kind === "imp032Authorization") return imp032Authorization;
  if (kind === "imp032Start") return imp032Start;
  if (kind === "imp032BoundaryClarification") return imp032BoundaryClarification;
  if (kind === "imp032Completion") return imp032Completion;
  if (kind === "imp032Acceptance") return imp032Acceptance;
  if (kind === "imp033Activation") return imp033Activation;
  if (kind === "imp033Completion") return imp033Completion;
  if (kind === "imp033Acceptance") return imp033Acceptance;
  if (kind === "imp034Completion") return imp034Completion;
  if (kind === "imp034Acceptance") return imp034Acceptance;
  if (kind === "imp035Completion") return imp035Completion;
  if (kind === "imp035Acceptance") return imp035Acceptance;
  if (kind === "imp036Completion") return imp036Completion;
  if (kind === "imp036Acceptance") return imp036Acceptance;
  if (kind === "enterpriseExperiencePlan") return enterpriseExperiencePlan;
  if (kind === "imp036aCompletion") return imp036aCompletion;
  if (kind === "imp036aAcceptance") return imp036aAcceptance;
  if (kind === "imp036bCompletion") return imp036bCompletion;
  if (kind === "imp036bAcceptance") return imp036bAcceptance;
  if (kind === "imp036cCompletion") return imp036cCompletion;
  if (kind === "imp036cAcceptance") return imp036cAcceptance;
  if (kind === "imp036dActivation") return imp036dActivation;
  if (kind === "imp036dLock") return imp036dLock;
  if (kind === "imp036dAuthorization") return imp036dAuthorization;
  return activation || lock || authorization || start || routeAmendment || consistencyRepair || acceptance || imp031Activation || imp031Draft || imp031Lock || imp031Authorization || imp031Start || imp031Completion || imp031Acceptance || imp032Activation || imp032Draft || imp032Lock || imp032Authorization || imp032Start || imp032BoundaryClarification || imp032Completion || imp032Acceptance || imp033Activation || imp033Completion || imp033Acceptance || imp034Completion || imp034Acceptance || imp035Completion || imp035Acceptance || imp036Completion || imp036Acceptance || enterpriseExperiencePlan || imp036aCompletion || imp036aAcceptance || imp036bCompletion || imp036bAcceptance || imp036cCompletion || imp036cAcceptance || imp036dActivation || imp036dLock || imp036dAuthorization;
}

function isImp032ArchitectureActivationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Activation");
}

function isImp032ArchitectureDraftCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Draft");
}

function isImp032ArchitectureLockCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Lock");
}

function isImp032ImplementationAuthorizationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Authorization");
}

function isImp032ImplementationStartCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Start");
}

function isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032BoundaryClarification");
}

function isImp032ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Completion");
}

function isImp032AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp032Acceptance");
}

function isImp033ArchitectureActivationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp033Activation");
}

function isImp033ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp033Completion");
}

function isImp033AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp033Acceptance");
}

function isImp034ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp034Completion");
}

function isImp034AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp034Acceptance");
}

function isImp035ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp035Completion");
}

function isImp035AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp035Acceptance");
}

function isImp036ImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036Completion");
}

function isImp036AcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036Acceptance");
}

function isEnterpriseExperiencePlanningCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "enterpriseExperiencePlan");
}

function isImp036aImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036aCompletion");
}

function isImp036aAcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036aAcceptance");
}

function isImp036bImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036bCompletion");
}

function isImp036bAcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036bAcceptance");
}

function isImp036cImplementationCompletionCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036cCompletion");
}

function isImp036cAcceptanceCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036cAcceptance");
}

function isImp036dArchitectureActivationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036dActivation");
}

function isImp036dArchitectureLockCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036dLock");
}

function isImp036dImplementationAuthorizationCheckpoint(roadmap, state) {
  return isSupportedImp030GovernanceCheckpoint(roadmap?.meta.roadmapVersion, state?.meta.stateVersion, "imp036dAuthorization");
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
    isImp031ImplementationStartCheckpoint(roadmap, state) ||
    isImp031ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp031AcceptanceCheckpoint(roadmap, state) ||
    isImp032ArchitectureActivationCheckpoint(roadmap, state) ||
    isImp032ArchitectureDraftCheckpoint(roadmap, state) ||
    isImp032ArchitectureLockCheckpoint(roadmap, state) ||
    isImp032ImplementationAuthorizationCheckpoint(roadmap, state) ||
    isImp032ImplementationStartCheckpoint(roadmap, state) ||
    isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state) ||
    isImp032ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp032AcceptanceCheckpoint(roadmap, state) ||
    isImp033ArchitectureActivationCheckpoint(roadmap, state) ||
    isImp033ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp033AcceptanceCheckpoint(roadmap, state) ||
    isImp034ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp034AcceptanceCheckpoint(roadmap, state) ||
    isImp035ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp035AcceptanceCheckpoint(roadmap, state) ||
    isImp036ImplementationCompletionCheckpoint(roadmap, state) ||
    isImp036AcceptanceCheckpoint(roadmap, state) ||
    isEnterpriseExperiencePlanningCheckpoint(roadmap, state) ||
    isImp036aImplementationCompletionCheckpoint(roadmap, state) ||
    isImp036aAcceptanceCheckpoint(roadmap, state) ||
    isImp036bImplementationCompletionCheckpoint(roadmap, state) ||
    isImp036bAcceptanceCheckpoint(roadmap, state) ||
    isImp036cImplementationCompletionCheckpoint(roadmap, state) ||
    isImp036cAcceptanceCheckpoint(roadmap, state) ||
    isImp036dArchitectureActivationCheckpoint(roadmap, state) ||
    isImp036dArchitectureLockCheckpoint(roadmap, state) ||
    isImp036dImplementationAuthorizationCheckpoint(roadmap, state)
  );
}

/**
 * Validate the planning-only Enterprise Experience programme checkpoint.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateEnterpriseExperiencePlanningCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R96", stateVersion: "STATE-R94", acceptedThrough: "IMP-036",
    currentProductSlice: "NONE", nextProductSlice: "IMP-036A", pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040", imp036: "COMPLETE_AND_ACCEPTED", imp037: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    figmaRequiredNow: false, programmeArtifact: true, sliceArtifactCount: 7,
    allPlanned: true, allNotActivated: true, allNotAuthorized: true, allNotStarted: true,
    allArchitectureNotLocked: true, allFounderUatRequired: true,
    customerSliceOrderCorrect: true, workforceHubPlanned: true,
    teamAdministrationPlanned: true, supportRefundPlanned: true,
    preparationAssessmentPlanned: true, navigationAvailabilityRule: true,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) {
      return { ok: false, code: "ENTERPRISE_EXPERIENCE_PLAN", message: `${key} must be ${value}` };
    }
  }
  if (checkpoint.d374Exists) {
    return { ok: false, code: "ENTERPRISE_EXPERIENCE_D374", message: "planning must not create D-374" };
  }
  return { ok: true };
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
 * Validate the exact IMP-032 architecture-activation lifecycle facts (R80/S78).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ArchitectureActivationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R80", stateVersion: "STATE-R78", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_ARCHITECTURE_ACTIVATION", message: `${key} must be ${value}` };
  }
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.capabilityArtifactExists) {
    return { ok: false, code: "IMP032_CAPABILITY_ARTIFACT", message: "IMP-032 capability artifact must not be created during architecture activation" };
  }
  if (checkpoint.providerSelected) {
    return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized during architecture activation" };
  }
  if (checkpoint.dehradunModeDefined) {
    return { ok: false, code: "IMP032_MODE_DEFINED", message: "Dehradun operating mode must not be defined during architecture activation" };
  }
  if (checkpoint.imp031Accepted !== true) {
    return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate a historical / fixture IMP-032 reviewable architecture-draft checkpoint.
 * Live CURRENT docs no longer use a draft version pair (R81/S79 reused for lock).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ArchitectureDraftCheckpoint(checkpoint) {
  const expected = {
    acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_ARCHITECTURE_DRAFT", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 architecture draft must exist and remain NOT_LOCKED" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.providerSelected) return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized in draft governance" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 draft artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  return { ok: true };
}

/**
 * Validate a historical / fixture IMP-032 draft artifact.
 * Live CURRENT artifact is AUTHORIZED / NOT_STARTED; lock evaluator remains for R81/S79 fixtures.
 * @param {string} text
 */
export function evaluateImp032ArchitectureDraftArtifact(text) {
  const required = [
    /"status":\s*"DRAFT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /`BOOKING_OUTCOME_UNKNOWN`/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_DRAFT", message: "IMP-032 artifact must record the complete NOT_LOCKED review candidate" };
  }
  const forbidden = [
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /"architectureVersion":\s*"ARCH-R19"/,
    /Dispatch is \*\*AUTOMATIC\*\*/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 draft must not claim lock, authorization, start, D-373 creation, ARCH-R19, or API automation" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 architecture-lock lifecycle facts (R81/S79 reused; draft never promoted).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ArchitectureLockCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R81", stateVersion: "STATE-R79", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_LOCKED", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_ARCHITECTURE_LOCK", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.providerSelected) return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized at lock" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 locked artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  return { ok: true };
}

/**
 * Validate the locked IMP-032 capability artifact without accepting authorization/start progression.
 * @param {string} text
 */
export function evaluateImp032ArchitectureLockArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*ARCHITECTURE_LOCKED/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-032_STARTED:\s*NO/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-032_ACCEPTED:\s*NO/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /`BOOKING_OUTCOME_UNKNOWN`/,
    /REQUESTED → BOOKING_OUTCOME_UNKNOWN|REQUESTED` → `BOOKING_OUTCOME_UNKNOWN/,
    /BEFORE any external booking attempt|pre-external-attempt/,
    /bookingCorrelationId/,
    /manual resolution command|manual booking resolution/,
    /performs \*\*NO\*\* provider I\/O|NO\*\* provider I\/O|no provider I\/O/,
    /never issues `createBooking`|never issues createBooking/,
    /HTTPS only/,
    /cannot transition Delivery lifecycle|is not lifecycle authority/,
    /Tracking URL alone is \*\*NOT\*\* proof|Tracking URL alone is NOT proof/,
    /never rewrites historical customer delivery charge/,
    /Do \*\*not\*\* implement arbitrary|Set Delivery Status/,
    /IMP-033/,
    /IMP-034/,
    /eligible ACCEPTED → FULFILLED/,
    /DURABLE_GENERIC_DELIVERY_ACTION_AUDIT\s*=\s*DEFERRED/,
    /schema_change:\s*NO/,
    /migration:\s*NO/,
    /FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE:\s*YES/,
    /no_reference_issued/,
    /Do \*\*not\*\* persist generic booking-channel|is \*\*operational context\*\*/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_LOCK", message: "IMP-032 artifact must record the complete ARCHITECTURE_LOCKED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /"architectureVersion":\s*"ARCH-R19"/,
    /Dispatch is \*\*AUTOMATIC\*\*/,
    /external booking\/reference \*\*OR\*\* explicit `no_reference_issued`/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 lock must not claim authorization, start, unlock, D-373 creation, ARCH-R19, or fabricate no_reference_issued" };
  }
  // Explicit deferrals must remain present.
  for (const token of ["webhook", "queue", "polling", "WhatsApp", "automatic dispatch"]) {
    if (!new RegExp(token, "i").test(text)) {
      return { ok: false, code: "IMP032_CAPABILITY_LOCK", message: `IMP-032 locked artifact must explicitly defer ${token}` };
    }
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 implementation-authorization lifecycle facts (R82/S80).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ImplementationAuthorizationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R82", stateVersion: "STATE-R80", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "YES", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_IMPLEMENTATION_AUTHORIZATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.providerSelected) return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized at authorization" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 authorized artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  return { ok: true };
}

/**
 * Validate the authorized-not-started IMP-032 capability artifact without accepting start progression.
 * @param {string} text
 */
export function evaluateImp032ImplementationAuthorizationArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*true/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*NO/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-032_ACCEPTED:\s*NO/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /Architecture is canonically locked/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /`BOOKING_OUTCOME_UNKNOWN`/,
    /REQUESTED → BOOKING_OUTCOME_UNKNOWN|REQUESTED` → `BOOKING_OUTCOME_UNKNOWN/,
    /BEFORE any external booking attempt|pre-external-attempt/,
    /bookingCorrelationId/,
    /manual resolution command|manual booking resolution/,
    /performs \*\*NO\*\* provider I\/O|NO\*\* provider I\/O|no provider I\/O/,
    /never issues `createBooking`|never issues createBooking/,
    /HTTPS only/,
    /cannot transition Delivery lifecycle|is not lifecycle authority/,
    /Tracking URL alone is \*\*NOT\*\* proof|Tracking URL alone is NOT proof/,
    /never rewrites historical customer delivery charge/,
    /Do \*\*not\*\* implement arbitrary|Set Delivery Status/,
    /IMP-033/,
    /IMP-034/,
    /eligible ACCEPTED → FULFILLED/,
    /DURABLE_GENERIC_DELIVERY_ACTION_AUDIT\s*=\s*DEFERRED/,
    /schema_change:\s*NO/,
    /migration:\s*NO/,
    /FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE:\s*YES/,
    /no_reference_issued/,
    /Do \*\*not\*\* persist generic booking-channel|is \*\*operational context\*\*/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_AUTHORIZATION", message: "IMP-032 artifact must record the complete AUTHORIZED / NOT_STARTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /uncommitted lock candidate/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /"architectureVersion":\s*"ARCH-R19"/,
    /Dispatch is \*\*AUTOMATIC\*\*/,
    /external booking\/reference \*\*OR\*\* explicit `no_reference_issued`/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 authorization must not claim start, unlock, unauthorized, D-373, ARCH-R19, stale candidate prose, or fabricate no_reference_issued" };
  }
  for (const token of ["webhook", "queue", "polling", "WhatsApp", "automatic dispatch"]) {
    if (!new RegExp(token, "i").test(text)) {
      return { ok: false, code: "IMP032_CAPABILITY_AUTHORIZATION", message: `IMP-032 authorized artifact must explicitly defer ${token}` };
    }
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-032 AUTHORIZED / NOT_STARTED across capability, ROADMAP, and STATE.
 * ARCHITECTURE.md is intentionally unchanged for this capability-local authorization gate.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp032ImplementationAuthorizationCrossDocumentAlignment(documents) {
  const artifact = evaluateImp032ImplementationAuthorizationArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

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
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(documents.capabilityText);
  const startedYes =
    /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-032_STARTED:\s*YES/.test(documents.capabilityText);
  const authorizationNo =
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const lifecycleAuthorized =
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/.test(currentRoadmapSection) &&
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/.test(currentStateAcceptance) &&
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/.test(documents.capabilityText);
  const imp033Planned =
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (startedYes && authorizationNo) {
    return {
      ok: false,
      code: "IMP032_STARTED_WITHOUT_AUTHORIZATION",
      message: "IMP-032_STARTED=YES while IMP-032_IMPLEMENTATION_AUTHORIZED=NO",
    };
  }
  if (!authorizationYes || !architectureLocked || !lifecycleAuthorized || !imp033Planned) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-032 AUTHORIZED / NOT_STARTED with architecture LOCKED",
    };
  }
  if (!/IMP-032_STARTED:\s*NO/.test(currentRoadmapSection) || !/IMP-032_STARTED:\s*NO/.test(currentStateAcceptance)) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE markers must keep IMP-032_STARTED=NO",
    };
  }
  if (
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP032_PREMATURE_PROGRESSION",
      message: "authorization must keep IMP-032 incomplete and unaccepted",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 implementation-start lifecycle facts (R83/S81).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ImplementationStartCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R83", stateVersion: "STATE-R81", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / STARTED",
    implementationAuthorized: "YES", started: "YES", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_IMPLEMENTATION_START", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.providerSelected) return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized at start" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 started artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  return { ok: true };
}

/**
 * Validate the authorized-started IMP-032 capability artifact without accepting completion progression.
 * @param {string} text
 */
export function evaluateImp032ImplementationStartArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED"/,
    /"implementationAuthorized":\s*true/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-032_ACCEPTED:\s*NO/,
    /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/,
    /Architecture remains canonically locked/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /`BOOKING_OUTCOME_UNKNOWN`/,
    /REQUESTED → BOOKING_OUTCOME_UNKNOWN|REQUESTED` → `BOOKING_OUTCOME_UNKNOWN/,
    /BEFORE any external booking attempt|pre-external-attempt/,
    /bookingCorrelationId/,
    /manual resolution command|manual booking resolution/,
    /performs \*\*NO\*\* provider I\/O|NO\*\* provider I\/O|no provider I\/O/,
    /never issues `createBooking`|never issues createBooking/,
    /HTTPS only/,
    /cannot transition Delivery lifecycle|is not lifecycle authority/,
    /Tracking URL alone is \*\*NOT\*\* proof|Tracking URL alone is NOT proof/,
    /never rewrites historical customer delivery charge/,
    /Do \*\*not\*\* implement arbitrary|Set Delivery Status/,
    /IMP-033/,
    /IMP-034/,
    /eligible ACCEPTED → FULFILLED/,
    /DURABLE_GENERIC_DELIVERY_ACTION_AUDIT\s*=\s*DEFERRED/,
    /schema_change:\s*NO/,
    /migration:\s*NO/,
    /FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE:\s*YES/,
    /no_reference_issued/,
    /Do \*\*not\*\* persist generic booking-channel|is \*\*operational context\*\*/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_START", message: "IMP-032 artifact must record the complete AUTHORIZED / STARTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-032_STARTED:\s*NO/,
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /uncommitted lock candidate/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /"architectureVersion":\s*"ARCH-R19"/,
    /Dispatch is \*\*AUTOMATIC\*\*/,
    /external booking\/reference \*\*OR\*\* explicit `no_reference_issued`/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 start must not claim unstarted, unlocked, unauthorized, complete, accepted, D-373, ARCH-R19, stale candidate prose, or fabricate no_reference_issued" };
  }
  for (const token of ["webhook", "queue", "polling", "WhatsApp", "automatic dispatch"]) {
    if (!new RegExp(token, "i").test(text)) {
      return { ok: false, code: "IMP032_CAPABILITY_START", message: `IMP-032 started artifact must explicitly defer ${token}` };
    }
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-032 AUTHORIZED / STARTED across capability, ROADMAP, and STATE.
 * ARCHITECTURE.md is intentionally unchanged for this capability-local start gate.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp032ImplementationStartCrossDocumentAlignment(documents) {
  const artifact = evaluateImp032ImplementationStartArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

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
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(documents.capabilityText);
  const startedYes =
    /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_STARTED:\s*YES/.test(documents.capabilityText);
  const authorizationNo =
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const lifecycleInProgress =
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) &&
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) &&
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(documents.capabilityText);
  const imp033Planned =
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (startedYes && authorizationNo) {
    return {
      ok: false,
      code: "IMP032_STARTED_WITHOUT_AUTHORIZATION",
      message: "IMP-032_STARTED=YES while IMP-032_IMPLEMENTATION_AUTHORIZED=NO",
    };
  }
  if (!authorizationYes || !startedYes || !architectureLocked || !lifecycleInProgress || !imp033Planned) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-032 AUTHORIZED / STARTED / IMPLEMENTATION_IN_PROGRESS with architecture LOCKED",
    };
  }
  if (
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP032_PREMATURE_PROGRESSION",
      message: "start must keep IMP-032 incomplete and unaccepted",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 permission-bootstrap boundary-clarification lifecycle facts (R84/S82).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032PermissionBootstrapClarificationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R84", stateVersion: "STATE-R82", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / STARTED",
    implementationAuthorized: "YES", started: "YES", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_PERMISSION_BOOTSTRAP_CLARIFICATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (checkpoint.providerSelected) return { ok: false, code: "IMP032_PROVIDER_SELECTED", message: "provider/aggregator selection must not be canonicalized at boundary clarification" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 clarified artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  return { ok: true };
}

/**
 * Validate the IMP-032 permission-bootstrap boundary-clarification artifact without accepting completion progression.
 * @param {string} text
 */
export function evaluateImp032PermissionBootstrapClarificationArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED"/,
    /"implementationAuthorized":\s*true/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-032_ACCEPTED:\s*NO/,
    /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/,
    /Architecture remains canonically locked/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /`BOOKING_OUTCOME_UNKNOWN`/,
    /REQUESTED → BOOKING_OUTCOME_UNKNOWN|REQUESTED` → `BOOKING_OUTCOME_UNKNOWN/,
    /BEFORE any external booking attempt|pre-external-attempt/,
    /bookingCorrelationId/,
    /manual resolution command|manual booking resolution/,
    /performs \*\*NO\*\* provider I\/O|NO\*\* provider I\/O|no provider I\/O/,
    /never issues `createBooking`|never issues createBooking/,
    /HTTPS only/,
    /cannot transition Delivery lifecycle|is not lifecycle authority/,
    /Tracking URL alone is \*\*NOT\*\* proof|Tracking URL alone is NOT proof/,
    /never rewrites historical customer delivery charge/,
    /Do \*\*not\*\* implement arbitrary|Set Delivery Status/,
    /IMP-033/,
    /IMP-034/,
    /eligible ACCEPTED → FULFILLED/,
    /DURABLE_GENERIC_DELIVERY_ACTION_AUDIT\s*=\s*DEFERRED/,
    /schema_change:\s*NO/,
    /delivery_schema_migration:\s*NO/,
    /access_control_data_seed_migration:\s*PERMITTED_IF_REQUIRED/,
    /already-initialized environments do not automatically receive newly locked permission-catalog entries/,
    /app\.access_permissions/,
    /app\.access_role_permissions/,
    /payment\.refund/,
    /data-only INSERT into existing access-control tables only/,
    /\*\*NO\*\* CREATE \/ ALTER \/ DROP|\*\*NO\*\* DDL/,
    /\*\*NO\*\* Delivery-table DDL or DML/,
    /only the already-locked ten `delivery\.\*` permission keys/,
    /permission \+ trusted scope remains authority/,
    /GTM-R84 \/ STATE-R82/,
    /implementation-boundary only/,
    /FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE:\s*YES/,
    /no_reference_issued/,
    /Do \*\*not\*\* persist generic booking-channel|is \*\*operational context\*\*/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_BOUNDARY_CLARIFICATION", message: "IMP-032 artifact must record the complete permission-bootstrap boundary-clarification checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-032_STARTED:\s*NO/,
    /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /uncommitted lock candidate/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /"architectureVersion":\s*"ARCH-R19"/,
    /Dispatch is \*\*AUTOMATIC\*\*/,
    /external booking\/reference \*\*OR\*\* explicit `no_reference_issued`/,
    /access_control_data_seed_migration:\s*PROHIBITED/,
    /access_control_data_seed_migration:\s*NO\b/,
    /CREATE TABLE.*deliveries|ALTER TABLE.*deliveries|DROP TABLE.*deliveries/i,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 boundary clarification must not claim unstarted, unlocked, unauthorized, complete, accepted, D-373, ARCH-R19, prohibited seed migration, Delivery DDL, stale candidate prose, or fabricate no_reference_issued" };
  }
  for (const token of ["webhook", "queue", "polling", "WhatsApp", "automatic dispatch"]) {
    if (!new RegExp(token, "i").test(text)) {
      return { ok: false, code: "IMP032_CAPABILITY_BOUNDARY_CLARIFICATION", message: `IMP-032 clarified artifact must explicitly defer ${token}` };
    }
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-032 permission-bootstrap boundary clarification.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp032PermissionBootstrapClarificationCrossDocumentAlignment(documents) {
  const artifact = evaluateImp032PermissionBootstrapClarificationArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const authorizationYes =
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(documents.capabilityText);
  const startedYes =
    /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_STARTED:\s*YES/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const lifecycleInProgress =
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) &&
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) &&
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(documents.capabilityText);
  const imp033Planned =
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);
  const boundaryClarified =
    /GTM-R84/.test(documents.roadmapText) &&
    /STATE-R82/.test(documents.stateText) &&
    /PERMITTED_IF_REQUIRED/.test(currentRoadmapSection) &&
    /PERMITTED_IF_REQUIRED/.test(currentStateAcceptance) &&
    /implementation-boundary clarification/.test(currentStateActivity);

  if (!authorizationYes || !startedYes || !architectureLocked || !lifecycleInProgress || !imp033Planned || !boundaryClarified) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-032 AUTHORIZED / STARTED / IMPLEMENTATION_IN_PROGRESS with permission-bootstrap boundary clarification",
    };
  }
  if (
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP032_PREMATURE_PROGRESSION",
      message: "boundary clarification must keep IMP-032 incomplete and unaccepted",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 implementation-complete-pending-acceptance lifecycle facts (R85/S83).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R85", stateVersion: "STATE-R83", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "IMP-032",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_IMPLEMENTATION_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 completed artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (checkpoint.imp031Accepted !== true) return { ok: false, code: "IMP032_IMP031_ACCEPTANCE", message: "IMP-031 must remain COMPLETE_AND_ACCEPTED" };
  if (!checkpoint.founderUatRequired) return { ok: false, code: "IMP032_FOUNDER_UAT", message: "IMP-032 completion must record Founder UAT required and not started" };
  return { ok: true };
}

/**
 * Validate the completed-pending-acceptance IMP-032 capability artifact without accepting formal acceptance.
 * @param {string} text
 */
export function evaluateImp032ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED \/ COMPLETE"/,
    /"implementationAuthorized":\s*true/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*NO/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*YES/,
    /FOUNDER_UAT:\s*NOT_STARTED/,
    /access_control_data_seed_migration:\s*APPLIED/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /schema_change:\s*NO/,
    /delivery_schema_migration:\s*NO/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_COMPLETION", message: "IMP-032 artifact must record the complete IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"AUTHORIZED \/ STARTED"(?! \/ COMPLETE)/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-032_STARTED:\s*NO/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-032:\s*COMPLETE_AND_ACCEPTED/,
    /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 completion must not claim incomplete, accepted, unlocked, unauthorized, or D-373" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-032 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp032ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp032ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completePending =
    /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const completeYes =
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-032_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-032_ACCEPTED:\s*NO/.test(currentStateAcceptance) &&
    /IMP-032_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const pendingImp032 =
    /Pending Acceptance:\s*IMP-032\b/.test(currentRoadmapSection) &&
    /Pending Acceptance:\s*IMP-032\b/.test(currentStateActivity);
  const founderUat =
    /IMP-032_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentStateAcceptance);
  const imp033Planned =
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (!completePending || !completeYes || !acceptedNo || !pendingImp032 || !founderUat || !imp033Planned) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-032 COMPLETE pending acceptance with Founder UAT required",
    };
  }
  if (
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) ||
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP032_PREMATURE_PROGRESSION",
      message: "completion must keep IMP-032 unaccepted and not IN_PROGRESS",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-032 COMPLETE_AND_ACCEPTED checkpoint.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp032AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R86", stateVersion: "STATE-R84", acceptedThrough: "IMP-032",
    currentProductSlice: "NONE", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp033: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "078ae39109a748174c429ac40381e038ab21d3c1",
    acceptedTree: "973153488a4e32e06a6da1e1e7d41072ebca9376",
    founderUatPass: true,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP032_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP032_CAPABILITY_MISSING", message: "IMP-032 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP032_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP032_D373", message: "D-373 must not be created" };
  if (!checkpoint.manualModeDefined) return { ok: false, code: "IMP032_MODE_MISSING", message: "IMP-032 accepted artifact must define MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY" };
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP032_IMPLEMENTATION_EVIDENCE", message: "IMP-032 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP032_INDEPENDENT_REVIEW", message: "IMP-032 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP032_INDEPENDENT_ACCEPTANCE", message: "IMP-032 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP032_FORMAL_ACCEPTANCE", message: "IMP-032 acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.founderUatPass) {
    return { ok: false, code: "IMP032_FOUNDER_UAT", message: "IMP-032 acceptance requires Founder UAT PASS" };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-032 capability artifact.
 * @param {string} text
 */
export function evaluateImp032AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-032"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/,
    /IMP-032:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-032_ARCHITECTURE:\s*LOCKED/,
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP032_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_032_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP032_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP032_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP032_ACCEPTED_MAIN_SHA:\s*078ae39109a748174c429ac40381e038ab21d3c1/,
    /IMP032_ACCEPTED_TREE:\s*973153488a4e32e06a6da1e1e7d41072ebca9376/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*YES/,
    /FOUNDER_UAT:\s*PASS/,
    /FOUNDER_UAT_CANDIDATE_HEAD:\s*078ae39109a748174c429ac40381e038ab21d3c1/,
    /FOUNDER_UAT_CANDIDATE_FINGERPRINT:\s*251c0589f8f17a1acf289d2798a671cea8eaba9ebd604edc0e5a933dc711223c/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_ACCEPTANCE", message: "IMP-032 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-032_ACCEPTED:\s*NO/,
    /FOUNDER_UAT:\s*NOT_STARTED/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP032_CAPABILITY_PROGRESSION", message: "IMP-032 acceptance must not retain pending-acceptance or missing Founder UAT PASS" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-032 COMPLETE_AND_ACCEPTED.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp032AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp032AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const acceptedYes =
    /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-032_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const completeAndAccepted =
    /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const founderUatPass =
    /IMP-032_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection) &&
    /IMP-032_FOUNDER_UAT:\s*PASS/.test(currentStateAcceptance);

  if (!acceptedYes || !completeAndAccepted || !founderUatPass) {
    return {
      ok: false,
      code: "IMP032_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-032 COMPLETE_AND_ACCEPTED with Founder UAT PASS",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-033 architecture-activation lifecycle facts (R87/S85).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp033ArchitectureActivationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R87", stateVersion: "STATE-R85", acceptedThrough: "IMP-032",
    currentProductSlice: "IMP-033", nextProductSlice: "IMP-034", pendingAcceptance: "NONE",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp034: "PLANNED", roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP033_ARCHITECTURE_ACTIVATION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP033_CAPABILITY_MISSING", message: "IMP-033 architecture draft must exist and remain NOT_LOCKED" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP033_D373", message: "D-373 must not be created" };
  if (checkpoint.imp032Accepted !== true) {
    return { ok: false, code: "IMP033_IMP032_ACCEPTANCE", message: "IMP-032 must remain COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate the IMP-033 architecture draft artifact at activation.
 * @param {string} text
 */
export function evaluateImp033ArchitectureDraftArtifact(text) {
  const required = [
    /"status":\s*"DRAFT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-033"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP-033_ARCHITECTURE:\s*NOT_LOCKED/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-033_STARTED:\s*NO/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /ADR-012/,
    /transactional outbox/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_DRAFT", message: "IMP-033 artifact must record the complete NOT_LOCKED review candidate" };
  }
  const forbidden = [
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033_STARTED:\s*YES/,
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_PROGRESSION", message: "IMP-033 draft must not claim lock, authorization, start, or D-373" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-033 combined lock/authorize/start/complete lifecycle facts (R88/S86).
 * GTM-R88 / STATE-R86 is a single founder-authorized combined gate, so there is no intermediate
 * IMP-033 lock, authorization, or start version pair to satisfy first.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp033ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R88", stateVersion: "STATE-R86", acceptedThrough: "IMP-032",
    currentProductSlice: "IMP-033", nextProductSlice: "IMP-034", pendingAcceptance: "IMP-033",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    imp034: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP033_IMPLEMENTATION_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP033_CAPABILITY_MISSING", message: "IMP-033 locked capability artifact must exist and record the completion checkpoint" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP033_D373", message: "D-373 must not be created" };
  if (checkpoint.imp032Accepted !== true) {
    return { ok: false, code: "IMP033_IMP032_ACCEPTANCE", message: "IMP-032 must remain COMPLETE_AND_ACCEPTED" };
  }
  if (checkpoint.founderUatRequired !== false) {
    return { ok: false, code: "IMP033_FOUNDER_UAT", message: "IMP-033 must record FOUNDER_UAT_REQUIRED: NO" };
  }
  return { ok: true };
}

/**
 * Validate the locked, implementation-complete IMP-033 capability artifact without accepting it.
 * @param {string} text
 */
export function evaluateImp033ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-033"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED \/ COMPLETE"/,
    /"implementationAuthorized":\s*true/,
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-033_ARCHITECTURE:\s*LOCKED/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-033_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033_STARTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-033_ACCEPTED:\s*NO/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*NO/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /schema_change:\s*YES/,
    /provider_IO:\s*NO/,
    /new_service:\s*NO/,
    /ADR-012/,
    /transactional outbox/,
    /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/,
    /notification\.resend/,
    /support_refund_operator/,
    /non-sending/,
    /noop/,
    /IMP-034/,
    /IMP033_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_COMPLETION", message: "IMP-033 artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint with the locked provider/topology/permission clarifications" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-033_ARCHITECTURE:\s*NOT_LOCKED/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-033_STARTED:\s*NO/,
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-033_ACCEPTED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP-033:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/,
    /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP033_ACCEPTED_MAIN_SHA/,
    /IMP033_ACCEPTED_TREE/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*YES/,
    /ARCH_R19_REQUIRED:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /\bRedis\b[^\n]*ADOPTED/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_PROGRESSION", message: "IMP-033 completion must not claim draft, unlocked, unauthorized, incomplete, accepted, provider I/O, a new service, D-373, or ARCH-R19" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-033 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp033ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp033ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completePending =
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const completeYes =
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-033_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-033_ACCEPTED:\s*NO/.test(currentStateAcceptance) &&
    /IMP-033_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const pendingImp033 =
    /Pending Acceptance:\s*IMP-033\b/.test(currentRoadmapSection) &&
    /Pending Acceptance:\s*IMP-033\b/.test(currentStateActivity);
  const founderUatNotRequired =
    /IMP-033_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-033_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentStateAcceptance);

  if (!completePending || !architectureLocked || !completeYes || !acceptedNo || !pendingImp033 || !founderUatNotRequired) {
    return {
      ok: false,
      code: "IMP033_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-033 architecture LOCKED and implementation COMPLETE pending acceptance with Founder UAT not required",
    };
  }
  if (
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/.test(currentRoadmapSection) ||
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/.test(currentStateAcceptance) ||
    /IMP-033:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) ||
    /IMP-033:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) ||
    /IMP-033_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-033_ACCEPTED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP033_PREMATURE_PROGRESSION",
      message: "completion must keep IMP-033 unaccepted and neither ARCHITECTURE_IN_PROGRESS nor IMPLEMENTATION_IN_PROGRESS",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-033 COMPLETE_AND_ACCEPTED checkpoint (R89/S87).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp033AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R89", stateVersion: "STATE-R87", acceptedThrough: "IMP-033",
    currentProductSlice: "NONE", nextProductSlice: "IMP-034", pendingAcceptance: "NONE",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp034: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "5150d70b4683f7abec1e0652bf53e7986efcf622",
    acceptedTree: "715ff386e672fd276a0b2e888aa2ebeaab3dda8c",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP033_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP033_CAPABILITY_MISSING", message: "IMP-033 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP033_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP033_D373", message: "D-373 must not be created" };
  if (checkpoint.founderUatRequired !== false) {
    return { ok: false, code: "IMP033_FOUNDER_UAT", message: "IMP-033 acceptance must record FOUNDER_UAT_REQUIRED: NO" };
  }
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP033_IMPLEMENTATION_EVIDENCE", message: "IMP-033 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP033_INDEPENDENT_REVIEW", message: "IMP-033 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP033_INDEPENDENT_ACCEPTANCE", message: "IMP-033 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP033_FORMAL_ACCEPTANCE", message: "IMP-033 acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.providerIoNo) {
    return { ok: false, code: "IMP033_PROVIDER_IO", message: "IMP-033 acceptance must preserve provider_IO: NO" };
  }
  if (!checkpoint.asyncTopologyLocked) {
    return { ok: false, code: "IMP033_ASYNC_TOPOLOGY", message: "IMP-033 acceptance must preserve the locked transactional-outbox in-process worker topology" };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-033 capability artifact.
 * @param {string} text
 */
export function evaluateImp033AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-033"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-033_ARCHITECTURE:\s*LOCKED/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-033_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033_STARTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-033_ACCEPTED:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*NO/,
    /IMP-033_FOUNDER_UAT_REQUIRED:\s*NO/,
    /schema_change:\s*YES/,
    /provider_IO:\s*NO/,
    /new_service:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /ADR-012/,
    /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/,
    /notification\.resend/,
    /support_refund_operator/,
    /non-sending/,
    /noop/,
    /IMP-034/,
    /IMP033_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP033_ACCEPTED_MAIN_SHA:\s*5150d70b4683f7abec1e0652bf53e7986efcf622/,
    /IMP033_ACCEPTED_TREE:\s*715ff386e672fd276a0b2e888aa2ebeaab3dda8c/,
    /IMPLEMENTATION_SOURCE_SHA:\s*b91f92b46f8b9fe4e0b716f920babc56864fd342/,
    /MERGED_MAIN_SHA:\s*5150d70b4683f7abec1e0652bf53e7986efcf622/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_ACCEPTANCE", message: "IMP-033 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-033_ARCHITECTURE:\s*NOT_LOCKED/,
    /IMP-033_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-033_STARTED:\s*NO/,
    /IMP-033_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-033_ACCEPTED:\s*NO/,
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*NOT_CLAIMED/,
    /IMP033_FORMAL_ACCEPTANCE:\s*NOT_CLAIMED/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /FOUNDER_UAT:\s*PASS/,
    /provider_IO:\s*YES/,
    /new_service:\s*YES/,
    /ARCH_R19_REQUIRED:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /\bRedis\b[^\n]*ADOPTED/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP033_CAPABILITY_PROGRESSION", message: "IMP-033 acceptance must not retain pending acceptance, claim Founder UAT PASS, or claim provider I/O, a new service, D-373, or ARCH-R19" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-033 COMPLETE_AND_ACCEPTED.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp033AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp033AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completeAndAccepted =
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-033_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-033_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-033_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const independentAccepted =
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(documents.capabilityText);
  const formalAccepted =
    /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(documents.capabilityText);
  const acceptedThroughImp033 =
    /Accepted Through:\s*IMP-033\b/.test(currentRoadmapSection) &&
    /acceptedThrough:\s*IMP-033\b/.test(currentStateAcceptance);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const founderUatNotRequired =
    /IMP-033_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-033_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentStateAcceptance);
  const imp034Planned =
    /IMP-034:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-034:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (
    !completeAndAccepted || !architectureLocked || !acceptedYes || !independentAccepted ||
    !formalAccepted || !acceptedThroughImp033 || !pendingNone || !founderUatNotRequired || !imp034Planned
  ) {
    return {
      ok: false,
      code: "IMP033_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-033 COMPLETE_AND_ACCEPTED with cleared current/pending position and IMP-034 PLANNED / NOT_ACTIVATED",
    };
  }
  if (
    /IMP-033_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-033_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    /Pending Acceptance:\s*IMP-033\b/.test(currentRoadmapSection) ||
    /Pending Acceptance:\s*IMP-033\b/.test(currentStateActivity) ||
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP033_ACCEPTANCE_RESIDUE",
      message: "IMP-033 acceptance must not retain pending-acceptance markers or authorize IMP-034",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-034 combined lock/authorize/start/complete lifecycle facts (R90/S88).
 * GTM-R90 / STATE-R88 is a single founder-authorized combined gate, so there is no intermediate
 * IMP-034 lock, authorization, or start version pair to satisfy first.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp034ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R90", stateVersion: "STATE-R88", acceptedThrough: "IMP-033",
    currentProductSlice: "IMP-034", nextProductSlice: "IMP-035", pendingAcceptance: "IMP-034",
    imp033: "COMPLETE_AND_ACCEPTED", imp034: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    imp035: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP034_IMPLEMENTATION_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP034_CAPABILITY_MISSING", message: "IMP-034 locked capability artifact must exist and record the completion checkpoint" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP034_D373", message: "D-373 must not be created" };
  if (checkpoint.imp033Accepted !== true) {
    return { ok: false, code: "IMP034_IMP033_ACCEPTANCE", message: "IMP-033 must remain COMPLETE_AND_ACCEPTED" };
  }
  if (checkpoint.founderUatRequired !== false) {
    return { ok: false, code: "IMP034_FOUNDER_UAT", message: "IMP-034 must record FOUNDER_UAT_REQUIRED: NO" };
  }
  return { ok: true };
}

/**
 * Validate the locked, implementation-complete IMP-034 capability artifact without accepting it.
 * @param {string} text
 */
export function evaluateImp034ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-034"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-034_ARCHITECTURE:\s*LOCKED/,
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-034_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-034_STARTED:\s*YES/,
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-034_ACCEPTED:\s*NO/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*NO/,
    /D373_REQUIRED_FOR_LOCK:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*NO/,
    /DIRECT_META_CLOUD_API_V1/,
    /BSP:\s*NO/,
    /ADR-012/,
    /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/,
    /IMP-035/,
    /IMP034_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP034_CAPABILITY_COMPLETION", message: "IMP-034 artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint with Meta provider/topology clarifications" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-034_ARCHITECTURE:\s*NOT_LOCKED/,
    /IMP-034_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-034_STARTED:\s*NO/,
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-034_ACCEPTED:\s*YES/,
    /IMP-034:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP-034:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/,
    /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP034_ACCEPTED_MAIN_SHA/,
    /IMP034_ACCEPTED_TREE/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /provider_IO:\s*NO/,
    /new_service:\s*YES/,
    /ARCH_R19_REQUIRED:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /BSP:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP034_CAPABILITY_PROGRESSION", message: "IMP-034 completion must not claim draft, unlocked, unauthorized, incomplete, accepted, BSP, a new service, D-373, or ARCH-R19" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-034 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp034ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp034ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completePending =
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const completeYes =
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-034_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-034_ACCEPTED:\s*NO/.test(currentStateAcceptance) &&
    /IMP-034_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const pendingImp034 =
    /Pending Acceptance:\s*IMP-034\b/.test(currentRoadmapSection) &&
    /Pending Acceptance:\s*IMP-034\b/.test(currentStateActivity);
  const founderUatNotRequired =
    /IMP-034_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-034_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentStateAcceptance);
  const imp033Accepted =
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance);
  const imp035Planned =
    /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (
    !completePending || !architectureLocked || !completeYes || !acceptedNo || !pendingImp034 ||
    !founderUatNotRequired || !imp033Accepted || !imp035Planned
  ) {
    return {
      ok: false,
      code: "IMP034_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-034 architecture LOCKED and implementation COMPLETE pending acceptance with Founder UAT not required",
    };
  }
  if (
    /IMP-034:\s*ARCHITECTURE_IN_PROGRESS/.test(currentRoadmapSection) ||
    /IMP-034:\s*ARCHITECTURE_IN_PROGRESS/.test(currentStateAcceptance) ||
    /IMP-034:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentRoadmapSection) ||
    /IMP-034:\s*IMPLEMENTATION_IN_PROGRESS/.test(currentStateAcceptance) ||
    /IMP-034_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-034_ACCEPTED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP034_PREMATURE_PROGRESSION",
      message: "completion must keep IMP-034 unaccepted and must not authorize IMP-035",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 reviewable architecture-draft checkpoint.
 * @param {Record<string, unknown>} checkpoint
 */
/**
 * Validate the exact IMP-034 COMPLETE_AND_ACCEPTED checkpoint (R91/S89).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp034AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R91", stateVersion: "STATE-R89", acceptedThrough: "IMP-034",
    currentProductSlice: "NONE", nextProductSlice: "IMP-035", pendingAcceptance: "NONE",
    imp033: "COMPLETE_AND_ACCEPTED", imp034: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp035: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "7e92d1a1ca02ad825229b64f308a8fc555956d25",
    acceptedTree: "772c585e93c78285e5b972d8b8a58c83507e01f8",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP034_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP034_CAPABILITY_MISSING", message: "IMP-034 locked capability artifact must exist" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP034_D373", message: "D-373 must not be created" };
  if (checkpoint.founderUatRequired !== false) {
    return { ok: false, code: "IMP034_FOUNDER_UAT", message: "IMP-034 acceptance must record FOUNDER_UAT_REQUIRED: NO" };
  }
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP034_IMPLEMENTATION_EVIDENCE", message: "IMP-034 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP034_INDEPENDENT_REVIEW", message: "IMP-034 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP034_INDEPENDENT_ACCEPTANCE", message: "IMP-034 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP034_FORMAL_ACCEPTANCE", message: "IMP-034 acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.providerIoYes) {
    return { ok: false, code: "IMP034_PROVIDER_IO", message: "IMP-034 acceptance must preserve provider_IO: YES" };
  }
  if (!checkpoint.asyncTopologyLocked) {
    return { ok: false, code: "IMP034_ASYNC_TOPOLOGY", message: "IMP-034 acceptance must preserve the locked transactional-outbox in-process worker topology" };
  }
  if (!checkpoint.directMetaStrategy) {
    return { ok: false, code: "IMP034_PROVIDER_STRATEGY", message: "IMP-034 acceptance must preserve DIRECT_META_CLOUD_API_V1 with BSP: NO" };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-034 capability artifact.
 * @param {string} text
 */
export function evaluateImp034AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-034"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-034_ARCHITECTURE:\s*LOCKED/,
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-034_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-034_STARTED:\s*YES/,
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-034_ACCEPTED:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*NO/,
    /IMP-034_FOUNDER_UAT_REQUIRED:\s*NO/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*NO/,
    /ARCH_R19_REQUIRED:\s*NO/,
    /ADR-012/,
    /DIRECT_META_CLOUD_API_V1/,
    /BSP:\s*NO/,
    /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/,
    /IMP-035/,
    /IMP034_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP034_ACCEPTED_MAIN_SHA:\s*7e92d1a1ca02ad825229b64f308a8fc555956d25/,
    /IMP034_ACCEPTED_TREE:\s*772c585e93c78285e5b972d8b8a58c83507e01f8/,
    /IMPLEMENTATION_SOURCE_SHA:\s*9508db83bb82bc3a23f16ab570c4dd0924d7703a/,
    /MERGED_MAIN_SHA:\s*7e92d1a1ca02ad825229b64f308a8fc555956d25/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP034_CAPABILITY_ACCEPTANCE", message: "IMP-034 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-034_ARCHITECTURE:\s*NOT_LOCKED/,
    /IMP-034_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-034_STARTED:\s*NO/,
    /IMP-034_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-034_ACCEPTED:\s*NO/,
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-034:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*NOT_CLAIMED/,
    /IMP034_FORMAL_ACCEPTANCE:\s*NOT_CLAIMED/,
    /IMP034_FORMAL_ACCEPTANCE:\s*PENDING/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /FOUNDER_UAT:\s*PASS/,
    /provider_IO:\s*NO/,
    /new_service:\s*YES/,
    /ARCH_R19_REQUIRED:\s*YES/,
    /BSP:\s*YES/,
    /"bindingDecisions":\s*\[[^\]]*"D-373"/,
    /\|\s*D-373\s*\|/,
    /D-373_CREATED:\s*YES/,
    /\bRedis\b[^\n]*ADOPTED/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP034_CAPABILITY_PROGRESSION", message: "IMP-034 acceptance must not retain pending acceptance, claim Founder UAT PASS, BSP, a new service, D-373, or ARCH-R19" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-034 COMPLETE_AND_ACCEPTED.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp034AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp034AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completeAndAccepted =
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-034_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-034_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-034_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const independentAccepted =
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(documents.capabilityText);
  const formalAccepted =
    /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(documents.capabilityText);
  const acceptedThroughImp034 =
    /Accepted Through:\s*IMP-034\b/.test(currentRoadmapSection) &&
    /acceptedThrough:\s*IMP-034\b/.test(currentStateAcceptance);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const founderUatNotRequired =
    /IMP-034_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-034_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentStateAcceptance);
  const imp035Planned =
    /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (
    !completeAndAccepted || !architectureLocked || !acceptedYes || !independentAccepted ||
    !formalAccepted || !acceptedThroughImp034 || !pendingNone || !founderUatNotRequired || !imp035Planned
  ) {
    return {
      ok: false,
      code: "IMP034_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-034 COMPLETE_AND_ACCEPTED with cleared current/pending position and IMP-035 PLANNED / NOT_ACTIVATED",
    };
  }
  if (
    /IMP-034_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-034_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    /Pending Acceptance:\s*IMP-034\b/.test(currentRoadmapSection) ||
    /Pending Acceptance:\s*IMP-034\b/.test(currentStateActivity) ||
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP034_ACCEPTANCE_RESIDUE",
      message: "IMP-034 acceptance must not retain pending-acceptance markers or authorize IMP-035",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-035 combined lock/authorize/start/complete lifecycle facts (R92/S90).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp035ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R92", stateVersion: "STATE-R90", acceptedThrough: "IMP-034",
    currentProductSlice: "IMP-035", nextProductSlice: "IMP-036", pendingAcceptance: "IMP-035",
    imp034: "COMPLETE_AND_ACCEPTED", imp035: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP035_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP035_CAPABILITY_MISSING", message: "IMP-035 locked capability artifact must exist and record the completion checkpoint" };
  if (!checkpoint.d373Exists) return { ok: false, code: "IMP035_D373", message: "D-373 must be created for IMP-035" };
  if (!checkpoint.archG25) return { ok: false, code: "IMP035_ARCH_G25", message: "ARCH-R19 must record ARCH-G25" };
  if (checkpoint.founderUatRequired !== true) {
    return { ok: false, code: "IMP035_FOUNDER_UAT", message: "IMP-035 must record FOUNDER_UAT_REQUIRED: YES" };
  }
  return { ok: true };
}

/**
 * Validate the locked, implementation-complete IMP-035 capability artifact without accepting it.
 * @param {string} text
 */
export function evaluateImp035ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-035"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-035_ARCHITECTURE:\s*LOCKED/,
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-035_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-035_STARTED:\s*YES/,
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-035_ACCEPTED:\s*NO/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/,
    /schema_change:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /D-373/,
    /ARCH-G25/,
    /\/api\/admin\/v1\//,
    /IMP-036/,
    /COMPLETION_IS_NOT_ACCEPTANCE:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP035_CAPABILITY_COMPLETION", message: "IMP-035 artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-035_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-035_STARTED:\s*NO/,
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-035_ACCEPTED:\s*YES/,
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/,
    /FOUNDER_UAT:\s*PASS/,
    /new_service:\s*YES/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP035_CAPABILITY_PROGRESSION", message: "IMP-035 completion must not claim draft, unlocked, unauthorized, incomplete, accepted, Founder UAT PASS, new service, or new permissions/roles" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-035 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp035ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp035ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completePending =
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const implementationComplete =
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-035_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-035_ACCEPTED:\s*NO/.test(currentStateAcceptance) &&
    /IMP-035_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const pendingImp035 =
    /Pending Acceptance:\s*IMP-035\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*IMP-035\b/.test(currentStateAcceptance);
  const founderUatRequired =
    /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentStateAcceptance);
  const imp034Accepted =
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance);
  const imp036Planned =
    /IMP-036/.test(currentRoadmapSection) &&
    /Observability/.test(currentRoadmapSection);

  if (
    !completePending || !architectureLocked || !implementationComplete || !acceptedNo ||
    !pendingImp035 || !founderUatRequired || !imp034Accepted || !imp036Planned
  ) {
    return {
      ok: false,
      code: "IMP035_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-035 architecture LOCKED and implementation COMPLETE pending acceptance with Founder UAT required",
    };
  }
  if (
    /IMP-035_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-035_ACCEPTED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ||
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection) ||
    /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentStateAcceptance) ||
    /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentStateActivity)
  ) {
    return {
      ok: false,
      code: "IMP035_COMPLETION_RESIDUE",
      message: "completion must keep IMP-035 unaccepted and must not authorize IMP-036 or claim Founder UAT PASS",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-035 COMPLETE_AND_ACCEPTED checkpoint (R93/S91).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp035AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R93", stateVersion: "STATE-R91", acceptedThrough: "IMP-035",
    currentProductSlice: "NONE", nextProductSlice: "IMP-036", pendingAcceptance: "NONE",
    imp034: "COMPLETE_AND_ACCEPTED", imp035: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp036: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "7e83d5486665ed1a3847f8484d73deb825946501",
    acceptedTree: "83c318ecd9a4cff86e19f9d35ca5ad42bcff357a",
    founderUatPass: true,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP035_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP035_CAPABILITY_MISSING", message: "IMP-035 locked capability artifact must exist" };
  if (!checkpoint.d373Exists) return { ok: false, code: "IMP035_D373", message: "D-373 must exist for IMP-035 acceptance" };
  if (!checkpoint.archG25) return { ok: false, code: "IMP035_ARCH_G25", message: "ARCH-R19 must record ARCH-G25" };
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP035_IMPLEMENTATION_EVIDENCE", message: "IMP-035 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP035_INDEPENDENT_REVIEW", message: "IMP-035 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP035_INDEPENDENT_ACCEPTANCE", message: "IMP-035 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP035_FORMAL_ACCEPTANCE", message: "IMP-035 acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.founderUatPass) {
    return { ok: false, code: "IMP035_FOUNDER_UAT", message: "IMP-035 acceptance requires Founder UAT PASS" };
  }
  if (!checkpoint.schemaChangeNo) {
    return { ok: false, code: "IMP035_SCHEMA_CHANGE", message: "IMP-035 acceptance must preserve schema_change: NO" };
  }
  if (!checkpoint.providerIoNo) {
    return { ok: false, code: "IMP035_PROVIDER_IO", message: "IMP-035 acceptance must preserve provider_IO: NO" };
  }
  if (!checkpoint.newServiceNo) {
    return { ok: false, code: "IMP035_NEW_SERVICE", message: "IMP-035 acceptance must preserve new_service: NO" };
  }
  if (!checkpoint.newPermissionsNo) {
    return { ok: false, code: "IMP035_NEW_PERMISSIONS", message: "IMP-035 acceptance must preserve new_permissions: NO" };
  }
  if (!checkpoint.newRolesNo) {
    return { ok: false, code: "IMP035_NEW_ROLES", message: "IMP-035 acceptance must preserve new_roles: NO" };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-035 capability artifact.
 * @param {string} text
 */
export function evaluateImp035AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-035"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-035_ARCHITECTURE:\s*LOCKED/,
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-035_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-035_STARTED:\s*YES/,
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-035_ACCEPTED:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*YES/,
    /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/,
    /IMP-035_FOUNDER_UAT:\s*PASS/,
    /FOUNDER_UAT:\s*PASS/,
    /schema_change:\s*NO/,
    /provider_IO:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /D-373/,
    /ARCH-G25/,
    /\/api\/admin\/v1\//,
    /IMP-036/,
    /IMP035_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_035_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP035_ACCEPTED_MAIN_SHA:\s*7e83d5486665ed1a3847f8484d73deb825946501/,
    /IMP035_ACCEPTED_TREE:\s*83c318ecd9a4cff86e19f9d35ca5ad42bcff357a/,
    /IMPLEMENTATION_SOURCE_SHA:\s*642cf7193a8b8419e8abec3bc24b5a76df9c182a/,
    /MERGED_MAIN_SHA:\s*7e83d5486665ed1a3847f8484d73deb825946501/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP035_CAPABILITY_ACCEPTANCE", message: "IMP-035 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-035_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-035_STARTED:\s*NO/,
    /IMP-035_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-035_ACCEPTED:\s*NO/,
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-035:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*NOT_CLAIMED/,
    /IMP035_FORMAL_ACCEPTANCE:\s*NOT_CLAIMED/,
    /IMP035_FORMAL_ACCEPTANCE:\s*PENDING/,
    /FOUNDER_UAT:\s*NOT_STARTED/,
    /IMP-035_FOUNDER_UAT:\s*NOT_CLAIMED/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*YES/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
    /COMPLETION_IS_NOT_ACCEPTANCE:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP035_CAPABILITY_PROGRESSION", message: "IMP-035 acceptance must not retain pending acceptance, completion-only markers, or boundary drift" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-035 COMPLETE_AND_ACCEPTED.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp035AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp035AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completeAndAccepted =
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-035_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-035_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-035_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const independentAccepted =
    /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(documents.capabilityText);
  const formalAccepted =
    /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(documents.capabilityText);
  const acceptedThroughImp035 =
    /Accepted Through:\s*IMP-035\b/.test(currentRoadmapSection) &&
    /acceptedThrough:\s*IMP-035\b/.test(currentStateAcceptance);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const founderUatPass =
    /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection) &&
    /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentStateAcceptance);
  const imp036Planned =
    /IMP-036:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-036:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (
    !completeAndAccepted || !architectureLocked || !acceptedYes || !independentAccepted ||
    !formalAccepted || !acceptedThroughImp035 || !pendingNone || !founderUatPass || !imp036Planned
  ) {
    return {
      ok: false,
      code: "IMP035_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-035 COMPLETE_AND_ACCEPTED with cleared current/pending position, Founder UAT PASS, and IMP-036 PLANNED / NOT_ACTIVATED",
    };
  }
  if (
    /IMP-035_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-035_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    /Pending Acceptance:\s*IMP-035\b/.test(currentRoadmapSection) ||
    /Pending Acceptance:\s*IMP-035\b/.test(currentStateActivity) ||
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP035_ACCEPTANCE_RESIDUE",
      message: "IMP-035 acceptance must not retain pending-acceptance markers or authorize IMP-036",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-036 combined lock/authorize/start/complete lifecycle facts (R94/S92).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp036ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R94", stateVersion: "STATE-R92", acceptedThrough: "IMP-035",
    currentProductSlice: "IMP-036", nextProductSlice: "IMP-037", pendingAcceptance: "IMP-036",
    imp035: "COMPLETE_AND_ACCEPTED", imp036: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP036_CAPABILITY_MISSING", message: "IMP-036 locked capability artifact must exist and record the completion checkpoint" };
  if (checkpoint.d374Exists) return { ok: false, code: "IMP036_D374", message: "D-374 must not be created for IMP-036" };
  if (!checkpoint.founderUatNotRequired) {
    return { ok: false, code: "IMP036_FOUNDER_UAT", message: "IMP-036 must record FOUNDER_UAT_REQUIRED: NO" };
  }
  return { ok: true };
}

export function evaluateImp036ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-036_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036_STARTED:\s*YES/,
    /IMP-036_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036_ACCEPTED:\s*NO/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /schema_change:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /order\.read/,
    /operational-status/,
    /IMP036_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036_CAPABILITY_COMPLETION", message: "IMP-036 artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  const forbidden = [
    /IMP-036_ACCEPTED:\s*YES/,
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/,
    /D-374_CREATED:\s*YES/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
    /new_service:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036_CAPABILITY_PROGRESSION", message: "IMP-036 completion must not claim accepted, D-374, or new permissions/roles/service" };
  }
  return { ok: true };
}

export function evaluateImp036ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp036ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const completePending =
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const pendingImp036 =
    /Pending Acceptance:\s*IMP-036\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*IMP-036\b/.test(currentStateAcceptance);
  const imp035Accepted =
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance);
  const imp037Planned =
    /IMP-037/.test(currentRoadmapSection) &&
    /Backup/.test(currentRoadmapSection);

  if (!completePending || !pendingImp036 || !imp035Accepted || !imp037Planned) {
    return {
      ok: false,
      code: "IMP036_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-036 architecture LOCKED and implementation COMPLETE pending acceptance",
    };
  }
  if (
    /IMP-036_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ||
    /IMP-037_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP036_COMPLETION_RESIDUE",
      message: "completion must keep IMP-036 unaccepted and must not authorize IMP-037",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-036 COMPLETE_AND_ACCEPTED checkpoint (R95/S93).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp036AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R95", stateVersion: "STATE-R93", acceptedThrough: "IMP-036",
    currentProductSlice: "NONE", nextProductSlice: "IMP-037", pendingAcceptance: "NONE",
    imp035: "COMPLETE_AND_ACCEPTED", imp036: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp037: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "68b46a53dc5d1ff84a8493899e713d3ef43db3aa",
    acceptedTree: "9b5c3193bf74d75a820b16976e894ec2dffafa13",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP036_CAPABILITY_MISSING", message: "IMP-036 locked capability artifact must exist" };
  if (checkpoint.d374Exists) return { ok: false, code: "IMP036_D374", message: "D-374 must not be created" };
  if (checkpoint.founderUatRequired !== false) {
    return { ok: false, code: "IMP036_FOUNDER_UAT", message: "IMP-036 acceptance must record FOUNDER_UAT_REQUIRED: NO" };
  }
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP036_IMPLEMENTATION_EVIDENCE", message: "IMP-036 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP036_INDEPENDENT_REVIEW", message: "IMP-036 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP036_INDEPENDENT_ACCEPTANCE", message: "IMP-036 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP036_FORMAL_ACCEPTANCE", message: "IMP-036 acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.schemaChangeNo) {
    return { ok: false, code: "IMP036_SCHEMA_CHANGE", message: "IMP-036 acceptance must preserve schema_change: NO" };
  }
  if (!checkpoint.providerIoNo) {
    return { ok: false, code: "IMP036_PROVIDER_IO", message: "IMP-036 acceptance must preserve provider_IO: NO" };
  }
  if (!checkpoint.newServiceNo) {
    return { ok: false, code: "IMP036_NEW_SERVICE", message: "IMP-036 acceptance must preserve new_service: NO" };
  }
  if (!checkpoint.newPermissionsNo) {
    return { ok: false, code: "IMP036_NEW_PERMISSIONS", message: "IMP-036 acceptance must preserve new_permissions: NO" };
  }
  if (!checkpoint.newRolesNo) {
    return { ok: false, code: "IMP036_NEW_ROLES", message: "IMP-036 acceptance must preserve new_roles: NO" };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-036 capability artifact.
 * @param {string} text
 */
export function evaluateImp036AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-036_ARCHITECTURE:\s*LOCKED/,
    /IMP-036_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036_STARTED:\s*YES/,
    /IMP-036_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036_ACCEPTED:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*NO/,
    /FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE:\s*NO/,
    /IMP-036_FOUNDER_UAT_REQUIRED:\s*NO/,
    /IMP-036_FOUNDER_UAT:\s*NOT_APPLICABLE/,
    /schema_change:\s*NO/,
    /provider_IO:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /order\.read/,
    /operational-status/,
    /IMP-037/,
    /IMP036_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_036_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP036_ACCEPTED_MAIN_SHA:\s*68b46a53dc5d1ff84a8493899e713d3ef43db3aa/,
    /IMP036_ACCEPTED_TREE:\s*9b5c3193bf74d75a820b16976e894ec2dffafa13/,
    /IMPLEMENTATION_SOURCE_SHA:\s*90593ab846992ca963bf5ae5edc3d0b6a5281d4b/,
    /MERGED_MAIN_SHA:\s*68b46a53dc5d1ff84a8493899e713d3ef43db3aa/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036_CAPABILITY_ACCEPTANCE", message: "IMP-036 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /"status":\s*"DRAFT"/,
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-036_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-036_STARTED:\s*NO/,
    /IMP-036_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-036_ACCEPTED:\s*NO/,
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-036:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*NOT_CLAIMED/,
    /IMP036_FORMAL_ACCEPTANCE:\s*NOT_CLAIMED/,
    /IMP036_FORMAL_ACCEPTANCE:\s*PENDING/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /FOUNDER_UAT:\s*PASS/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*YES/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /D-374_CREATED:\s*YES/,
    /\|\s*D-374\s*\|/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036_CAPABILITY_PROGRESSION", message: "IMP-036 acceptance must not retain pending acceptance, claim Founder UAT PASS, D-374, or boundary drift" };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-036 COMPLETE_AND_ACCEPTED.
 * @param {{ capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp036AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp036AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const stateActivityStart = documents.stateText.indexOf("## 2. Current Work Position");
  const stateActivityEnd = documents.stateText.indexOf("\n## ", stateActivityStart + 1);
  const currentStateActivity = stateActivityStart === -1
    ? ""
    : documents.stateText.slice(stateActivityStart, stateActivityEnd === -1 ? undefined : stateActivityEnd);

  const completeAndAccepted =
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-036_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-036_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-036_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-036_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-036_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-036_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const independentAccepted =
    /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(documents.capabilityText);
  const formalAccepted =
    /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(documents.capabilityText);
  const acceptedThroughImp036 =
    /Accepted Through:\s*IMP-036\b/.test(currentRoadmapSection) &&
    /acceptedThrough:\s*IMP-036\b/.test(currentStateAcceptance);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const founderUatNotRequired =
    /IMP-036_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-036_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentStateAcceptance);
  const imp037Planned =
    /IMP-037:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
    /IMP-037:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance);

  if (
    !completeAndAccepted || !architectureLocked || !acceptedYes || !independentAccepted ||
    !formalAccepted || !acceptedThroughImp036 || !pendingNone || !founderUatNotRequired || !imp037Planned
  ) {
    return {
      ok: false,
      code: "IMP036_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-036 COMPLETE_AND_ACCEPTED with cleared current/pending position and IMP-037 PLANNED / NOT_ACTIVATED",
    };
  }
  if (
    /IMP-036_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-036_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    /Pending Acceptance:\s*IMP-036\b/.test(currentRoadmapSection) ||
    /Pending Acceptance:\s*IMP-036\b/.test(currentStateActivity) ||
    /IMP-037_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-037_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
  ) {
    return {
      ok: false,
      code: "IMP036_ACCEPTANCE_RESIDUE",
      message: "IMP-036 acceptance must not retain pending-acceptance markers or authorize IMP-037",
    };
  }
  return { ok: true };
}

export function evaluateImp036aImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R97", stateVersion: "STATE-R95", acceptedThrough: "IMP-036",
    currentProductSlice: "IMP-036A", nextProductSlice: "IMP-036B", pendingAcceptance: "IMP-036A",
    imp036: "COMPLETE_AND_ACCEPTED", imp036a: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036A_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) {
    return { ok: false, code: "IMP036A_CAPABILITY_MISSING", message: "IMP-036A locked capability artifact must exist and record the completion checkpoint" };
  }
  if (!checkpoint.founderUatRequired) {
    return { ok: false, code: "IMP036A_FOUNDER_UAT", message: "IMP-036A must record FOUNDER_UAT_REQUIRED: YES" };
  }
  return { ok: true };
}

export function evaluateImp036aImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036A"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036A_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036A_STARTED:\s*YES/,
    /IMP-036A_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036A_ACCEPTED:\s*NO/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /schema_change:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /microfrontend:\s*NO/,
    /order\.read/,
    /IMP036A_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036A_CAPABILITY_COMPLETION", message: "IMP-036A artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  const forbidden = [
    /IMP-036A_ACCEPTED:\s*YES/,
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
    /new_service:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036A_CAPABILITY_PROGRESSION", message: "IMP-036A completion must not claim accepted or boundary drift" };
  }
  return { ok: true };
}

export function evaluateImp036aImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp036aImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const completePending =
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const pendingImp036a =
    /Pending Acceptance:\s*IMP-036A\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*IMP-036A\b/.test(currentStateAcceptance);
  const imp036Accepted =
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance);
  const imp036bPlanned =
    /IMP-036B/.test(currentRoadmapSection) &&
    /Customer Account, Onboarding, Address & Location Experience/.test(currentRoadmapSection);

  if (!completePending || !pendingImp036a || !imp036Accepted || !imp036bPlanned) {
    return {
      ok: false,
      code: "IMP036A_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-036A architecture LOCKED and implementation COMPLETE pending acceptance",
    };
  }
  if (
    /IMP-036A_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ||
    /IMP-036B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP036A_COMPLETION_RESIDUE",
      message: "completion must keep IMP-036A unaccepted and must not authorize IMP-036B",
    };
  }
  return { ok: true };
}

export function evaluateImp036aAcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R98", stateVersion: "STATE-R96", acceptedThrough: "IMP-036A",
    currentProductSlice: "NONE", nextProductSlice: "IMP-036B", pendingAcceptance: "NONE",
    imp036: "COMPLETE_AND_ACCEPTED", imp036a: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp036b: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f",
    acceptedTree: "4fd243f5923565deceeb6c3f461e0d8a2f5a1eec",
    founderUatPass: true,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036A_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP036A_CAPABILITY_MISSING", message: "IMP-036A locked capability artifact must exist" };
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP036A_IMPLEMENTATION_EVIDENCE", message: "IMP-036A acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP036A_INDEPENDENT_REVIEW", message: "IMP-036A acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP036A_INDEPENDENT_ACCEPTANCE", message: "IMP-036A acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP036A_FORMAL_ACCEPTANCE", message: "IMP-036A acceptance requires formal acceptance ACCEPTED" };
  }
  if (!checkpoint.founderUatPass) {
    return { ok: false, code: "IMP036A_FOUNDER_UAT", message: "IMP-036A acceptance requires Founder UAT PASS" };
  }
  if (!checkpoint.schemaChangeNo) {
    return { ok: false, code: "IMP036A_SCHEMA_CHANGE", message: "IMP-036A acceptance must preserve schema_change: NO" };
  }
  if (!checkpoint.providerIoNo) {
    return { ok: false, code: "IMP036A_PROVIDER_IO", message: "IMP-036A acceptance must preserve provider_IO: NO" };
  }
  if (!checkpoint.newServiceNo) {
    return { ok: false, code: "IMP036A_NEW_SERVICE", message: "IMP-036A acceptance must preserve new_service: NO" };
  }
  if (!checkpoint.newPermissionsNo) {
    return { ok: false, code: "IMP036A_NEW_PERMISSIONS", message: "IMP-036A acceptance must preserve new_permissions: NO" };
  }
  if (!checkpoint.newRolesNo) {
    return { ok: false, code: "IMP036A_NEW_ROLES", message: "IMP-036A acceptance must preserve new_roles: NO" };
  }
  return { ok: true };
}

export function evaluateImp036aAcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036A"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-036A_ARCHITECTURE:\s*LOCKED/,
    /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036A_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-036A_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036A_STARTED:\s*YES/,
    /IMP-036A_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036A_ACCEPTED:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /IMP-036A_FOUNDER_UAT_REQUIRED:\s*YES/,
    /IMP-036A_FOUNDER_UAT:\s*PASS/,
    /schema_change:\s*NO/,
    /provider_IO:\s*NO/,
    /new_service:\s*NO/,
    /new_permissions:\s*NO/,
    /new_roles:\s*NO/,
    /microfrontend:\s*NO/,
    /IMP036A_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP036A_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP036A_ACCEPTED_MAIN_SHA:\s*ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f/,
    /IMP036A_ACCEPTED_TREE:\s*4fd243f5923565deceeb6c3f461e0d8a2f5a1eec/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036A_CAPABILITY_ACCEPTANCE", message: "IMP-036A artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /IMP-036A_ACCEPTED:\s*NO/,
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /new_service:\s*YES/,
    /new_permissions:\s*YES/,
    /new_roles:\s*YES/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036A_CAPABILITY_PROGRESSION", message: "IMP-036A acceptance must not retain pending acceptance or boundary drift" };
  }
  return { ok: true };
}

export function evaluateImp036aAcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp036aAcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);

  const completeAccepted =
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const imp036Accepted =
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance);
  const imp036bPlanned =
    /IMP-036B/.test(currentRoadmapSection) &&
    /Customer Account, Onboarding, Address & Location Experience/.test(currentRoadmapSection);

  if (!completeAccepted || !pendingNone || !imp036Accepted || !imp036bPlanned) {
    return {
      ok: false,
      code: "IMP036A_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-036A COMPLETE_AND_ACCEPTED with pendingAcceptance NONE",
    };
  }
  if (
    /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    /pendingAcceptance:\s*IMP-036A/.test(currentStateAcceptance) ||
    /IMP-036B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection)
  ) {
    return {
      ok: false,
      code: "IMP036A_ACCEPTANCE_RESIDUE",
      message: "acceptance must not retain pending IMP-036A markers or authorize IMP-036B",
    };
  }
  return { ok: true };
}

export function evaluateImp036bImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R99", stateVersion: "STATE-R97", acceptedThrough: "IMP-036A",
    currentProductSlice: "IMP-036B", nextProductSlice: "IMP-036C", pendingAcceptance: "IMP-036B",
    imp036a: "COMPLETE_AND_ACCEPTED", imp036b: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036B_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) {
    return { ok: false, code: "IMP036B_CAPABILITY_MISSING", message: "IMP-036B locked capability artifact must exist and record the completion checkpoint" };
  }
  if (!checkpoint.founderUatRequired) {
    return { ok: false, code: "IMP036B_FOUNDER_UAT", message: "IMP-036B must record FOUNDER_UAT_REQUIRED: YES" };
  }
  return { ok: true };
}

export function evaluateImp036bImplementationCompletionArtifact(text) {
  const required = [
    /"capability":\s*"IMP-036B"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /IMP-036B:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-036B_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036B_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036B_STARTED:\s*YES/,
    /IMP-036B_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036B_ACCEPTED:\s*NO/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
    /schema_change:\s*YES/,
    /provider_IO:\s*YES/,
    /LOCATION_PROVIDER:\s*GOOGLE_MAPS_PLATFORM_V1/,
    /provider_external_IO:\s*YES/,
    /IMP036B_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /serviceability_model:\s*OUTLET_DISTANCE_SERVICEABILITY_V1/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036B_CAPABILITY_COMPLETION", message: "IMP-036B artifact must record the complete locked IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  if (/IMP-036B_ACCEPTED:\s*YES/.test(text) || /IMP-036B:\s*COMPLETE_AND_ACCEPTED/.test(text)) {
    return { ok: false, code: "IMP036B_CAPABILITY_PROGRESSION", message: "IMP-036B completion must not claim accepted" };
  }
  return { ok: true };
}

export function evaluateImp036bImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp036bImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;
  const currentRoadmapSection = documents.roadmapText.slice(
    documents.roadmapText.indexOf("## 2."),
    documents.roadmapText.indexOf("## 3."),
  );
  const stateAcceptanceStart = documents.stateText.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = documents.stateText.indexOf("\n## ", stateAcceptanceStart + 1);
  const currentStateAcceptance = stateAcceptanceStart === -1
    ? ""
    : documents.stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const ok =
    /IMP-036B:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-036B:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /pendingAcceptance:\s*IMP-036B\b/.test(currentStateAcceptance) &&
    /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection);
  if (!ok) {
    return { ok: false, code: "IMP036B_CURRENT_LIFECYCLE", message: "current ROADMAP/STATE/capability markers must record IMP-036B architecture LOCKED and implementation COMPLETE pending acceptance" };
  }
  return { ok: true };
}

export function evaluateImp036bAcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R100",
    stateVersion: "STATE-R98",
    acceptedThrough: "IMP-036B",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-036C",
    pendingAcceptance: "NONE",
    imp036a: "COMPLETE_AND_ACCEPTED",
    imp036b: "COMPLETE_AND_ACCEPTED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "YES",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036B_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) {
    return { ok: false, code: "IMP036B_CAPABILITY_MISSING", message: "IMP-036B locked capability artifact must exist and record acceptance" };
  }
  if (!checkpoint.founderUatPass) {
    return { ok: false, code: "IMP036B_FOUNDER_UAT", message: "IMP-036B must record FOUNDER_UAT: PASS" };
  }
  return { ok: true };
}

export function evaluateImp036bAcceptanceArtifact(text) {
  const required = [
    /"capability":\s*"IMP-036B"/,
    /IMP-036B:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-036B_ACCEPTED:\s*YES/,
    /IMP-036B_FOUNDER_UAT:\s*PASS/,
    /IMP036B_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036B_CAPABILITY_ACCEPTANCE", message: "IMP-036B artifact must record COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

export function evaluateImp036cImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R101",
    stateVersion: "STATE-R99",
    acceptedThrough: "IMP-036B",
    currentProductSlice: "IMP-036C",
    nextProductSlice: "IMP-036D",
    pendingAcceptance: "IMP-036C",
    imp036b: "COMPLETE_AND_ACCEPTED",
    imp036c: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036C_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) {
    return { ok: false, code: "IMP036C_CAPABILITY_MISSING", message: "IMP-036C locked capability artifact must exist" };
  }
  if (!checkpoint.founderUatRequired) {
    return { ok: false, code: "IMP036C_FOUNDER_UAT", message: "IMP-036C must record FOUNDER_UAT_REQUIRED: YES" };
  }
  return { ok: true };
}

export function evaluateImp036cImplementationCompletionArtifact(text) {
  const required = [
    /"capability":\s*"IMP-036C"/,
    /IMP-036C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-036C_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036C_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036C_STARTED:\s*YES/,
    /IMP-036C_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036C_ACCEPTED:\s*NO/,
    /STANDARDIZED_CUSTOMER_DELIVERY_FEE:\s*YES/,
    /FOUNDER_UAT_REQUIRED:\s*YES/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036C_CAPABILITY_COMPLETION", message: "IMP-036C artifact must record completion checkpoint" };
  }
  return { ok: true };
}

export function evaluateImp036cAcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R102",
    stateVersion: "STATE-R100",
    acceptedThrough: "IMP-036C",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-036D",
    pendingAcceptance: "NONE",
    imp036b: "COMPLETE_AND_ACCEPTED",
    imp036c: "COMPLETE_AND_ACCEPTED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "YES",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP036C_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) {
    return { ok: false, code: "IMP036C_CAPABILITY_MISSING", message: "IMP-036C locked capability artifact must exist and record acceptance" };
  }
  if (!checkpoint.founderUatPass) {
    return { ok: false, code: "IMP036C_FOUNDER_UAT", message: "IMP-036C must record FOUNDER_UAT: PASS" };
  }
  return { ok: true };
}

export function evaluateImp036cAcceptanceArtifact(text) {
  const required = [
    /"capability":\s*"IMP-036C"/,
    /IMP-036C:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-036C_ACCEPTED:\s*YES/,
    /IMP-036C_FOUNDER_UAT:\s*PASS/,
    /IMP036C_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP036C_ACCEPTED_MAIN_SHA:\s*0ec83ba5b7b03387dcefbd478807faefc3499d6b/,
    /IMP036C_ACCEPTED_CANDIDATE:\s*0ec83ba5b7b03387dcefbd478807faefc3499d6b/,
    /STANDARDIZED_CUSTOMER_DELIVERY_FEE:\s*YES/,
    /DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY:\s*YES/,
    /IMP036C_DIRECT_MAIN_PROCESS_EXCEPTION:\s*RECONCILED/,
    /IMP036C_PROCESS_EXCEPTION_OUTSTANDING:\s*NO/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036C_CAPABILITY_ACCEPTANCE", message: "IMP-036C artifact must record COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-036D architecture-activation lifecycle facts (R103/S101).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp036dArchitectureActivationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R103",
    stateVersion: "STATE-R101",
    acceptedThrough: "IMP-036C",
    currentProductSlice: "IMP-036D",
    nextProductSlice: "IMP-036E",
    pendingAcceptance: "NONE",
    imp036c: "COMPLETE_AND_ACCEPTED",
    imp036d: "ARCHITECTURE_IN_PROGRESS",
    architecture: "NOT_LOCKED",
    architectureLocked: "NO",
    implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO",
    started: "NO",
    implementationComplete: "NO",
    accepted: "NO",
    imp036e: "PLANNED",
    roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS",
    stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) {
      return { ok: false, code: "IMP036D_ARCHITECTURE_ACTIVATION", message: `${key} must be ${value}` };
    }
  }
  if (checkpoint.d374Exists) {
    return { ok: false, code: "IMP036D_D374", message: "D-374 must not be created during IMP-036D architecture activation" };
  }
  if (checkpoint.capabilityArtifactExists) {
    return {
      ok: false,
      code: "IMP036D_CAPABILITY_ARTIFACT",
      message: "IMP-036D capability artifact must not be created during architecture activation",
    };
  }
  if (checkpoint.refundTopologyResolved) {
    return {
      ok: false,
      code: "IMP036D_REFUND_TOPOLOGY",
      message: "Refund execution topology must remain DECISION_REQUIRED during architecture activation",
    };
  }
  if (checkpoint.imp036cAccepted !== true) {
    return { ok: false, code: "IMP036D_IMP036C_ACCEPTANCE", message: "IMP-036C must remain COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-036D architecture-lock lifecycle facts (R104/S102).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp036dArchitectureLockCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R104",
    stateVersion: "STATE-R102",
    acceptedThrough: "IMP-036C",
    currentProductSlice: "IMP-036D",
    nextProductSlice: "IMP-036E",
    pendingAcceptance: "NONE",
    imp036c: "COMPLETE_AND_ACCEPTED",
    imp036d: "ARCHITECTURE_LOCKED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO",
    started: "NO",
    implementationComplete: "NO",
    accepted: "NO",
    imp036e: "PLANNED",
    roadmapLifecycle: "ARCHITECTURE_LOCKED",
    stateLifecycle: "ARCHITECTURE_LOCKED",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    refundTopology: "RESOLVED_AND_LOCKED",
    refundTopologyBlocksLock: "NO",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) {
      return { ok: false, code: "IMP036D_ARCHITECTURE_LOCK", message: `${key} must be ${value}` };
    }
  }
  if (checkpoint.d374Exists) {
    return { ok: false, code: "IMP036D_D374", message: "D-374 must not be created during IMP-036D architecture lock" };
  }
  if (!checkpoint.capabilityArtifactExists) {
    return {
      ok: false,
      code: "IMP036D_CAPABILITY_ARTIFACT",
      message: "IMP-036D locked capability artifact must exist",
    };
  }
  if (!checkpoint.artifactValid) {
    return {
      ok: false,
      code: "IMP036D_CAPABILITY_LOCK",
      message: "IMP-036D capability artifact must record ARCHITECTURE_LOCKED / NOT_AUTHORIZED",
    };
  }
  if (checkpoint.imp036cAccepted !== true) {
    return { ok: false, code: "IMP036D_IMP036C_ACCEPTANCE", message: "IMP-036C must remain COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate the locked IMP-036D capability artifact without accepting authorization/start progression.
 * @param {string} text
 */
export function evaluateImp036dArchitectureLockArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036D"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*false/,
    /"founderUATRequired":\s*true/,
    /"schemaChangeRequired":\s*false/,
    /IMP-036D:\s*ARCHITECTURE_LOCKED/,
    /IMP-036D_ARCHITECTURE:\s*LOCKED/,
    /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-036D_STARTED:\s*NO/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-036D_ACCEPTED:\s*NO/,
    /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/,
    /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/,
    /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/,
    /REFUND_WORKFORCE_TRANSPORT\s*=\s*OPERATIONS_PROCESS/,
    /REFUND_PROVIDER_EXECUTION\s*=\s*CUSTOMER_COMMERCE/,
    /REFUND_DURABLE_HANDOFF\s*=\s*REFUND_AGGREGATE_ACCEPTED_ROW/,
    /OPERATIONS_RAZORPAY_IO\s*=\s*NO/,
    /OPERATIONS_PAYMENT_PROVIDER\s*=\s*NO/,
    /INTERNAL_HTTP_DELEGATION\s*=\s*NO/,
    /NEW_RPC\s*=\s*NO/,
    /NEW_QUEUE\s*=\s*NO/,
    /NEW_SERVICE\s*=\s*NO/,
    /CUSTOMER_COMMERCE_REFUND_RECONCILER\s*=\s*REUSE/,
    /REFUND_HTTP_IDEMPOTENCY\s*=\s*CLIENT_STABLE_REFUND_REQUEST_UUID_AS_REFUND_ID/,
    /MANUAL_PROVIDER_RECONCILE_ROUTE\s*=\s*NO/,
    /GET\s+\/api\/operations\/v1\/orders\/\{orderId\}\/refunds/,
    /POST\s+\/api\/operations\/v1\/orders\/\{orderId\}\/refunds/,
    /GET\s+\/api\/operations\/v1\/orders\/\{orderId\}\/notifications/,
    /POST\s+\/api\/operations\/v1\/orders\/\{orderId\}\/notifications\/\{notificationRequestId\}\/resend/,
    /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW:\s*DEFERRED/,
    /IMP036D_PREPARATION_READINESS_DECISION:\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/,
    /SCHEMA_CHANGE_REQUIRED:\s*NO/,
    /D-374_CREATED:\s*NO/,
    /ARCH_R20_REQUIRED:\s*NO/,
    /\bD-357\b/,
    /\bD-358\b/,
    /\bD-359\b/,
    /\bD-361\b/,
    /\bD-364\b/,
    /\bD-372\b/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036D_CAPABILITY_LOCK", message: "IMP-036D artifact must record the complete ARCHITECTURE_LOCKED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*true/,
    /IMP-036D_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036D_STARTED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036D_ACCEPTED:\s*YES/,
    /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*DECISION_REQUIRED/,
    /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*YES/,
    /\|\s*D-374\s*\|/,
    /###\s*D-374\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036D_CAPABILITY_PROGRESSION", message: "IMP-036D lock must not claim authorization, start, acceptance, unresolved refund topology, or D-374" };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-036D implementation-authorization lifecycle facts (R105/S103).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp036dImplementationAuthorizationCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R105",
    stateVersion: "STATE-R103",
    acceptedThrough: "IMP-036C",
    currentProductSlice: "IMP-036D",
    nextProductSlice: "IMP-036E",
    pendingAcceptance: "NONE",
    imp036c: "COMPLETE_AND_ACCEPTED",
    imp036d: "ARCHITECTURE_LOCKED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementation: "AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "YES",
    started: "NO",
    implementationComplete: "NO",
    accepted: "NO",
    imp036e: "PLANNED",
    roadmapLifecycle: "ARCHITECTURE_LOCKED",
    stateLifecycle: "ARCHITECTURE_LOCKED",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    refundTopology: "RESOLVED_AND_LOCKED",
    refundTopologyBlocksLock: "NO",
    founderUatRequired: "YES",
    schemaChangeRequired: "NO",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) {
      return { ok: false, code: "IMP036D_IMPLEMENTATION_AUTHORIZATION", message: `${key} must be ${value}` };
    }
  }
  if (checkpoint.d374Exists) {
    return { ok: false, code: "IMP036D_D374", message: "D-374 must not be created during IMP-036D implementation authorization" };
  }
  if (!checkpoint.capabilityArtifactExists) {
    return {
      ok: false,
      code: "IMP036D_CAPABILITY_ARTIFACT",
      message: "IMP-036D locked capability artifact must exist",
    };
  }
  if (!checkpoint.artifactValid) {
    return {
      ok: false,
      code: "IMP036D_CAPABILITY_AUTHORIZATION",
      message: "IMP-036D capability artifact must record ARCHITECTURE_LOCKED / AUTHORIZED / NOT_STARTED",
    };
  }
  if (checkpoint.imp036cAccepted !== true) {
    return { ok: false, code: "IMP036D_IMP036C_ACCEPTANCE", message: "IMP-036C must remain COMPLETE_AND_ACCEPTED" };
  }
  return { ok: true };
}

/**
 * Validate the authorized-not-started IMP-036D capability artifact without accepting start progression.
 * @param {string} text
 */
export function evaluateImp036dImplementationAuthorizationArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-036D"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementationAuthorized":\s*true/,
    /"founderUATRequired":\s*true/,
    /"schemaChangeRequired":\s*false/,
    /IMP-036D:\s*ARCHITECTURE_LOCKED/,
    /IMP-036D_ARCHITECTURE:\s*LOCKED/,
    /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036D_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/,
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036D_STARTED:\s*NO/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-036D_ACCEPTED:\s*NO/,
    /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /Founder implementation authorization recorded at\s*GTM-R105 \/ STATE-R103/,
    /Authorization does not\s*start implementation/,
    /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/,
    /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/,
    /REFUND_WORKFORCE_TRANSPORT\s*=\s*OPERATIONS_PROCESS/,
    /REFUND_PROVIDER_EXECUTION\s*=\s*CUSTOMER_COMMERCE/,
    /REFUND_DURABLE_HANDOFF\s*=\s*REFUND_AGGREGATE_ACCEPTED_ROW/,
    /OPERATIONS_RAZORPAY_IO\s*=\s*NO/,
    /OPERATIONS_PAYMENT_PROVIDER\s*=\s*NO/,
    /INTERNAL_HTTP_DELEGATION\s*=\s*NO/,
    /NEW_RPC\s*=\s*NO/,
    /NEW_QUEUE\s*=\s*NO/,
    /NEW_SERVICE\s*=\s*NO/,
    /CUSTOMER_COMMERCE_REFUND_RECONCILER\s*=\s*REUSE/,
    /REFUND_HTTP_IDEMPOTENCY\s*=\s*CLIENT_STABLE_REFUND_REQUEST_UUID_AS_REFUND_ID/,
    /MANUAL_PROVIDER_RECONCILE_ROUTE\s*=\s*NO/,
    /GET\s+\/api\/operations\/v1\/orders\/\{orderId\}\/refunds/,
    /POST\s+\/api\/operations\/v1\/orders\/\{orderId\}\/refunds/,
    /GET\s+\/api\/operations\/v1\/orders\/\{orderId\}\/notifications/,
    /POST\s+\/api\/operations\/v1\/orders\/\{orderId\}\/notifications\/\{notificationRequestId\}\/resend/,
    /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW:\s*DEFERRED/,
    /IMP036D_PREPARATION_READINESS_DECISION:\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/,
    /SCHEMA_CHANGE_REQUIRED:\s*NO/,
    /D-374_CREATED:\s*NO/,
    /ARCH_R20_REQUIRED:\s*NO/,
    /\bD-357\b/,
    /\bD-358\b/,
    /\bD-359\b/,
    /\bD-361\b/,
    /\bD-364\b/,
    /\bD-372\b/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP036D_CAPABILITY_AUTHORIZATION", message: "IMP-036D artifact must record the complete AUTHORIZED / NOT_STARTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-036D_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-036D_STARTED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036D_ACCEPTED:\s*YES/,
    /IMP-036D:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*DECISION_REQUIRED/,
    /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*YES/,
    /\|\s*D-374\s*\|/,
    /###\s*D-374\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP036D_CAPABILITY_PROGRESSION", message: "IMP-036D authorization must not claim start, acceptance, unlock, unauthorized state, unresolved refund topology, or D-374" };
  }
  return { ok: true };
}


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
    /"implementation":\s*"AUTHORIZED \/ STARTED \/ COMPLETE"/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*NO/,
    /IMP-031:\s*IMPLEMENTATION_AUTHORIZED/,
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-031_ACCEPTED:\s*YES/,
    /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 start must not claim unstarted, unlocked, unauthorized, complete, accepted, or D-373" };
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
 * Validate the exact IMP-031 implementation-complete-pending-acceptance lifecycle facts.
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031ImplementationCompletionCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R78", stateVersion: "STATE-R76", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "IMP-031",
    imp031: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_IMPLEMENTATION_COMPLETION", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  if (!checkpoint.boundaryC) return { ok: false, code: "IMP031_BOUNDARY_C", message: "IMP-031 completion must retain Boundary C" };
  if (!checkpoint.implementationEvidence) {
    return { ok: false, code: "IMP031_IMPLEMENTATION_EVIDENCE", message: "IMP-031 completion must record exact implementation identity evidence" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP031_INDEPENDENT_REVIEW", message: "IMP-031 completion requires independent implementation review PASS" };
  }
  return { ok: true };
}

/**
 * Detect stale present-tense STARTED-only / IN_PROGRESS status in CURRENT IMP-031 capability §§10–11
 * while the completion checkpoint requires AUTHORIZED / STARTED / COMPLETE.
 * @param {string} text
 */
export function evaluateImp031ImplementationCompletionCapabilityCurrentStatus(text) {
  const section10 = extractLiveCanonicalSection(text, "## 10. Architecture-lock acceptance criteria");
  if (!section10.ok) {
    return { ok: false, code: "IMP031_CAPABILITY_SECTION_10", message: section10.message };
  }
  const section11 = extractLiveCanonicalSection(text, "## 11. Open questions for architecture review");
  if (!section11.ok) {
    return { ok: false, code: "IMP031_CAPABILITY_SECTION_11", message: section11.message };
  }

  const staleStartedOnly =
    /`AUTHORIZED`\s*\/\s*`STARTED`(?!\s*\/\s*`COMPLETE`)|AUTHORIZED\s*\/\s*STARTED(?!\s*\/\s*COMPLETE)/;
  const staleInProgress = /IMPLEMENTATION_IN_PROGRESS/;
  const staleStartGate = /start is\s+not completion or acceptance|start remains a separate gate/i;

  const section10AfterCriteria = section10.section.slice(
    Math.max(0, section10.section.search(/These are architecture-lock criteria/)),
  );
  if (
    staleStartedOnly.test(section10AfterCriteria) ||
    staleInProgress.test(section10AfterCriteria) ||
    staleStartGate.test(section10AfterCriteria)
  ) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS_STALE",
      message: "IMP-031 capability §10 current status must not claim STARTED-only / IN_PROGRESS while COMPLETE=YES",
    };
  }
  if (!/`AUTHORIZED`\s*\/\s*`STARTED`\s*\/\s*`COMPLETE`|AUTHORIZED\s*\/\s*STARTED\s*\/\s*COMPLETE/.test(section10AfterCriteria)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS",
      message: "IMP-031 capability §10 current status must record AUTHORIZED / STARTED / COMPLETE",
    };
  }

  if (staleStartedOnly.test(section11.section) || staleInProgress.test(section11.section)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS_STALE",
      message: "IMP-031 capability §11 current status must not claim STARTED-only / IN_PROGRESS while COMPLETE=YES",
    };
  }
  if (!/`AUTHORIZED`\s*\/\s*`STARTED`\s*\/\s*`COMPLETE`|AUTHORIZED\s*\/\s*STARTED\s*\/\s*COMPLETE/.test(section11.section)) {
    return {
      ok: false,
      code: "IMP031_CAPABILITY_STATUS",
      message: "IMP-031 capability §11 current status must record AUTHORIZED / STARTED / COMPLETE",
    };
  }

  return { ok: true };
}

/**
 * Validate the completed-pending-acceptance IMP-031 capability artifact without accepting formal acceptance.
 * @param {string} text
 */
export function evaluateImp031ImplementationCompletionArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"AUTHORIZED \/ STARTED \/ COMPLETE"/,
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
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP-031_ARCHITECTURE:\s*LOCKED/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-031_ACCEPTED:\s*NO/,
    /COMPLETION IS NOT ACCEPTANCE:\s*YES/,
    /IMPLEMENTATION_SOURCE_SHA:\s*66e2783afa4e9eef35c4ec208b25af9d9450f83d/,
    /IMPLEMENTATION_SOURCE_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/,
    /MERGED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/,
    /MERGED_MAIN_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/,
    /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_COMPLETION", message: "IMP-031 artifact must record the complete IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /"implementation":\s*"AUTHORIZED \/ STARTED"/,
    /"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/,
    /"implementation":\s*"NOT_AUTHORIZED \/ NOT_STARTED"/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*NO/,
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-031_ACCEPTED:\s*YES/,
    /IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-031:\s*COMPLETE_AND_ACCEPTED/,
    /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 completion must not claim incomplete, accepted, unlocked, unauthorized, or D-373" };
  }
  const currentStatus = evaluateImp031ImplementationCompletionCapabilityCurrentStatus(text);
  if (!currentStatus.ok) return currentStatus;
  return { ok: true };
}

/**
 * Validate CURRENT ARCHITECTURE.md Delivery / IMP-031 status wording for the completion checkpoint.
 * @param {string} architectureText
 */
export function evaluateImp031ImplementationCompletionCurrentArchitectureStatus(architectureText) {
  const staleCurrent = [
    /\| Delivery \|[^\n]*implementation AUTHORIZED \/ STARTED;/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation AUTHORIZED \/ STARTED\)/,
    /\| Delivery \|[^\n]*implementation AUTHORIZED \/ NOT_STARTED/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation AUTHORIZED \/ NOT_STARTED/,
    /\| Delivery \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*implementation NOT_AUTHORIZED \/ NOT_STARTED/,
  ];
  if (staleCurrent.some((pattern) => pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS_STALE",
      message: "CURRENT ARCHITECTURE must not claim Delivery / IMP-031 STARTED-only while COMPLETE=YES",
    };
  }
  const required = [
    /\| Delivery \|[^\n]*capability architecture LOCKED under IMP-031; implementation AUTHORIZED \/ STARTED \/ COMPLETE;/,
    /\| Delivery \|[^\n]*is `ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED \/ COMPLETE;/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*\(`ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED \/ COMPLETE\)/,
  ];
  if (required.some((pattern) => !pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS",
      message: "CURRENT ARCHITECTURE must record Delivery / IMP-031 architecture LOCKED and implementation AUTHORIZED / STARTED / COMPLETE",
    };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-031 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.
 * @param {{ architectureText: string, capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp031ImplementationCompletionCrossDocumentAlignment(documents) {
  const artifact = evaluateImp031ImplementationCompletionArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const archStatus = evaluateImp031ImplementationCompletionCurrentArchitectureStatus(documents.architectureText);
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
  const completeYes =
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const completeNo =
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-031_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-031_ACCEPTED:\s*YES/.test(currentStateAcceptance) ||
    /IMP-031_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-031_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
    /IMP-031_ACCEPTED:\s*NO/.test(currentStateAcceptance) &&
    /IMP-031_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const pendingComplete =
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) &&
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) &&
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(documents.capabilityText);
  const architectureLocked =
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(documents.capabilityText);
  const architectureUnlocked =
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/.test(documents.capabilityText) ||
    /"architectureLock":\s*"NOT_LOCKED"/.test(documents.capabilityText);
  const pendingAcceptanceImp031 =
    /Pending Acceptance:\s*IMP-031\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*IMP-031\b/.test(currentStateAcceptance);
  const pendingAcceptanceNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) ||
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const acceptedThroughAdvanced =
    /Accepted Through:\s*IMP-031\b/.test(currentRoadmapSection) ||
    /acceptedThrough:\s*IMP-031\b/.test(currentStateAcceptance);
  const currentSliceNone =
    /Current Product Slice:\s*NONE\b/.test(currentRoadmapSection) ||
    /currentProductSlice:\s*NONE\b/.test(currentStateAcceptance);
  const imp032Activated =
    /IMP-032:(?!\s*PLANNED\b)/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection);

  if (completeYes && startedNo) {
    return {
      ok: false,
      code: "IMP031_COMPLETE_WITHOUT_START",
      message: "IMP-031_IMPLEMENTATION_COMPLETE=YES while IMP-031_STARTED=NO",
    };
  }
  if (pendingComplete && completeNo) {
    return {
      ok: false,
      code: "IMP031_PENDING_WITHOUT_COMPLETE",
      message: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE while IMP-031_IMPLEMENTATION_COMPLETE=NO",
    };
  }
  if (acceptedYes) {
    return {
      ok: false,
      code: "IMP031_COMPLETION_ACCEPTED",
      message: "implementation completion must keep IMP-031_ACCEPTED=NO",
    };
  }
  if (acceptedThroughAdvanced) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_THROUGH_ADVANCED",
      message: "implementation completion must not advance acceptedThrough to IMP-031",
    };
  }
  if (pendingAcceptanceNone || !pendingAcceptanceImp031) {
    return {
      ok: false,
      code: "IMP031_PENDING_ACCEPTANCE",
      message: "implementation completion requires pendingAcceptance=IMP-031",
    };
  }
  if (currentSliceNone) {
    return {
      ok: false,
      code: "IMP031_CURRENT_SLICE_CLEARED",
      message: "implementation completion must keep currentProductSlice=IMP-031",
    };
  }
  if (imp032Activated) {
    return {
      ok: false,
      code: "IMP031_IMP032_ACTIVATED",
      message: "IMP-032 must remain PLANNED / NOT_ACTIVATED until IMP-031 acceptance",
    };
  }
  if (completeYes && architectureUnlocked) {
    return {
      ok: false,
      code: "IMP031_COMPLETE_WITHOUT_LOCK",
      message: "implementation complete while architecture is unlocked",
    };
  }
  if (!authorizationYes || !startedYes || !completeYes || !acceptedNo || !pendingComplete || !architectureLocked) {
    return {
      ok: false,
      code: "IMP031_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-031 AUTHORIZED / STARTED / COMPLETE pending acceptance",
    };
  }
  return { ok: true };
}

/**
 * Validate the exact IMP-031 formal-acceptance lifecycle facts (R79/S77).
 * @param {Record<string, unknown>} checkpoint
 */
export function evaluateImp031AcceptanceCheckpoint(checkpoint) {
  const expected = {
    roadmapVersion: "GTM-R79", stateVersion: "STATE-R77", acceptedThrough: "IMP-031",
    currentProductSlice: "NONE", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp030: "COMPLETE_AND_ACCEPTED", imp031: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp032: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "c3d499b0b8df2a8c7ae9297ab870f6286f81b848",
    acceptedTree: "dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (checkpoint[key] !== value) return { ok: false, code: "IMP031_ACCEPTANCE", message: `${key} must be ${value}` };
  }
  if (!checkpoint.artifact) return { ok: false, code: "IMP031_CAPABILITY_MISSING", message: "IMP-031 locked capability artifact must exist" };
  if (!checkpoint.archG24) return { ok: false, code: "IMP031_ARCH_R18", message: "ARCH-R18 must record ARCH-G24" };
  if (checkpoint.d373Exists) return { ok: false, code: "IMP031_D373", message: "D-373 must not be created" };
  if (!checkpoint.boundaryC) return { ok: false, code: "IMP031_BOUNDARY_C", message: "IMP-031 acceptance must retain Boundary C" };
  if (!checkpoint.implementationEvidenceComplete) {
    return { ok: false, code: "IMP031_IMPLEMENTATION_EVIDENCE", message: "IMP-031 acceptance requires implementation evidence COMPLETE" };
  }
  if (!checkpoint.independentReviewPass) {
    return { ok: false, code: "IMP031_INDEPENDENT_REVIEW", message: "IMP-031 acceptance requires independent implementation review PASS" };
  }
  if (!checkpoint.independentAcceptanceAccepted) {
    return { ok: false, code: "IMP031_INDEPENDENT_ACCEPTANCE", message: "IMP-031 acceptance requires independent acceptance ACCEPTED" };
  }
  if (!checkpoint.formalAcceptanceAccepted) {
    return { ok: false, code: "IMP031_FORMAL_ACCEPTANCE", message: "IMP-031 acceptance requires formal acceptance ACCEPTED" };
  }
  if (
    checkpoint.acceptedMainSha === "64d1cc987120302e12497311b486ba122c1047b0" ||
    checkpoint.acceptedTree === "a3ab9266df709b146a49d4324aa3027fa49ac43c"
  ) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_IDENTITY_DRIFT",
      message: "accepted product SHA/tree must remain the immutable PRODUCT_IMPLEMENTATION identity, not completion-governance SHA/tree",
    };
  }
  return { ok: true };
}

/**
 * Validate the formally accepted IMP-031 capability artifact.
 * @param {string} text
 */
export function evaluateImp031AcceptanceArtifact(text) {
  const required = [
    /"status":\s*"CURRENT"/,
    /"authority":\s*"CAPABILITY_ARCHITECTURE"/,
    /"capability":\s*"IMP-031"/,
    /"architectureLock":\s*"ARCHITECTURE_LOCKED"/,
    /"implementation":\s*"COMPLETE_AND_ACCEPTED"/,
    /"implementationAuthorized":\s*true/,
    /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/,
    /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/,
    /IMP-031:\s*COMPLETE_AND_ACCEPTED/,
    /IMP-031_ARCHITECTURE:\s*LOCKED/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-031_STARTED:\s*YES/,
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-031_ACCEPTED:\s*YES/,
    /IMP031_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/,
    /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/,
    /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/,
    /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/,
    /IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/,
    /IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/,
    /IMP-031_FOUNDER_UAT_REQUIRED:\s*NO/,
    /IMPLEMENTATION_SOURCE_SHA:\s*66e2783afa4e9eef35c4ec208b25af9d9450f83d/,
    /MERGED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/,
  ];
  if (required.some((pattern) => !pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_ACCEPTANCE", message: "IMP-031 artifact must record the complete COMPLETE_AND_ACCEPTED checkpoint" };
  }
  const forbidden = [
    /"architectureLock":\s*"NOT_LOCKED"/,
    /"implementationAuthorized":\s*false/,
    /IMP-031_ARCHITECTURE_LOCKED:\s*NO/,
    /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*NO/,
    /IMP-031_STARTED:\s*NO/,
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/,
    /IMP-031_ACCEPTED:\s*NO/,
    /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/,
    /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*NOT_PERFORMED/,
    /IMP031_INDEPENDENT_ACCEPTANCE:\s*NOT_PERFORMED/,
    /IMP031_FORMAL_ACCEPTANCE:\s*NOT_PERFORMED/,
    /IMP031_ACCEPTED_MAIN_SHA:\s*64d1cc987120302e12497311b486ba122c1047b0/,
    /IMP031_ACCEPTED_TREE:\s*a3ab9266df709b146a49d4324aa3027fa49ac43c/,
    /\bD-373\b/,
  ];
  if (forbidden.some((pattern) => pattern.test(text))) {
    return { ok: false, code: "IMP031_CAPABILITY_PROGRESSION", message: "IMP-031 acceptance must not retain pending-acceptance, wrong product identity, unlock, or D-373" };
  }
  return { ok: true };
}

/**
 * Validate CURRENT ARCHITECTURE.md Delivery / IMP-031 status wording for formal acceptance.
 * @param {string} architectureText
 */
export function evaluateImp031AcceptanceCurrentArchitectureStatus(architectureText) {
  // Stale if COMPLETE without COMPLETE_AND_ACCEPTED in the Delivery domain / foundation rows.
  const deliveryRows = architectureText
    .split("\n")
    .filter((line) => /^\| Delivery \|/.test(line) || /^\| Provider-Neutral Delivery Foundation \|/.test(line));
  if (
    deliveryRows.some((line) =>
      /AUTHORIZED \/ STARTED \/ COMPLETE/.test(line) && !/COMPLETE_AND_ACCEPTED/.test(line),
    ) ||
    deliveryRows.some((line) => /IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(line))
  ) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS_STALE",
      message: "CURRENT ARCHITECTURE must not retain pending-acceptance Delivery / IMP-031 wording after formal acceptance",
    };
  }
  const required = [
    /\| Delivery \|[^\n]*capability architecture LOCKED under IMP-031; implementation AUTHORIZED \/ STARTED \/ COMPLETE \/ COMPLETE_AND_ACCEPTED;/,
    /\| Delivery \|[^\n]*is `ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED \/ COMPLETE \/ COMPLETE_AND_ACCEPTED;/,
    /\| Provider-Neutral Delivery Foundation \|[^\n]*\(`ARCHITECTURE_LOCKED`; implementation AUTHORIZED \/ STARTED \/ COMPLETE \/ COMPLETE_AND_ACCEPTED\)/,
  ];
  if (required.some((pattern) => !pattern.test(architectureText))) {
    return {
      ok: false,
      code: "IMP031_ARCH_STATUS",
      message: "CURRENT ARCHITECTURE must record Delivery / IMP-031 COMPLETE_AND_ACCEPTED",
    };
  }
  return { ok: true };
}

/**
 * Cross-document alignment for IMP-031 COMPLETE_AND_ACCEPTED.
 * @param {{ architectureText: string, capabilityText: string, roadmapText: string, stateText: string }} documents
 */
export function evaluateImp031AcceptanceCrossDocumentAlignment(documents) {
  const artifact = evaluateImp031AcceptanceArtifact(documents.capabilityText);
  if (!artifact.ok) return artifact;

  const archStatus = evaluateImp031AcceptanceCurrentArchitectureStatus(documents.architectureText);
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
  const completeYes =
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(documents.capabilityText);
  const completeNo =
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_IMPLEMENTATION_COMPLETE:\s*NO/.test(documents.capabilityText);
  const acceptedYes =
    /IMP-031_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
    /IMP-031_ACCEPTED:\s*YES/.test(currentStateAcceptance) &&
    /IMP-031_ACCEPTED:\s*YES/.test(documents.capabilityText);
  const acceptedNo =
    /IMP-031_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    /IMP-031_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    /IMP-031_ACCEPTED:\s*NO/.test(documents.capabilityText);
  const completeAndAccepted =
    /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) &&
    /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
    /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(documents.capabilityText);
  const independentAccepted =
    /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(documents.capabilityText);
  const formalAccepted =
    /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) &&
    /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) &&
    /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(documents.capabilityText);
  const acceptedThroughImp031 =
    /Accepted Through:\s*IMP-031\b/.test(currentRoadmapSection) &&
    /acceptedThrough:\s*IMP-031\b/.test(currentStateAcceptance);
  const acceptedThroughImp030 =
    /Accepted Through:\s*IMP-030\b/.test(currentRoadmapSection) ||
    /acceptedThrough:\s*IMP-030\b/.test(currentStateAcceptance);
  const pendingNone =
    /Pending Acceptance:\s*NONE\b/.test(currentRoadmapSection) &&
    /pendingAcceptance:\s*NONE\b/.test(currentStateAcceptance);
  const pendingImp031 =
    /Pending Acceptance:\s*IMP-031\b/.test(currentRoadmapSection) ||
    /pendingAcceptance:\s*IMP-031\b/.test(currentStateAcceptance);
  const currentSliceNone =
    /Current Product Slice:\s*NONE\b/.test(currentRoadmapSection) &&
    /currentProductSlice:\s*NONE\b/.test(currentStateAcceptance);
  const currentSliceImp031 =
    /Current Product Slice:\s*IMP-031\b/.test(currentRoadmapSection) ||
    /currentProductSlice:\s*IMP-031\b/.test(currentStateAcceptance);
  const nextImp032 =
    /Next Product Slice:\s*IMP-032\b/.test(currentRoadmapSection) &&
    /nextProductSlice:\s*IMP-032\b/.test(currentStateAcceptance);
  const acceptedShaOk =
    /IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/.test(currentRoadmapSection) &&
    /IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/.test(currentStateAcceptance) &&
    /IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/.test(documents.capabilityText);
  const acceptedTreeOk =
    /IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/.test(currentRoadmapSection) &&
    /IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/.test(currentStateAcceptance) &&
    /IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/.test(documents.capabilityText);
  const wrongAcceptedIdentity =
    /IMP031_ACCEPTED_MAIN_SHA:\s*64d1cc987120302e12497311b486ba122c1047b0/.test(`${currentRoadmapSection}\n${currentStateAcceptance}\n${documents.capabilityText}`) ||
    /IMP031_ACCEPTED_TREE:\s*a3ab9266df709b146a49d4324aa3027fa49ac43c/.test(`${currentRoadmapSection}\n${currentStateAcceptance}\n${documents.capabilityText}`);
  const imp032Activated =
    /IMP-032:(?!\s*PLANNED\b)/.test(currentRoadmapSection) ||
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) ||
    /IMP-032:(?!\s*PLANNED\b)/.test(currentStateAcceptance);

  if (acceptedYes && completeNo) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_WITHOUT_COMPLETE",
      message: "IMP-031_ACCEPTED=YES while IMP-031_IMPLEMENTATION_COMPLETE=NO",
    };
  }
  if (completeAndAccepted && !independentAccepted) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_WITHOUT_INDEPENDENT_ACCEPTANCE",
      message: "COMPLETE_AND_ACCEPTED requires IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE=ACCEPTED",
    };
  }
  if (formalAccepted && acceptedNo) {
    return {
      ok: false,
      code: "IMP031_FORMAL_WITHOUT_ACCEPTED_MARKER",
      message: "IMP031_FORMAL_ACCEPTANCE=ACCEPTED requires IMP-031_ACCEPTED=YES",
    };
  }
  if (acceptedThroughImp030 || !acceptedThroughImp031) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_THROUGH",
      message: "formal acceptance requires acceptedThrough=IMP-031",
    };
  }
  if (pendingImp031 || !pendingNone) {
    return {
      ok: false,
      code: "IMP031_PENDING_ACCEPTANCE",
      message: "formal acceptance requires pendingAcceptance=NONE",
    };
  }
  if (currentSliceImp031 || !currentSliceNone) {
    return {
      ok: false,
      code: "IMP031_CURRENT_SLICE",
      message: "formal acceptance requires currentProductSlice=NONE",
    };
  }
  if (!nextImp032) {
    return {
      ok: false,
      code: "IMP031_NEXT_SLICE",
      message: "formal acceptance must preserve nextProductSlice=IMP-032",
    };
  }
  if (imp032Activated) {
    return {
      ok: false,
      code: "IMP031_IMP032_ACTIVATED",
      message: "IMP-032 must remain PLANNED / NOT_ACTIVATED after IMP-031 acceptance",
    };
  }
  if (wrongAcceptedIdentity || !acceptedShaOk || !acceptedTreeOk) {
    return {
      ok: false,
      code: "IMP031_ACCEPTED_IDENTITY_DRIFT",
      message: "accepted product SHA/tree must remain the immutable PRODUCT_IMPLEMENTATION identity",
    };
  }
  if (!authorizationYes || !startedYes || !completeYes || !acceptedYes || !completeAndAccepted || !formalAccepted) {
    return {
      ok: false,
      code: "IMP031_CURRENT_LIFECYCLE",
      message: "current ROADMAP/STATE/capability markers must record IMP-031 COMPLETE_AND_ACCEPTED",
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
  if (isImp035ImplementationCompletionCheckpoint(roadmap, state)) {
    requiredIds.push("D-372");
    requiredIds.push("D-373");
  }
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
  if (isImp035ImplementationCompletionCheckpoint(roadmap, state)) {
    const d373Row = [...globalSection.split("\n")].find((line) => /^\|\s*D-373\s*\|/.test(line));
    if (
      !d373Row ||
      !/\|\s*CURRENT\s*\|/.test(d373Row) ||
      !/Initial Administration/.test(d373Row) ||
      !/\/api\/admin\/v1\/\*/.test(d373Row) ||
      !/IMP-035/.test(d373Row)
    ) {
      fail(
        "D373_CONTRACT",
        "D-373 must be CURRENT and lock the IMP-035 Initial Administration /api/admin/v1/* boundary",
      );
    } else {
      note("D-373 registered as CURRENT (Initial Administration API Authority)");
    }
    if (!/Next free decision ID advanced to \*\*D-374\*\*/.test(text)) {
      fail("NEXT_DECISION_ID", "Decision register must advance next free ID to D-374 after D-373");
    } else {
      note("Next free decision ID D-374 recorded");
    }
  } else if (isImp029ArchitectureLockCheckpoint(roadmap, state)) {
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
      isImp031ImplementationStartCheckpoint(roadmap, state) ||
      isImp031ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp031AcceptanceCheckpoint(roadmap, state) ||
      isImp032ArchitectureActivationCheckpoint(roadmap, state) ||
      isImp032ArchitectureDraftCheckpoint(roadmap, state) ||
      isImp032ArchitectureLockCheckpoint(roadmap, state) ||
      isImp032ImplementationAuthorizationCheckpoint(roadmap, state) ||
      isImp032ImplementationStartCheckpoint(roadmap, state) ||
      isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state) ||
      isImp032ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp032AcceptanceCheckpoint(roadmap, state) ||
      isImp033ArchitectureActivationCheckpoint(roadmap, state) ||
      isImp033ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp033AcceptanceCheckpoint(roadmap, state) ||
      isImp034ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp034AcceptanceCheckpoint(roadmap, state)
      ? "ARCH-R18"
      : isImp035ImplementationCompletionCheckpoint(roadmap, state) ||
        isImp035AcceptanceCheckpoint(roadmap, state) ||
        isImp036ImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036AcceptanceCheckpoint(roadmap, state) ||
        isEnterpriseExperiencePlanningCheckpoint(roadmap, state) ||
        isImp036aImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036aAcceptanceCheckpoint(roadmap, state) ||
        isImp036bImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036bAcceptanceCheckpoint(roadmap, state) ||
        isImp036cImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036cAcceptanceCheckpoint(roadmap, state) ||
        isImp036dArchitectureActivationCheckpoint(roadmap, state) ||
        isImp036dArchitectureLockCheckpoint(roadmap, state) ||
        isImp036dImplementationAuthorizationCheckpoint(roadmap, state)
        ? "ARCH-R19"
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
      isImp031ImplementationStartCheckpoint(roadmap, state) ||
      isImp031ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp031AcceptanceCheckpoint(roadmap, state) ||
      isImp032ArchitectureActivationCheckpoint(roadmap, state) ||
      isImp032ArchitectureDraftCheckpoint(roadmap, state) ||
      isImp032ArchitectureLockCheckpoint(roadmap, state) ||
      isImp032ImplementationAuthorizationCheckpoint(roadmap, state) ||
      isImp032ImplementationStartCheckpoint(roadmap, state) ||
      isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state) ||
      isImp032ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp032AcceptanceCheckpoint(roadmap, state) ||
      isImp033ArchitectureActivationCheckpoint(roadmap, state) ||
      isImp033ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp033AcceptanceCheckpoint(roadmap, state) ||
      isImp034ImplementationCompletionCheckpoint(roadmap, state) ||
      isImp034AcceptanceCheckpoint(roadmap, state)
      ? "DR-14"
      : isImp035ImplementationCompletionCheckpoint(roadmap, state) ||
        isImp035AcceptanceCheckpoint(roadmap, state) ||
        isImp036ImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036AcceptanceCheckpoint(roadmap, state) ||
        isEnterpriseExperiencePlanningCheckpoint(roadmap, state) ||
        isImp036aImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036aAcceptanceCheckpoint(roadmap, state) ||
        isImp036bImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036bAcceptanceCheckpoint(roadmap, state) ||
        isImp036cImplementationCompletionCheckpoint(roadmap, state) ||
        isImp036cAcceptanceCheckpoint(roadmap, state) ||
        isImp036dArchitectureActivationCheckpoint(roadmap, state) ||
        isImp036dArchitectureLockCheckpoint(roadmap, state) ||
        isImp036dImplementationAuthorizationCheckpoint(roadmap, state)
        ? "DR-15"
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

function checkImp032ArchitectureActivation(roadmap, state, architecture, decision) {
  if (!isImp032ArchitectureActivationCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const capabilitiesDir = path.join(projectRoot, "docs/platform/capabilities");
  let imp032CapabilityPresent = false;
  if (existsSync(capabilitiesDir)) {
    for (const name of readdirSync(capabilitiesDir)) {
      if (/^IMP-032/i.test(name)) {
        imp032CapabilityPresent = true;
        break;
      }
    }
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/, "ROADMAP must record IMP-032 architecture in progress"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE:\s*NOT_LOCKED/, "ROADMAP must record IMP-032 architecture not locked"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE_LOCKED:\s*NO/, "ROADMAP must record IMP-032 architecture lock NO"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-032 implementation not authorized"],
    [currentRoadmapSection, /IMP-032_STARTED:\s*NO/, "ROADMAP must record IMP-032 not started"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-032 incomplete"],
    [currentRoadmapSection, /IMP-032_ACCEPTED:\s*NO/, "ROADMAP must record IMP-032 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /D-373_CREATED:\s*NO/, "ROADMAP must record D-373_CREATED: NO"],
    [currentStateAcceptance, /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/, "STATE must record IMP-032 architecture in progress"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE:\s*NOT_LOCKED/, "STATE must record IMP-032 architecture not locked"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE_LOCKED:\s*NO/, "STATE must record IMP-032 architecture lock NO"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/, "STATE must record IMP-032 implementation not authorized"],
    [currentStateAcceptance, /IMP-032_STARTED:\s*NO/, "STATE must record IMP-032 not started"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-032 incomplete"],
    [currentStateAcceptance, /IMP-032_ACCEPTED:\s*NO/, "STATE must record IMP-032 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /D-373_CREATED:\s*NO/, "STATE must record D-373_CREATED: NO"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP032_ARCHITECTURE_ACTIVATION", message);
  }

  const premature = [
    /IMP-032_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033_STARTED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP032_PREMATURE_PROGRESSION", "IMP-032 activation must not lock architecture, authorize/start implementation, or activate IMP-033");
      break;
    }
  }

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*ARCHITECTURE_IN_PROGRESS/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as ARCHITECTURE_IN_PROGRESS");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }
  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 architecture activation");
  }
  if (imp032CapabilityPresent) {
    fail("IMP032_CAPABILITY_ARTIFACT", "IMP-032 capability architecture artifact must not exist during architecture activation");
  }

  const providerSelected =
    /(?:^|\n)\s*(?:selected|canonical) provider\s*[:=]/im.test(currentLifecycleText) ||
    /(?:^|\n)\s*provider selected\s*[:=]/im.test(currentLifecycleText) ||
    /(?:^|\n)\s*aggregator selected\s*[:=]/im.test(currentLifecycleText) ||
    /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(currentLifecycleText);
  const dehradunModeDefined =
    /(?:^|\n)\s*Dehradun operating mode\s*[:=]\s*(?!UNDECIDED|DEFERRED|NOT_DEFINED|ABSENT)\S+/im.test(currentLifecycleText) ||
    /(?:^|\n)\s*operating mode selected\s*[:=]/im.test(currentLifecycleText) ||
    /IMP-032_OPERATING_MODE:\s*(?!UNDECIDED|DEFERRED|NOT_DEFINED|ABSENT)\S+/i.test(currentLifecycleText);

  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance NONE");
  }
  if (!/IMP-032 ARCHITECTURE_IN_PROGRESS/.test(currentStateActivity)) {
    fail("IMP032_STATE_ACTIVITY", "STATE current governance activity must record IMP-032 ARCHITECTURE_IN_PROGRESS");
  }
  if (!/IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) || /IMP-031_ACCEPTED:\s*NO/.test(currentStateAcceptance)) {
    fail("IMP032_IMP031_REGRESSION", "IMP-032 activation must not regress or reopen IMP-031 acceptance");
  }

  const checkpoint = evaluateImp032ArchitectureActivationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/.test(currentLifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*NOT_LOCKED/.test(currentLifecycleText) ? "NOT_LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(currentLifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    started: /IMP-032_STARTED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    imp033: /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) ? "PLANNED" : "",
    roadmapLifecycle: /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/.test(currentRoadmapSection) ? "ARCHITECTURE_IN_PROGRESS" : "",
    stateLifecycle: /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/.test(currentStateAcceptance) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    capabilityArtifactExists: imp032CapabilityPresent,
    providerSelected,
    dehradunModeDefined,
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(currentLifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note("IMP-032 architecture activation lifecycle valid");
}

function checkImp032ArchitectureDraft(roadmap, state, architecture, decision) {
  if (!isImp032ArchitectureDraftCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032ArchitectureDraftArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;

  const checkpoint = evaluateImp032ArchitectureDraftCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*ARCHITECTURE_IN_PROGRESS/.test(lifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*NOT_LOCKED/.test(lifecycleText) ? "NOT_LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*NO/.test(lifecycleText) ? "NO" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(lifecycleText) ? "NO" : "",
    started: /IMP-032_STARTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    providerSelected: /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(lifecycleText),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 reviewable architecture draft valid (${artifactRel})`);
}

function checkImp032ArchitectureLock(roadmap, state, architecture, decision) {
  if (!isImp032ArchitectureLockCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032ArchitectureLockArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
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

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*ARCHITECTURE_LOCKED/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as ARCHITECTURE_LOCKED");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-032:\s*ARCHITECTURE_LOCKED/, "ROADMAP must record IMP-032 ARCHITECTURE_LOCKED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-032 architecture LOCKED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-032 architecture lock YES"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-032 implementation not authorized"],
    [currentRoadmapSection, /IMP-032_STARTED:\s*NO/, "ROADMAP must record IMP-032 not started"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-032 incomplete"],
    [currentRoadmapSection, /IMP-032_ACCEPTED:\s*NO/, "ROADMAP must record IMP-032 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /D-373_CREATED:\s*NO/, "ROADMAP must record D-373_CREATED: NO"],
    [currentRoadmapSection, /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/, "ROADMAP must record MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY"],
    [currentStateAcceptance, /IMP-032:\s*ARCHITECTURE_LOCKED/, "STATE must record IMP-032 ARCHITECTURE_LOCKED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-032 architecture LOCKED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-032 architecture lock YES"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/, "STATE must record IMP-032 implementation not authorized"],
    [currentStateAcceptance, /IMP-032_STARTED:\s*NO/, "STATE must record IMP-032 not started"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-032 incomplete"],
    [currentStateAcceptance, /IMP-032_ACCEPTED:\s*NO/, "STATE must record IMP-032 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /D-373_CREATED:\s*NO/, "STATE must record D-373_CREATED: NO"],
    [currentStateActivity, /IMP-032 ARCHITECTURE_LOCKED/, "STATE current governance activity must record IMP-032 ARCHITECTURE_LOCKED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP032_ARCHITECTURE_LOCK", message);
  }

  const premature = [
    /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP032_PREMATURE_PROGRESSION", "IMP-032 lock must keep implementation unauthorized/unstarted and IMP-033 unactivated");
      break;
    }
  }

  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 architecture lock");
  }
  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance NONE");
  }

  const checkpoint = evaluateImp032ArchitectureLockCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*ARCHITECTURE_LOCKED/.test(lifecycleText) ? "ARCHITECTURE_LOCKED" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(lifecycleText) ? "NO" : "",
    started: /IMP-032_STARTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/.test(lifecycleText) ? "NO" : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    imp033: /IMP-033:\s*PLANNED(?: \/ NOT_ACTIVATED)?/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    providerSelected: /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(lifecycleText),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 architecture lock valid (${artifactRel})`);
}

function checkImp032ImplementationAuthorization(roadmap, state, architecture, decision) {
  if (!isImp032ImplementationAuthorizationCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032ImplementationAuthorizationArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
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

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*IMPLEMENTATION_AUTHORIZED/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as IMPLEMENTATION_AUTHORIZED");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/, "ROADMAP must record IMP-032 IMPLEMENTATION_AUTHORIZED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-032 architecture LOCKED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-032 architecture lock YES"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/, "ROADMAP must record IMP-032 AUTHORIZED / NOT_STARTED"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-032 implementation authorized"],
    [currentRoadmapSection, /IMP-032_STARTED:\s*NO/, "ROADMAP must record IMP-032 not started"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-032 incomplete"],
    [currentRoadmapSection, /IMP-032_ACCEPTED:\s*NO/, "ROADMAP must record IMP-032 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /D-373_CREATED:\s*NO/, "ROADMAP must record D-373_CREATED: NO"],
    [currentRoadmapSection, /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/, "ROADMAP must record MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY"],
    [currentStateAcceptance, /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/, "STATE must record IMP-032 IMPLEMENTATION_AUTHORIZED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-032 architecture LOCKED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-032 architecture lock YES"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/, "STATE must record IMP-032 AUTHORIZED / NOT_STARTED"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record IMP-032 implementation authorized"],
    [currentStateAcceptance, /IMP-032_STARTED:\s*NO/, "STATE must record IMP-032 not started"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-032 incomplete"],
    [currentStateAcceptance, /IMP-032_ACCEPTED:\s*NO/, "STATE must record IMP-032 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /D-373_CREATED:\s*NO/, "STATE must record D-373_CREATED: NO"],
    [currentStateActivity, /IMP-032 IMPLEMENTATION_AUTHORIZED/, "STATE current governance activity must record IMP-032 IMPLEMENTATION_AUTHORIZED"],
    [currentStateActivity, /AUTHORIZED \/ NOT_STARTED/, "STATE current governance activity must record AUTHORIZED / NOT_STARTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP032_IMPLEMENTATION_AUTHORIZATION", message);
  }

  const premature = [
    /IMP-032_STARTED:\s*YES/,
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP032_PREMATURE_PROGRESSION", "IMP-032 authorization must keep implementation unstarted and IMP-033 unactivated");
      break;
    }
  }

  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 implementation authorization");
  }
  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance NONE");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP032_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-032 implementation authorization");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP032_DR_VERSION", "decision register must remain DR-14 during IMP-032 implementation authorization");
  }

  const crossDocument = evaluateImp032ImplementationAuthorizationCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp032ImplementationAuthorizationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*IMPLEMENTATION_AUTHORIZED/.test(lifecycleText) ? "IMPLEMENTATION_AUTHORIZED" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/.test(lifecycleText) ? "AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-032_STARTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-032_STARTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/.test(lifecycleText) ? "NO" : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    imp033: /IMP-033:\s*PLANNED(?: \/ NOT_ACTIVATED)?/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    providerSelected: /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(lifecycleText),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 implementation authorized (${artifactRel})`);
}

function checkImp032ImplementationStart(roadmap, state, architecture, decision) {
  if (!isImp032ImplementationStartCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032ImplementationStartArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
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

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*IMPLEMENTATION_IN_PROGRESS/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as IMPLEMENTATION_IN_PROGRESS");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/, "ROADMAP must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-032 architecture LOCKED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-032 architecture lock YES"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/, "ROADMAP must record IMP-032 AUTHORIZED / STARTED"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-032 implementation authorized"],
    [currentRoadmapSection, /IMP-032_STARTED:\s*YES/, "ROADMAP must record IMP-032 started"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-032 incomplete"],
    [currentRoadmapSection, /IMP-032_ACCEPTED:\s*NO/, "ROADMAP must record IMP-032 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /D-373_CREATED:\s*NO/, "ROADMAP must record D-373_CREATED: NO"],
    [currentRoadmapSection, /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/, "ROADMAP must record MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY"],
    [currentStateAcceptance, /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/, "STATE must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-032 architecture LOCKED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-032 architecture lock YES"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/, "STATE must record IMP-032 AUTHORIZED / STARTED"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record IMP-032 implementation authorized"],
    [currentStateAcceptance, /IMP-032_STARTED:\s*YES/, "STATE must record IMP-032 started"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-032 incomplete"],
    [currentStateAcceptance, /IMP-032_ACCEPTED:\s*NO/, "STATE must record IMP-032 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /D-373_CREATED:\s*NO/, "STATE must record D-373_CREATED: NO"],
    [currentStateActivity, /IMP-032 IMPLEMENTATION_IN_PROGRESS/, "STATE current governance activity must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentStateActivity, /AUTHORIZED \/ STARTED/, "STATE current governance activity must record AUTHORIZED / STARTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP032_IMPLEMENTATION_START", message);
  }

  const premature = [
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP032_PREMATURE_PROGRESSION", "IMP-032 start must keep implementation incomplete/unaccepted and IMP-033 unactivated");
      break;
    }
  }

  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 implementation start");
  }
  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance NONE");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP032_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-032 implementation start");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP032_DR_VERSION", "decision register must remain DR-14 during IMP-032 implementation start");
  }

  const crossDocument = evaluateImp032ImplementationStartCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp032ImplementationStartCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(lifecycleText) ? "IMPLEMENTATION_IN_PROGRESS" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/.test(lifecycleText) ? "AUTHORIZED / STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/.test(lifecycleText) ? "NO" : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    imp033: /IMP-033:\s*PLANNED(?: \/ NOT_ACTIVATED)?/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    providerSelected: /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(lifecycleText),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 implementation started (${artifactRel})`);
}

function checkImp032PermissionBootstrapClarification(roadmap, state, architecture, decision) {
  if (!isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032PermissionBootstrapClarificationArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
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

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*IMPLEMENTATION_IN_PROGRESS/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as IMPLEMENTATION_IN_PROGRESS");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/, "ROADMAP must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-032 architecture LOCKED"],
    [currentRoadmapSection, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-032 architecture lock YES"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/, "ROADMAP must record IMP-032 AUTHORIZED / STARTED"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-032 implementation authorized"],
    [currentRoadmapSection, /IMP-032_STARTED:\s*YES/, "ROADMAP must record IMP-032 started"],
    [currentRoadmapSection, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-032 incomplete"],
    [currentRoadmapSection, /IMP-032_ACCEPTED:\s*NO/, "ROADMAP must record IMP-032 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /D-373_CREATED:\s*NO/, "ROADMAP must record D-373_CREATED: NO"],
    [currentRoadmapSection, /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/, "ROADMAP must record MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY"],
    [currentRoadmapSection, /PERMITTED_IF_REQUIRED/, "ROADMAP must record access-control data seed PERMITTED_IF_REQUIRED"],
    [currentRoadmapSection, /GTM-R84/, "ROADMAP must record GTM-R84 boundary clarification"],
    [currentStateAcceptance, /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/, "STATE must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-032 architecture LOCKED"],
    [currentStateAcceptance, /IMP-032_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-032 architecture lock YES"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/, "STATE must record IMP-032 AUTHORIZED / STARTED"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record IMP-032 implementation authorized"],
    [currentStateAcceptance, /IMP-032_STARTED:\s*YES/, "STATE must record IMP-032 started"],
    [currentStateAcceptance, /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-032 incomplete"],
    [currentStateAcceptance, /IMP-032_ACCEPTED:\s*NO/, "STATE must record IMP-032 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-033 PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-031:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-031 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /D-373_CREATED:\s*NO/, "STATE must record D-373_CREATED: NO"],
    [currentStateAcceptance, /PERMITTED_IF_REQUIRED/, "STATE must record access-control data seed PERMITTED_IF_REQUIRED"],
    [currentStateAcceptance, /STATE-R82/, "STATE must record STATE-R82 boundary clarification"],
    [currentStateActivity, /IMP-032 IMPLEMENTATION_IN_PROGRESS/, "STATE current governance activity must record IMP-032 IMPLEMENTATION_IN_PROGRESS"],
    [currentStateActivity, /AUTHORIZED \/ STARTED/, "STATE current governance activity must record AUTHORIZED / STARTED"],
    [currentStateActivity, /implementation-boundary clarification/, "STATE current governance activity must record implementation-boundary clarification"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP032_PERMISSION_BOOTSTRAP_CLARIFICATION", message);
  }

  const premature = [
    /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-032_ACCEPTED:\s*YES/,
    /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail("IMP032_PREMATURE_PROGRESSION", "IMP-032 boundary clarification must keep implementation incomplete/unaccepted and IMP-033 unactivated");
      break;
    }
  }

  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 permission-bootstrap boundary clarification");
  }
  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance NONE");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP032_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-032 permission-bootstrap boundary clarification");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP032_DR_VERSION", "decision register must remain DR-14 during IMP-032 permission-bootstrap boundary clarification");
  }

  const crossDocument = evaluateImp032PermissionBootstrapClarificationCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp032PermissionBootstrapClarificationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/.test(lifecycleText) ? "IMPLEMENTATION_IN_PROGRESS" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/.test(lifecycleText) ? "AUTHORIZED / STARTED" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*NO/.test(lifecycleText) ? "NO" : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(lifecycleText) ? "NO" : "",
    imp033: /IMP-033:\s*PLANNED(?: \/ NOT_ACTIVATED)?/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    providerSelected: /IMP-032_PROVIDER(?:_SELECTED)?:\s*(?!NONE|DEFERRED|UNSELECTED|NOT_SELECTED|ABSENT)\S+/i.test(lifecycleText),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 permission-bootstrap boundary clarification (${artifactRel})`);
}

function checkImp032ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp032ImplementationCompletionCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032ImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
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

  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-032 Dehradun Delivery Operating Mode as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP033_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-033 Notification Foundation PLANNED");
  }

  if (
    !/IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) ||
    !/IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    !/IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    !/Pending Acceptance:\s*IMP-032\b/.test(currentRoadmapSection) ||
    state.meta.pendingAcceptance !== "IMP-032"
  ) {
    fail("IMP032_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-032 COMPLETE pending acceptance");
  }

  if (!/IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateActivity)) {
    fail("IMP032_STATE_ACTIVITY", "STATE current governance activity must record IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }

  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP032_D373_CREATED", "D-373 must not be created during IMP-032 implementation completion");
  }
  if (
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "IMP-032" ||
    state.meta.nextProductSlice !== "IMP-033"
  ) {
    fail("IMP032_STATE_POSITION", "STATE must record acceptedThrough IMP-031, currentProductSlice IMP-032, nextProductSlice IMP-033, pendingAcceptance IMP-032");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP032_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-032 implementation completion");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP032_DR_VERSION", "decision register must remain DR-14 during IMP-032 implementation completion");
  }

  const crossDocument = evaluateImp032ImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp032ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(lifecycleText)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/.test(lifecycleText)
      ? "AUTHORIZED / STARTED / COMPLETE"
      : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-032_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-032_ACCEPTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    imp033: /IMP-033:\s*PLANNED(?: \/ NOT_ACTIVATED)?/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    imp031Accepted: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) &&
      /IMP-031_ACCEPTED:\s*YES/.test(lifecycleText),
    founderUatRequired: /IMP-032_FOUNDER_UAT_REQUIRED:\s*YES/.test(lifecycleText) &&
      /IMP-032_FOUNDER_UAT:\s*NOT_STARTED/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 implementation complete pending acceptance (${artifactRel})`);
}

function checkImp032Acceptance(roadmap, state, architecture, decision) {
  if (!isImp032AcceptanceCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp032AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";

  if (/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP032_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-032 pending acceptance after acceptance");
  }
  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP032_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-032 Dehradun Delivery Operating Mode as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*ARCHITECTURE_IN_PROGRESS/.test(futureSection)) {
    fail("IMP033_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-033 Notification Foundation as ARCHITECTURE_IN_PROGRESS");
  }

  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const currentStateAcceptance = (() => {
    const start = state.text.indexOf("## 5. Acceptance Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();

  if (
    !/IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ||
    !/IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    !/IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-032_ACCEPTED:\s*YES/.test(currentStateAcceptance) ||
    !/IMP032_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) ||
    !/IMP032_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) ||
    !/IMP-032_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection) ||
    !/IMP-032_FOUNDER_UAT:\s*PASS/.test(currentStateAcceptance) ||
    state.meta.acceptedThrough !== "IMP-032" ||
    state.meta.pendingAcceptance !== "NONE"
  ) {
    fail("IMP032_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-032 COMPLETE_AND_ACCEPTED with cleared pending");
  }

  const crossDocument = evaluateImp032AcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp032AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp032: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-032_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-032_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-032_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-032_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-032_ACCEPTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    imp033: /IMP-033:\s*PLANNED \/ NOT_ACTIVATED/.test(lifecycleText) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    manualModeDefined: /MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY/.test(artifactText),
    implementationEvidenceComplete: /IMP032_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText),
    independentReviewPass: /IMP_032_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText),
    independentAcceptanceAccepted: /IMP032_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText),
    formalAcceptanceAccepted: /IMP032_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText),
    founderUatPass: /FOUNDER_UAT:\s*PASS/.test(artifactText) && /IMP-032_FOUNDER_UAT:\s*PASS/.test(lifecycleText),
    acceptedMainSha: (artifactText.match(/IMP032_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP032_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-032 COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp033ArchitectureActivation(roadmap, state, architecture, decision) {
  if (!isImp033ArchitectureActivationCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-033-notification-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp033ArchitectureDraftArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*ARCHITECTURE_IN_PROGRESS/.test(futureSection)) {
    fail("IMP033_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-033 Notification Foundation as ARCHITECTURE_IN_PROGRESS");
  }
  if (!/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP034_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-034 Meta WhatsApp Cloud API Adapter PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/, "ROADMAP must record IMP-033 architecture in progress"],
    [currentRoadmapSection, /IMP-033_ARCHITECTURE:\s*NOT_LOCKED/, "ROADMAP must record IMP-033 architecture not locked"],
    [currentRoadmapSection, /IMP-033_ARCHITECTURE_LOCKED:\s*NO/, "ROADMAP must record IMP-033 architecture lock NO"],
    [currentRoadmapSection, /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-033 implementation not authorized"],
    [currentRoadmapSection, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/, "STATE must record IMP-033 architecture in progress"],
    [currentStateAcceptance, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP033_ARCHITECTURE_ACTIVATION", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-032" ||
    state.meta.currentProductSlice !== "IMP-033" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-034"
  ) {
    fail("IMP033_STATE_POSITION", "STATE must record acceptedThrough IMP-032, currentProductSlice IMP-033, nextProductSlice IMP-034, pendingAcceptance NONE");
  }
  if (!/IMP-033 ARCHITECTURE_IN_PROGRESS/.test(currentStateActivity)) {
    fail("IMP033_STATE_ACTIVITY", "STATE current governance activity must record IMP-033 ARCHITECTURE_IN_PROGRESS");
  }

  const checkpoint = evaluateImp033ArchitectureActivationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp032: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp033: /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/.test(currentLifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-033_ARCHITECTURE:\s*NOT_LOCKED/.test(currentLifecycleText) ? "NOT_LOCKED" : "",
    architectureLocked: /IMP-033_ARCHITECTURE_LOCKED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    implementation: /IMP-033_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(currentLifecycleText) ? "NOT_AUTHORIZED / NOT_STARTED" : "",
    implementationAuthorized: /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    started: /IMP-033_STARTED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    implementationComplete: /IMP-033_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    accepted: /IMP-033_ACCEPTED:\s*NO/.test(currentLifecycleText) ? "NO" : "",
    imp034: /IMP-034:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) || /Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    roadmapLifecycle: /IMP-033\s*\|\s*Notification Foundation\s*\|\s*ARCHITECTURE_IN_PROGRESS/.test(futureSection) ? "ARCHITECTURE_IN_PROGRESS" : "",
    stateLifecycle: /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/.test(currentLifecycleText) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    imp032Accepted: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) &&
      /IMP-032_ACCEPTED:\s*YES/.test(currentLifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-033 architecture activation lifecycle valid (${artifactRel})`);
}

function checkImp033ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp033ImplementationCompletionCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-033-notification-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp033ImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP033_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-033 Notification Foundation as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP034_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-034 Meta WhatsApp Cloud API Adapter PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "ROADMAP must record IMP-033 implementation complete pending acceptance"],
    [currentRoadmapSection, /IMP-033_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-033 architecture LOCKED"],
    [currentRoadmapSection, /IMP-033_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-033 architecture lock YES"],
    [currentRoadmapSection, /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-033 implementation authorized"],
    [currentRoadmapSection, /IMP-033_STARTED:\s*YES/, "ROADMAP must record IMP-033 implementation started"],
    [currentRoadmapSection, /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/, "ROADMAP must record IMP-033 implementation complete"],
    [currentRoadmapSection, /IMP-033_ACCEPTED:\s*NO/, "ROADMAP must keep IMP-033 unaccepted"],
    [currentRoadmapSection, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "STATE must record IMP-033 implementation complete pending acceptance"],
    [currentStateAcceptance, /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/, "STATE must record IMP-033 implementation complete"],
    [currentStateAcceptance, /IMP-033_ACCEPTED:\s*NO/, "STATE must keep IMP-033 unaccepted"],
    [currentStateAcceptance, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP033_IMPLEMENTATION_COMPLETION", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-032" ||
    state.meta.currentProductSlice !== "IMP-033" ||
    state.meta.pendingAcceptance !== "IMP-033" ||
    state.meta.nextProductSlice !== "IMP-034"
  ) {
    fail("IMP033_STATE_POSITION", "STATE must record acceptedThrough IMP-032, currentProductSlice IMP-033, nextProductSlice IMP-034, pendingAcceptance IMP-033");
  }
  if (!/IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateActivity)) {
    fail("IMP033_STATE_ACTIVITY", "STATE current governance activity must record IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP033_D373_CREATED", "D-373 must not be created during IMP-033 implementation completion");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP033_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-033 implementation completion");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP033_DR_VERSION", "decision register must remain DR-14 during IMP-033 implementation completion");
  }

  const crossDocument = evaluateImp033ImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp033ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp032: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp033: /IMP-033:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : "",
    architecture: /IMP-033_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementation: /IMP-033_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/.test(currentLifecycleText)
      ? "AUTHORIZED / STARTED / COMPLETE"
      : "",
    implementationAuthorized: /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-033_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-033_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-033_ACCEPTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    imp034: /IMP-034:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) || /Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    imp032Accepted: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) &&
      /IMP-032_ACCEPTED:\s*YES/.test(currentLifecycleText),
    founderUatRequired: /IMP-033_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-033 implementation complete pending acceptance (${artifactRel})`);
}

function checkImp033Acceptance(roadmap, state, architecture, decision) {
  if (!isImp033AcceptanceCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-033-notification-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp033AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (/IMP-033\s*\|\s*Notification Foundation\s*\|/.test(futureSection)) {
    fail("IMP033_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-033 after acceptance");
  }
  if (!/IMP-033\s*\|\s*Notification Foundation\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP033_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-033 Notification Foundation as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP034_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-034 Meta WhatsApp Cloud API Adapter PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-033 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-033_ACCEPTED:\s*YES/, "ROADMAP must record IMP-033 accepted"],
    [currentRoadmapSection, /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "ROADMAP must record IMP-033 independent acceptance evidence ACCEPTED"],
    [currentRoadmapSection, /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-033 formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-033 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-033_ACCEPTED:\s*YES/, "STATE must record IMP-033 accepted"],
    [currentStateAcceptance, /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-033 formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-032:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-032 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP033_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-033" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-034"
  ) {
    fail("IMP033_STATE_POSITION", "STATE must record acceptedThrough IMP-033, currentProductSlice NONE, nextProductSlice IMP-034, pendingAcceptance NONE");
  }
  if (!/IMP-033 COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-034 PLANNED \/ NOT_ACTIVATED/.test(currentStateActivity)) {
    fail("IMP033_STATE_ACTIVITY", "STATE current governance activity must record IMP-033 COMPLETE_AND_ACCEPTED and IMP-034 PLANNED / NOT_ACTIVATED");
  }
  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP033_D373_CREATED", "D-373 must not be created during IMP-033 acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP033_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-033 acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP033_DR_VERSION", "decision register must remain DR-14 during IMP-033 acceptance");
  }

  const crossDocument = evaluateImp033AcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp033AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp032: /IMP-032:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp033: /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-033_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-033_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-033_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-033_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-033_ACCEPTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    imp034: /IMP-034:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) &&
      /IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*PLANNED/.test(futureSection)
      ? "PLANNED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    founderUatRequired: /IMP-033_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText),
    implementationEvidenceComplete: /IMP033_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText) &&
      /IMP033_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(currentLifecycleText),
    independentReviewPass: /IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(currentLifecycleText),
    independentAcceptanceAccepted: /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentLifecycleText),
    formalAcceptanceAccepted: /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentLifecycleText),
    providerIoNo: /provider_IO:\s*NO/.test(artifactText) && /IMP-033_PROVIDER_IO:\s*NO/.test(currentLifecycleText),
    asyncTopologyLocked: /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/.test(artifactText) &&
      /IMP-033_ASYNC_TOPOLOGY:\s*POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/.test(currentLifecycleText),
    acceptedMainSha: (artifactText.match(/IMP033_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP033_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-033 COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp034ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp034ImplementationCompletionCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp034ImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP034_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-034 Meta WhatsApp Cloud API Adapter as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-035\s*\|\s*Initial Administration Capabilities\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP035_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-035 Initial Administration Capabilities PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "ROADMAP must record IMP-034 implementation complete pending acceptance"],
    [currentRoadmapSection, /IMP-034_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-034 architecture LOCKED"],
    [currentRoadmapSection, /IMP-034_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-034 architecture lock YES"],
    [currentRoadmapSection, /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-034 implementation authorized"],
    [currentRoadmapSection, /IMP-034_STARTED:\s*YES/, "ROADMAP must record IMP-034 implementation started"],
    [currentRoadmapSection, /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/, "ROADMAP must record IMP-034 implementation complete"],
    [currentRoadmapSection, /IMP-034_ACCEPTED:\s*NO/, "ROADMAP must keep IMP-034 unaccepted"],
    [currentRoadmapSection, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-033 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-034_PROVIDER_IO:\s*YES/, "ROADMAP must record IMP-034 provider_IO YES"],
    [currentRoadmapSection, /DIRECT_META_CLOUD_API_V1/, "ROADMAP must record DIRECT_META_CLOUD_API_V1"],
    [currentStateAcceptance, /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "STATE must record IMP-034 implementation complete pending acceptance"],
    [currentStateAcceptance, /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/, "STATE must record IMP-034 implementation complete"],
    [currentStateAcceptance, /IMP-034_ACCEPTED:\s*NO/, "STATE must keep IMP-034 unaccepted"],
    [currentStateAcceptance, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-033 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP034_IMPLEMENTATION_COMPLETION", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-033" ||
    state.meta.currentProductSlice !== "IMP-034" ||
    state.meta.pendingAcceptance !== "IMP-034" ||
    state.meta.nextProductSlice !== "IMP-035"
  ) {
    fail("IMP034_STATE_POSITION", "STATE must record acceptedThrough IMP-033, currentProductSlice IMP-034, nextProductSlice IMP-035, pendingAcceptance IMP-034");
  }
  if (!/IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateActivity)) {
    fail("IMP034_STATE_ACTIVITY", "STATE current governance activity must record IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP034_D373_CREATED", "D-373 must not be created during IMP-034 implementation completion");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP034_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-034 implementation completion");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP034_DR_VERSION", "decision register must remain DR-14 during IMP-034 implementation completion");
  }

  const crossDocument = evaluateImp034ImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp034ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp033: /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp034: /IMP-034:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : "",
    architecture: /IMP-034_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementation: /IMP-034_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/.test(currentLifecycleText)
      ? "AUTHORIZED / STARTED / COMPLETE"
      : "",
    implementationAuthorized: /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-034_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-034_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-034_ACCEPTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    imp035: /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) ||
      /Initial Administration Capabilities\s*\|\s*PLANNED/.test(futureSection)
      ? "PLANNED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    imp033Accepted: /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) &&
      /IMP-033_ACCEPTED:\s*YES/.test(currentLifecycleText),
    founderUatRequired: /IMP-034_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-034 implementation complete pending acceptance (${artifactRel})`);
}


function loadImp035CompletionFixture(suffix) {
  return readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), `fixtures/imp035-completion-${suffix}.md`),
    "utf8",
  );
}

function checkImp035ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp035ImplementationCompletionCheckpoint(roadmap, state)) return;

  const completionCapabilityText = loadImp035CompletionFixture("capability");
  const completionRoadmapText = loadImp035CompletionFixture("roadmap");
  const completionStateText = loadImp035CompletionFixture("state");
  const currentRoadmapSection = completionRoadmapText.slice(
    completionRoadmapText.indexOf("## 2."),
    completionRoadmapText.indexOf("## 3."),
  );
  const currentStateAcceptance = (() => {
    const start = completionStateText.indexOf("## 5. Acceptance Position");
    const end = completionStateText.indexOf("\n## ", start + 1);
    return start === -1 ? "" : completionStateText.slice(start, end === -1 ? undefined : end);
  })();
  const currentStateActivity = (() => {
    const start = completionStateText.indexOf("## 2. Current Work Position");
    const end = completionStateText.indexOf("\n## ", start + 1);
    return start === -1 ? "" : completionStateText.slice(start, end === -1 ? undefined : end);
  })();
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = completionRoadmapText.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-035-initial-administration-capabilities.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactValidation = evaluateImp035ImplementationCompletionArtifact(completionCapabilityText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-035\s*\|\s*Initial Administration Capabilities\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP035_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-035 Initial Administration Capabilities as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-036\s*\|\s*Observability & Operational Controls\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036 Observability & Operational Controls PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "ROADMAP must record IMP-035 implementation complete pending acceptance"],
    [currentRoadmapSection, /IMP-035_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-035 architecture lock YES"],
    [currentRoadmapSection, /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-035 implementation authorized"],
    [currentRoadmapSection, /IMP-035_STARTED:\s*YES/, "ROADMAP must record IMP-035 implementation started"],
    [currentRoadmapSection, /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/, "ROADMAP must record IMP-035 implementation complete"],
    [currentRoadmapSection, /IMP-035_ACCEPTED:\s*NO/, "ROADMAP must keep IMP-035 unaccepted"],
    [currentRoadmapSection, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-034 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/, "ROADMAP must record IMP-035 Founder UAT required"],
    [currentStateAcceptance, /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/, "STATE must record IMP-035 implementation complete pending acceptance"],
    [currentStateAcceptance, /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/, "STATE must record IMP-035 implementation complete"],
    [currentStateAcceptance, /IMP-035_ACCEPTED:\s*NO/, "STATE must keep IMP-035 unaccepted"],
    [currentStateAcceptance, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-034 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP035_IMPLEMENTATION_COMPLETION", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-034" ||
    state.meta.currentProductSlice !== "IMP-035" ||
    state.meta.pendingAcceptance !== "IMP-035" ||
    state.meta.nextProductSlice !== "IMP-036"
  ) {
    fail("IMP035_STATE_POSITION", "STATE must record acceptedThrough IMP-034, currentProductSlice IMP-035, nextProductSlice IMP-036, pendingAcceptance IMP-035");
  }
  if (!/IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateActivity)) {
    fail("IMP035_STATE_ACTIVITY", "STATE current governance activity must record IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP035_D373_MISSING", "D-373 must be created during IMP-035 implementation completion");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP035_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-035 implementation completion");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP035_DR_VERSION", "decision register must be DR-15 during IMP-035 implementation completion");
  }
  if (!architecture || !/\| ARCH-G25 \|/.test(architecture.text)) {
    fail("IMP035_ARCH_G25", "ARCHITECTURE must record ARCH-G25");
  }

  const crossDocument = evaluateImp035ImplementationCompletionCrossDocumentAlignment({
    capabilityText: completionCapabilityText,
    roadmapText: completionRoadmapText,
    stateText: completionStateText,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp035ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp034: /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp035: /IMP-035:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText) ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" : "",
    architecture: /IMP-035_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-035_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-035_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-035_ACCEPTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    archG25: Boolean(architecture && /\| ARCH-G25 \|/.test(architecture.text)),
    founderUatRequired: /IMP-035_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(completionCapabilityText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-035 implementation complete pending acceptance (${artifactRel})`);
}

function checkImp035Acceptance(roadmap, state, architecture, decision) {
  if (!isImp035AcceptanceCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-035-initial-administration-capabilities.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp035AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (/IMP-035\s*\|\s*Initial Administration Capabilities\s*\|/.test(futureSection)) {
    fail("IMP035_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-035 after acceptance");
  }
  if (!/IMP-035\s*\|\s*Initial Administration Capabilities\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP035_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-035 Initial Administration Capabilities as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-036\s*\|\s*Observability & Operational Controls\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036 Observability & Operational Controls PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-035:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-035 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-035_ACCEPTED:\s*YES/, "ROADMAP must record IMP-035 accepted"],
    [currentRoadmapSection, /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "ROADMAP must record IMP-035 independent acceptance evidence ACCEPTED"],
    [currentRoadmapSection, /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-035 formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-035_FOUNDER_UAT:\s*PASS/, "ROADMAP must record IMP-035 Founder UAT PASS"],
    [currentRoadmapSection, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-034 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-035:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-035 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-035_ACCEPTED:\s*YES/, "STATE must record IMP-035 accepted"],
    [currentStateAcceptance, /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-035 formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-035_FOUNDER_UAT:\s*PASS/, "STATE must record IMP-035 Founder UAT PASS"],
    [currentStateAcceptance, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-034 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP035_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-035" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036"
  ) {
    fail("IMP035_STATE_POSITION", "STATE must record acceptedThrough IMP-035, currentProductSlice NONE, nextProductSlice IMP-036, pendingAcceptance NONE");
  }
  if (!/IMP-035 COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-036 PLANNED \/ NOT_ACTIVATED/.test(currentStateActivity)) {
    fail("IMP035_STATE_ACTIVITY", "STATE current governance activity must record IMP-035 COMPLETE_AND_ACCEPTED and IMP-036 PLANNED / NOT_ACTIVATED");
  }
  if (!/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP035_D373_MISSING", "D-373 must exist during IMP-035 acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP035_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-035 acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP035_DR_VERSION", "decision register must be DR-15 during IMP-035 acceptance");
  }
  if (!architecture || !/\| ARCH-G25 \|/.test(architecture.text)) {
    fail("IMP035_ARCH_G25", "ARCHITECTURE must record ARCH-G25");
  }

  const crossDocument = evaluateImp035AcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp035AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp034: /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp035: /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-035_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-035_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-035_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-035_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-035_ACCEPTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    imp036: /IMP-036:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) &&
      /Observability & Operational Controls\s*\|\s*PLANNED/.test(futureSection)
      ? "PLANNED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    archG25: Boolean(architecture && /\| ARCH-G25 \|/.test(architecture.text)),
    implementationEvidenceComplete: /IMP035_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText) &&
      /IMP035_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(currentLifecycleText),
    independentReviewPass: /IMP_035_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_035_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(currentLifecycleText),
    independentAcceptanceAccepted: /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentLifecycleText),
    formalAcceptanceAccepted: /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP035_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentLifecycleText),
    founderUatPass: /FOUNDER_UAT:\s*PASS/.test(artifactText) && /IMP-035_FOUNDER_UAT:\s*PASS/.test(currentLifecycleText),
    schemaChangeNo: /schema_change:\s*NO/.test(artifactText) && /IMP-035_SCHEMA_CHANGE:\s*NO/.test(currentLifecycleText),
    providerIoNo: /provider_IO:\s*NO/.test(artifactText) && /IMP-035_PROVIDER_IO:\s*NO/.test(currentLifecycleText),
    newServiceNo: /new_service:\s*NO/.test(artifactText) && /IMP-035_NEW_SERVICE:\s*NO/.test(currentLifecycleText),
    newPermissionsNo: /new_permissions:\s*NO/.test(artifactText) && /IMP-035_NEW_PERMISSIONS:\s*NO/.test(currentLifecycleText),
    newRolesNo: /new_roles:\s*NO/.test(artifactText) && /IMP-035_NEW_ROLES:\s*NO/.test(currentLifecycleText),
    acceptedMainSha: (artifactText.match(/IMP035_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP035_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-035 COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp036ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp036ImplementationCompletionCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036-observability-operational-controls.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036ImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-036\s*\|\s*Observability & Operational Controls\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP036_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-036 Observability & Operational Controls as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-037\s*\|\s*Backup, Restore & Migration Readiness\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP037_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-037 Backup, Restore & Migration Readiness PLANNED");
  }

  if (
    state.meta.acceptedThrough !== "IMP-035" ||
    state.meta.currentProductSlice !== "IMP-036" ||
    state.meta.pendingAcceptance !== "IMP-036" ||
    state.meta.nextProductSlice !== "IMP-037"
  ) {
    fail("IMP036_STATE_POSITION", "STATE must record acceptedThrough IMP-035, currentProductSlice IMP-036, nextProductSlice IMP-037, pendingAcceptance IMP-036");
  }

  const crossDocument = evaluateImp036ImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp036ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp035: /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036: /IMP-036:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText) ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" : "",
    architecture: /IMP-036_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-036_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? ""),
    founderUatNotRequired: /IMP-036_FOUNDER_UAT_REQUIRED:\s*NO/.test(currentLifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036 implementation complete pending acceptance (${artifactRel})`);
}

function checkImp036Acceptance(roadmap, state, architecture, decision) {
  if (!isImp036AcceptanceCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036-observability-operational-controls.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (/IMP-036\s*\|\s*Observability & Operational Controls\s*\|/.test(futureSection)) {
    fail("IMP036_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-036 after acceptance");
  }
  if (!/IMP-036\s*\|\s*Observability & Operational Controls\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP036_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-036 Observability & Operational Controls as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-037\s*\|\s*Backup, Restore & Migration Readiness\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP037_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-037 Backup, Restore & Migration Readiness PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-036 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-036_ACCEPTED:\s*YES/, "ROADMAP must record IMP-036 accepted"],
    [currentRoadmapSection, /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "ROADMAP must record IMP-036 independent acceptance evidence ACCEPTED"],
    [currentRoadmapSection, /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-036 formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-035:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-035 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-036 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036_ACCEPTED:\s*YES/, "STATE must record IMP-036 accepted"],
    [currentStateAcceptance, /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-036 formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-035:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-035 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-036" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-037"
  ) {
    fail("IMP036_STATE_POSITION", "STATE must record acceptedThrough IMP-036, currentProductSlice NONE, nextProductSlice IMP-037, pendingAcceptance NONE");
  }
  if (!/IMP-036 COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-037 PLANNED \/ NOT_ACTIVATED/.test(currentStateActivity)) {
    fail("IMP036_STATE_ACTIVITY", "STATE current governance activity must record IMP-036 COMPLETE_AND_ACCEPTED and IMP-037 PLANNED / NOT_ACTIVATED");
  }
  if (/\|\s*D-374\s*\|/.test(decision?.text ?? "")) {
    fail("IMP036_D374_CREATED", "D-374 must not be created during IMP-036 acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R19 during IMP-036 acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036_DR_VERSION", "decision register must remain DR-15 during IMP-036 acceptance");
  }

  const crossDocument = evaluateImp036AcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp036AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp035: /IMP-035:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036: /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-036_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-036_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-036_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036_ACCEPTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    imp037: /IMP-037:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) &&
      /Backup, Restore & Migration Readiness\s*\|\s*PLANNED/.test(futureSection)
      ? "PLANNED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? ""),
    founderUatRequired: /IMP-036_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText),
    implementationEvidenceComplete: /IMP036_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText) &&
      /IMP036_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(currentLifecycleText),
    independentReviewPass: /IMP_036_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_036_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(currentLifecycleText),
    independentAcceptanceAccepted: /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentLifecycleText),
    formalAcceptanceAccepted: /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP036_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentLifecycleText),
    schemaChangeNo: /schema_change:\s*NO/.test(artifactText) && /IMP-036_SCHEMA_CHANGE:\s*NO/.test(currentLifecycleText),
    providerIoNo: /provider_IO:\s*NO/.test(artifactText) && /IMP-036_PROVIDER_IO:\s*NO/.test(currentLifecycleText),
    newServiceNo: /new_service:\s*NO/.test(artifactText) && /IMP-036_NEW_SERVICE:\s*NO/.test(currentLifecycleText),
    newPermissionsNo: /new_permissions:\s*NO/.test(artifactText) && /IMP-036_NEW_PERMISSIONS:\s*NO/.test(currentLifecycleText),
    newRolesNo: /new_roles:\s*NO/.test(artifactText) && /IMP-036_NEW_ROLES:\s*NO/.test(currentLifecycleText),
    acceptedMainSha: (artifactText.match(/IMP036_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP036_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036 COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkEnterpriseExperiencePlanning(roadmap, state, architecture, decision) {
  if (!isEnterpriseExperiencePlanningCheckpoint(roadmap, state)) return;

  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const stateAcceptanceStart = state.text.indexOf("## 5. Acceptance Position");
  const stateAcceptanceEnd = state.text.indexOf("\n## ", stateAcceptanceStart + 1);
  const stateAcceptance = stateAcceptanceStart === -1
    ? ""
    : state.text.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
  const programmeRel = "docs/platform/experience/enterprise-experience/README.md";
  const sliceRels = [
    "IMP-036A-multi-portal-experience-foundation.md",
    "IMP-036B-customer-account-onboarding-address-location.md",
    "IMP-036C-customer-commerce-experience-v2.md",
    "IMP-036D-workforce-franchise-operations-v2.md",
    "IMP-036E-store-operations-management.md",
    "IMP-036F-catalog-menu-pricing-promotions.md",
    "IMP-036G-administration-console-v2.md",
  ].map((name) => `docs/platform/experience/enterprise-experience/${name}`);
  const programme = resolveExactRelativeFile(programmeRel);
  const slices = sliceRels.map((relative) => resolveExactRelativeFile(relative));
  const programmeText = programme ? readFileSync(programme, "utf8") : "";
  const sliceTexts = slices.filter(Boolean).map((absolute) => readFileSync(absolute, "utf8"));
  const stateLifecyclePattern = (id) => new RegExp(`${id}:\\s*PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED`);
  const roadmapLifecyclePattern = (id) => new RegExp(`\\|\\s*${id}\\s*\\|[^\\n]+\\|\\s*PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED\\s*\\|`);
  const sliceIds = ["IMP-036A", "IMP-036B", "IMP-036C", "IMP-036D", "IMP-036E", "IMP-036F", "IMP-036G"];

  const checkpoint = evaluateEnterpriseExperiencePlanningCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    gtmBoundary: roadmap.meta.gtmBoundary,
    imp036: /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp037: /IMP-037\s*\|\s*Backup, Restore & Migration Readiness\s*\|\s*PLANNED/.test(futureSection) ? "PLANNED" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    figmaRequiredNow: programme ? !/FIGMA_REQUIRED_FOR_INITIAL_IMPLEMENTATION\s*=\s*NO/.test(programmeText) : true,
    programmeArtifact: programme !== null,
    sliceArtifactCount: slices.filter(Boolean).length,
    allPlanned: sliceIds.every((id) => roadmapLifecyclePattern(id).test(futureSection) && stateLifecyclePattern(id).test(stateAcceptance)),
    allNotActivated: sliceTexts.every((text) => /Lifecycle:\s*PLANNED \/ NOT_ACTIVATED/.test(text)),
    allNotAuthorized: sliceTexts.every((text) => /Implementation:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(text)),
    allNotStarted: sliceTexts.every((text) => /Implementation:\s*NOT_AUTHORIZED \/ NOT_STARTED/.test(text)),
    allArchitectureNotLocked: sliceTexts.every((text) => /Architecture:\s*NOT_LOCKED/.test(text)),
    allFounderUatRequired: sliceTexts.every((text) => /Founder UAT required:\s*YES/.test(text)),
    customerSliceOrderCorrect:
      /\|\s*IMP-036B\s*\|\s*Customer Account, Onboarding, Address & Location Experience\s*\|/.test(futureSection) &&
      /\|\s*IMP-036C\s*\|\s*Customer Commerce Experience V2\s*\|/.test(futureSection) &&
      /Capability:\s*IMP-036B — Customer Account, Onboarding, Address & Location Experience/.test(sliceTexts[1] ?? "") &&
      /Capability:\s*IMP-036C — Customer Commerce Experience V2/.test(sliceTexts[2] ?? "") &&
      /IMP-036B\s+Customer Account, Onboarding, Address & Location Experience\s*\n→ IMP-036C\s+Customer Commerce Experience V2/.test(programmeText),
    workforceHubPlanned:
      /\/workforce\/.*landing\/application-selection hub/s.test(sliceTexts[0] ?? "") &&
      /currently\s+implemented\/authorized destinations derived from effective permissions and scope/s.test(sliceTexts[0] ?? "") &&
      /one existing canonical workforce authentication\/session authority/.test(sliceTexts[0] ?? ""),
    teamAdministrationPlanned:
      ["access.membership.*", "access.role_assignment.*", "access.effective_permissions.*", "access.audit.read"]
        .every((token) => (sliceTexts[4] ?? "").includes(token)) &&
      /Team\s*\n\s*├── Members\s*\n\s*└── Access/.test(sliceTexts[4] ?? ""),
    supportRefundPlanned:
      /refund action\/recovery/.test(sliceTexts[3] ?? "") &&
      /existing Order\s+cancellation/s.test(sliceTexts[3] ?? "") &&
      /notification resend/.test(sliceTexts[3] ?? "") &&
      /Delivery recovery/.test(sliceTexts[3] ?? "") &&
      /financial-document\/read context/.test(sliceTexts[3] ?? ""),
    preparationAssessmentPlanned:
      /DECISION_REQUIRED/.test(sliceTexts[3] ?? "") &&
      /`PREPARING`, `READY`/.test(sliceTexts[3] ?? "") &&
      /separate preparation\/fulfilment authority/.test(sliceTexts[3] ?? "") &&
      /unnecessary for BOBA V1/.test(sliceTexts[3] ?? ""),
    navigationAvailabilityRule:
      /NAVIGATION_MUST_NOT_ADVERTISE_UNIMPLEMENTED_CAPABILITIES/.test(programmeText) &&
      /must not show dead links for IMP-036D\/E\/F\/G/.test(programmeText),
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? ""),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`Enterprise Experience Programme planned only (${programmeRel}; 7 slice contracts)`);
}

function checkImp036aImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp036aImplementationCompletionCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036A-multi-portal-experience-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036aImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (!/IMP-036A\s*\|\s*Multi-Portal Experience Foundation\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP036A_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-036A as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (!/IMP-036B\s*\|\s*Customer Account, Onboarding, Address & Location Experience\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036B_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036B PLANNED");
  }

  if (
    state.meta.acceptedThrough !== "IMP-036" ||
    state.meta.currentProductSlice !== "IMP-036A" ||
    state.meta.pendingAcceptance !== "IMP-036A" ||
    state.meta.nextProductSlice !== "IMP-036B"
  ) {
    fail("IMP036A_STATE_POSITION", "STATE must record acceptedThrough IMP-036, currentProductSlice IMP-036A, nextProductSlice IMP-036B, pendingAcceptance IMP-036A");
  }

  const crossDocument = evaluateImp036aImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp036aImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036: /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036a: /IMP-036A:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText) ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" : "",
    architecture: /IMP-036A_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) || /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-036A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036A_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036A_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036A_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    founderUatRequired: /IMP-036A_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036A implementation complete pending acceptance (${artifactRel})`);
}

function checkImp036aAcceptance(roadmap, state, architecture, decision) {
  if (!isImp036aAcceptanceCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036A-multi-portal-experience-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036aAcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (/IMP-036A\s*\|\s*Multi-Portal Experience Foundation\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP036A_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-036A as pending acceptance");
  }
  if (!/IMP-036A\s*\|\s*Multi-Portal Experience Foundation\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP036A_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-036A as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-036B\s*\|\s*Customer Account, Onboarding, Address & Location Experience\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036B_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036B PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036A:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-036A COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-036A_ACCEPTED:\s*YES/, "ROADMAP must record IMP-036A accepted"],
    [currentRoadmapSection, /IMP036A_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-036A formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-036A_FOUNDER_UAT:\s*PASS/, "ROADMAP must record IMP-036A Founder UAT PASS"],
    [currentRoadmapSection, /IMP-036:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-036 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036A:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-036A COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036A_ACCEPTED:\s*YES/, "STATE must record IMP-036A accepted"],
    [currentStateAcceptance, /IMP036A_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-036A formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-036A_FOUNDER_UAT:\s*PASS/, "STATE must record IMP-036A Founder UAT PASS"],
    [currentStateAcceptance, /IMP-036:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-036 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036A_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-036A" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036B"
  ) {
    fail("IMP036A_STATE_POSITION", "STATE must record acceptedThrough IMP-036A, currentProductSlice NONE, nextProductSlice IMP-036B, pendingAcceptance NONE");
  }
  if (!/IMP-036A COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-036B/.test(currentStateActivity)) {
    fail("IMP036A_STATE_ACTIVITY", "STATE current governance activity must record IMP-036A COMPLETE_AND_ACCEPTED and IMP-036B planned");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036A_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-036A acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036A_DR_VERSION", "decision register must be DR-15 during IMP-036A acceptance");
  }

  const crossDocument = evaluateImp036aAcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp036aAcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036: /IMP-036:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036a: /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036b: /IMP-036B:\s*PLANNED/.test(currentLifecycleText) ? "PLANNED" : "",
    architecture: /IMP-036A_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) || /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-036A_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-036A_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036A_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036A_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036A_ACCEPTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    implementationEvidenceComplete: /IMP036A_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(currentLifecycleText),
    independentReviewPass: /IMP036A_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(currentLifecycleText),
    independentAcceptanceAccepted: /IMP036A_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentLifecycleText),
    formalAcceptanceAccepted: /IMP036A_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentLifecycleText),
    founderUatPass: /IMP-036A_FOUNDER_UAT:\s*PASS/.test(currentLifecycleText),
    schemaChangeNo: /schema_change:\s*NO/.test(currentLifecycleText),
    providerIoNo: /provider_IO:\s*NO/.test(currentLifecycleText),
    newServiceNo: /new_service:\s*NO/.test(currentLifecycleText),
    newPermissionsNo: /new_permissions:\s*NO/.test(currentLifecycleText),
    newRolesNo: /new_roles:\s*NO/.test(currentLifecycleText),
    acceptedMainSha: /IMP036A_ACCEPTED_MAIN_SHA:\s*ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f/.test(currentLifecycleText) ? "ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f" : "",
    acceptedTree: /IMP036A_ACCEPTED_TREE:\s*4fd243f5923565deceeb6c3f461e0d8a2f5a1eec/.test(currentLifecycleText) ? "4fd243f5923565deceeb6c3f461e0d8a2f5a1eec" : "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036A COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp036bImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp036bImplementationCompletionCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036B-customer-account-onboarding-address-location.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036bImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  if (!/IMP-036B\s*\|\s*Customer Account, Onboarding, Address & Location Experience\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP036B_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-036B as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
  }
  if (
    state.meta.acceptedThrough !== "IMP-036A" ||
    state.meta.currentProductSlice !== "IMP-036B" ||
    state.meta.pendingAcceptance !== "IMP-036B" ||
    state.meta.nextProductSlice !== "IMP-036C"
  ) {
    fail("IMP036B_STATE_POSITION", "STATE must record acceptedThrough IMP-036A, currentProductSlice IMP-036B, nextProductSlice IMP-036C, pendingAcceptance IMP-036B");
  }
  const crossDocument = evaluateImp036bImplementationCompletionCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);
  const checkpoint = evaluateImp036bImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036a: /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036b: /IMP-036B:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentLifecycleText) ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" : "",
    architecture: /IMP-036B_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-036B_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-036B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036B_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036B_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036B_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    founderUatRequired: /IMP-036B_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036B implementation complete pending acceptance (${artifactRel})`);
}

function checkImp036bAcceptance(roadmap, state, architecture, decision) {
  if (!isImp036bAcceptanceCheckpoint(roadmap, state)) return;

  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const currentStateAcceptance = (() => {
    const start = state.text.indexOf("## 5. Acceptance Position");
    const end = state.text.indexOf("\n## ", start + 1);
    return start === -1 ? "" : state.text.slice(start, end === -1 ? undefined : end);
  })();
  const artifactRel = "docs/platform/capabilities/IMP-036B-customer-account-onboarding-address-location.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036bAcceptanceArtifact(artifactText);
  if (artifact !== null && !artifactValidation.ok) fail(artifactValidation.code, artifactValidation.message);
  const checkpoint = evaluateImp036bAcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036a: /IMP-036A:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036b: /IMP-036B:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-036B_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "LOCKED" : "",
    architectureLocked: /IMP-036B_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationAuthorized: /IMP-036B_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036B_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036B_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036B_ACCEPTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifact !== null && artifactValidation.ok,
    founderUatPass: /IMP-036B_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036B COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp036cImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp036cImplementationCompletionCheckpoint(roadmap, state)) return;

  const currentRoadmapSection = roadmap.text.slice(roadmap.text.indexOf("## 2."), roadmap.text.indexOf("## 3."));
  const artifactRel = "docs/platform/capabilities/IMP-036C-customer-commerce-experience-v2.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036cImplementationCompletionArtifact(artifactText);
  if (artifact !== null && !artifactValidation.ok) fail(artifactValidation.code, artifactValidation.message);
  const checkpoint = evaluateImp036cImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036b: /IMP-036B:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036c: /IMP-036C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE" : "",
    architecture: /IMP-036C_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "LOCKED" : "",
    architectureLocked: /IMP-036C_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationAuthorized: /IMP-036C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036C_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036C_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036C_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifact !== null && artifactValidation.ok,
    founderUatRequired: /IMP-036C_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentRoadmapSection),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036C implementation complete pending acceptance (${artifactRel})`);
}

function checkImp036cAcceptance(roadmap, state, architecture, decision) {
  if (!isImp036cAcceptanceCheckpoint(roadmap, state)) return;

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
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036C-customer-commerce-experience-v2.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036cAcceptanceArtifact(artifactText);
  if (artifact !== null && !artifactValidation.ok) fail(artifactValidation.code, artifactValidation.message);

  if (/IMP-036C\s*\|\s*Customer Commerce Experience V2\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP036C_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-036C as pending acceptance");
  }
  if (!/IMP-036C\s*\|\s*Customer Commerce Experience V2\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP036C_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-036C as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-036D\s*\|\s*Workforce & Franchise Operations Portal V2\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036D_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036D PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-036C_ACCEPTED:\s*YES/, "ROADMAP must record IMP-036C accepted"],
    [currentRoadmapSection, /IMP036C_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-036C formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-036C_FOUNDER_UAT:\s*PASS/, "ROADMAP must record IMP-036C Founder UAT PASS"],
    [currentRoadmapSection, /IMP036C_ACCEPTED_MAIN_SHA:\s*0ec83ba5b7b03387dcefbd478807faefc3499d6b/, "ROADMAP must record accepted product SHA"],
    [currentStateAcceptance, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036C_ACCEPTED:\s*YES/, "STATE must record IMP-036C accepted"],
    [currentStateAcceptance, /IMP036C_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-036C formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-036C_FOUNDER_UAT:\s*PASS/, "STATE must record IMP-036C Founder UAT PASS"],
    [currentStateAcceptance, /IMP036C_ACCEPTED_MAIN_SHA:\s*0ec83ba5b7b03387dcefbd478807faefc3499d6b/, "STATE must record accepted product SHA"],
    [currentStateAcceptance, /IMP036C_DIRECT_MAIN_PROCESS_EXCEPTION:\s*RECONCILED/, "STATE must reconcile direct-main process exception"],
    [currentStateAcceptance, /IMP036C_PROCESS_EXCEPTION_OUTSTANDING:\s*NO/, "STATE must record no outstanding process exception"],
    [currentStateAcceptance, /DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY:\s*YES/, "STATE must preserve deferred failed-payment history"],
    [currentStateAcceptance, /IMP-036D:\s*PLANNED \/ NOT_ACTIVATED \/ NOT_AUTHORIZED \/ NOT_STARTED/, "STATE must keep IMP-036D planned"],
    [currentStateAcceptance, /IMP-038:\s*PLANNED/, "STATE must keep IMP-038 PLANNED only"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036C_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-036C" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036D"
  ) {
    fail("IMP036C_STATE_POSITION", "STATE must record acceptedThrough IMP-036C, currentProductSlice NONE, nextProductSlice IMP-036D, pendingAcceptance NONE");
  }
  if (!/IMP-036C COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-036D/.test(currentStateActivity)) {
    fail("IMP036C_STATE_ACTIVITY", "STATE current governance activity must record IMP-036C COMPLETE_AND_ACCEPTED and IMP-036D planned");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036C_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-036C acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036C_DR_VERSION", "decision register must be DR-15 during IMP-036C acceptance");
  }

  const checkpoint = evaluateImp036cAcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036b: /IMP-036B:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036c: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-036C_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "LOCKED" : "",
    architectureLocked: /IMP-036C_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationAuthorized: /IMP-036C_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    started: /IMP-036C_STARTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementationComplete: /IMP-036C_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    accepted: /IMP-036C_ACCEPTED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifact !== null && artifactValidation.ok,
    founderUatPass: /IMP-036C_FOUNDER_UAT:\s*PASS/.test(currentRoadmapSection),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036C COMPLETE_AND_ACCEPTED (${artifactRel})`);
}

function checkImp036dArchitectureActivation(roadmap, state, architecture, decision) {
  if (!isImp036dArchitectureActivationCheckpoint(roadmap, state)) return;

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
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const capabilitiesDir = path.join(projectRoot, "docs/platform/capabilities");
  let imp036dCapabilityPresent = false;
  if (existsSync(capabilitiesDir)) {
    for (const name of readdirSync(capabilitiesDir)) {
      if (/^IMP-036D/i.test(name)) {
        imp036dCapabilityPresent = true;
        break;
      }
    }
  }

  const experienceRel =
    "docs/platform/experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md";
  const experience = resolveExactRelativeFile(experienceRel);
  const experienceText = experience ? readFileSync(experience, "utf8") : "";

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036D:\s*ARCHITECTURE_IN_PROGRESS/, "ROADMAP must record IMP-036D architecture in progress"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE:\s*NOT_LOCKED/, "ROADMAP must record IMP-036D architecture not locked"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE_LOCKED:\s*NO/, "ROADMAP must record IMP-036D architecture lock NO"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-036D implementation not authorized"],
    [currentRoadmapSection, /IMP-036D_STARTED:\s*NO/, "ROADMAP must record IMP-036D not started"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-036D incomplete"],
    [currentRoadmapSection, /IMP-036D_ACCEPTED:\s*NO/, "ROADMAP must record IMP-036D unaccepted"],
    [currentRoadmapSection, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "ROADMAP must record IMP-036D Founder UAT required"],
    [currentRoadmapSection, /IMP036D_PREPARATION_READINESS_DECISION:\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/, "ROADMAP must record preparation/readiness decision"],
    [currentRoadmapSection, /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW:\s*DEFERRED/, "ROADMAP must defer FD workforce review"],
    [currentRoadmapSection, /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT:\s*APPROVED_FOR_ARCHITECTURE/, "ROADMAP must record notification resend architecture direction"],
    [currentRoadmapSection, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*DECISION_REQUIRED/, "ROADMAP must record refund topology DECISION_REQUIRED"],
    [currentRoadmapSection, /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*YES/, "ROADMAP must record refund topology blocks lock"],
    [currentRoadmapSection, /D-374_CREATED:\s*NO/, "ROADMAP must record D-374_CREATED: NO"],
    [currentRoadmapSection, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036D:\s*ARCHITECTURE_IN_PROGRESS/, "STATE must record IMP-036D architecture in progress"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE:\s*NOT_LOCKED/, "STATE must record IMP-036D architecture not locked"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE_LOCKED:\s*NO/, "STATE must record IMP-036D architecture lock NO"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/, "STATE must record IMP-036D implementation not authorized"],
    [currentStateAcceptance, /IMP-036D_STARTED:\s*NO/, "STATE must record IMP-036D not started"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-036D incomplete"],
    [currentStateAcceptance, /IMP-036D_ACCEPTED:\s*NO/, "STATE must record IMP-036D unaccepted"],
    [currentStateAcceptance, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "STATE must record IMP-036D Founder UAT required"],
    [currentStateAcceptance, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*DECISION_REQUIRED/, "STATE must record refund topology DECISION_REQUIRED"],
    [currentStateAcceptance, /D-374_CREATED:\s*NO/, "STATE must record D-374_CREATED: NO"],
    [currentStateAcceptance, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036D_ARCHITECTURE_ACTIVATION", message);
  }

  const premature = [
    /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036D_STARTED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036D_ACCEPTED:\s*YES/,
    /IMP-036E_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036E_STARTED:\s*YES/,
    /IMP-036E:\s*ARCHITECTURE_IN_PROGRESS/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail(
        "IMP036D_PREMATURE_PROGRESSION",
        "IMP-036D activation must not lock architecture, authorize/start implementation, or activate IMP-036E",
      );
      break;
    }
  }

  if (
    !/IMP-036D\s*\|\s*Workforce & Franchise Operations Portal V2\s*\|\s*ARCHITECTURE_IN_PROGRESS/.test(
      futureSection,
    )
  ) {
    fail(
      "IMP036D_ROADMAP_LIFECYCLE",
      "ROADMAP future ledger must list IMP-036D Workforce & Franchise Operations Portal V2 as ARCHITECTURE_IN_PROGRESS",
    );
  }
  if (!/IMP-036E\s*\|\s*Store Operations Management\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036E_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036E Store Operations Management PLANNED");
  }
  if (/\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? "")) {
    fail("IMP036D_D374_CREATED", "D-374 must not be created during IMP-036D architecture activation");
  }
  if (imp036dCapabilityPresent) {
    fail(
      "IMP036D_CAPABILITY_ARTIFACT",
      "IMP-036D capability architecture artifact must not exist during architecture activation",
    );
  }
  if (!experience) {
    fail("IMP036D_EXPERIENCE_MISSING", `Missing IMP-036D experience plan at ${experienceRel}`);
  } else {
    const experienceRequired = [
      /Lifecycle:\s*ARCHITECTURE_IN_PROGRESS/,
      /Architecture:\s*NOT_LOCKED/,
      /Implementation:\s*NOT_AUTHORIZED \/ NOT_STARTED/,
      /Founder UAT required:\s*YES/,
      /IMP036D_PREPARATION_READINESS_DECISION\s*=\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/,
      /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW\s*=\s*DEFERRED/,
      /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT\s*=\s*APPROVED_FOR_ARCHITECTURE/,
      /IMP036D_REFUND_EXECUTION_TOPOLOGY\s*=\s*DECISION_REQUIRED/,
      /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK\s*=\s*YES/,
      /D-374_CREATED:\s*NO/,
      /ARCH_R20_REQUIRED:\s*NO/,
    ];
    if (experienceRequired.some((pattern) => !pattern.test(experienceText))) {
      fail(
        "IMP036D_EXPERIENCE_ACTIVATION",
        "IMP-036D experience plan must record architecture-in-progress activation decisions",
      );
    }
  }

  if (
    state.meta.acceptedThrough !== "IMP-036C" ||
    state.meta.currentProductSlice !== "IMP-036D" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036E"
  ) {
    fail(
      "IMP036D_STATE_POSITION",
      "STATE must record acceptedThrough IMP-036C, currentProductSlice IMP-036D, nextProductSlice IMP-036E, pendingAcceptance NONE",
    );
  }
  if (!/IMP-036D ARCHITECTURE_IN_PROGRESS/.test(currentStateActivity)) {
    fail("IMP036D_STATE_ACTIVITY", "STATE current governance activity must record IMP-036D ARCHITECTURE_IN_PROGRESS");
  }
  if (
    !/IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    /IMP-036C_ACCEPTED:\s*NO/.test(currentStateAcceptance)
  ) {
    fail("IMP036D_IMP036C_REGRESSION", "IMP-036D activation must not regress or reopen IMP-036C acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036D_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-036D architecture activation");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036D_DR_VERSION", "decision register must be DR-15 during IMP-036D architecture activation");
  }

  const refundTopologyResolved =
    /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*(?!DECISION_REQUIRED)\S+/i.test(
      `${currentRoadmapSection}\n${currentStateAcceptance}`,
    ) || /IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED:\s*YES/.test(`${currentRoadmapSection}\n${currentStateAcceptance}`);

  const checkpoint = evaluateImp036dArchitectureActivationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036c: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036d: /IMP-036D:\s*ARCHITECTURE_IN_PROGRESS/.test(currentRoadmapSection) ? "ARCHITECTURE_IN_PROGRESS" : "",
    architecture: /IMP-036D_ARCHITECTURE:\s*NOT_LOCKED/.test(currentRoadmapSection) ? "NOT_LOCKED" : "",
    architectureLocked: /IMP-036D_ARCHITECTURE_LOCKED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    implementation: /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-036D_STARTED:\s*NO/.test(currentRoadmapSection)
      ? "NOT_AUTHORIZED / NOT_STARTED"
      : "",
    implementationAuthorized: /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    started: /IMP-036D_STARTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    implementationComplete: /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    accepted: /IMP-036D_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    imp036e: /IMP-036E:\s*PLANNED/.test(currentRoadmapSection) ? "PLANNED" : "",
    roadmapLifecycle: /IMP-036D:\s*ARCHITECTURE_IN_PROGRESS/.test(currentRoadmapSection)
      ? "ARCHITECTURE_IN_PROGRESS"
      : "",
    stateLifecycle: /IMP-036D:\s*ARCHITECTURE_IN_PROGRESS/.test(currentStateAcceptance)
      ? "ARCHITECTURE_IN_PROGRESS"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? ""),
    capabilityArtifactExists: imp036dCapabilityPresent,
    refundTopologyResolved,
    imp036cAccepted: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
      /IMP-036C_ACCEPTED:\s*YES/.test(currentStateAcceptance),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note("IMP-036D architecture activation lifecycle valid");
}

function checkImp036dArchitectureLock(roadmap, state, architecture, decision) {
  if (!isImp036dArchitectureLockCheckpoint(roadmap, state)) return;

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
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036D-workforce-franchise-operations-v2.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036dArchitectureLockArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;

  const experienceRel =
    "docs/platform/experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md";
  const experience = resolveExactRelativeFile(experienceRel);
  const experienceText = experience ? readFileSync(experience, "utf8") : "";

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036D:\s*ARCHITECTURE_LOCKED/, "ROADMAP must record IMP-036D architecture locked"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-036D architecture LOCKED"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-036D architecture lock YES"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/, "ROADMAP must record IMP-036D implementation not authorized"],
    [currentRoadmapSection, /IMP-036D_STARTED:\s*NO/, "ROADMAP must record IMP-036D not started"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-036D incomplete"],
    [currentRoadmapSection, /IMP-036D_ACCEPTED:\s*NO/, "ROADMAP must record IMP-036D unaccepted"],
    [currentRoadmapSection, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "ROADMAP must record IMP-036D Founder UAT required"],
    [currentRoadmapSection, /IMP036D_PREPARATION_READINESS_DECISION:\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/, "ROADMAP must record preparation/readiness decision"],
    [currentRoadmapSection, /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW:\s*DEFERRED/, "ROADMAP must defer FD workforce review"],
    [currentRoadmapSection, /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT:\s*APPROVED_FOR_ARCHITECTURE/, "ROADMAP must record notification resend architecture direction"],
    [currentRoadmapSection, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/, "ROADMAP must record refund topology RESOLVED_AND_LOCKED"],
    [currentRoadmapSection, /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/, "ROADMAP must record refund topology no longer blocks lock"],
    [currentRoadmapSection, /IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED:\s*YES/, "ROADMAP must record refund mutation transport locked"],
    [currentRoadmapSection, /SCHEMA_CHANGE_REQUIRED:\s*NO/, "ROADMAP must record SCHEMA_CHANGE_REQUIRED: NO"],
    [currentRoadmapSection, /D-374_CREATED:\s*NO/, "ROADMAP must record D-374_CREATED: NO"],
    [currentRoadmapSection, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036D:\s*ARCHITECTURE_LOCKED/, "STATE must record IMP-036D architecture locked"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-036D architecture LOCKED"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-036D architecture lock YES"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/, "STATE must record IMP-036D implementation not authorized"],
    [currentStateAcceptance, /IMP-036D_STARTED:\s*NO/, "STATE must record IMP-036D not started"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-036D incomplete"],
    [currentStateAcceptance, /IMP-036D_ACCEPTED:\s*NO/, "STATE must record IMP-036D unaccepted"],
    [currentStateAcceptance, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "STATE must record IMP-036D Founder UAT required"],
    [currentStateAcceptance, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/, "STATE must record refund topology RESOLVED_AND_LOCKED"],
    [currentStateAcceptance, /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/, "STATE must record refund topology no longer blocks lock"],
    [currentStateAcceptance, /D-374_CREATED:\s*NO/, "STATE must record D-374_CREATED: NO"],
    [currentStateAcceptance, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036D_ARCHITECTURE_LOCK", message);
  }

  const premature = [
    /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036D_STARTED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036D_ACCEPTED:\s*YES/,
    /IMP-036E_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036E_STARTED:\s*YES/,
    /IMP-036E:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP-036E:\s*ARCHITECTURE_LOCKED/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail(
        "IMP036D_PREMATURE_PROGRESSION",
        "IMP-036D lock must not authorize/start implementation, accept the slice, or activate IMP-036E",
      );
      break;
    }
  }

  if (
    !/IMP-036D\s*\|\s*Workforce & Franchise Operations Portal V2\s*\|\s*ARCHITECTURE_LOCKED/.test(
      futureSection,
    )
  ) {
    fail(
      "IMP036D_ROADMAP_LIFECYCLE",
      "ROADMAP future ledger must list IMP-036D Workforce & Franchise Operations Portal V2 as ARCHITECTURE_LOCKED",
    );
  }
  if (!/IMP-036E\s*\|\s*Store Operations Management\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036E_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036E Store Operations Management PLANNED");
  }
  if (/\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? "")) {
    fail("IMP036D_D374_CREATED", "D-374 must not be created during IMP-036D architecture lock");
  }
  if (!artifact) {
    fail("IMP036D_CAPABILITY_ARTIFACT", `Missing IMP-036D capability artifact at ${artifactRel}`);
  } else if (!artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  if (!experience) {
    fail("IMP036D_EXPERIENCE_MISSING", `Missing IMP-036D experience plan at ${experienceRel}`);
  } else {
    const experienceRequired = [
      /Lifecycle:\s*ARCHITECTURE_LOCKED/,
      /Architecture:\s*ARCHITECTURE_LOCKED/,
      /Implementation:\s*NOT_AUTHORIZED \/ NOT_STARTED/,
      /Founder UAT required:\s*YES/,
      /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/,
      /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/,
      /IMP036D_PREPARATION_READINESS_DECISION\s*=\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/,
      /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW\s*=\s*DEFERRED/,
      /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT\s*=\s*APPROVED_FOR_ARCHITECTURE/,
      /IMP036D_REFUND_EXECUTION_TOPOLOGY\s*=\s*RESOLVED_AND_LOCKED/,
      /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK\s*=\s*NO/,
      /IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED\s*=\s*YES/,
      /REFUND_DURABLE_HANDOFF\s*=\s*REFUND_AGGREGATE_ACCEPTED_ROW/,
      /REFUND_PROVIDER_EXECUTION\s*=\s*CUSTOMER_COMMERCE/,
      /D-374_CREATED:\s*NO/,
      /ARCH_R20_REQUIRED:\s*NO/,
    ];
    if (experienceRequired.some((pattern) => !pattern.test(experienceText))) {
      fail(
        "IMP036D_EXPERIENCE_LOCK",
        "IMP-036D experience contract must record architecture-locked decisions and resolved refund topology",
      );
    }
    if (/IMP036D_REFUND_EXECUTION_TOPOLOGY\s*=\s*DECISION_REQUIRED/.test(experienceText)) {
      fail("IMP036D_EXPERIENCE_STALE", "IMP-036D experience contract must not retain unresolved refund topology");
    }
  }

  if (
    state.meta.acceptedThrough !== "IMP-036C" ||
    state.meta.currentProductSlice !== "IMP-036D" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036E"
  ) {
    fail(
      "IMP036D_STATE_POSITION",
      "STATE must record acceptedThrough IMP-036C, currentProductSlice IMP-036D, nextProductSlice IMP-036E, pendingAcceptance NONE",
    );
  }
  if (!/IMP-036D ARCHITECTURE_LOCKED/.test(currentStateActivity)) {
    fail("IMP036D_STATE_ACTIVITY", "STATE current governance activity must record IMP-036D ARCHITECTURE_LOCKED");
  }
  if (
    !/IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    /IMP-036C_ACCEPTED:\s*NO/.test(currentStateAcceptance)
  ) {
    fail("IMP036D_IMP036C_REGRESSION", "IMP-036D lock must not regress or reopen IMP-036C acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036D_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-036D architecture lock");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036D_DR_VERSION", "decision register must be DR-15 during IMP-036D architecture lock");
  }
  if (/architectureVersion":\s*"ARCH-R20"/.test(architecture?.text ?? "") || /ARCH-R20/.test(architecture?.meta?.architectureVersion ?? "")) {
    fail("IMP036D_ARCH_R20", "ARCH-R20 must not be created during IMP-036D architecture lock");
  }

  const checkpoint = evaluateImp036dArchitectureLockCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036c: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036d: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentRoadmapSection) ? "ARCHITECTURE_LOCKED" : "",
    architecture: /IMP-036D_ARCHITECTURE:\s*LOCKED/.test(currentRoadmapSection) ? "LOCKED" : "",
    architectureLocked: /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementation: /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-036D_STARTED:\s*NO/.test(currentRoadmapSection)
      ? "NOT_AUTHORIZED / NOT_STARTED"
      : "",
    implementationAuthorized: /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    started: /IMP-036D_STARTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    implementationComplete: /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    accepted: /IMP-036D_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    imp036e: /IMP-036E:\s*PLANNED/.test(currentRoadmapSection) ? "PLANNED" : "",
    roadmapLifecycle: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentRoadmapSection)
      ? "ARCHITECTURE_LOCKED"
      : "",
    stateLifecycle: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentStateAcceptance)
      ? "ARCHITECTURE_LOCKED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    refundTopology: /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/.test(currentRoadmapSection)
      ? "RESOLVED_AND_LOCKED"
      : "",
    refundTopologyBlocksLock: /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/.test(currentRoadmapSection)
      ? "NO"
      : "",
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? ""),
    capabilityArtifactExists: Boolean(artifact),
    artifactValid,
    imp036cAccepted: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
      /IMP-036C_ACCEPTED:\s*YES/.test(currentStateAcceptance),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036D capability architecture locked (${artifactRel})`);
}

function checkImp036dImplementationAuthorization(roadmap, state, architecture, decision) {
  if (!isImp036dImplementationAuthorizationCheckpoint(roadmap, state)) return;

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
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-036D-workforce-franchise-operations-v2.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp036dImplementationAuthorizationArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;

  const experienceRel =
    "docs/platform/experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md";
  const experience = resolveExactRelativeFile(experienceRel);
  const experienceText = experience ? readFileSync(experience, "utf8") : "";

  const requiredTokens = [
    [currentRoadmapSection, /IMP-036D:\s*ARCHITECTURE_LOCKED/, "ROADMAP must record IMP-036D architecture locked"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE:\s*LOCKED/, "ROADMAP must record IMP-036D architecture LOCKED"],
    [currentRoadmapSection, /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/, "ROADMAP must record IMP-036D architecture lock YES"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/, "ROADMAP must record IMP-036D AUTHORIZED / NOT_STARTED"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/, "ROADMAP must record IMP-036D implementation authorized"],
    [currentRoadmapSection, /IMP-036D_STARTED:\s*NO/, "ROADMAP must record IMP-036D not started"],
    [currentRoadmapSection, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "ROADMAP must record IMP-036D incomplete"],
    [currentRoadmapSection, /IMP-036D_ACCEPTED:\s*NO/, "ROADMAP must record IMP-036D unaccepted"],
    [currentRoadmapSection, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "ROADMAP must record IMP-036D Founder UAT required"],
    [currentRoadmapSection, /Authorization does \*\*not\*\* auto-start implementation/, "ROADMAP must state authorization does not auto-start"],
    [currentRoadmapSection, /IMP036D_PREPARATION_READINESS_DECISION:\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/, "ROADMAP must record preparation/readiness decision"],
    [currentRoadmapSection, /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW:\s*DEFERRED/, "ROADMAP must defer FD workforce review"],
    [currentRoadmapSection, /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT:\s*APPROVED_FOR_ARCHITECTURE/, "ROADMAP must record notification resend architecture direction"],
    [currentRoadmapSection, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/, "ROADMAP must record refund topology RESOLVED_AND_LOCKED"],
    [currentRoadmapSection, /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/, "ROADMAP must record refund topology no longer blocks lock"],
    [currentRoadmapSection, /IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED:\s*YES/, "ROADMAP must record refund mutation transport locked"],
    [currentRoadmapSection, /SCHEMA_CHANGE_REQUIRED:\s*NO/, "ROADMAP must record SCHEMA_CHANGE_REQUIRED: NO"],
    [currentRoadmapSection, /D-374_CREATED:\s*NO/, "ROADMAP must record D-374_CREATED: NO"],
    [currentRoadmapSection, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "ROADMAP must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentRoadmapSection, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-036D:\s*ARCHITECTURE_LOCKED/, "STATE must record IMP-036D architecture locked"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE:\s*LOCKED/, "STATE must record IMP-036D architecture LOCKED"],
    [currentStateAcceptance, /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/, "STATE must record IMP-036D architecture lock YES"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/, "STATE must record IMP-036D AUTHORIZED / NOT_STARTED"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/, "STATE must record IMP-036D implementation authorized"],
    [currentStateAcceptance, /IMP-036D_STARTED:\s*NO/, "STATE must record IMP-036D not started"],
    [currentStateAcceptance, /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/, "STATE must record IMP-036D incomplete"],
    [currentStateAcceptance, /IMP-036D_ACCEPTED:\s*NO/, "STATE must record IMP-036D unaccepted"],
    [currentStateAcceptance, /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/, "STATE must record IMP-036D Founder UAT required"],
    [currentStateAcceptance, /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/, "STATE must record refund topology RESOLVED_AND_LOCKED"],
    [currentStateAcceptance, /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/, "STATE must record refund topology no longer blocks lock"],
    [currentStateAcceptance, /D-374_CREATED:\s*NO/, "STATE must record D-374_CREATED: NO"],
    [currentStateAcceptance, /IMP-036E:\s*PLANNED \/ NOT_ACTIVATED/, "STATE must keep IMP-036E PLANNED / NOT_ACTIVATED"],
    [currentStateAcceptance, /IMP-036C:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-036C COMPLETE_AND_ACCEPTED"],
    [currentStateActivity, /IMP-036D ARCHITECTURE_LOCKED/, "STATE current governance activity must record IMP-036D ARCHITECTURE_LOCKED"],
    [currentStateActivity, /AUTHORIZED \/ NOT_STARTED/, "STATE current governance activity must record AUTHORIZED / NOT_STARTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP036D_IMPLEMENTATION_AUTHORIZATION", message);
  }

  const premature = [
    /IMP-036D_STARTED:\s*YES/,
    /IMP-036D_IMPLEMENTATION_COMPLETE:\s*YES/,
    /IMP-036D_ACCEPTED:\s*YES/,
    /IMP-036D:\s*IMPLEMENTATION_IN_PROGRESS/,
    /IMP-036E_IMPLEMENTATION_AUTHORIZED:\s*YES/,
    /IMP-036E_STARTED:\s*YES/,
    /IMP-036E:\s*ARCHITECTURE_IN_PROGRESS/,
    /IMP-036E:\s*ARCHITECTURE_LOCKED/,
  ];
  for (const text of [currentRoadmapSection, currentStateAcceptance, currentStateActivity]) {
    if (premature.some((pattern) => pattern.test(text))) {
      fail(
        "IMP036D_PREMATURE_PROGRESSION",
        "IMP-036D authorization must keep implementation unstarted and IMP-036E unactivated",
      );
      break;
    }
  }

  if (
    !/IMP-036D\s*\|\s*Workforce & Franchise Operations Portal V2\s*\|\s*ARCHITECTURE_LOCKED \/ AUTHORIZED \/ NOT_STARTED/.test(
      futureSection,
    )
  ) {
    fail(
      "IMP036D_ROADMAP_LIFECYCLE",
      "ROADMAP future ledger must list IMP-036D as ARCHITECTURE_LOCKED / AUTHORIZED / NOT_STARTED",
    );
  }
  if (!/IMP-036E\s*\|\s*Store Operations Management\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP036E_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-036E Store Operations Management PLANNED");
  }
  if (/\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? "")) {
    fail("IMP036D_D374_CREATED", "D-374 must not be created during IMP-036D implementation authorization");
  }
  if (!artifact) {
    fail("IMP036D_CAPABILITY_ARTIFACT", `Missing IMP-036D capability artifact at ${artifactRel}`);
  } else if (!artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }
  if (!experience) {
    fail("IMP036D_EXPERIENCE_MISSING", `Missing IMP-036D experience plan at ${experienceRel}`);
  } else {
    const experienceRequired = [
      /Lifecycle:\s*ARCHITECTURE_LOCKED/,
      /Architecture:\s*ARCHITECTURE_LOCKED/,
      /Implementation:\s*AUTHORIZED \/ NOT_STARTED/,
      /Founder UAT required:\s*YES/,
      /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/,
      /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/,
      /IMP-036D_STARTED:\s*NO/,
      /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/,
      /IMP-036D_ACCEPTED:\s*NO/,
      /IMP036D_PREPARATION_READINESS_DECISION\s*=\s*NO_NEW_V1_DOMAIN_STATE_REQUIRED/,
      /IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW\s*=\s*DEFERRED/,
      /IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT\s*=\s*APPROVED_FOR_ARCHITECTURE/,
      /IMP036D_REFUND_EXECUTION_TOPOLOGY\s*=\s*RESOLVED_AND_LOCKED/,
      /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK\s*=\s*NO/,
      /IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED\s*=\s*YES/,
      /REFUND_DURABLE_HANDOFF\s*=\s*REFUND_AGGREGATE_ACCEPTED_ROW/,
      /REFUND_PROVIDER_EXECUTION\s*=\s*CUSTOMER_COMMERCE/,
      /D-374_CREATED:\s*NO/,
      /ARCH_R20_REQUIRED:\s*NO/,
    ];
    if (experienceRequired.some((pattern) => !pattern.test(experienceText))) {
      fail(
        "IMP036D_EXPERIENCE_AUTHORIZATION",
        "IMP-036D experience contract must record AUTHORIZED / NOT_STARTED with locked architecture facts",
      );
    }
    if (/IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*NO/.test(experienceText)) {
      fail("IMP036D_EXPERIENCE_STALE", "IMP-036D experience contract must not retain unauthorized implementation status");
    }
  }

  if (
    state.meta.acceptedThrough !== "IMP-036C" ||
    state.meta.currentProductSlice !== "IMP-036D" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-036E"
  ) {
    fail(
      "IMP036D_STATE_POSITION",
      "STATE must record acceptedThrough IMP-036C, currentProductSlice IMP-036D, nextProductSlice IMP-036E, pendingAcceptance NONE",
    );
  }
  if (
    !/IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    /IMP-036C_ACCEPTED:\s*NO/.test(currentStateAcceptance)
  ) {
    fail("IMP036D_IMP036C_REGRESSION", "IMP-036D authorization must not regress or reopen IMP-036C acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R19") {
    fail("IMP036D_ARCH_VERSION", "ARCHITECTURE must be ARCH-R19 during IMP-036D implementation authorization");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-15") {
    fail("IMP036D_DR_VERSION", "decision register must be DR-15 during IMP-036D implementation authorization");
  }
  if (/architectureVersion":\s*"ARCH-R20"/.test(architecture?.text ?? "") || /ARCH-R20/.test(architecture?.meta?.architectureVersion ?? "")) {
    fail("IMP036D_ARCH_R20", "ARCH-R20 must not be created during IMP-036D implementation authorization");
  }

  const checkpoint = evaluateImp036dImplementationAuthorizationCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp036c: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ? "COMPLETE_AND_ACCEPTED" : "",
    imp036d: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentRoadmapSection) ? "ARCHITECTURE_LOCKED" : "",
    architecture: /IMP-036D_ARCHITECTURE:\s*LOCKED/.test(currentRoadmapSection) ? "LOCKED" : "",
    architectureLocked: /IMP-036D_ARCHITECTURE_LOCKED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    implementation: /IMP-036D_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED/.test(currentRoadmapSection)
      ? "AUTHORIZED / NOT_STARTED"
      : "",
    implementationAuthorized: /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-036D_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-036D_STARTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-036D_STARTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    implementationComplete: /IMP-036D_IMPLEMENTATION_COMPLETE:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    accepted: /IMP-036D_ACCEPTED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    imp036e: /IMP-036E:\s*PLANNED/.test(currentRoadmapSection) ? "PLANNED" : "",
    roadmapLifecycle: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentRoadmapSection)
      ? "ARCHITECTURE_LOCKED"
      : "",
    stateLifecycle: /IMP-036D:\s*ARCHITECTURE_LOCKED/.test(currentStateAcceptance)
      ? "ARCHITECTURE_LOCKED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    refundTopology: /IMP036D_REFUND_EXECUTION_TOPOLOGY:\s*RESOLVED_AND_LOCKED/.test(currentRoadmapSection)
      ? "RESOLVED_AND_LOCKED"
      : "",
    refundTopologyBlocksLock: /IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK:\s*NO/.test(currentRoadmapSection)
      ? "NO"
      : "",
    founderUatRequired: /IMP-036D_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentRoadmapSection) ? "YES" : "",
    schemaChangeRequired: /SCHEMA_CHANGE_REQUIRED:\s*NO/.test(currentRoadmapSection) ? "NO" : "",
    d374Exists: /\|\s*D-374\s*\|/.test(decision?.text ?? "") || /###\s*D-374\b/.test(decision?.text ?? ""),
    capabilityArtifactExists: Boolean(artifact),
    artifactValid,
    imp036cAccepted: /IMP-036C:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) &&
      /IMP-036C_ACCEPTED:\s*YES/.test(currentStateAcceptance),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-036D implementation authorized (${artifactRel})`);
}

function checkImp034Acceptance(roadmap, state, architecture, decision) {
  if (!isImp034AcceptanceCheckpoint(roadmap, state)) return;

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
  const currentLifecycleText = `${currentRoadmapSection}\n${currentStateAcceptance}\n${currentStateActivity}`;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";
  const artifactRel = "docs/platform/capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp034AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  if (artifact !== null && !artifactValidation.ok) {
    fail(artifactValidation.code, artifactValidation.message);
  }

  if (/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|/.test(futureSection)) {
    fail("IMP034_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-034 after acceptance");
  }
  if (!/IMP-034\s*\|\s*Meta WhatsApp Cloud API Adapter\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP034_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-034 Meta WhatsApp Cloud API Adapter as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-035\s*\|\s*Initial Administration Capabilities\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP035_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-035 Initial Administration Capabilities PLANNED");
  }

  const requiredTokens = [
    [currentRoadmapSection, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must record IMP-034 COMPLETE_AND_ACCEPTED"],
    [currentRoadmapSection, /IMP-034_ACCEPTED:\s*YES/, "ROADMAP must record IMP-034 accepted"],
    [currentRoadmapSection, /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "ROADMAP must record IMP-034 independent acceptance evidence ACCEPTED"],
    [currentRoadmapSection, /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "ROADMAP must record IMP-034 formal acceptance ACCEPTED"],
    [currentRoadmapSection, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "ROADMAP must preserve IMP-033 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-034:\s*COMPLETE_AND_ACCEPTED/, "STATE must record IMP-034 COMPLETE_AND_ACCEPTED"],
    [currentStateAcceptance, /IMP-034_ACCEPTED:\s*YES/, "STATE must record IMP-034 accepted"],
    [currentStateAcceptance, /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/, "STATE must record IMP-034 formal acceptance ACCEPTED"],
    [currentStateAcceptance, /IMP-033:\s*COMPLETE_AND_ACCEPTED/, "STATE must preserve IMP-033 COMPLETE_AND_ACCEPTED"],
  ];
  for (const [text, pattern, message] of requiredTokens) {
    if (!pattern.test(text)) fail("IMP034_ACCEPTANCE", message);
  }

  if (
    state.meta.acceptedThrough !== "IMP-034" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-035"
  ) {
    fail("IMP034_STATE_POSITION", "STATE must record acceptedThrough IMP-034, currentProductSlice NONE, nextProductSlice IMP-035, pendingAcceptance NONE");
  }
  if (!/IMP-034 COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-035 PLANNED \/ NOT_ACTIVATED/.test(currentStateActivity)) {
    fail("IMP034_STATE_ACTIVITY", "STATE current governance activity must record IMP-034 COMPLETE_AND_ACCEPTED and IMP-035 PLANNED / NOT_ACTIVATED");
  }
  if (/\|\s*D-373\s*\|/.test(decision?.text ?? "")) {
    fail("IMP034_D373_CREATED", "D-373 must not be created during IMP-034 acceptance");
  }
  if (architecture?.meta.architectureVersion !== "ARCH-R18") {
    fail("IMP034_ARCH_VERSION", "ARCHITECTURE must remain ARCH-R18 during IMP-034 acceptance");
  }
  if (decision?.meta.decisionRegisterVersion !== "DR-14") {
    fail("IMP034_DR_VERSION", "decision register must remain DR-14 during IMP-034 acceptance");
  }

  const crossDocument = evaluateImp034AcceptanceCrossDocumentAlignment({
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp034AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp033: /IMP-033:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp034: /IMP-034:\s*COMPLETE_AND_ACCEPTED/.test(currentLifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-034_ARCHITECTURE:\s*LOCKED/.test(currentLifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-034_ARCHITECTURE_LOCKED:\s*YES/.test(currentLifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-034_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-034_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-034_ACCEPTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    imp035: /IMP-035:\s*PLANNED \/ NOT_ACTIVATED/.test(currentLifecycleText) &&
      /Initial Administration Capabilities\s*\|\s*PLANNED/.test(futureSection)
      ? "PLANNED"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    founderUatRequired: /IMP-034_FOUNDER_UAT_REQUIRED:\s*YES/.test(currentLifecycleText) ||
      /FOUNDER_UAT_REQUIRED:\s*YES/.test(artifactText),
    implementationEvidenceComplete: /IMP034_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText) &&
      /IMP034_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(currentLifecycleText),
    independentReviewPass: /IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(currentLifecycleText),
    independentAcceptanceAccepted: /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentLifecycleText),
    formalAcceptanceAccepted: /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP034_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentLifecycleText),
    providerIoYes: /provider_IO:\s*YES/.test(artifactText) && /IMP-034_PROVIDER_IO:\s*YES/.test(currentLifecycleText),
    asyncTopologyLocked: /POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/.test(artifactText) &&
      /IMP-034_ASYNC_TOPOLOGY:\s*POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/.test(currentLifecycleText),
    directMetaStrategy: /DIRECT_META_CLOUD_API_V1/.test(artifactText) &&
      /IMP-034_PROVIDER_STRATEGY:\s*DIRECT_META_CLOUD_API_V1/.test(currentLifecycleText) &&
      /IMP-034_BSP:\s*NO/.test(currentLifecycleText),
    acceptedMainSha: (artifactText.match(/IMP034_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP034_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-034 COMPLETE_AND_ACCEPTED (${artifactRel})`);
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

function checkImp031ImplementationCompletion(roadmap, state, architecture, decision) {
  if (!isImp031ImplementationCompletionCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031ImplementationCompletionArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";

  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(futureSection)) {
    fail("IMP031_ROADMAP_LIFECYCLE", "ROADMAP future ledger must list IMP-031 Provider-Neutral Delivery Foundation as IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE");
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
    !/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance) ||
    !/IMP-031_ACCEPTED:\s*NO/.test(currentRoadmapSection) ||
    !/IMP-031_ACCEPTED:\s*NO/.test(currentStateAcceptance) ||
    !/IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentRoadmapSection) ||
    !/IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(currentStateAcceptance) ||
    !/Pending Acceptance:\s*IMP-031\b/.test(currentRoadmapSection) ||
    state.meta.pendingAcceptance !== "IMP-031"
  ) {
    fail("IMP031_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-031 AUTHORIZED / STARTED / COMPLETE pending acceptance");
  }

  if (!/implementation AUTHORIZED \/ STARTED \/ COMPLETE/.test(currentStateActivity)) {
    fail("IMP031_STATE_ACTIVITY", "STATE current governance activity must record implementation AUTHORIZED / STARTED / COMPLETE");
  }

  if (!/Pending Acceptance:\s*IMP-031\b/.test(currentStateActivity) && !/pendingAcceptance:\s*IMP-031\b/.test(currentStateActivity)) {
    fail("IMP031_STATE_PENDING", "STATE current work position must record Pending Acceptance IMP-031");
  }

  const crossDocument = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
    architectureText: architecture?.text ?? "",
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const implementationEvidence =
    /IMPLEMENTATION_SOURCE_SHA:\s*66e2783afa4e9eef35c4ec208b25af9d9450f83d/.test(artifactText) &&
    /IMPLEMENTATION_SOURCE_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/.test(artifactText) &&
    /MERGED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/.test(artifactText) &&
    /MERGED_MAIN_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/.test(artifactText) &&
    /66e2783afa4e9eef35c4ec208b25af9d9450f83d/.test(lifecycleText) &&
    /c3d499b0b8df2a8c7ae9297ab870f6286f81b848/.test(lifecycleText);

  const checkpoint = evaluateImp031ImplementationCompletionCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp031: /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(lifecycleText)
      ? "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"
      : "",
    architecture: /IMP-031_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementation: /IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/.test(lifecycleText)
      ? "AUTHORIZED / STARTED / COMPLETE"
      : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-031_ACCEPTED:\s*NO/.test(currentRoadmapSection) &&
      /IMP-031_ACCEPTED:\s*NO/.test(currentStateAcceptance)
      ? "NO"
      : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    boundaryC: /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/.test(artifactText) &&
      /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/.test(artifactText),
    implementationEvidence,
    independentReviewPass: /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(lifecycleText),
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 implementation complete pending acceptance (${artifactRel})`);
}

function checkImp031Acceptance(roadmap, state, architecture, decision) {
  if (!isImp031AcceptanceCheckpoint(roadmap, state)) return;

  const lifecycleText = `${roadmap.text}\n${state.text}`;
  const artifactRel = "docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md";
  const artifact = resolveExactRelativeFile(artifactRel);
  const artifactText = artifact ? readFileSync(artifact, "utf8") : "";
  const artifactValidation = evaluateImp031AcceptanceArtifact(artifactText);
  const artifactValid = artifact !== null && artifactValidation.ok;
  const futureSection = roadmap.text.split("## 5. Future GTM Slices")[1]?.split("## 6.")[0] || "";
  const acceptedSection = roadmap.text.split("## 3. Accepted Slices")[1]?.split("## 4.")[0] || "";

  if (/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|/.test(futureSection)) {
    fail("IMP031_ROADMAP_FUTURE", "ROADMAP future ledger must not retain IMP-031 after acceptance");
  }
  if (!/IMP-031\s*\|\s*Provider-Neutral Delivery Foundation\s*\|\s*COMPLETE_AND_ACCEPTED/.test(acceptedSection)) {
    fail("IMP031_ROADMAP_LIFECYCLE", "ROADMAP accepted ledger must list IMP-031 Provider-Neutral Delivery Foundation as COMPLETE_AND_ACCEPTED");
  }
  if (!/IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*PLANNED/.test(futureSection)) {
    fail("IMP032_ROADMAP_NOT_PLANNED", "ROADMAP future ledger must keep IMP-032 Dehradun Delivery Operating Mode PLANNED");
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
    !/IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentRoadmapSection) ||
    !/IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(currentStateAcceptance) ||
    !/IMP-031_ACCEPTED:\s*YES/.test(currentRoadmapSection) ||
    !/IMP-031_ACCEPTED:\s*YES/.test(currentStateAcceptance) ||
    !/IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentRoadmapSection) ||
    !/IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(currentStateAcceptance) ||
    !/IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentRoadmapSection) ||
    !/IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(currentStateAcceptance) ||
    state.meta.acceptedThrough !== "IMP-031" ||
    state.meta.currentProductSlice !== "NONE" ||
    state.meta.pendingAcceptance !== "NONE" ||
    state.meta.nextProductSlice !== "IMP-032"
  ) {
    fail("IMP031_CURRENT_LIFECYCLE", "current ROADMAP/STATE markers must record IMP-031 COMPLETE_AND_ACCEPTED with cleared current/pending");
  }

  if (!/IMP-031 COMPLETE_AND_ACCEPTED/.test(currentStateActivity) || !/IMP-032 PLANNED \/ NOT_ACTIVATED/.test(currentStateActivity)) {
    fail("IMP031_STATE_ACTIVITY", "STATE current governance activity must record IMP-031 COMPLETE_AND_ACCEPTED and IMP-032 PLANNED / NOT_ACTIVATED");
  }

  const crossDocument = evaluateImp031AcceptanceCrossDocumentAlignment({
    architectureText: architecture?.text ?? "",
    capabilityText: artifactText,
    roadmapText: roadmap.text,
    stateText: state.text,
  });
  if (!crossDocument.ok) fail(crossDocument.code, crossDocument.message);

  const checkpoint = evaluateImp031AcceptanceCheckpoint({
    roadmapVersion: roadmap.meta.roadmapVersion,
    stateVersion: state.meta.stateVersion,
    acceptedThrough: state.meta.acceptedThrough,
    currentProductSlice: state.meta.currentProductSlice,
    nextProductSlice: state.meta.nextProductSlice,
    pendingAcceptance: state.meta.pendingAcceptance,
    imp030: /IMP-030:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    imp031: /IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(lifecycleText) ? "COMPLETE_AND_ACCEPTED" : "",
    architecture: /IMP-031_ARCHITECTURE:\s*LOCKED/.test(lifecycleText) ? "LOCKED" : "",
    architectureLocked: /IMP-031_ARCHITECTURE_LOCKED:\s*YES/.test(lifecycleText) ? "YES" : "",
    implementationAuthorized: /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    started: /IMP-031_STARTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_STARTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    implementationComplete: /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    accepted: /IMP-031_ACCEPTED:\s*YES/.test(currentRoadmapSection) &&
      /IMP-031_ACCEPTED:\s*YES/.test(currentStateAcceptance)
      ? "YES"
      : "",
    imp032: /IMP-032:\s*PLANNED \/ NOT_ACTIVATED/.test(currentRoadmapSection) &&
      /IMP-032:\s*PLANNED \/ NOT_ACTIVATED/.test(currentStateAcceptance)
      ? "PLANNED"
      : /IMP-032\s*\|\s*Dehradun Delivery Operating Mode\s*\|\s*PLANNED/.test(futureSection)
        ? "PLANNED"
        : "",
    architectureVersion: architecture?.meta.architectureVersion,
    decisionRegisterVersion: decision?.meta.decisionRegisterVersion,
    artifact: artifactValid,
    archG24: Boolean(architecture && /\| ARCH-G24 \|/.test(architecture.text)),
    d373Exists: /\|\s*D-373\s*\|/.test(decision?.text ?? ""),
    boundaryC: /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/.test(artifactText) &&
      /\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/.test(artifactText),
    implementationEvidenceComplete: /IMP031_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(artifactText) &&
      /IMP031_IMPLEMENTATION_EVIDENCE:\s*COMPLETE/.test(lifecycleText),
    independentReviewPass: /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(artifactText) &&
      /IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:\s*PASS/.test(lifecycleText),
    independentAcceptanceAccepted: /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/.test(lifecycleText),
    formalAcceptanceAccepted: /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(artifactText) &&
      /IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED/.test(lifecycleText),
    acceptedMainSha: (artifactText.match(/IMP031_ACCEPTED_MAIN_SHA:\s*([0-9a-f]{40})/) || [])[1] || "",
    acceptedTree: (artifactText.match(/IMP031_ACCEPTED_TREE:\s*([0-9a-f]{40})/) || [])[1] || "",
  });
  if (!checkpoint.ok) fail(checkpoint.code, checkpoint.message);
  else note(`IMP-031 COMPLETE_AND_ACCEPTED (${artifactRel})`);
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
  if (!latest || latest.tag !== "0036_outlet_delivery_fee_policy") {
    fail(
      "LATEST_MIGRATION",
      `Expected latest migration tag 0036_outlet_delivery_fee_policy, got ${latest && latest.tag}`,
    );
  } else {
    note("Latest migration tag 0036_outlet_delivery_fee_policy");
  }
  const sqlFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) => f.endsWith(".sql"));
  if (sqlFiles.length !== 37 || entries.length !== 37) {
    fail(
      "MIGRATION_COUNT",
      `Expected 37 migrations, got sql=${sqlFiles.length} journal=${entries.length}`,
    );
  } else {
    note("Migration count 37");
  }

  // Application tables
  const schemaDir = path.join(projectRoot, "src/platform/database/schema");
  let tableCount = 0;
  for (const name of readdirSync(schemaDir)) {
    if (!name.endsWith(".ts")) continue;
    const t = readFileSync(path.join(schemaDir, name), "utf8");
    tableCount += [...t.matchAll(/appSchema\.table\(/g)].length;
  }
  if (tableCount !== 122) {
    fail("TABLE_COUNT", `Expected 122 appSchema.table declarations, got ${tableCount}`);
  } else {
    note("Application table count 122");
  }

  const catalog = readFileSync(path.join(projectRoot, "src/shared/access-control/catalog.ts"), "utf8");
  const permMatch = catalog.match(/export const PERMISSION_KEYS = \[([\s\S]*?)\];/);
  const roleMatch = catalog.match(/export const ROLE_KEYS = \[([\s\S]*?)\];/);
  const perms = permMatch ? [...permMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  const roles = roleMatch ? [...roleMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  if (perms.length !== 68) fail("PERMISSION_COUNT", `Expected 68 permissions, got ${perms.length}`);
  else note("Permission count 68");
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
      !isImp031ImplementationStartCheckpoint(roadmap, state) &&
      !isImp031ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp031AcceptanceCheckpoint(roadmap, state) &&
      !isImp032ArchitectureActivationCheckpoint(roadmap, state) &&
      !isImp032ArchitectureDraftCheckpoint(roadmap, state) &&
      !isImp032ArchitectureLockCheckpoint(roadmap, state) &&
      !isImp032ImplementationAuthorizationCheckpoint(roadmap, state) &&
      !isImp032ImplementationStartCheckpoint(roadmap, state) &&
      !isImp032PermissionBootstrapClarificationCheckpoint(roadmap, state) &&
      !isImp032ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp032AcceptanceCheckpoint(roadmap, state) &&
      !isImp033ArchitectureActivationCheckpoint(roadmap, state) &&
      !isImp033ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp033AcceptanceCheckpoint(roadmap, state) &&
      !isImp034ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp034AcceptanceCheckpoint(roadmap, state) &&
      !isImp035ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp035AcceptanceCheckpoint(roadmap, state) &&
      !isImp036ImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp036AcceptanceCheckpoint(roadmap, state) &&
      !isEnterpriseExperiencePlanningCheckpoint(roadmap, state) &&
      !isImp036aImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp036aAcceptanceCheckpoint(roadmap, state) &&
      !isImp036bImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp036bAcceptanceCheckpoint(roadmap, state) &&
      !isImp036cImplementationCompletionCheckpoint(roadmap, state) &&
      !isImp036cAcceptanceCheckpoint(roadmap, state) &&
      !isImp036dArchitectureActivationCheckpoint(roadmap, state) &&
      !isImp036dArchitectureLockCheckpoint(roadmap, state) &&
      !isImp036dImplementationAuthorizationCheckpoint(roadmap, state)
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
  checkImp031ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp031Acceptance(roadmap, state, architecture, decision);
  checkImp032ArchitectureActivation(roadmap, state, architecture, decision);
  checkImp032ArchitectureDraft(roadmap, state, architecture, decision);
  checkImp032ArchitectureLock(roadmap, state, architecture, decision);
  checkImp032ImplementationAuthorization(roadmap, state, architecture, decision);
  checkImp032ImplementationStart(roadmap, state, architecture, decision);
  checkImp032PermissionBootstrapClarification(roadmap, state, architecture, decision);
  checkImp032ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp032Acceptance(roadmap, state, architecture, decision);
  checkImp033ArchitectureActivation(roadmap, state, architecture, decision);
  checkImp033ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp033Acceptance(roadmap, state, architecture, decision);
  checkImp034ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp034Acceptance(roadmap, state, architecture, decision);
  checkImp035ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp035Acceptance(roadmap, state, architecture, decision);
  checkImp036ImplementationCompletion(roadmap, state, architecture, decision);
  checkImp036Acceptance(roadmap, state, architecture, decision);
  checkEnterpriseExperiencePlanning(roadmap, state, architecture, decision);
  checkImp036aImplementationCompletion(roadmap, state, architecture, decision);
  checkImp036aAcceptance(roadmap, state, architecture, decision);
  checkImp036bImplementationCompletion(roadmap, state, architecture, decision);
  checkImp036bAcceptance(roadmap, state, architecture, decision);
  checkImp036cImplementationCompletion(roadmap, state, architecture, decision);
  checkImp036cAcceptance(roadmap, state, architecture, decision);
  checkImp036dArchitectureActivation(roadmap, state, architecture, decision);
  checkImp036dArchitectureLock(roadmap, state, architecture, decision);
  checkImp036dImplementationAuthorization(roadmap, state, architecture, decision);
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
