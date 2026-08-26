import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  FORMAL_LEDGER_IMP_ID_RE,
  LEDGER_ROW_IMP_RE,
  evaluateCapabilityLifecycle,
  evaluateImp030ArchitectureActivationCheckpoint,
  evaluateImp030ArchitectureLockCheckpoint,
  evaluateImp030ArchitectureLockDocuments,
  evaluateImp030ImplementationAuthorizationCheckpoint,
  evaluateImp030ImplementationAuthorizationDocuments,
  evaluateImp030ImplementationStartCheckpoint,
  evaluateImp030ImplementationStartDocuments,
  evaluateLifecycleAuthorityAlignment,
  evaluatePendingAcceptanceSplit,
  isAllowedGovernanceVersion,
  isSupportedImp030GovernanceCheckpoint,
  isValidCanonicalRevision,
  runProjectConsistency,
} from "./project-consistency.mjs";

describe("project:consistency", () => {
  it("passes against the repository governance baseline", () => {
    const findings = runProjectConsistency();
    const failures = findings.filter((f) => !f.ok);
    assert.equal(
      failures.length,
      0,
      failures.map((f) => `[${f.code}] ${f.message}`).join("\n"),
    );
  });

  it("emits at least one OK finding", () => {
    const findings = runProjectConsistency();
    assert.ok(findings.some((f) => f.ok));
  });
});

describe("formal inserted IMP ledger grammar", () => {
  const valid = ["IMP-005", "IMP-005A", "IMP-026", "IMP-026C", "IMP-040", "IMP-030B"];
  const invalid = ["IMP-026AA", "IMP-26a", "IMP-026-C", "IMP_026C", "IMP-026a", "IMP-"];

  for (const id of valid) {
    it(`accepts ${id}`, () => {
      assert.equal(FORMAL_LEDGER_IMP_ID_RE.test(id), true);
    });
  }

  for (const id of invalid) {
    it(`rejects ${id}`, () => {
      assert.equal(FORMAL_LEDGER_IMP_ID_RE.test(id), false);
    });
  }

  it("extracts only formal ledger ids from markdown table rows", () => {
    const table = `
| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-005 | Database test and migration validation | COMPLETE_AND_ACCEPTED |
| IMP-005A | Dockerized local application runtime | COMPLETE_AND_ACCEPTED |
| IMP-026 | Razorpay Productionization & Payment GTM Readiness | ARCHITECTURE_LOCKED |
| IMP-026C | Pilot Customer-Commerce UX Hardening | PLANNED |
| IMP-026AA | Not a formal slice | PLANNED |
| IMP-26a | Not a formal slice | PLANNED |
| IMP-026-C | Not a formal slice | PLANNED |
| IMP_026C | Not a formal slice | PLANNED |
| IMP-040 | Launch Validation & Cutover | PLANNED |
`;
    const rowRe = new RegExp(LEDGER_ROW_IMP_RE.source, LEDGER_ROW_IMP_RE.flags);
    const ids = [];
    let m;
    while ((m = rowRe.exec(table)) !== null) {
      if (m[2].trim().toLowerCase() === "capability") continue;
      ids.push(m[1]);
    }
    assert.deepEqual(ids, ["IMP-005", "IMP-005A", "IMP-026", "IMP-026C", "IMP-040"]);
  });
});

