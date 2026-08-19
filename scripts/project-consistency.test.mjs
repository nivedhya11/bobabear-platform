import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORMAL_LEDGER_IMP_ID_RE,
  LEDGER_ROW_IMP_RE,
  evaluatePendingAcceptanceSplit,
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
});
