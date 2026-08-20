import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_ROADMAP_VERSIONS,
  ALLOWED_STATE_VERSIONS,
  FORMAL_LEDGER_IMP_ID_RE,
  LEDGER_ROW_IMP_RE,
  evaluatePendingAcceptanceSplit,
  isAllowedGovernanceVersion,
  isImp028cCanonicalPendingAcceptance,
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

describe("governance version allowlist", () => {
  it("accepts current baseline ROADMAP and STATE versions", () => {
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R46"), true);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R44"), true);
  });

  it("accepts next mechanical revision bump for IMP-028C lifecycle transition", () => {
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R47"), true);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R45"), true);
  });

  it("rejects stale or speculative governance version tokens", () => {
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R45"), false);
    assert.equal(isAllowedGovernanceVersion("roadmap", "GTM-R48"), false);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R43"), false);
    assert.equal(isAllowedGovernanceVersion("state", "STATE-R46"), false);
  });

  it("preserves explicit allowlist membership for ROADMAP and STATE", () => {
    assert.deepEqual([...ALLOWED_ROADMAP_VERSIONS], ["GTM-R46", "GTM-R47"]);
    assert.deepEqual([...ALLOWED_STATE_VERSIONS], ["STATE-R44", "STATE-R45"]);
  });
});

describe("IMP-028C post-transition foundation pending marker", () => {
  const phaseBState = Object.freeze({
    meta: {
      acceptedThrough: "IMP-028B",
      currentProductSlice: "IMP-028C",
      pendingAcceptance: "IMP-028C",
    },
    text:
      "Current Governance Activity: IMP-028C Food Customization IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\n" +
      "IMP-028C_IMPLEMENTATION_COMPLETE: YES\n" +
      "IMP-028C_ACCEPTED: NO\n",
  });

  it("permits the proven IMP-028C Phase B marker without weakening foundation acceptance", () => {
    assert.equal(isImp028cCanonicalPendingAcceptance(phaseBState), true);
  });

  it("rejects the IMP-028C marker without completion", () => {
    assert.equal(
      isImp028cCanonicalPendingAcceptance({
        ...phaseBState,
        text: phaseBState.text.replace("IMP-028C_IMPLEMENTATION_COMPLETE: YES", "IMP-028C_IMPLEMENTATION_COMPLETE: NO"),
      }),
      false,
    );
  });

  it("rejects an IMP-028C marker for a different current slice", () => {
    assert.equal(
      isImp028cCanonicalPendingAcceptance({
        ...phaseBState,
        meta: { ...phaseBState.meta, currentProductSlice: "IMP-029" },
      }),
      false,
    );
  });

  it("rejects an unrelated pending marker", () => {
    assert.equal(
      isImp028cCanonicalPendingAcceptance({
        ...phaseBState,
        meta: { ...phaseBState.meta, pendingAcceptance: "IMP-029" },
      }),
      false,
    );
  });
});