describe("GTM-R15–R28 pending-acceptance split", () => {
  const deferredGate = Object.freeze({
    acceptedThrough: "IMP-025",
    currentProductSlice: "IMP-026C",
    pendingAcceptance: "IMP-026",
    imp026Implementation: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    imp026Accepted: false,
    deferredExternalWebhookGate: "DEFERRED_NOT_SATISFIED",
    deferredExternalWebhookSatisfied: false,
    imp026cLifecycle: "ARCHITECTURE_LOCKED",
    imp026cImplementationAuthorized: false,
    imp026cAccepted: false,
    imp027Lifecycle: "UNKNOWN",
    imp027ImplementationAuthorized: false,
    imp027Accepted: false,
    imp027CapabilityArtifactLocked: true,
    imp027IndependentImplementationReview: "PASS",
    imp028Lifecycle: "UNKNOWN",
    imp028ImplementationAuthorized: false,
    imp028ArchitectureLocked: false,
    imp028CapabilityArtifactLocked: true,
    imp028Accepted: false,
    imp028ImplementationStarted: false,
  });

  const imp028ArchitectureBase = Object.freeze({
    ...deferredGate,
    currentProductSlice: "IMP-028",
    imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    imp026cImplementationAuthorized: true,
    imp026cAccepted: false,
    imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    imp027ImplementationAuthorized: true,
    imp027Accepted: false,
    imp027CapabilityArtifactLocked: true,
    imp027IndependentImplementationReview: "PASS",
    imp028Lifecycle: "ARCHITECTURE_IN_PROGRESS",
    imp028ImplementationAuthorized: false,
    imp028ArchitectureLocked: false,
    imp028CapabilityArtifactLocked: true,
    imp028Accepted: false,
    imp028ImplementationStarted: false,
  });

  it("permits the documented IMP-026 deferred-external-gate exception", () => {
    const result = evaluatePendingAcceptanceSplit(deferredGate);
    assert.deepEqual(result, { ok: true, kind: "imp026_deferred_external_gate" });
  });

  it("permits the GTM-R17 authorized IMPLEMENTATION_IN_PROGRESS exception", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp026cImplementationAuthorized: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp026_deferred_external_gate_impl_authorized" });
  });

  it("permits IMP-026C implementation complete behind oldest pending IMP-026", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: false,
    });
    assert.deepEqual(result, { ok: true, kind: "imp026_deferred_external_gate_impl_complete" });
  });

  it("permits IMP-027 architecture activation with oldest pending IMP-026 and completed IMP-026C", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: false,
      imp027Lifecycle: "ARCHITECTURE_IN_PROGRESS",
      imp027ImplementationAuthorized: false,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp027_architecture",
    });
  });

  it("permits IMP-027 architecture lock with oldest pending IMP-026 and completed IMP-026C", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: false,
      imp027Lifecycle: "ARCHITECTURE_LOCKED",
      imp027ImplementationAuthorized: false,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp027_architecture_locked",
    });
  });

  it("permits IMP-027 implementation in progress with oldest pending IMP-026 and completed IMP-026C", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: false,
      imp027Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp027ImplementationAuthorized: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp027_implementation",
    });
  });

  it("permits IMP-027 implementation complete behind oldest pending IMP-026", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: false,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
      imp027Accepted: false,
      imp027CapabilityArtifactLocked: true,
      imp027IndependentImplementationReview: "PASS",
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp027_implementation_complete",
    });
  });

  it("permits IMP-028 architecture activation behind oldest pending IMP-026 under explicit continuation", () => {
    const result = evaluatePendingAcceptanceSplit(imp028ArchitectureBase);
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_architecture",
    });
  });

  it("permits the normal aligned current==pending case", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-026",
      pendingAcceptance: "IMP-026",
    });
    assert.deepEqual(result, { ok: true, kind: "aligned" });
  });

  it("permits pendingAcceptance IMP-026C after IMP-027 is accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-027",
      currentProductSlice: "IMP-028",
      pendingAcceptance: "IMP-026C",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp027_accepted_pending_imp026c_imp028_implementation",
    });
  });

  it("permits aligned pendingAcceptance IMP-028 after IMP-026C is accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-027",
      currentProductSlice: "IMP-028",
      pendingAcceptance: "IMP-028",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
    });
    assert.deepEqual(result, { ok: true, kind: "aligned" });
  });

  it("permits aligned pendingAcceptance NONE after IMP-028 is accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "NONE",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
    });
    assert.deepEqual(result, { ok: true, kind: "aligned" });
  });

  it("permits IMP-028A canonical activation after IMP-028 is accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "IMP-028A",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: false,
      imp028aImplementationStarted: false,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028a_canonical_activation" });
  });

  it("rejects IMP-028A implementation authorization unless architecture is locked", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "IMP-028A",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: false,
      imp028aArchitectureLocked: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("permits IMP-028A implementation authorization when architecture is locked and not started", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "IMP-028A",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: false,
      imp028aArchitectureLocked: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028a_implementation_authorized" });
  });

  it("permits IMP-028A implementation in progress when authorized and locked", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "IMP-028A",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028a_implementation_in_progress" });
  });

  it("permits IMP-028A implementation complete pending acceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028",
      currentProductSlice: "IMP-028A",
      pendingAcceptance: "IMP-028A",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp028a_implementation_complete_pending_acceptance",
    });
  });

  it("permits IMP-028A COMPLETE_AND_ACCEPTED after independent acceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "NONE",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028a_complete_and_accepted" });
  });

  it("permits IMP-028B canonical activation after IMP-028A is accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: false,
      imp028bImplementationStarted: false,
      imp028bArchitectureLocked: false,
      imp028bAccepted: false,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028b_canonical_activation" });
  });

  it("rejects IMP-028B implementation authorization during canonical activation", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: false,
      imp028bArchitectureLocked: false,
      imp028bAccepted: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("permits IMP-028B implementation authorization when architecture is locked and not started", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: false,
      imp028bArchitectureLocked: true,
      imp028bAccepted: false,
      imp028bCapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028b_implementation_authorized" });
  });

  it("permits IMP-028B implementation in progress when started and not complete", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: true,
      imp028bImplementationComplete: false,
      imp028bArchitectureLocked: true,
      imp028bAccepted: false,
      imp028bCapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028b_implementation_in_progress" });
  });

  it("permits IMP-028B implementation complete pending acceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "IMP-028B",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: true,
      imp028bImplementationComplete: true,
      imp028bArchitectureLocked: true,
      imp028bAccepted: false,
      imp028bCapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028b_implementation_complete_pending_acceptance" });
  });

  it("permits IMP-028B COMPLETE_AND_ACCEPTED after founder UAT", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028B",
      currentProductSlice: "NONE",
      pendingAcceptance: "NONE",
      imp026Accepted: true,
      imp026cAccepted: true,
      imp027Accepted: true,
      imp028Accepted: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: true,
      imp028bImplementationComplete: true,
      imp028bArchitectureLocked: true,
      imp028bAccepted: true,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028b_complete_and_accepted" });
  });

  it("rejects IMP-028B complete without pendingAcceptance IMP-028B", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "IMP-028B",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
      imp028bImplementationAuthorized: true,
      imp028bImplementationStarted: true,
      imp028bImplementationComplete: true,
      imp028bArchitectureLocked: true,
      imp028bAccepted: false,
      imp028bCapabilityArtifactLocked: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects pendingAcceptance IMP-028A after acceptedThrough advances to IMP-028A", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-028A",
      currentProductSlice: "NONE",
      pendingAcceptance: "IMP-028A",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
      imp026cLifecycle: "COMPLETE_AND_ACCEPTED",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
      imp027Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
      imp028Lifecycle: "COMPLETE_AND_ACCEPTED",
      imp028ImplementationAuthorized: true,
      imp028ArchitectureLocked: true,
      imp028ImplementationStarted: true,
      imp028Accepted: true,
      imp028aImplementationAuthorized: true,
      imp028aImplementationStarted: true,
      imp028aArchitectureLocked: true,
      imp028aAccepted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects pendingAcceptance NONE after IMP-026 is accepted while a later slice remains active", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-026",
      currentProductSlice: "IMP-026C",
      pendingAcceptance: "NONE",
      imp026Implementation: "COMPLETE_AND_ACCEPTED",
      imp026Accepted: true,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects hiding IMP-026 debt by clearing pendingAcceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      pendingAcceptance: "NONE",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects pendingAcceptance=IMP-026C while IMP-026 is unresolved", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      pendingAcceptance: "IMP-026C",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects acceptedThrough skipping IMP-026", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-026C",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-026C accepted before IMP-026", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp026cAccepted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 advancing without architecture-in-progress authorization tokens", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 IMPLEMENTATION_IN_PROGRESS without authorization", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp027ImplementationAuthorized: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 implementation authorized while still ARCHITECTURE_LOCKED", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "ARCHITECTURE_LOCKED",
      imp027ImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects pendingAcceptance changing to IMP-027", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      pendingAcceptance: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects pendingAcceptance retargeting to IMP-028", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      pendingAcceptance: "IMP-028",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects acceptedThrough skipping unresolved slices", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      acceptedThrough: "IMP-027",
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects acceptedThrough skipping predecessors during IMP-028 activation", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      acceptedThrough: "IMP-027",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 accepted out of sequence while IMP-026 is unresolved", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
      imp027Accepted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 completion without locked capability artifact", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
      imp027CapabilityArtifactLocked: false,
      imp027IndependentImplementationReview: "PASS",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-027 completion without independent implementation-review PASS", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-027",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
      imp027Lifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp027ImplementationAuthorized: true,
      imp027CapabilityArtifactLocked: true,
      imp027IndependentImplementationReview: "FAIL",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-028 implementation starting during architecture activation", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp028ImplementationAuthorized: true,
      imp028ImplementationStarted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("permits IMP-028 architecture lock behind oldest pending IMP-026 under GTM-R24", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "ARCHITECTURE_LOCKED",
      imp028ArchitectureLocked: true,
      imp028CapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_architecture_locked",
    });
  });

  it("rejects IMP-028 architecture locked without capability artifact", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "ARCHITECTURE_LOCKED",
      imp028ArchitectureLocked: true,
      imp028CapabilityArtifactLocked: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-028 implementation authorization without architecture lock", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "ARCHITECTURE_IN_PROGRESS",
      imp028ArchitectureLocked: false,
      imp028ImplementationAuthorized: true,
      imp028CapabilityArtifactLocked: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("permits IMP-028 implementation authorization while architecture locked under GTM-R25", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "IMPLEMENTATION_AUTHORIZED",
      imp028ArchitectureLocked: true,
      imp028ImplementationAuthorized: true,
      imp028ImplementationStarted: false,
      imp028CapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_implementation_authorized",
    });
  });

  it("permits IMP-028 implementation in progress while architecture locked under GTM-R26", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp028ArchitectureLocked: true,
      imp028ImplementationAuthorized: true,
      imp028ImplementationStarted: true,
      imp028CapabilityArtifactLocked: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp026_deferred_external_gate_imp028_implementation",
    });
  });

  it("rejects unauthorized IMP-028 implementation start", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      imp028Lifecycle: "IMPLEMENTATION_IN_PROGRESS",
      imp028ArchitectureLocked: true,
      imp028ImplementationAuthorized: false,
      imp028ImplementationStarted: true,
      imp028CapabilityArtifactLocked: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-029 activating automatically under the continuation exception", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028ArchitectureBase,
      currentProductSlice: "IMP-029",
      imp028Lifecycle: "ARCHITECTURE_IN_PROGRESS",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects an arbitrary future slice receiving the exception automatically", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-030",
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      imp026cImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects the exception if IMP-026 were treated as accepted", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026Accepted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-026 marked accepted while the webhook gate is unsatisfied", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      currentProductSlice: "IMP-026",
      pendingAcceptance: "IMP-026",
      imp026Accepted: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects the exception if the webhook gate is marked satisfied", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      deferredExternalWebhookGate: "SATISFIED",
      deferredExternalWebhookSatisfied: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects the exception if the deferred webhook gate token is absent", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      deferredExternalWebhookGate: "UNKNOWN",
      deferredExternalWebhookSatisfied: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-026C implementation authorized without IMPLEMENTATION_IN_PROGRESS lifecycle", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-026C IMPLEMENTATION_IN_PROGRESS without authorization", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects IMP-026C IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE without authorization", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects the exception if IMP-026C is not ARCHITECTURE_LOCKED", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  it("rejects the exception if IMP-026C remains ARCHITECTURE_IN_PROGRESS after GTM-R16", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...deferredGate,
      imp026cLifecycle: "ARCHITECTURE_IN_PROGRESS",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
  });

  // IMP-028C authorized/not-started lifecycle validation
  const imp028cBase = Object.freeze({
    acceptedThrough: "IMP-028B",
    currentProductSlice: "IMP-028C",
    pendingAcceptance: "NONE",
    imp026Accepted: true,
    imp026cAccepted: true,
    imp027Accepted: true,
    imp028Accepted: true,
    imp028aAccepted: true,
    imp028bImplementationAuthorized: true,
    imp028bImplementationStarted: true,
    imp028bImplementationComplete: true,
    imp028bArchitectureLocked: true,
    imp028bAccepted: true,
    imp028cCanonicallyAssigned: true,
    imp028cArchitectureLocked: true,
    imp028cImplementationAuthorized: true,
    imp028cImplementationStarted: false,
    imp028cImplementationComplete: false,
    imp028cAccepted: false,
  });

  it("permits IMP-028C authorized/not-started with acceptedThrough=IMP-028B", () => {
    const result = evaluatePendingAcceptanceSplit(imp028cBase);
    assert.deepEqual(result, { ok: true, kind: "imp028c_authorized_not_started" });
  });

  const imp028cStartedBase = Object.freeze({
    ...imp028cBase,
    imp028cImplementationStarted: true,
  });

  it("permits IMP-028C implementation started with pendingAcceptance=NONE", () => {
    const result = evaluatePendingAcceptanceSplit(imp028cStartedBase);
    assert.deepEqual(result, { ok: true, kind: "imp028c_implementation_started" });
  });

  it("rejects IMP-028C started state if not canonically assigned", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cCanonicallyAssigned: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /not canonically assigned/);
  });

  it("rejects IMP-028C started state if architecture not locked", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cArchitectureLocked: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /architecture is not locked/);
  });

  it("rejects IMP-028C started state if implementation not authorized", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cImplementationAuthorized: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /not authorized/);
  });

  it("rejects IMP-028C if not canonically assigned", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cBase,
      imp028cCanonicallyAssigned: false,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_SPLIT");
    assert.match(result.message, /not canonically assigned/);
  });

  it("rejects IMP-028C if architecture not locked", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cBase,
      imp028cArchitectureLocked: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /architecture is not locked/);
  });

  it("rejects IMP-028C if implementation not authorized", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cBase,
      imp028cImplementationAuthorized: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /not authorized/);
  });

  it("classifies IMP-028C as authorized/not-started when started flag is false", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cImplementationStarted: false,
    });
    assert.deepEqual(result, { ok: true, kind: "imp028c_authorized_not_started" });
  });

  it("rejects IMP-028C started state if implementation complete without pendingAcceptance IMP-028C", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cImplementationComplete: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /requires pendingAcceptance = IMP-028C/);
  });

  it("permits IMP-028C implementation complete pending acceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      pendingAcceptance: "IMP-028C",
      imp028cImplementationComplete: true,
    });
    assert.deepEqual(result, {
      ok: true,
      kind: "imp028c_implementation_complete_pending_acceptance",
    });
  });

  it("rejects pendingAcceptance IMP-028C without implementation completion", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      pendingAcceptance: "IMP-028C",
      imp028cImplementationComplete: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /IMP-028C_IMPLEMENTATION_COMPLETE: YES/);
  });

  it("rejects premature acceptedThrough advancement to IMP-028C before acceptance", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      acceptedThrough: "IMP-028C",
      imp028cAccepted: false,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /cannot advance to IMP-028C/);
  });

  it("rejects IMP-028C started state if accepted is true", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp028cAccepted: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /cannot be accepted/);
  });

  it("rejects IMP-028C started state when acceptedThrough advances prematurely", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      acceptedThrough: "IMP-028C",
    });
    assert.equal(result.ok, false);
  });

  it("rejects IMP-028C started state with pendingAcceptance set prematurely without completion", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      pendingAcceptance: "IMP-028C",
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /IMP-028C_IMPLEMENTATION_COMPLETE: YES/);
  });

  it("rejects IMP-028C started state when currentProductSlice is not IMP-028C", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      currentProductSlice: "IMP-029",
    });
    assert.equal(result.ok, false);
  });

  it("rejects IMP-028C started state when IMP-029 implementation is authorized", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp029ImplementationAuthorized: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /IMP-029.*NOT_AUTHORIZED/);
  });

  it("rejects IMP-028C started state when IMP-029 is marked started", () => {
    const result = evaluatePendingAcceptanceSplit({
      ...imp028cStartedBase,
      imp029Started: true,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /IMP-029.*NOT_STARTED/);
  });
});

