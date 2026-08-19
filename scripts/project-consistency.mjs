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

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
 * }} position
 * @returns {{ ok: true, kind: "aligned" | "imp026_deferred_external_gate" | "imp026_deferred_external_gate_impl_authorized" | "imp026_deferred_external_gate_impl_complete" | "imp026_deferred_external_gate_imp027_architecture" | "imp026_deferred_external_gate_imp027_architecture_locked" | "imp026_deferred_external_gate_imp027_implementation" | "imp026_deferred_external_gate_imp027_implementation_complete" | "imp026_deferred_external_gate_imp028_architecture" | "imp026_deferred_external_gate_imp028_architecture_locked" | "imp026_deferred_external_gate_imp028_implementation_authorized" | "imp026_deferred_external_gate_imp028_implementation" } | { ok: false, code: string, message: string }}
 */
export function evaluatePendingAcceptanceSplit(position) {
  const pending = position.pendingAcceptance ?? "NONE";
  const current = position.currentProductSlice;
  const imp027Lifecycle = position.imp027Lifecycle ?? "UNKNOWN";
  const imp027ImplementationAuthorized = position.imp027ImplementationAuthorized === true;
  const imp028Lifecycle = position.imp028Lifecycle ?? "UNKNOWN";
  const imp028ImplementationAuthorized = position.imp028ImplementationAuthorized === true;
  const imp028ArchitectureLocked = position.imp028ArchitectureLocked === true;
  const imp028ImplementationStarted = position.imp028ImplementationStarted === true;

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
    imp026cLifecycle: /IMP-026C:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob)
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
    imp028Lifecycle: /IMP-028:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(blob)
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

  const expected = {
    acceptedThrough: "IMP-027",
    currentProductSlice: "IMP-028",
    nextProductSlice: "IMP-028",
    gtmBoundary: "IMP-040",
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual = key === "gtmBoundary" ? roadmap.meta.gtmBoundary : roadmap.meta[key];
    if (!nullishEqual(actual, expectedValue)) {
      fail(
        "POSITION_UNEXPECTED",
        `Expected ${key}=${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`,
      );
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
  if (!idName.has(String(roadmap.meta.currentProductSlice))) {
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

  const split = evaluatePendingAcceptanceSplit(extractPendingAcceptanceSplitPosition(state, roadmap));
  if (!split.ok) {
    fail(split.code, split.message);
  } else if (split.kind !== "imp027_accepted_pending_imp026c_imp028_implementation") {
    fail(
      "DEFERRED_EXTERNAL_GATE_REQUIRED",
      `GTM-R28 requires IMP-028 IMPLEMENTATION_IN_PROGRESS (architecture locked; authorized; started) behind pendingAcceptance=IMP-026C with IMP-027 accepted and IMP-026C still IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE (got kind=${split.kind})`,
    );
  } else {
    note(
      "GTM-R28 IMP-027 accepted; IMP-026C remains pending; IMP-028 implementation in progress",
    );
  }

  if (
    roadmap.meta.currentProductSlice === "IMP-029" ||
    roadmap.meta.nextProductSlice === "IMP-029" ||
    state.meta.currentProductSlice === "IMP-029" ||
    state.meta.nextProductSlice === "IMP-029"
  ) {
    fail(
      "IMP029_ACTIVATED",
      "GTM-R28 must not activate IMP-029; continuation records IMP-028 implementation in progress only",
    );
  }
}

function checkDecisionRegister(decision) {
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

  for (const id of ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363", "D-364", "D-365", "D-366", "D-367"]) {
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
  if (!/D-368/.test(text)) {
    fail("NEXT_DECISION_ID", "Decision register must advance next free ID to D-368 after D-367");
  } else {
    note("Next free decision ID D-368 recorded");
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
    if (state.meta.pendingAcceptance !== "IMP-026C") {
      fail(
        "IMP026C_PENDING_META",
        `STATE pendingAcceptance must be IMP-026C after IMP-027 acceptance, got ${JSON.stringify(state.meta.pendingAcceptance)}`,
      );
    } else {
      note("STATE pendingAcceptance=IMP-026C");
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
    for (const id of ["D-356", "D-357", "D-359", "D-360"]) {
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
    if (!/"implementationAuthorized": false/.test(body)) {
      fail(
        "IMP026C_CAPABILITY_AUTH",
        "IMP-026C capability artifact must not authorize implementation",
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
  if ((claimsImplementationComplete || claimsImplementationInProgress) && !artifact) {
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
  if (claimsImplementationComplete && implementationAuthorized) {
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
    if (
      imp028Row &&
      (!imp028Row.includes("ARCHITECTURE_LOCKED") ||
        !/IMPLEMENTATION_IN_PROGRESS/.test(imp028Row))
    ) {
      fail(
        "IMP028_ROADMAP_LIFECYCLE",
        "ROADMAP future ledger must list IMP-028 as ARCHITECTURE_LOCKED / IMPLEMENTATION_IN_PROGRESS under GTM-R26",
      );
    } else if (imp028Row) {
      note("IMP-028 ROADMAP lifecycle ARCHITECTURE_LOCKED / IMPLEMENTATION_IN_PROGRESS");
    }
    const imp029Row = [...futureSection.split("\n")].find((line) =>
      /^\|\s*IMP-029\s*\|/.test(line),
    );
    if (imp029Row && !imp029Row.includes("PLANNED")) {
      fail(
        "IMP029_ROADMAP_ACTIVATED",
        "ROADMAP future ledger must keep IMP-029 PLANNED until separately authorized",
      );
    }
    if (claimsImplementationComplete) {
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
    if (claimsImplementationComplete) {
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
    if (!/pendingAcceptance=IMP-026C/.test(state.text) && !/Pending Acceptance:\s+IMP-026C/.test(state.text)) {
      fail(
        "IMP026C_STATE_PENDING",
        "STATE must explain that pendingAcceptance=IMP-026C is the current remaining acceptance gate",
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

  if (!claimsArchitectureLocked) {
    fail(
      "IMP028_STATE_ARCH_LOCK",
      "GTM-R26 requires IMP-028 architecture LOCKED in ROADMAP/STATE",
    );
  } else {
    note("IMP-028 architecture LOCKED recorded");
  }

  if (claimsArchitectureInProgress) {
    fail(
      "IMP028_ARCHITECTURE_STILL_IN_PROGRESS",
      "GTM-R26 must not leave IMP-028 as ARCHITECTURE_IN_PROGRESS after architecture lock",
    );
  }

  if (claimsNotLocked) {
    fail(
      "IMP028_ARCHITECTURE_UNLOCKED",
      "GTM-R26 must not leave IMP-028 architecture NOT_LOCKED / IMP-028_ARCHITECTURE_LOCKED: NO after lock",
    );
  }

  if (claimsImplementationComplete) {
    fail(
      "IMP028_IMPLEMENTATION_COMPLETE_CLAIM",
      "GTM-R26 records IMP-028 started but must not claim IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    );
  }

  if (!implementationAuthorized) {
    fail(
      "IMP028_IMPLEMENTATION_AUTHORIZED",
      "GTM-R26 requires IMP-028_IMPLEMENTATION_AUTHORIZED: YES",
    );
  } else {
    note("IMP-028 implementation AUTHORIZED");
  }

  if (!claimsImplementationInProgress) {
    fail(
      "IMP028_LIFECYCLE_IN_PROGRESS",
      "GTM-R26 requires IMP-028: IMPLEMENTATION_IN_PROGRESS lifecycle token",
    );
  } else {
    note("IMP-028 lifecycle IMPLEMENTATION_IN_PROGRESS");
  }

  if (!implementationStartedYes) {
    fail(
      "IMP028_IMPLEMENTATION_STARTED",
      "GTM-R26 requires IMP-028_IMPLEMENTATION_STARTED: YES",
    );
  } else {
    note("IMP-028 implementation STARTED");
  }

  if (!implementationCompleteYes) {
    fail(
      "IMP028_IMPLEMENTATION_NOT_COMPLETE",
      "GTM-R27 requires IMP-028_IMPLEMENTATION_COMPLETE: YES in ROADMAP/STATE or capability artifact",
    );
  } else {
    note("IMP-028 implementation COMPLETE in working-tree authority");
  }

  if (acceptedYes || !acceptedNo) {
    fail("IMP028_ACCEPTED_OUT_OF_SEQUENCE", "GTM-R26 must record IMP-028_ACCEPTED: NO");
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
    if (
      !/"implementation": "IN_PROGRESS"/.test(body) &&
      !/"implementation": "AUTHORIZED_STARTED"/.test(body)
    ) {
      fail(
        "IMP028_CAPABILITY_AUTH_STATE",
        "IMP-028 capability artifact must record implementation IN_PROGRESS (or AUTHORIZED_STARTED)",
      );
    } else {
      note("IMP-028 capability artifact records implementation IN_PROGRESS");
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
    if (/IMP-028_ACCEPTED\s*[=:]\s*YES/.test(body)) {
      fail(
        "IMP028_CAPABILITY_ACCEPTED",
        "IMP-028 capability artifact must not claim IMP-028_ACCEPTED = YES",
      );
    }
    if (!/IMP-028_ACCEPTED\s*[=:]\s*NO/.test(body)) {
      fail(
        "IMP028_CAPABILITY_NOT_ACCEPTED",
        "IMP-028 capability artifact must record IMP-028_ACCEPTED = NO",
      );
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
    if (
      imp028Row &&
      (!imp028Row.includes("ARCHITECTURE_LOCKED") ||
        !/IMPLEMENTATION_IN_PROGRESS/.test(imp028Row))
    ) {
      fail(
        "IMP028_ROADMAP_LEDGER",
        "ROADMAP future ledger must list IMP-028 as ARCHITECTURE_LOCKED / IMPLEMENTATION_IN_PROGRESS under GTM-R26",
      );
    } else if (imp028Row) {
      note("IMP-028 ROADMAP lifecycle ARCHITECTURE_LOCKED / IMPLEMENTATION_IN_PROGRESS");
    }
  }

  if (state) {
    if (!/IMP-028:\s*IMPLEMENTATION_IN_PROGRESS/.test(state.text)) {
      fail(
        "IMP028_STATE_POSITION",
        "STATE must record IMP-028 IMPLEMENTATION_IN_PROGRESS",
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
    if (!/IMP-028_ACCEPTED:\s*NO/.test(state.text)) {
      fail("IMP028_STATE_NOT_ACCEPTED", "STATE must record IMP-028_ACCEPTED: NO");
    }
    if (!/IMP-029:\s*NOT_STARTED/.test(state.text) && !/IMP-029 remains not started/.test(state.text)) {
      fail("IMP029_STATE_STARTED", "STATE must record IMP-029 NOT_STARTED");
    } else {
      note("IMP-029 remains NOT_STARTED");
    }
    if (!/pendingAcceptance=IMP-026C/.test(state.text) && !/Pending Acceptance:\s+IMP-026C/.test(state.text)) {
      fail(
        "IMP028_STATE_OLDEST_PENDING",
        "STATE must explain that pendingAcceptance=IMP-026C is the current remaining acceptance gate",
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
    if (
      /0019_refund/.test(ati) ||
      /0020_financial_document/.test(ati) ||
      /0021_financial_document_foundation_integrity/.test(ati) ||
      /0022_financial_document_non_signature_compliance/.test(ati) ||
      /0029_refund_statutory_issuance_allocation/.test(ati)
    ) {
      fail(
        "IMP028_ATI_ABSORBED_UNACCEPTED",
        "Accepted Technical Inventory must not claim unaccepted IMP-027/028 migrations (including 0019+ unaccepted working-tree migrations)",
      );
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
    if (architecture.meta.architectureVersion !== "ARCH-R12") {
      fail(
        "IMP028_ARCH_VERSION",
        `ARCHITECTURE must be ARCH-R12 after D-367 SignatureArtifact lock, got ${architecture.meta.architectureVersion}`,
      );
    }
  }

  if (decision) {
    if (decision.meta.decisionRegisterVersion !== "DR-9") {
      fail(
        "IMP028_DR_VERSION",
        `Decision register must be DR-9 after D-367, got ${decision.meta.decisionRegisterVersion}`,
      );
    }
  }
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
  if (!latest || latest.tag !== "0029_refund_statutory_issuance_allocation") {
    fail(
      "LATEST_MIGRATION",
      `Expected latest migration tag 0029_refund_statutory_issuance_allocation, got ${latest && latest.tag}`,
    );
  } else {
    note("Latest migration tag 0029_refund_statutory_issuance_allocation");
  }
  const sqlFiles = readdirSync(path.join(projectRoot, "drizzle")).filter((f) => f.endsWith(".sql"));
  if (sqlFiles.length !== 30 || entries.length !== 30) {
    fail(
      "MIGRATION_COUNT",
      `Expected 30 migrations, got sql=${sqlFiles.length} journal=${entries.length}`,
    );
  } else {
    note("Migration count 30");
  }

  // Application tables
  const schemaDir = path.join(projectRoot, "src/platform/database/schema");
  let tableCount = 0;
  for (const name of readdirSync(schemaDir)) {
    if (!name.endsWith(".ts")) continue;
    const t = readFileSync(path.join(schemaDir, name), "utf8");
    tableCount += [...t.matchAll(/appSchema\.table\(/g)].length;
  }
  if (tableCount !== 108) {
    fail("TABLE_COUNT", `Expected 108 appSchema.table declarations, got ${tableCount}`);
  } else {
    note("Application table count 108");
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
    ["postgres", "app", "customer-auth", "workforce-auth", "customer-commerce"].includes(s),
  );
  if (defaultServices.length !== 5 || services.length !== 5) {
    fail(
      "DOCKER_DEFAULT_COUNT",
      `Expected exactly 5 default services [postgres, app, customer-auth, workforce-auth, customer-commerce], found [${services.join(", ")}]`,
    );
  } else {
    note("Default Docker service count 5");
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

  if (vision && vision.meta.version !== "VISION-1") {
    fail("VISION_VERSION", `Expected VISION-1, got ${vision.meta.version}`);
  }
  if (architecture && architecture.meta.architectureVersion !== "ARCH-R12") {
    fail("ARCH_VERSION", `Expected ARCH-R12, got ${architecture.meta.architectureVersion}`);
  }
  if (decision && decision.meta.decisionRegisterVersion !== "DR-9") {
    fail("DR_VERSION", `Expected DR-9, got ${decision.meta.decisionRegisterVersion}`);
  }
  if (roadmap && roadmap.meta.roadmapVersion !== "GTM-R28") {
    fail("ROADMAP_VERSION", `Expected GTM-R28, got ${roadmap.meta.roadmapVersion}`);
  }
  if (state && state.meta.stateVersion !== "STATE-R26") {
    fail("STATE_VERSION", `Expected STATE-R26, got ${state.meta.stateVersion}`);
  }
  if (state && state.meta.governanceHealth === "ALIGNED") {
    // During reconciliation install this may still be RECONCILIATION_REQUIRED;
    // ALIGNED is allowed only after independent acceptance — do not fail either way structurally.
    note("governanceHealth=ALIGNED (independent acceptance may have applied)");
  } else if (state) {
    note(`governanceHealth=${state.meta.governanceHealth}`);
  }

  checkRoadmapState(roadmap, state);
  checkDecisionRegister(decision);
  checkImp024ArchitectureLock(roadmap, state, architecture);
  checkImp025ArchitectureLock(roadmap, state, architecture);
  checkImp026ArchitectureLock(roadmap, state, architecture, decision);
  checkImp026cArchitectureLock(roadmap, state);
  checkImp027ArchitectureLock(roadmap, state, architecture);
  checkImp028ArchitectureLock(roadmap, state, architecture, decision);
  checkTechnicalInventory();
  checkStaticWeb();
  checkAgentsPointer();
  checkSupersededRoadmap();

  return findings;
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