describe("governance version validation", () => {
  it("permits the next legal ROADMAP and STATE revision without a source allowlist change", () => {
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R48"), true);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R46"), true);
  });

  it("rejects malformed or wrong-family governance version tokens", () => {
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R48A"), false);
    assert.equal(isAllowedGovernanceVersion("roadmap", "STATE-R46"), false);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R0"), false);
    assert.equal(isAllowedGovernanceVersion("state", "GTM-R48"), false);
  });

  it("validates the other canonical revision families structurally", () => {
    assert.equal(isValidCanonicalRevision("vision", "VISION-2"), true);
    assert.equal(isValidCanonicalRevision("architecture", "ARCH-R16"), true);
    assert.equal(isValidCanonicalRevision("decision", "DR-13"), true);
    assert.equal(isValidCanonicalRevision("decision", "DR-0"), false);
  });
});

describe("IMP-030 architecture lock checkpoint", () => {
  const lock = Object.freeze({
    roadmapVersion: "GTM-R67", stateVersion: "STATE-R65", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "ARCHITECTURE_LOCKED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "NO", started: "NO",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
  });

  const activation = Object.freeze({
    ...lock,
    roadmapVersion: "GTM-R66", stateVersion: "STATE-R64",
    imp030: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED", architectureLocked: "NO",
    d372Current: true, d373Exists: false, artifact: false,
  });

  it("preserves the R66/S64 activation checkpoint and supports R67/S65 lock only", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R66", "STATE-R64", "activation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R67", "STATE-R65", "lock"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R68", "STATE-R66", "authorization"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R67", "start"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R68", "STATE-R66"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R67"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R66"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R68", "STATE-R67"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R67", "STATE-R66"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R67"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R68"), false);
  });

  it("accepts only the R66/S64 architecture-activation checkpoint", () => {
    assert.deepEqual(evaluateImp030ArchitectureActivationCheckpoint(activation), { ok: true });
    for (const [key, value] of [
      ["architectureLocked", "YES"], ["implementationAuthorized", "YES"], ["started", "YES"],
      ["imp030", "ARCHITECTURE_LOCKED"], ["imp031", "ACTIVATED"], ["d373Exists", true],
    ]) {
      assert.equal(evaluateImp030ArchitectureActivationCheckpoint({ ...activation, [key]: value }).ok, false, key);
    }
  });

  it("accepts only the architecture-locked, implementation-unstarted IMP-030 checkpoint", () => {
    assert.deepEqual(evaluateImp030ArchitectureLockCheckpoint(lock), { ok: true });
    for (const [key, value] of [
      ["architectureLocked", "NO"], ["implementationAuthorized", "YES"], ["started", "YES"],
      ["implementationComplete", "YES"], ["accepted", "YES"], ["currentProductSlice", "IMP-031"],
      ["acceptedThrough", "IMP-030"], ["pendingAcceptance", "IMP-030"], ["imp031", "ACTIVATED"],
      ["d373Exists", true], ["artifact", false],
    ]) {
      assert.equal(evaluateImp030ArchitectureLockCheckpoint({ ...lock, [key]: value }).ok, false, key);
    }
  });

  const roadmapText = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const stateText = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readFileSync(new URL("../docs/platform/capabilities/IMP-030-operations-console-ui.md", import.meta.url), "utf8");
  const currentSectionEnd = "## 3.";

  function replaceCurrentFact(text, key, value) {
    const start = text.indexOf("## 2.");
    const end = text.indexOf(currentSectionEnd, start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = text.slice(start, end);
    const updated = current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
    assert.notEqual(updated, current, `current ${key} must exist`);
    return `${text.slice(0, start)}${updated}${text.slice(end)}`;
  }

  function applyLifecycleFacts(text, facts) {
    let updated = text;
    for (const [key, value] of facts) {
      const start = updated.indexOf("## 2.");
      const end = updated.indexOf(currentSectionEnd, start);
      assert.notEqual(start, -1);
      assert.notEqual(end, -1);
      const current = updated.slice(start, end);
      updated = `${updated.slice(0, start)}${current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`)}${updated.slice(end)}`;
    }
    return updated;
  }

  const lockRoadmapText = applyLifecycleFacts(
    roadmapText.replace(/"roadmapVersion": "GTM-R69"/, '"roadmapVersion": "GTM-R67"')
      .replace("| IMP-030 | Operations Console UI | IMPLEMENTATION_IN_PROGRESS |", "| IMP-030 | Operations Console UI | ARCHITECTURE_LOCKED |"),
    [
      ["IMP-030", "ARCHITECTURE_LOCKED"],
      ["IMP-030_ARCHITECTURE", "LOCKED"],
      ["IMP-030_ARCHITECTURE_LOCKED", "YES"],
      ["IMP-030_IMPLEMENTATION", "NOT_AUTHORIZED / NOT_STARTED"],
      ["IMP-030_IMPLEMENTATION_AUTHORIZED", "NO"],
      ["IMP-030_STARTED", "NO"],
      ["IMP-030_IMPLEMENTATION_COMPLETE", "NO"],
      ["IMP-030_ACCEPTED", "NO"],
    ],
  );
  const lockStateText = applyLifecycleFacts(
    stateText.replace(/"stateVersion": "STATE-R67"/, '"stateVersion": "STATE-R65"'),
    [
      ["IMP-030", "ARCHITECTURE_LOCKED"],
      ["IMP-030_ARCHITECTURE", "LOCKED"],
      ["IMP-030_ARCHITECTURE_LOCKED", "YES"],
      ["IMP-030_IMPLEMENTATION", "NOT_AUTHORIZED / NOT_STARTED"],
      ["IMP-030_IMPLEMENTATION_AUTHORIZED", "NO"],
      ["IMP-030_STARTED", "NO"],
      ["IMP-030_IMPLEMENTATION_COMPLETE", "NO"],
      ["IMP-030_ACCEPTED", "NO"],
    ],
  );

  function currentDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? lockRoadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R67",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? lockStateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R65",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: { meta: { architectureVersion: "ARCH-R17" }, text: architectureText },
      decision: { meta: { decisionRegisterVersion: "DR-14" }, text: overrides.decisionText ?? decisionText },
      artifact: overrides.artifact ?? true,
    };
  }

  it("validates the current lifecycle blocks rather than historical R66/S64 facts", () => {
    assert.deepEqual(evaluateImp030ArchitectureLockDocuments(currentDocuments()), { ok: true });
    for (const [key, value] of [
      ["IMP-030_ARCHITECTURE_LOCKED", "NO"], ["IMP-030_ARCHITECTURE", "NOT_LOCKED"],
      ["IMP-030_IMPLEMENTATION_AUTHORIZED", "YES"], ["IMP-030_STARTED", "YES"],
      ["IMP-030_IMPLEMENTATION_COMPLETE", "YES"], ["IMP-030_ACCEPTED", "YES"],
      ["IMP-030_IMPLEMENTATION", "AUTHORIZED / NOT_STARTED"], ["IMP-031", "ACTIVATED"],
    ]) {
      const source = key === "IMP-031" ? lockRoadmapText : lockStateText;
      const fixture = replaceCurrentFact(source, key, value);
      assert.match(fixture, new RegExp(`${key}: ${value}`));
      assert.match(lockStateText, /IMP-030_IMPLEMENTATION_AUTHORIZED: NO/);
      assert.equal(evaluateImp030ArchitectureLockDocuments(currentDocuments(key === "IMP-031" ? { roadmapText: fixture } : { stateText: fixture })).ok, false, key);
    }
  });

  it("rejects current position, decision, and artifact mutations while preserving history", () => {
    for (const overrides of [
      { currentProductSlice: "IMP-031" }, { acceptedThrough: "IMP-030" },
      { pendingAcceptance: "IMP-030" }, { nextProductSlice: "IMP-032" },
      { decisionText: `${decisionText}\n| D-373 | created | CURRENT |` }, { artifact: false },
    ]) {
      assert.equal(evaluateImp030ArchitectureLockDocuments(currentDocuments(overrides)).ok, false);
    }
  });

  it("rejects premature IMPLEMENTATION_AUTHORIZED at the R67/S65 lock checkpoint", () => {
    assert.equal(
      evaluateImp030ArchitectureLockCheckpoint({ ...lock, imp030: "IMPLEMENTATION_AUTHORIZED", implementationAuthorized: "YES" }).ok,
      false,
    );
  });
});

describe("IMP-030 implementation authorization checkpoint", () => {
  const authorization = Object.freeze({
    roadmapVersion: "GTM-R68", stateVersion: "STATE-R66", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "NO",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
  });

  const authorizationRoadmapText = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8")
    .replace(/"roadmapVersion": "GTM-R69"/, '"roadmapVersion": "GTM-R68"')
    .replace("| IMP-030 | Operations Console UI | IMPLEMENTATION_IN_PROGRESS |", "| IMP-030 | Operations Console UI | IMPLEMENTATION_AUTHORIZED |");
  const authorizationStateText = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8")
    .replace(/"stateVersion": "STATE-R67"/, '"stateVersion": "STATE-R66"');
  const authorizationCapabilityText = readFileSync(new URL("../docs/platform/capabilities/IMP-030-operations-console-ui.md", import.meta.url), "utf8")
    .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "AUTHORIZED / NOT_STARTED"')
    .replace("| Implementation | `AUTHORIZED` / `STARTED` |", "| Implementation | `AUTHORIZED` / `NOT_STARTED` |")
    .replace("IMP-030_STARTED: YES", "IMP-030_STARTED: NO")
    .replace("IMPLEMENTATION START IS NOT COMPLETION OR ACCEPTANCE: YES", "AUTHORIZATION IS NOT IMPLEMENTATION START: YES");

  function applyAuthorizationLifecycleFacts(text, facts) {
    let updated = text;
    for (const [key, value] of facts) {
      const start = updated.indexOf("## 2.");
      const end = updated.indexOf("## 3.", start);
      const current = updated.slice(start, end);
      updated = `${updated.slice(0, start)}${current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`)}${updated.slice(end)}`;
    }
    return updated;
  }

  const authorizationRoadmapFixture = applyAuthorizationLifecycleFacts(authorizationRoadmapText, [
    ["IMP-030", "IMPLEMENTATION_AUTHORIZED"],
    ["IMP-030_ARCHITECTURE", "LOCKED"],
    ["IMP-030_ARCHITECTURE_LOCKED", "YES"],
    ["IMP-030_IMPLEMENTATION", "AUTHORIZED / NOT_STARTED"],
    ["IMP-030_IMPLEMENTATION_AUTHORIZED", "YES"],
    ["IMP-030_STARTED", "NO"],
    ["IMP-030_IMPLEMENTATION_COMPLETE", "NO"],
    ["IMP-030_ACCEPTED", "NO"],
  ]);
  const authorizationStateFixture = applyAuthorizationLifecycleFacts(authorizationStateText, [
    ["IMP-030", "IMPLEMENTATION_AUTHORIZED"],
    ["IMP-030_ARCHITECTURE", "LOCKED"],
    ["IMP-030_ARCHITECTURE_LOCKED", "YES"],
    ["IMP-030_IMPLEMENTATION", "AUTHORIZED / NOT_STARTED"],
    ["IMP-030_IMPLEMENTATION_AUTHORIZED", "YES"],
    ["IMP-030_STARTED", "NO"],
    ["IMP-030_IMPLEMENTATION_COMPLETE", "NO"],
    ["IMP-030_ACCEPTED", "NO"],
  ]);

  const roadmapText = authorizationRoadmapFixture;
  const stateText = authorizationStateFixture;
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = authorizationCapabilityText;
  const currentSectionEnd = "## 3.";

  function replaceCurrentFact(text, key, value) {
    const start = text.indexOf("## 2.");
    const end = text.indexOf(currentSectionEnd, start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = text.slice(start, end);
    const updated = current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
    assert.notEqual(updated, current, `current ${key} must exist`);
    return `${text.slice(0, start)}${updated}${text.slice(end)}`;
  }

  function authorizationDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? roadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R68",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? stateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R66",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: { meta: { architectureVersion: "ARCH-R17" }, text: architectureText },
      decision: { meta: { decisionRegisterVersion: "DR-14" }, text: overrides.decisionText ?? decisionText },
      artifact: overrides.artifact ?? true,
      artifactText: overrides.artifactText ?? capabilityText,
    };
  }

  it("accepts only the R68/S66 implementation-authorized / not-started checkpoint", () => {
    assert.deepEqual(evaluateImp030ImplementationAuthorizationCheckpoint(authorization), { ok: true });
    assert.deepEqual(evaluateImp030ImplementationAuthorizationDocuments(authorizationDocuments()), { ok: true });
    const artifactMeta = capabilityText.match(/"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/);
    assert.ok(artifactMeta);
    assert.match(capabilityText, /"implementationAuthorized":\s*true/);
  });

  it("passes when current authorization YES coexists with historical architecture-lock NO", () => {
    assert.match(roadmapText, /IMP-030_IMPLEMENTATION_AUTHORIZED: YES/);
    assert.match(roadmapText, /GTM-R67[\s\S]*IMP-030 implementation remains `NOT_AUTHORIZED`/);
    assert.deepEqual(evaluateImp030ImplementationAuthorizationDocuments(authorizationDocuments()), { ok: true });
  });

  it("rejects current authorization NO even when historical authorization YES appears elsewhere", () => {
    const fixture = replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_AUTHORIZED", "NO");
    assert.match(roadmapText, /IMP-030_IMPLEMENTATION_AUTHORIZED: YES/);
    assert.equal(evaluateImp030ImplementationAuthorizationDocuments(authorizationDocuments({ stateText: fixture })).ok, false);
  });

  for (const [field, rejectValue, passValue] of [
    ["IMP-030_STARTED", "YES", "NO"],
    ["IMP-030_IMPLEMENTATION_COMPLETE", "YES", "NO"],
    ["IMP-030_ACCEPTED", "YES", "NO"],
  ]) {
    it(`rejects current ${field}:${rejectValue} with historical ${field}:${passValue}`, () => {
      const fixture = replaceCurrentFact(stateText, field, rejectValue);
      assert.match(roadmapText, new RegExp(`${field}: ${passValue}`));
      assert.equal(evaluateImp030ImplementationAuthorizationDocuments(authorizationDocuments({ stateText: fixture })).ok, false, field);
    });
  }

  it("rejects future governance frontiers independently", () => {
    for (const [roadmapVersion, stateVersion] of [
      ["GTM-R69", "STATE-R67"],
      ["GTM-R69", "STATE-R66"],
      ["GTM-R68", "STATE-R67"],
      ["GTM-R70", "STATE-R68"],
      ["GTM-R70", "STATE-R67"],
      ["GTM-R69", "STATE-R68"],
    ]) {
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, "authorization"), false, `${roadmapVersion}/${stateVersion}`);
    }
  });

  it("rejects adversarial R68/S66 lifecycle and artifact mutations independently", () => {
    for (const [key, value] of [
      ["imp030", "ARCHITECTURE_LOCKED"], ["architecture", "NOT_LOCKED"], ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"], ["started", "YES"], ["implementationComplete", "YES"],
      ["accepted", "YES"], ["acceptedThrough", "IMP-030"], ["currentProductSlice", "IMP-031"],
      ["nextProductSlice", "IMP-032"], ["pendingAcceptance", "IMP-030"], ["imp031", "ACTIVATED"],
      ["d373Exists", true], ["artifact", false],
    ]) {
      assert.equal(evaluateImp030ImplementationAuthorizationCheckpoint({ ...authorization, [key]: value }).ok, false, key);
    }
    for (const overrides of [
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030", "ARCHITECTURE_LOCKED") },
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030_IMPLEMENTATION", "NOT_AUTHORIZED / NOT_STARTED") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_ARCHITECTURE_LOCKED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_AUTHORIZED", "NO") },
      { artifactText: capabilityText.replace(/"implementationAuthorized":\s*true/, '"implementationAuthorized": false') },
      { artifactText: capabilityText.replace(/"implementation":\s*"AUTHORIZED \/ NOT_STARTED"/, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"') },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": []') },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": ["D-372", "D-373"]') },
      { artifactText: capabilityText.replace(/"dependsOn":\s*\["IMP-029"\]/, '"dependsOn": []') },
      { artifact: false },
    ]) {
      assert.equal(evaluateImp030ImplementationAuthorizationDocuments(authorizationDocuments(overrides)).ok, false);
    }
  });
});

describe("IMP-030 implementation start checkpoint", () => {
  const start = Object.freeze({
    roadmapVersion: "GTM-R69", stateVersion: "STATE-R67", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
  });

  const roadmapText = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const stateText = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readFileSync(new URL("../docs/platform/capabilities/IMP-030-operations-console-ui.md", import.meta.url), "utf8");
  const currentSectionEnd = "## 3.";

  function replaceCurrentFact(text, key, value) {
    const startIdx = text.indexOf("## 2.");
    const end = text.indexOf(currentSectionEnd, startIdx);
    assert.notEqual(startIdx, -1);
    assert.notEqual(end, -1);
    const current = text.slice(startIdx, end);
    const updated = current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
    assert.notEqual(updated, current, `current ${key} must exist`);
    return `${text.slice(0, startIdx)}${updated}${text.slice(end)}`;
  }

  function startDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? roadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R69",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? stateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R67",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: { meta: { architectureVersion: "ARCH-R17" }, text: architectureText },
      decision: { meta: { decisionRegisterVersion: "DR-14" }, text: overrides.decisionText ?? decisionText },
      artifact: overrides.artifact ?? true,
      artifactText: overrides.artifactText ?? capabilityText,
    };
  }

  it("accepts only the R69/S67 implementation-started / in-progress checkpoint", () => {
    assert.deepEqual(evaluateImp030ImplementationStartCheckpoint(start), { ok: true });
    assert.deepEqual(evaluateImp030ImplementationStartDocuments(startDocuments()), { ok: true });
    assert.match(capabilityText, /"implementation":\s*"AUTHORIZED \/ STARTED"/);
    assert.match(capabilityText, /"implementationAuthorized":\s*true/);
  });

  it("passes when current STARTED YES coexists with historical STARTED NO", () => {
    assert.match(roadmapText, /IMP-030_STARTED: YES/);
    assert.match(stateText, /STATE-R66[\s\S]*IMP-030_STARTED: NO/);
    assert.deepEqual(evaluateImp030ImplementationStartDocuments(startDocuments()), { ok: true });
  });

  it("rejects current STARTED NO even when historical STARTED YES appears elsewhere", () => {
    const fixture = replaceCurrentFact(stateText, "IMP-030_STARTED", "NO");
    assert.match(roadmapText, /IMP-030_STARTED: YES/);
    assert.equal(evaluateImp030ImplementationStartDocuments(startDocuments({ stateText: fixture })).ok, false);
  });

  it("rejects current IMP-030_IMPLEMENTATION_AUTHORIZED NO even when historical YES appears elsewhere", () => {
    const fixture = replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_AUTHORIZED", "NO");
    assert.match(stateText, /STATE-R66[\s\S]*IMP-030_IMPLEMENTATION_AUTHORIZED: YES/);
    assert.equal(evaluateImp030ImplementationStartDocuments(startDocuments({ stateText: fixture })).ok, false);
  });

  for (const [field, rejectValue, passValue] of [
    ["IMP-030_IMPLEMENTATION_COMPLETE", "YES", "NO"],
    ["IMP-030_ACCEPTED", "YES", "NO"],
  ]) {
    it(`rejects current ${field}:${rejectValue} with historical ${field}:${passValue}`, () => {
      const fixture = replaceCurrentFact(stateText, field, rejectValue);
      assert.match(roadmapText, new RegExp(`${field}: ${passValue}`));
      assert.equal(evaluateImp030ImplementationStartDocuments(startDocuments({ stateText: fixture })).ok, false, field);
    });
  }

  it("rejects future governance frontiers independently", () => {
    for (const [roadmapVersion, stateVersion] of [
      ["GTM-R70", "STATE-R68"],
      ["GTM-R70", "STATE-R67"],
      ["GTM-R69", "STATE-R68"],
    ]) {
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, "start"), false, `${roadmapVersion}/${stateVersion}`);
    }
  });

  it("rejects adversarial R69/S67 lifecycle and artifact mutations independently", () => {
    for (const [key, value] of [
      ["imp030", "IMPLEMENTATION_AUTHORIZED"], ["architecture", "NOT_LOCKED"], ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"], ["started", "NO"], ["implementationComplete", "YES"],
      ["accepted", "YES"], ["acceptedThrough", "IMP-030"], ["currentProductSlice", "IMP-031"],
      ["nextProductSlice", "IMP-032"], ["pendingAcceptance", "IMP-030"], ["imp031", "ACTIVATED"],
      ["d373Exists", true], ["artifact", false],
    ]) {
      assert.equal(evaluateImp030ImplementationStartCheckpoint({ ...start, [key]: value }).ok, false, key);
    }
    for (const overrides of [
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030", "IMPLEMENTATION_AUTHORIZED") },
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030_IMPLEMENTATION", "AUTHORIZED / NOT_STARTED") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_ARCHITECTURE_LOCKED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_AUTHORIZED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_STARTED", "NO") },
      { artifactText: capabilityText.replace(/"implementationAuthorized":\s*true/, '"implementationAuthorized": false') },
      { artifactText: capabilityText.replace(/"implementation":\s*"AUTHORIZED \/ STARTED"/, '"implementation": "AUTHORIZED / NOT_STARTED"') },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": []') },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": ["D-372", "D-373"]') },
      { artifactText: capabilityText.replace(/"dependsOn":\s*\["IMP-029"\]/, '"dependsOn": []') },
      { artifact: false },
    ]) {
      assert.equal(evaluateImp030ImplementationStartDocuments(startDocuments(overrides)).ok, false);
    }
  });
});

describe("generic capability lifecycle validation", () => {
  const capabilities = Object.freeze([
    { id: "IMP-028B", accepted: true, implementationComplete: true },
    { id: "IMP-028C", accepted: false, implementationComplete: true },
    { id: "IMP-029", accepted: false, implementationComplete: false },
  ]);

  it("permits the current implementation-complete pending-acceptance state", () => {
    assert.deepEqual(
      evaluateCapabilityLifecycle({
        acceptedThrough: "IMP-028B",
        currentProductSlice: "IMP-028C",
        pendingAcceptance: "IMP-028C",
        capabilities,
      }),
      { ok: true },
    );
  });

  it("permits IMP-028C accepted with no remaining pending acceptance", () => {
    assert.deepEqual(
      evaluateCapabilityLifecycle({
        acceptedThrough: "IMP-028C",
        currentProductSlice: "NONE",
        pendingAcceptance: "NONE",
        capabilities: capabilities.map((capability) =>
          capability.id === "IMP-028C" ? { ...capability, accepted: true } : capability,
        ),
      }),
      { ok: true },
    );
  });

  it("permits a known planned successor after acceptance advances", () => {
    assert.deepEqual(
      evaluateCapabilityLifecycle({
        acceptedThrough: "IMP-028C",
        currentProductSlice: "IMP-029",
        pendingAcceptance: "NONE",
        capabilities: capabilities.map((capability) =>
          capability.id === "IMP-028C" ? { ...capability, accepted: true } : capability,
        ),
      }),
      { ok: true },
    );
  });

  it("rejects ROADMAP and STATE accepted-through drift", () => {
    const result = evaluateLifecycleAuthorityAlignment(
      { acceptedThrough: "IMP-028B", currentProductSlice: "IMP-028C", nextProductSlice: "IMP-029", pendingAcceptance: "IMP-028C" },
      { acceptedThrough: "IMP-028C", currentProductSlice: "IMP-028C", nextProductSlice: "IMP-029", pendingAcceptance: "IMP-028C" },
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROADMAP_STATE_MISMATCH");
  });

  it("rejects an accepted capability that remains pending", () => {
    const result = evaluateCapabilityLifecycle({
      acceptedThrough: "IMP-028C",
      currentProductSlice: "IMP-028C",
      pendingAcceptance: "IMP-028C",
      capabilities: capabilities.map((capability) =>
        capability.id === "IMP-028C" ? { ...capability, accepted: true } : capability,
      ),
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "CURRENT_SLICE_ACCEPTED");
  });

  it("rejects an unknown current capability reference", () => {
    const result = evaluateCapabilityLifecycle({
      acceptedThrough: "IMP-028B",
      currentProductSlice: "IMP-999",
      pendingAcceptance: "NONE",
      capabilities,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "CURRENT_SLICE_MISSING");
  });

  it("rejects an incomplete current capability presented as pending", () => {
    const result = evaluateCapabilityLifecycle({
      acceptedThrough: "IMP-028B",
      currentProductSlice: "IMP-029",
      pendingAcceptance: "IMP-029",
      capabilities,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "PENDING_ACCEPTANCE_INCOMPLETE");
  });
});
