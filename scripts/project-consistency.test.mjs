import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  FORMAL_LEDGER_IMP_ID_RE,
  LEDGER_ROW_IMP_RE,
  evaluateCapabilityLifecycle,
  evaluateImp030ArchitectureActivationCheckpoint,
  evaluateImp031ArchitectureActivationCheckpoint,
  evaluateImp032ArchitectureActivationCheckpoint,
  evaluateImp032ArchitectureDraftArtifact,
  evaluateImp032ArchitectureDraftCheckpoint,
  evaluateImp032ArchitectureLockArtifact,
  evaluateImp032ArchitectureLockCheckpoint,
  evaluateImp032ImplementationAuthorizationArtifact,
  evaluateImp032ImplementationAuthorizationCheckpoint,
  evaluateImp032ImplementationAuthorizationCrossDocumentAlignment,
  evaluateImp032ImplementationStartArtifact,
  evaluateImp032ImplementationStartCheckpoint,
  evaluateImp032ImplementationStartCrossDocumentAlignment,
  evaluateImp032PermissionBootstrapClarificationArtifact,
  evaluateImp032PermissionBootstrapClarificationCheckpoint,
  evaluateImp032PermissionBootstrapClarificationCrossDocumentAlignment,
  evaluateImp032ImplementationCompletionArtifact,
  evaluateImp032ImplementationCompletionCheckpoint,
  evaluateImp032ImplementationCompletionCrossDocumentAlignment,
  evaluateImp032AcceptanceArtifact,
  evaluateImp032AcceptanceCheckpoint,
  evaluateImp032AcceptanceCrossDocumentAlignment,
  evaluateImp033ArchitectureActivationCheckpoint,
  evaluateImp033ArchitectureDraftArtifact,
  evaluateImp033ImplementationCompletionArtifact,
  evaluateImp033ImplementationCompletionCheckpoint,
  evaluateImp033ImplementationCompletionCrossDocumentAlignment,
  evaluateImp033AcceptanceArtifact,
  evaluateImp033AcceptanceCheckpoint,
  evaluateImp033AcceptanceCrossDocumentAlignment,
  evaluateImp034ImplementationCompletionArtifact,
  evaluateImp034ImplementationCompletionCheckpoint,
  evaluateImp034ImplementationCompletionCrossDocumentAlignment,
  evaluateImp034AcceptanceArtifact,
  evaluateImp034AcceptanceCheckpoint,
  evaluateImp034AcceptanceCrossDocumentAlignment,
  evaluateImp035ImplementationCompletionArtifact,
  evaluateImp035ImplementationCompletionCheckpoint,
  evaluateImp035ImplementationCompletionCrossDocumentAlignment,
  evaluateImp035AcceptanceArtifact,
  evaluateImp035AcceptanceCheckpoint,
  evaluateImp035AcceptanceCrossDocumentAlignment,
  evaluateImp036ImplementationCompletionArtifact,
  evaluateImp036ImplementationCompletionCheckpoint,
  evaluateImp036ImplementationCompletionCrossDocumentAlignment,
  evaluateImp036AcceptanceArtifact,
  evaluateImp036AcceptanceCheckpoint,
  evaluateImp036AcceptanceCrossDocumentAlignment,
  evaluateImp036aImplementationCompletionArtifact,
  evaluateImp036aImplementationCompletionCheckpoint,
  evaluateImp036aImplementationCompletionCrossDocumentAlignment,
  evaluateImp036aAcceptanceArtifact,
  evaluateImp036aAcceptanceCheckpoint,
  evaluateImp036aAcceptanceCrossDocumentAlignment,
  evaluateEnterpriseExperiencePlanningCheckpoint,
  evaluateImp031ArchitectureDraftArtifact,
  evaluateImp031ArchitectureDraftCheckpoint,
  evaluateImp031ArchitectureLockArtifact,
  evaluateImp031ArchitectureLockCheckpoint,
  evaluateImp031ImplementationAuthorizationArtifact,
  evaluateImp031ImplementationAuthorizationCheckpoint,
  evaluateImp031CurrentArchitectureStatus,
  evaluateImp031ImplementationAuthorizationCrossDocumentAlignment,
  evaluateImp031ImplementationStartArtifact,
  evaluateImp031ImplementationStartCapabilityCurrentStatus,
  evaluateImp031ImplementationStartCheckpoint,
  evaluateImp031ImplementationStartCurrentArchitectureStatus,
  evaluateImp031ImplementationStartCrossDocumentAlignment,
  evaluateImp031AcceptanceArtifact,
  evaluateImp031AcceptanceCheckpoint,
  evaluateImp031AcceptanceCurrentArchitectureStatus,
  evaluateImp031AcceptanceCrossDocumentAlignment,
  evaluateImp031ImplementationCompletionArtifact,
  evaluateImp031ImplementationCompletionCapabilityCurrentStatus,
  evaluateImp031ImplementationCompletionCheckpoint,
  evaluateImp031ImplementationCompletionCurrentArchitectureStatus,
  evaluateImp031ImplementationCompletionCrossDocumentAlignment,
  evaluateImp030ArchitectureLockCheckpoint,
  evaluateImp030ArchitectureLockDocuments,
  evaluateImp030ImplementationAuthorizationCheckpoint,
  evaluateImp030ImplementationAuthorizationDocuments,
  evaluateImp030ImplementationStartCheckpoint,
  evaluateImp030ImplementationStartDocuments,
  evaluateImp030DetailRouteAmendmentCheckpoint,
  evaluateImp030DetailRouteAmendmentDocuments,
  evaluateImp030CanonicalConsistencyCheckpoint,
  evaluateImp030CanonicalConsistencyDocuments,
  evaluateImp030AcceptanceCheckpoint,
  evaluateImp030AcceptanceDocuments,
  evaluateImp030LiveInProgressProseConsistency,
  evaluateImp030CurrentRouteFacts,
  extractCurrentImp030RouteFacts,
  extractCurrentImp030Lifecycle,
  evaluateLifecycleAuthorityAlignment,
  evaluatePendingAcceptanceSplit,
  authorityEvidenceBlob,
  currentAuthorityBlob,
  isAllowedGovernanceVersion,
  isSupportedImp030GovernanceCheckpoint,
  isValidCanonicalRevision,
  loadHistoricalAuthorityCorpus,
  runProjectConsistency,
  evaluateImp036fActivationCheckpoint,
  evaluateImp036gActivationCheckpoint,
  evaluateImp037ActivationCheckpoint,
  evaluateImp037ActivatedProductDefinitionDependencyAuthority,
  evaluateImp037ProductDefinitionGatePassCheckpoint,
  evaluateImp037ApprovedProductDefinitionCandidate,
  evaluateImp037ProductDefinitionActivationProvenance,
  evaluateD374CostOptimizedPilotInfrastructureCheckpoint,
  evaluateD374AmendedHistoricalAdrPreservation,
  evaluateImp037ProductDefinitionD374CurrentRecoveryRead,
  evaluateImp037ArchitectureLockCheckpoint,
  evaluateImp037LockedCapabilityArchitecture,
  evaluateImp037ArchitectureLockedProductDefinition,
  evaluateImp037ImplementationAuthorizationCheckpoint,
  evaluateImp037AuthorizedCapabilityArchitecture,
  evaluateImp037AuthorizedProductDefinition,
  evaluateImp037ImplementationStartCheckpoint,
  evaluateImp037StartedCapabilityArchitecture,
  evaluateImp037StartedProductDefinition,
  evaluateImp037PostMergeReconciliationCheckpoint,
  evaluateImp037PostMergedCapabilityArchitecture,
  evaluateImp037PostMergedProductDefinition,
  evaluateImp037ContinuationCapabilityArchitecture,
  evaluateImp037ContinuationProductDefinition,
  evaluateImp038ControlledContinuationActivationCheckpoint,
  evaluateImp038ArchitectureLockCheckpoint,
  evaluateImp038LockedCapabilityArchitecture,
  evaluateImp038ArchitectureLockedProductDefinition,
  evaluateImp038ImplementationAuthorizeStartCheckpoint,
  evaluateImp038AuthorizedStartedCapabilityArchitecture,
  evaluateImp038AuthorizedStartedProductDefinition,
  evaluateImp038DraftProductDefinition,
  evaluateImp038ApprovedProductDefinition,
  evaluateImp036hProductDefinitionActivationCheckpoint,
  evaluateImp036hUngatedProductDefinitionDraftCandidate,
  evaluateImp036iProductDefinitionActivationCheckpoint,
  evaluateImp036iProductDefinitionDraftReadyCheckpoint,
  evaluateImp036iUngatedProductDefinitionDraftCandidate,
  evaluateImp036iUngatedProductDefinitionPreGateDraftCandidate,
  evaluateImp036iProductDefinitionGatePassCheckpoint,
  evaluateImp036IArchitectureFitCandidateAuthority,
  evaluateImp036iArchitectureLockAuthority,
  evaluateImp036iImplementationAuthorization,
  evaluateImp036iApprovedProductDefinitionCandidate,
  evaluateImp036hProductDefinitionGatePassCheckpoint,
  evaluateImp036hApprovedProductDefinitionCandidate,
  evaluateImp036hArchitectureLockCheckpoint,
  evaluateImp036hLockedCapabilityArchitecture,
  evaluateImp036hArchitectureLockedProductDefinition,
  evaluateImp036hImplementationAuthorizationCheckpoint,
  evaluateImp036hAuthorizedCapabilityArchitecture,
  evaluateImp036hAuthorizedProductDefinition,
  evaluateImp036hImplementationStartCheckpoint,
  evaluateImp036hStartedCapabilityArchitecture,
  evaluateImp036hStartedProductDefinition,
  evaluateImp036hImplementationCompleteCheckpoint,
  evaluateImp036hCompleteCapabilityArchitecture,
  evaluateImp036hCompleteProductDefinition,
  evaluateImp036hAcceptanceCheckpoint,
  toImp036hCompleteShapedAcceptedCapability,
  toImp036hCompleteShapedAcceptedProductDefinition,
  evaluateImp036hAcceptanceArtifact,
  evaluateImp036hAcceptedProductDefinition,
  collectCurrentImp038ImplementationCompleteValues,
  evaluateCurrentImp038ImplementationCompleteMarkerConsistency,
  stripExplicitlyHistoricalImp038CompletionContext,
  stripImp037HistoricalManagedRecoveryAuthority,
  evaluateImp036gProductDefinitionDraftCheckpoint,
  evaluateImp036gProductDefinitionGatePassCheckpoint,
  evaluateImp036gUngatedProductDefinitionDraftCandidate,
  evaluateImp036gApprovedProductDefinitionCandidate,
  evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint,
  evaluateImp036fUngatedProductDefinitionDraftCandidate,
  evaluateImp036fProductDefinitionGatePassCheckpoint,
  evaluateImp036fApprovedProductDefinitionCandidate,
  evaluateImp036fArchitectureLockCheckpoint,
  evaluateImp036gArchitectureLockCheckpoint,
  evaluateImp036gLockedCapabilityArchitecture,
  evaluateImp036gArchitectureLockedProductDefinition,
  evaluateImp036gImplementationStartCheckpoint,
  evaluateImp036gStartedCapabilityArchitecture,
  evaluateImp036gStartedProductDefinition,
  evaluateImp036gImplementationCompletionCheckpoint,
  evaluateImp036gCompletedCapabilityArchitecture,
  evaluateImp036gCompletedProductDefinition,
  evaluateImp036gCompletedProductIndex,
  evaluateImp036gManualTechnicalValidation,
  evaluateImp036gAcceptanceCheckpoint,
  evaluateImp036gAcceptanceArtifact,
  evaluateImp036gAcceptedProductDefinition,
  evaluateImp036gAcceptedProductDefinitionPhaseProvenance,
  evaluateImp036gAcceptedCurrentAuthorityProse,
  evaluateImp040PreGateProductDefinitionAuthority,
  stripImp036gHistoricalGovernanceSections,
  evaluateImp036fImplementationAuthorizationCheckpoint,
  evaluateImp036fAuthorizedCapabilityArchitecture,
  evaluateImp036fAuthorizedProductDefinition,
  evaluateImp036fLockedCapabilityArchitecture,
  evaluateImp036fArchitectureFitProductDefinition,
  evaluateImp036fImplementationStartCheckpoint,
  evaluateImp036fAcceptanceCheckpoint,
  evaluateImp036fAcceptanceArtifact,
  evaluateImp036fAcceptedProductDefinition,
  evaluateImp036fAcceptedCurrentAuthorityProse,
  evaluateImp036fStartedCapabilityArchitecture,
  evaluateImp036fStartedProductDefinition,
} from "./project-consistency.mjs";

/** Deterministic pre-acceptance R71/S69 IMP-030 governance fixtures (no git history). */
const IMP030_IN_PROGRESS_FIXTURES = Object.freeze({
  "docs/platform/ROADMAP.md": "<!-- governance-meta\n{\n  \"status\": \"CURRENT\",\n  \"authority\": \"IMPLEMENTATION_SEQUENCE\",\n  \"roadmapVersion\": \"GTM-R71\",\n  \"acceptedThrough\": \"IMP-029\",\n  \"currentProductSlice\": \"IMP-030\",\n  \"nextProductSlice\": \"IMP-031\",\n  \"gtmBoundary\": \"IMP-040\",\n  \"lastReviewed\": \"2026-08-27\",\n  \"supersedes\": \"GTM-R70\"\n}\n-->\n\n# BOBA Bear — Implementation Roadmap\n\n## 1. Roadmap Rules\n\n- Accepted IMP identity is **permanently immutable**. Do not reinterpret or renumber accepted\n  history (IMP-001 → IMP-025 and IMP-005A).\n- No other document may independently redefine IMP numbering.\n- Formal ROADMAP ledger IMP identifiers use `IMP-\\d+[A-Z]?` (numeric id with optional single\n  uppercase inserted suffix). Examples: `IMP-001`, `IMP-005A`, `IMP-026C`. Multi-letter,\n  lowercase, hyphenated, or underscore forms are not formal ledger ids.\n- Only one product slice is normally active.\n- A deferred capability cannot be assigned or promoted by an implementation agent.\n- Roadmap changes require a `roadmapVersion` change.\n- Prefer suffix insertion or explicit versioned remapping rather than silently recycling a\n  previously published IMP meaning.\n- Future planned mappings must not be silently reused for another capability.\n- Coding-agent completion is not acceptance. Acceptance is recorded in [`STATE.md`](./STATE.md).\n- After `COMPLETE_AND_ACCEPTED`, a separate reconciliation must update STATE / ROADMAP / acceptance\n  records (and DECISION-REGISTER / ARCHITECTURE when durable decisions or global architecture\n  change) before the next slice begins. **GTM-R15** records a narrow founder exception to that\n  `ACCEPT → RECONCILE → ADVANCE` rule: IMP-026C architecture may proceed while IMP-026 remains\n  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` because the remaining IMP-026 gate is an\n  unavailable public HTTPS endpoint, not an implementation defect. **GTM-R16** records the\n  IMP-026C architecture lock under that exception. **GTM-R17** records explicit founder\n  authorization for IMP-026C implementation. **GTM-R18** records IMP-026C\n  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending acceptance IMP-026.\n  **GTM-R19** records explicit founder authorization for IMP-027 architecture activation\n  (`ARCHITECTURE_IN_PROGRESS` only) while IMP-026 and IMP-026C remain unaccepted.\n  **GTM-R20** records IMP-027 architecture lock (`ARCHITECTURE_LOCKED`) with implementation\n  **NOT_AUTHORIZED**, binding **D-364**, and capability artifact\n  `capabilities/IMP-027-refund-foundation.md`, while IMP-026 and IMP-026C remain unaccepted.\n  **GTM-R21** records explicit founder authorization for IMP-027 implementation\n  (`IMPLEMENTATION_IN_PROGRESS`) under that locked artifact and **D-364** / ARCH-G15, while\n  IMP-026 and IMP-026C remain unaccepted.   **GTM-R22** records IMP-027\n  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending acceptance IMP-026 after\n  complete implementation evidence and independent implementation review PASS, while IMP-026 and\n  IMP-026C remain unaccepted. **GTM-R23** records explicit founder authorization for IMP-028\n  architecture activation (`ARCHITECTURE_IN_PROGRESS` only) while IMP-026, IMP-026C, and IMP-027\n  remain unaccepted. **GTM-R24** records IMP-028 architecture lock (`ARCHITECTURE_LOCKED`) with\n  implementation **NOT_AUTHORIZED**, binding **D-365**, and capability artifact\n  `capabilities/IMP-028-invoice-tax-receipt-credit-note.md`, while IMP-026, IMP-026C, and IMP-027\n  remain unaccepted. **GTM-R25** records explicit founder authorization for IMP-028 implementation\n  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`) under that\n  locked artifact and **D-365** / ARCH-G16, while IMP-026, IMP-026C, and IMP-027 remain unaccepted.\n  Authorization under GTM-R25 did **not** auto-start implementation. **GTM-R26** records IMP-028\n  implementation started (`IMP-028_IMPLEMENTATION_STARTED: YES`; lifecycle\n  `IMPLEMENTATION_IN_PROGRESS`) under that same authorization and locked artifact, while IMP-026,\n  IMP-026C, and IMP-027 remain unaccepted. `pendingAcceptance` identifies the oldest unresolved\n  formal acceptance gate; it does not mean a later authorized slice remains in progress. Formal\n  acceptance remains contiguous. The continuation path does **not** accept IMP-026, accept\n  IMP-026C, accept IMP-027, mark IMP-028 complete/accepted, activate\n  IMP-029, or legalize arbitrary simultaneous active slices. **GTM-R30** separately records\n  IMP-028 `COMPLETE_AND_ACCEPTED` after independent acceptance (`acceptedThrough = IMP-028`;\n  `pendingAcceptance = NONE`; `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and\n  does **not** authorize or start IMP-029. **GTM-R30** separately records\n  IMP-028 `COMPLETE_AND_ACCEPTED` after independent acceptance (`acceptedThrough = IMP-028`;\n  `pendingAcceptance = NONE`; `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and\n  does **not** authorize or start IMP-029. **GTM-R31** records binding **D-368** (Customer Menu\n  Read Projection Authority) without activating a product slice, authorizing IMP-029, or changing\n  `acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. **GTM-R32** records binding\n  **D-369** (Customer Paid Modifier Explicit Selection Authority) without activating a product\n  slice, authorizing IMP-029, implementing customization, or changing `acceptedThrough` /\n  `pendingAcceptance` / `currentProductSlice`. **GTM-R33** records binding **D-370** (Cart Identity\n  Transition Authority) without activating a product slice, authorizing IMP-029, implementing Cart\n  merge, changing authentication, or changing `acceptedThrough` / `pendingAcceptance` /\n  `currentProductSlice`. **GTM-R34** records canonical activation of **IMP-028A — Food Direct UX\n  Foundation** as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`) without\n  locking architecture, authorizing implementation, creating `D-371`, retargeting IMP-029, or\n  activating Food Direct families B–F. **GTM-R35** records IMP-028A capability-local architecture\n  lock (`ARCHITECTURE_LOCKED`) and implementation authorization\n  (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`) without\n  starting product implementation, creating `D-371`, retargeting IMP-029, or activating Food Direct\n  families B–F. **GTM-R36** records IMP-028A implementation complete pending independent acceptance\n  (`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;\n  `pendingAcceptance = IMP-028A`) without accepting IMP-028A, creating `D-371`, retargeting IMP-029,\n  or activating Food Direct families B–F. **GTM-R37** records IMP-028A `COMPLETE_AND_ACCEPTED`\n  after independent acceptance (`acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`;\n  `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and does **not** authorize or start\n  IMP-029, implement D-368 / D-369 / D-370, create `D-371`, or activate Food Direct families B–F.\n  **GTM-R38** records canonical activation of **IMP-028B — Customer Menu Projection + Discovery**\n  as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`)\n  without locking architecture, authorizing implementation, creating `D-371`, retargeting IMP-029,\n  or activating Food Direct families C–J. **GTM-R39** records IMP-028B capability-local architecture\n  lock (`ARCHITECTURE_LOCKED`) and implementation authorization\n  (`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: NO`) without\n  starting product implementation, creating `D-371`, retargeting IMP-029, or activating Food Direct\n  families C–J. IMP-029 remains `PLANNED` / `NOT_STARTED` /\n  `NOT_AUTHORIZED`.\n\n### Slice lifecycle states\n\nExact vocabulary:\n\n```text\nPLANNED\nARCHITECTURE_IN_PROGRESS\nARCHITECTURE_LOCKED\nIMPLEMENTATION_IN_PROGRESS\nIMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\nCOMPLETE_AND_ACCEPTED\nBLOCKED\nSUPERSEDED\n```\n\n```text\nIMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\n≠\nCOMPLETE_AND_ACCEPTED\n```\n\n`pendingAcceptance` identifies the oldest unresolved formal acceptance gate in the contiguous\nproduct sequence. A later explicitly authorized slice may become\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind that gate only under this documented IMP-026\ndeferred-external-gate exception. GTM-R19 further permits IMP-027 `ARCHITECTURE_IN_PROGRESS`\nbehind the same oldest pending gate under explicit founder architecture-activation authorization.\nGTM-R20 may promote IMP-027 to `ARCHITECTURE_LOCKED` with implementation still `NOT_AUTHORIZED`\nbehind the same oldest pending gate. GTM-R21 may promote IMP-027 to\n`IMPLEMENTATION_IN_PROGRESS` under explicit founder implementation authorization, with\narchitecture remaining `ARCHITECTURE_LOCKED`, behind the same oldest pending gate. GTM-R22 may\npromote IMP-027 to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind the same oldest pending\ngate after complete implementation evidence and independent implementation review PASS. GTM-R23 may\nset `currentProductSlice=IMP-028` with `ARCHITECTURE_IN_PROGRESS` only (architecture not locked;\nimplementation not authorized) while IMP-026, IMP-026C, and IMP-027 remain unaccepted. GTM-R24 may\npromote IMP-028 to `ARCHITECTURE_LOCKED` with implementation still `NOT_AUTHORIZED` behind the\nsame oldest pending gate. GTM-R25 may authorize IMP-028 implementation\n(`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`) while architecture remains `ARCHITECTURE_LOCKED` and\nimplementation remains `NOT_STARTED` (`IMP-028_IMPLEMENTATION_STARTED: NO`) behind the same oldest\npending gate. GTM-R25 authorization does **not** auto-start implementation. GTM-R26 may promote\nIMP-028 to `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_STARTED: YES`) under that\nauthorization behind the same oldest pending gate. Formal\nacceptance remains contiguous. Do not retarget `pendingAcceptance` to a later slice, clear it,\nor create a pending-acceptance array.\n\n```text\nARCHITECTURE_LOCKED\n≠\nIMPLEMENTATION_IN_PROGRESS\n```\n\n```text\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\n+\nIMP-028_IMPLEMENTATION_STARTED: NO\n≠\nIMPLEMENTATION_IN_PROGRESS\n```\n\n```text\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\n+\nIMP-028A_IMPLEMENTATION_STARTED: NO\n≠\nIMPLEMENTATION_IN_PROGRESS\n```\n\n```text\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\n+\nIMP-028A_IMPLEMENTATION_STARTED: YES\n+\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\n=\nIMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\n≠\nCOMPLETE_AND_ACCEPTED\n```\n\n```text\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\n+\nIMP-028B_IMPLEMENTATION_STARTED: YES\n+\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\n=\nIMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\n≠\nCOMPLETE_AND_ACCEPTED\n```\n\n```text\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\n+\nIMP-028_IMPLEMENTATION_STARTED: YES\n=\nIMPLEMENTATION_IN_PROGRESS\n≠\nIMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\n≠\nCOMPLETE_AND_ACCEPTED\n```\n\n### Capability architecture persistence (IMP-024 onward)\n\nEvery substantial future IMP must persist its complete locked capability architecture in the\nrepository before implementation begins. Historical accepted slices may lack governance-era\narchitecture artifacts; that gap does not downgrade their accepted implementation status.\n\nCanonical capability-architecture directory:\n\n```text\ndocs/platform/capabilities/\n```\n\nIMP-024 locked artifact:\n\n[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)\n\nIMP-025 locked artifact:\n\n[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)\n\nIMP-026 locked artifact:\n\n[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)\n\nIMP-026C locked artifact:\n\n[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)\n\nIMP-027 locked artifact:\n\n[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)\n\nIMP-028 locked artifact:\n\n[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)\n\nIMP-028A locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **COMPLETE** / independently accepted):\n\n[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)\n\nIMP-028B locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **STARTED** / **COMPLETE** / independently accepted):\n\n[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)\n\nIMP-028C locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**COMPLETE_AND_ACCEPTED**):\n\n[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)\n\nIMP-028D locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):\n\n[`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md)\n\nIMP-029 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):\n\n[`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)\n\n## 2. Current Position\n\n```text\nAccepted Through:     IMP-029 — Operations Console API\nCurrent Product Slice: IMP-030 — Operations Console UI\nNext Product Slice:    IMP-031 — Provider-Neutral Delivery Foundation\nPending Acceptance:    NONE\nPublic GTM Boundary:   IMP-040 — Launch Validation & Cutover\n```\n\nIMP-030 is `IMPLEMENTATION_IN_PROGRESS`. Its capability architecture remains locked in\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md)\nand was formally amended on 2026-08-27 for static detail-route realization while implementation\nremains started. Implementation is `AUTHORIZED` / `STARTED`; start does not complete or accept\nimplementation.\n\n```text\nIMP-030: IMPLEMENTATION_IN_PROGRESS\nIMP-030_ARCHITECTURE: LOCKED\nIMP-030_ARCHITECTURE_LOCKED: YES\nIMP-030_IMPLEMENTATION: AUTHORIZED / STARTED\nIMP-030_IMPLEMENTATION_AUTHORIZED: YES\nIMP-030_STARTED: YES\nIMP-030_IMPLEMENTATION_COMPLETE: NO\nIMP-030_ACCEPTED: NO\nIMP-031: PLANNED / NOT_ACTIVATED\n```\n\nIMP-024 architecture remains **ARCHITECTURE_LOCKED**. IMP-024 implementation is\n**COMPLETE_AND_ACCEPTED**. IMP-025 architecture remains **ARCHITECTURE_LOCKED**. IMP-025\nimplementation is **COMPLETE_AND_ACCEPTED**. Independent acceptance remains through Razorpay\nProductionization & Payment GTM Readiness.\n\nIMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation is\n**COMPLETE_AND_ACCEPTED** after independent acceptance including provider-originated Razorpay Test\nMode webhook proof over public HTTPS.\n\nIMP-026C is **COMPLETE_AND_ACCEPTED**. IMP-026C architecture remains\n**ARCHITECTURE_LOCKED**. Independent implementation review is **PASS**. Implementation evidence is\n**COMPLETE**. Independent acceptance evidence is **ACCEPTED**. Formal acceptance is recorded\n(`IMP-026C_ACCEPTED: YES`). `acceptedThrough` remains IMP-027 because IMP-026C is a supplemental\ninserted gate, not a contiguous `acceptedThrough` advancement. After IMP-026C acceptance,\nGTM-R29 set `pendingAcceptance = IMP-028` as the then-remaining formal acceptance gate. GTM-R30\nrecords IMP-028 `COMPLETE_AND_ACCEPTED`; `pendingAcceptance` is now `NONE`.\n\nIMP-027 is **COMPLETE_AND_ACCEPTED**. Architecture remains **LOCKED**. Implementation evidence is\n**COMPLETE**. Independent implementation review is **PASS**. Independent acceptance evidence is\n**ACCEPTED**. Formal acceptance is recorded (`IMP-027_ACCEPTED: YES`). `acceptedThrough` advances to\nIMP-027.\nLocked capability artifact:\n[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md).\nBinding decision **D-364**. A Payment that reached BOBA success from provider `captured` remains\nsuccessful original collection truth even if the provider later reports a refund; Refund must not\nrewrite that truth.\n\nIMP-028 is **COMPLETE_AND_ACCEPTED** under GTM-R30. Architecture remains **LOCKED**.\nImplementation is **AUTHORIZED** and **COMPLETE**. Locked capability artifact:\n[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).\nBinding decisions **D-365** / **D-366** / **D-367**. Financial Document is the sole issued\nstatutory/financial-document authority. Formal acceptance of IMP-028 did not itself authorize or\nstart IMP-029. GTM-R34 records\ncanonical activation of **IMP-028A — Food Direct UX Foundation** as `currentProductSlice`.\nGTM-R35 records IMP-028A capability-local architecture lock and implementation authorization.\nIMP-028A is `COMPLETE_AND_ACCEPTED`. Architecture is **ARCHITECTURE_LOCKED**.\nImplementation of IMP-028A is **authorized**, **started**, **complete**, and **independently\naccepted** (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;\n`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `IMP-028A_ACCEPTED: YES`). `acceptedThrough` remains\nIMP-028A. GTM-R38 through GTM-R41 record the historical IMP-028B activation, architecture lock,\nimplementation start, and implementation-complete-pending-acceptance progression. GTM-R42 records\nIMP-028B `COMPLETE_AND_ACCEPTED`. Architecture is `ARCHITECTURE_LOCKED`; implementation is\n**AUTHORIZED** / **STARTED** / **COMPLETE**; formal acceptance is recorded\n(`IMP-028B_ACCEPTED: YES`; `acceptedThrough = IMP-028B`; `pendingAcceptance = NONE`;\n`currentProductSlice = NONE`). GTM-R61 subsequently activates IMP-029 for architecture work only;\n`nextProductSlice` is now IMP-030. Food Direct families C–J are not activated. `D-371` is unused.\nAcceptance of IMP-028B did not itself start IMP-029.\n\nGTM-R31 records binding **D-368** (Customer Menu Read Projection Authority). Customer Menu serving\nis a server-backed READ PROJECTION over existing commerce authorities, implemented and accepted\nunder IMP-028B. The prior accepted IMP-025 static `ordering-catalog.json` is no longer the customer\nstorefront runtime delivery. D-368 itself did not authorize Menu implementation, create a Menu\nendpoint, activate IMP-029, or change\n`acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R32 records binding **D-369**\n(Customer Paid Modifier Explicit Selection Authority). A positive-price modifier must not become\ncustomer purchase intent solely because it is a catalog/default selection. D-369 does **not**\nauthorize customization implementation, populate modifier data, activate IMP-029, or change\n`acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R33 records binding **D-370**\n(Cart Identity Transition Authority). Guest and customer purchase intent must be reconciled without\nsilent winner selection; sign-out isolates the browser from the customer Cart without deleting it.\nD-370 does **not** authorize Cart-merge implementation, change authentication, activate IMP-029, or\nchange `acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R59 later records\nbinding **D-371**; the next free decision is **D-372**.\n\n```text\nLOCAL_RAZORPAY_GTM_VALIDATION: PASS\nEXTERNAL_ACCEPTANCE_GAP: NONE\nIMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED\nIMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED\nDEFERRED_EXTERNAL_GATE: NO\nSATISFIED: YES\nIMP-026_ACCEPTED: YES\nIMP-026C: COMPLETE_AND_ACCEPTED\nIMP-026C_IMPLEMENTATION_AUTHORIZED: YES\nIMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP026C_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-026C_ACCEPTED: YES\nIMP-027: COMPLETE_AND_ACCEPTED\nIMP-027_ARCHITECTURE: LOCKED\nIMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-027_IMPLEMENTATION_AUTHORIZED: YES\nIMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP027_REFUND_FOUNDATION: ACCEPTED\nIMP027_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-027_ACCEPTED: YES\nIMP-028: COMPLETE_AND_ACCEPTED\nIMP-028_ARCHITECTURE: LOCKED\nIMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE_LOCKED: YES\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028_IMPLEMENTATION_STARTED: YES\nIMP-028_IMPLEMENTATION_COMPLETE: YES\nIMP-028_ACCEPTED: YES\nIMP-028A: COMPLETE_AND_ACCEPTED\nIMP-028A_ARCHITECTURE_LOCKED: YES\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028A_IMPLEMENTATION_STARTED: YES\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\nIMP-028A_ACCEPTED: YES\nIMP-028B: COMPLETE_AND_ACCEPTED\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED: YES\nIMP-029: COMPLETE_AND_ACCEPTED\nIMP-029_ARCHITECTURE: LOCKED\nIMP-029_ARCHITECTURE_LOCKED: YES\nIMP-029_IMPLEMENTATION_AUTHORIZED: YES\nIMP-029_STARTED: YES\nIMP-029_IMPLEMENTATION_COMPLETE: YES\nIMP-029_ACCEPTED: YES\nPROVIDER_ORIGINATED_WEBHOOK: VALIDATED_PUBLIC_HTTPS_TEST_MODE\n```\n\nProven locally / through real Razorpay Test Mode: Test credentials, Test Order creation, Standard\nCheckout opening, manual Test payment, provider state `captured`, server-side client-evidence\nverification, stored provider Order authority, BOBA Payment `SUCCEEDED`, exactly one BOBA Order,\nconfirmation/history/detail, provider reconciliation, automatic capture, duplicate protection, the\nlocal signed webhook pipeline, and provider-originated webhook delivery over public HTTPS with\nsignature validation, durable inbox idempotency, and fail-closed invalid-signature behavior. No Live\nMode. No real money. No public database exposure.\n\nThis acceptance does **not** authorize production Razorpay launch, public GTM launch, Live Mode, or\nremoval of IMP-040 launch-validation obligations. It records IMP-026 payment GTM readiness as\nindependently accepted for the locked Razorpay architecture.\n\nCurrent V1 payment provider is **Razorpay** (**D-361**), substituting\nthe previously published Cashfree IMP-026 meaning without changing the slice number. Razorpay\nwebhook acknowledgement / missing-Order recovery is **D-362** (amends D-361 ack/post-payment effect\nonly). Webhook acknowledgement timing / durable inbox / asynchronous Payment processing is **D-363**\n(amends D-362 acknowledgement timing only).\n\n## 3. Accepted Slices\n\n| IMP | Capability | Lifecycle |\n|---|---|---|\n| IMP-001 | Behaviour-preserving `src/` migration | COMPLETE_AND_ACCEPTED |\n| IMP-002 | Test and quality-tooling foundation | COMPLETE_AND_ACCEPTED |\n| IMP-003 | Configuration and startup foundation | COMPLETE_AND_ACCEPTED |\n| IMP-004 | PostgreSQL + Drizzle foundation | COMPLETE_AND_ACCEPTED |\n| IMP-005 | Database test and migration validation | COMPLETE_AND_ACCEPTED |\n| IMP-005A | Dockerized local application runtime | COMPLETE_AND_ACCEPTED |\n| IMP-006 | Shared persistence primitives | COMPLETE_AND_ACCEPTED |\n| IMP-007 | Transactional outbox and idempotency foundation | COMPLETE_AND_ACCEPTED |\n| IMP-008 | Better Auth persistence and sessions | COMPLETE_AND_ACCEPTED |\n| IMP-009 | Customer phone OTP authentication | COMPLETE_AND_ACCEPTED |\n| IMP-010 | Workforce authentication + MFA | COMPLETE_AND_ACCEPTED |\n| IMP-011 | Organization / Territory / Outlet / scoped RBAC | COMPLETE_AND_ACCEPTED |\n| IMP-012 | Canonical catalog | COMPLETE_AND_ACCEPTED |\n| IMP-013 | Existing menu import + menu presentation | COMPLETE_AND_ACCEPTED |\n| IMP-014 | Assortment + operational availability | COMPLETE_AND_ACCEPTED |\n| IMP-015 | Pricing, charges and GST/tax engine | COMPLETE_AND_ACCEPTED |\n| IMP-016 | Promotions | COMPLETE_AND_ACCEPTED |\n| IMP-017 | Customer Profiles | COMPLETE_AND_ACCEPTED |\n| IMP-018 | Saved Customer Addresses | COMPLETE_AND_ACCEPTED |\n| IMP-019 | Serviceability | COMPLETE_AND_ACCEPTED |\n| IMP-020 | Cart | COMPLETE_AND_ACCEPTED |\n| IMP-021 | Checkout | COMPLETE_AND_ACCEPTED |\n| IMP-022 | Payment | COMPLETE_AND_ACCEPTED |\n| IMP-023 | Order | COMPLETE_AND_ACCEPTED |\n| IMP-024 | Customer Ordering Transport / API | COMPLETE_AND_ACCEPTED |\n| IMP-025 | Customer Ordering UX | COMPLETE_AND_ACCEPTED |\n| IMP-026 | Razorpay Productionization & Payment GTM Readiness | COMPLETE_AND_ACCEPTED |\n| IMP-026C | Pilot Customer-Commerce UX Hardening | COMPLETE_AND_ACCEPTED |\n| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |\n| IMP-028 | Invoice / Tax Receipt / Credit Note | COMPLETE_AND_ACCEPTED |\n| IMP-028A | Food Direct UX Foundation | COMPLETE_AND_ACCEPTED |\n| IMP-028B | Customer Menu Projection + Discovery | COMPLETE_AND_ACCEPTED |\n| IMP-028C | Food Customization | COMPLETE_AND_ACCEPTED |\n| IMP-028D | Desktop Ordering Continuity | COMPLETE_AND_ACCEPTED |\n| IMP-029 | Operations Console API | COMPLETE_AND_ACCEPTED |\n\n## 4. Current Product Slice\n\nIMP-030 — Operations Console UI is the current product slice.\nIMP-030 is `IMPLEMENTATION_IN_PROGRESS`. Architecture is `LOCKED`. Implementation is\n`AUTHORIZED` / `STARTED`. Implementation is not complete and not accepted. IMP-031 remains\n`PLANNED` / `NOT_ACTIVATED` as the next product slice.\nIMP-029 — Operations Console API remains `COMPLETE_AND_ACCEPTED`; architecture remains locked and\nimplementation is authorized, started, and complete.\n\n```text\nIMP-028D — Desktop Ordering Continuity\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: ARCHITECTURE_LOCKED\nImplementation: AUTHORIZED / STARTED / COMPLETE\nIMP-028D_ARCHITECTURE_LOCKED: YES\nIMP-028D_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028D_IMPLEMENTATION_STARTED: YES\nIMP-028D_IMPLEMENTATION_COMPLETE: YES\nIMP-028D_ACCEPTED: YES\nFOUNDER_UAT_REQUIRED: YES\nFOUNDER_UAT: PASS\nFOUNDER_UAT_COMPLETE: YES\nFOUNDER_UAT_DECISION_DATE: 2026-08-22\nFOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder\nFOUNDER_UAT_CANDIDATE_REF: main\nFOUNDER_UAT_CANDIDATE_HEAD: 166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7\nFOUNDER_UAT_CANDIDATE_TREE: eba5f3f7fc25b07581801b53a130fb9547abc459\nFOUNDER_UAT_EVIDENCE_SHA256: 715519d51801a10913a71a891af74c68aac1f493088adda43ecbc6a9c8bd5572\nLatest accepted slice: IMP-028D — Desktop Ordering Continuity\nIMP-028C_ARCHITECTURE_LOCKED: YES\nIMP-028C_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028C_IMPLEMENTATION_STARTED: YES\nIMP-028C_IMPLEMENTATION_COMPLETE: YES\nIMP-028C_ACCEPTED: YES\nIMP-028C_FOUNDER_UAT_REQUIRED: YES\nIMP-028C_FOUNDER_UAT: PASS\nIMP-028C_FOUNDER_UAT_COMPLETE: YES\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED: YES\nCapability: IMP-029 — Operations Console API\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: LOCKED\nImplementation: AUTHORIZED / STARTED / COMPLETE\nIMP-029_ARCHITECTURE_LOCKED: YES\nIMP-029_IMPLEMENTATION_AUTHORIZED: YES\nIMP-029_STARTED: YES\nIMP-029_IMPLEMENTATION_COMPLETE: YES\nIMP-029_ACCEPTED: YES\nNext product slice: IMP-031 — Provider-Neutral Delivery Foundation\nPending acceptance: NONE\nacceptedThrough: IMP-029\nIMP-026C: COMPLETE_AND_ACCEPTED\nIMP-027: COMPLETE_AND_ACCEPTED\nIMP-027_ARCHITECTURE: LOCKED\nIMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-027_IMPLEMENTATION_AUTHORIZED: YES\nIMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP027_REFUND_FOUNDATION: ACCEPTED\nIMP027_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-027_ACCEPTED: YES\nIMP-028: COMPLETE_AND_ACCEPTED\nIMP-028_ARCHITECTURE: LOCKED\nIMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE_LOCKED: YES\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028_IMPLEMENTATION_STARTED: YES\nIMP-028_IMPLEMENTATION_COMPLETE: YES\nIMP-028_ACCEPTED: YES\nIMP-028A: COMPLETE_AND_ACCEPTED\nIMP-028A_ARCHITECTURE_LOCKED: YES\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028A_IMPLEMENTATION_STARTED: YES\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\nIMP-028A_ACCEPTED: YES\nIMP-028B: COMPLETE_AND_ACCEPTED\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED: YES\n```\n\nIndependent acceptance of IMP-026 is recorded. IMP-027 remains independently and formally accepted\nunder binding **D-364** (`IMP-027_ACCEPTED: YES`). IMP-026C remains `COMPLETE_AND_ACCEPTED` /\n`IMP-026C_ACCEPTED: YES` as a supplemental inserted gate. GTM-R30 records IMP-028 independently\naccepted (`IMP-028_ACCEPTED: YES`; `acceptedThrough = IMP-028`; `pendingAcceptance = NONE`;\n`currentProductSlice = NONE`; `nextProductSlice = IMP-029`). IMP-029 remains `PLANNED` /\n`NOT_STARTED` / `NOT_AUTHORIZED`. Formal acceptance of IMP-028 does **not** authorize or start\nIMP-029. GTM-R31 records **D-368** without changing the then-current product-slice position. GTM-R32 records\n**D-369** without changing the then-current product-slice position. GTM-R33 records **D-370** without changing\nthe then-current product-slice position. **GTM-R34** records canonical activation of **IMP-028A —\nFood Direct UX Foundation** as `currentProductSlice`. **GTM-R35** records IMP-028A capability-local\narchitecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`;\narchitecture `ARCHITECTURE_LOCKED`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-028A_IMPLEMENTATION_STARTED: NO`). **GTM-R36** records IMP-028A\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-028A_IMPLEMENTATION_STARTED: YES`;\n`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `pendingAcceptance = IMP-028A`). **GTM-R37** records\nIMP-028A independently accepted (`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`;\n`acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;\n`nextProductSlice = IMP-029`). Formal acceptance of IMP-028A does **not** authorize or start\nIMP-029. **GTM-R38** historically records canonical activation of **IMP-028B — Customer Menu Projection +\nDiscovery** as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture\n`NOT_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;\n`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`). **GTM-R39** historically records IMP-028B\ncapability-local architecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` /\n`NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;\n`IMP-028B_ACCEPTED: NO`). `acceptedThrough` remains\nIMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains IMP-029. Decision register\nremains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**. IMP-029\nremains `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED` and is **not** this capability. Food Direct\nfamilies C–J are not activated. Architecture lock / implementation authorization of IMP-028B does\n**not** start product implementation.\n\nHistorical IMP-026A / IMP-026B references are task/authorization labels inside IMP-026 Razorpay\nwork and are **not** formal product ledger slices. The formal inserted product slice after IMP-026\nis **IMP-026C — Pilot Customer-Commerce UX Hardening**.\n\nIMP-024 architecture remains locked at\n[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md).\n\nIMP-025 architecture remains locked at\n[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md).\n**D-368** superseded only that artifact’s future-facing Menu serving/read-boundary; accepted\nIMP-025 implementation remains accepted while IMP-028B is the CURRENT storefront delivery. **D-370** supersedes only that\nartifact’s future-facing Checkout-only guest→customer identity-transition lock and whole-cart\nsilent-winner policy; accepted checkout claim/reconcile implementation remains CURRENT until an\nauthorized future capability implements D-370.\n\nIMP-026 architecture is locked at\n[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).\n\nIMP-026C architecture is locked at\n[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md).\n\nIMP-027 architecture is locked at\n[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)\n(binding **D-364**). Implementation is **AUTHORIZED** /\n`COMPLETE_AND_ACCEPTED`.\n\nIMP-028 architecture is locked at\n[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)\n(binding **D-365** / **D-366** / **D-367**). Implementation is **AUTHORIZED** / **COMPLETE** /\n`COMPLETE_AND_ACCEPTED`.\n\nIMP-028A locked capability architecture is at\n[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md).\nArchitecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **COMPLETE** /\n`COMPLETE_AND_ACCEPTED`. Formal acceptance of IMP-028A **is** claimed (`IMP-028A_ACCEPTED: YES`).\n\nIMP-028B locked capability architecture is at\n[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md).\nArchitecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **COMPLETE** /\n`COMPLETE_AND_ACCEPTED`. Formal acceptance of IMP-028B is claimed (`IMP-028B_ACCEPTED: YES`).\n\nIMP-028C locked capability architecture is at\n[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md).\nArchitecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **STARTED** /\n**COMPLETE_AND_ACCEPTED**; formal acceptance is claimed (`IMP-028C_ACCEPTED: YES`;\n`pendingAcceptance = NONE`). D-369 governs paid-modifier explicit intent. D-371 was unused at\nIMP-028C acceptance and is now binding for IMP-028D RC3.\n\nIMP-028D locked capability architecture is at\n[`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md).\nArchitecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **STARTED** /\n**COMPLETE** / `COMPLETE_AND_ACCEPTED`; formal acceptance is recorded\n(`IMP-028D_ACCEPTED: YES`; `acceptedThrough = IMP-028D`; `pendingAcceptance = NONE`;\n`currentProductSlice = NONE`). Founder UAT is **PASS** for the exact merged-main candidate\n`166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7` / tree\n`eba5f3f7fc25b07581801b53a130fb9547abc459`. GTM-R61 subsequently activates IMP-029 for\narchitecture work only; implementation remains not authorized and not started.\n\n## 5. Future GTM Slices\n\nRemaining numeric GTM range IMP-030 → IMP-040: **11** IMP numbers.\nAccepted inserted slices IMP-026C, IMP-028A, IMP-028B, IMP-028C, and IMP-028D remain in the\naccepted ledger and are not future identities.\n\nIMP-028A is the first Food Direct experience-programme capability. It was inserted after accepted\nIMP-028 and before planned GTM IMP-029. It does **not** consume or remap IMP-029 → IMP-040\nidentities. IMP-028A is now `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.\n\nIMP-028B is the second Food Direct experience-programme capability. It was inserted after accepted\nIMP-028A and before planned GTM IMP-029 using suffix convention. It does **not** consume or remap\nIMP-029 → IMP-040 identities. IMP-028B is `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.\n\nIMP-028C is the third Food Direct experience-programme capability. It was inserted after accepted\nIMP-028B and before planned GTM IMP-029 using the established suffix convention. It does **not**\nconsume or remap IMP-029 → IMP-040 identities and is `COMPLETE_AND_ACCEPTED`.\n\nIMP-028D is the fourth Food Direct experience-programme capability. It was inserted after accepted\nIMP-028C and before planned GTM IMP-029 using the established suffix convention. It does **not**\nconsume or remap IMP-029 → IMP-040 identities and is `COMPLETE_AND_ACCEPTED`.\n\n| IMP | Capability | Lifecycle |\n|---|---|---|\n| IMP-030 | Operations Console UI | IMPLEMENTATION_IN_PROGRESS |\n| IMP-031 | Provider-Neutral Delivery Foundation | PLANNED |\n| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |\n| IMP-033 | Notification Foundation | PLANNED |\n| IMP-034 | Meta WhatsApp Cloud API Adapter | PLANNED |\n| IMP-035 | Initial Administration Capabilities | PLANNED |\n| IMP-036 | Observability & Operational Controls | PLANNED |\n| IMP-037 | Backup, Restore & Migration Readiness | PLANNED |\n| IMP-038 | Security & Privacy Hardening | PLANNED |\n| IMP-039 | Production Infrastructure & Release Pipeline | PLANNED |\n| IMP-040 | Launch Validation & Cutover | PLANNED |\n\n### 5.0 IMP-028A — Food Direct UX Foundation (COMPLETE_AND_ACCEPTED)\n\n```text\nCapability: IMP-028A — Food Direct UX Foundation\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: ARCHITECTURE_LOCKED\nImplementation: AUTHORIZED / STARTED / COMPLETE\nIMP-028A_ARCHITECTURE_LOCKED: YES\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028A_IMPLEMENTATION_STARTED: YES\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\nIMP-028A_ACCEPTED: YES\nIMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP028A_FORMAL_ACCEPTANCE: ACCEPTED\nacceptedThrough at IMP-028A acceptance: IMP-028A\npendingAcceptance: NONE\ncurrentProductSlice: NONE\nnextProductSlice: IMP-029\nPlacement: after IMP-028, before IMP-029\nD371_CREATED: NO\nIMP029_RETARGETED: NO\n```\n\nLocked capability architecture:\n[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md).\n\nFounder-accepted supporting slice (rationale retained):\n[`experience/slices/food-direct-ux-foundation.md`](./experience/slices/food-direct-ux-foundation.md)\n(`FOUNDER_ACCEPTED`; `CANONICALIZED_AS = IMP-028A`; `INDEPENDENTLY_ACCEPTED`).\n\nIMP-028A is a customer-commerce **shell** over existing IMP-009 session and existing Menu / Cart /\nMy Orders destinations. It does **not** implement D-368 / D-369 / D-370, change commercial\nauthority, create schema/migrations, or retarget IMP-029. GTM-R37 records independent acceptance\n(`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`). Formal acceptance of IMP-028A does **not**\nauthorize or start IMP-029. GTM-R38 later activates IMP-028B as `currentProductSlice` without\nchanging IMP-028A acceptance.\n\n### 5.0B IMP-028B — Customer Menu Projection + Discovery (COMPLETE_AND_ACCEPTED)\n\n```text\nCapability: IMP-028B — Customer Menu Projection + Discovery\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: ARCHITECTURE_LOCKED\nImplementation: AUTHORIZED / STARTED / COMPLETE\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED: YES\nacceptedThrough: IMP-028B\npendingAcceptance: NONE\ncurrentProductSlice: NONE\nnextProductSlice: IMP-029\nPlacement: after IMP-028A, before IMP-029\nD371_CREATED: NO\nIMP029_RETARGETED: NO\n```\n\nCanonical capability:\n[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md).\n\nSupporting slice (rationale retained):\n[`experience/slices/customer-menu-projection-and-discovery.md`](./experience/slices/customer-menu-projection-and-discovery.md)\n(`SUPPORTING`; `CANONICALIZED_AS = IMP-028B`).\n\nIMP-028B is the first server-backed BOBA Direct customer Menu under D-368 / ARCH-G19. It projects\nexisting Menu/catalog/pricing authorities into the customer commerce surface and improves\ncategory-based discovery without becoming commercial truth. Architecture is locked and the\nimplementation is accepted. It did not implement D-369 / D-370, change commercial authority,\ncreate schema/migrations, or retarget IMP-029.\n\n### 5.1 IMP-026C — Pilot Customer-Commerce UX Hardening (COMPLETE_AND_ACCEPTED)\n\n```text\nCapability: IMP-026C — Pilot Customer-Commerce UX Hardening\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: LOCKED\nImplementation: AUTHORIZED / COMPLETE\nIMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP026C_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-026C_ACCEPTED: YES\nacceptedThrough: IMP-027\npendingAcceptance: IMP-028\nPlacement: after IMP-026, before IMP-027\n```\n\nLocked artifact:\n\n[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)\n\nArchitecture is presentation / client-state mapping / accessibility only. No new domain, API,\ndatabase, Payment, or Order authority. Implementation was **explicitly authorized** under GTM-R17\nand is **implementation-complete** under GTM-R18. Formal acceptance is recorded under GTM-R29.\nScope remains exactly the locked capability artifact.\n\nObjective: a first-time mobile customer can confidently complete the existing BOBA Direct ordering\njourney without assistance, using existing server/domain authority. Presentation hardening over\nexisting accepted/current commerce contracts. Core authority remains Cart → Checkout Snapshot →\nPayment → Order.\n\nPlanned in-scope:\n\n- early truthful delivery-area / Deliver To presentation;\n- reuse existing IMP-019 serviceability where applicable;\n- clear product/Add interactions;\n- existing quantity controls;\n- mobile sticky cart;\n- transparent authoritative checkout totals;\n- payment confirming / failed / indeterminate customer UX;\n- explicit don't-pay-again messaging while unresolved;\n- confirmation reassurance;\n- contextual customer support using public orderNumber;\n- mobile navigation polish;\n- accessibility improvements for transaction controls and dynamic payment state.\n\nExplicitly out of scope:\n\n- persisted delivery instructions;\n- new Checkout destination/snapshot field;\n- new API route;\n- new transport contract;\n- new DB field/table;\n- migration;\n- standalone pre-cart Serviceability API;\n- fake ETA;\n- delivery capacity;\n- Search implementation;\n- recommendation engine;\n- cross-sell engine;\n- new menu/catalog modifiers;\n- quantitative inventory;\n- PREPARING;\n- READY;\n- OUT_FOR_DELIVERY;\n- detailed kitchen fulfilment;\n- Refund;\n- self-service cancellation;\n- Operations Console;\n- Delivery implementation;\n- Notifications;\n- WhatsApp automation;\n- support-case domain;\n- loyalty;\n- favourites;\n- referrals;\n- personalization;\n- scheduled ordering;\n- analytics implementation.\n\nExisting Order lifecycle remains: PLACED → ACCEPTED → FULFILLED → CANCELLED.\n\nIMP-025 architecture remains **ARCHITECTURE_LOCKED**. Implementation is\n**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026\nimplementation is **COMPLETE_AND_ACCEPTED**. IMP-026C is\n`COMPLETE_AND_ACCEPTED` (architecture locked; implementation evidence\nCOMPLETE; independent review PASS; independent acceptance evidence ACCEPTED;\n`IMP-026C_ACCEPTED: YES`). IMP-027 is\n`COMPLETE_AND_ACCEPTED` under binding **D-364**.\n\n### 5.2 IMP-027 — Refund Foundation (COMPLETE_AND_ACCEPTED)\n\n```text\nCapability: IMP-027 — Refund Foundation\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: LOCKED\nImplementation: AUTHORIZED / COMPLETE\nIMP-027_ARCHITECTURE: LOCKED\nIMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-027_IMPLEMENTATION_AUTHORIZED: YES\nIMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP027_REFUND_FOUNDATION: ACCEPTED\nIMP027_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-027_ACCEPTED: YES\nacceptedThrough: IMP-027\nPlacement: after IMP-026C, before IMP-028\nBinding decision: D-364\n```\n\nLocked artifact:\n\n[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)\n\nGTM-R28 records Refund Foundation independently accepted and formally reconciled under the locked\narchitecture. Deterministic verification completed; independent focused tests 31/31 PASS; real\nPostgreSQL evidence proved the locked refund invariants and boundaries. Formal acceptance of\nIMP-027 **is** claimed.\nBinding payment truth: a Payment that reached BOBA success from provider `captured` remains\nsuccessful original collection even if the provider later reports a refund. Refund must not\nretroactively rewrite original collection truth. Scope remains exactly the locked capability\nartifact and **D-364** / ARCH-G15. Do not steal scope from IMP-028 Invoice / Tax Receipt /\nCredit Note or later capabilities. Do not change Refund architecture. GTM-R28 preserves IMP-028\nas unaccepted implementation-in-progress and does **not** activate IMP-029.\n\n### 5.3 IMP-028 — Invoice / Tax Receipt / Credit Note (COMPLETE_AND_ACCEPTED)\n\n```text\nCapability: IMP-028 — Invoice / Tax Receipt / Credit Note\nLifecycle: COMPLETE_AND_ACCEPTED\nArchitecture: LOCKED\nImplementation: AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE: LOCKED\nIMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE_LOCKED: YES\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028_IMPLEMENTATION_STARTED: YES\nIMP-028_IMPLEMENTATION_COMPLETE: YES\nIMP-028_ACCEPTED: YES\nacceptedThrough: IMP-028\npendingAcceptance: NONE\ncurrentProductSlice: NONE\nnextProductSlice: IMP-029\nIMP-029: PLANNED / NOT_STARTED\nIMP-029_IMPLEMENTATION_AUTHORIZED: NO\nIMP-029_STARTED: NO\nPlacement: after IMP-027, before IMP-029\nBinding decision: D-365; D-366; D-367\n```\n\nLocked artifact:\n\n[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)\n\nGTM-R30 records Invoice / Tax Receipt / Credit Note independently accepted and formally reconciled\nunder the locked architecture and binding **D-365** / **D-366** / **D-367**. Financial Document\nremains the sole immutable issued statutory/financial-document authority. RefundStatutoryDecision\ngoverns refund statutory reversal without rewriting Refund money truth. SignatureArtifact governs\nsigned statutory artifact readiness under the attended-async manual signed-PDF MVP. Architecture\nremains **LOCKED**. Implementation is **AUTHORIZED** and **COMPLETE**. Formal acceptance of IMP-028\n**is** claimed. This reconciliation does **not** authorize or start IMP-029. Production\nGST/accountant configuration gates remain unresolved deployment inputs, not open architecture\nquestions.\n\n## 6. Deferred / Unscheduled Capabilities\n\nStatus: `DEFERRED_UNSCHEDULED` — no IMP number assigned.\n\n- Customer self-service cancellation\n- Quantitative Inventory Reservation\n- Detailed Kitchen Fulfilment\n- Loyalty / Rewards\n- Multi-provider Payments\n- International Payments\n- EMI\n- BNPL\n- COD\n\nFuture possibility does not authorize present implementation.\n\n## 7. GTM Boundary\n\n```text\nPublic GTM boundary = IMP-040 — Launch Validation & Cutover\n```\n\nVision outcome definition remains in [`VISION.md`](./VISION.md). This roadmap is the only document\nthat maps that outcome onto the current numbered GTM boundary.\n\n### 7.1 Channel economics (planning requirement)\n\nStrategic channel model (does not change VISION-1):\n\n```text\nZomato / Swiggy\n= acquisition + convenience + volume\n\nBOBA Direct\n= owned relationship + retention + brand + direct-order economics\n```\n\nPrimary commercial objective for BOBA Direct: profitable repeat direct orders, not maximum\ndirect-order volume.\n\n### 7.2 GTM commercial-control measurement\n\nThis is a GTM planning / launch requirement. It is **not** authorization to implement analytics\ninfrastructure now. No speculative financial values are canonical.\n\nBefore and during the controlled GTM pilot, BOBA Direct must be able to measure:\n\nAcquisition / attribution: traffic source; campaign/source where available.\n\nCommerce funnel: order entry / menu engagement; product interaction; add to cart; cart; checkout;\npayment started; payment verified; order confirmed; delivered.\n\nCommerce metrics: conversion; AOV; items per order; bundle / cross-sell attachment where applicable.\n\nCustomer / retention: new vs repeat; 30-day repeat; orders per customer; reorder behaviour when\ncapability exists.\n\nOperational: payment failure; rejection; refund; fulfilment; support incidence.\n\nEconomics: direct contribution per order; comparable marketplace contribution; BOBA Direct vs\nZomato / Swiggy economics.\n\nConceptual direct contribution model (no hardcoded financial values):\n\n```text\ncustomer revenue\n- food cost\n- packaging\n- discounts\n- payment fees\n- delivery cost\n- refund/support cost\n- variable technology cost\n```\n\n### 7.3 Controlled pilot governance\n\nPublic scaling of BOBA Direct should be evidence-led. The controlled pilot should eventually have\nentry criteria, success criteria, hold criteria, rollback criteria, commercial measurement, and\noperational measurement.\n\nNumeric thresholds such as `100 fulfilled orders` / `4 weeks` remain `PROPOSED_ONLY` /\n`NOT_CANONICAL` until explicitly approved. Do not invent operational SLA numbers; SLAs must come\nfrom actual BOBA operating decisions.\n\n### 7.4 Customer UX strategy inputs\n\nPilot-minimum customer-commerce UX hardening is formally mapped to **IMP-026C**\n(`ARCHITECTURE_LOCKED` / `COMPLETE_AND_ACCEPTED`). Broader strategy inputs\nsuch as search, categories, Bestsellers, Fresh Drops, and recommendation/cross-sell remain\n`PRODUCT_STRATEGY_INPUTS` / `NOT_IMPLEMENTATION_AUTHORIZATION` unless a later roadmap entry\nassigns them. IMP-026C does not reopen accepted IMP-025 and is not assigned to IMP-027. IMP-026C\nis independently and formally accepted as a supplemental inserted gate (`IMP-026C_ACCEPTED: YES`).\n`acceptedThrough` is IMP-028D. `pendingAcceptance` is NONE. IMP-027 architecture was locked\nby GTM-R20. GTM-R21 authorized IMP-027 implementation under that lock. GTM-R28 records IMP-027\n`COMPLETE_AND_ACCEPTED`. GTM-R30 records IMP-028 `COMPLETE_AND_ACCEPTED`. GTM-R31 records **D-368**\nwithout activating IMP-029. GTM-R32 records **D-369** without activating IMP-029. GTM-R33 records\n**D-370** without activating IMP-029. GTM-R34 records **IMP-028A** Food Direct UX Foundation as\n`currentProductSlice` without authorizing implementation or retargeting IMP-029. GTM-R35 records\nIMP-028A `ARCHITECTURE_LOCKED` and `IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED` without starting\nproduct implementation or retargeting IMP-029. GTM-R36 records IMP-028A\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` without accepting IMP-028A or retargeting IMP-029.\nGTM-R37 records IMP-028A `COMPLETE_AND_ACCEPTED` without authorizing or starting IMP-029.\nGTM-R38 records **IMP-028B** Customer Menu Projection + Discovery as `currentProductSlice`\n(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`) without locking\narchitecture, authorizing implementation, or retargeting IMP-029. GTM-R39 records IMP-028B\n`ARCHITECTURE_LOCKED` and `IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED` without starting\nproduct implementation or retargeting IMP-029.\nIMP-029 remains\n`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`.\n\n## 8. Historical Roadmap Notice\n\n[`implementation-roadmap.md`](./implementation-roadmap.md) is **SUPERSEDED** historical roadmap\nversion **GTM-R1**. It must not be used for current implementation sequencing.\n\nHistorical GTM-R1 meanings that are **not** current:\n\n| Historical GTM-R1 ID | Historical meaning (do not use) | Current GTM-R2/R3 meaning |\n|---|---|---|\n| IMP-021 | Cashfree payment adapter | Checkout |\n| IMP-022 | Payment webhooks and verification | Payment |\n| IMP-023 | Refund foundation | Order |\n| IMP-024 | Order lifecycle and Operations Console API | Customer Ordering Transport / API |\n| IMP-035 | Launch validation and cutover | Initial Administration Capabilities |\n\nCurrent public GTM boundary is **IMP-040**, not IMP-035.\n\n## 9. Roadmap Change Log\n\n### GTM-R71 — 2026-08-27\n\n- **CANONICAL_CONSISTENCY_ONLY** repair. Reconciles stale present-tense IMP-030 lifecycle /\n  current-slice prose with the already-established GTM-R70 / STATE-R68 authoritative state.\n- Corrects ROADMAP §4 live current-product-slice prose that still described architecture-only /\n  not-locked / not-authorized / not-started status, and corrects the stale\n  `Next product slice: IMP-030` line while `currentProductSlice = IMP-030` and\n  `nextProductSlice = IMP-031`.\n- Reconciles STATE §5 Acceptance Position stale lifecycle prose that still asserted\n  `ARCHITECTURE_IN_PROGRESS` / `NOT_LOCKED` / `NOT_AUTHORIZED` / `NOT_STARTED`.\n- Hardens `project:consistency` so the same live ROADMAP §4 / STATE §5 contradiction class is\n  detectable without treating historical GTM-R66 / STATE-R64 records as current prose.\n- Does **not** create a lifecycle advance, architecture change, implementation authorization or\n  start event, completion decision, acceptance decision, IMP-031 activation, D-372 change, or\n  D-373 creation. IMP-030 remains `IMPLEMENTATION_IN_PROGRESS` / `LOCKED` / `AUTHORIZED` /\n  `STARTED`; `acceptedThrough` remains IMP-029; IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.\n  ARCH-R17 and DR-14 remain unchanged.\n- Supersedes GTM-R70 for the current consistency position only.\n\n### GTM-R70 — 2026-08-27\n\n- Records a capability-local **detail route architecture amendment** for **IMP-030 — Operations\n  Console UI** while implementation remains `AUTHORIZED` / `STARTED` /\n  `IMPLEMENTATION_IN_PROGRESS` under the locked capability architecture at\n  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\n- During implementation, the prior pretty dynamic UI route\n  `/workforce/operations/orders/{orderId}/` proved incompatible with binding static export\n  (`output: \"export\"`, `trailingSlash: true`). The amended architecture uses the fixed static detail\n  shell `/workforce/operations/orders/detail/` with `orderId` carried via query parameter. The\n  Operations API surface, static-export topology, D-372, ARCH-R17, and DR-14 remain unchanged; D-373\n  is not created.\n- Prior read-only list implementation remains valid. No product source is included in this governance\n  transition. Architecture remains `ARCHITECTURE_LOCKED`; implementation is not completed or\n  accepted. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.\n- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.\n- Supersedes GTM-R69 for the current lifecycle position.\n\n### GTM-R69 — 2026-08-26\n\n- Records implementation **START** for **IMP-030 — Operations Console UI** under prior GTM-R68\n  authorization and the locked capability architecture at\n  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\n  Architecture remains `ARCHITECTURE_LOCKED`; D-372 remains binding and CURRENT; ARCH-R17 and DR-14\n  remain unchanged; D-373 is not created.\n- IMP-030 implementation becomes `AUTHORIZED` / `STARTED` / `IMPLEMENTATION_IN_PROGRESS`; start does\n  not complete or accept implementation. No product source, runtime, schema, migration, or deployment\n  mutation is introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.\n- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.\n- Supersedes GTM-R68 for the current lifecycle position.\n\n### GTM-R68 — 2026-08-26\n\n- Records explicit implementation authorization for **IMP-030 — Operations Console UI** under the\n  locked capability architecture at\n  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\n  D-372 remains binding and CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is not created.\n- IMP-030 implementation becomes `AUTHORIZED` / `NOT_STARTED`; authorization does not start\n  implementation. No product source, runtime, schema, migration, or deployment mutation is\n  introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.\n- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.\n- Supersedes GTM-R67 for the current lifecycle position.\n\n### GTM-R67 — 2026-08-26\n\n- Locks the capability architecture for **IMP-030 — Operations Console UI** at\n  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\n  D-372 remains binding and CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is not created.\n- IMP-030 implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`; no runtime, product, schema, or\n  deployment mutation is introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.\n- Supersedes GTM-R66 for the current product-slice architecture position.\n\n### GTM-R66 — 2026-08-26\n\n- Records explicit Founder authorization to activate **IMP-030 — Operations Console UI** for\n  architecture work only. IMP-030 becomes `currentProductSlice` and its lifecycle becomes\n  `ARCHITECTURE_IN_PROGRESS`; architecture remains `NOT_LOCKED` and implementation remains\n  `NOT_AUTHORIZED` / `NOT_STARTED`.\n- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`; `nextProductSlice` becomes\n  IMP-031, which remains `PLANNED` / `NOT_ACTIVATED`.\n- No capability architecture artifact is created, no D-373 is created, and ARCH-R17, DR-14, and\n  D-372 remain unchanged. No runtime, schema, migration, product, or deployment mutation is\n  introduced.\n- Supersedes GTM-R65 for the current product-slice position.\n\n### GTM-R65 — 2026-08-26\n\n- Records formal acceptance of **IMP-029 — Operations Console API** for independently accepted\n  `main` SHA `0490a393666a87f5f99cc6d90c99bef18d09c097` and tree\n  `4d376d296bd8596c4809fc91331659a2f52e53e6`. Implementation evidence is **COMPLETE**;\n  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**.\n- IMP-029 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains\n  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-029_IMPLEMENTATION_COMPLETE: YES`; `IMP-029_ACCEPTED: YES`). D-372 remains CURRENT.\n- Advances `acceptedThrough = IMP-029`; sets `currentProductSlice = NONE`; preserves\n  `pendingAcceptance = NONE` and `nextProductSlice = IMP-030`. IMP-030 remains `PLANNED` /\n  `NOT_STARTED` / `NOT_AUTHORIZED`.\n- This reconciliation introduces no runtime, schema, migration, or deployment mutation. Remote\n  Operations deployment is not claimed. ARCH-R17 and DR-14 remain unchanged.\n- Supersedes GTM-R64 for the current IMP-029 lifecycle and acceptance position.\n\n### GTM-R64 — 2026-08-24\n\n- Records **IMP-029 — Operations Console API** implementation **STARTED** under prior GTM-R63\n  authorization and its locked capability architecture\n  ([`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)).\n- IMP-029 lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `STARTED`\n  (`IMP-029_ARCHITECTURE_LOCKED: YES`; `IMP-029_IMPLEMENTATION_AUTHORIZED: YES`;\n  `IMP-029_STARTED: YES`; `IMP-029_IMPLEMENTATION_COMPLETE: NO`; `IMP-029_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `currentProductSlice`\n  remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains `PLANNED` /\n  `NOT_ACTIVATED`.\n- This governance transition records implementation start only. It introduces no product code, no\n  runtime route, no schema change, no migration, no deployment, and no IMP-030 activation.\n- Decision register remains DR-14. Global architecture remains ARCH-R17. D-372 remains CURRENT.\n- Supersedes GTM-R63 for the current IMP-029 lifecycle position. Product acceptance through\n  IMP-028D is unchanged.\n\n### GTM-R63 — 2026-08-24\n\n- Records explicit Founder authorization for **IMP-029 — Operations Console API** implementation\n  under its locked capability architecture\n  ([`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)).\n- IMP-029 lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `NOT_STARTED`\n  (`IMP-029_ARCHITECTURE_LOCKED: YES`; `IMP-029_IMPLEMENTATION_AUTHORIZED: YES`;\n  `IMP-029_STARTED: NO`; `IMP-029_IMPLEMENTATION_COMPLETE: NO`; `IMP-029_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `currentProductSlice`\n  remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains `PLANNED` /\n  `NOT_ACTIVATED`.\n- Authorization does **not** start implementation. No product source, product tests, runtime,\n  schema, migration, permission catalog, configuration, deployment, decision-register, or global\n  architecture change is recorded.\n- Decision register remains DR-14. Global architecture remains ARCH-R17. D-372 remains CURRENT.\n- Supersedes GTM-R62 for the current IMP-029 lifecycle position. Product acceptance through\n  IMP-028D is unchanged.\n\n### GTM-R62 — 2026-08-24\n\n- Locks the approved capability architecture for **IMP-029 — Operations Console API** at\n  [`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md).\n- IMP-029 lifecycle becomes `ARCHITECTURE_LOCKED`; implementation remains `NOT_AUTHORIZED` /\n  `NOT_STARTED` (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Registers binding **D-372** and advances global architecture to **ARCH-R17** and the decision\n  register to **DR-14**. D-372 establishes the dedicated `/api/operations/v1/*` workforce business\n  transport, backed by the existing trusted workforce-session authority and existing Order authority.\n- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE;\n  `currentProductSlice` remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains\n  `PLANNED` / `NOT_ACTIVATED`.\n- Does **not** authorize or start implementation, create runtime/container/router code, alter\n  Nginx, Compose, cookies, permissions, schemas, migrations, Refund/Financial Document workforce\n  transport, or activate IMP-030.\n\n### GTM-R61 — 2026-08-22\n\n- Records explicit Founder authorization and canonical activation of **IMP-029 — Operations Console\n  API** as `currentProductSlice` for architecture work only.\n- IMP-029 lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`; implementation\n  is `NOT_AUTHORIZED` / `NOT_STARTED`.\n- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `nextProductSlice` becomes\n  IMP-030 — Operations Console UI.\n- Does **not** lock IMP-029 architecture, authorize or start IMP-029 implementation, create D-372,\n  modify ARCH-R16 or DR-13, implement Operations Console API or UI, implement delivery or\n  notifications, activate IMP-030, change `acceptedThrough`, or create pending acceptance.\n\n### GTM-R60 — 2026-08-22\n\n- Records formal acceptance of **IMP-028D — Desktop Ordering Continuity** after Founder UAT\n  **PASS** for the exact merged-main candidate\n  `166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7` / tree\n  `eba5f3f7fc25b07581801b53a130fb9547abc459`.\n- IMP-028D lifecycle becomes `COMPLETE_AND_ACCEPTED`; architecture remains\n  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`.\n- Advances `acceptedThrough = IMP-028D`; sets `currentProductSlice = NONE` and\n  `pendingAcceptance = NONE`; `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. This reconciliation does not\n  authorize or start IMP-029.\n- D-368 / D-369 / D-370 / D-371 remain unchanged and binding. Global architecture remains\n  ARCH-R16 and the decision register remains DR-13.\n- This reconciliation introduces no runtime, schema, migration, or product mutation.\n\n### GTM-R59 — 2026-08-21\n\n- Registers D-371 Durable Cart Unit Sequence Authority and the bounded IMP-028D RC3 contract\n  amendment. It authorizes future durable internal per-unit Cart ordering, a forward-only migration,\n  and the minimum existing customer-commerce product-level decrement command/transport only.\n- RC3 implementation is **NOT_STARTED**. This governance decision does not alter the recorded RC1\n  implementation-complete-pending-acceptance evidence, accept IMP-028D, claim Founder UAT, start\n  IMP-029, or change pricing, Checkout, Payment, Order, Refund, auth, catalog, modifier semantics,\n  or topology.\n- Decision register becomes DR-13; global architecture becomes ARCH-R16 / ARCH-G22; next decision\n  ID is D-372. Supersedes GTM-R58 only for current decision/architecture references.\n\n### GTM-R58 — 2026-08-21\n\n- Records IMP-028D RC1 implementation completion and promotion evidence: visual review PASS;\n  feature commit `2a48e16fabc4b1fe9e86d23c6a3aad6d726b7e6e`; exact-SHA CI run `32458495599` SUCCESS;\n  GitHub PR #3; and merge commit `c4d262b78f3a7f65808155634cc2745236c38b7c` on `main`.\n- Lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains\n  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` becomes IMP-028D; and `nextProductSlice` remains IMP-029. Founder UAT is\n  required and PENDING / NOT RUN. No UAT build, deployment, Founder UAT result, or acceptance is\n  claimed.\n- Preserves prior Founder UAT FAIL, technical pre-UAT blocker, and RC1 amendment history. Does not\n  authorize or start IMP-029, create D-371, or alter global architecture, decision authority,\n  runtime topology, API, schema, migration, or pricing authority.\n- Supersedes GTM-R57 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R57 — 2026-08-21\n\n- Records founder approval and capability-local re-lock of the IMP-028D RC1 interaction\n  architecture. The previous all-root-category sections and `IntersectionObserver` scroll-spy model\n  is superseded for IMP-028D by explicit selected-category state; the bounded desktop Cart item list\n  is the sole authorized nested vertical scroll region.\n- Reopens implementation as `IMPLEMENTATION_IN_PROGRESS`; architecture remains\n  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` with\n  `IMP-028D_IMPLEMENTATION_COMPLETE: NO` and `IMP-028D_ACCEPTED: NO`.\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. Founder UAT for RC1 is\n  PENDING / NOT RUN and visual review must precede implementation completion.\n- Preserves prior implementation, technical-preview, and Founder UAT failure evidence. Does not\n  authorize or start IMP-029, create D-371, or alter global architecture, decision authority,\n  runtime topology, API, schema, migration, or pricing authority.\n- Supersedes GTM-R56 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R56 — 2026-08-21\n\n- Records completion of the bounded IMP-028D `IntersectionObserver` root-margin correction:\n  `-7rem 0px -55% 0px` is now the browser-valid `-112px 0px -55% 0px`, preserving the intended\n  7rem sticky-header offset at the standard 16px root size. Regression test and deterministic\n  validation pass; source implementation commit is `259d27d`.\n- Lifecycle returns to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains\n  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` becomes IMP-028D; `nextProductSlice` remains IMP-029. Founder UAT remains\n  PENDING; no acceptance is claimed.\n- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,\n  migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R55 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R55 — 2026-08-21\n\n- Reopens IMP-028D for an authorized, bounded technical correction after the UAT deployment at\n  `365019e0e64e2d855298c714d3c65671183303b1` reached healthy APIs but browser rendering failed\n  before freeze. The browser rejected `IntersectionObserver` `rootMargin: \"-7rem 0px -55% 0px\"`;\n  Founder UAT did not occur and this is not a Founder UAT failure.\n- Lifecycle returns to `IMPLEMENTATION_IN_PROGRESS`; architecture remains `ARCHITECTURE_LOCKED`;\n  implementation remains `AUTHORIZED` / `STARTED` with\n  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`.\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. No acceptance is claimed.\n- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,\n  migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R54 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R54 — 2026-08-21\n\n- Records the final customer-copy correction in the completed IMP-028D rework: delivery-PIN result\n  copy no longer exposes checkout implementation wording. The exact updated rework tip was\n  revalidated before the next UAT candidate is built.\n- Current lifecycle remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with\n  `pendingAcceptance = IMP-028D`; the prior UAT FAIL remains preserved and the new Founder UAT is\n  still PENDING. No acceptance is claimed.\n- Supersedes GTM-R53 for the current IMP-028D implementation evidence only; product acceptance\n  through IMP-028C, IMP-029 status, and D-371 remain unchanged.\n\n### GTM-R53 — 2026-08-21\n\n- Records deterministic completion of the bounded IMP-028D Founder-UAT rework. Lifecycle returns\n  to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains\n  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`). The recorded Founder UAT\n  FAIL remains preserved; a new Founder UAT is required and PENDING.\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` becomes IMP-028D; `nextProductSlice` remains IMP-029. No acceptance is\n  claimed.\n- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,\n  migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R52 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R52 — 2026-08-21\n\n- Records the required founder UAT result for IMP-028D as **FAIL** against the frozen candidate\n  `38fa04db9d81e47efeb0702037a0e7ee9371a28d` / tree\n  `c91e51150461251470791f830293e49931f91cfa` (UAT project\n  `boba-bear-imp028d-uat`, URL `http://127.0.0.1:18084`, freeze\n  `2026-08-20T18:38:17Z`). The failure reopens the existing implementation for bounded rework;\n  it is not a new capability or acceptance.\n- IMP-028D lifecycle returns to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains\n  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` with\n  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`.\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. A new founder UAT is\n  required after deterministic rework validation and a newly frozen exact candidate.\n- Does not accept IMP-028D, authorize or start IMP-029, create D-371, or alter runtime topology,\n  API, schema, migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R51 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R51 — 2026-08-20\n\n- IMP-028D — Desktop Ordering Continuity implementation is complete and awaits independent\n  acceptance and required founder UAT. Lifecycle is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`;\n  architecture remains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` /\n  `COMPLETE` (implementation authorization and start were recorded; this historical completion was\n  superseded by the founder-UAT rework in GTM-R52; `IMP-028D_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` becomes IMP-028D; and `nextProductSlice` remains IMP-029. Founder UAT is\n  required and pending; no founder-UAT result or formal acceptance is claimed.\n- Records technical evidence for implementation commit `795bb3151e3a24d5914160d232f099016d880a2b`,\n  reconciled CI candidate `499e9249e3c46d76e382c8c91740b49253b54a19`, GitHub PR #1, CI run\n  `32395774250` (SUCCESS), and merge commit `ba1b0864fe39aefe3b20b0da1c2c039eff020998`.\n- Does not accept IMP-028D, authorize or start IMP-029, create D-371, or alter runtime topology,\n  API, schema, migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R50 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R50 — 2026-08-20\n\n- Explicit founder/task authorization to implement **IMP-028D — Desktop Ordering Continuity** under\n  the locked capability architecture\n  ([`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md)).\n- IMP-028D lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `STARTED`\n  (`IMP-028D_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028D_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n  `pendingAcceptance` remains NONE; `nextProductSlice` remains IMP-029.\n- Does not mark IMP-028D complete or accepted, authorize or start IMP-029, create D-371, or alter\n  runtime topology, API, schema, migration, pricing authority, decision register, or global\n  architecture.\n- Supersedes GTM-R49 for the current IMP-028D lifecycle position. Product acceptance through\n  IMP-028C is unchanged.\n\n### GTM-R49 — 2026-08-20\n\n- Allocates and activates **IMP-028D — Desktop Ordering Continuity** after accepted IMP-028C and\n  before reserved IMP-029. The locked capability architecture is\n  [`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md).\n- IMP-028D lifecycle = `ARCHITECTURE_LOCKED`. Implementation remains **NOT_AUTHORIZED** /\n  **NOT_STARTED** (`IMP-028D_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028D_IMPLEMENTATION_STARTED: NO`;\n  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`).\n- `acceptedThrough` remains IMP-028C; `currentProductSlice` becomes IMP-028D;\n  `pendingAcceptance` remains NONE; `nextProductSlice` remains IMP-029.\n- This activation reuses D-368 Customer Menu projection, D-369 paid-modifier intent, D-370 Cart\n  identity-transition policy, existing Cart authority, and Checkout Snapshot final payable\n  authority. It creates no decision: D-371 remains unused.\n- Does not authorize or start IMP-028D implementation, authorize or start IMP-029, alter runtime,\n  API, schema, migration, pricing authority, decision register, or global architecture.\n- Supersedes GTM-R48 for the current product-slice position. Product acceptance through IMP-028C is\n  unchanged.\n\n### GTM-R48 — 2026-08-20\n\n- Records formal acceptance of **IMP-028C — Food Customization** after founder UAT PASS for the\n  frozen product candidate recorded in\n  [`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md).\n- IMP-028C lifecycle = `COMPLETE_AND_ACCEPTED`; architecture remains `ARCHITECTURE_LOCKED` and\n  implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028C_IMPLEMENTATION_COMPLETE: YES`; `IMP-028C_ACCEPTED: YES`).\n- Advances `acceptedThrough = IMP-028C`; sets `currentProductSlice = NONE` and\n  `pendingAcceptance = NONE`. `nextProductSlice` remains IMP-029, planned, not started, and not\n  implementation-authorized.\n- Does not authorize or start IMP-029, change D-368 / D-369 / D-370, create D-371, alter runtime,\n  schema, migration, catalog content, the decision register, or global architecture.\n- Supersedes GTM-R47 for the current IMP-028C lifecycle position.\n\n### GTM-R47 — 2026-08-20\n\n- Records **IMP-028C — Food Customization** implementation **COMPLETE** under prior GTM-R44/GTM-R45\n  authorization and the locked capability architecture\n  ([`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md))\n  after independent technical acceptance of all implementation slices, including Slice 4 canonical\n  modifier content readiness.\n- IMP-028C lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028C_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028C is **not** claimed.\n- Sets `pendingAcceptance = IMP-028C`. `acceptedThrough` remains IMP-028B. `currentProductSlice`\n  remains IMP-028C. `nextProductSlice` remains IMP-029.\n- Founder UAT, exact-candidate deployment, and final canonical acceptance remain **pending** /\n  **not started**. This reconciliation does not deploy, run founder UAT, or advance\n  `acceptedThrough`.\n- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Does not change product scope, AC01–AC14, D-368 / D-369 / D-370, runtime, schema, migration,\n  catalog content, the decision register, or global architecture. D-371 remains unused.\n- Supersedes GTM-R46 for the current IMP-028C lifecycle position. Product acceptance through\n  IMP-028B is unchanged.\n\n### GTM-R46 — 2026-08-19\n\n- Records the IMP-028C business/domain model and remaining implementation-plan lock in its existing\n  capability architecture. Reusable Catalog Modifier Groups, Variant ↔ Modifier Group bindings,\n  bundle composition, component modifier inheritance, normal modifier pricing, D-368 projection,\n  configured-line identity, and D-369 remain the sufficient existing authorities.\n- Locks `COMBO_MEMBERSHIP_CHANGES_MODIFIER_PRICE = NO`; bundle/package discount and bundle-option\n  adjustments remain separate from modifier deltas. Combo-context modifier overrides are non-goal /\n  deferred and require future architecture/governance review if requested.\n- Records Slice 1 and Slice 2 as `TECHNICALLY_ACCEPTED`, and locks remaining Slice 3 (configured\n  Cart presentation + edit configuration) and Slice 4 (canonical modifier content readiness for\n  founder UAT). IMP-028C remains `IMPLEMENTATION_IN_PROGRESS`, incomplete, and unaccepted.\n- Does not alter AC01–AC14, lifecycle, acceptance position, D-368 / D-369 / D-370, D-371, runtime,\n  schema, migration, catalog content, decision register, or global architecture. IMP-029 remains\n  planned, not started, and unauthorized.\n\n### GTM-R45 — 2026-08-19\n\n- Records **IMP-028C — Food Customization** implementation **STARTED** under prior GTM-R44\n  authorization and its locked capability architecture\n  ([`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)).\n- IMP-028C lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED`\n  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028C_IMPLEMENTATION_COMPLETE: NO`; `IMP-028C_ACCEPTED: NO`).\n- Preserves `acceptedThrough = IMP-028B`, `pendingAcceptance = NONE`, `currentProductSlice =\n  IMP-028C`, and `nextProductSlice = IMP-029`. IMP-029 remains `PLANNED / NOT_STARTED /\n  NOT_AUTHORIZED`.\n- Does not change product scope, AC01–AC14, the architecture lock, D-368 / D-369 / D-370,\n  D-371, runtime, schema, migration, catalog content, the decision register, or global architecture.\n  No implementation is recorded by this lifecycle transition.\n- Supersedes GTM-R44 for the current IMP-028C lifecycle position. Product acceptance through\n  IMP-028B is unchanged.\n\n### GTM-R44 — 2026-08-19\n\n- Canonically assigns **IMP-028C — Food Customization** as the active Food Direct product slice.\n  Its capability-local architecture is `ARCHITECTURE_LOCKED`; implementation is authorized but\n  `NOT_STARTED` (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; started/complete/accepted: NO).\n- Preserves `acceptedThrough = IMP-028B`, `pendingAcceptance = NONE`, and `nextProductSlice =\n  IMP-029`. IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`.\n- Binds D-369 as mandatory: a positive-price catalog default cannot silently create configured Cart\n  intent. D-368 remains the Customer Menu discovery authority; D-370 policy remains out of scope.\n- Records the canonical-content founder-UAT stop gate. No runtime, schema, migration, catalog-data,\n  decision-register, or global-architecture change; D-371 remains unused.\n\n### GTM-R43 — 2026-08-19\n\n- Reconciles stale present-tense IMP-028B lifecycle assertions with the already-settled GTM-R42\n  acceptance record. This is a consistency repair, not a new acceptance decision.\n- Current IMP-028B lifecycle remains `COMPLETE_AND_ACCEPTED` (`IMP-028B_ACCEPTED: YES`;\n  `acceptedThrough = IMP-028B`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`).\n- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`; D-368 / D-369 / D-370 remain CURRENT\n  and D-371 remains unused. No IMP-028C activity is authorized or recorded.\n\n### GTM-R42 — 2026-08-19\n\n- Records IMP-028B — Customer Menu Projection + Discovery `COMPLETE_AND_ACCEPTED` after the\n  already-passing independent technical acceptance and founder UAT PASS for the exact accepted\n  candidate: repository `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD\n  `ddca0c319a5e80b2cfe38a2c32481b636277010e`; working-tree fingerprint\n  `1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7`.\n- IMP-028B architecture remains `ARCHITECTURE_LOCKED`. Implementation remains `AUTHORIZED` /\n  `STARTED` / `COMPLETE`; formal acceptance is recorded (`IMP-028B_ACCEPTED: YES`).\n- Advances `acceptedThrough = IMP-028B`; clears `pendingAcceptance = NONE`; sets\n  `currentProductSlice = NONE`; and preserves `nextProductSlice = IMP-029` as planning metadata only.\n- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`. This reconciliation does not activate,\n  rename, reinterpret, or start IMP-029; it does not implement D-369 / D-370 or create D-371.\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**. Supersedes GTM-R41 for the current IMP-028B lifecycle position.\n\n### GTM-R41 — 2026-08-19\n\n- Records IMP-028B — Customer Menu Projection + Discovery implementation **COMPLETE** under prior\n  GTM-R39/GTM-R40 authorization and the locked capability architecture\n  ([`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)).\n- IMP-028B lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028B_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028B is **not** claimed.\n- Sets `pendingAcceptance = IMP-028B`. `acceptedThrough` remains IMP-028A. `currentProductSlice`\n  remains IMP-028B. `nextProductSlice` remains IMP-029.\n- Product implementation delivers `GET /api/v1/menu`, `CustomerMenuProjection`, runtime `/order`\n  consumption of the server-backed Menu projection, and category discovery without D-369 / D-370 /\n  schema changes / `D-371`.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**.\n- Supersedes GTM-R40 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is\n  unchanged.\n\n### GTM-R40 — 2026-08-19\n\n- Records IMP-028B — Customer Menu Projection + Discovery implementation **STARTED** under prior\n  GTM-R39 authorization and the locked capability architecture.\n- IMP-028B lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `STARTED`\n  (`IMP-028B_IMPLEMENTATION_STARTED: YES`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`).\n- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`\n  remains IMP-028B.\n- Supersedes GTM-R39 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is\n  unchanged.\n\n### GTM-R39 — 2026-08-19\n\n- Explicit founder authorization to begin IMP-028B — Customer Menu Projection + Discovery\n  implementation under the locked capability architecture\n  ([`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)).\n- Locks IMP-028B capability-local architecture from already-approved authority (canonical IMP-028B\n  AC-01–AC-12; D-368 / ARCH-G19; D-356 / D-359 / D-360; existing IMP-012–015 / IMP-020–021 /\n  IMP-024 / IMP-025 / IMP-026C / IMP-028A). No new global architecture. No `D-371`.\n- Locks implementation details allowed by D-368: `GET /api/v1/menu`; application-layer read\n  composition; `CustomerMenuProjection` DTO; Brand-baseline display price when outlet context is\n  absent; omit availability without authoritative outlet context; `/order` runtime consumes the\n  server projection.\n- IMP-028B lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture = `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `NOT_STARTED`\n  (`IMP-028B_ARCHITECTURE_LOCKED: YES`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;\n  `IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;\n  `IMP-028B_ACCEPTED: NO`).\n- Scope remains exactly Capability B. Do not implement D-369 / D-370, expand to Food Direct\n  families C–J, change commercial authority, or retarget IMP-029.\n- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`\n  remains IMP-028B. `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Authorization does **not** auto-start product implementation. No product source, product tests,\n  schema, or migration changes in this authorization.\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**.\n- Supersedes GTM-R38 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is\n  unchanged.\n\n### GTM-R38 — 2026-08-19\n\n- Canonical activation of **IMP-028B — Customer Menu Projection + Discovery** as the second Food\n  Direct experience-programme capability.\n- Inserted IMP identity `IMP-028B` after accepted IMP-028A and before planned IMP-029. IMP-029 →\n  IMP-040 identities and meanings are unchanged. IMP-029 is **not** retargeted.\n- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`\n  advances to IMP-028B. `nextProductSlice` remains IMP-029.\n- IMP-028B lifecycle is `PLANNED`. Architecture is `NOT_LOCKED`. Implementation is\n  **NOT_AUTHORIZED** / **NOT_STARTED** (`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`;\n  `IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;\n  `IMP-028B_ACCEPTED: NO`).\n- Reviewed supporting slice\n  `docs/platform/experience/slices/customer-menu-projection-and-discovery.md` is retained as\n  `SUPPORTING` / `CANONICALIZED_AS = IMP-028B`. Canonical product authority is\n  `docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md`.\n- Preserves D-368 / ARCH-G19. D-369 / D-370 remain CURRENT and unimplemented. `D-371` is unused.\n  Decision register remains DR-12. Global architecture remains ARCH-R15.\n- Food Direct families C–J are **not** activated.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Does **not** lock architecture, authorize implementation, implement Capability B, or change\n  product source.\n- Supersedes GTM-R37 for current product-slice position. Product acceptance through IMP-028A is\n  unchanged.\n\n### GTM-R37 — 2026-08-19\n\n- Independent acceptance of IMP-028A — Food Direct UX Foundation\n  (`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`).\n- Records Food Direct UX Foundation acceptance evidence under the locked capability architecture\n  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).\n  AC-01 through AC-12 remain PASS. Known limitations remain truthful:\n  `TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED`;\n  `CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT`;\n  `CUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT = YES`;\n  `RELEVANT_REGRESSION_TESTS = PASS_WITH_ENVIRONMENT_LIMITATION`.\n- Sets `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;\n  `nextProductSlice = IMP-029`.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized by\n  this reconciliation (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Does **not** implement D-368 / D-369 / D-370, create `D-371`, retarget IMP-029, or activate\n  Food Direct families B–F / Capability B.\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**.\n- Supersedes GTM-R36 for current accepted position.\n\n### GTM-R36 — 2026-08-19\n\n- Records IMP-028A — Food Direct UX Foundation implementation **STARTED** and **COMPLETE** under\n  prior GTM-R35 authorization and the locked capability architecture\n  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).\n- IMP-028A lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`\n  (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028A_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028A is **not** claimed.\n- Sets `pendingAcceptance = IMP-028A`. `acceptedThrough` remains IMP-028.\n  `currentProductSlice` remains IMP-028A. `nextProductSlice` remains IMP-029.\n- Scope remains exactly Capability A (session-aware chrome, terminology, Direct-accurate copy,\n  responsive/accessible shell). Does **not** implement D-368 / D-369 / D-370, create `D-371`,\n  retarget IMP-029, or activate Food Direct families B–F.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**.\n- Supersedes GTM-R35 for current IMP-028A lifecycle position. Product acceptance through IMP-028 is\n  unchanged.\n\n### GTM-R35 — 2026-08-19\n\n- Explicit founder authorization to begin IMP-028A — Food Direct UX Foundation implementation under\n  the locked capability architecture\n  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).\n- Locks IMP-028A capability-local architecture from already-approved authority (canonical IMP-028A\n  scope; founder-accepted supporting slice; founder-accepted Food Direct product-architecture\n  planning lock; ARCH-R15; D-356 / D-359 / D-360; D-368 / D-369 / D-370 as unimplemented\n  boundaries; existing IMP-009 / IMP-020 / IMP-023 / IMP-024 / IMP-025 / IMP-026C). No new global\n  architecture. No `D-371`.\n- IMP-028A lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture = `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `NOT_STARTED`\n  (`IMP-028A_ARCHITECTURE_LOCKED: YES`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;\n  `IMP-028A_IMPLEMENTATION_STARTED: NO`).\n- Scope remains exactly Capability A. Do not implement D-368 / D-369 / D-370, expand to Food Direct\n  families B–F, change commercial authority, or retarget IMP-029.\n- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice`\n  remains IMP-028A. `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Authorization does **not** auto-start product implementation. No Nav, Home, Privacy, Cart,\n  route, auth, schema, or migration product changes in this authorization.\n- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n  **D-371**.\n- Supersedes GTM-R34 for current IMP-028A lifecycle position. Product acceptance through IMP-028 is\n  unchanged.\n\n### GTM-R34 — 2026-08-18\n\n- Canonical activation of **IMP-028A — Food Direct UX Foundation** as the first Food Direct\n  experience-programme capability.\n- Inserted IMP identity `IMP-028A` after accepted IMP-028 and before planned IMP-029. IMP-029 →\n  IMP-040 identities and meanings are unchanged. IMP-029 is **not** retargeted.\n- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice`\n  advances to IMP-028A. `nextProductSlice` remains IMP-029.\n- IMP-028A lifecycle is `PLANNED`. Architecture is `NOT_LOCKED`. Implementation is\n  **NOT_AUTHORIZED** / **NOT_STARTED** (`IMP-028A_IMPLEMENTATION_AUTHORIZED: NO`;\n  `IMP-028A_IMPLEMENTATION_STARTED: NO`).\n- Founder-accepted supporting slice\n  `docs/platform/experience/slices/food-direct-ux-foundation.md` is retained as\n  `FOUNDER_ACCEPTED` / `CANONICALIZED_AS = IMP-028A`. Canonical product authority is\n  `docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md`.\n- Food Direct families B–F are **not** activated. D-368 / D-369 / D-370 remain CURRENT and\n  unimplemented. `D-371` is unused. Decision register remains DR-12. Global architecture remains\n  ARCH-R15.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Supersedes GTM-R33 for current product-slice position. Product acceptance through IMP-028 is\n  unchanged.\n\n### GTM-R33 — 2026-08-18\n\n- Registered binding **D-370** Cart Identity Transition Authority (DR-12 / ARCH-R15 / ARCH-G21).\n- Guest→customer: compatible purchase-intent merge is required; silent whole-cart winner selection\n  is forbidden; failed reconciliation must not silently discard or partially destroy source intent;\n  resulting Cart is customer-owned; former guest credential is not continuing authority.\n- Authenticated→signed-out: customer Cart is not deleted; browser loses customer-cart authority;\n  post-logout context is anonymous; Customer B must not receive Customer A’s Cart.\n- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains\n  NONE. `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- D-370 does **not** authorize Cart-merge implementation, change authentication, change browser\n  storage, create a new IMP, or decide merge API/UX, Cart expiry, multi-device sync, Menu\n  projection, customization, D-369 enforcement, Saved Configuration, Order Again, Favorites, Offers,\n  Drops, Rewards, Culture, Wear, Checkout pricing, Payment, Refund, or customer deletion/retention.\n- Next free decision ID is **D-371**.\n- Supersedes GTM-R32 for current governance/architecture position. Product acceptance position\n  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.\n\n### GTM-R32 — 2026-08-18\n\n- Registered binding **D-369** Customer Paid Modifier Explicit Selection Authority (DR-11 / ARCH-R14 /\n  ARCH-G20).\n- A positive-price modifier (`price_delta_paise > 0` or equivalent) MUST NOT become customer\n  purchase intent solely because it is a catalog/default selection. Explicit current-interaction\n  selection is required. Zero-price standard defaults MAY be visibly preselected. Recommendation\n  is not selection. Cart/Checkout Snapshot/pricing authority unchanged.\n- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains\n  NONE. `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- D-369 does **not** authorize customization implementation, populate modifier data, change schema,\n  create a new IMP, or decide typed modifier kinds, Saved Configuration, Order Again, cart\n  merge/logout, Offers, Drops, Rewards, Culture, Wear, Menu UX, or D-368 implementation.\n- Next free decision ID is **D-370**.\n- Supersedes GTM-R31 for current governance/architecture position. Product acceptance position\n  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.\n\n### GTM-R31 — 2026-08-18\n\n- Registered binding **D-368** Customer Menu Read Projection Authority (DR-10 / ARCH-R13 / ARCH-G19).\n- Long-term customer Menu serving TARGET is a server-backed storefront READ PROJECTION over existing\n  commerce authorities. Static `ordering-catalog.json` remains TRANSITIONAL CURRENT storefront\n  delivery. Accepted IMP-025 implementation is not invalidated.\n- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains\n  NONE. `nextProductSlice` remains IMP-029.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized\n  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- D-368 does **not** authorize Menu implementation, create a Menu endpoint, create a new IMP, or\n  decide Menu UX / search / Most Ordered / personalization / Offers / Drops / Rewards / Culture /\n  Wear / Favorites / Order Again / cart merge/logout / paid-modifier defaults.\n- Next free decision ID is **D-369**.\n- Supersedes GTM-R30 for current governance/architecture position. Product acceptance position\n  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.\n\n### GTM-R30 — 2026-08-18\n\n- Independent acceptance of IMP-028 — Invoice / Tax Receipt / Credit Note\n  (`COMPLETE_AND_ACCEPTED`; `IMP-028_ACCEPTED: YES`).\n- Records financial-document acceptance evidence under the locked architecture and binding\n  **D-365** / **D-366** / **D-367**.\n- Sets `acceptedThrough = IMP-028`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;\n  `nextProductSlice = IMP-029`.\n- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized by\n  this reconciliation (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).\n- Decision register remains DR-9. Global architecture remains ARCH-R12. No new decision ID\n  (`D-368` remains NEXT_FREE).\n- Supersedes GTM-R29 for current accepted position.\n\n### GTM-R29 — 2026-08-18\n\n- Independent acceptance of IMP-026C — Pilot Customer-Commerce UX Hardening\n  (`COMPLETE_AND_ACCEPTED`; `IMP-026C_ACCEPTED: YES`).\n- Records supplemental-inserted-gate acceptance under the locked architecture\n  (`IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;\n  `IMP026C_FORMAL_ACCEPTANCE: ACCEPTED`).\n- `acceptedThrough` remains IMP-027. `pendingAcceptance` advances to IMP-028.\n  `currentProductSlice` / `nextProductSlice` remain IMP-028.\n- IMP-026C is a supplemental inserted gate; accepting it does **not** move\n  `acceptedThrough` to IMP-026C.\n- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_COMPLETE: YES`;\n  `IMP-028_ACCEPTED: NO`).\n- IMP-029 remains untouched. Decision register remains DR-9. Global architecture remains ARCH-R12.\n- Supersedes GTM-R28 for current accepted position.\n\n### GTM-R28 — 2026-08-18\n\n- Independent acceptance of IMP-027 — Refund Foundation\n  (`COMPLETE_AND_ACCEPTED`; `IMP-027_ACCEPTED: YES`).\n- Records refund acceptance evidence under the locked architecture and binding **D-364**\n  (`IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;\n  `IMP027_REFUND_FOUNDATION: ACCEPTED`;\n  `IMP027_FORMAL_ACCEPTANCE: ACCEPTED`).\n- Sets `acceptedThrough = IMP-027`; `pendingAcceptance = IMP-026C`; `currentProductSlice` /\n  `nextProductSlice` remain IMP-028.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`) as the\n  next remaining formal acceptance gate.\n- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_COMPLETE: YES`;\n  `IMP-028_ACCEPTED: NO`).\n- IMP-029 remains untouched. Decision register remains DR-9. Global architecture remains ARCH-R12.\n- Supersedes GTM-R27 for current accepted position.\n\n### GTM-R27 — 2026-08-18\n\n- Independent acceptance of IMP-026 — Razorpay Productionization & Payment GTM Readiness\n  (`COMPLETE_AND_ACCEPTED`; `IMP-026_ACCEPTED: YES`).\n- Records provider-originated Razorpay Test Mode webhook proof over public HTTPS\n  (`IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED`; `IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED`).\n- Sets `acceptedThrough = IMP-026`; `pendingAcceptance = IMP-027`; `currentProductSlice` /\n  `nextProductSlice` remain IMP-028.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`) as the\n  oldest unresolved formal acceptance gate.\n- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability\n  artifact may record `IMP-028_IMPLEMENTATION_COMPLETE: YES`).\n- Formal acceptance of IMP-027 / IMP-028 is **not** claimed. IMP-029 remains untouched.\n- Decision register remains DR-9. Global architecture remains ARCH-R12. Supersedes GTM-R26 for\n  current accepted position.\n\n### GTM-R26 — 2026-08-15\n\n- Records IMP-028 Invoice / Tax Receipt / Credit Note foundation implementation **STARTED** under\n  prior GTM-R25 authorization, locked capability architecture\n  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)),\n  and binding **D-365** / ARCH-G16.\n- IMP-028 lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `STARTED`\n  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: YES`;\n  `IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`).\n- Scope remains exactly the locked capability artifact and D-365. Do not reopen architecture,\n  invent TAX_RECEIPT statutory types, weaken Section 34 / BoS fail-closed boundaries, steal Ops\n  Console scope, or create a new deployable Financial Document service.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /\n  `nextProductSlice` remain IMP-028.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This start does **not** accept IMP-026, accept IMP-026C,\n  accept IMP-027, mark IMP-028 complete, or activate IMP-029.\n- Production GST/accountant configuration gates remain unresolved.\n- Decision register remains DR-7. Global architecture remains ARCH-R10. No new decision ID\n  (`D-366` remains NEXT_FREE). Supersedes GTM-R25 for current IMP-028 lifecycle position.\n\n### GTM-R25 — 2026-08-15\n\n- Explicit founder authorization to begin IMP-028 Invoice / Tax Receipt / Credit Note\n  implementation under the locked capability architecture\n  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md))\n  and binding **D-365** / ARCH-G16.\n- IMP-028 lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture remains `ARCHITECTURE_LOCKED`.\n  Implementation = `AUTHORIZED` / `NOT_STARTED`\n  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`;\n  `IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`).\n- Scope remains exactly the locked capability artifact and D-365. Do not reopen architecture,\n  invent TAX_RECEIPT statutory types, weaken Section 34 / BoS fail-closed boundaries, steal Ops\n  Console scope, or create a new deployable Financial Document service.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /\n  `nextProductSlice` remain IMP-028.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This authorization does **not** accept IMP-026, accept\n  IMP-026C, accept IMP-027, start product implementation automatically, mark IMP-028 complete, or\n  activate IMP-029.\n- Production GST/accountant configuration gates remain unresolved.\n- No Financial Document product code, schema migration, PDF implementation, customer document UX,\n  or Ops Console transport added by this implementation authorization.\n- Decision register remains DR-7. Global architecture remains ARCH-R10. No new decision ID\n  (`D-366` remains NEXT_FREE).\n\n### GTM-R24 — 2026-08-15\n\n- Locked IMP-028 Invoice / Tax Receipt / Credit Note architecture\n  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)).\n- IMP-028 lifecycle = `ARCHITECTURE_LOCKED`. Architecture is locked. Implementation remains\n  **NOT_AUTHORIZED**.\n- Registered binding decision **D-365** (Financial Document Authority and Immutable Issuance\n  Model). Decision register → DR-7. Global architecture → ARCH-R10 (Financial Document domain +\n  ARCH-G16).\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /\n  `nextProductSlice` remain IMP-028.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026, accept\n  IMP-026C, accept IMP-027, authorize Financial Document implementation, or activate IMP-029.\n- No Financial Document product code, schema migration, PDF implementation, or Ops Console\n  transport added by this architecture lock.\n\n### GTM-R23 — 2026-08-15\n\n- Explicit founder authorization to activate IMP-028 Invoice / Tax Receipt / Credit Note\n  architecture investigation only (`ARCHITECTURE_IN_PROGRESS`). Architecture is **NOT_LOCKED**.\n  Implementation is **NOT_AUTHORIZED**. No IMP-028 capability artifact created.\n- `currentProductSlice` / `nextProductSlice` become IMP-028.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved\n  formal acceptance gate). No pending-acceptance array. No out-of-order `acceptedThrough`.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This continuation does **not** accept IMP-026, accept\n  IMP-026C, accept IMP-027, lock IMP-028 architecture, authorize IMP-028 implementation, invent\n  tax/legal document semantics, or activate IMP-029.\n- Preserved commercial authorities: Checkout Snapshot, Payment, Refund, Order. IMP-027 owns\n  durable Refund facts; IMP-028 owns Invoice / Tax Receipt / Credit Note.\n- IMP-028 identity remains Invoice / Tax Receipt / Credit Note. IMP-029 → IMP-040 identities and\n  meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, database, invoice, tax-receipt, or credit-note implementation change.\n  No new decision ID (`D-365` remains ABSENT).\n\n### GTM-R22 — 2026-08-15\n\n- Recorded IMP-027 Refund Foundation implementation complete pending acceptance under the locked\n  capability architecture\n  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md))\n  and binding **D-364** / ARCH-G15.\n- IMP-027 lifecycle promoted to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation evidence = `COMPLETE`. Independent implementation review =\n  `PASS`. Formal acceptance is **not** claimed (`IMP-027_ACCEPTED: NO`).\n- Deterministic verification completed; full repository suite 863/863 PASS.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved formal\n  acceptance gate). That pointer does not mean IMP-026C or IMP-027 implementation remains in\n  progress. `currentProductSlice` / `nextProductSlice` remain IMP-027.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026, accept\n  IMP-026C, accept IMP-027, change Refund architecture, or activate IMP-028.\n- No architecture or scope change. No new decision. No product-code mutation in this reconciliation.\n\n### GTM-R21 — 2026-08-14\n\n- Explicit founder authorization to begin IMP-027 Refund Foundation implementation under the\n  locked capability architecture\n  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md))\n  and binding **D-364** / ARCH-G15.\n- IMP-027 lifecycle promoted to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` (`IMP-027_IMPLEMENTATION_AUTHORIZED: YES`).\n- Scope remains exactly the locked capability artifact. Do not change Refund architecture,\n  lifecycle, concurrency invariant, Payment semantics, webhook correlation, provider\n  idempotency, IMP-028 boundary, IMP-029 boundary, or runtime topology.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice`\n  / `nextProductSlice` remain IMP-027.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This authorization does **not** accept IMP-026 or\n  IMP-026C, generate invoices/credit notes, steal Operations Console scope, or activate IMP-028.\n- No Refund product code, schema migration, provider refund API call, or Ops Console transport\n  added by this implementation authorization.\n\n### GTM-R20 — 2026-08-14\n\n- Locked IMP-027 Refund Foundation architecture\n  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)).\n- IMP-027 lifecycle = `ARCHITECTURE_LOCKED`. Architecture is locked. Implementation remains\n  **NOT_AUTHORIZED**.\n- Registered binding decision **D-364** (Refund Foundation). Decision register → DR-6. Global\n  architecture → ARCH-R9 (Refund domain + ARCH-G15).\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /\n  `nextProductSlice` remain IMP-027.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).\n- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026 or\n  IMP-026C, authorize Refund implementation, or activate IMP-028.\n- No Refund product code, schema migration, provider refund API call, or Ops Console transport\n  added by this architecture lock.\n\n### GTM-R19 — 2026-08-14\n\n- Explicit founder authorization to activate IMP-027 architecture investigation only\n  (`ARCHITECTURE_IN_PROGRESS`). Architecture is **NOT_LOCKED**. Implementation is\n  **NOT_AUTHORIZED**. No IMP-027 capability artifact created.\n- `currentProductSlice` / `nextProductSlice` become IMP-027.\n- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved\n  formal acceptance gate). No pending-acceptance array. No out-of-order `acceptedThrough`.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`) behind\n  unresolved predecessor acceptance IMP-026.\n- Formal acceptance remains contiguous. This continuation does **not** accept IMP-026 or\n  IMP-026C, waive webhook debt, lock Refund architecture, authorize Refund implementation, or\n  activate IMP-028.\n- Preserved payment semantics: provider `captured` → BOBA Payment success remains original\n  collection truth; later refund observation must not rewrite that truth. Refund capability\n  remains IMP-027.\n- IMP-027 identity remains Refund Foundation. IMP-028 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, database, or Refund implementation change. No new decision ID\n  (`D-364` remains ABSENT).\n\n### GTM-R18 — 2026-08-14\n\n- Promoted IMP-026C lifecycle to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after complete\n  implementation evidence and independent implementation review PASS.\n- Formal acceptance of IMP-026C is **not** claimed (`IMP-026C_ACCEPTED: NO`).\n- `pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal acceptance gate.\n  That pointer does not mean IMP-026C implementation remains in progress.\n- `acceptedThrough` remains IMP-025. `currentProductSlice` / `nextProductSlice` remain IMP-026C.\n  This reconciliation does not activate IMP-027.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- Formal acceptance remains contiguous. No pending-acceptance array. No out-of-order\n  `acceptedThrough`.\n- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, database, or Razorpay architecture change. No new decision ID.\n\n### GTM-R17 — 2026-08-14\n\n- Explicit founder authorization to begin IMP-026C implementation under the locked capability\n  architecture\n  ([`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)).\n- IMP-026C lifecycle promoted to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains\n  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED`.\n- Scope remains exactly the locked capability artifact (UI presentation / client-state mapping /\n  accessibility / tests only). No domain, API, database, Payment, or Order authority change.\n- `acceptedThrough` remains IMP-025. `currentProductSlice` remains IMP-026C.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, database, or Razorpay architecture change. No new decision ID.\n\n### GTM-R16 — 2026-08-14\n\n- Completed and locked IMP-026C capability architecture\n  ([`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)).\n- IMP-026C lifecycle = `ARCHITECTURE_LOCKED`. Architecture is presentation / client-state /\n  accessibility only. No new domain, API, database, Payment, or Order authority.\n- Explicit non-goals preserved (no ETA/capacity/search/recommendations/kitchen states/refund/\n  delivery/notifications/support-case domain).\n- IMP-026C implementation remains **NOT AUTHORIZED**.\n- `acceptedThrough` remains IMP-025.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**\n  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.\n- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, database, or Razorpay architecture change. No new decision ID.\n\n### GTM-R15 — 2026-08-14\n\n- Founder deferred the remaining IMP-026 external provider-webhook acceptance gate because public\n  HTTPS infrastructure is not currently available.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent IMP-026 acceptance is\n  **not** claimed. `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026.\n- Recorded deferred external acceptance debt `RAZORPAY_PROVIDER_ORIGINATED_WEBHOOK_PUBLIC_HTTPS`\n  (`IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`; `DEFERRED_EXTERNAL_GATE = YES`;\n  `SATISFIED = NO`).\n- Documented a narrow external-blocker exception to `ACCEPT → RECONCILE → ADVANCE` so IMP-026C\n  architecture work may proceed without accepting IMP-026 or legalizing arbitrary dual active\n  slices.\n- Activated IMP-026C architecture work: `currentProductSlice` / `nextProductSlice` = IMP-026C;\n  IMP-026C lifecycle = `ARCHITECTURE_IN_PROGRESS`; architecture not locked; implementation not\n  authorized.\n- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- Deferred IMP-026 webhook proof remains mandatory before production / public GTM / Live Mode /\n  launch acceptance. It is not reassigned as new IMP-039 or IMP-040 scope.\n- No product, domain, API, database, or Razorpay architecture change. No new decision ID.\n\n### GTM-R14 — 2026-08-14\n\n- Generalized formal inserted IMP ledger syntax to `IMP-\\d+[A-Z]?` (single uppercase suffix).\n- Clarified that historical IMP-026A / IMP-026B references remain non-roadmap task/authorization\n  labels inside IMP-026 Razorpay work and are not formal product ledger slices.\n- Added formal standalone product slice **IMP-026C — Pilot Customer-Commerce UX Hardening**.\n- Positioned IMP-026C immediately after IMP-026 and before IMP-027.\n- IMP-026C lifecycle = `PLANNED`; architecture not locked; implementation not authorized;\n  slice not activated.\n- `acceptedThrough` remains IMP-025.\n- `currentProductSlice` / `pendingAcceptance` remain IMP-026.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.\n- IMP-027 → IMP-040 identities and meanings unchanged.\n- Public GTM boundary remains IMP-040.\n- No product, domain, API, or database change.\n\n### GTM-R13 — 2026-08-14\n\n- Reconciled IMP-026 external evidence after successful manual real Razorpay Test payment\n  verification.\n- Recorded `LOCAL_RAZORPAY_GTM_VALIDATION = PASS_WITH_PROVIDER_WEBHOOK_PENDING`.\n- Narrowed remaining external blocker to provider-originated Razorpay webhook over public HTTPS\n  (`EXTERNAL_ACCEPTANCE_GAP = RAZORPAY_PROVIDER_ORIGINATED_WEBHOOK_PUBLIC_HTTPS`;\n  `PROVIDER_ORIGINATED_WEBHOOK = NOT_VALIDATED_LOCALHOST_LIMITATION`;\n  `NEXT_GATE = WAITING_FOR_PUBLIC_PROVIDER_WEBHOOK_VALIDATION`).\n- `acceptedThrough` remains IMP-025.\n- `currentProductSlice` remains IMP-026.\n- `pendingAcceptance` remains IMP-026.\n- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.\n- IMP-027 remains not started. IMP-027 → IMP-040 identities are unchanged.\n- Added GTM commercial-control / controlled-pilot measurement requirements without authorizing\n  implementation or changing future IMP identities. `100 fulfilled orders` / `4 weeks` remain\n  `PROPOSED_ONLY` / `NOT_CANONICAL`. Customer UX pilot-minimum items are\n  `PRODUCT_STRATEGY_INPUTS` / `NOT_IMPLEMENTATION_AUTHORIZATION`.\n\n### GTM-R12 — 2026-08-14\n\n- Promoted IMP-026 coding-agent lifecycle to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after\n  deterministic verification. Architecture remains `ARCHITECTURE_LOCKED`.\n- Set `pendingAcceptance = IMP-026`; `acceptedThrough` remains IMP-025; `currentProductSlice`\n  remains IMP-026; `nextProductSlice` remains IMP-026.\n- Recorded Real Razorpay Test Mode as `BLOCKED_EXTERNAL_PREREQUISITES` (pending external GTM\n  acceptance evidence). Independent acceptance of IMP-026 is **not** claimed. Do not start IMP-027.\n\n### GTM-R11 — 2026-08-13\n\n- Activated IMP-026 implementation (`IMPLEMENTATION_IN_PROGRESS`) under separate IMP-026A\n  server-side Razorpay productionization authorization. Architecture remains\n  `ARCHITECTURE_LOCKED`.\n- Set `currentProductSlice = IMP-026`; `nextProductSlice` remains IMP-026;\n  `acceptedThrough` remains IMP-025; `pendingAcceptance` remains `NONE`.\n- Independent acceptance of IMP-026 is **not** claimed. Do not start IMP-026B automatically.\n  Do not advance to IMP-027.\n\n### GTM-R10 — 2026-08-13\n\n- Recorded **D-363**: Razorpay durable webhook inbox and asynchronous provider-event processing.\n  Amends D-362 only for webhook acknowledgement timing. D-362 remains CURRENT for Order\n  materialization outside the provider-ack path, missing-Order recovery, secondary reconciliation,\n  and no new deployable service. D-361 remains CURRENT for Razorpay provider selection / Standard\n  Checkout.\n- Updated locked IMP-026 capability architecture\n  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))\n  for durable inbox insert before HTTP 2xx, asynchronous Payment processing inside\n  `customer-commerce`, one Attempt = one Razorpay Order, Checkout internal retry disabled, captured\n  required for success, automatic capture, and deterministic provider receipt /\n  recover-before-recreate.\n- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is\n  **not** authorized by this architecture lock.\n- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`\n  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.\n\n### GTM-R9 — 2026-08-13\n\n- Recorded **D-362**: Razorpay webhook acknowledgement and post-payment Order recovery boundary.\n  Amends D-361 only for webhook acknowledgement / post-payment Order effect semantics. D-361 remains\n  CURRENT for Razorpay provider selection / Standard Checkout.\n- Updated locked IMP-026 capability architecture\n  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))\n  for acknowledgement-after-durable-Payment, Order materialization outside provider-ack path, and\n  missing-Order recovery via existing `recoverMissingOrdersBatch`.\n- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is\n  **not** authorized by this architecture lock.\n- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`\n  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.\n\n### GTM-R8 — 2026-08-13\n\n- Explicit approved provider substitution: retitled IMP-026 from\n  `Cashfree Productionization & Payment GTM Readiness` to\n  **`IMP-026 — Razorpay Productionization & Payment GTM Readiness`**. Slice number unchanged.\n- Locked IMP-026 capability architecture\n  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)).\n- Set IMP-026 lifecycle to `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is\n  **not** authorized by this architecture lock.\n- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`\n  remains `NONE`; `nextProductSlice` remains IMP-026.\n- Current V1 payment provider/surface authority is **D-361** (Razorpay / Razorpay Standard\n  Checkout), superseding D-161 / D-162 for current authority. Do not advance to IMP-027.\n\n### GTM-R7 — 2026-08-13\n\n- Independent acceptance of IMP-025 — Customer Ordering UX\n  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.\n- Set `acceptedThrough = IMP-025`; `currentProductSlice = NONE`;\n  `nextProductSlice = IMP-026`.\n- IMP-026 remains `PLANNED / NOT STARTED`. Implementation of IMP-026 is not authorized\n  by this reconciliation.\n\n### GTM-R6 — 2026-08-13\n\n- Recorded IMP-025 coding-agent implementation complete\n  (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`). Architecture remains\n  `ARCHITECTURE_LOCKED`.\n- Set `currentProductSlice = IMP-025`; `nextProductSlice` remains IMP-025;\n  `acceptedThrough` remains IMP-024.\n- Independent acceptance of IMP-025 is **not** claimed. Do not start IMP-026.\n\n### GTM-R5 — 2026-08-13\n\n- Locked IMP-025 capability architecture\n  ([`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)).\n- Set IMP-025 lifecycle to `ARCHITECTURE_LOCKED`.\n- `acceptedThrough` remains IMP-024; `currentProductSlice` remains `NONE`;\n  `nextProductSlice` remains IMP-025.\n- IMP-025 implementation remains `NOT STARTED` and is **not** authorized by architecture lock.\n\n### GTM-R4 — 2026-08-12\n\n- Independent acceptance of IMP-024 — Customer Ordering Transport / API\n  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.\n- Set `acceptedThrough = IMP-024`; `currentProductSlice = NONE`;\n  `nextProductSlice = IMP-025`.\n- IMP-025 remains `PLANNED / NOT STARTED`. Implementation of IMP-025 is not authorized\n  by this reconciliation.\n\n### GTM-R3 — 2026-08-12\n\n- Locked IMP-024 capability architecture\n  ([`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)).\n- Set IMP-024 lifecycle to `ARCHITECTURE_LOCKED`, then activated `IMPLEMENTATION_IN_PROGRESS`\n  under separate implementation authorization (architecture lock retained), then recorded\n  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after coding-agent implementation evidence.\n- Set `currentProductSlice = IMP-024`; `acceptedThrough` remains IMP-023.\n- Recorded CURRENT decisions D-359 / D-360 (see [`decision-register.md`](./decision-register.md)).\n\n### GTM-R2 — 2026-08-11\n\n- Preserved accepted IMP-001→IMP-023 identities.\n- Preserved IMP-005A.\n- Superseded older future-roadmap numbering (GTM-R1 / `implementation-roadmap.md`).\n- Added Customer Ordering Transport / API as IMP-024.\n- Added Customer Ordering UX as IMP-025.\n- Separated Cashfree productionization from the Payment domain (IMP-026).\n- Moved Refund to its own future capability (IMP-027).\n- Added Invoice / Tax Receipt / Credit Note (IMP-028).\n- Separated Order domain from Operations Console API/UI (IMP-029 / IMP-030).\n- Moved public GTM boundary from IMP-035 to IMP-040.\n- Reassigned IMP-035 to Initial Administration Capabilities.\n\n### GTM-R1 — 2026-08-03\n\n- Original approved sequential implementation roadmap (`implementation-roadmap.md`). Historical\n  only.\n\n## 10. Authority Boundaries\n\n| Question | Authority |\n|---|---|\n| IMP identity / sequence / GTM boundary | **This document (`ROADMAP.md`)** |\n| Accepted reality | [`STATE.md`](./STATE.md) |\n| Product purpose / Non-Goals | [`VISION.md`](./VISION.md) |\n| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |\n| Binding decisions | [`decision-register.md`](./decision-register.md) |\n| IMP-024 capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |\n| IMP-025 capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |\n| IMP-026 capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |\n| IMP-026C capability architecture | [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) |\n| IMP-027 capability architecture | [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) |\n| IMP-028 capability architecture | [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) |\n| IMP-028A capability architecture | [`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md) |\n\nOperating lifecycle:\n\n```text\nANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE\n```\n\nGTM-R15 exception (narrow): IMP-026C work may proceed while IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with deferred public HTTPS webhook debt. GTM-R16\nrecords IMP-026C `ARCHITECTURE_LOCKED` under that exception. GTM-R17 records explicit founder\nauthorization for IMP-026C `IMPLEMENTATION_IN_PROGRESS` under the locked capability artifact.\nGTM-R18 records IMP-026C `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending\nacceptance IMP-026. GTM-R19 records IMP-027 `ARCHITECTURE_IN_PROGRESS`. GTM-R20 records\nIMP-027 `ARCHITECTURE_LOCKED` with implementation **NOT_AUTHORIZED**. GTM-R21 records explicit\nfounder authorization for IMP-027 `IMPLEMENTATION_IN_PROGRESS` under the locked Refund\nFoundation artifact. GTM-R22 records IMP-027 `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind\noldest pending acceptance IMP-026. GTM-R23 records explicit founder authorization for IMP-028\n`ARCHITECTURE_IN_PROGRESS` only while IMP-026, IMP-026C, and IMP-027 remain unaccepted. GTM-R24\nrecords IMP-028 `ARCHITECTURE_LOCKED` with implementation **NOT_AUTHORIZED** behind the same\noldest pending gate. GTM-R25 records explicit founder authorization for IMP-028 implementation\n(`AUTHORIZED` / `NOT_STARTED`) under the locked Financial Document artifact and **D-365** /\nARCH-G16. This is\nnot IMP-026 acceptance, not IMP-026C acceptance, not IMP-027 acceptance, not IMP-028\nimplementation start/complete/acceptance, and does not weaken the deferred external gate\ngenerally. The exception does not apply automatically to unrelated future slices.\n",
  "docs/platform/STATE.md": "<!-- governance-meta\n{\n  \"status\": \"CURRENT\",\n  \"authority\": \"ACCEPTED_STATE\",\n  \"stateVersion\": \"STATE-R69\",\n  \"acceptedThrough\": \"IMP-029\",\n  \"currentProductSlice\": \"IMP-030\",\n  \"nextProductSlice\": \"IMP-031\",\n  \"pendingAcceptance\": \"NONE\",\n  \"governanceHealth\": \"ALIGNED\",\n  \"lastReviewed\": \"2026-08-27\"\n}\n-->\n\n# BOBA Bear — Accepted State\n\nCoding-agent completion does **not** equal acceptance. This document is the independently accepted\ncurrent-reality authority.\n\n## 1. Accepted Position\n\n```text\nAccepted Through:          IMP-029 — Operations Console API\nAccepted Inserted Slice:   IMP-005A — Dockerized local application runtime; IMP-026C — Pilot Customer-Commerce UX Hardening; IMP-028A — Food Direct UX Foundation; IMP-028B — Customer Menu Projection + Discovery; IMP-028C — Food Customization; IMP-028D — Desktop Ordering Continuity\nAccepted Range:            IMP-001 → IMP-029 (including IMP-005A and IMP-026C)\n```\n\n## 2. Current Work Position\n\n```text\nCurrent Product Implementation: IMP-030 — Operations Console UI\nPending Acceptance:             NONE\nNext Product Slice:             IMP-031 — Provider-Neutral Delivery Foundation\nCurrent Governance Activity:    IMP-030 capability architecture LOCKED and formally amended/re-locked\n                              for static detail-route realization; implementation AUTHORIZED /\n                              STARTED / IMPLEMENTATION_IN_PROGRESS.\nGovernance Health:              ALIGNED\n```\n\n```text\nIMP-030: IMPLEMENTATION_IN_PROGRESS\nIMP-030_ARCHITECTURE: LOCKED\nIMP-030_ARCHITECTURE_LOCKED: YES\nIMP-030_IMPLEMENTATION: AUTHORIZED / STARTED\nIMP-030_IMPLEMENTATION_AUTHORIZED: YES\nIMP-030_STARTED: YES\nIMP-030_IMPLEMENTATION_COMPLETE: NO\nIMP-030_ACCEPTED: NO\n```\n\n```text\nIMP-024 architecture:     ARCHITECTURE_LOCKED\nIMP-024 implementation:   COMPLETE_AND_ACCEPTED\nIMP-025 architecture:     ARCHITECTURE_LOCKED\nIMP-025 implementation:   COMPLETE_AND_ACCEPTED\nIMP-026 architecture:     ARCHITECTURE_LOCKED\nIMP-026 implementation:   COMPLETE_AND_ACCEPTED\nIMP-026_ACCEPTED:         YES\nIMP-026C:                 COMPLETE_AND_ACCEPTED\nIMP-026C architecture:    ARCHITECTURE_LOCKED\nIMP-026C implementation:  AUTHORIZED / COMPLETE\nIMP-026C_IMPLEMENTATION_AUTHORIZED: YES\nIMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP026C_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-026C_ACCEPTED:        YES\nIMP-027:                  COMPLETE_AND_ACCEPTED\nIMP-027 architecture:     ARCHITECTURE_LOCKED\nIMP-027 implementation:   AUTHORIZED / COMPLETE\nIMP-027_ARCHITECTURE:     LOCKED\nIMP-027_IMPLEMENTATION:   AUTHORIZED / COMPLETE\nIMP-027_IMPLEMENTATION_AUTHORIZED: YES\nIMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP027_REFUND_FOUNDATION: ACCEPTED\nIMP027_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-027_ACCEPTED:         YES\nIMP-028:                  COMPLETE_AND_ACCEPTED\nIMP-028 architecture:     ARCHITECTURE_LOCKED\nIMP-028 implementation:   AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE:     LOCKED\nIMP-028_IMPLEMENTATION:   AUTHORIZED / COMPLETE\nIMP-028_ARCHITECTURE_LOCKED: YES\nIMP-028_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028_IMPLEMENTATION_STARTED: YES\nIMP-028_IMPLEMENTATION_COMPLETE: YES\nIMP-028_ACCEPTED:         YES\nIMP-028A:                  COMPLETE_AND_ACCEPTED\nIMP-028A_ARCHITECTURE_LOCKED: YES\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028A_IMPLEMENTATION_STARTED: YES\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\nIMP-028A_ACCEPTED:        YES\nIMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP028A_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-028B:                  COMPLETE_AND_ACCEPTED\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED:        YES\nIMP-028C:                 COMPLETE_AND_ACCEPTED\nIMP-028C_ARCHITECTURE_LOCKED: YES\nIMP-028C_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028C_IMPLEMENTATION_STARTED: YES\nIMP-028C_IMPLEMENTATION_COMPLETE: YES\nIMP-028C_ACCEPTED:        YES\nIMP-028D:                 COMPLETE_AND_ACCEPTED\nIMP-028D_ARCHITECTURE_LOCKED: YES\nIMP-028D_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028D_IMPLEMENTATION_STARTED: YES\nIMP-028D_IMPLEMENTATION_COMPLETE: YES\nIMP-028D_ACCEPTED:        YES\nIMP-028D_FOUNDER_UAT_REQUIRED: YES\nIMP-028D_FOUNDER_UAT:     PASS\nIMP-028D_FOUNDER_UAT_COMPLETE: YES\nFOUNDER_UAT_REQUIRED:     YES\nFOUNDER_UAT:              PASS\nFOUNDER_UAT_COMPLETE:     YES\nFOUNDER_UAT_DECISION_DATE: 2026-08-22\nFOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder\nFOUNDER_UAT_CANDIDATE_REF: main\nFOUNDER_UAT_CANDIDATE_HEAD: 166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7\nFOUNDER_UAT_CANDIDATE_TREE: eba5f3f7fc25b07581801b53a130fb9547abc459\nFOUNDER_UAT_EVIDENCE_SHA256: 715519d51801a10913a71a891af74c68aac1f493088adda43ecbc6a9c8bd5572\nIMP-029:                  COMPLETE_AND_ACCEPTED\nIMP-029_ARCHITECTURE:     LOCKED\nIMP-029_ARCHITECTURE_LOCKED: YES\nIMP-029_IMPLEMENTATION:   AUTHORIZED / STARTED / COMPLETE\nIMP-029_IMPLEMENTATION_AUTHORIZED: YES\nIMP-029_STARTED:          YES\nIMP-029_IMPLEMENTATION_COMPLETE: YES\nIMP-029_ACCEPTED:         YES\nIMP029_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP029_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP029_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP029_FORMAL_ACCEPTANCE: ACCEPTED\nIMP029_ACCEPTED_MAIN_SHA: 0490a393666a87f5f99cc6d90c99bef18d09c097\nIMP029_ACCEPTED_TREE:     4d376d296bd8596c4809fc91331659a2f52e53e6\nREMOTE_OPERATIONS_DEPLOYMENT_PROVEN: NO\n```\n\nCapability architecture:\n\n[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)\n\n[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)\n\n[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)\n\n[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)\n\n[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)\n\n[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)\n\n[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)\n\n[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)\n\n[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)\n\n[`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md)\n\n[`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)\n\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md)\n\n`acceptedThrough` is IMP-029. IMP-025 architecture remains locked; IMP-025 implementation is\n**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation\nis **COMPLETE_AND_ACCEPTED** (`IMP-026_ACCEPTED: YES`). Independent acceptance of IMP-026 is\nrecorded, including provider-originated Razorpay Test Mode webhook proof over public HTTPS.\nIMP-026C architecture is **ARCHITECTURE_LOCKED**. IMP-026C implementation is **authorized**,\n**implementation-complete**, and **COMPLETE_AND_ACCEPTED**. Independent implementation review is\n**PASS**. Implementation evidence is **COMPLETE**. Independent acceptance evidence is **ACCEPTED**.\nFormal acceptance of IMP-026C **is** claimed (`IMP-026C_ACCEPTED: YES`). `acceptedThrough` remains\ncontiguous through IMP-028A; IMP-026C remains a supplemental inserted gate and does not itself move\n`acceptedThrough`. `pendingAcceptance=NONE` after GTM-R37 / STATE-R35 record independent acceptance\nof IMP-028A. Formal acceptance of IMP-028A **is** claimed (`IMP-028A_ACCEPTED: YES`).\nIMP-027 is `COMPLETE_AND_ACCEPTED` (architecture **LOCKED**; implementation evidence **COMPLETE**;\nindependent implementation review **PASS**; `IMP-027_ACCEPTED: YES`; binding **D-364**).\nRefund architecture remains locked and accepted. GTM-R30 / STATE-R28 record IMP-028\n`COMPLETE_AND_ACCEPTED` (architecture **LOCKED**; implementation **AUTHORIZED** / **COMPLETE**;\nbinding **D-365** / **D-366** / **D-367**; capability artifact present). Formal acceptance of\nIMP-028 **is** claimed (`IMP-028_ACCEPTED: YES`; `IMP-028_IMPLEMENTATION_COMPLETE: YES`).\nGTM-R30 / STATE-R28 recorded `pendingAcceptance=NONE` immediately after that acceptance.\nIMP-029 is `COMPLETE_AND_ACCEPTED`; architecture remains `LOCKED`; implementation is **authorized**,\n**started**, and **complete** (`IMP-029_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-029_STARTED: YES`;\n`IMP-029_IMPLEMENTATION_COMPLETE: YES`; `IMP-029_ACCEPTED: YES`). Its locked capability architecture\nis [`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md);\nbinding decision **D-372** remains CURRENT and establishes a separate workforce business transport\nwhile retaining the existing workforce session/principal and Order authorities. GTM-R37 / STATE-R35 record\nIMP-028A `COMPLETE_AND_ACCEPTED` (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;\n`IMP-028A_ACCEPTED: YES`; architecture `ARCHITECTURE_LOCKED`). At that historical acceptance,\n`currentProductSlice` was `NONE` and `nextProductSlice=IMP-029` was next-planned GTM bookkeeping.\nIMP-028A does **not**\nretarget IMP-029, implement D-368 / D-369 / D-370, or create `D-371`. Formal acceptance of\nIMP-028A does **not** authorize or start IMP-029. GTM-R38 / STATE-R36 historically record IMP-028B canonical\nactivation (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;\n`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;\n`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`). GTM-R39 / STATE-R37 historically record\nIMP-028B architecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` /\n`NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;\n`IMP-028B_ACCEPTED: NO`). GTM-R40 / STATE-R38 and GTM-R41 / STATE-R39 record the subsequent\nhistorical implementation progression. STATE-R40 records IMP-028B `COMPLETE_AND_ACCEPTED`.\n`currentProductSlice` is now NONE; `pendingAcceptance` is NONE; `acceptedThrough` was IMP-028B at\nthat historical acceptance point.\nAcceptance of IMP-028B did not implement D-369 / D-370, create `D-371`, or start IMP-029.\n\nGTM-R31 / STATE-R29 historically record binding **D-368** (Customer Menu Read Projection Authority;\nDR-10; ARCH-R13 / ARCH-G19). IMP-028B subsequently implemented and accepted the server-backed READ\nPROJECTION; the IMP-025 static `ordering-catalog.json` is no longer the storefront runtime delivery.\nD-368 itself did not authorize Menu implementation, create a Menu endpoint, or activate IMP-029.\nGTM-R32 / STATE-R30\nrecord binding **D-369** (Customer Paid Modifier Explicit Selection Authority; DR-11; ARCH-R14 /\nARCH-G20). A positive-price modifier must not become customer purchase intent solely because it is\na catalog/default selection. D-369 does not authorize customization implementation, populate\nmodifier data, or activate IMP-029. GTM-R33 / STATE-R31 record binding **D-370** (Cart Identity\nTransition Authority; DR-12; ARCH-R15 / ARCH-G21). Guest and customer purchase intent must be\nreconciled without silent winner selection; sign-out isolates the browser from the customer Cart\nwithout deleting it. D-370 does not authorize Cart-merge implementation, change authentication, or\nactivate IMP-029. D-371 is CURRENT; the next free decision is **D-372**. GTM-R37 / STATE-R35 record IMP-028A\nindependent acceptance without changing decision register or global architecture. GTM-R38 /\nSTATE-R36 record IMP-028B canonical activation without changing decision register or global\narchitecture. GTM-R39 / STATE-R37 record IMP-028B architecture lock and implementation\nauthorization without changing decision register or global architecture.\n\nSTATE-R69 supersedes STATE-R68 only to repair stale current-state prose in Acceptance Position.\nNo lifecycle, architecture, decision, completion, acceptance, or activation delta occurred.\nIMP-030 remains `IMPLEMENTATION_IN_PROGRESS` / `LOCKED` / `AUTHORIZED` / `STARTED`\n(`IMP-030_ARCHITECTURE_LOCKED: YES`; `IMP-030_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-030_STARTED: YES`; `IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`).\n`acceptedThrough` remains IMP-029; `pendingAcceptance` remains NONE; `currentProductSlice`\nremains IMP-030; and `nextProductSlice` remains IMP-031, `PLANNED` / `NOT_ACTIVATED`.\nD-372 remains CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is absent. This is\n`CANONICAL_CONSISTENCY_ONLY` — not a lifecycle advance, architecture change, implementation\nauthorization/start event, completion, or acceptance. Supersedes STATE-R68 for the current\nconsistency position only.\n\nSTATE-R68 records a capability-local **detail route architecture amendment** for **IMP-030 —\nOperations Console UI** while implementation remains started under the locked capability\narchitecture at\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\nThe prior pretty dynamic UI route `/workforce/operations/orders/{orderId}/` was incompatible with\nbinding static export; the amended architecture uses the fixed static detail shell\n`/workforce/operations/orders/detail/` with `orderId` carried via query parameter. IMP-030 remains\n`IMPLEMENTATION_IN_PROGRESS`; architecture remains `LOCKED` and re-locked (`IMP-030_ARCHITECTURE_LOCKED:\nYES`; `IMP-030_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-030_STARTED: YES`;\n`IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`). This amendment does not undo\nimplementation start, create a second implementation authorization, complete implementation, or\naccept IMP-030. `acceptedThrough` remains IMP-029; `pendingAcceptance` remains NONE;\n`currentProductSlice` remains IMP-030; and `nextProductSlice` remains IMP-031, `PLANNED` /\n`NOT_ACTIVATED`. D-372 remains CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is absent. No\nproduct, runtime, schema, migration, or deployment mutation is introduced. Supersedes STATE-R67 for\nthe current product-slice position.\n\nSTATE-R67 records implementation start for **IMP-030 — Operations Console UI** under prior\nimplementation authorization and the locked capability architecture at\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\nIMP-030 is `IMPLEMENTATION_IN_PROGRESS`; architecture remains `LOCKED`; implementation is\n`AUTHORIZED` / `STARTED` (`IMP-030_ARCHITECTURE_LOCKED: YES`;\n`IMP-030_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-030_STARTED: YES`;\n`IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`). This is implementation start only;\nimplementation is not complete or accepted. `acceptedThrough` remains IMP-029; `pendingAcceptance`\nremains NONE; `currentProductSlice` remains IMP-030; and `nextProductSlice` remains IMP-031,\n`PLANNED` / `NOT_ACTIVATED`. D-372 remains CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is\nabsent. No product, runtime, schema, migration, or deployment mutation is introduced. Supersedes\nSTATE-R66 for the current product-slice position.\n\nSTATE-R66 records explicit implementation authorization for **IMP-030 — Operations Console UI**\nunder the locked capability architecture at\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\nIMP-030 is `IMPLEMENTATION_AUTHORIZED`; architecture remains `LOCKED`; implementation is\n`AUTHORIZED` / `NOT_STARTED` (`IMP-030_ARCHITECTURE_LOCKED: YES`;\n`IMP-030_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-030_STARTED: NO`;\n`IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`). This is authorization only;\nimplementation is not started. `acceptedThrough` remains IMP-029; `pendingAcceptance` remains NONE;\n`currentProductSlice` remains IMP-030; and `nextProductSlice` remains IMP-031, `PLANNED` /\n`NOT_ACTIVATED`. D-372 remains CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is absent. No\nproduct, runtime, schema, migration, or deployment mutation is introduced. Supersedes STATE-R65 for\nthe current product-slice position.\n\nSTATE-R65 locks the capability architecture for **IMP-030 — Operations Console UI** at\n[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).\nIMP-030 is `ARCHITECTURE_LOCKED`; architecture is `LOCKED`; implementation remains\n`NOT_AUTHORIZED` / `NOT_STARTED` (`IMP-030_ARCHITECTURE_LOCKED: YES`;\n`IMP-030_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-030_STARTED: NO`;\n`IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`). `acceptedThrough` remains IMP-029;\n`pendingAcceptance` remains NONE; `currentProductSlice` remains IMP-030; and `nextProductSlice`\nremains IMP-031, `PLANNED` / `NOT_ACTIVATED`. D-372 remains CURRENT; ARCH-R17 and DR-14 remain\nunchanged; D-373 is not created. This is an architecture-lock-only transition with no runtime,\nschema, migration, product, or deployment mutation. Supersedes STATE-R64 for the current\nproduct-slice architecture position.\n\nSTATE-R64 records explicit Founder authorization to activate **IMP-030 — Operations Console UI**\nfor architecture work only. IMP-030 is `ARCHITECTURE_IN_PROGRESS`; architecture remains\n`NOT_LOCKED` and implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`\n(`IMP-030_ARCHITECTURE_LOCKED: NO`; `IMP-030_IMPLEMENTATION_AUTHORIZED: NO`;\n`IMP-030_STARTED: NO`; `IMP-030_IMPLEMENTATION_COMPLETE: NO`; `IMP-030_ACCEPTED: NO`).\n`acceptedThrough` remains IMP-029; `pendingAcceptance` remains NONE; `currentProductSlice` becomes\nIMP-030; and `nextProductSlice` becomes IMP-031, which remains `PLANNED` / `NOT_ACTIVATED`. No\ncapability architecture artifact, D-373, runtime, schema, migration, product, deployment,\ndecision-register, or global-architecture change is introduced. ARCH-R17, DR-14, and D-372 remain\nunchanged. Supersedes STATE-R63 for the current product-slice position.\n\nSTATE-R63 records formal acceptance of **IMP-029 — Operations Console API** for independently\naccepted `main` SHA `0490a393666a87f5f99cc6d90c99bef18d09c097` and tree\n`4d376d296bd8596c4809fc91331659a2f52e53e6`. Implementation evidence is **COMPLETE**;\nindependent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**.\nIMP-029 is `COMPLETE_AND_ACCEPTED`; architecture remains `ARCHITECTURE_LOCKED`; implementation is\n`AUTHORIZED` / `STARTED` / `COMPLETE` (`IMP-029_ARCHITECTURE_LOCKED: YES`;\n`IMP-029_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-029_STARTED: YES`;\n`IMP-029_IMPLEMENTATION_COMPLETE: YES`; `IMP-029_ACCEPTED: YES`). `acceptedThrough` advances to\nIMP-029; `currentProductSlice` and `pendingAcceptance` are NONE; `nextProductSlice` remains\nIMP-030, `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. D-372 remains CURRENT; ARCH-R17 and DR-14\nremain unchanged. Remote Operations deployment is not proven or claimed. This reconciliation\nintroduces no runtime, schema, migration, or deployment mutation. Supersedes STATE-R62 for the\ncurrent IMP-029 lifecycle and acceptance position.\n\nSTATE-R62 records **IMP-029 — Operations Console API** implementation **STARTED** under prior\nSTATE-R61 authorization and its locked capability architecture. IMP-029 lifecycle is\n`IMPLEMENTATION_IN_PROGRESS`; architecture remains `LOCKED`; implementation is `AUTHORIZED` /\n`STARTED` (`IMP-029_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-029_STARTED: YES`; complete/accepted:\nNO). `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE;\n`currentProductSlice` remains IMP-029; `nextProductSlice` remains IMP-030; and IMP-030 remains\n`PLANNED` / `NOT_ACTIVATED`. This governance-only lifecycle transition records implementation\nstart only and introduces no product source, runtime, schema, migration, permission catalog,\nconfiguration, deployment, decision-register, or global-architecture mutation. D-372 remains\nCURRENT; ARCH-R17 and DR-14 remain unchanged. Supersedes STATE-R61 only for the current IMP-029\nlifecycle position.\n\nSTATE-R61 records explicit Founder authorization for **IMP-029 — Operations Console API**\nimplementation under its locked capability architecture. IMP-029 lifecycle is\n`IMPLEMENTATION_AUTHORIZED`; architecture remains `LOCKED`; implementation is `AUTHORIZED` /\n`NOT_STARTED` (`IMP-029_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-029_STARTED: NO`; complete/accepted:\nNO). `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE;\n`currentProductSlice` remains IMP-029; `nextProductSlice` remains IMP-030; and IMP-030 remains\n`PLANNED` / `NOT_ACTIVATED`. Authorization does not start implementation or create product source,\nruntime, schema, migration, permission catalog, configuration, deployment, decision-register, or\nglobal-architecture mutation. D-372 remains CURRENT; ARCH-R17 and DR-14 remain unchanged.\nSupersedes STATE-R60 only for the current IMP-029 lifecycle position.\n\nSTATE-R60 locks the approved architecture for **IMP-029 — Operations Console API**. It establishes\n`ARCHITECTURE_LOCKED`; architecture = `LOCKED`; capability artifact\n`capabilities/IMP-029-operations-console-api.md`; and binding **D-372** / **ARCH-R17** / **DR-14**.\nImplementation remains `NOT_AUTHORIZED` / `NOT_STARTED`; `acceptedThrough` remains IMP-028D;\n`pendingAcceptance` remains NONE; `currentProductSlice` remains IMP-029; `nextProductSlice` remains\nIMP-030; and IMP-030 remains `PLANNED` / `NOT_ACTIVATED`. It creates no implementation, runtime,\nschema, migration, permission catalog, cookie, or deployment mutation. Supersedes STATE-R59 only\nfor current IMP-029 architecture position.\n\nSTATE-R59 records explicit Founder authorization to activate **IMP-029 — Operations Console API**\nfor architecture work only. It establishes `currentProductSlice = IMP-029`; lifecycle =\n`ARCHITECTURE_IN_PROGRESS`; architecture = `NOT_LOCKED`; implementation = `NOT_AUTHORIZED` /\n`NOT_STARTED`; and `nextProductSlice = IMP-030`. It does **not** claim architecture lock,\nauthorize implementation, claim implementation start, create capability implementation, create\nD-372, change ARCH-R16 or DR-13, change `acceptedThrough`, or create `pendingAcceptance`.\nSupersedes STATE-R58 only for current work-position bookkeeping.\n\nSTATE-R58 records formal acceptance of IMP-028D — Desktop Ordering Continuity after Founder UAT\nPASS on 2026-08-22 for the exact merged-main candidate\n`166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7` / tree\n`eba5f3f7fc25b07581801b53a130fb9547abc459`, with evidence SHA-256\n`715519d51801a10913a71a891af74c68aac1f493088adda43ecbc6a9c8bd5572`. IMP-028D is\n`COMPLETE_AND_ACCEPTED`; architecture remains `ARCHITECTURE_LOCKED`; implementation remains\n`AUTHORIZED` / `STARTED` / `COMPLETE`; `acceptedThrough` advances to IMP-028D;\n`currentProductSlice` and `pendingAcceptance` become NONE. IMP-029 remains `PLANNED` /\n`NOT_STARTED` / `NOT_AUTHORIZED`. D-368 / D-369 / D-370 / D-371, ARCH-R16, and DR-13 remain\nunchanged. This reconciliation introduces no runtime, schema, migration, or product mutation.\nSupersedes STATE-R57 for the current IMP-028D lifecycle and acceptance position.\n\nSTATE-R57 records D-371 Durable Cart Unit Sequence Authority (DR-13 / ARCH-R16 / ARCH-G22) and\nthe bounded IMP-028D RC3 capability amendment. D-371 preserves coalesced Cart-line identity and\nadds future durable per-unit ordering for server-owned product-level decrement. RC3 implementation\nis NOT_STARTED; no application source, schema, migration, transport, or UAT result is claimed by\nthis governance record. Pre-D-371 active-Cart order is not reconstructed; this pre-production\nrollout may expire/rebuild those Carts at migration. D-369 and D-370 remain CURRENT and are not\nsuperseded. IMP-028D remains unaccepted, Founder UAT remains PENDING / NOT RUN, and IMP-029 remains\nNOT_STARTED / NOT_AUTHORIZED. Supersedes STATE-R56 only for current decision/architecture\nreferences.\n\nSTATE-R56 records IMP-028D RC1 implementation completion and promotion evidence: visual review\nPASS; feature commit `2a48e16fabc4b1fe9e86d23c6a3aad6d726b7e6e`; exact-SHA CI run `32458495599`\nSUCCESS; GitHub PR #3; and merge commit `c4d262b78f3a7f65808155634cc2745236c38b7c` on `main`.\nArchitecture remains `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` /\n`COMPLETE` with `IMP-028D_IMPLEMENTATION_COMPLETE: YES` and `IMP-028D_ACCEPTED: NO`; lifecycle is\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. `acceptedThrough` remains IMP-028C;\n`currentProductSlice` remains IMP-028D; `pendingAcceptance` becomes IMP-028D; and\n`nextProductSlice` remains IMP-029. Founder UAT is required and PENDING / NOT RUN. No UAT build,\ndeployment, Founder UAT result, or acceptance is claimed. The prior Founder UAT FAIL, technical\npre-UAT blocker, and RC1 amendment history remain preserved. ARCH-R15, DR-12, D-368, D-369, and\nD-370 remain unchanged; D-371 remains unused. Supersedes STATE-R55 for the current IMP-028D\nlifecycle position.\n\nSTATE-R55 records founder approval and capability-local re-lock of the IMP-028D RC1 interaction\narchitecture. Explicit selected-category state supersedes the prior all-root-category sections and\n`IntersectionObserver` scroll-spy presentation model for IMP-028D. The bounded desktop Cart item\nlist is the sole authorized nested vertical scroll region; category rail and Menu remain without\nnested vertical scrolling. Implementation is reopened as `IMPLEMENTATION_IN_PROGRESS` and remains\n`AUTHORIZED` / `STARTED` with `IMP-028D_IMPLEMENTATION_COMPLETE: NO` and\n`IMP-028D_ACCEPTED: NO`. `acceptedThrough` remains IMP-028C; `currentProductSlice` remains\nIMP-028D; `pendingAcceptance` returns to NONE; and `nextProductSlice` remains IMP-029. Founder UAT\nfor RC1 is PENDING / NOT RUN. Prior Founder UAT failure and technical-preview evidence are\npreserved. ARCH-R15, DR-12, D-368, D-369, and D-370 remain unchanged; D-371 remains unused.\nSupersedes STATE-R54 for the current IMP-028D lifecycle position.\n\nSTATE-R54 records completion of the bounded IMP-028D `IntersectionObserver` root-margin correction.\nThe unsupported `-7rem 0px -55% 0px` is now `-112px 0px -55% 0px`, preserving the intended 7rem\nsticky-header offset at the standard 16px root size. Regression and deterministic validation pass;\nsource implementation commit is `259d27d`. Architecture remains `ARCHITECTURE_LOCKED`;\nimplementation is `AUTHORIZED` / `STARTED` / `COMPLETE` with\n`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; lifecycle is\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. `acceptedThrough` remains IMP-028C;\n`currentProductSlice` remains IMP-028D; `pendingAcceptance` becomes IMP-028D;\n`nextProductSlice` remains IMP-029; `IMP-028D_ACCEPTED: NO`; and Founder UAT remains PENDING / NOT\nRUN. D-371 remains unused; IMP-029 remains planned, not started, and not authorized. Supersedes\nSTATE-R53 for the current IMP-028D lifecycle position.\n\nSTATE-R53 reopens IMP-028D for an authorized, bounded technical correction after the UAT deployment\nat `365019e0e64e2d855298c714d3c65671183303b1` reached healthy APIs but browser rendering failed\nbefore freeze. The browser rejected `IntersectionObserver` `rootMargin: \"-7rem 0px -55% 0px\"`.\nFounder UAT did not occur and this is not a Founder UAT failure. Architecture remains\n`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` with\n`IMP-028D_IMPLEMENTATION_COMPLETE: NO`; lifecycle is `IMPLEMENTATION_IN_PROGRESS`.\n`acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;\n`pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029; and\n`IMP-028D_ACCEPTED: NO`. D-371 remains unused; IMP-029 remains planned, not started, and not\nauthorized. Supersedes STATE-R52 for the current IMP-028D lifecycle position.\n\nSTATE-R52 records the final customer-copy correction in the completed IMP-028D rework: delivery-PIN\nresult copy no longer exposes checkout implementation wording. The exact updated rework tip was\nrevalidated before the next UAT candidate is built. Current lifecycle remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with `pendingAcceptance = IMP-028D`; the prior UAT\nFAIL remains preserved and the new Founder UAT is PENDING. No acceptance is claimed. Supersedes\nSTATE-R51 for the current IMP-028D implementation evidence only; product acceptance through\nIMP-028C, IMP-029 status, and D-371 remain unchanged.\n\nSTATE-R51 records deterministic completion of the bounded IMP-028D Founder-UAT rework.\nArchitecture remains `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` /\n`COMPLETE` (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`); lifecycle is\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. `acceptedThrough` remains IMP-028C;\n`currentProductSlice` remains IMP-028D; `pendingAcceptance` becomes IMP-028D; and\n`nextProductSlice` remains IMP-029. The prior Founder UAT FAIL remains preserved; new founder UAT\nis PENDING and has not been performed or passed. D-371 remains unused; IMP-029 remains planned,\nnot started, and not authorized. This record does not claim acceptance. Supersedes STATE-R50 for\nthe current IMP-028D lifecycle position.\n\nSTATE-R50 records the Founder UAT **FAIL** for IMP-028D against frozen candidate source\n`38fa04db9d81e47efeb0702037a0e7ee9371a28d` / tree\n`c91e51150461251470791f830293e49931f91cfa` (UAT project `boba-bear-imp028d-uat`, URL\n`http://127.0.0.1:18084`, freeze `2026-08-20T18:38:17Z`, Podman runtime overlay SHA256\n`6d830835924027e719516de1d7aa41b7545965b8c7705298924b3bf3f3eb21ec). The failure is factual\nrework evidence, not acceptance. IMP-028D returns to `IMPLEMENTATION_IN_PROGRESS`; architecture\nremains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` with\n`IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`. `acceptedThrough` remains\nIMP-028C; `currentProductSlice` remains IMP-028D; `pendingAcceptance` is NONE; and\n`nextProductSlice` remains IMP-029. A new exact candidate and founder UAT are required before any\nacceptance reconciliation. D-371 remains unused; IMP-029 remains planned, not started, and not\nauthorized. Supersedes STATE-R49 for the current IMP-028D lifecycle position.\n\nSTATE-R49 records IMP-028D — Desktop Ordering Continuity implementation complete pending\nindependent acceptance and required founder UAT. Architecture remains `ARCHITECTURE_LOCKED`;\nimplementation was recorded as `AUTHORIZED` / `STARTED` / `COMPLETE` before the founder-UAT\nrework (the completion is superseded by STATE-R50; `IMP-028D_ACCEPTED: NO`); lifecycle was\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. `acceptedThrough` remains IMP-028C;\n`currentProductSlice` remains IMP-028D; `pendingAcceptance` becomes IMP-028D; and\n`nextProductSlice` remains IMP-029. `IMP-028D_FOUNDER_UAT_REQUIRED: YES`; founder UAT is\n`PENDING` and has not been performed or passed. Technical evidence is implementation commit\n`795bb3151e3a24d5914160d232f099016d880a2b`, reconciled CI candidate\n`499e9249e3c46d76e382c8c91740b49253b54a19`, PR #1, CI run `32395774250` (SUCCESS), and merge\ncommit `ba1b0864fe39aefe3b20b0da1c2c039eff020998`. IMP-029 remains planned, not started, and not\nimplementation-authorized. D-371 remains unused. This record does not claim independent\nacceptance, founder UAT, formal acceptance, a new decision, or global-architecture change.\n\nSTATE-R48 records explicit founder/task authorization to implement IMP-028D — Desktop Ordering\nContinuity under the locked capability architecture. Implementation is `AUTHORIZED` / `STARTED`\n(`IMP-028D_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028D_IMPLEMENTATION_STARTED: YES`;\n`IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`; lifecycle\n`IMPLEMENTATION_IN_PROGRESS`). `acceptedThrough` remains IMP-028C; `currentProductSlice` remains\nIMP-028D; `pendingAcceptance` remains NONE; and `nextProductSlice` remains IMP-029. IMP-029 remains\nplanned, not started, and not implementation-authorized. D-368 / D-369 / D-370 remain CURRENT\nexisting authorities; D-371 remains unused. This authorization does not mark IMP-028D complete or\naccepted, and does not change decision register or global architecture.\n\nSTATE-R47 records bounded canonical activation of IMP-028D — Desktop Ordering Continuity. Its\ncapability architecture is `ARCHITECTURE_LOCKED`; implementation remains `NOT_AUTHORIZED` /\n`NOT_STARTED` (`IMP-028D_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028D_IMPLEMENTATION_STARTED: NO`;\n`IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`). `acceptedThrough` remains\nIMP-028C; `currentProductSlice` is IMP-028D; `pendingAcceptance` is NONE; and\n`nextProductSlice` remains IMP-029. IMP-029 remains planned, not started, and not\nimplementation-authorized. D-368 / D-369 / D-370 remain CURRENT existing authorities; D-371\nremains unused. This activation authorizes no application implementation and changes no runtime,\nAPI, schema, migration, pricing authority, decision register, or global architecture.\n\nThe Accepted Technical Inventory snapshot below was last independently verified through IMP-028C\nand includes accepted IMP-027 / IMP-028 schema through migration\n`0029_refund_statutory_issuance_allocation`. IMP-028D acceptance does not reinterpret those\nsnapshot metrics; its exact accepted candidate and lifecycle are recorded above.\n\n```text\nLOCAL_RAZORPAY_GTM_VALIDATION: PASS\nEXTERNAL_ACCEPTANCE_GAP: NONE\nIMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED\nIMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED\nDEFERRED_EXTERNAL_GATE: NO\nSATISFIED: YES\nPROVIDER_ORIGINATED_WEBHOOK: VALIDATED_PUBLIC_HTTPS_TEST_MODE\n```\n\nIndependent IMP-026 external Razorpay webhook acceptance (Test Mode; no Live Mode; no real money):\n\n```text\nRazorpay mode: TEST\nPublic webhook endpoint: POST https://cradling-unenvied-sapling.ngrok-free.dev/api/integrations/payments/razorpay/webhook\nBOBA Checkout ID: 7f53816c-e72c-41b6-800f-fe38d97b1e1f\nBOBA Payment ID: 5c93bb80-5f52-458f-a8a1-eae356d28956\nBOBA Order: ORD-3ZGDJVFQRXHB (PLACED)\nRazorpay Order: order_TR8lqo2solrrHR\nRazorpay Payment: pay_TR8m5IrbnKkFN1\nRazorpay events (HTTP 200): TR8mAZTG4riBtP payment.authorized; TR8mBaitTRKpLl payment.captured; TR8mC6zOM2E2p2 order.paid\nFinal BOBA state: Payment SUCCEEDED; Checkout COMPLETED; Order PLACED\nSignature validation: PASS\nInvalid-signature fail-closed: PASS (HTTP 400; no inbox/commercial side effect)\nExact signed-event replay: PASS (one durable inbox identity; no duplicate Payment; no duplicate commercial effect)\nAutomated tests: test:payment-razorpay 32/32 PASS; razorpay.http.integration 4/4 PASS\n```\n\nPrior manual real Razorpay Test payment verification remains on record (provider `captured`; BOBA\nPayment `SUCCEEDED`; exactly one BOBA Order; confirmation/history/detail passed; provider\nreconciliation and automatic capture passed; no duplicate Order / duplicate provider effect; no\narchitecture drift). Local signed webhook pipeline tests remain valid engineering evidence but are\nnot provider-originated webhook proof. Do not store webhook secrets, API secrets, session tokens,\ncard data, or unnecessary customer PII in repository governance records.\n\nVerified payment (prior governance input; retained for reconstruction):\n\n```text\nBOBA Payment ID: a4d146c0-4363-4c83-8b0d-b8b6b7be9938\nprovider: razorpay\nRazorpay Order: order_TPcvA3aIZtLpQ0\nRazorpay Payment: pay_TPcvL1mni4ACtw\namount: 54390 paise INR\nBOBA Order: ORD-B4CDRNQSBJSE (PLACED; exactly one)\n```\n\nCurrent V1 payment provider is **Razorpay** (**D-361**). Razorpay webhook acknowledgement / missing-Order\nrecovery is **D-362**. Razorpay durable webhook inbox / asynchronous Payment processing is **D-363**.\nRefund Foundation architecture is **D-364**. Financial Document architecture is **D-365**.\nRefund statutory-reversal decision authority is **D-366** (CURRENT; refund statutory reversal\nworkflow accepted under the locked IMP-028 capability). Statutory financial-document signing and\nsigned-artifact authority is **D-367** (CURRENT; attended-async manual signed-PDF MVP accepted;\nunattended DSC/eSign/HSM remains deferred and is not authorized by this acceptance). Customer Menu\nread-projection serving is **D-368** (CURRENT architecture; implemented and accepted under IMP-028B;\nthe static `ordering-catalog.json` artifact is no longer the customer storefront runtime source).\nCustomer paid-modifier\nexplicit selection is **D-369** (CURRENT business-commerce policy; implementation not authorized;\nCart/Checkout Snapshot/pricing authority unchanged). Cart identity transition is **D-370**\n(CURRENT purchase-intent and privacy policy; implementation not authorized; Cart/Checkout Snapshot\nauthority unchanged).\n\n```text\nPAYMENT_RECEIPT_VOUCHER_WORKFLOW: COMPLETE\nORDER_TAX_INVOICE_WORKFLOW: COMPLETE\nREFUND_STATUTORY_REVERSAL_WORKFLOW: ACCEPTED\nFD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE\nSIGNATURE_COMPLIANCE: ATTENDED_ASYNC_MVP_ACCEPTED\nPRE_EXISTING_IMP028_COMPLIANCE_DEFECT: NO\nIMP-028_ACCEPTED: YES\n```\n\n`PRE_EXISTING_IMP028_COMPLIANCE_DEFECT` is closed as an IMP-028 completion/acceptance blocker.\nUnattended signing and production GST/accountant configuration remain deferred deployment /\nlater-slice matters, not reopenings of D-365 / D-366 / D-367.\n\nBinding payment semantics preserved for IMP-027: a Payment that reached BOBA success from provider\n`captured` remains successful original collection truth even if the provider later reports a\nrefund. Refund must not rewrite that truth. Refund is now formally accepted under the locked\ncapability artifact; it must not rewrite Payment collection truth. IMP-028 Financial Document\nacceptance does not rewrite Payment, Refund, or Order authorities.\n\n`governanceHealth = ALIGNED` records independent acceptance through IMP-028D.\nImplementation agents must not self-promote this field or mark later slices accepted.\n\n## 3. Accepted Technical Inventory\n\nIndependently verified from repository evidence on 2026-08-18 (authority path\n`/home/ajoshi/repos/boba-bear-website-acceptance`), including IMP-026, IMP-027, IMP-028, and\nIMP-028A independent acceptance.\nSpeculative values are forbidden here.\n\n| Metric | Verified value | How verified |\n|---|---|---|\n| Latest migration | `0029_refund_statutory_issuance_allocation` | `drizzle/meta/_journal.json` entry tag; `drizzle/0029_refund_statutory_issuance_allocation.sql` present |\n| Migration count | `30` | Count of accepted migrations through IMP-028 (0000–0029) |\n| Application tables | `108` | Count of `appSchema.table(` declarations under `src/platform/database/schema/` bounded to accepted IMP-028 schema |\n| Workforce permissions | `57` | `PERMISSION_KEYS.length` in `src/shared/access-control/catalog.ts` |\n| System roles | `7` | `ROLE_KEYS.length` in `src/shared/access-control/catalog.ts` |\n| Default Docker services | `5` | Compose services without `profiles: [\"tools\"]`: `postgres`, `app`, `customer-auth`, `workforce-auth`, `customer-commerce` |\n| Order-owned tables | `1` | `orders` in `src/platform/database/schema/order.ts` |\n| Order snapshot/history tables | `0` | No additional Order snapshot/event tables in schema |\n| IMP-023 new production runtime dependencies | `0` | No Order-domain production dependency addition beyond prior accepted baseline |\n| IMP-026 new production runtime dependencies | `0` | Razorpay adapter behind existing `PaymentProvider`; no new deployable service |\n| Payment provider event inbox table | `1` | `payment_provider_event_inbox` in `src/platform/database/schema/payment.ts` |\n| Public web mode | Next.js static export → Nginx | `next.config.ts` `output: \"export\"`; `docker/nginx/nginx.conf`; no production `src/app/api` commerce tree |\n| IMP-024 architecture artifact | present | `docs/platform/capabilities/IMP-024-customer-ordering-transport.md` |\n| IMP-024 runtime Compose service | present | `customer-commerce` internal `:8083`; Nginx `/api/v1/*` (D-359) |\n| IMP-025 architecture artifact | present | `docs/platform/capabilities/IMP-025-customer-ordering-ux.md` |\n| IMP-025 static ordering catalog | present | `src/data/ordering-catalog.json` deterministic projection from existing-menu-v1; retained for legitimate transitional/import/test purposes, not the customer storefront runtime source |\n| IMP-026 architecture artifact | present | `docs/platform/capabilities/IMP-026-razorpay-productionization.md` |\n| IMP-026 payment inbox migration | `0018_payment_provider_event_inbox` | `drizzle/0018_payment_provider_event_inbox.sql` present in accepted journal |\n| IMP-026C architecture artifact | present | `docs/platform/capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md` |\n| IMP-027 architecture artifact | present | `docs/platform/capabilities/IMP-027-refund-foundation.md` |\n| IMP-027 refund migration | `0019_refund` | `drizzle/0019_refund.sql` present in accepted journal |\n| IMP-028 architecture artifact | present | `docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md` |\n| IMP-028 financial-document / statutory migrations | `0020`–`0029` | Journal tags `0020_financial_document` through `0029_refund_statutory_issuance_allocation` |\n| IMP-028A architecture artifact | present | `docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md` |\n| IMP-028B canonical capability artifact | present | `docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md` |\n\nDefault Docker topology (accepted runtime inventory):\n\n```text\npostgres\napp\ncustomer-auth\nworkforce-auth\ncustomer-commerce\n```\n\nAccepted IMP-024 transport (D-359):\n\n```text\ncustomer-commerce   (internal :8083; Nginx /api/v1/*)\n```\n\nDomain authority chain (accepted):\n\n```text\nCart → Checkout → Payment → Order\n(+ Refund; + Financial Document / RefundStatutoryDecision / SignatureArtifact)\n```\n\n| Domain | Authority |\n|---|---|\n| Cart | Mutable shopping intent |\n| Checkout Snapshot | Immutable accepted commercial transaction |\n| Payment | Original financial collection truth |\n| Order | Post-purchase business lifecycle truth (`PLACED` \\| `ACCEPTED` \\| `FULFILLED` \\| `CANCELLED`) |\n| Refund | Financial reversal truth for returned funds (D-364) |\n| Financial Document | Immutable issued statutory / financial-document truth (D-365) |\n| RefundStatutoryDecision | Durable statutory-reversal classification for a PROCESSED Refund (D-366) |\n| SignatureArtifact | Durable signature state and exact-byte signed statutory artifact (D-367) |\n| Customer Menu Projection | CURRENT storefront READ MODEL (D-368); implemented and accepted under IMP-028B; not a new commercial authority |\n| Customer paid-modifier purchase intent | CURRENT policy (D-369); positive-price modifier requires explicit current-interaction selection; implementation authorized only for IMP-028C; live import `modifier_groups: 0` |\n| Cart identity transition | CURRENT policy (D-370); guest→customer compatible merge and logout customer-cart isolation; implementation not authorized |\n\n## 4. Accepted Capability Ledger\n\n| IMP | Capability | Status |\n|---|---|---|\n| IMP-001 | Behaviour-preserving `src/` migration | COMPLETE_AND_ACCEPTED |\n| IMP-002 | Test and quality-tooling foundation | COMPLETE_AND_ACCEPTED |\n| IMP-003 | Configuration and startup foundation | COMPLETE_AND_ACCEPTED |\n| IMP-004 | PostgreSQL + Drizzle foundation | COMPLETE_AND_ACCEPTED |\n| IMP-005 | Database test and migration validation | COMPLETE_AND_ACCEPTED |\n| IMP-005A | Dockerized local application runtime | COMPLETE_AND_ACCEPTED |\n| IMP-006 | Shared persistence primitives | COMPLETE_AND_ACCEPTED |\n| IMP-007 | Transactional outbox and idempotency foundation | COMPLETE_AND_ACCEPTED |\n| IMP-008 | Better Auth persistence and sessions | COMPLETE_AND_ACCEPTED |\n| IMP-009 | Customer phone OTP authentication | COMPLETE_AND_ACCEPTED |\n| IMP-010 | Workforce authentication + MFA | COMPLETE_AND_ACCEPTED |\n| IMP-011 | Organization / Territory / Outlet / scoped RBAC | COMPLETE_AND_ACCEPTED |\n| IMP-012 | Canonical catalog | COMPLETE_AND_ACCEPTED |\n| IMP-013 | Existing menu import + menu presentation | COMPLETE_AND_ACCEPTED |\n| IMP-014 | Assortment + operational availability | COMPLETE_AND_ACCEPTED |\n| IMP-015 | Pricing, charges and GST/tax engine | COMPLETE_AND_ACCEPTED |\n| IMP-016 | Promotions | COMPLETE_AND_ACCEPTED |\n| IMP-017 | Customer Profiles | COMPLETE_AND_ACCEPTED |\n| IMP-018 | Saved Customer Addresses | COMPLETE_AND_ACCEPTED |\n| IMP-019 | Serviceability | COMPLETE_AND_ACCEPTED |\n| IMP-020 | Cart | COMPLETE_AND_ACCEPTED |\n| IMP-021 | Checkout | COMPLETE_AND_ACCEPTED |\n| IMP-022 | Payment | COMPLETE_AND_ACCEPTED |\n| IMP-023 | Order | COMPLETE_AND_ACCEPTED |\n| IMP-024 | Customer Ordering Transport / API | COMPLETE_AND_ACCEPTED |\n| IMP-025 | Customer Ordering UX | COMPLETE_AND_ACCEPTED |\n| IMP-026 | Razorpay Productionization & Payment GTM Readiness | COMPLETE_AND_ACCEPTED |\n| IMP-026C | Pilot Customer-Commerce UX Hardening | COMPLETE_AND_ACCEPTED |\n| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |\n| IMP-028 | Invoice / Tax Receipt / Credit Note | COMPLETE_AND_ACCEPTED |\n| IMP-028A | Food Direct UX Foundation | COMPLETE_AND_ACCEPTED |\n| IMP-028B | Customer Menu Projection + Discovery | COMPLETE_AND_ACCEPTED |\n| IMP-028C | Food Customization | COMPLETE_AND_ACCEPTED |\n| IMP-028D | Desktop Ordering Continuity | COMPLETE_AND_ACCEPTED |\n| IMP-029 | Operations Console API | COMPLETE_AND_ACCEPTED |\n\n## 5. Acceptance Position\n\n```text\nacceptedThrough: IMP-029\npendingAcceptance: NONE\ncurrentProductSlice: IMP-030\nnextProductSlice: IMP-031 — Provider-Neutral Delivery Foundation\nFOUNDER_UAT: PASS\nFOUNDER_UAT_REQUIRED: YES\nFOUNDER_UAT_COMPLETE: YES\nFOUNDER_UAT_DECISION_DATE: 2026-08-22\nFOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder\nFOUNDER_UAT_CANDIDATE_REF: main\nFOUNDER_UAT_CANDIDATE_HEAD: 166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7\nFOUNDER_UAT_CANDIDATE_TREE: eba5f3f7fc25b07581801b53a130fb9547abc459\nFOUNDER_UAT_EVIDENCE_SHA256: 715519d51801a10913a71a891af74c68aac1f493088adda43ecbc6a9c8bd5572\nIMP-028: COMPLETE_AND_ACCEPTED\nIMP-028_ACCEPTED: YES\nIMP-028A: COMPLETE_AND_ACCEPTED\nIMP-028A_ARCHITECTURE_LOCKED: YES\nIMP-028A_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028A_IMPLEMENTATION_STARTED: YES\nIMP-028A_IMPLEMENTATION_COMPLETE: YES\nIMP-028A_ACCEPTED: YES\nIMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP028A_FORMAL_ACCEPTANCE: ACCEPTED\nIMP-028B: COMPLETE_AND_ACCEPTED\nIMP-028B_ARCHITECTURE_LOCKED: YES\nIMP-028B_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028B_IMPLEMENTATION_STARTED: YES\nIMP-028B_IMPLEMENTATION_COMPLETE: YES\nIMP-028B_ACCEPTED: YES\nIMP-028C: COMPLETE_AND_ACCEPTED\nIMP-028C_ARCHITECTURE_LOCKED: YES\nIMP-028C_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028C_IMPLEMENTATION_STARTED: YES\nIMP-028C_IMPLEMENTATION_COMPLETE: YES\nIMP-028C_ACCEPTED: YES\nIMP-028D: COMPLETE_AND_ACCEPTED\nIMP-028D_ARCHITECTURE_LOCKED: YES\nIMP-028D_IMPLEMENTATION_AUTHORIZED: YES\nIMP-028D_IMPLEMENTATION_STARTED: YES\nIMP-028D_IMPLEMENTATION_COMPLETE: YES\nIMP-028D_ACCEPTED: YES\nIMP-029: COMPLETE_AND_ACCEPTED\nIMP-029_ARCHITECTURE: LOCKED\nIMP-029_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE\nIMP-029_IMPLEMENTATION_AUTHORIZED: YES\nIMP-029_STARTED: YES\nIMP-029_IMPLEMENTATION_COMPLETE: YES\nIMP-029_ACCEPTED: YES\nIMP029_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP029_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP029_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP029_FORMAL_ACCEPTANCE: ACCEPTED\nIMP029_ACCEPTED_MAIN_SHA: 0490a393666a87f5f99cc6d90c99bef18d09c097\nIMP029_ACCEPTED_TREE: 4d376d296bd8596c4809fc91331659a2f52e53e6\nREMOTE_OPERATIONS_DEPLOYMENT_PROVEN: NO\nTYPECHECK_STATUS: FAIL_PRE_EXISTING_UNRELATED\nCUSTOMER_ORDERING_E2E: BLOCKED_ENVIRONMENT\nCUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT: YES\nRELEVANT_REGRESSION_TESTS: PASS_WITH_ENVIRONMENT_LIMITATION\nIMP-030: IMPLEMENTATION_IN_PROGRESS\nIMP-030_ARCHITECTURE: LOCKED\nIMP-030_ARCHITECTURE_LOCKED: YES\nIMP-030_IMPLEMENTATION: AUTHORIZED / STARTED\nIMP-030_IMPLEMENTATION_AUTHORIZED: YES\nIMP-030_STARTED: YES\nIMP-030_IMPLEMENTATION_COMPLETE: NO\nIMP-030_ACCEPTED: NO\n```\n\nIndependent acceptance of IMP-028A **is** claimed and formally reconciled\n(`COMPLETE_AND_ACCEPTED`; architecture locked; implementation AUTHORIZED / STARTED / COMPLETE;\n`IMP-028A_ARCHITECTURE_LOCKED: YES`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;\n`IMP-028A_ACCEPTED: YES`). `acceptedThrough` advances to IMP-028A. After IMP-028A acceptance,\n`pendingAcceptance=NONE`. GTM-R38 / STATE-R36 later set `currentProductSlice=IMP-028B` without\nplacing IMP-028B in pending acceptance. GTM-R39 / STATE-R37 lock IMP-028B architecture and\nauthorize implementation without starting it or placing it in pending acceptance. `nextProductSlice=IMP-029` remains\nnext-planned GTM bookkeeping only. IMP-029 remains not started and is **not**\nimplementation-authorized. Formal acceptance of IMP-028A does not authorize IMP-029, implement\nD-368 / D-369 / D-370, create `D-371`, or implement Capability B. Canonical activation of\nIMP-028B does not start IMP-029. Architecture lock / implementation authorization of IMP-028B\ndoes not start product implementation.\n\nIndependent IMP-028A acceptance preserved these non-blocking limitations (not IMP-028A defects;\nnot rewritten as full-suite success): whole-repo TypeScript / Next typecheck remains blocked by\npre-existing financial-document/refund BigInt + ES2017 issues; full customer-ordering E2E was\nblocked by occupied fixed port 8183; alternative regression evidence was independently judged\nsufficient.\n\nSTATE-R37 records IMP-028B architecture lock and implementation authorization\n(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;\n`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`; `currentProductSlice = IMP-028B`).\n`acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains\nIMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register\nremains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.\nAuthorization does not start product implementation, implement D-369 / D-370, create `D-371`, or\nretarget IMP-029. Supersedes STATE-R36 for current IMP-028B lifecycle position. Product acceptance\nthrough IMP-028A is unchanged.\n\nSTATE-R36 records canonical activation of IMP-028B — Customer Menu Projection + Discovery\n(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;\n`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;\n`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`; `currentProductSlice = IMP-028B`).\n`acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains\nIMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register\nremains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.\n\nSTATE-R35 records independent acceptance of IMP-028A (`COMPLETE_AND_ACCEPTED`;\n`IMP-028A_ACCEPTED: YES`; `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`;\n`currentProductSlice = NONE`). `nextProductSlice` remains IMP-029. IMP-029 remains not started\nand is not implementation-authorized. Decision register remains DR-12. Global architecture remains\nARCH-R15. Next free decision remains **D-371**.\n\nSTATE-R34 records IMP-028A implementation complete pending independent acceptance\n(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;\n`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `currentProductSlice = IMP-028A`;\n`pendingAcceptance = IMP-028A`). `acceptedThrough` remained IMP-028. `nextProductSlice` remains\nIMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register\nremains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.\nProduct acceptance through IMP-028 was unchanged. Formal acceptance of IMP-028A was **not** then\nclaimed.\n\nSTATE-R33 records IMP-028A architecture lock and implementation authorization\n(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`).\n`acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` is\nIMP-028A. `nextProductSlice` remains IMP-029. Decision register remains DR-12. Global architecture\nremains ARCH-R15. Next free decision remains **D-371**. Product acceptance through IMP-028 is\nunchanged.\n\nSTATE-R32 records canonical activation of IMP-028A — Food Direct UX Foundation (`PLANNED` /\n`NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`). `acceptedThrough` remains IMP-028.\n`pendingAcceptance` remains NONE. `currentProductSlice` is IMP-028A. `nextProductSlice` remains\nIMP-029. Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision\nremains **D-371**. Product acceptance through IMP-028 is unchanged.\n\nSTATE-R31 records binding **D-370** (Cart Identity Transition Authority). Decision register is\nDR-12. Global architecture is ARCH-R15. Next free decision is **D-371**. Product-slice position is\nunchanged.\n\nSTATE-R30 records binding **D-369** (Customer Paid Modifier Explicit Selection Authority). Decision\nregister is DR-11. Global architecture is ARCH-R14. Next free decision is **D-370**. Product-slice\nposition is unchanged.\n\nSTATE-R29 records binding **D-368** (Customer Menu Read Projection Authority). Decision register\nis DR-10. Global architecture is ARCH-R13. Next free decision is **D-369**. Product-slice position\nis unchanged.\n\n## 6. Known Governance Conflicts\n\nSTATE-R41 reconciles stale present-tense IMP-028B lifecycle assertions with the already-settled\nSTATE-R40 acceptance record. It makes no new acceptance, architecture, product, or decision-register\ndecision. IMP-028B remains `COMPLETE_AND_ACCEPTED` (`IMP-028B_ACCEPTED: YES`; `acceptedThrough =\nIMP-028B`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`); IMP-029 remains planned, not\nstarted, and not implementation-authorized. D-368 / D-369 / D-370 remain CURRENT and D-371 remains\nunused.\n\nSTATE-R40 records IMP-028B — Customer Menu Projection + Discovery `COMPLETE_AND_ACCEPTED` after\nthe already-passing independent technical acceptance and founder UAT PASS for the exact candidate:\n`/home/ajoshi/repos/boba-bear-platform`; `main`; HEAD\n`ddca0c319a5e80b2cfe38a2c32481b636277010e`; working-tree fingerprint\n`1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7`.\nArchitecture remains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` /\n`COMPLETE`; `IMP-028B_ACCEPTED: YES`. `acceptedThrough` advances to IMP-028B;\n`pendingAcceptance=NONE`; `currentProductSlice=NONE`; `nextProductSlice=IMP-029`. IMP-029 remains\nplanned, not started, and not implementation-authorized. D-369 / D-370 remain unimplemented;\nD-371 remains unused. Decision register remains DR-12 and global architecture remains ARCH-R15.\nSupersedes STATE-R39 for the current lifecycle position.\n\nGovernance installation conflicts identified at STATE-R1 publication are closed by independent\nacceptance:\n\n- Competing historical roadmap meanings in `implementation-roadmap.md` (GTM-R1) — marked\n  SUPERSEDED by [`ROADMAP.md`](./ROADMAP.md).\n- ADR-014 Route-Handler-as-canonical HTTP boundary — superseded for CURRENT transport policy by\n  [`decision-register.md`](./decision-register.md) decision **D-356**, with IMP-024 topology\n  decided by **D-359**.\n- ADR-010 detailed kitchen states vs accepted IMP-023 Order lifecycle — clarified by **D-357**.\n- Historical role-count prose (six roles) vs accepted inventory (seven) — clarified by **D-358**;\n  current inventory is owned by this STATE document and code.\n\nSTATE-R37 records IMP-028B architecture lock and implementation authorization\n(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;\n`currentProductSlice = IMP-028B`). `acceptedThrough` remains IMP-028A. `pendingAcceptance` is NONE.\n`nextProductSlice` is IMP-029. IMP-029 remains not started and is not implementation-authorized.\nDecision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n**D-371**. Authorization does not start product implementation, implement D-369 / D-370, create\n`D-371`, or retarget IMP-029. Supersedes STATE-R36 for current IMP-028B lifecycle position. Product\nacceptance through IMP-028A is unchanged.\nSTATE-R36 records canonical activation of **IMP-028B — Customer Menu Projection + Discovery**\n(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;\n`currentProductSlice = IMP-028B`). `acceptedThrough` remains IMP-028A. `pendingAcceptance` is NONE.\n`nextProductSlice` is IMP-029. IMP-029 remains not started and is not implementation-authorized.\nDecision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains\n**D-371**. Canonical activation does not lock architecture, authorize implementation, implement\nD-368 / D-369 / D-370, create `D-371`, or retarget IMP-029. Supersedes STATE-R35 for current\nproduct-slice position. Product acceptance through IMP-028A is unchanged.\nSTATE-R35 records independent acceptance of IMP-028A — Food Direct UX Foundation\n(`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`). Architecture remains `ARCHITECTURE_LOCKED`.\n`acceptedThrough` advances to IMP-028A. `pendingAcceptance` is NONE. `currentProductSlice` is\nNONE. `nextProductSlice` is IMP-029. IMP-029 remains not started and is not\nimplementation-authorized. Decision register remains DR-12. Global architecture remains ARCH-R15.\nNext free decision remains **D-371**. Known typecheck and customer-ordering E2E limitations remain\npre-existing / environment, not IMP-028A defects. Supersedes STATE-R34 for current accepted\nposition.\nSTATE-R34 records IMP-028A — Food Direct UX Foundation implementation complete pending independent\nacceptance (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;\n`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `currentProductSlice = IMP-028A`;\n`pendingAcceptance = IMP-028A`). Formal acceptance of IMP-028A was **not** then claimed.\n`acceptedThrough` remained IMP-028. `nextProductSlice` remains IMP-029. IMP-029 remains not started\nand is not implementation-authorized. Decision register remains DR-12. Global architecture remains\nARCH-R15. Next free decision remains **D-371**. Supersedes STATE-R33 for then-current IMP-028A\nlifecycle position. Product acceptance through IMP-028 is unchanged.\nSTATE-R33 records IMP-028A — Food Direct UX Foundation architecture lock and implementation\nauthorization (`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`;\n`currentProductSlice = IMP-028A`). `acceptedThrough` remains IMP-028. `pendingAcceptance` remains\nNONE. `nextProductSlice` remains IMP-029. IMP-029 remains not started and is not\nimplementation-authorized. Decision register remains DR-12. Global architecture remains ARCH-R15.\nNext free decision remains **D-371**. Supersedes STATE-R32 for then-current IMP-028A lifecycle\nposition. Product acceptance through IMP-028 is unchanged.\nSTATE-R32 records canonical activation of **IMP-028A — Food Direct UX Foundation** (`PLANNED` /\n`NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`; `currentProductSlice = IMP-028A`).\n`acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `nextProductSlice` remains\nIMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register\nremains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.\nSupersedes STATE-R31 for current product-slice position. Product acceptance through IMP-028 is\nunchanged.\nSTATE-R31 records binding **D-370** — Cart Identity Transition Authority (`CURRENT`; guest→customer\ncompatible purchase-intent merge required; silent whole-cart winner forbidden; logout isolates the\nbrowser from the customer Cart without deleting it; implementation NOT_AUTHORIZED). Cart remains\npurchase intent. Checkout Snapshot remains authoritative payable truth. `acceptedThrough` remains\nIMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains NONE. `nextProductSlice`\nremains IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register\nis DR-12. Global architecture is ARCH-R15 (ARCH-G21). Next free decision is **D-371**. Supersedes\nSTATE-R30 for current governance/architecture position. Product acceptance through IMP-028 is\nunchanged.\nSTATE-R30 records binding **D-369** — Customer Paid Modifier Explicit Selection Authority\n(`CURRENT`; positive-price modifier requires explicit current-interaction selection before entering\nCart purchase intent; implementation NOT_AUTHORIZED). Zero-price standard defaults MAY be visibly\npreselected. Cart remains purchase intent. Checkout Snapshot remains authoritative payable truth.\nLive import currently has `modifier_groups: 0`. `acceptedThrough` remains IMP-028.\n`pendingAcceptance` remains NONE. `currentProductSlice` remains NONE. `nextProductSlice` remains\nIMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register is\nDR-11. Global architecture is ARCH-R14 (ARCH-G20). Next free decision is **D-370**. Supersedes\nSTATE-R29 for current governance/architecture position. Product acceptance through IMP-028 is\nunchanged.\nSTATE-R29 records binding **D-368** — Customer Menu Read Projection Authority (`CURRENT`; TARGET\ncustomer Menu serving architecture; implementation NOT_AUTHORIZED). Static `ordering-catalog.json`\nremains TRANSITIONAL CURRENT storefront delivery. Accepted IMP-025 implementation is not\ninvalidated. `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE.\n`currentProductSlice` remains NONE. `nextProductSlice` remains IMP-029. IMP-029 remains not started\nand is not implementation-authorized. Decision register is DR-10. Global architecture is ARCH-R13\n(ARCH-G19). Next free decision is **D-369**. Supersedes STATE-R28 for current\ngovernance/architecture position. Product acceptance through IMP-028 is unchanged.\nSTATE-R28 records independent acceptance of IMP-028 — Invoice / Tax Receipt / Credit Note\n(`COMPLETE_AND_ACCEPTED`; `IMP-028_ACCEPTED: YES`). Financial-document acceptance evidence is\nrecorded under binding **D-365** / **D-366** / **D-367**. Architecture remains\n`ARCHITECTURE_LOCKED`. `acceptedThrough` advances to IMP-028. `pendingAcceptance` is NONE.\n`currentProductSlice` is NONE. `nextProductSlice` is IMP-029. IMP-029 remains not started and is\nnot implementation-authorized. Decision register remains DR-9. Global architecture remains\nARCH-R12. Supersedes STATE-R27 for current accepted position.\nSTATE-R27 records independent acceptance of IMP-026C — Pilot Customer-Commerce UX Hardening\n(`COMPLETE_AND_ACCEPTED`; `IMP-026C_ACCEPTED: YES`). Supplemental-inserted-gate acceptance evidence\nis recorded (`IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;\n`IMP026C_FORMAL_ACCEPTANCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.\n`acceptedThrough` remains IMP-027. `pendingAcceptance` advances to IMP-028. IMP-028 remains\n`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record\n`IMP-028_IMPLEMENTATION_COMPLETE: YES`). IMP-029 remains not started. Decision register remains\nDR-9. Global architecture remains ARCH-R12. Supersedes STATE-R26 for current accepted position.\nSTATE-R26 records independent acceptance of IMP-027 — Refund Foundation\n(`COMPLETE_AND_ACCEPTED`; `IMP-027_ACCEPTED: YES`). Refund acceptance evidence is recorded\n(`IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;\n`IMP027_REFUND_FOUNDATION: ACCEPTED`;\n`IMP027_FORMAL_ACCEPTANCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.\n`acceptedThrough` advances to IMP-027. `pendingAcceptance` advances to IMP-026C. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-028 remains\n`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record\n`IMP-028_IMPLEMENTATION_COMPLETE: YES`). IMP-029 remains not started. Decision register remains\nDR-9. Global architecture remains ARCH-R12. Supersedes STATE-R25 for current accepted position.\nSTATE-R25 records independent acceptance of IMP-026 — Razorpay Productionization & Payment GTM\nReadiness (`COMPLETE_AND_ACCEPTED`; `IMP-026_ACCEPTED: YES`). Provider-originated Razorpay Test\nMode webhook proof over public HTTPS is recorded (`IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED`;\n`IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.\n`acceptedThrough` advances to IMP-026. `pendingAcceptance` advances to IMP-027. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). IMP-028 remains\n`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record\n`IMP-028_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-027 / IMP-028 is **not**\nclaimed. IMP-029 remains not started. Decision register remains DR-9. Global architecture remains\nARCH-R12. Supersedes STATE-R24 for current accepted position.\nSTATE-R24 records IMP-028 foundation implementation started\n(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED` /\n`STARTED`; `IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: YES`;\n`IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`; binding **D-365**). Implementation\nis started and **not** complete. Production GST/accountant gates remain unresolved.\n`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-029 remains not started.\nDR-8 / ARCH-R11 subsequently register **D-366** (Refund Statutory Reversal Decision Authority)\nwithout changing STATE-R24 lifecycle identity: `IMP-028_IMPLEMENTATION_COMPLETE` remains NO;\n`IMP-028_ACCEPTED` remains NO; `REFUND_STATUTORY_REVERSAL_WORKFLOW` remains\n`NOT_IMPLEMENTED_UNDER_D366`; `PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES`.\nSTATE-R23 records explicit founder authorization for IMP-028 implementation\n(`IMPLEMENTATION_AUTHORIZED`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED` /\n`NOT_STARTED`; `IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`;\n`IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`; binding **D-365**). No Financial\nDocument product code, schema, migration, PDF, customer document UX, or Ops Console work is\nintroduced by this authorization. Production GST/accountant gates remain unresolved.\n`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-029 remains not started.\nSTATE-R22 records IMP-028 architecture lock (`ARCHITECTURE_LOCKED`; implementation\n`NOT_AUTHORIZED`; capability artifact present; binding **D-365**). No Financial Document\nimplementation. `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026\nremains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-029 remains not started.\nSTATE-R21 records explicit founder authorization for IMP-028 architecture activation\n(`ARCHITECTURE_IN_PROGRESS`; architecture `NOT_LOCKED`; implementation `NOT_AUTHORIZED`). No\nIMP-028 capability artifact. No invoice / tax-receipt / credit-note implementation.\n`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-029 remains not started.\nSTATE-R20 records IMP-027 implementation complete pending acceptance\n(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`; implementation\nevidence `COMPLETE`; independent implementation review `PASS`; `IMP-027_ACCEPTED: NO`; binding\n**D-364**). `pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal\nacceptance gate; that pointer does not mean IMP-026C or IMP-027 implementation remains in\nprogress. `acceptedThrough` remains IMP-025. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-028 remains not started.\nSTATE-R19 records explicit founder authorization for IMP-027 implementation\n(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED`;\nbinding **D-364**). No Refund product/schema/provider code is added by this authorization.\n`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-028 remains not started.\nSTATE-R18 records IMP-027 architecture lock (`ARCHITECTURE_LOCKED`; implementation\n`NOT_AUTHORIZED`; capability artifact present; binding **D-364**). No Refund implementation.\n`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains\ncontiguous. IMP-028 remains not started.\nSTATE-R17 records explicit founder authorization for IMP-027 architecture activation\n(`ARCHITECTURE_IN_PROGRESS`; architecture `NOT_LOCKED`; implementation `NOT_AUTHORIZED`). No\nIMP-027 capability artifact in that revision. No Refund implementation. `acceptedThrough` remains\nIMP-025. `pendingAcceptance` remains IMP-026.\nSTATE-R16 records IMP-026C implementation complete pending acceptance\n(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`; implementation\nevidence `COMPLETE`; independent implementation review `PASS`; `IMP-026C_ACCEPTED: NO`).\n`pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal acceptance gate;\nthat pointer does not mean IMP-026C implementation remains in progress. `acceptedThrough` remains\nIMP-025. IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of\nIMP-026 is **not** claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027\nremains not started. Formal acceptance remains contiguous.\nSTATE-R15 records explicit founder authorization for IMP-026C implementation\n(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED`).\nNo implementation-complete or acceptance claim. `acceptedThrough` remains IMP-025.\n`pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027 remains not started.\nSTATE-R14 records IMP-026C architecture lock (`ARCHITECTURE_LOCKED`) with implementation\n`NOT_STARTED` / `NOT_AUTHORIZED`. No accepted capability advancement. `acceptedThrough` remains\nIMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027 remains not started.\n`governanceHealth = ALIGNED` remains aligned only through accepted IMP-025.\nSTATE-R13 records the GTM-R15 founder deferral of the remaining IMP-026 public HTTPS\nprovider-originated webhook acceptance gate. IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**\nclaimed; `acceptedThrough` remains IMP-025; `pendingAcceptance` remains IMP-026; the external\ndebt is `DEFERRED_NOT_SATISFIED`. `currentProductSlice` becomes IMP-026C\n(`ARCHITECTURE_IN_PROGRESS`; architecture not locked; implementation not authorized). IMP-027\nremains not started. Deferral does not authorize production Razorpay launch, public GTM, or Live\nMode.\nSTATE-R12 records the independently gathered manual real Razorpay Test payment verification\n(provider `captured`; BOBA Payment `SUCCEEDED`; exactly one BOBA Order; reconciliation and\nautomatic capture passed; no architecture drift). Local Razorpay GTM validation is\n`PASS_WITH_PROVIDER_WEBHOOK_PENDING`. Provider-originated public HTTPS webhook remains unverified\n(`NOT_VALIDATED_LOCALHOST_LIMITATION`). Lifecycle is unchanged: `acceptedThrough` remains IMP-025;\n`currentProductSlice` / `pendingAcceptance` remain IMP-026; IMP-026 remains\n`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not** claimed;\nIMP-027 remains not started.\nSTATE-R11 records IMP-026 coding-agent deterministic completion\n(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) with `pendingAcceptance = IMP-026` and\n`acceptedThrough` remaining IMP-025. Independent acceptance of IMP-026 is **not** claimed. Real\nRazorpay Test Mode was then still recorded as `BLOCKED_EXTERNAL_PREREQUISITES`.\nSTATE-R10 recorded IMP-026 coding-agent implementation start (`IMPLEMENTATION_IN_PROGRESS`) without\nindependent acceptance.\nSTATE-R9 recorded **D-363** (Razorpay durable webhook inbox / asynchronous Payment processing) as an\namendment of D-362 acknowledgement timing only. D-362 remains CURRENT for Order materialization\noutside the provider-ack path, missing-Order recovery, secondary reconciliation, and no new\ndeployable service. D-361 remains CURRENT for provider selection.\nSTATE-R8 records **D-362** (Razorpay webhook acknowledgement / post-payment Order recovery) as an\namendment of D-361 ack/post-payment effect only, without changing IMP-026 lifecycle or\n`acceptedThrough`. D-361 remains CURRENT for provider selection.\nSTATE-R7 records IMP-026 architecture lock (`ARCHITECTURE_LOCKED`) with implementation\n`NOT_STARTED`, and the approved V1 provider substitution to Razorpay (**D-361**) without starting\nIMP-026 implementation or advancing `acceptedThrough`.\nSTATE-R6 records independent acceptance of IMP-025 (`COMPLETE_AND_ACCEPTED`).\nSTATE-R5 recorded IMP-025 coding-agent implementation complete\n(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) without independent acceptance.\nSTATE-R4 recorded IMP-025 architecture lock (`ARCHITECTURE_LOCKED`) without starting IMP-025\nimplementation. STATE-R3 recorded independent acceptance of IMP-024 (`COMPLETE_AND_ACCEPTED`)\nwithout activating IMP-025.\n\n`governanceHealth = ALIGNED`. These items remain historical/supersession records, not open\ngovernance conflicts.\n\n## 7. Acceptance Provenance\n\nAccepted product through IMP-028D is the independently accepted implementation baseline encoded by\nthis reconciliation. Detailed per-slice evidence remains in repository tests, audits, Docker\nruntime proof, and historical implementation artifacts. This STATE snapshot records formal\nacceptance of IMP-028D (`COMPLETE_AND_ACCEPTED`) after Founder UAT PASS for the exact candidate\nrecorded above. STATE-R28 recorded\nindependent acceptance of IMP-028 (`COMPLETE_AND_ACCEPTED`) under locked **D-365** / **D-366** /\n**D-367**. STATE-R31 additionally records **D-370** as CURRENT Cart identity-transition policy\nwithout changing that accepted product inventory. STATE-R30 additionally records **D-369** as CURRENT paid-modifier explicit-selection policy without\nchanging that accepted product inventory. STATE-R29 additionally records **D-368** as CURRENT TARGET\nMenu serving architecture without changing that accepted product inventory.\n\nIndependent IMP-028A acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-19. Pre-acceptance\nworking-tree fingerprint:\n\n```text\n32f3bbeda6507e286ee9fe4cc93efa7c6c843ec81b4f4d54864eaf3e20a43f1a\n```\n\nPost-acceptance fingerprint is regenerated by `npm run working-tree:fingerprint` after this STATE\nupdate and supersedes the pre-acceptance value for ongoing governance identity.\n\nIndependent IMP-028A acceptance preserved truthful limitations:\n\n```text\nTYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED\nCUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT\nCUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT = YES\nRELEVANT_REGRESSION_TESTS = PASS_WITH_ENVIRONMENT_LIMITATION\n```\n\nIndependent IMP-028 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-18. Pre-acceptance\nworking-tree fingerprint:\n\n```text\n400f0ec388327c6c323eded33d8188428bb46cc031f7be92a9d62ea371c84467\n```\n\nPost-acceptance fingerprint is regenerated by `npm run governance:fingerprint` after this STATE\nupdate and supersedes the pre-acceptance value for ongoing governance identity.\n\nIndependent IMP-026 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-18. Pre-acceptance\ngovernance fingerprint:\n\n```text\n3234612aaefaf49bad0ee49b68419a91bfff36d1c25c7fec898287c8bf851fe1\n```\n\nSTATE-R43 records IMP-028C — Food Customization implementation started under its existing\narchitecture `ARCHITECTURE_LOCKED` and implementation authorization. `acceptedThrough` remains\nIMP-028B; `pendingAcceptance` remains NONE; `currentProductSlice` remains IMP-028C; and\n`nextProductSlice` remains IMP-029, which is planned, not started, and not authorized. D-369 is\nmandatory for this capability; D-368 remains the Customer Menu discovery authority; D-370 policy\nremains outside scope; D-371 remains unused. The capability retains the canonical-content\nfounder-UAT stop gate. No acceptance, runtime, schema, migration, catalog-data, decision-register,\nor global-architecture change is recorded.\n\nSTATE-R46 records IMP-028C — Food Customization `COMPLETE_AND_ACCEPTED` after the founder declared\nUAT PASS on 2026-08-20 for the frozen candidate `imp-028c/uat-candidate`, commit\n`7f4149914c9abdb0fb6d80e64bbf21579fe790df`, tree\n`2a49537394ee13b0af38b5fa535328e9808e00f3`. The record does not claim unsupplied scenario results,\ntimestamps, screenshots, recordings, image digests, or deployment/container identity. Architecture\nremains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`; and\n`IMP-028C_ACCEPTED: YES`. `acceptedThrough` advances to IMP-028C; `currentProductSlice` and\n`pendingAcceptance` are NONE. `nextProductSlice` remains IMP-029, planned, not started, and not\nauthorized. Decision register remains DR-12, global architecture remains ARCH-R15, and D-371 remains\nunused. This does not authorize or start IMP-029.\n\nSTATE-R45 records IMP-028C — Food Customization implementation complete pending independent\nacceptance (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`;\n`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;\n`IMP-028C_IMPLEMENTATION_COMPLETE: YES`; `currentProductSlice = IMP-028C`;\n`pendingAcceptance = IMP-028C`). Formal acceptance of IMP-028C was **not** claimed.\n`acceptedThrough` remains IMP-028B. `nextProductSlice` remains IMP-029. Founder UAT is\n**NOT_STARTED**; exact-candidate deployment is **PENDING**. IMP-029 remains planned, not started,\nand not authorized. Decision register remains DR-12. Global architecture remains ARCH-R15. Next\nfree decision remains **D-371**. Supersedes STATE-R44 for current IMP-028C lifecycle position.\nProduct acceptance through IMP-028B is unchanged.\n\nSTATE-R44 records the IMP-028C business/domain model and remaining implementation-plan lock. The\ncore model reuses Catalog Modifier Groups and Variant bindings; bundle components inherit their\ncanonical Variant modifier authority; bundle/package pricing remains distinct from modifier pricing;\nand D-368 / D-369 / D-370 remain sufficient. Slice 1 and Slice 2 are `TECHNICALLY_ACCEPTED`; Slice\n3 and Slice 4 remain planned implementation work. IMP-028C remains `IMPLEMENTATION_IN_PROGRESS`,\n`IMP-028C_IMPLEMENTATION_COMPLETE: NO`, and `IMP-028C_ACCEPTED: NO`. No new decision is created:\nD-371 remains unused; ARCH-R15 and DR-12 remain current.\n\n## 8. Explicitly Not Yet Accepted\n\nSupporting primitives do not equal capability completion. Not yet accepted as product capabilities:\n\n- Operations Console API\n- Operations Console UI\n- Delivery\n- Notifications\n- WhatsApp\n- Initial Administration\n- Observability GTM completion\n- Backup / Restore GTM completion\n- Security / Privacy final hardening\n- Production Infrastructure\n- Launch Validation\n\n## 9. Authority Boundaries\n\n| Question | Authority |\n|---|---|\n| What is independently accepted now | **This document (`STATE.md`)** |\n| What comes next / IMP meanings | [`ROADMAP.md`](./ROADMAP.md) |\n| Why / Non-Goals | [`VISION.md`](./VISION.md) |\n| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |\n| Binding decision status | [`decision-register.md`](./decision-register.md) |\n| IMP-024 locked capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |\n| IMP-025 locked capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |\n| IMP-026 locked capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |\n| IMP-026C locked capability architecture | [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) |\n| IMP-027 locked capability architecture | [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) |\n| IMP-028 locked capability architecture | [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) |\n| IMP-028A locked capability architecture | [`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md) |\n| IMP-028B canonical capability | [`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md) |\n\nAgents may propose a STATE delta in their report. Only independent acceptance updates this file's\naccepted position and may promote `governanceHealth` to `ALIGNED`.\n",
  "docs/platform/capabilities/IMP-030-operations-console-ui.md": "<!-- governance-meta\n{\n  \"status\": \"CURRENT\",\n  \"authority\": \"CAPABILITY_ARCHITECTURE\",\n  \"capability\": \"IMP-030\",\n  \"title\": \"Operations Console UI\",\n  \"architectureLock\": \"ARCHITECTURE_LOCKED\",\n  \"implementation\": \"AUTHORIZED / STARTED\",\n  \"implementationAuthorized\": true,\n  \"lastReviewed\": \"2026-08-27\",\n  \"bindingDecisions\": [\"D-372\"],\n  \"dependsOn\": [\"IMP-029\"]\n}\n-->\n\n# IMP-030 — Operations Console UI\n\n## Capability Architecture (ARCHITECTURE_LOCKED)\n\nThis architecture locks a browser-based workforce Operations Console over the accepted IMP-029\nOperations Console API. It provides only Order list/search/filter, Order detail, and ACCEPT,\nFULFIL, and CANCEL interactions. The Operations API remains the sole workforce-business boundary;\nthis UI owns presentation and interaction only.\n\n| Field | Value |\n|---|---|\n| Architecture lock | `ARCHITECTURE_LOCKED` |\n| Implementation | `AUTHORIZED` / `STARTED` |\n| Implementation authorized | **YES** |\n| Depends on | IMP-029 — Operations Console API |\n| Binding decision | D-372 — CURRENT |\n\n## 1. Routes and Next.js boundary\n\nThe UI routes continue the established `/workforce/login/` namespace:\n\n| Route role | Path |\n|---|---|\n| List | `/workforce/operations/` |\n| Detail static shell | `/workforce/operations/orders/detail/` |\n\nOrder detail identity is carried only as the query parameter `orderId`. Canonical list → detail\nnavigation shape:\n\n```text\n/workforce/operations/orders/detail/?orderId=<percent-encoded-order-id>\n```\n\nExample:\n\n```text\n/workforce/operations/orders/detail/?orderId=550e8400-e29b-41d4-a716-446655440000\n```\n\n```text\nIMP-030_DETAIL_UI_ROUTE: /workforce/operations/orders/detail/\nIMP-030_DETAIL_ID_TRANSPORT: QUERY_PARAMETER_ORDER_ID\nIMP-030_DYNAMIC_DETAIL_ROUTE: NO\nIMP-030_STATIC_EXPORT_DETAIL_SHELL: YES\nIMP-030_API_DETAIL_ROUTE: GET /api/operations/v1/orders/{orderId}\n```\n\nThe query parameter is a client-side resource locator only. It is not authorization, scope,\nidentity authority, or trusted caller data. Operations runtime remains authoritative for access.\n\n### Route realization amendment (2026-08-27)\n\nDuring implementation, the prior locked pretty-path detail route\n`/workforce/operations/orders/{orderId}/` proved incompatible with binding static export\n(`output: \"export\"`, `trailingSlash: true`): arbitrary future Order IDs cannot be enumerated by\n`generateStaticParams()`, GitHub Pages provides no arbitrary pretty-path rewrite, and current\nOperations/Nginx UI serving provides no SPA/static-shell fallback. The amended architecture uses one\nbuild-known static App Router detail shell; `orderId` is read client-side from the URL query. No\n`[orderId]` App Router dynamic route, `generateStaticParams()`, SPA fallback, host rewrite, Nginx\nchange, or Next config change is required.\n\nNo `/admin`, `/console`, Next-owned `/api` route, dynamic Route Handler, or Server Action business\nauthority is created.\n\nImplementation is static Next App Router page shells plus client-side Operations feature components.\nReads and mutations use browser fetch; SSR business reads, dynamic Next execution, Route Handler\nproxies, Server Action mutation authority, and Next API routes are excluded. `output: export` and\n`trailingSlash: true` remain binding unless later architecture supersedes them.\n\n### List → detail navigation contract\n\nA list Order may navigate via a native link to\n`/workforce/operations/orders/detail/?orderId=<percent-encoded-order-id>`. The Order identifier MUST\nbe percent-encoded. Navigation is presentation only; the detail API performs the authenticated and\nauthorized lookup.\n\nBrowser detail transport remains `GET /api/operations/v1/orders/{orderId}` with\n`credentials: \"same-origin\"`. The Order ID placed into the API URL must be percent-encoded.\n\n## 2. Transport, session, and authority\n\n```text\nBrowser\n  ↓ same-origin, credentials: \"same-origin\"\n/api/operations/v1/*\n  ↓ existing Nginx routing\nOperations runtime\n```\n\nThere is no browser secret, service credential, new token, CORS expansion, cookie expansion, Nginx,\nCompose, runtime, workforce-auth, or environment change. POST requests naturally retain browser\nOrigin for the existing trusted-Origin check.\n\nBetter Auth remains the workforce session authority through `boba-workforce.session_token`. The UI\nmust not read, synthesize, persist, transform, or become authoritative for session credentials.\nThe Operations runtime continues to validate sessions and construct trusted identities, principals,\npermissions, and scopes. The UI must never send or trust roles, permissions, memberships,\norganization/territory/outlet/scope authority, pre-authorized flags, or principal-shaped objects.\n\n## 3. Accepted Operations API dependency\n\nExactly these five public routes are used:\n\n```text\nGET  /api/operations/v1/orders\nGET  /api/operations/v1/orders/{orderId}\nPOST /api/operations/v1/orders/{orderId}/accept\nPOST /api/operations/v1/orders/{orderId}/fulfil\nPOST /api/operations/v1/orders/{orderId}/cancel\n```\n\nNo sixth route, UI-owned Operations endpoint, or IMP-029 extension is authorized.\n\n## 4. List, detail, and freshness\n\nThe list supports only server filters `orderNumber`, `status`, `createdFrom`, `createdTo`, `brandId`,\n`outletId`, `cursor`, and `limit`. Unknown filters are not simulated as server authority. Sorting is\n`createdAt DESC`, then `id DESC`; there is no user-selectable server sort. Pagination is cursor-based\nwith default limit 20 and maximum 100, using initial first page, Load more, and manual Refresh.\nBackground polling, realtime, WebSocket, SSE, and reverse pagination are deferred.\n\nList fields are restricted to accepted summary data: order ID/number, status, revision, timestamps,\ngrand total/currency, and outlet identity/code/name. Customer summary is not invented. Detail renders\nonly accepted projection fields: identity, lifecycle/timestamps, outlet, destination recipient/contact/\naddress, line items/variant/quantity/modifiers/totals, grand total/currency, paymentProvenanceKind,\nlifecycle actor/time, and cancellation reason. It excludes customer account profile, provider\ntransactions/tracking, and generic audit timelines.\n\nInitial browser fetch occurs after page load. Cache is component memory only; persistent browser cache\nis prohibited. Manual and post-mutation refresh are required; Operations responses remain no-store.\nDestination/contact/address is detail-only operationally sensitive data: no browser persistence,\nlocalStorage/sessionStorage, application PII logging, or unsafe HTML rendering; React text rendering\nonly.\n\n## 5. Mutations, revision, and errors\n\nMutations are pessimistic and server-confirmed: ACCEPT is `PLACED → ACCEPTED`, FULFIL is\n`ACCEPTED → FULFILLED`, and CANCEL is `PLACED|ACCEPTED → CANCELLED`. Each includes the current\n`expectedOrderRevision`; CANCEL also includes `cancellationReasonCode` from the exact API contract.\nThere is no caller idempotency key or automatic blind retry. Only one mutation per Order may be in\nflight, and that Order’s lifecycle controls remain disabled while pending.\n\nThe server revision is authoritative. On `ORDER_CONFLICT`/stale revision, the UI claims no success,\nrefetches detail, presents actionable stale-data feedback, and recalculates actions from fresh state.\nAfter success it uses the confirmed result, refetches current detail, and refreshes the first list\npage. Network ambiguity requires user-directed recovery/refetch; API-owned natural replay semantics\nremain unchanged. Visual lifecycle gating is usability only, never authorization.\n\nExplicit states cover loading, empty/list/detail failure, 401, 403, non-disclosing 404, 409, action\nin progress/success/failure, and unexpected network/500 failures. A 401 presents sign-in required\nwith fixed `/workforce/login/`; no unvalidated return URL is constructed. A 404 must not disclose\nwhether an Order exists but is inaccessible.\n\n## 6. Accessibility, component boundary, and tests\n\nMinimum accessibility: semantic main and headings, labelled filters, native links/buttons, visible\nfocus, keyboard-operable controls, accessible confirmation dialog with Escape/focus trap/restoration,\nlive status announcements, `role=alert` errors, color-independent status, and meaningful mobile\nreading order/touch targets. Desktop may use semantically headed tables; mobile uses a linear\nlist/card representation. No design-system replacement or visual redesign is locked.\n\nCapability-local responsibilities are operations client/adapter, list, detail, lifecycle actions,\nstatus indicator, and loading/empty/error states. The client is browser transport only and must not\nimport Drizzle, repositories, Order services/mutation authority, principal constructors, or\naccess-control internals.\n\nFuture evidence must cover unit eligibility/filter-cursor/error/pending behavior; component\nlist/detail/auth/loading/error/conflict/confirmation/focus/live regions; client exact routes,\ncredentials, request bodies/revisions, safe parsing; Operations authorization/lifecycle/revision/\nreplay/non-disclosure integration; same-origin Nginx E2E login/list/detail/actions; and keyboard,\nfocus, labels, dialogs, announcements, and responsive accessibility. DB-backed tests, when needed,\nuse `DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock` and\n`TESTCONTAINERS_RYUK_DISABLED=true`, not Docker Desktop.\n\n## 7. Non-goals and D-372 preservation\n\nDeferred: polling/realtime, custom sorting, reverse pagination, customer list summary, payment or\ndelivery provider detail/tracking, new Operations actions, refund, financial/statutory documents,\ngeneric audit, delivery/notification/administration management, new lifecycle states, and new public\nOperations routes.\n\n```text\nIMP-030_IMPLEMENTATION_AUTHORIZED: YES\nIMP-030_STARTED: YES\nIMP-030_IMPLEMENTATION_COMPLETE: NO\nIMP-030_ACCEPTED: NO\nIMPLEMENTATION START IS NOT COMPLETION OR ACCEPTANCE: YES\n```\n\n```text\nDEDICATED WORKFORCE-BUSINESS TRANSPORT: PRESERVED\nSHARED BETTER AUTH SESSION AUTHORITY: PRESERVED\nEXISTING ORDER AUTHORITY: PRESERVED\nCALLER ROLE AUTHORITY: NONE\nCALLER SCOPE AUTHORITY: NONE\nHTTP AUTH HOP TO WORKFORCE-AUTH: NONE\nTRUSTED ORIGIN: PRESERVED\nOPERATIONS PUBLIC ROUTES: EXACT FIVE\nDYNAMIC NEXT BUSINESS AUTHORITY: NONE\nCORS CHANGE: NONE\nCOOKIE CHANGE: NONE\nD-372: CURRENT / UNCHANGED\nARCH-R17: UNCHANGED\nDR-14: UNCHANGED\nD-373: NOT_CREATED\nGLOBAL ARCHITECTURE CHANGE: NO\nGLOBAL DECISION REQUIRED: NO\n```\n\n## Open Questions\n\n(none)\n"
});

function readInProgressGovernance(relPath) {
  const text = IMP030_IN_PROGRESS_FIXTURES[relPath];
  if (typeof text !== "string") {
    throw new Error(`missing IMP-030 in-progress fixture: ${relPath}`);
  }
  return text;
}


/** Imp030–Imp034 validators assert D-373 is not yet created; strip the live Imp035 row. */
function decisionRegisterWithoutD373() {
  return readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8")
    .replace(/^\|\s*D-373\s*\|.*\n/m, "");
}

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
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68", "routeAmendment"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "consistencyRepair"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70", "acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R68", "STATE-R66"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R67"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R66"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R68", "STATE-R67"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R67", "STATE-R66"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R67"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R69", "STATE-R68"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R68"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R69"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R69"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R70"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "routeAmendment"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68", "consistencyRepair"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70", "consistencyRepair"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "acceptance"), false);
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

  const roadmapText = readInProgressGovernance("docs/platform/ROADMAP.md");
  const stateText = readInProgressGovernance("docs/platform/STATE.md");
  const decisionText = decisionRegisterWithoutD373();
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readInProgressGovernance("docs/platform/capabilities/IMP-030-operations-console-ui.md");
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

  const authorizationRoadmapText = readInProgressGovernance("docs/platform/ROADMAP.md")
    .replace(/"roadmapVersion": "GTM-R69"/, '"roadmapVersion": "GTM-R68"')
    .replace("| IMP-030 | Operations Console UI | IMPLEMENTATION_IN_PROGRESS |", "| IMP-030 | Operations Console UI | IMPLEMENTATION_AUTHORIZED |");
  const authorizationStateText = readInProgressGovernance("docs/platform/STATE.md")
    .replace(/"stateVersion": "STATE-R67"/, '"stateVersion": "STATE-R66"');
  const authorizationCapabilityText = readInProgressGovernance("docs/platform/capabilities/IMP-030-operations-console-ui.md")
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
  const decisionText = decisionRegisterWithoutD373();
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

  const roadmapText = readInProgressGovernance("docs/platform/ROADMAP.md");
  const stateText = readInProgressGovernance("docs/platform/STATE.md");
  const decisionText = decisionRegisterWithoutD373();
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readInProgressGovernance("docs/platform/capabilities/IMP-030-operations-console-ui.md");
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
      ["GTM-R71", "STATE-R69"],
      ["GTM-R71", "STATE-R68"],
      ["GTM-R70", "STATE-R69"],
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

describe("IMP-030 detail route architecture amendment checkpoint", () => {
  const routeAmendment = Object.freeze({
    roadmapVersion: "GTM-R70", stateVersion: "STATE-R68", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
    detailUiRoute: "/workforce/operations/orders/detail/",
    detailIdTransport: "QUERY_PARAMETER_ORDER_ID",
    dynamicDetailRoute: "NO",
    staticExportDetailShell: "YES",
    apiDetailRoute: "GET /api/operations/v1/orders/{orderId}",
  });

  const CURRENT_ROUTE_FACTS_BLOCK = `\`\`\`text
IMP-030_DETAIL_UI_ROUTE: /workforce/operations/orders/detail/
IMP-030_DETAIL_ID_TRANSPORT: QUERY_PARAMETER_ORDER_ID
IMP-030_DYNAMIC_DETAIL_ROUTE: NO
IMP-030_STATIC_EXPORT_DETAIL_SHELL: YES
IMP-030_API_DETAIL_ROUTE: GET /api/operations/v1/orders/{orderId}
\`\`\``;

  const SUPERSEDED_ROUTE = "/workforce/operations/orders/{orderId}/";

  const roadmapText = readInProgressGovernance("docs/platform/ROADMAP.md");
  const stateText = readInProgressGovernance("docs/platform/STATE.md");
  const decisionText = decisionRegisterWithoutD373();
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readInProgressGovernance("docs/platform/capabilities/IMP-030-operations-console-ui.md");
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

  function routeAmendmentDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? roadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R70",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? stateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R68",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: {
        meta: { architectureVersion: overrides.architectureVersion ?? "ARCH-R17" },
        text: architectureText,
      },
      decision: {
        meta: { decisionRegisterVersion: overrides.decisionRegisterVersion ?? "DR-14" },
        text: overrides.decisionText ?? decisionText,
      },
      artifact: overrides.artifact ?? true,
      artifactText: overrides.artifactText ?? capabilityText,
    };
  }

  it("accepts only the R70/S68 detail-route amendment checkpoint", () => {
    assert.deepEqual(evaluateImp030DetailRouteAmendmentCheckpoint(routeAmendment), { ok: true });
    assert.deepEqual(evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments()), { ok: true });
    assert.deepEqual(evaluateImp030CurrentRouteFacts(extractCurrentImp030RouteFacts(capabilityText).facts), { ok: true });
  });

  it("passes when current fixed shell coexists with historical pretty dynamic route", () => {
    assert.match(capabilityText, new RegExp(SUPERSEDED_ROUTE.replace(/[{}]/g, "\\$&")));
    assert.deepEqual(evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments()), { ok: true });
  });

  it("rejects current pretty dynamic route even when historical fixed shell appears elsewhere", () => {
    const artifactText = capabilityText.replace(
      "IMP-030_DETAIL_UI_ROUTE: /workforce/operations/orders/detail/",
      `IMP-030_DETAIL_UI_ROUTE: ${SUPERSEDED_ROUTE}`,
    );
    assert.match(artifactText, /\/workforce\/operations\/orders\/detail\//);
    assert.deepEqual(
      evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments({ artifactText })).ok,
      false,
    );
  });

  it("rejects missing current route facts even when historical fixed shell appears elsewhere", () => {
    const artifactText = capabilityText.replace(
      /```text\nIMP-030_DETAIL_UI_ROUTE:[\s\S]*?```/,
      "",
    );
    assert.match(artifactText, /\/workforce\/operations\/orders\/detail\//);
    assert.deepEqual(evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments({ artifactText })).ok, false);
  });

  it("passes when current fixed shell coexists with multiple superseded old routes in history", () => {
    const artifactText = capabilityText.replace(
      "### Route realization amendment (2026-08-27)",
      "### Route realization amendment (2026-08-27)\nAlso superseded: `/workforce/operations/orders/{legacyId}/`.",
    );
    assert.deepEqual(evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments({ artifactText })), { ok: true });
  });

  it("rejects future governance frontiers independently", () => {
    for (const [roadmapVersion, stateVersion] of [
      ["GTM-R72", "STATE-R70"],
      ["GTM-R71", "STATE-R68"],
      ["GTM-R70", "STATE-R69"],
      ["GTM-R69", "STATE-R67"],
    ]) {
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, "routeAmendment"), false, `${roadmapVersion}/${stateVersion}`);
    }
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "routeAmendment"), false);
  });

  it("rejects adversarial R70/S68 lifecycle, route, and artifact mutations independently", () => {
    for (const [key, value] of [
      ["detailUiRoute", "/workforce/operations/orders/{orderId}/"],
      ["detailIdTransport", "PATH_SEGMENT"],
      ["dynamicDetailRoute", "YES"],
      ["staticExportDetailShell", "NO"],
      ["apiDetailRoute", "GET /api/operations/v1/orders"],
      ["imp030", "IMPLEMENTATION_AUTHORIZED"],
      ["architecture", "NOT_LOCKED"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["acceptedThrough", "IMP-030"],
      ["currentProductSlice", "IMP-031"],
      ["nextProductSlice", "IMP-032"],
      ["pendingAcceptance", "IMP-030"],
      ["imp031", "ACTIVATED"],
      ["architectureVersion", "ARCH-R18"],
      ["decisionRegisterVersion", "DR-15"],
      ["d373Exists", true],
      ["artifact", false],
    ]) {
      assert.equal(evaluateImp030DetailRouteAmendmentCheckpoint({ ...routeAmendment, [key]: value }).ok, false, key);
    }

    for (const overrides of [
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030", "IMPLEMENTATION_AUTHORIZED") },
      { roadmapText: replaceCurrentFact(roadmapText, "IMP-030_IMPLEMENTATION", "AUTHORIZED / NOT_STARTED") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_ARCHITECTURE_LOCKED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_AUTHORIZED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_STARTED", "NO") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_IMPLEMENTATION_COMPLETE", "YES") },
      { stateText: replaceCurrentFact(stateText, "IMP-030_ACCEPTED", "YES") },
      { acceptedThrough: "IMP-030" },
      { pendingAcceptance: "IMP-030" },
      { currentProductSlice: "IMP-031" },
      { architectureVersion: "ARCH-R18" },
      { decisionRegisterVersion: "DR-15" },
      { decisionText: `${decisionText}\n| D-373 | created | CURRENT |` },
      { artifact: false },
      {
        artifactText: capabilityText.replace(
          /```text\nIMP-030_DETAIL_UI_ROUTE:[\s\S]*?```/,
          CURRENT_ROUTE_FACTS_BLOCK.replace("/workforce/operations/orders/detail/", SUPERSEDED_ROUTE),
        ),
      },
      {
        artifactText: capabilityText.replace(
          /```text\nIMP-030_DETAIL_UI_ROUTE:[\s\S]*?```/,
          "",
        ),
      },
      {
        artifactText: capabilityText.replace("## 2.", `${CURRENT_ROUTE_FACTS_BLOCK}\n\n## 2.`),
      },
      {
        artifactText: capabilityText.replace(/IMP-030_DYNAMIC_DETAIL_ROUTE: NO/, "IMP-030_DYNAMIC_DETAIL_ROUTE: YES"),
      },
      {
        artifactText: capabilityText.replace(/IMP-030_STATIC_EXPORT_DETAIL_SHELL: YES/, "IMP-030_STATIC_EXPORT_DETAIL_SHELL: NO"),
      },
      {
        artifactText: capabilityText.replace(
          "IMP-030_API_DETAIL_ROUTE: GET /api/operations/v1/orders/{orderId}",
          "IMP-030_API_DETAIL_ROUTE: GET /api/operations/v1/orders",
        ),
      },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": []') },
      { artifactText: capabilityText.replace(/"bindingDecisions":\s*\["D-372"\]/, '"bindingDecisions": ["D-372", "D-373"]') },
      { artifactText: capabilityText.replace(/"dependsOn":\s*\["IMP-029"\]/, '"dependsOn": []') },
      { artifactText: capabilityText.replace(/"implementationAuthorized":\s*true/, '"implementationAuthorized": false') },
      { artifactText: capabilityText.replace(/"implementation":\s*"AUTHORIZED \/ STARTED"/, '"implementation": "AUTHORIZED / NOT_STARTED"') },
    ]) {
      assert.equal(evaluateImp030DetailRouteAmendmentDocuments(routeAmendmentDocuments(overrides)).ok, false);
    }
  });
});

describe("IMP-030 canonical consistency repair checkpoint", () => {
  const consistency = Object.freeze({
    roadmapVersion: "GTM-R71", stateVersion: "STATE-R69", acceptedThrough: "IMP-029",
    currentProductSlice: "IMP-030", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "NO", accepted: "NO", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
    detailUiRoute: "/workforce/operations/orders/detail/",
    detailIdTransport: "QUERY_PARAMETER_ORDER_ID",
    dynamicDetailRoute: "NO",
    staticExportDetailShell: "YES",
    apiDetailRoute: "GET /api/operations/v1/orders/{orderId}",
  });

  const roadmapText = readInProgressGovernance("docs/platform/ROADMAP.md");
  const stateText = readInProgressGovernance("docs/platform/STATE.md");
  const decisionText = decisionRegisterWithoutD373();
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readInProgressGovernance("docs/platform/capabilities/IMP-030-operations-console-ui.md");

  function replaceLiveRoadmapSection(text, mutator) {
    const start = text.indexOf("## 4. Current Product Slice");
    const end = text.indexOf("\n## ", start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const section = text.slice(start, end);
    const updated = mutator(section);
    assert.notEqual(updated, section);
    return `${text.slice(0, start)}${updated}${text.slice(end)}`;
  }

  function replaceLiveStateAcceptanceBlock(text, mutator) {
    const start = text.indexOf("## 5. Acceptance Position");
    const end = text.indexOf("\n## ", start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const section = text.slice(start, end);
    const updated = mutator(section);
    assert.notEqual(updated, section);
    return `${text.slice(0, start)}${updated}${text.slice(end)}`;
  }

  function consistencyDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? roadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R71",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? stateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R69",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-029",
          currentProductSlice: overrides.currentProductSlice ?? "IMP-030",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: {
        meta: { architectureVersion: overrides.architectureVersion ?? "ARCH-R17" },
        text: architectureText,
      },
      decision: {
        meta: { decisionRegisterVersion: overrides.decisionRegisterVersion ?? "DR-14" },
        text: overrides.decisionText ?? decisionText,
      },
      artifact: overrides.artifact ?? true,
      artifactText: overrides.artifactText ?? capabilityText,
    };
  }

  it("accepts only the R71/S69 canonical-consistency checkpoint", () => {
    assert.deepEqual(evaluateImp030CanonicalConsistencyCheckpoint(consistency), { ok: true });
    assert.deepEqual(evaluateImp030CanonicalConsistencyDocuments(consistencyDocuments()), { ok: true });
  });

  it("preserves predecessor R70/S68 support and rejects unsupported cross-pairs", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68", "routeAmendment"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R70", "STATE-R68"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "consistencyRepair"), true);
    for (const [roadmapVersion, stateVersion] of [
      ["GTM-R71", "STATE-R68"],
      ["GTM-R70", "STATE-R69"],
      ["GTM-R71", "STATE-R67"],
      ["GTM-R69", "STATE-R69"],
    ]) {
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion), false, `${roadmapVersion}/${stateVersion}`);
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, "consistencyRepair"), false, `${roadmapVersion}/${stateVersion}`);
    }
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70", "consistencyRepair"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70", "acceptance"), true);
  });

  it("rejects ROADMAP §4 stale NOT_LOCKED while current lifecycle is LOCKED", () => {
    const roadmapTextStale = replaceLiveRoadmapSection(roadmapText, (section) =>
      section.replace(
        /IMP-030 — Operations Console UI is the current product slice[\s\S]*?IMP-031 remains/,
        "IMP-030 — Operations Console UI is the current product slice for architecture work only.\nIMP-030 architecture is not locked and IMP-031 remains",
      ));
    assert.equal(
      evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ roadmapText: roadmapTextStale })).ok,
      false,
    );
    assert.equal(
      evaluateImp030CanonicalConsistencyDocuments(consistencyDocuments({ roadmapText: roadmapTextStale })).ok,
      false,
    );
  });

  it("rejects ROADMAP §4 stale NOT_AUTHORIZED / NOT_STARTED while current lifecycle is AUTHORIZED / STARTED", () => {
    const roadmapTextStale = replaceLiveRoadmapSection(roadmapText, (section) =>
      section.replace(
        /Implementation is\s*`AUTHORIZED` \/ `STARTED`\./,
        "IMP-030 architecture is locked but its implementation is not authorized or started.",
      ));
    const result = evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ roadmapText: roadmapTextStale }));
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP030_LIVE_ROADMAP_STALE_AUTHORIZATION");
  });

  it("rejects ROADMAP §4 stale Next product slice: IMP-030", () => {
    const roadmapTextStale = replaceLiveRoadmapSection(roadmapText, (section) =>
      section.replace(/^Next product slice:\s*IMP-031\b.*$/m, "Next product slice: IMP-030 — Operations Console UI"));
    const result = evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ roadmapText: roadmapTextStale }));
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP030_LIVE_ROADMAP_STALE_NEXT_SLICE");
  });

  it("rejects STATE §5 stale ARCHITECTURE_IN_PROGRESS", () => {
    const stateTextStale = replaceLiveStateAcceptanceBlock(stateText, (section) =>
      section.replace(/^IMP-030:\s*IMPLEMENTATION_IN_PROGRESS$/m, "IMP-030: ARCHITECTURE_IN_PROGRESS"));
    const result = evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ stateText: stateTextStale }));
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP030_LIVE_STATE_STALE_STATUS");
  });

  it("rejects STATE §5 stale NOT_LOCKED", () => {
    const stateTextStale = replaceLiveStateAcceptanceBlock(stateText, (section) =>
      section
        .replace(/^IMP-030_ARCHITECTURE:\s*LOCKED$/m, "IMP-030_ARCHITECTURE: NOT_LOCKED")
        .replace(/^IMP-030_ARCHITECTURE_LOCKED:\s*YES$/m, "IMP-030_ARCHITECTURE_LOCKED: NO"));
    const result = evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ stateText: stateTextStale }));
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP030_LIVE_STATE_STALE_LOCK");
  });

  it("rejects STATE §5 stale NOT_AUTHORIZED / NOT_STARTED", () => {
    const stateTextStale = replaceLiveStateAcceptanceBlock(stateText, (section) =>
      section
        .replace(/^IMP-030_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED$/m, "IMP-030_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED")
        .replace(/^IMP-030_IMPLEMENTATION_AUTHORIZED:\s*YES$/m, "IMP-030_IMPLEMENTATION_AUTHORIZED: NO")
        .replace(/^IMP-030_STARTED:\s*YES$/m, "IMP-030_STARTED: NO"));
    const result = evaluateImp030LiveInProgressProseConsistency(consistencyDocuments({ stateText: stateTextStale }));
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP030_LIVE_STATE_STALE_AUTHORIZATION");
  });

  it("does not false-fail on historical GTM-R66 / STATE-R64 activation prose outside live sections", () => {
    assert.match(roadmapText, /### GTM-R66[\s\S]*architecture work only/);
    assert.match(stateText, /STATE-R64[\s\S]*ARCHITECTURE_IN_PROGRESS[\s\S]*NOT_LOCKED/);
    assert.deepEqual(evaluateImp030LiveInProgressProseConsistency(consistencyDocuments()), { ok: true });
    assert.deepEqual(evaluateImp030CanonicalConsistencyDocuments(consistencyDocuments()), { ok: true });
  });

  it("rejects adversarial R71/S69 lifecycle mutations independently", () => {
    for (const [key, value] of [
      ["imp030", "IMPLEMENTATION_AUTHORIZED"], ["architecture", "NOT_LOCKED"], ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"], ["started", "NO"], ["implementationComplete", "YES"],
      ["accepted", "YES"], ["acceptedThrough", "IMP-030"], ["currentProductSlice", "IMP-031"],
      ["nextProductSlice", "IMP-032"], ["pendingAcceptance", "IMP-030"], ["imp031", "ACTIVATED"],
      ["architectureVersion", "ARCH-R18"], ["decisionRegisterVersion", "DR-15"],
      ["d373Exists", true], ["artifact", false],
      ["roadmapVersion", "GTM-R70"], ["stateVersion", "STATE-R68"],
    ]) {
      assert.equal(evaluateImp030CanonicalConsistencyCheckpoint({ ...consistency, [key]: value }).ok, false, key);
    }
  });
});

describe("IMP-031 architecture activation checkpoint", () => {
  const activation = Object.freeze({
    roadmapVersion: "GTM-R73", stateVersion: "STATE-R71", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
  });

  it("accepts only the R73/S71 architecture-only activation checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R73", "STATE-R71", "imp031Activation"), true);
    assert.deepEqual(evaluateImp031ArchitectureActivationCheckpoint(activation), { ok: true });
  });

  it("rejects invalid activation lifecycle combinations", () => {
    for (const [key, value] of [
      ["imp031", "PLANNED"], ["architecture", "LOCKED"], ["implementationAuthorized", "YES"],
      ["started", "YES"], ["acceptedThrough", "IMP-029"], ["nextProductSlice", "IMP-031"],
      ["stateVersion", "STATE-R70"], ["stateLifecycle", "PLANNED"],
    ]) {
      assert.equal(evaluateImp031ArchitectureActivationCheckpoint({ ...activation, [key]: value }).ok, false, key);
    }
  });
});

describe("IMP-032 architecture activation checkpoint", () => {
  const activation = Object.freeze({
    roadmapVersion: "GTM-R80", stateVersion: "STATE-R78", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    d373Exists: false, capabilityArtifactExists: false, providerSelected: false,
    dehradunModeDefined: false, imp031Accepted: true,
  });

  it("accepts only the R80/S78 architecture-only activation checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R78", "imp032Activation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R78"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R77", "imp032Activation"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R78", "imp032Activation"), false);
    assert.deepEqual(evaluateImp032ArchitectureActivationCheckpoint(activation), { ok: true });
  });

  it("rejects invalid activation lifecycle combinations", () => {
    for (const [key, value] of [
      ["acceptedThrough", "IMP-030"],
      ["currentProductSlice", "NONE"],
      ["currentProductSlice", "IMP-031"],
      ["pendingAcceptance", "IMP-032"],
      ["nextProductSlice", "IMP-032"],
      ["architecture", "LOCKED"],
      ["architectureLocked", "YES"],
      ["implementationAuthorized", "YES"],
      ["started", "YES"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["imp032", "PLANNED"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["d373Exists", true],
      ["capabilityArtifactExists", true],
      ["providerSelected", true],
      ["dehradunModeDefined", true],
      ["imp031Accepted", false],
      ["imp031", "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"],
      ["roadmapVersion", "GTM-R79"],
      ["stateVersion", "STATE-R77"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
    ]) {
      assert.equal(evaluateImp032ArchitectureActivationCheckpoint({ ...activation, [key]: value }).ok, false, `${key}=${value}`);
    }
  });
});

describe("IMP-032 architecture draft checkpoint", () => {
  const draft = Object.freeze({
    acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    providerSelected: false, manualModeDefined: true, imp031Accepted: true,
  });

  const draftArtifactFixture = `<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-032",
  "architectureLock": "NOT_LOCKED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "bindingDecisions": ["D-357", "D-372"]
}
-->
MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY
IMP-032_ARCHITECTURE_LOCKED: NO
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
\`BOOKING_OUTCOME_UNKNOWN\`
`;

  it("keeps draft evaluators for fixtures without a live R81/S79 draft version pair", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R79", "imp032Draft"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R79", "imp032Lock"), true);
    assert.deepEqual(evaluateImp032ArchitectureDraftCheckpoint(draft), { ok: true });
  });

  it("rejects premature progression and missing draft evidence", () => {
    for (const [key, value] of [
      ["architecture", "LOCKED"], ["architectureLocked", "YES"],
      ["implementationAuthorized", "YES"], ["started", "YES"],
      ["artifact", false], ["archG24", false], ["d373Exists", true],
      ["providerSelected", true], ["manualModeDefined", false], ["imp031Accepted", false],
      ["acceptedThrough", "IMP-030"],
    ]) {
      assert.equal(evaluateImp032ArchitectureDraftCheckpoint({ ...draft, [key]: value }).ok, false, key);
    }
  });

  it("accepts a synthetic draft artifact fixture and rejects premature progression mutations", () => {
    assert.deepEqual(evaluateImp032ArchitectureDraftArtifact(draftArtifactFixture), { ok: true });
    for (const mutation of [
      draftArtifactFixture.replace('"architectureLock": "NOT_LOCKED"', '"architectureLock": "ARCHITECTURE_LOCKED"'),
      draftArtifactFixture.replace("IMP-032_ARCHITECTURE_LOCKED: NO", "IMP-032_ARCHITECTURE_LOCKED: YES"),
      draftArtifactFixture.replace('"implementationAuthorized": false', '"implementationAuthorized": true'),
      draftArtifactFixture.replace(
        '"bindingDecisions": ["D-357", "D-372"]',
        '"bindingDecisions": ["D-357", "D-372", "D-373"]',
      ),
    ]) {
      assert.equal(evaluateImp032ArchitectureDraftArtifact(mutation).ok, false);
    }
  });
});

/** Derive historical IMP-032 completion-pending artifact from the live accepted artifact. */
function toImp032CompletionPendingArtifact(acceptedArtifact) {
  return acceptedArtifact
    .replace(/"implementation": "COMPLETE_AND_ACCEPTED"/, '"implementation": "AUTHORIZED / STARTED / COMPLETE"')
    .replace("| Lifecycle | `COMPLETE_AND_ACCEPTED` |", "| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |")
    .replace("| Accepted | **YES** |", "| Accepted | **NO** |")
    .replace("| Accepted product through | IMP-032 |", "| Accepted product through | IMP-031 |")
    .replace("| Current product slice | NONE |", "| Current product slice | IMP-032 |")
    .replace("| Pending acceptance | NONE |", "| Pending acceptance | IMP-032 |")
    .replace("| Next product slice | IMP-033 — Notification Foundation |", "| Next product slice | IMP-033 — Notification Foundation |")
    .replace(/IMP-032: COMPLETE_AND_ACCEPTED/g, "IMP-032: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")
    .replace(/IMP-032_ACCEPTED: YES/g, "IMP-032_ACCEPTED: NO")
    .replace(/FOUNDER_UAT: PASS/g, "FOUNDER_UAT: NOT_STARTED")
    .replace(/FOUNDER_UAT_COMPLETE: YES\n/g, "")
    .replace(
      /Architecture remains canonically locked\. Implementation is authorized, started, complete, and formally\naccepted after independent technical acceptance and Founder UAT PASS\./,
      "Architecture remains canonically locked. Implementation is authorized, started, and complete pending acceptance.\nCompletion does not equal acceptance.",
    )
    .replace(
      /IMP032_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_032_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP032_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP032_FORMAL_ACCEPTANCE: ACCEPTED\nIMP032_ACCEPTED_MAIN_SHA:[^\n]*\nIMP032_ACCEPTED_TREE:[^\n]*\nFOUNDER_UAT_CANDIDATE_REPOSITORY:[^\n]*\nFOUNDER_UAT_CANDIDATE_BRANCH:[^\n]*\nFOUNDER_UAT_CANDIDATE_HEAD:[^\n]*\nFOUNDER_UAT_CANDIDATE_FINGERPRINT:[^\n]*\nFOUNDER_UAT_DECISION_DATE:[^\n]*\nFOUNDER_UAT_ACCEPTANCE_AUTHORITY:[^\n]*\nPR:[^\n]*\nMAIN_CI:[^\n]*\nDEPLOY:[^\n]*\n/g,
      "",
    )
    .replace(
      /Implementation is \*\*AUTHORIZED\*\* \/ \*\*STARTED\*\* \/ \*\*COMPLETE\*\* and \*\*formally accepted\*\* for the\nlocked manual-mode boundary below \(`IMP-032_IMPLEMENTATION_COMPLETE: YES`; `IMP-032_ACCEPTED: YES`;\nFounder UAT \*\*PASS\*\*\)\./,
      "Implementation is **AUTHORIZED** / **STARTED** / **COMPLETE** for the locked manual-mode boundary\nbelow. Completion does **not** accept implementation (`IMP-032_IMPLEMENTATION_COMPLETE: YES`;\n`IMP-032_ACCEPTED: NO`; Founder UAT required).",
    )
    .replace(
      /## 25\. Formal acceptance[\s\S]*$/,
      `## 25. Implementation completion status

\`\`\`text
IMP-032: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: YES
IMP-032_ACCEPTED: NO
COMPLETION IS NOT ACCEPTANCE: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
FOUNDER_UAT: NOT_STARTED
IMP-032_ACCESS_CONTROL_DATA_SEED_MIGRATION: APPLIED
access_control_data_seed_migration: APPLIED
\`\`\`

Implementation covers §23.1–§23.4 under the locked manual operating mode. Completion does **not** accept implementation.
`,
    );
}

const IMP032_033_FACTS_RE = /IMP-032:[^\n]*\n(?:(?:IMP-032_|IMP032_|IMP_032_|FOUNDER_UAT)[^\n]*\n)*IMP-033:[^\n]*\n(?:(?:IMP-033_|IMP033_|IMP_033_|COMPLETION IS NOT ACCEPTANCE)[^\n]*\n)*/;

function rewriteDocSection(docText, sectionStart, sectionEndMarker, rewriter) {
  const start = docText.indexOf(sectionStart);
  const end = docText.indexOf(sectionEndMarker, start + 1);
  if (start === -1 || end === -1) return docText;
  return `${docText.slice(0, start)}${rewriter(docText.slice(start, end))}${docText.slice(end)}`;
}

function rewriteCurrentIdentityAndFacts(section, {
  acceptedThrough,
  currentSlice,
  nextSlice,
  pendingAcceptance,
  facts,
  stateActivity,
  permittedIfRequired = false,
  scrubImp032AcceptedYes = false,
  blurb,
}) {
  let updated = section
    .replace(/Accepted Through:\s*IMP-03[12][^\n]*/g, `Accepted Through:     ${acceptedThrough}`)
    .replace(/Accepted Through:\s+IMP-03[12][^\n]*/g, `Accepted Through:          ${acceptedThrough}`)
    .replace(/Current Product Slice:\s*IMP-03[123][^\n]*/g, `Current Product Slice: ${currentSlice}`)
    .replace(/Current Product Implementation:\s*IMP-03[123][^\n]*/g, `Current Product Implementation: ${currentSlice}`)
    .replace(/Next Product Slice:\s*IMP-03[234][^\n]*/g, `Next Product Slice:    ${nextSlice}`)
    .replace(/Next Product Slice:\s+IMP-03[234][^\n]*/g, `Next Product Slice:             ${nextSlice}`)
    .replace(/Pending Acceptance:\s*(?:NONE|IMP-03[23])[^\n]*/g, `Pending Acceptance:    ${pendingAcceptance}`)
    .replace(/Pending Acceptance:\s+(?:NONE|IMP-03[23])[^\n]*/g, `Pending Acceptance:             ${pendingAcceptance}`)
    .replace(/acceptedThrough:\s*IMP-03[12]\b/g, `acceptedThrough: ${acceptedThrough.split(" — ")[0]}`)
    .replace(/currentProductSlice:\s*IMP-03[123]\b/g, `currentProductSlice: ${currentSlice.split(" — ")[0]}`)
    .replace(/nextProductSlice:\s*IMP-03[234][^\n]*/g, `nextProductSlice: ${nextSlice}`)
    .replace(/pendingAcceptance:\s*(?:NONE|IMP-03[23])\b/g, `pendingAcceptance: ${pendingAcceptance}`);
  if (stateActivity) {
    updated = updated.replace(/Current Governance Activity:\s*[^\n]*/g, `Current Governance Activity:    ${stateActivity}`);
  }
  updated = updated.replace(IMP032_033_FACTS_RE, facts);
  if (section.includes("## 2. Current Position")) {
    updated = updated
      .replace(/IMP-032 is `COMPLETE_AND_ACCEPTED`[\s\S]*?(?=```text\nIMP-030:)/, `${blurb ?? "Historical IMP-032 checkpoint fixture."}\n\n`)
      .replaceAll("`IMP-032_ACCEPTED: YES`", "`IMP-032_ACCEPTED: NO`");
  }
  updated = updated
    .replace(/IMP-033 is `ARCHITECTURE_IN_PROGRESS`[^\n]*/g, "IMP-033 remains `PLANNED / NOT_ACTIVATED`.")
    .replace(/IMP-033 is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`[^\n]*/g, "IMP-033 remains `PLANNED / NOT_ACTIVATED`.");
  if (scrubImp032AcceptedYes) {
    updated = updated
      .replaceAll("IMP-032_ACCEPTED: YES", "IMP-032_ACCEPTED: NO")
      .replaceAll("IMP-032_ACCEPTED:         YES", "IMP-032_ACCEPTED:         NO");
  }
  if (permittedIfRequired && !/PERMITTED_IF_REQUIRED/.test(updated)) {
    updated += "IMP-032_ACCESS_CONTROL_DATA_SEED_MIGRATION: PERMITTED_IF_REQUIRED\n";
  }
  return updated;
}

const IMP032_IN_PROGRESS_FACTS = `IMP-032: IMPLEMENTATION_IN_PROGRESS
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: NO
IMP-032_ACCEPTED: NO
IMP-033: PLANNED / NOT_ACTIVATED
`;

const IMP032_COMPLETION_FACTS = `IMP-032: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: YES
IMP-032_ACCEPTED: NO
IMP-032_FOUNDER_UAT_REQUIRED: YES
IMP-032_FOUNDER_UAT: NOT_STARTED
IMP-033: PLANNED / NOT_ACTIVATED
`;

const IMP032_PLANNED_FACTS = `IMP-032: PLANNED / NOT_ACTIVATED
`;

function projectLiveDocsToHistoricalCurrent(roadmapText, stateText, spec) {
  const completion = deriveImp033CompletionDocs(roadmapText, stateText);
  roadmapText = completion.roadmapText;
  stateText = completion.stateText;
  const rewrite = (section) => rewriteCurrentIdentityAndFacts(section, spec);
  let roadmap = rewriteDocSection(roadmapText, "## 2.", "## 3.", rewrite);
  let state = rewriteDocSection(stateText, "## 2. Current Work Position", "\n## ", rewrite);
  state = rewriteDocSection(state, "## 5. Acceptance Position", "\n## ", rewrite);
  if (spec.roadmapVersion) {
    roadmap = roadmap.replace(/"roadmapVersion": "GTM-R\d+"/, `"roadmapVersion": "${spec.roadmapVersion}"`);
  }
  if (spec.stateVersion) {
    state = state.replace(/"stateVersion": "STATE-R\d+"/, `"stateVersion": "${spec.stateVersion}"`);
  }
  return { roadmapText: roadmap, stateText: state };
}

/** Map live GTM-R87 docs back to IMP-032 IMPLEMENTATION_IN_PROGRESS for historical checkpoint tests. */
function normalizeLiveDocsToImp032InProgress(roadmapText, stateText, extras = {}) {
  return projectLiveDocsToHistoricalCurrent(roadmapText, stateText, {
    acceptedThrough: "IMP-031 — Provider-Neutral Delivery Foundation",
    currentSlice: "IMP-032 — Dehradun Delivery Operating Mode",
    nextSlice: "IMP-033 — Notification Foundation",
    pendingAcceptance: "NONE",
    facts: IMP032_IN_PROGRESS_FACTS,
    stateActivity: extras.stateActivity
      ?? "IMP-032 IMPLEMENTATION_IN_PROGRESS; architecture remains LOCKED; implementation AUTHORIZED / STARTED.",
    permittedIfRequired: extras.permittedIfRequired === true,
    scrubImp032AcceptedYes: true,
    roadmapVersion: extras.roadmapVersion ?? "GTM-R83",
    stateVersion: extras.stateVersion ?? "STATE-R81",
  });
}

/** Derive historical IMP-032 STARTED artifact from the live completion artifact. */
function toImp032StartedArtifact(completedArtifact) {
  return completedArtifact
    .replaceAll("IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMPLEMENTATION_IN_PROGRESS")
    .replaceAll("AUTHORIZED / STARTED / COMPLETE", "AUTHORIZED / STARTED")
    .replaceAll("COMPLETION IS NOT ACCEPTANCE: YES", "START IS NOT COMPLETION OR ACCEPTANCE: YES")
    .replaceAll("access_control_data_seed_migration: APPLIED", "access_control_data_seed_migration: PERMITTED_IF_REQUIRED")
    .replaceAll("| Pending acceptance | IMP-032 |", "| Pending acceptance | NONE |")
    .replaceAll("Pending Acceptance:             IMP-032", "Pending Acceptance:             NONE")
    .replaceAll("Pending Acceptance:    IMP-032", "Pending Acceptance:    NONE")
    .replaceAll('"pendingAcceptance": "IMP-032"', '"pendingAcceptance": "NONE"')
    .replaceAll("FOUNDER_UAT: NOT_STARTED\n", "")
    .replaceAll("IMP-032_IMPLEMENTATION_COMPLETE: YES", "IMP-032_IMPLEMENTATION_COMPLETE: NO")
    .replaceAll("IMP-032_FOUNDER_UAT_REQUIRED: YES\n", "")
    .replaceAll("IMP-032_COMPLETION: GTM-R85 / STATE-R83\n", "")
    .replaceAll("IMP-032_COMPLETION: GTM-R85\n", "")
    .replace(
      /Architecture remains canonically locked\. Implementation is authorized, started, and complete pending acceptance\.\nCompletion does not equal acceptance\./,
      "Architecture remains canonically locked. Implementation is authorized and `STARTED`.\nStart does not complete or accept implementation.",
    )
    .replace(
      /Implementation is \*\*AUTHORIZED\*\* \/ \*\*STARTED\*\* \/ \*\*COMPLETE\*\* for the locked manual-mode boundary\nbelow\. Completion does \*\*not\*\* accept implementation \(`IMP-032_IMPLEMENTATION_COMPLETE: YES`;\n`IMP-032_ACCEPTED: NO`; Founder UAT required\)\./,
      "Implementation is **AUTHORIZED** / **STARTED** for the locked manual-mode boundary below. Start does\n**not** complete or accept implementation (`IMP-032_IMPLEMENTATION_COMPLETE: NO`;\n`IMP-032_ACCEPTED: NO`).",
    )
    .replace(
      /## 25\. Implementation completion status[\s\S]*$/,
      `## 25. Implementation-start status

\`\`\`text
IMP-032: IMPLEMENTATION_IN_PROGRESS
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: NO
IMP-032_ACCEPTED: NO
START IS NOT COMPLETION OR ACCEPTANCE: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
\`\`\`

Start covers only §23.1 under the locked operating mode and prior GTM-R82 authorization. GTM-R84 / STATE-R82 clarify §23.3 only: a repository-native data-only access-control seed migration is
**PERMITTED_IF_REQUIRED** to install the already-locked \`delivery.*\` catalog and role mappings into
already-initialized environments under the constraints above. That clarification is
implementation-boundary only; it is not architecture expansion and not implementation completion.
Start does **not** complete or accept implementation, and does **not** authorize provider API
automation, webhooks, workers, queues, notifications/WhatsApp, Delivery schema/table migration,
D-373, ARCH-R19, IMP-033, or IMP-034.
`,
    );
}

describe("IMP-032 architecture lock checkpoint", () => {
  const lock = Object.freeze({
    roadmapVersion: "GTM-R81", stateVersion: "STATE-R79", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "ARCHITECTURE_LOCKED", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    providerSelected: false, manualModeDefined: true, imp031Accepted: true,
  });

  /** Historical R81/S79 lock artifact derived from the live STARTED capability doc. */
  function toLockArtifact(startedArtifact) {
    return startedArtifact
      .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
      .replace(/"implementationAuthorized": true/, '"implementationAuthorized": false')
      .replace("| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |", "| Lifecycle | `ARCHITECTURE_LOCKED` |")
      .replace("| Implementation | `AUTHORIZED` / `STARTED` |", "| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |")
      .replace("| Implementation authorized | **YES** |", "| Implementation authorized | **NO** |")
      .replace(
        /Architecture remains canonically locked\. Implementation is authorized and `STARTED`\.\nStart does not complete or accept implementation\./,
        "**Architecture lock does not authorize implementation.** Implementation remains\n`NOT_AUTHORIZED` / `NOT_STARTED`. Architecture is canonically locked. Implementation authorization/start remain\nseparate governance gates.",
      )
      .replace(/IMP-032: IMPLEMENTATION_IN_PROGRESS/g, "IMP-032: ARCHITECTURE_LOCKED")
      .replace(/IMP-032_IMPLEMENTATION: AUTHORIZED \/ STARTED/g, "IMP-032_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED")
      .replace(/IMP-032_IMPLEMENTATION_AUTHORIZED: YES/g, "IMP-032_IMPLEMENTATION_AUTHORIZED: NO")
      .replace(/IMP-032_STARTED: YES/g, "IMP-032_STARTED: NO")
      .replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES\n/g, "")
      .replace(
        /Implementation is \*\*AUTHORIZED\*\* \/ \*\*STARTED\*\* for the locked manual-mode boundary below\. Start does\n\*\*not\*\* complete or accept implementation \(`IMP-032_IMPLEMENTATION_COMPLETE: NO`;\n`IMP-032_ACCEPTED: NO`\)\./,
        "Architecture lock **does not** authorize implementation.",
      )
      .replace("### 23.1 Included (authorized; started)", "### 23.1 Included (when later authorized)")
      .replace(
        /N\. Delivery permission-catalog extension under existing access-control conventions\n/,
        "",
      )
      .replace(
        /## 25\. Implementation-start status[\s\S]*$/,
        "",
      )
      .replace(
        "implementation boundary unambiguous;",
        "implementation boundary unambiguous and **not authorized**;",
      );
  }

  const lockArtifactFixture = toLockArtifact(
    toImp032StartedArtifact(
      toImp032CompletionPendingArtifact(
        readFileSync("docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md", "utf8"),
      ),
    ),
  );

  it("accepts the R81/S79 lock without implementation authorization", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R79", "imp032Lock"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R80", "imp032Lock"), false);
    assert.deepEqual(evaluateImp032ArchitectureLockCheckpoint(lock), { ok: true });
  });

  it("rejects invalid lock lifecycle combinations", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R82"],
      ["stateVersion", "STATE-R80"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "YES"],
      ["started", "YES"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["d373Exists", true],
      ["artifact", false],
      ["manualModeDefined", false],
      ["imp031Accepted", false],
      ["providerSelected", true],
      ["pendingAcceptance", "IMP-032"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
    ]) {
      assert.equal(evaluateImp032ArchitectureLockCheckpoint({ ...lock, [key]: value }).ok, false, `${key}=${value}`);
    }
  });

  it("validates the derived locked artifact and rejects unsafe/premature mutations", () => {
    assert.deepEqual(evaluateImp032ArchitectureLockArtifact(lockArtifactFixture), { ok: true });
    for (const mutation of [
      lockArtifactFixture.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      lockArtifactFixture.replace("IMP-032_ARCHITECTURE_LOCKED: YES", "IMP-032_ARCHITECTURE_LOCKED: NO"),
      lockArtifactFixture.replace('"implementationAuthorized": false', '"implementationAuthorized": true'),
      lockArtifactFixture.replace("IMP-032_IMPLEMENTATION_AUTHORIZED: NO", "IMP-032_IMPLEMENTATION_AUTHORIZED: YES"),
      lockArtifactFixture.replace("IMP-032_STARTED: NO", "IMP-032_STARTED: YES"),
      lockArtifactFixture.replace(
        '"bindingDecisions": ["D-357", "D-372"]',
        '"bindingDecisions": ["D-357", "D-372", "D-373"]',
      ),
      `${lockArtifactFixture}\nexternal booking/reference **OR** explicit \`no_reference_issued\`\n`,
    ]) {
      assert.equal(evaluateImp032ArchitectureLockArtifact(mutation).ok, false);
    }
  });
});

describe("IMP-032 implementation authorization checkpoint", () => {
  const authorization = Object.freeze({
    roadmapVersion: "GTM-R82", stateVersion: "STATE-R80", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "YES", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    providerSelected: false, manualModeDefined: true, imp031Accepted: true,
  });

  const liveStartedArtifact = toImp032StartedArtifact(
    toImp032CompletionPendingArtifact(
      readFileSync(
        "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md",
        "utf8",
      ),
    ),
  );
  const authorizedArtifact = liveStartedArtifact
    .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "AUTHORIZED / NOT_STARTED"')
    .replace(/\| Lifecycle \| `IMPLEMENTATION_IN_PROGRESS` \|/, "| Lifecycle | `IMPLEMENTATION_AUTHORIZED` |")
    .replace(/\| Implementation \| `AUTHORIZED` \/ `STARTED` \|/, "| Implementation | `AUTHORIZED` / `NOT_STARTED` |")
    .replace(
      /Architecture remains canonically locked\. Implementation is authorized and `STARTED`\.\nStart does not complete or accept implementation\./,
      "Architecture is canonically locked. Implementation authorization/start remain separate governance\ngates. Implementation is now `AUTHORIZED` / `NOT_STARTED`. Authorization does **not** start\nimplementation.",
    )
    .replace(/IMP-032: IMPLEMENTATION_IN_PROGRESS/g, "IMP-032: IMPLEMENTATION_AUTHORIZED")
    .replace(/IMP-032_IMPLEMENTATION: AUTHORIZED \/ STARTED/g, "IMP-032_IMPLEMENTATION: AUTHORIZED / NOT_STARTED")
    .replace(/IMP-032_STARTED: YES/g, "IMP-032_STARTED: NO")
    .replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES/g, "AUTHORIZATION IS NOT IMPLEMENTATION START: YES")
    .replace(
      /## 23\. Implementation boundary\n\nImplementation is \*\*AUTHORIZED\*\* \/ \*\*STARTED\*\* for the locked manual-mode boundary below\. Start does\n\*\*not\*\* complete or accept implementation \(`IMP-032_IMPLEMENTATION_COMPLETE: NO`;\n`IMP-032_ACCEPTED: NO`\)\.\n\n### 23\.1 Included \(authorized; started\)/,
      "## 23. Implementation boundary\n\nImplementation is **AUTHORIZED** for the locked manual-mode boundary below. Authorization does\n**not** start implementation (`IMP-032_STARTED: NO`).\n\n### 23.1 Included (authorized; not started)",
    )
    .replace(/## 25\. Implementation-start status/, "## 25. Implementation-authorization status")
    .replace(
      /Start covers only §23\.1 under the locked operating mode and prior GTM-R82 authorization\. It does\n\*\*not\*\* complete or accept implementation, and does \*\*not\*\* authorize provider API automation,\nwebhooks, workers, queues, notifications\/WhatsApp, schema\/migration for Delivery tables, D-373,\nARCH-R19, IMP-033, or IMP-034\./,
      "Authorization covers only §23.1 under the locked operating mode. It does **not** authorize provider\nAPI automation, webhooks, workers, queues, notifications/WhatsApp, schema/migration for Delivery\ntables, D-373, ARCH-R19, IMP-033, or IMP-034. Start remains a separate governance gate.",
    );
  const liveRoadmapText = normalizeLiveDocsToImp032InProgress(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  ).roadmapText;
  const liveStateText = normalizeLiveDocsToImp032InProgress(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  ).stateText;
  const rewriteAuthorizationSection = (docText, sectionStart, sectionEndMarker) => {
    const start = docText.indexOf(sectionStart);
    const end = docText.indexOf(sectionEndMarker, start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = docText.slice(start, end)
      .replace(/implementation authorized \/ started/g, "implementation authorized / not started")
      .replace(
        /IMP-032 IMPLEMENTATION_IN_PROGRESS; architecture remains LOCKED; implementation AUTHORIZED \/ STARTED\./g,
        "IMP-032 IMPLEMENTATION_AUTHORIZED; architecture remains LOCKED; implementation AUTHORIZED / NOT_STARTED.",
      )
      .replace(/IMP-032:\s*IMPLEMENTATION_IN_PROGRESS/g, "IMP-032: IMPLEMENTATION_AUTHORIZED")
      .replace(/IMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/g, "IMP-032_IMPLEMENTATION: AUTHORIZED / NOT_STARTED")
      .replace(/IMP-032_STARTED:\s*YES/g, "IMP-032_STARTED: NO")
      .replace(
        /Lifecycle is\n`IMPLEMENTATION_IN_PROGRESS`\. Implementation is `AUTHORIZED` \/ `STARTED` under prior GTM-R82\nauthorization/g,
        "Implementation is\n`AUTHORIZED` / `NOT_STARTED`",
      )
      .replace(
        /`AUTHORIZED` \/ `STARTED` under prior GTM-R82 authorization \(`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`;\n`IMP-032_STARTED: YES`\)\. Start does \*\*not\*\* complete or accept implementation\./g,
        "`AUTHORIZED` / `NOT_STARTED` (`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-032_STARTED: NO`).\nAuthorization does **not** start implementation.",
      )
      .replace(
        /Lifecycle is `IMPLEMENTATION_IN_PROGRESS`\. Implementation is `AUTHORIZED` \/ `STARTED` under prior GTM-R82\nauthorization/g,
        "Implementation is `AUTHORIZED` / `NOT_STARTED`",
      )
      .replace(
        /Start does \*\*not\*\* complete or\naccept implementation\./g,
        "Authorization does **not** start\nimplementation.",
      )
      .replace(
        /This start gate does \*\*not\*\* complete or accept IMP-032, select a named\nprovider/g,
        "This authorization gate does **not** start IMP-032 implementation, select\na named provider",
      );
    return `${docText.slice(0, start)}${current}${docText.slice(end)}`;
  };
  const roadmapText = rewriteAuthorizationSection(liveRoadmapText, "## 2.", "## 3.")
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | IMPLEMENTATION_IN_PROGRESS |",
      "| IMP-032 | Dehradun Delivery Operating Mode | IMPLEMENTATION_AUTHORIZED |",
    );
  const stateText = rewriteAuthorizationSection(
    rewriteAuthorizationSection(liveStateText, "## 2. Current Work Position", "\n## "),
    "## 5. Acceptance Position",
    "\n## ",
  );

  it("supports only the R82/S80 authorization checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R80", "imp032Authorization"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R79", "imp032Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R79", "imp032Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R80", "imp032Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R81", "STATE-R79", "imp032Lock"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R80"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R81", "imp032Authorization"), false);
  });

  it("accepts only the authorized / not-started IMP-032 checkpoint", () => {
    assert.deepEqual(evaluateImp032ImplementationAuthorizationCheckpoint(authorization), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R81"],
      ["stateVersion", "STATE-R79"],
      ["imp032", "ARCHITECTURE_LOCKED"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "YES"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["implementation", "NOT_AUTHORIZED / NOT_STARTED"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["d373Exists", true],
      ["artifact", false],
      ["manualModeDefined", false],
      ["imp031Accepted", false],
      ["providerSelected", true],
      ["pendingAcceptance", "IMP-032"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
    ]) {
      assert.equal(
        evaluateImp032ImplementationAuthorizationCheckpoint({ ...authorization, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the derived authorized artifact and rejects unsafe/premature mutations", () => {
    assert.deepEqual(evaluateImp032ImplementationAuthorizationArtifact(authorizedArtifact), { ok: true });
    assert.match(authorizedArtifact, /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/);
    assert.match(authorizedArtifact, /Architecture is canonically locked/);
    assert.doesNotMatch(authorizedArtifact, /uncommitted lock candidate/);
    for (const mutation of [
      authorizedArtifact.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      authorizedArtifact.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      authorizedArtifact.replace('"implementation": "AUTHORIZED / NOT_STARTED"', '"implementation": "NOT_AUTHORIZED / NOT_STARTED"'),
      authorizedArtifact.replaceAll("IMP-032_IMPLEMENTATION_AUTHORIZED: YES", "IMP-032_IMPLEMENTATION_AUTHORIZED: NO"),
      authorizedArtifact.replaceAll("IMP-032_STARTED: NO", "IMP-032_STARTED: YES"),
      authorizedArtifact.replaceAll("IMP-032: IMPLEMENTATION_AUTHORIZED", "IMP-032: ARCHITECTURE_LOCKED"),
      authorizedArtifact.replaceAll("AUTHORIZATION IS NOT IMPLEMENTATION START: YES\n", ""),
      authorizedArtifact.replace(
        '"bindingDecisions": ["D-357", "D-372"]',
        '"bindingDecisions": ["D-357", "D-372", "D-373"]',
      ),
      `${authorizedArtifact}\nexternal booking/reference **OR** explicit \`no_reference_issued\`\n`,
    ]) {
      assert.equal(evaluateImp032ImplementationAuthorizationArtifact(mutation).ok, false);
    }
  });

  it("aligns derived ROADMAP/STATE/capability AUTHORIZED / NOT_STARTED markers", () => {
    assert.deepEqual(
      evaluateImp032ImplementationAuthorizationCrossDocumentAlignment({
        capabilityText: authorizedArtifact,
        roadmapText,
        stateText,
      }),
      { ok: true },
    );
    const started = evaluateImp032ImplementationAuthorizationCrossDocumentAlignment({
      capabilityText: authorizedArtifact.replace("IMP-032_STARTED: NO", "IMP-032_STARTED: YES"),
      roadmapText,
      stateText,
    });
    assert.equal(started.ok, false);
    const unauthorized = evaluateImp032ImplementationAuthorizationCrossDocumentAlignment({
      capabilityText: authorizedArtifact.replace("IMP-032_IMPLEMENTATION_AUTHORIZED: YES", "IMP-032_IMPLEMENTATION_AUTHORIZED: NO"),
      roadmapText,
      stateText,
    });
    assert.equal(unauthorized.ok, false);
  });
});

describe("IMP-032 implementation start checkpoint", () => {
  const start = Object.freeze({
    roadmapVersion: "GTM-R83", stateVersion: "STATE-R81", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / STARTED",
    implementationAuthorized: "YES", started: "YES", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    providerSelected: false, manualModeDefined: true, imp031Accepted: true,
  });

  const startedArtifact = toImp032StartedArtifact(
    toImp032CompletionPendingArtifact(
      readFileSync(
        "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md",
        "utf8",
      ),
    ),
  );
  const startedDocs = normalizeLiveDocsToImp032InProgress(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  );
  const roadmapText = startedDocs.roadmapText;
  const stateText = startedDocs.stateText;

  it("supports only the R83/S81 start checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R81", "imp032Start"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R80", "imp032Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R80", "imp032Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R81", "imp032Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R82", "STATE-R80", "imp032Authorization"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R81"), true);
  });

  it("accepts only the authorized / started / in-progress IMP-032 checkpoint", () => {
    assert.deepEqual(evaluateImp032ImplementationStartCheckpoint(start), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R82"],
      ["stateVersion", "STATE-R80"],
      ["imp032", "IMPLEMENTATION_AUTHORIZED"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["implementation", "AUTHORIZED / NOT_STARTED"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["d373Exists", true],
      ["artifact", false],
      ["manualModeDefined", false],
      ["imp031Accepted", false],
      ["providerSelected", true],
      ["pendingAcceptance", "IMP-032"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
    ]) {
      assert.equal(
        evaluateImp032ImplementationStartCheckpoint({ ...start, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live started artifact and rejects unsafe/premature mutations", () => {
    assert.deepEqual(evaluateImp032ImplementationStartArtifact(startedArtifact), { ok: true });
    assert.match(startedArtifact, /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/);
    assert.match(startedArtifact, /Architecture remains canonically locked/);
    assert.doesNotMatch(startedArtifact, /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/);
    for (const mutation of [
      startedArtifact.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      startedArtifact.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      startedArtifact.replace('"implementation": "AUTHORIZED / STARTED"', '"implementation": "AUTHORIZED / NOT_STARTED"'),
      startedArtifact.replaceAll("IMP-032_IMPLEMENTATION_AUTHORIZED: YES", "IMP-032_IMPLEMENTATION_AUTHORIZED: NO"),
      startedArtifact.replaceAll("IMP-032_STARTED: YES", "IMP-032_STARTED: NO"),
      startedArtifact.replaceAll("IMP-032: IMPLEMENTATION_IN_PROGRESS", "IMP-032: IMPLEMENTATION_AUTHORIZED"),
      startedArtifact.replaceAll("START IS NOT COMPLETION OR ACCEPTANCE: YES\n", ""),
      startedArtifact.replace(
        '"bindingDecisions": ["D-357", "D-372"]',
        '"bindingDecisions": ["D-357", "D-372", "D-373"]',
      ),
      `${startedArtifact}\nexternal booking/reference **OR** explicit \`no_reference_issued\`\n`,
    ]) {
      assert.equal(evaluateImp032ImplementationStartArtifact(mutation).ok, false);
    }
  });

  it("aligns live ROADMAP/STATE/capability AUTHORIZED / STARTED markers", () => {
    assert.deepEqual(
      evaluateImp032ImplementationStartCrossDocumentAlignment({
        capabilityText: startedArtifact,
        roadmapText,
        stateText,
      }),
      { ok: true },
    );
    const unstarted = evaluateImp032ImplementationStartCrossDocumentAlignment({
      capabilityText: startedArtifact.replace("IMP-032_STARTED: YES", "IMP-032_STARTED: NO"),
      roadmapText,
      stateText,
    });
    assert.equal(unstarted.ok, false);
    const unauthorized = evaluateImp032ImplementationStartCrossDocumentAlignment({
      capabilityText: startedArtifact.replace("IMP-032_IMPLEMENTATION_AUTHORIZED: YES", "IMP-032_IMPLEMENTATION_AUTHORIZED: NO"),
      roadmapText,
      stateText,
    });
    assert.equal(unauthorized.ok, false);
  });
});

describe("IMP-032 permission bootstrap boundary clarification checkpoint", () => {
  const clarification = Object.freeze({
    roadmapVersion: "GTM-R84", stateVersion: "STATE-R82", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED",
    architectureLocked: "YES", implementation: "AUTHORIZED / STARTED",
    implementationAuthorized: "YES", started: "YES", implementationComplete: "NO", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    providerSelected: false, manualModeDefined: true, imp031Accepted: true,
  });

  const clarifiedArtifactFixture = toImp032StartedArtifact(
    toImp032CompletionPendingArtifact(
      readFileSync("docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md", "utf8"),
    ),
  );
  const clarifiedDocs = normalizeLiveDocsToImp032InProgress(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
    {
      permittedIfRequired: true,
      roadmapVersion: "GTM-R84",
      stateVersion: "STATE-R82",
      stateActivity: "IMP-032 IMPLEMENTATION_IN_PROGRESS; architecture remains LOCKED; implementation AUTHORIZED / STARTED; GTM-R84 / STATE-R82 record implementation-boundary clarification for access-control data seed only.",
    },
  );
  const roadmapText = clarifiedDocs.roadmapText;
  const stateText = clarifiedDocs.stateText;

  it("supports only the R84/S82 boundary-clarification checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R84", "STATE-R82", "imp032BoundaryClarification"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R81", "imp032BoundaryClarification"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R84", "STATE-R81", "imp032BoundaryClarification"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R83", "STATE-R82", "imp032BoundaryClarification"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R84", "STATE-R82"), true);
  });

  it("accepts only the clarified in-progress IMP-032 checkpoint", () => {
    assert.deepEqual(evaluateImp032PermissionBootstrapClarificationCheckpoint(clarification), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R83"],
      ["stateVersion", "STATE-R81"],
      ["imp032", "IMPLEMENTATION_AUTHORIZED"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "YES"],
      ["accepted", "YES"],
      ["implementation", "AUTHORIZED / NOT_STARTED"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["d373Exists", true],
      ["artifact", false],
      ["manualModeDefined", false],
      ["imp031Accepted", false],
      ["providerSelected", true],
      ["pendingAcceptance", "IMP-032"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
    ]) {
      assert.equal(
        evaluateImp032PermissionBootstrapClarificationCheckpoint({ ...clarification, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the historical clarified artifact fixture and rejects unsafe/premature mutations", () => {
    assert.deepEqual(evaluateImp032PermissionBootstrapClarificationArtifact(clarifiedArtifactFixture), { ok: true });
    assert.match(clarifiedArtifactFixture, /access_control_data_seed_migration:\s*PERMITTED_IF_REQUIRED/);
    assert.match(clarifiedArtifactFixture, /delivery_schema_migration:\s*NO/);
    for (const mutation of [
      clarifiedArtifactFixture.replaceAll("access_control_data_seed_migration: PERMITTED_IF_REQUIRED", "access_control_data_seed_migration: PROHIBITED"),
      clarifiedArtifactFixture.replaceAll("delivery_schema_migration: NO", "delivery_schema_migration: YES"),
      clarifiedArtifactFixture.replaceAll("IMP-032_IMPLEMENTATION_COMPLETE: NO", "IMP-032_IMPLEMENTATION_COMPLETE: YES"),
      clarifiedArtifactFixture.replace(
        /already-initialized environments do not automatically receive newly locked permission-catalog entries/,
        "automatic runtime permission sync",
      ),
    ]) {
      assert.equal(evaluateImp032PermissionBootstrapClarificationArtifact(mutation).ok, false);
    }
  });

  it("aligns historical boundary-clarification markers via fixture capability text", () => {
    const roadmapFixture = `${roadmapText}\nGTM-R84\n`;
    const stateFixture = `${stateText}\nSTATE-R82\n`;
    assert.deepEqual(
      evaluateImp032PermissionBootstrapClarificationCrossDocumentAlignment({
        capabilityText: clarifiedArtifactFixture,
        roadmapText: roadmapFixture,
        stateText: stateFixture,
      }),
      { ok: true },
    );
    const missingClarification = evaluateImp032PermissionBootstrapClarificationCrossDocumentAlignment({
      capabilityText: clarifiedArtifactFixture.replace("GTM-R84 / STATE-R82", "GTM-R83 / STATE-R81"),
      roadmapText: roadmapFixture,
      stateText: stateFixture,
    });
    assert.equal(missingClarification.ok, false);
  });
});

describe("IMP-032 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R85", stateVersion: "STATE-R83", acceptedThrough: "IMP-031",
    currentProductSlice: "IMP-032", nextProductSlice: "IMP-033", pendingAcceptance: "IMP-032",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE",
    implementationAuthorized: "YES", started: "YES", implementationComplete: "YES", accepted: "NO",
    imp033: "PLANNED", architectureVersion: "ARCH-R18",
    decisionRegisterVersion: "DR-14", artifact: true, archG24: true, d373Exists: false,
    manualModeDefined: true, imp031Accepted: true, founderUatRequired: true,
  });

  const completedArtifact = toImp032CompletionPendingArtifact(
    readFileSync(
      "docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md",
      "utf8",
    ),
  );
  const completionDocs = projectLiveDocsToHistoricalCurrent(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
    {
      acceptedThrough: "IMP-031 — Provider-Neutral Delivery Foundation",
      currentSlice: "IMP-032 — Dehradun Delivery Operating Mode",
      nextSlice: "IMP-033 — Notification Foundation",
      pendingAcceptance: "IMP-032",
      facts: IMP032_COMPLETION_FACTS,
      scrubImp032AcceptedYes: true,
      stateActivity: "IMP-032 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE; architecture remains LOCKED; implementation AUTHORIZED / STARTED / COMPLETE; Founder UAT required before formal acceptance; GTM-R85 / STATE-R83 record implementation completion.",
      roadmapVersion: "GTM-R85",
      stateVersion: "STATE-R83",
    },
  );
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R85/S83 completion checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R85", "STATE-R83", "imp032Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R84", "STATE-R82", "imp032Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R85", "STATE-R82", "imp032Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R84", "STATE-R83", "imp032Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R85", "STATE-R83"), true);
  });

  it("accepts only the complete-pending-acceptance IMP-032 checkpoint", () => {
    assert.deepEqual(evaluateImp032ImplementationCompletionCheckpoint(completion), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R84"],
      ["stateVersion", "STATE-R82"],
      ["pendingAcceptance", "NONE"],
      ["imp032", "IMPLEMENTATION_IN_PROGRESS"],
      ["implementationComplete", "NO"],
      ["accepted", "YES"],
      ["founderUatRequired", false],
      ["d373Exists", true],
      ["artifact", false],
    ]) {
      assert.equal(
        evaluateImp032ImplementationCompletionCheckpoint({ ...completion, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live completed artifact and rejects premature acceptance", () => {
    assert.deepEqual(evaluateImp032ImplementationCompletionArtifact(completedArtifact), { ok: true });
    assert.equal(
      evaluateImp032ImplementationCompletionArtifact(
        completedArtifact.replace("IMP-032_ACCEPTED: NO", "IMP-032_ACCEPTED: YES"),
      ).ok,
      false,
    );
  });

  it("aligns live ROADMAP/STATE/capability completion markers", () => {
    assert.deepEqual(
      evaluateImp032ImplementationCompletionCrossDocumentAlignment({
        capabilityText: completedArtifact,
        roadmapText,
        stateText,
      }),
      { ok: true },
    );
  });
});

describe("IMP-031 architecture draft checkpoint", () => {
  const draft = Object.freeze({
    roadmapVersion: "GTM-R74", stateVersion: "STATE-R72", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED", architectureLocked: "NO",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false,
  });

  const draftArtifactFixture = `<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-031",
  "architectureLock": "NOT_LOCKED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false
}
-->
| Implementation boundary | **C — APPROVED WITH THIS LIFECYCLE AMENDMENT** |
C. domain model + persistence foundation + provider-neutral ports/interfaces
| \`REQUESTED\` | request | No |
| \`BOOKING_OUTCOME_UNKNOWN\` | ambiguous | No |
| \`BOOKED\` | booked | No |
| \`PICKED_UP\` | picked | No |
| \`DELIVERED\` | delivered | Yes |
| \`FAILED\` | failed | Yes |
| \`CANCELLED\` | cancelled | Yes |
\`REQUESTED\` → \`BOOKING_OUTCOME_UNKNOWN\`
\`BOOKING_OUTCOME_UNKNOWN\` → \`BOOKED\`
\`BOOKED\` → \`PICKED_UP\`
\`PICKED_UP\` → \`DELIVERED\`
RETURN_REQUESTED → RETURNING → RETURNED
Duplicate observations produce no
duplicate transition or downstream effect
Provider
status or callback processing must never directly write Order state
eligible Order \`ACCEPTED\` → \`FULFILLED\`
IMP-031_ARCHITECTURE_LOCKED: NO
`;

  it("accepts the R74/S72 amended draft without lock or implementation authorization", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R74", "STATE-R72", "imp031Draft"), true);
    assert.deepEqual(evaluateImp031ArchitectureDraftCheckpoint(draft), { ok: true });
  });

  it("rejects premature progression and missing draft evidence", () => {
    for (const [key, value] of [
      ["architecture", "LOCKED"], ["architectureLocked", "YES"],
      ["implementationAuthorized", "YES"], ["started", "YES"],
      ["architectureVersion", "ARCH-R17"], ["decisionRegisterVersion", "DR-15"],
      ["artifact", false], ["archG24", false], ["d373Exists", true],
      ["acceptedThrough", "IMP-031"], ["pendingAcceptance", "IMP-031"],
    ]) {
      assert.equal(evaluateImp031ArchitectureDraftCheckpoint({ ...draft, [key]: value }).ok, false, key);
    }
  });

  it("accepts the approved lifecycle contract and rejects its removal or premature progression", () => {
    assert.deepEqual(evaluateImp031ArchitectureDraftArtifact(draftArtifactFixture), { ok: true });
    for (const mutation of [
      draftArtifactFixture.replace("APPROVED WITH THIS LIFECYCLE AMENDMENT", "PROPOSED FOR REVIEW"),
      draftArtifactFixture.replace(/\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\n/, ""),
      draftArtifactFixture.replace("must never directly write Order state", "may directly write Order state"),
      draftArtifactFixture.replace('"architectureLock": "NOT_LOCKED"', '"architectureLock": "ARCHITECTURE_LOCKED"'),
      draftArtifactFixture.replace("IMP-031_ARCHITECTURE_LOCKED: NO", "IMP-031_ARCHITECTURE_LOCKED: YES"),
      draftArtifactFixture.replace('"implementationAuthorized": false', '"implementationAuthorized": true'),
      `${draftArtifactFixture}\nD-373`,
    ]) {
      assert.equal(evaluateImp031ArchitectureDraftArtifact(mutation).ok, false);
    }
  });
});

/**
 * Live CURRENT docs are IMP-032 permission-bootstrap boundary clarification (GTM-R84 / STATE-R82).
 * Historical IMP-031 evaluators first normalize back to the R79/S77 acceptance position.
 */
function normalizeImp031AcceptedLifecycleDocs(activatedRoadmap, activatedState) {
  const projected = projectLiveDocsToHistoricalCurrent(activatedRoadmap, activatedState, {
    acceptedThrough: "IMP-031 — Provider-Neutral Delivery Foundation",
    currentSlice: "NONE",
    nextSlice: "IMP-032 — Dehradun Delivery Operating Mode",
    pendingAcceptance: "NONE",
    facts: IMP032_PLANNED_FACTS,
    stateActivity: "IMP-031 COMPLETE_AND_ACCEPTED; IMP-032 PLANNED / NOT_ACTIVATED.",
    roadmapVersion: "GTM-R79",
    stateVersion: "STATE-R77",
  });
  const rewriteCurrent = (docText, sectionStart, sectionEndMarker) => {
    const start = docText.indexOf(sectionStart);
    const end = docText.indexOf(sectionEndMarker, start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = docText.slice(start, end);
    const updated = current
      .replace(/Accepted Through:\s*IMP-032[^\n]*/g, "Accepted Through:     IMP-031 — Provider-Neutral Delivery Foundation")
      .replace(/acceptedThrough:\s*IMP-032\b/g, "acceptedThrough: IMP-031")
      .replace(/Current Product Slice:\s*IMP-033[^\n]*/g, "Current Product Slice: NONE")
      .replace(/Current Product Implementation:\s*IMP-033[^\n]*/g, "Current Product Implementation: NONE")
      .replace(/currentProductSlice:\s*IMP-033\b/g, "currentProductSlice: NONE")
      .replace(/Next Product Slice:\s*IMP-034[^\n]*/g, "Next Product Slice:    IMP-032 — Dehradun Delivery Operating Mode")
      .replace(/nextProductSlice:\s*IMP-034[^\n]*/g, "nextProductSlice: IMP-032 — Dehradun Delivery Operating Mode")
      .replace(
        /IMP-033:\s*ARCHITECTURE_IN_PROGRESS\nIMP-033_ARCHITECTURE:\s*NOT_LOCKED\nIMP-033_ARCHITECTURE_LOCKED:\s*NO\nIMP-033_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED\nIMP-033_IMPLEMENTATION_AUTHORIZED:\s*NO\nIMP-033_STARTED:\s*NO\nIMP-033_IMPLEMENTATION_COMPLETE:\s*NO\nIMP-033_ACCEPTED:\s*NO\n/g,
        "IMP-033: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(
        /IMP-032:\s*COMPLETE_AND_ACCEPTED\nIMP-032_ARCHITECTURE:\s*LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*YES\nIMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES\nIMP-032_STARTED:\s*YES\nIMP-032_IMPLEMENTATION_COMPLETE:\s*YES\nIMP-032_ACCEPTED:\s*YES\n(?:IMP-032_FOUNDER_UAT_REQUIRED:\s*YES\nIMP-032_FOUNDER_UAT:\s*PASS\n)?(?:IMP032_[^\n]*\n)*?(?:FOUNDER_UAT_CANDIDATE_[^\n]*\n)*?IMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(/Current Product Slice:\s*IMP-032[^\n]*/g, "Current Product Slice: NONE")
      .replace(/Current Product Implementation:\s*IMP-032[^\n]*/g, "Current Product Implementation: NONE")
      .replace(/currentProductSlice:\s*IMP-032\b/g, "currentProductSlice: NONE")
      .replace(/Next Product Slice:\s*IMP-033[^\n]*/g, "Next Product Slice:    IMP-032 — Dehradun Delivery Operating Mode")
      .replace(/nextProductSlice:\s*IMP-033[^\n]*/g, "nextProductSlice: IMP-032 — Dehradun Delivery Operating Mode")
      .replace(
        /IMP-032:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\nIMP-032_ARCHITECTURE:\s*LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*YES\nIMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES\nIMP-032_STARTED:\s*YES\nIMP-032_IMPLEMENTATION_COMPLETE:\s*YES\nIMP-032_ACCEPTED:\s*NO\n(?:IMP-032_FOUNDER_UAT_REQUIRED:\s*YES\nIMP-032_FOUNDER_UAT:\s*NOT_STARTED\n)?(?:IMP-032_ACCESS_CONTROL_DATA_SEED_MIGRATION:[^\n]*\n)?(?:IMP-032_BOUNDARY_CLARIFICATION:[^\n]*\n)?(?:IMP-032_COMPLETION:[^\n]*\n)?IMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(
        /IMP-032:\s*IMPLEMENTATION_IN_PROGRESS\nIMP-032_ARCHITECTURE:\s*LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*YES\nIMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES\nIMP-032_STARTED:\s*YES\nIMP-032_IMPLEMENTATION_COMPLETE:\s*NO\nIMP-032_ACCEPTED:\s*NO\nIMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(
        /IMP-032:\s*IMPLEMENTATION_AUTHORIZED\nIMP-032_ARCHITECTURE:\s*LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*YES\nIMP-032_IMPLEMENTATION:\s*AUTHORIZED \/ NOT_STARTED\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES\nIMP-032_STARTED:\s*NO\nIMP-032_IMPLEMENTATION_COMPLETE:\s*NO\nIMP-032_ACCEPTED:\s*NO\nIMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(
        /IMP-032:\s*ARCHITECTURE_LOCKED\nIMP-032_ARCHITECTURE:\s*LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*YES\nIMP-032_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO\nIMP-032_STARTED:\s*NO\nIMP-032_IMPLEMENTATION_COMPLETE:\s*NO\nIMP-032_ACCEPTED:\s*NO\nIMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(
        /IMP-032:\s*ARCHITECTURE_IN_PROGRESS\nIMP-032_ARCHITECTURE:\s*NOT_LOCKED\nIMP-032_ARCHITECTURE_LOCKED:\s*NO\nIMP-032_IMPLEMENTATION:\s*NOT_AUTHORIZED \/ NOT_STARTED\nIMP-032_IMPLEMENTATION_AUTHORIZED:\s*NO\nIMP-032_STARTED:\s*NO\nIMP-032_IMPLEMENTATION_COMPLETE:\s*NO\nIMP-032_ACCEPTED:\s*NO\nIMP-033:\s*PLANNED \/ NOT_ACTIVATED\nD-373_CREATED:\s*NO\nNO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE:\s*YES\n/g,
        "IMP-032: PLANNED / NOT_ACTIVATED\n",
      )
      .replace(/IMP-032_IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMP-032_IMPLEMENTATION_AUTHORIZED: NO")
      .replace(/IMP-032_STARTED:\s*YES/g, "IMP-032_STARTED: NO")
      .replace(/IMP-032:\s*IMPLEMENTATION_IN_PROGRESS\b/g, "IMP-032: PLANNED / NOT_ACTIVATED")
      .replace(/IMP-032:\s*IMPLEMENTATION_AUTHORIZED\b/g, "IMP-032: PLANNED / NOT_ACTIVATED")
      .replace(/IMP-032:\s*ARCHITECTURE_LOCKED\b/g, "IMP-032: PLANNED / NOT_ACTIVATED")
      .replace(/IMP-032:\s*ARCHITECTURE_IN_PROGRESS\b/g, "IMP-032: PLANNED / NOT_ACTIVATED")
      .replace(/Pending Acceptance:\s*IMP-032\b/g, "Pending Acceptance:             NONE")
      .replace(/pendingAcceptance:\s*IMP-032\b/g, "pendingAcceptance: NONE")
      .replace(
        /IMP-032 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE; architecture remains LOCKED; implementation AUTHORIZED \/ STARTED \/ COMPLETE; Founder UAT required before formal acceptance; GTM-R85 \/ STATE-R83 record implementation completion\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      )
      .replace(
        /IMP-032 IMPLEMENTATION_IN_PROGRESS; architecture remains LOCKED; implementation AUTHORIZED \/ STARTED\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      )
      .replace(
        /IMP-032 IMPLEMENTATION_AUTHORIZED; architecture remains LOCKED; implementation AUTHORIZED \/ NOT_STARTED\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      )
      .replace(
        /IMP-032 ARCHITECTURE_LOCKED; locked capability architecture recorded; implementation is not authorized or started\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      )
      .replace(
        /IMP-032 ARCHITECTURE_IN_PROGRESS; architecture is not locked and\n\s*implementation is not authorized or started\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      )
      .replace(
        /IMP-033 ARCHITECTURE_IN_PROGRESS; architecture NOT_LOCKED; implementation NOT_AUTHORIZED \/ NOT_STARTED; GTM-R87 \/ STATE-R85 record IMP-033 activation and draft capability architecture\./g,
        "IMP-031 COMPLETE_AND_ACCEPTED;\n                              IMP-032 PLANNED / NOT_ACTIVATED.",
      );
    return `${docText.slice(0, start)}${updated}${docText.slice(end)}`;
  };
  let roadmapText = rewriteCurrent(projected.roadmapText, "## 2.", "## 3.");
  roadmapText = roadmapText
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | COMPLETE_AND_ACCEPTED |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    )
    .replace(
      "| IMP-033 | Notification Foundation | ARCHITECTURE_IN_PROGRESS |",
      "| IMP-033 | Notification Foundation | PLANNED |",
    )
    .replace(
      "| IMP-033 | Notification Foundation | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |",
      "| IMP-033 | Notification Foundation | PLANNED |",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | IMPLEMENTATION_IN_PROGRESS |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | IMPLEMENTATION_AUTHORIZED |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | ARCHITECTURE_LOCKED |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | ARCHITECTURE_IN_PROGRESS |",
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    );
  const stateText = rewriteCurrent(
    rewriteCurrent(projected.stateText, "## 2. Current Work Position", "\n## "),
    "## 5. Acceptance Position",
    "\n## ",
  );
  return { roadmapText, stateText };
}

/**
 * Live CURRENT IMP-031 capability/architecture docs remain COMPLETE_AND_ACCEPTED.
 * Historical completion/start/authorization/lock evaluators derive fixtures from that live state.
 */
function deriveImp031CompletionArtifact(acceptedArtifact) {
  let text = acceptedArtifact;
  if (!/IMP-031:\s*COMPLETE_AND_ACCEPTED/.test(text) && /IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/.test(text)) {
    return text;
  }
  return text
    .replace(/"implementation": "COMPLETE_AND_ACCEPTED"/, '"implementation": "AUTHORIZED / STARTED / COMPLETE"')
    .replace("| Lifecycle | `COMPLETE_AND_ACCEPTED` |", "| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |")
    .replace("| Accepted | **YES** |", "| Accepted | **NO** |")
    .replace("| Accepted product through | IMP-031 |", "| Accepted product through | IMP-030 |")
    .replace("| Current product slice | NONE |", "| Current product slice | IMP-031 — Provider-Neutral Delivery Foundation |")
    .replace("| Pending acceptance | NONE |", "| Pending acceptance | IMP-031 |")
    .replace("IMP-031: COMPLETE_AND_ACCEPTED", "IMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")
    .replace(/IMP-031_ACCEPTED: YES/, "IMP-031_ACCEPTED: NO")
    .replace(
      "Formal acceptance does not expand beyond locked Boundary C, authorize IMP-032, select a provider,\nor define Dehradun operating mode.",
      "Completion does not accept\nimplementation and does not expand beyond locked Boundary C.",
    )
    .replace(
      "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C and is formally `COMPLETE_AND_ACCEPTED`.",
      "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C only.",
    )
    .replace(
      /```text\nIMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\nIMP-031_ARCHITECTURE: LOCKED\nIMP-031_ARCHITECTURE_LOCKED: YES\nIMP-031_IMPLEMENTATION: AUTHORIZED \/ STARTED \/ COMPLETE\nIMP-031_IMPLEMENTATION_AUTHORIZED: YES\nIMP-031_STARTED: YES\nIMP-031_IMPLEMENTATION_COMPLETE: YES\nIMP-031_ACCEPTED: NO\n```/,
      "```text\nIMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\nIMP-031_ARCHITECTURE: LOCKED\nIMP-031_ARCHITECTURE_LOCKED: YES\nIMP-031_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE\nIMP-031_IMPLEMENTATION_AUTHORIZED: YES\nIMP-031_STARTED: YES\nIMP-031_IMPLEMENTATION_COMPLETE: YES\nIMP-031_ACCEPTED: NO\nCOMPLETION IS NOT ACCEPTANCE: YES\n```",
    )
    .replace(
      /IMP031_IMPLEMENTATION_EVIDENCE: COMPLETE\nIMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED\nIMP031_FORMAL_ACCEPTANCE: ACCEPTED\nIMP031_ACCEPTED_MAIN_SHA: c3d499b0b8df2a8c7ae9297ab870f6286f81b848\nIMP031_ACCEPTED_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099\nIMP-031_FOUNDER_UAT_REQUIRED: NO/,
      "IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nIMP031_INDEPENDENT_ACCEPTANCE: NOT_PERFORMED",
    )
    .replace(
      /\n\nKnown LOW independent-acceptance notes \(NON_BLOCKING_LOW; preserved historical\):\n1\. no explicit dual-cancel concurrency test\n2\. UNKNOWN-specific ambiguous-cancel test uses shared cancel path/,
      "",
    )
    .replace(
      /Those architecture-lock\s+criteria were satisfied\. Implementation is now `AUTHORIZED` \/ `STARTED` \/ `COMPLETE` under Boundary C\nand formally `COMPLETE_AND_ACCEPTED`\./,
      "Those architecture-lock criteria were satisfied. Implementation is now `AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C;\ncompletion is not independent or formal acceptance.",
    )
    .replace(
      /Architecture is\s+`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` \/ `STARTED` \/ `COMPLETE` \/\n`COMPLETE_AND_ACCEPTED`\./,
      "Architecture is\n`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`.",
    );
}

function deriveImp031CompletionArchitecture(acceptedArchitecture) {
  return acceptedArchitecture.replaceAll(
    "implementation AUTHORIZED / STARTED / COMPLETE / COMPLETE_AND_ACCEPTED",
    "implementation AUTHORIZED / STARTED / COMPLETE",
  );
}

function deriveImp031CompletionLifecycleDocs(activatedRoadmap, activatedState) {
  const accepted = normalizeImp031AcceptedLifecycleDocs(activatedRoadmap, activatedState);
  const acceptedRoadmap = accepted.roadmapText;
  const acceptedState = accepted.stateText;
  const rewriteCurrent = (docText, sectionStart, sectionEndMarker) => {
    const start = docText.indexOf(sectionStart);
    const end = docText.indexOf(sectionEndMarker, start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = docText.slice(start, end);
    const updated = current
      .replace(/Accepted Through:\s*IMP-031[^\n]*/g, "Accepted Through:     IMP-030 — Operations Console UI")
      .replace(/acceptedThrough:\s*IMP-031\b/g, "acceptedThrough: IMP-030")
      .replace(/Current Product Slice:\s*NONE\b/g, "Current Product Slice: IMP-031 — Provider-Neutral Delivery Foundation")
      .replace(/Current Product Implementation:\s*NONE\b/g, "Current Product Implementation: IMP-031 — Provider-Neutral Delivery Foundation")
      .replace(/currentProductSlice:\s*NONE\b/g, "currentProductSlice: IMP-031")
      .replace(/Pending Acceptance:\s*NONE\b/g, "Pending Acceptance:    IMP-031")
      .replace(/pendingAcceptance:\s*NONE\b/g, "pendingAcceptance: IMP-031")
      .replace(/IMP-031:\s*COMPLETE_AND_ACCEPTED/g, "IMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")
      .replace(/IMP-031_ACCEPTED:\s*YES/g, "IMP-031_ACCEPTED: NO")
      .replace(/IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED\n/g, "IMP031_INDEPENDENT_ACCEPTANCE: NOT_PERFORMED\n")
      .replace(/IMP031_FORMAL_ACCEPTANCE:\s*ACCEPTED\n/g, "")
      .replace(/IMP031_ACCEPTED_MAIN_SHA:[^\n]*\n/g, "")
      .replace(/IMP031_ACCEPTED_TREE:[^\n]*\n/g, "")
      .replace(/IMP-031_FOUNDER_UAT_REQUIRED:\s*NO\n/g, "")
      .replace(/IMP-032:\s*PLANNED \/ NOT_ACTIVATED\n/g, "")
      .replace(/IMP-031 COMPLETE_AND_ACCEPTED;\n\s*IMP-032 PLANNED \/ NOT_ACTIVATED\./g,
        "IMP-031 capability architecture LOCKED under ARCH-R18;\n                              implementation AUTHORIZED / STARTED / COMPLETE;\n                              IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.")
      .replace(/COMPLETE_AND_ACCEPTED/g, (m, offset, s) => {
        // Only rewrite IMP-031 context already handled; leave IMP-030 alone.
        return m;
      });
    return `${docText.slice(0, start)}${updated}${docText.slice(end)}`;
  };
  let roadmapText = rewriteCurrent(acceptedRoadmap, "## 2.", "## 3.");
  // Restore accepted ledger vs future: put IMP-031 back into future as pending.
  roadmapText = roadmapText
    .replace(
      "| IMP-031 | Provider-Neutral Delivery Foundation | COMPLETE_AND_ACCEPTED |\n",
      "",
    )
    .replace(
      "| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
      "| IMP-031 | Provider-Neutral Delivery Foundation | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |\n| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |",
    );
  const stateText = rewriteCurrent(
    rewriteCurrent(acceptedState, "## 2. Current Work Position", "\n## "),
    "## 5. Acceptance Position",
    "\n## ",
  ).replace(
    "| IMP-031 | Provider-Neutral Delivery Foundation | COMPLETE_AND_ACCEPTED |\n",
    "",
  );
  return { roadmapText, stateText };
}

function deriveImp031StartArtifact(liveArtifact) {
  const completeArtifact = deriveImp031CompletionArtifact(liveArtifact);
  return completeArtifact
    .replace(/"implementation": "AUTHORIZED \/ STARTED \/ COMPLETE"/, '"implementation": "AUTHORIZED / STARTED"')
    .replace("| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |", "| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |")
    .replace("| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |", "| Implementation | `AUTHORIZED` / `STARTED` |")
    .replace("| Implementation complete | **YES** |\n| Accepted | **NO** |\n", "")
    .replace("| Pending acceptance | IMP-031 |\n", "")
    .replace("IMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-031: IMPLEMENTATION_IN_PROGRESS")
    .replace("IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE", "IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED")
    .replace(/IMP-031_IMPLEMENTATION_COMPLETE: YES\n/, "")
    .replace(/IMP-031_ACCEPTED: NO\n/, "")
    .replace(/COMPLETION IS NOT ACCEPTANCE: YES\n/, "START IS NOT COMPLETION OR ACCEPTANCE: YES\n")
    .replace(
      /```text\nIMPLEMENTATION_SOURCE_SHA:[\s\S]*?IMP031_INDEPENDENT_ACCEPTANCE: NOT_PERFORMED\n```\n\n/,
      "",
    )
    .replace(
      "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C only. Completion does not accept\nimplementation and does not expand beyond locked Boundary C.",
      "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` under Boundary C only. Start does not complete or accept implementation\nand does not expand beyond locked Boundary C.",
    )
    .replace(
      /Those architecture-lock\s+criteria were satisfied\. Implementation is now `AUTHORIZED` \/ `STARTED` \/ `COMPLETE` under Boundary C;\s+completion is not independent or formal acceptance\./,
      "Those architecture-lock criteria were satisfied. Implementation is now `AUTHORIZED` / `STARTED` under Boundary C; start is\nnot completion or acceptance.",
    )
    .replace(
      /Architecture is\s+`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` \/ `STARTED` \/ `COMPLETE`\./,
      "Architecture is\n`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED`.",
    );
}

function deriveImp031StartArchitecture(liveArchitecture) {
  return deriveImp031CompletionArchitecture(liveArchitecture).replaceAll(
    "implementation AUTHORIZED / STARTED / COMPLETE",
    "implementation AUTHORIZED / STARTED",
  );
}

function deriveImp031StartLifecycleDocs(liveRoadmap, liveState) {
  const complete = deriveImp031CompletionLifecycleDocs(liveRoadmap, liveState);
  const rewriteCurrent = (docText, sectionStart, sectionEndMarker) => {
    const start = docText.indexOf(sectionStart);
    const end = docText.indexOf(sectionEndMarker, start + 1);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = docText.slice(start, end);
    const updated = current
      .replace(/IMP-031:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/g, "IMP-031: IMPLEMENTATION_IN_PROGRESS")
      .replace(/IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED \/ COMPLETE/g, "IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED")
      .replace(/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES\n/g, "")
      .replace(/IMP-031_ACCEPTED:\s*NO\n/g, "")
      .replace(/Pending Acceptance:\s*IMP-031\b/g, "Pending Acceptance:    NONE")
      .replace(/pendingAcceptance:\s*IMP-031\b/g, "pendingAcceptance: NONE")
      .replace(/implementation AUTHORIZED \/ STARTED \/ COMPLETE/g, "implementation AUTHORIZED / STARTED")
      .replace(/`AUTHORIZED` \/ `STARTED` \/ `COMPLETE`/g, "`AUTHORIZED` / `STARTED`")
      .replace(/\*\*AUTHORIZED\*\* \/ \*\*STARTED\*\* \/ \*\*COMPLETE\*\*/g, "**AUTHORIZED** / **STARTED**");
    return `${docText.slice(0, start)}${updated}${docText.slice(end)}`;
  };
  return {
    roadmapText: rewriteCurrent(complete.roadmapText, "## 2.", "## 3.")
      .replace(
        "| IMP-031 | Provider-Neutral Delivery Foundation | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |",
        "| IMP-031 | Provider-Neutral Delivery Foundation | IMPLEMENTATION_IN_PROGRESS |",
      ),
    stateText: rewriteCurrent(
      rewriteCurrent(complete.stateText, "## 2. Current Work Position", "\n## "),
      "## 5. Acceptance Position",
      "\n## ",
    ),
  };
}

describe("IMP-031 architecture lock checkpoint", () => {
  const lock = Object.freeze({
    roadmapVersion: "GTM-R75", stateVersion: "STATE-R73", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "ARCHITECTURE_LOCKED", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "NO", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false,
  });

  it("preserves R74/S72 draft and supports only R75/S73 lock", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R74", "STATE-R72", "imp031Draft"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R73", "imp031Lock"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74", "imp031Authorization"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75", "imp031Start"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R78", "imp032Activation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R73"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R78"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R72"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R74", "STATE-R73"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R73", "imp031Draft"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74", "imp031Lock"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75", "imp031Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R73"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R74"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R74"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R75"), false);
  });

  it("accepts only the architecture-locked, implementation-unauthorized IMP-031 checkpoint", () => {
    assert.deepEqual(evaluateImp031ArchitectureLockCheckpoint(lock), { ok: true });
    for (const [key, value] of [
      ["architectureLocked", "NO"], ["architecture", "NOT_LOCKED"], ["imp031", "ARCHITECTURE_IN_PROGRESS"],
      ["implementationAuthorized", "YES"], ["started", "YES"],
      ["acceptedThrough", "IMP-031"], ["pendingAcceptance", "IMP-031"], ["nextProductSlice", "IMP-031"],
      ["architectureVersion", "ARCH-R17"], ["decisionRegisterVersion", "DR-15"],
      ["artifact", false], ["archG24", false], ["d373Exists", true],
      ["roadmapVersion", "GTM-R74"], ["stateVersion", "STATE-R72"],
    ]) {
      assert.equal(evaluateImp031ArchitectureLockCheckpoint({ ...lock, [key]: value }).ok, false, key);
    }
  });

  it("rejects locked ROADMAP vs unlocked capability and premature authorization", () => {
    const startedArtifact = deriveImp031StartArtifact(
      readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8"),
    );
    const artifact = startedArtifact
      .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
      .replace(/"implementationAuthorized": true/, '"implementationAuthorized": false')
      .replace("| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |", "| Lifecycle | `ARCHITECTURE_LOCKED` |")
      .replace("| Implementation | `AUTHORIZED` / `STARTED` |", "| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |")
      .replace("| Implementation authorized | **YES** |", "| Implementation authorized | **NO** |")
      .replace("IMP-031: IMPLEMENTATION_IN_PROGRESS", "IMP-031: ARCHITECTURE_LOCKED")
      .replace("IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED", "IMP-031_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED")
      .replace(/IMP-031_IMPLEMENTATION_AUTHORIZED: YES/g, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO")
      .replace(/IMP-031_STARTED: YES/g, "IMP-031_STARTED: NO")
      .replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES\n/, "")
      .replace(
        "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` under Boundary C only. Start does not complete or accept implementation\nand does not expand beyond locked Boundary C.",
        "This document locks the provider-neutral Delivery foundation for IMP-031. Architecture lock does not\nauthorize or start implementation.",
      );
    assert.deepEqual(evaluateImp031ArchitectureLockArtifact(artifact), { ok: true });
    for (const mutation of [
      artifact.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      artifact.replace("IMP-031_ARCHITECTURE_LOCKED: YES", "IMP-031_ARCHITECTURE_LOCKED: NO"),
      artifact.replace('"implementationAuthorized": false', '"implementationAuthorized": true'),
      artifact.replace("IMP-031_IMPLEMENTATION_AUTHORIZED: NO", "IMP-031_IMPLEMENTATION_AUTHORIZED: YES"),
      artifact.replace("IMP-031_STARTED: NO", "IMP-031_STARTED: YES"),
      artifact.replace(/\| `BOOKING_OUTCOME_UNKNOWN` \|[^\n]+\n/, ""),
      `${artifact}\nD-373`,
    ]) {
      assert.equal(evaluateImp031ArchitectureLockArtifact(mutation).ok, false);
    }
  });
});

describe("IMP-031 implementation authorization checkpoint", () => {
  const authorization = Object.freeze({
    roadmapVersion: "GTM-R76", stateVersion: "STATE-R74", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "IMPLEMENTATION_AUTHORIZED", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / NOT_STARTED", implementationAuthorized: "YES", started: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false, boundaryC: true,
  });

  function toAuthorizationArtifact(completeArtifact) {
    return deriveImp031StartArtifact(completeArtifact)
      .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "AUTHORIZED / NOT_STARTED"')
      .replace("| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |", "| Lifecycle | `IMPLEMENTATION_AUTHORIZED` |")
      .replace("| Implementation | `AUTHORIZED` / `STARTED` |", "| Implementation | `AUTHORIZED` / `NOT_STARTED` |")
      .replace("IMP-031: IMPLEMENTATION_IN_PROGRESS", "IMP-031: IMPLEMENTATION_AUTHORIZED")
      .replace("IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED", "IMP-031_IMPLEMENTATION: AUTHORIZED / NOT_STARTED")
      .replace(/IMP-031_STARTED: YES/g, "IMP-031_STARTED: NO")
      .replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES/, "AUTHORIZATION IS NOT IMPLEMENTATION START: YES")
      .replace(
        "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` under Boundary C only. Start does not complete or accept implementation\nand does not expand beyond locked Boundary C.",
        "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `NOT_STARTED`; authorization does not start implementation.",
      );
  }

  function toAuthorizationArchitecture(completeArchitecture) {
    return deriveImp031StartArchitecture(completeArchitecture).replaceAll(
      "implementation AUTHORIZED / STARTED",
      "implementation AUTHORIZED / NOT_STARTED",
    );
  }

  function toAuthorizationLifecycleDocs(completeRoadmap, completeState) {
    const started = deriveImp031StartLifecycleDocs(completeRoadmap, completeState);
    const rewriteCurrent = (text, sectionStart, sectionEndMarker) => {
      const start = text.indexOf(sectionStart);
      const end = text.indexOf(sectionEndMarker, start + 1);
      assert.notEqual(start, -1);
      assert.notEqual(end, -1);
      const current = text.slice(start, end);
      const updated = current
        .replace(/IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/g, "IMP-031: IMPLEMENTATION_AUTHORIZED")
        .replace(/IMP-031_IMPLEMENTATION:\s*AUTHORIZED \/ STARTED/g, "IMP-031_IMPLEMENTATION: AUTHORIZED / NOT_STARTED")
        .replace(/IMP-031_STARTED:\s*YES/g, "IMP-031_STARTED: NO")
        .replace(/implementation AUTHORIZED \/ STARTED/g, "implementation AUTHORIZED / NOT_STARTED")
        .replace(/`AUTHORIZED` \/ `STARTED`/g, "`AUTHORIZED` / `NOT_STARTED`")
        .replace(/\*\*AUTHORIZED\*\* \/ \*\*STARTED\*\*/g, "**AUTHORIZED** / **NOT_STARTED**");
      return `${text.slice(0, start)}${updated}${text.slice(end)}`;
    };
    return {
      roadmapText: rewriteCurrent(started.roadmapText, "## 2.", "## 3.")
        .replace(
          "| IMP-031 | Provider-Neutral Delivery Foundation | IMPLEMENTATION_IN_PROGRESS |",
          "| IMP-031 | Provider-Neutral Delivery Foundation | IMPLEMENTATION_AUTHORIZED |",
        ),
      stateText: rewriteCurrent(
        rewriteCurrent(started.stateText, "## 2. Current Work Position", "\n## "),
        "## 5. Acceptance Position",
        "\n## ",
      ),
    };
  }

  it("supports only the R76/S74 authorization checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74", "imp031Authorization"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R73", "imp031Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R73", "imp031Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R75", "STATE-R74", "imp031Authorization"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75", "imp031Authorization"), false);
  });

  it("accepts only the authorized / not-started IMP-031 checkpoint", () => {
    assert.deepEqual(evaluateImp031ImplementationAuthorizationCheckpoint(authorization), { ok: true });
    for (const [key, value] of [
      ["imp031", "ARCHITECTURE_LOCKED"], ["architecture", "NOT_LOCKED"], ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"], ["started", "YES"],
      ["implementation", "NOT_AUTHORIZED / NOT_STARTED"],
      ["acceptedThrough", "IMP-031"], ["currentProductSlice", "IMP-032"], ["nextProductSlice", "IMP-031"],
      ["pendingAcceptance", "IMP-031"],
      ["architectureVersion", "ARCH-R17"], ["decisionRegisterVersion", "DR-15"],
      ["artifact", false], ["archG24", false], ["d373Exists", true], ["boundaryC", false],
      ["roadmapVersion", "GTM-R75"], ["stateVersion", "STATE-R73"],
    ]) {
      assert.equal(evaluateImp031ImplementationAuthorizationCheckpoint({ ...authorization, [key]: value }).ok, false, key);
    }
  });

  it("rejects unauthorized architecture, started markers, and marker disagreement", () => {
    const artifact = toAuthorizationArtifact(
      readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8"),
    );
    assert.deepEqual(evaluateImp031ImplementationAuthorizationArtifact(artifact), { ok: true });
    assert.match(artifact, /AUTHORIZATION IS NOT IMPLEMENTATION START:\s*YES/);
    assert.match(artifact, /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/);
    for (const mutation of [
      artifact.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      artifact.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      artifact.replace('"implementation": "AUTHORIZED / NOT_STARTED"', '"implementation": "NOT_AUTHORIZED / NOT_STARTED"'),
      artifact.replace("IMP-031_IMPLEMENTATION_AUTHORIZED: YES", "IMP-031_IMPLEMENTATION_AUTHORIZED: NO"),
      artifact.replace("IMP-031_STARTED: NO", "IMP-031_STARTED: YES"),
      artifact.replace("IMP-031: IMPLEMENTATION_AUTHORIZED", "IMP-031: ARCHITECTURE_LOCKED"),
      artifact.replace(/AUTHORIZATION IS NOT IMPLEMENTATION START: YES\n/, ""),
      artifact.replace(/\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/, "| Implementation boundary | **A** |"),
      `${artifact}\nD-373`,
    ]) {
      assert.equal(evaluateImp031ImplementationAuthorizationArtifact(mutation).ok, false);
    }
  });

  it("rejects authorized-while-unlocked and started-while-unauthorized combinations", () => {
    assert.equal(
      evaluateImp031ImplementationAuthorizationCheckpoint({
        ...authorization,
        architectureLocked: "NO",
        architecture: "NOT_LOCKED",
        implementationAuthorized: "YES",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp031ImplementationAuthorizationCheckpoint({
        ...authorization,
        implementationAuthorized: "NO",
        started: "YES",
        implementation: "AUTHORIZED / STARTED",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp031ArchitectureLockCheckpoint({
        roadmapVersion: "GTM-R75", stateVersion: "STATE-R73", acceptedThrough: "IMP-030",
        currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
        imp031: "ARCHITECTURE_LOCKED", architecture: "LOCKED", architectureLocked: "YES",
        implementation: "NOT_AUTHORIZED / NOT_STARTED", implementationAuthorized: "YES", started: "NO",
        architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
        artifact: true, archG24: true, d373Exists: false,
      }).ok,
      false,
    );
  });

  it("requires CURRENT ARCHITECTURE Delivery / IMP-031 AUTHORIZED / NOT_STARTED wording", () => {
    const architectureText = toAuthorizationArchitecture(
      readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8"),
    );
    assert.deepEqual(evaluateImp031CurrentArchitectureStatus(architectureText), { ok: true });
    const stale = architectureText
      .replaceAll("implementation AUTHORIZED / NOT_STARTED", "implementation NOT_AUTHORIZED / NOT_STARTED");
    const result = evaluateImp031CurrentArchitectureStatus(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ARCH_STATUS_STALE");
    assert.match(result.message, /NOT_AUTHORIZED/);
  });

  it("rejects authorization YES elsewhere while CURRENT ARCHITECTURE says NOT_AUTHORIZED", () => {
    const liveRoadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    const liveState = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
    const { roadmapText, stateText } = toAuthorizationLifecycleDocs(liveRoadmap, liveState);
    const capabilityText = toAuthorizationArtifact(
      readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8"),
    );
    const architectureText = toAuthorizationArchitecture(
      readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8"),
    );
    assert.deepEqual(
      evaluateImp031ImplementationAuthorizationCrossDocumentAlignment({
        architectureText, capabilityText, roadmapText, stateText,
      }),
      { ok: true },
    );
    const staleArchitecture = architectureText.replaceAll(
      "implementation AUTHORIZED / NOT_STARTED",
      "implementation NOT_AUTHORIZED / NOT_STARTED",
    );
    const stale = evaluateImp031ImplementationAuthorizationCrossDocumentAlignment({
      architectureText: staleArchitecture, capabilityText, roadmapText, stateText,
    });
    assert.equal(stale.ok, false);
    assert.equal(stale.code, "IMP031_ARCH_STATUS_STALE");
  });

  it("rejects started=YES while authorization=NO across current markers", () => {
    const liveRoadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    const liveState = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
    const { roadmapText, stateText } = toAuthorizationLifecycleDocs(liveRoadmap, liveState);
    const capabilityText = toAuthorizationArtifact(
      readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8"),
    );
    const architectureText = toAuthorizationArchitecture(
      readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8"),
    );
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap
        .replace(/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO")
        .replace(/IMP-031_STARTED:\s*NO/, "IMP-031_STARTED: YES"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance
        .replace(/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO")
        .replace(/IMP-031_STARTED:\s*NO/, "IMP-031_STARTED: YES"),
    );
    const result = evaluateImp031ImplementationAuthorizationCrossDocumentAlignment({
      architectureText,
      capabilityText,
      roadmapText: mutatedRoadmap,
      stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_STARTED_WITHOUT_AUTHORIZATION");
  });
});

describe("IMP-031 implementation start checkpoint", () => {
  const start = Object.freeze({
    roadmapVersion: "GTM-R77", stateVersion: "STATE-R75", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp031: "IMPLEMENTATION_IN_PROGRESS", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED", implementationAuthorized: "YES", started: "YES",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false, boundaryC: true,
  });

  const completeCapability = readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8");
  const completeArchitecture = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const completeRoadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const completeState = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const startCapability = deriveImp031StartArtifact(completeCapability);
  const startArchitecture = deriveImp031StartArchitecture(completeArchitecture);
  const startDocs = deriveImp031StartLifecycleDocs(completeRoadmap, completeState);

  it("supports only the R77/S75 start checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75", "imp031Start"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R74", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R75", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R76", "STATE-R74", "imp031Authorization"), true);
  });

  it("accepts only the authorized / started / in-progress IMP-031 checkpoint", () => {
    assert.deepEqual(evaluateImp031ImplementationStartCheckpoint(start), { ok: true });
    for (const [key, value] of [
      ["imp031", "IMPLEMENTATION_AUTHORIZED"], ["architecture", "NOT_LOCKED"], ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"], ["started", "NO"],
      ["implementation", "AUTHORIZED / NOT_STARTED"],
      ["acceptedThrough", "IMP-031"], ["currentProductSlice", "IMP-032"], ["nextProductSlice", "IMP-031"],
      ["pendingAcceptance", "IMP-031"],
      ["architectureVersion", "ARCH-R17"], ["decisionRegisterVersion", "DR-15"],
      ["artifact", false], ["archG24", false], ["d373Exists", true], ["boundaryC", false],
      ["roadmapVersion", "GTM-R76"], ["stateVersion", "STATE-R74"],
    ]) {
      assert.equal(evaluateImp031ImplementationStartCheckpoint({ ...start, [key]: value }).ok, false, key);
    }
  });

  it("rejects unauthorized start, unstarted in-progress, unlocked start, and D-373", () => {
    const artifact = startCapability;
    assert.deepEqual(evaluateImp031ImplementationStartArtifact(artifact), { ok: true });
    assert.match(artifact, /START IS NOT COMPLETION OR ACCEPTANCE:\s*YES/);
    assert.match(artifact, /C\. domain model \+ persistence foundation \+ provider-neutral ports\/interfaces/);
    for (const mutation of [
      artifact.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      artifact.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      artifact.replace('"implementation": "AUTHORIZED / STARTED"', '"implementation": "AUTHORIZED / NOT_STARTED"'),
      artifact.replace("IMP-031_IMPLEMENTATION_AUTHORIZED: YES", "IMP-031_IMPLEMENTATION_AUTHORIZED: NO"),
      artifact.replace("IMP-031_STARTED: YES", "IMP-031_STARTED: NO"),
      artifact.replace("IMP-031: IMPLEMENTATION_IN_PROGRESS", "IMP-031: IMPLEMENTATION_AUTHORIZED"),
      artifact.replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES\n/, ""),
      artifact.replace(/\| Implementation boundary \| \*\*C — APPROVED WITH THIS LIFECYCLE AMENDMENT\*\* \|/, "| Implementation boundary | **A** |"),
      `${artifact}\nD-373`,
    ]) {
      assert.equal(evaluateImp031ImplementationStartArtifact(mutation).ok, false);
    }
  });

  it("rejects stale present-tense AUTHORIZED / NOT_STARTED in capability §§10–11 while STARTED=YES", () => {
    const artifact = startCapability;
    assert.deepEqual(evaluateImp031ImplementationStartCapabilityCurrentStatus(artifact), { ok: true });
    assert.match(artifact, /implementation remains unauthorized until a separate gate/);
    assert.match(artifact, /authorization does not start\s+implementation/);

    const staleSection10 = artifact.replace(
      /Those architecture-lock\s+criteria were satisfied\. Implementation is now `AUTHORIZED` \/ `STARTED` under Boundary C; start is\s+not completion or acceptance\./,
      "This capability satisfies the architecture-lock criteria. Implementation is now `AUTHORIZED` / `NOT_STARTED` for\nBoundary C only; start remains a separate gate.",
    );
    const stale10 = evaluateImp031ImplementationStartCapabilityCurrentStatus(staleSection10);
    assert.equal(stale10.ok, false);
    assert.equal(stale10.code, "IMP031_CAPABILITY_STATUS_STALE");
    assert.equal(evaluateImp031ImplementationStartArtifact(staleSection10).ok, false);

    const staleSection11 = artifact.replace(
      /Architecture is\s+`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` \/ `STARTED`\./,
      "Architecture is\n`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `NOT_STARTED`.",
    );
    const stale11 = evaluateImp031ImplementationStartCapabilityCurrentStatus(staleSection11);
    assert.equal(stale11.ok, false);
    assert.equal(stale11.code, "IMP031_CAPABILITY_STATUS_STALE");
    assert.equal(evaluateImp031ImplementationStartArtifact(staleSection11).ok, false);
  });

  it("preserves historical architecture-lock NOT_STARTED records outside STARTED current-status checks", () => {
    const lockArtifact = startCapability
      .replace(/"implementation": "AUTHORIZED \/ STARTED"/, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
      .replace(/"implementationAuthorized": true/, '"implementationAuthorized": false')
      .replace("| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |", "| Lifecycle | `ARCHITECTURE_LOCKED` |")
      .replace("| Implementation | `AUTHORIZED` / `STARTED` |", "| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |")
      .replace("| Implementation authorized | **YES** |", "| Implementation authorized | **NO** |")
      .replace("IMP-031: IMPLEMENTATION_IN_PROGRESS", "IMP-031: ARCHITECTURE_LOCKED")
      .replace("IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED", "IMP-031_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED")
      .replace(/IMP-031_IMPLEMENTATION_AUTHORIZED: YES/g, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO")
      .replace(/IMP-031_STARTED: YES/g, "IMP-031_STARTED: NO")
      .replace(/START IS NOT COMPLETION OR ACCEPTANCE: YES\n/, "")
      .replace(
        "This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is\n`AUTHORIZED` / `STARTED` under Boundary C only. Start does not complete or accept implementation\nand does not expand beyond locked Boundary C.",
        "This document locks the provider-neutral Delivery foundation for IMP-031. Architecture lock does not\nauthorize or start implementation.",
      )
      .replace(
        /Those architecture-lock\s+criteria were satisfied\. Implementation is now `AUTHORIZED` \/ `STARTED` under Boundary C; start is\s+not completion or acceptance\./,
        "This capability satisfies the architecture-lock criteria. Implementation is now `AUTHORIZED` / `NOT_STARTED` for\nBoundary C only; start remains a separate gate.",
      )
      .replace(
        /Architecture is\s+`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` \/ `STARTED`\./,
        "Architecture is\n`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `NOT_STARTED`.",
      );
    assert.match(lockArtifact, /implementation remains unauthorized until a separate gate/);
    assert.match(lockArtifact, /AUTHORIZED` \/ `NOT_STARTED/);
    assert.deepEqual(evaluateImp031ArchitectureLockArtifact(lockArtifact), { ok: true });
    assert.equal(evaluateImp031ImplementationStartArtifact(lockArtifact).ok, false);
  });

  it("requires CURRENT ARCHITECTURE Delivery / IMP-031 AUTHORIZED / STARTED wording", () => {
    const architectureText = startArchitecture;
    assert.deepEqual(evaluateImp031ImplementationStartCurrentArchitectureStatus(architectureText), { ok: true });
    const stale = architectureText.replaceAll(
      "implementation AUTHORIZED / STARTED",
      "implementation AUTHORIZED / NOT_STARTED",
    );
    const result = evaluateImp031ImplementationStartCurrentArchitectureStatus(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ARCH_STATUS_STALE");
  });

  it("rejects started=YES while authorization=NO", () => {
    const roadmapText = startDocs.roadmapText;
    const stateText = startDocs.stateText;
    const capabilityText = startCapability;
    const architectureText = startArchitecture;
    assert.deepEqual(
      evaluateImp031ImplementationStartCrossDocumentAlignment({
        architectureText, capabilityText, roadmapText, stateText,
      }),
      { ok: true },
    );
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_IMPLEMENTATION_AUTHORIZED:\s*YES/, "IMP-031_IMPLEMENTATION_AUTHORIZED: NO"),
    );
    const result = evaluateImp031ImplementationStartCrossDocumentAlignment({
      architectureText,
      capabilityText,
      roadmapText: mutatedRoadmap,
      stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_STARTED_WITHOUT_AUTHORIZATION");
  });

  it("rejects IMPLEMENTATION_IN_PROGRESS while STARTED=NO", () => {
    const roadmapText = startDocs.roadmapText;
    const stateText = startDocs.stateText;
    const capabilityText = startCapability;
    const architectureText = startArchitecture;
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_STARTED:\s*YES/, "IMP-031_STARTED: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_STARTED:\s*YES/, "IMP-031_STARTED: NO"),
    );
    const result = evaluateImp031ImplementationStartCrossDocumentAlignment({
      architectureText,
      capabilityText,
      roadmapText: mutatedRoadmap,
      stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_IN_PROGRESS_WITHOUT_START");
  });

  it("rejects CURRENT ARCH still NOT_STARTED while canonical docs say STARTED", () => {
    const roadmapText = startDocs.roadmapText;
    const stateText = startDocs.stateText;
    const capabilityText = startCapability;
    const architectureText = startArchitecture
      .replaceAll("implementation AUTHORIZED / STARTED", "implementation AUTHORIZED / NOT_STARTED");
    const result = evaluateImp031ImplementationStartCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText, stateText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ARCH_STATUS_STALE");
  });

  it("rejects unlocked architecture with implementation started", () => {
    const roadmapText = startDocs.roadmapText;
    const stateText = startDocs.stateText;
    const capabilityText = startCapability;
    const architectureText = startArchitecture;
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_ARCHITECTURE_LOCKED:\s*YES/, "IMP-031_ARCHITECTURE_LOCKED: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_ARCHITECTURE_LOCKED:\s*YES/, "IMP-031_ARCHITECTURE_LOCKED: NO"),
    );
    const result = evaluateImp031ImplementationStartCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_STARTED_WITHOUT_LOCK");
  });

  it("rejects ROADMAP/STATE/capability disagreement on current markers", () => {
    const roadmapText = startDocs.roadmapText;
    const stateText = startDocs.stateText;
    const capabilityText = startCapability;
    const architectureText = startArchitecture;
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031:\s*IMPLEMENTATION_IN_PROGRESS/, "IMP-031: IMPLEMENTATION_AUTHORIZED"),
    );
    const result = evaluateImp031ImplementationStartCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_CURRENT_LIFECYCLE");
  });
});

describe("IMP-031 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R78", stateVersion: "STATE-R76", acceptedThrough: "IMP-030",
    currentProductSlice: "IMP-031", nextProductSlice: "IMP-032", pendingAcceptance: "IMP-031",
    imp031: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false, boundaryC: true,
    implementationEvidence: true, independentReviewPass: true,
  });

  const liveCapability = readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8");
  const liveArchitecture = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const liveRoadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const liveState = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const capabilityText = deriveImp031CompletionArtifact(liveCapability);
  const architectureText = deriveImp031CompletionArchitecture(liveArchitecture);
  const completionDocs = deriveImp031CompletionLifecycleDocs(liveRoadmap, liveState);
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R78/S76 completion checkpoint and preserves R79/S77 acceptance separately", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R75", "imp031Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R75", "imp031Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R77", "STATE-R76", "imp031Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Start"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Acceptance"), true);
  });

  it("accepts only the complete-pending-acceptance IMP-031 checkpoint", () => {
    assert.deepEqual(evaluateImp031ImplementationCompletionCheckpoint(completion), { ok: true });
    for (const [key, value] of [
      ["imp031", "IMPLEMENTATION_IN_PROGRESS"], ["implementationComplete", "NO"], ["accepted", "YES"],
      ["started", "NO"], ["implementationAuthorized", "NO"],
      ["acceptedThrough", "IMP-031"], ["currentProductSlice", "NONE"], ["pendingAcceptance", "NONE"],
      ["nextProductSlice", "IMP-031"],
      ["architectureVersion", "ARCH-R17"], ["decisionRegisterVersion", "DR-15"],
      ["artifact", false], ["archG24", false], ["d373Exists", true], ["boundaryC", false],
      ["implementationEvidence", false], ["independentReviewPass", false],
      ["roadmapVersion", "GTM-R77"], ["stateVersion", "STATE-R75"],
    ]) {
      assert.equal(evaluateImp031ImplementationCompletionCheckpoint({ ...completion, [key]: value }).ok, false, key);
    }
  });

  it("accepts derived completion artifact and rejects incomplete / accepted progression", () => {
    assert.deepEqual(evaluateImp031ImplementationCompletionArtifact(capabilityText), { ok: true });
    assert.match(capabilityText, /COMPLETION IS NOT ACCEPTANCE:\s*YES/);
    assert.match(capabilityText, /IMPLEMENTATION_SOURCE_SHA:\s*66e2783afa4e9eef35c4ec208b25af9d9450f83d/);
    for (const mutation of [
      capabilityText.replace('"implementation": "AUTHORIZED / STARTED / COMPLETE"', '"implementation": "AUTHORIZED / STARTED"'),
      capabilityText.replace("IMP-031: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-031: IMPLEMENTATION_IN_PROGRESS"),
      capabilityText.replace("IMP-031_IMPLEMENTATION_COMPLETE: YES", "IMP-031_IMPLEMENTATION_COMPLETE: NO"),
      capabilityText.replace("IMP-031_ACCEPTED: NO", "IMP-031_ACCEPTED: YES"),
      capabilityText.replace("IMP-031_STARTED: YES", "IMP-031_STARTED: NO"),
      capabilityText.replace(/COMPLETION IS NOT ACCEPTANCE: YES\n/, ""),
      `${capabilityText}\nD-373`,
    ]) {
      assert.equal(evaluateImp031ImplementationCompletionArtifact(mutation).ok, false);
    }
  });

  it("rejects COMPLETE YES while STARTED NO", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_STARTED:\s*YES/, "IMP-031_STARTED: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_STARTED:\s*YES/, "IMP-031_STARTED: NO"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText,
      capabilityText,
      roadmapText: mutatedRoadmap,
      stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_COMPLETE_WITHOUT_START");
  });

  it("rejects COMPLETE_PENDING_ACCEPTANCE while complete marker NO", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/, "IMP-031_IMPLEMENTATION_COMPLETE: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/, "IMP-031_IMPLEMENTATION_COMPLETE: NO"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText,
      capabilityText,
      roadmapText: mutatedRoadmap,
      stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_PENDING_WITHOUT_COMPLETE");
  });

  it("rejects completion with accepted YES", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_ACCEPTED:\s*NO/, "IMP-031_ACCEPTED: YES"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_ACCEPTED:\s*NO/, "IMP-031_ACCEPTED: YES"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_COMPLETION_ACCEPTED");
  });

  it("rejects completion with acceptedThrough advanced to IMP-031", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Accepted Through:\s*IMP-030[^\n]*/, "Accepted Through:     IMP-031 — Provider-Neutral Delivery Foundation"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/acceptedThrough:\s*IMP-030/, "acceptedThrough: IMP-031"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ACCEPTED_THROUGH_ADVANCED");
  });

  it("rejects completion with pendingAcceptance NONE", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Pending Acceptance:\s*IMP-031\b/, "Pending Acceptance:    NONE"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/pendingAcceptance:\s*IMP-031\b/, "pendingAcceptance: NONE"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_PENDING_ACCEPTANCE");
  });

  it("rejects completion with currentProductSlice NONE", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Current Product Slice:\s*IMP-031[^\n]*/, "Current Product Slice: NONE"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/currentProductSlice:\s*IMP-031\b/, "currentProductSlice: NONE"),
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_CURRENT_SLICE_CLEARED");
  });

  it("rejects IMP-032 activated before IMP-031 acceptance", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      `${currentRoadmap}\nIMP-032: ARCHITECTURE_IN_PROGRESS\nIMP-032_IMPLEMENTATION_AUTHORIZED: YES\n`,
    );
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_IMP032_ACTIVATED");
  });

  it("rejects CURRENT ARCH STARTED-only while canonical completion says STARTED/COMPLETE", () => {
    const staleArchitecture = architectureText
      .replaceAll("implementation AUTHORIZED / STARTED / COMPLETE", "implementation AUTHORIZED / STARTED");
    const result = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText: staleArchitecture, capabilityText, roadmapText, stateText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ARCH_STATUS_STALE");
  });

  it("aligns derived completion documents and rejects live accepted docs as completion", () => {
    assert.deepEqual(
      evaluateImp031ImplementationCompletionCrossDocumentAlignment({
        architectureText, capabilityText, roadmapText, stateText,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp031ImplementationCompletionCurrentArchitectureStatus(architectureText), { ok: true });
    const liveAccepted = evaluateImp031ImplementationCompletionCrossDocumentAlignment({
      architectureText: liveArchitecture,
      capabilityText: liveCapability,
      roadmapText: liveRoadmap,
      stateText: liveState,
    });
    assert.equal(liveAccepted.ok, false);
  });
});

describe("IMP-030 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R72", stateVersion: "STATE-R70", acceptedThrough: "IMP-030",
    currentProductSlice: "NONE", nextProductSlice: "IMP-031", pendingAcceptance: "NONE",
    imp029: "COMPLETE_AND_ACCEPTED", imp030: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp031: "PLANNED",
    architectureVersion: "ARCH-R17", decisionRegisterVersion: "DR-14", d372Current: true,
    d373Exists: false, artifact: true,
  });

  const historicalAuthority = loadHistoricalAuthorityCorpus();
  const roadmapText = historicalAuthority.roadmapText;
  const stateText = historicalAuthority.stateText;
  const decisionText = decisionRegisterWithoutD373();
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readFileSync(new URL("../docs/platform/capabilities/IMP-030-operations-console-ui.md", import.meta.url), "utf8");

  function acceptanceDocuments(overrides = {}) {
    return {
      roadmap: {
        text: overrides.roadmapText ?? roadmapText,
        meta: {
          roadmapVersion: overrides.roadmapVersion ?? "GTM-R72",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-030",
          currentProductSlice: overrides.currentProductSlice ?? "NONE",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      state: {
        text: overrides.stateText ?? stateText,
        meta: {
          stateVersion: overrides.stateVersion ?? "STATE-R70",
          acceptedThrough: overrides.acceptedThrough ?? "IMP-030",
          currentProductSlice: overrides.currentProductSlice ?? "NONE",
          nextProductSlice: overrides.nextProductSlice ?? "IMP-031",
          pendingAcceptance: overrides.pendingAcceptance ?? "NONE",
        },
      },
      architecture: {
        meta: { architectureVersion: overrides.architectureVersion ?? "ARCH-R17" },
        text: architectureText,
      },
      decision: {
        meta: { decisionRegisterVersion: overrides.decisionRegisterVersion ?? "DR-14" },
        text: overrides.decisionText ?? decisionText,
      },
      artifact: overrides.artifact ?? true,
      artifactText: overrides.artifactText ?? capabilityText,
    };
  }

  function replaceCurrentFact(text, key, value) {
    const start = text.indexOf("## 2.");
    const end = text.indexOf("## 3.", start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    const current = text.slice(start, end);
    const updated = current.replace(new RegExp(`^${key}:.*$`, "m"), `${key}: ${value}`);
    assert.notEqual(updated, current, `current ${key} must exist`);
    return `${text.slice(0, start)}${updated}${text.slice(end)}`;
  }

  it("accepts only the R72/S70 formal-acceptance checkpoint", () => {
    assert.deepEqual(evaluateImp030AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R72", "STATE-R70", "acceptance"), true);
    assert.match(capabilityText, /"implementation":\s*"COMPLETE_AND_ACCEPTED"/);
    assert.match(capabilityText, /IMP-030_ACCEPTED:\s*YES/);
    assert.match(capabilityText, /D-373:\s*NOT_CREATED/);
  });

  it("preserves predecessor checkpoints and rejects unsupported cross-pairs", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R71", "STATE-R69", "consistencyRepair"), true);
    for (const [roadmapVersion, stateVersion] of [
      ["GTM-R72", "STATE-R69"],
      ["GTM-R71", "STATE-R70"],
      ["GTM-R72", "STATE-R68"],
      ["GTM-R70", "STATE-R70"],
    ]) {
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion, "acceptance"), false);
      assert.equal(isSupportedImp030GovernanceCheckpoint(roadmapVersion, stateVersion), false);
    }
  });

  it("rejects activation of IMP-031 or creation of D-373", () => {
    assert.equal(evaluateImp030AcceptanceCheckpoint({ ...acceptance, imp031: "ACTIVATED" }).ok, false);
    assert.equal(evaluateImp030AcceptanceCheckpoint({ ...acceptance, d373Exists: true }).ok, false);
    assert.equal(
      evaluateImp030AcceptanceDocuments(acceptanceDocuments({
        decisionText: decisionText.replace("| D-372 |", "| D-373 |\n| D-372 |"),
      })).ok,
      false,
    );
  });

  it("rejects drift away from acceptedThrough IMP-030 / currentProductSlice NONE", () => {
    for (const [key, value] of [
      ["acceptedThrough", "IMP-029"],
      ["currentProductSlice", "IMP-030"],
      ["currentProductSlice", "IMP-031"],
      ["pendingAcceptance", "IMP-030"],
      ["nextProductSlice", "IMP-032"],
      ["imp030", "IMPLEMENTATION_IN_PROGRESS"],
      ["implementationComplete", "NO"],
      ["accepted", "NO"],
      ["architectureVersion", "ARCH-R18"],
      ["decisionRegisterVersion", "DR-15"],
      ["artifact", false],
      ["roadmapVersion", "GTM-R71"],
      ["stateVersion", "STATE-R69"],
    ]) {
      assert.equal(evaluateImp030AcceptanceCheckpoint({ ...acceptance, [key]: value }).ok, false, key);
    }
  });

  it("rejects incomplete or unaccepted current lifecycle facts", () => {
    for (const [field, value] of [
      ["IMP-030", "IMPLEMENTATION_IN_PROGRESS"],
      ["IMP-030_IMPLEMENTATION_COMPLETE", "NO"],
      ["IMP-030_ACCEPTED", "NO"],
      ["IMP-030_IMPLEMENTATION", "AUTHORIZED / STARTED"],
    ]) {
      const fixture = replaceCurrentFact(stateText, field, value);
      assert.equal(evaluateImp030AcceptanceDocuments(acceptanceDocuments({ stateText: fixture })).ok, false, field);
    }
  });
});

describe("IMP-031 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R79", stateVersion: "STATE-R77", acceptedThrough: "IMP-031",
    currentProductSlice: "NONE", nextProductSlice: "IMP-032", pendingAcceptance: "NONE",
    imp030: "COMPLETE_AND_ACCEPTED", imp031: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp032: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, archG24: true, d373Exists: false, boundaryC: true,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    acceptedMainSha: "c3d499b0b8df2a8c7ae9297ab870f6286f81b848",
    acceptedTree: "dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099",
  });

  const liveRoadmapText = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const liveStateText = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const acceptedDocs = normalizeImp031AcceptedLifecycleDocs(liveRoadmapText, liveStateText);
  const roadmapText = acceptedDocs.roadmapText;
  const stateText = acceptedDocs.stateText;
  const architectureText = readFileSync(new URL("../docs/platform/ARCHITECTURE.md", import.meta.url), "utf8");
  const capabilityText = readFileSync(new URL("../docs/platform/capabilities/IMP-031-provider-neutral-delivery-foundation.md", import.meta.url), "utf8");

  it("supports only the R79/S77 formal-acceptance checkpoint and preserves R78/S76 completion", () => {
    assert.deepEqual(evaluateImp031AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R76", "imp031Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R76", "imp031Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R78", "STATE-R77", "imp031Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77", "imp031Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R79", "STATE-R77"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R80", "STATE-R78", "imp032Activation"), true);
  });

  it("accepts normalized R79/S77 formal-acceptance artifact and documents", () => {
    assert.deepEqual(evaluateImp031AcceptanceArtifact(capabilityText), { ok: true });
    assert.deepEqual(evaluateImp031AcceptanceCurrentArchitectureStatus(architectureText), { ok: true });
    assert.deepEqual(
      evaluateImp031AcceptanceCrossDocumentAlignment({
        architectureText, capabilityText, roadmapText, stateText,
      }),
      { ok: true },
    );
    assert.match(capabilityText, /IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/);
    assert.match(capabilityText, /IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/);
    assert.doesNotMatch(capabilityText, /IMP031_ACCEPTED_MAIN_SHA:\s*64d1cc987120302e12497311b486ba122c1047b0/);
    assert.equal(
      evaluateImp031AcceptanceCrossDocumentAlignment({
        architectureText, capabilityText, roadmapText: liveRoadmapText, stateText: liveStateText,
      }).ok,
      false,
    );
  });

  it("rejects accepted YES while complete NO", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/, "IMP-031_IMPLEMENTATION_COMPLETE: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_IMPLEMENTATION_COMPLETE:\s*YES/, "IMP-031_IMPLEMENTATION_COMPLETE: NO"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ACCEPTED_WITHOUT_COMPLETE");
  });

  it("rejects COMPLETE_AND_ACCEPTED while independent acceptance is not ACCEPTED", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_PERFORMED"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED/, "IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_PERFORMED"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ACCEPTED_WITHOUT_INDEPENDENT_ACCEPTANCE");
  });

  it("rejects formal acceptance ACCEPTED while IMP-031_ACCEPTED != YES", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-031_ACCEPTED:\s*YES/, "IMP-031_ACCEPTED: NO"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/IMP-031_ACCEPTED:\s*YES/, "IMP-031_ACCEPTED: NO"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_FORMAL_WITHOUT_ACCEPTED_MARKER");
  });

  it("rejects acceptedThrough still IMP-030 after acceptance", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Accepted Through:\s*IMP-031[^\n]*/, "Accepted Through:     IMP-030 — Operations Console UI"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/acceptedThrough:\s*IMP-031/, "acceptedThrough: IMP-030"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_ACCEPTED_THROUGH");
  });

  it("rejects pendingAcceptance still IMP-031 after acceptance", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Pending Acceptance:\s*NONE\b/, "Pending Acceptance:    IMP-031"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/pendingAcceptance:\s*NONE\b/, "pendingAcceptance: IMP-031"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_PENDING_ACCEPTANCE");
  });

  it("rejects currentProductSlice still IMP-031 after acceptance", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/Current Product Slice:\s*NONE\b/, "Current Product Slice: IMP-031 — Provider-Neutral Delivery Foundation"),
    );
    const stateAcceptanceStart = stateText.indexOf("## 5. Acceptance Position");
    const stateAcceptanceEnd = stateText.indexOf("\n## ", stateAcceptanceStart + 1);
    const currentStateAcceptance = stateText.slice(stateAcceptanceStart, stateAcceptanceEnd === -1 ? undefined : stateAcceptanceEnd);
    const mutatedState = stateText.replace(
      currentStateAcceptance,
      currentStateAcceptance.replace(/currentProductSlice:\s*NONE\b/, "currentProductSlice: IMP-031"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText: mutatedState,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_CURRENT_SLICE");
  });

  it("rejects nextProductSlice changed away from IMP-032", () => {
    assert.equal(evaluateImp031AcceptanceCheckpoint({ ...acceptance, nextProductSlice: "IMP-033" }).ok, false);
  });

  it("rejects IMP-032 activated/authorized/started by acceptance", () => {
    assert.equal(evaluateImp031AcceptanceCheckpoint({ ...acceptance, imp032: "ACTIVATED" }).ok, false);
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const mutatedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(/IMP-032:\s*PLANNED \/ NOT_ACTIVATED/, "IMP-032: ARCHITECTURE_IN_PROGRESS\nIMP-032_IMPLEMENTATION_AUTHORIZED: YES\nIMP-032_STARTED: YES"),
    );
    const result = evaluateImp031AcceptanceCrossDocumentAlignment({
      architectureText, capabilityText, roadmapText: mutatedRoadmap, stateText,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP031_IMP032_ACTIVATED");
  });

  it("rejects accepted SHA/tree replaced with completion-governance SHA/tree", () => {
    assert.equal(
      evaluateImp031AcceptanceCheckpoint({
        ...acceptance,
        acceptedMainSha: "64d1cc987120302e12497311b486ba122c1047b0",
        acceptedTree: "a3ab9266df709b146a49d4324aa3027fa49ac43c",
      }).ok,
      false,
    );
    const mutatedCapability = capabilityText
      .replace(/IMP031_ACCEPTED_MAIN_SHA:\s*c3d499b0b8df2a8c7ae9297ab870f6286f81b848/, "IMP031_ACCEPTED_MAIN_SHA: 64d1cc987120302e12497311b486ba122c1047b0")
      .replace(/IMP031_ACCEPTED_TREE:\s*dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099/, "IMP031_ACCEPTED_TREE: a3ab9266df709b146a49d4324aa3027fa49ac43c");
    const result = evaluateImp031AcceptanceArtifact(mutatedCapability);
    assert.equal(result.ok, false);
    assert.ok(["IMP031_CAPABILITY_ACCEPTANCE", "IMP031_CAPABILITY_PROGRESSION"].includes(result.code));
  });

  it("rejects CURRENT ARCH/capability pending-acceptance wording after formal acceptance", () => {
    const staleArchitecture = architectureText.replaceAll(
      "AUTHORIZED / STARTED / COMPLETE / COMPLETE_AND_ACCEPTED",
      "AUTHORIZED / STARTED / COMPLETE",
    );
    const archResult = evaluateImp031AcceptanceCurrentArchitectureStatus(staleArchitecture);
    assert.equal(archResult.ok, false);
    assert.equal(archResult.code, "IMP031_ARCH_STATUS_STALE");
    const pendingCapability = deriveImp031CompletionArtifact(capabilityText);
    assert.equal(evaluateImp031AcceptanceArtifact(pendingCapability).ok, false);
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

describe("IMP-032 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R86", stateVersion: "STATE-R84", acceptedThrough: "IMP-032",
    currentProductSlice: "NONE", nextProductSlice: "IMP-033", pendingAcceptance: "NONE",
    imp031: "COMPLETE_AND_ACCEPTED", imp032: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp033: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "078ae39109a748174c429ac40381e038ab21d3c1",
    acceptedTree: "973153488a4e32e06a6da1e1e7d41072ebca9376",
    founderUatPass: true, artifact: true, archG24: true, d373Exists: false,
    manualModeDefined: true, implementationEvidenceComplete: true,
    independentReviewPass: true, independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
  });

  const capabilityText = readFileSync("docs/platform/capabilities/IMP-032-dehradun-delivery-operating-mode.md", "utf8");
  const historicalAuthority = loadHistoricalAuthorityCorpus();
  const roadmapText = historicalAuthority.roadmapText
    .replaceAll("GTM-R87", "GTM-R86")
    .replaceAll("STATE-R85", "STATE-R84")
    .replaceAll("Current Product Slice: IMP-033", "Current Product Slice: NONE")
    .replaceAll("currentProductSlice: IMP-033", "currentProductSlice: NONE")
    .replaceAll("IMP-033: ARCHITECTURE_IN_PROGRESS", "IMP-033: PLANNED / NOT_ACTIVATED")
    .replaceAll("| IMP-033 | Notification Foundation | ARCHITECTURE_IN_PROGRESS |", "| IMP-033 | Notification Foundation | PLANNED |");
  const stateText = historicalAuthority.stateText
    .replaceAll("STATE-R85", "STATE-R84")
    .replaceAll("currentProductSlice: IMP-033", "currentProductSlice: NONE")
    .replaceAll("IMP-033:                  ARCHITECTURE_IN_PROGRESS", "IMP-033:                  PLANNED / NOT_ACTIVATED");

  it("supports only the R86/S84 formal-acceptance checkpoint", () => {
    assert.deepEqual(evaluateImp032AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R86", "STATE-R84", "imp032Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R87", "STATE-R85", "imp033Activation"), true);
  });

  it("accepts live accepted artifact and normalized documents", () => {
    assert.deepEqual(evaluateImp032AcceptanceArtifact(capabilityText), { ok: true });
    assert.deepEqual(
      evaluateImp032AcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
  });
});

describe("IMP-033 architecture activation checkpoint", () => {
  const activation = Object.freeze({
    roadmapVersion: "GTM-R87", stateVersion: "STATE-R85", acceptedThrough: "IMP-032",
    currentProductSlice: "IMP-033", nextProductSlice: "IMP-034", pendingAcceptance: "NONE",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "ARCHITECTURE_IN_PROGRESS", architecture: "NOT_LOCKED",
    architectureLocked: "NO", implementation: "NOT_AUTHORIZED / NOT_STARTED",
    implementationAuthorized: "NO", started: "NO", implementationComplete: "NO", accepted: "NO",
    imp034: "PLANNED", roadmapLifecycle: "ARCHITECTURE_IN_PROGRESS", stateLifecycle: "ARCHITECTURE_IN_PROGRESS",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, d373Exists: false, imp032Accepted: true,
  });

  const lockedCapabilityText = deriveImp033CompletionArtifact(
    readFileSync("docs/platform/capabilities/IMP-033-notification-foundation.md", "utf8"),
  );
  const draftCapabilityText = deriveImp033DraftArtifact(lockedCapabilityText);

  it("supports only the R87/S85 activation checkpoint", () => {
    assert.deepEqual(evaluateImp033ArchitectureActivationCheckpoint(activation), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R87", "STATE-R85", "imp033Activation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R86", "imp033Activation"), false);
  });

  it("accepts the derived historical draft artifact and rejects lock progression", () => {
    assert.deepEqual(evaluateImp033ArchitectureDraftArtifact(draftCapabilityText), { ok: true });
    for (const mutation of [
      draftCapabilityText.replace('"architectureLock": "NOT_LOCKED"', '"architectureLock": "ARCHITECTURE_LOCKED"'),
      draftCapabilityText.replace('"implementationAuthorized": false', '"implementationAuthorized": true'),
      draftCapabilityText.replace("IMP-033_ARCHITECTURE_LOCKED: NO", "IMP-033_ARCHITECTURE_LOCKED: YES"),
      draftCapabilityText.replace("IMP-033_STARTED: NO", "IMP-033_STARTED: YES"),
      `${draftCapabilityText}\n| D-373 |\n`,
    ]) {
      assert.equal(evaluateImp033ArchitectureDraftArtifact(mutation).ok, false);
    }
  });

  it("rejects the live locked artifact as an activation draft", () => {
    assert.equal(evaluateImp033ArchitectureDraftArtifact(lockedCapabilityText).ok, false);
  });
});

describe("IMP-033 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R88", stateVersion: "STATE-R86", acceptedThrough: "IMP-032",
    currentProductSlice: "IMP-033", nextProductSlice: "IMP-034", pendingAcceptance: "IMP-033",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    imp034: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, d373Exists: false, imp032Accepted: true, founderUatRequired: false,
  });

  const capabilityText = deriveImp033CompletionArtifact(
    readFileSync("docs/platform/capabilities/IMP-033-notification-foundation.md", "utf8"),
  );
  const completionDocs = deriveImp033CompletionDocs(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  );
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R88/S86 combined completion checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R86", "imp033Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R87", "STATE-R85", "imp033Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R85", "imp033Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R87", "STATE-R86", "imp033Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R86"), true);
  });

  it("accepts only the complete-pending-acceptance IMP-033 checkpoint", () => {
    assert.deepEqual(evaluateImp033ImplementationCompletionCheckpoint(completion), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R87"],
      ["stateVersion", "STATE-R85"],
      ["acceptedThrough", "IMP-033"],
      ["pendingAcceptance", "NONE"],
      ["currentProductSlice", "NONE"],
      ["nextProductSlice", "IMP-033"],
      ["imp033", "ARCHITECTURE_IN_PROGRESS"],
      ["architecture", "NOT_LOCKED"],
      ["architectureLocked", "NO"],
      ["implementation", "AUTHORIZED / STARTED"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "NO"],
      ["accepted", "YES"],
      ["imp034", "ARCHITECTURE_IN_PROGRESS"],
      ["architectureVersion", "ARCH-R17"],
      ["decisionRegisterVersion", "DR-15"],
      ["artifact", false],
      ["d373Exists", true],
      ["imp032Accepted", false],
      ["founderUatRequired", true],
    ]) {
      assert.equal(
        evaluateImp033ImplementationCompletionCheckpoint({ ...completion, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live locked artifact and rejects premature acceptance or provider I/O", () => {
    assert.deepEqual(evaluateImp033ImplementationCompletionArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"status": "CURRENT"', '"status": "DRAFT"'),
      capabilityText.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      capabilityText.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      capabilityText.replace("IMP-033_ACCEPTED: NO", "IMP-033_ACCEPTED: YES"),
      capabilityText.replace("IMP-033_IMPLEMENTATION_COMPLETE: YES", "IMP-033_IMPLEMENTATION_COMPLETE: NO"),
      capabilityText.replace("IMP-033: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-033: COMPLETE_AND_ACCEPTED"),
      capabilityText.replace("provider_IO: NO", "provider_IO: YES"),
      capabilityText.replace("new_service: NO", "new_service: YES"),
      capabilityText.replace("FOUNDER_UAT_REQUIRED: NO", "FOUNDER_UAT_REQUIRED: YES"),
      capabilityText.replace(/COMPLETION IS NOT ACCEPTANCE: YES\n/g, ""),
      capabilityText.replace(/notification\.resend/g, "notification.dispatch"),
      capabilityText.replace(/POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/g, "REDIS_STREAM_WORKER"),
      `${capabilityText}\n| D-373 |\n`,
    ]) {
      assert.equal(evaluateImp033ImplementationCompletionArtifact(mutation).ok, false);
    }
  });

  it("aligns live ROADMAP/STATE/capability completion markers", () => {
    assert.deepEqual(
      evaluateImp033ImplementationCompletionCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
  });

  it("rejects cross-document alignment that accepts or unlocks IMP-033", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const acceptedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-033_ACCEPTED: NO", "IMP-033_ACCEPTED: YES"),
    );
    assert.equal(
      evaluateImp033ImplementationCompletionCrossDocumentAlignment({
        capabilityText, roadmapText: acceptedRoadmap, stateText,
      }).ok,
      false,
    );

    const unlockedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-033_ARCHITECTURE_LOCKED: YES", "IMP-033_ARCHITECTURE_LOCKED: NO"),
    );
    const unlocked = evaluateImp033ImplementationCompletionCrossDocumentAlignment({
      capabilityText, roadmapText: unlockedRoadmap, stateText,
    });
    assert.equal(unlocked.ok, false);
    assert.equal(unlocked.code, "IMP033_CURRENT_LIFECYCLE");
  });
});

describe("IMP-033 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R89", stateVersion: "STATE-R87", acceptedThrough: "IMP-033",
    currentProductSlice: "NONE", nextProductSlice: "IMP-034", pendingAcceptance: "NONE",
    imp032: "COMPLETE_AND_ACCEPTED", imp033: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp034: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "5150d70b4683f7abec1e0652bf53e7986efcf622",
    acceptedTree: "715ff386e672fd276a0b2e888aa2ebeaab3dda8c",
    artifact: true, archG24: true, d373Exists: false, founderUatRequired: false,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    providerIoNo: true, asyncTopologyLocked: true,
  });

  const capabilityText = readFileSync("docs/platform/capabilities/IMP-033-notification-foundation.md", "utf8");
  const acceptanceDocs = deriveImp033AcceptanceDocs(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  );
  const roadmapText = acceptanceDocs.roadmapText;
  const stateText = acceptanceDocs.stateText;

  it("supports only the R89/S87 acceptance checkpoint and preserves R88/S86 completion", () => {
    assert.deepEqual(evaluateImp033AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R87", "imp033Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R86", "imp033Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R88", "imp034Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R88", "STATE-R87", "imp033Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R86", "imp033Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R87", "imp033Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R87"), true);
  });

  it("rejects acceptance lifecycle drift", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R88"],
      ["stateVersion", "STATE-R86"],
      ["acceptedThrough", "IMP-032"],
      ["currentProductSlice", "IMP-033"],
      ["pendingAcceptance", "IMP-033"],
      ["nextProductSlice", "IMP-033"],
      ["imp033", "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "NO"],
      ["accepted", "NO"],
      ["imp034", "ARCHITECTURE_IN_PROGRESS"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
      ["acceptedMainSha", "b91f92b46f8b9fe4e0b716f920babc56864fd342"],
      ["acceptedTree", "973153488a4e32e06a6da1e1e7d41072ebca9376"],
      ["artifact", false],
      ["archG24", false],
      ["d373Exists", true],
      ["founderUatRequired", true],
      ["implementationEvidenceComplete", false],
      ["independentReviewPass", false],
      ["independentAcceptanceAccepted", false],
      ["formalAcceptanceAccepted", false],
      ["providerIoNo", false],
      ["asyncTopologyLocked", false],
    ]) {
      assert.equal(
        evaluateImp033AcceptanceCheckpoint({ ...acceptance, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live accepted artifact and rejects pending-acceptance or Founder UAT claims", () => {
    assert.deepEqual(evaluateImp033AcceptanceArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"implementation": "COMPLETE_AND_ACCEPTED"', '"implementation": "AUTHORIZED / STARTED / COMPLETE"'),
      capabilityText.replace("IMP-033: COMPLETE_AND_ACCEPTED", "IMP-033: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"),
      capabilityText.replace("IMP-033_ACCEPTED: YES", "IMP-033_ACCEPTED: NO"),
      capabilityText.replace("IMP033_FORMAL_ACCEPTANCE: ACCEPTED", "IMP033_FORMAL_ACCEPTANCE: NOT_CLAIMED"),
      capabilityText.replace("IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED", "IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED"),
      capabilityText.replace(/IMP033_ACCEPTED_MAIN_SHA:[^\n]*\n/, ""),
      capabilityText.replace(/IMP033_ACCEPTED_TREE:[^\n]*\n/, ""),
      capabilityText.replace("FOUNDER_UAT_REQUIRED: NO", "FOUNDER_UAT_REQUIRED: YES"),
      capabilityText.replace("IMP-033_FOUNDER_UAT: NOT_APPLICABLE", "IMP-033_FOUNDER_UAT: PASS"),
      capabilityText.replace("provider_IO: NO", "provider_IO: YES"),
      capabilityText.replace("new_service: NO", "new_service: YES"),
      capabilityText.replace(/POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/g, "REDIS_STREAM_WORKER"),
      `${capabilityText}\n| D-373 |\n`,
    ]) {
      assert.equal(evaluateImp033AcceptanceArtifact(mutation).ok, false);
    }
  });

  it("aligns fixture ROADMAP/STATE/capability acceptance markers", () => {
    assert.deepEqual(
      evaluateImp033AcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
    const completionDocs = deriveImp033CompletionDocs(roadmapText, stateText);
    assert.equal(
      evaluateImp033AcceptanceCrossDocumentAlignment({
        capabilityText,
        roadmapText: completionDocs.roadmapText,
        stateText: completionDocs.stateText,
      }).ok,
      false,
    );
  });

  it("rejects cross-document alignment that keeps IMP-033 pending or authorizes IMP-034", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const pendingRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-033_ACCEPTED: YES", "IMP-033_ACCEPTED: NO"),
    );
    const pending = evaluateImp033AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: pendingRoadmap, stateText,
    });
    assert.equal(pending.ok, false);
    assert.equal(pending.code, "IMP033_CURRENT_LIFECYCLE");

    const authorizedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(
        "IMP-034: PLANNED / NOT_ACTIVATED",
        "IMP-034: PLANNED / NOT_ACTIVATED\nIMP-034_IMPLEMENTATION_AUTHORIZED: YES",
      ),
    );
    const authorized = evaluateImp033AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: authorizedRoadmap, stateText,
    });
    assert.equal(authorized.ok, false);
    assert.equal(authorized.code, "IMP033_ACCEPTANCE_RESIDUE");
  });
});

describe("IMP-034 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R90", stateVersion: "STATE-R88", acceptedThrough: "IMP-033",
    currentProductSlice: "IMP-034", nextProductSlice: "IMP-035", pendingAcceptance: "IMP-034",
    imp033: "COMPLETE_AND_ACCEPTED", imp034: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES",
    implementation: "AUTHORIZED / STARTED / COMPLETE", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    imp035: "PLANNED", architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    artifact: true, d373Exists: false, imp033Accepted: true, founderUatRequired: false,
  });

  const completionDocs = deriveImp034CompletionDocs();
  const capabilityText = completionDocs.capabilityText;
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R90/S88 combined completion checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R88", "imp034Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R87", "imp034Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R87", "imp034Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R89", "STATE-R88", "imp034Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R88"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R88", "imp033Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89", "imp034Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89", "imp034Completion"), false);
  });

  it("accepts only the complete-pending-acceptance IMP-034 checkpoint", () => {
    assert.deepEqual(evaluateImp034ImplementationCompletionCheckpoint(completion), { ok: true });
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R89"],
      ["stateVersion", "STATE-R87"],
      ["acceptedThrough", "IMP-032"],
      ["pendingAcceptance", "NONE"],
      ["currentProductSlice", "NONE"],
      ["nextProductSlice", "IMP-034"],
      ["imp034", "PLANNED"],
      ["architecture", "NOT_LOCKED"],
      ["architectureLocked", "NO"],
      ["implementation", "AUTHORIZED / STARTED"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "NO"],
      ["accepted", "YES"],
      ["imp035", "ARCHITECTURE_IN_PROGRESS"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
      ["artifact", false],
      ["d373Exists", true],
      ["imp033Accepted", false],
      ["founderUatRequired", true],
    ]) {
      assert.equal(
        evaluateImp034ImplementationCompletionCheckpoint({ ...completion, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live locked artifact and rejects premature acceptance or BSP claims", () => {
    assert.deepEqual(evaluateImp034ImplementationCompletionArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"status": "CURRENT"', '"status": "DRAFT"'),
      capabilityText.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      capabilityText.replace('"implementationAuthorized": true', '"implementationAuthorized": false'),
      capabilityText.replace("IMP-034_ACCEPTED: NO", "IMP-034_ACCEPTED: YES"),
      capabilityText.replace("IMP-034_IMPLEMENTATION_COMPLETE: YES", "IMP-034_IMPLEMENTATION_COMPLETE: NO"),
      capabilityText.replace("IMP-034: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-034: COMPLETE_AND_ACCEPTED"),
      capabilityText.replace("provider_IO: YES", "provider_IO: NO"),
      capabilityText.replace("new_service: NO", "new_service: YES"),
      capabilityText.replace("FOUNDER_UAT_REQUIRED: NO", "FOUNDER_UAT_REQUIRED: YES"),
      capabilityText.replace("BSP: NO", "BSP: YES"),
      capabilityText.replace(/COMPLETION IS NOT ACCEPTANCE: YES/g, "COMPLETION IS NOT ACCEPTANCE: NO"),
      capabilityText.replace(/DIRECT_META_CLOUD_API_V1/g, "BSP_WHATSAPP"),
      capabilityText.replace(/POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/g, "REDIS_STREAM_WORKER"),
      `${capabilityText}\n| D-373 |\n`,
    ]) {
      assert.equal(evaluateImp034ImplementationCompletionArtifact(mutation).ok, false);
    }
  });

  it("aligns fixture ROADMAP/STATE/capability completion markers", () => {
    assert.deepEqual(
      evaluateImp034ImplementationCompletionCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
  });

  it("rejects cross-document alignment that accepts or unlocks IMP-034", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const acceptedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-034_ACCEPTED: NO", "IMP-034_ACCEPTED: YES"),
    );
    assert.equal(
      evaluateImp034ImplementationCompletionCrossDocumentAlignment({
        capabilityText, roadmapText: acceptedRoadmap, stateText,
      }).ok,
      false,
    );

    const unlockedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-034_ARCHITECTURE_LOCKED: YES", "IMP-034_ARCHITECTURE_LOCKED: NO"),
    );
    const unlocked = evaluateImp034ImplementationCompletionCrossDocumentAlignment({
      capabilityText, roadmapText: unlockedRoadmap, stateText,
    });
    assert.equal(unlocked.ok, false);
    assert.equal(unlocked.code, "IMP034_CURRENT_LIFECYCLE");
  });
});

describe("IMP-034 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R91", stateVersion: "STATE-R89", acceptedThrough: "IMP-034",
    currentProductSlice: "NONE", nextProductSlice: "IMP-035", pendingAcceptance: "NONE",
    imp033: "COMPLETE_AND_ACCEPTED", imp034: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp035: "PLANNED",
    architectureVersion: "ARCH-R18", decisionRegisterVersion: "DR-14",
    acceptedMainSha: "7e92d1a1ca02ad825229b64f308a8fc555956d25",
    acceptedTree: "772c585e93c78285e5b972d8b8a58c83507e01f8",
    artifact: true, d373Exists: false, founderUatRequired: false,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    providerIoYes: true, asyncTopologyLocked: true, directMetaStrategy: true,
  });

  const capabilityText = readFileSync("docs/platform/capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md", "utf8");
  const acceptanceDocs = deriveImp034AcceptanceDocs(
    readFileSync("docs/platform/ROADMAP.md", "utf8"),
    readFileSync("docs/platform/STATE.md", "utf8"),
  );
  const roadmapText = acceptanceDocs.roadmapText;
  const stateText = acceptanceDocs.stateText;

  it("supports only the R91/S89 acceptance checkpoint and preserves R90/S88 completion", () => {
    assert.deepEqual(evaluateImp034AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89", "imp034Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R88", "imp034Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R88", "imp034Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R90", "STATE-R89", "imp034Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89", "imp034Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89"), true);
  });

  it("rejects acceptance lifecycle drift", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R90"],
      ["stateVersion", "STATE-R88"],
      ["acceptedThrough", "IMP-033"],
      ["currentProductSlice", "IMP-034"],
      ["pendingAcceptance", "IMP-034"],
      ["nextProductSlice", "IMP-034"],
      ["imp034", "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "NO"],
      ["accepted", "NO"],
      ["imp035", "ARCHITECTURE_IN_PROGRESS"],
      ["architectureVersion", "ARCH-R19"],
      ["decisionRegisterVersion", "DR-15"],
      ["acceptedMainSha", "9508db83bb82bc3a23f16ab570c4dd0924d7703a"],
      ["acceptedTree", "715ff386e672fd276a0b2e888aa2ebeaab3dda8c"],
      ["artifact", false],
      ["d373Exists", true],
      ["founderUatRequired", true],
      ["implementationEvidenceComplete", false],
      ["independentReviewPass", false],
      ["independentAcceptanceAccepted", false],
      ["formalAcceptanceAccepted", false],
      ["providerIoYes", false],
      ["asyncTopologyLocked", false],
      ["directMetaStrategy", false],
    ]) {
      assert.equal(
        evaluateImp034AcceptanceCheckpoint({ ...acceptance, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live accepted artifact and rejects pending-acceptance or Founder UAT claims", () => {
    assert.deepEqual(evaluateImp034AcceptanceArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"implementation": "COMPLETE_AND_ACCEPTED"', '"implementation": "AUTHORIZED / STARTED / COMPLETE"'),
      capabilityText.replace("IMP-034: COMPLETE_AND_ACCEPTED", "IMP-034: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"),
      capabilityText.replace("IMP-034_ACCEPTED: YES", "IMP-034_ACCEPTED: NO"),
      capabilityText.replace("IMP034_FORMAL_ACCEPTANCE: ACCEPTED", "IMP034_FORMAL_ACCEPTANCE: NOT_CLAIMED"),
      capabilityText.replace("IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED", "IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED"),
      capabilityText.replace(/IMP034_ACCEPTED_MAIN_SHA:[^\n]*\n/, ""),
      capabilityText.replace(/IMP034_ACCEPTED_TREE:[^\n]*\n/, ""),
      capabilityText.replace("FOUNDER_UAT_REQUIRED: NO", "FOUNDER_UAT_REQUIRED: YES"),
      capabilityText.replace("IMP-034_FOUNDER_UAT: NOT_APPLICABLE", "IMP-034_FOUNDER_UAT: PASS"),
      capabilityText.replace("provider_IO: YES", "provider_IO: NO"),
      capabilityText.replace("new_service: NO", "new_service: YES"),
      capabilityText.replace("BSP: NO", "BSP: YES"),
      capabilityText.replace(/POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER/g, "REDIS_STREAM_WORKER"),
      `${capabilityText}\n| D-373 |\n`,
    ]) {
      assert.equal(evaluateImp034AcceptanceArtifact(mutation).ok, false);
    }
  });

  it("aligns live ROADMAP/STATE/capability acceptance markers", () => {
    assert.deepEqual(
      evaluateImp034AcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
    const completionDocs = deriveImp034CompletionDocs();
    assert.equal(
      evaluateImp034AcceptanceCrossDocumentAlignment({
        capabilityText: completionDocs.capabilityText,
        roadmapText: completionDocs.roadmapText,
        stateText: completionDocs.stateText,
      }).ok,
      false,
    );
  });

  it("rejects cross-document alignment that keeps IMP-034 pending or authorizes IMP-035", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const pendingRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-034_ACCEPTED: YES", "IMP-034_ACCEPTED: NO"),
    );
    const pending = evaluateImp034AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: pendingRoadmap, stateText,
    });
    assert.equal(pending.ok, false);
    assert.equal(pending.code, "IMP034_CURRENT_LIFECYCLE");

    const authorizedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(
        "IMP-035: PLANNED / NOT_ACTIVATED",
        "IMP-035: PLANNED / NOT_ACTIVATED\nIMP-035_IMPLEMENTATION_AUTHORIZED: YES",
      ),
    );
    const authorized = evaluateImp034AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: authorizedRoadmap, stateText,
    });
    assert.equal(authorized.ok, false);
    assert.equal(authorized.code, "IMP034_ACCEPTANCE_RESIDUE");
  });
});

/** Historical GTM-R90 / STATE-R88 IMP-034 completion fixtures captured before GTM-R91 acceptance. */
function deriveImp034CompletionDocs() {
  return {
    roadmapText: readFileSync(new URL("./fixtures/imp034-completion-roadmap.md", import.meta.url), "utf8"),
    stateText: readFileSync(new URL("./fixtures/imp034-completion-state.md", import.meta.url), "utf8"),
    capabilityText: readFileSync(new URL("./fixtures/imp034-completion-capability.md", import.meta.url), "utf8"),
  };
}

/** Project live documents back to the historical GTM-R91 / STATE-R89 IMP-034 acceptance position. */
function deriveImp034AcceptanceDocs(liveRoadmap, liveState) {
  if (/"roadmapVersion": "GTM-R91"/.test(liveRoadmap) && /"stateVersion": "STATE-R89"/.test(liveState)) {
    return { roadmapText: liveRoadmap, stateText: liveState };
  }
  return {
    roadmapText: readFileSync(new URL("./fixtures/imp034-acceptance-roadmap.md", import.meta.url), "utf8"),
    stateText: readFileSync(new URL("./fixtures/imp034-acceptance-state.md", import.meta.url), "utf8"),
  };
}

describe("IMP-035 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R92", stateVersion: "STATE-R90", acceptedThrough: "IMP-034",
    currentProductSlice: "IMP-035", nextProductSlice: "IMP-036", pendingAcceptance: "IMP-035",
    imp034: "COMPLETE_AND_ACCEPTED", imp035: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    artifact: true, d373Exists: true, archG25: true, founderUatRequired: true,
  });

  const completionDocs = deriveImp035CompletionDocs();
  const capabilityText = completionDocs.capabilityText;
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R92/S90 completion checkpoint", () => {
    assert.deepEqual(evaluateImp035ImplementationCompletionCheckpoint(completion), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R92", "STATE-R90", "imp035Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R91", "STATE-R89", "imp035Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R92", "STATE-R89", "imp035Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91", "imp035Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91", "imp035Completion"), false);
  });

  it("rejects completion lifecycle drift", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R91"],
      ["stateVersion", "STATE-R89"],
      ["acceptedThrough", "IMP-035"],
      ["currentProductSlice", "NONE"],
      ["pendingAcceptance", "NONE"],
      ["nextProductSlice", "IMP-035"],
      ["imp035", "COMPLETE_AND_ACCEPTED"],
      ["architectureLocked", "NO"],
      ["accepted", "YES"],
      ["architectureVersion", "ARCH-R18"],
      ["decisionRegisterVersion", "DR-14"],
      ["artifact", false],
      ["d373Exists", false],
      ["archG25", false],
      ["founderUatRequired", false],
    ]) {
      assert.equal(
        evaluateImp035ImplementationCompletionCheckpoint({ ...completion, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live complete-pending artifact and rejects acceptance claims", () => {
    assert.deepEqual(evaluateImp035ImplementationCompletionArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace("IMP-035_ACCEPTED: NO", "IMP-035_ACCEPTED: YES"),
      capabilityText.replace("IMP-035: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-035: COMPLETE_AND_ACCEPTED"),
      capabilityText.replaceAll("FOUNDER_UAT_REQUIRED: YES", "FOUNDER_UAT_REQUIRED: NO")
        .replaceAll("IMP-035_FOUNDER_UAT_REQUIRED: YES", "IMP-035_FOUNDER_UAT_REQUIRED: NO"),
      capabilityText.replace("new_service: NO", "new_service: YES"),
    ]) {
      assert.equal(evaluateImp035ImplementationCompletionArtifact(mutation).ok, false);
    }
  });

  it("aligns fixture ROADMAP/STATE/capability completion markers", () => {
    assert.deepEqual(
      evaluateImp035ImplementationCompletionCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
  });

  it("rejects cross-document alignment that accepts IMP-035 or authorizes IMP-036", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const acceptedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-035_ACCEPTED: NO", "IMP-035_ACCEPTED: YES"),
    );
    const accepted = evaluateImp035ImplementationCompletionCrossDocumentAlignment({
      capabilityText, roadmapText: acceptedRoadmap, stateText,
    });
    assert.equal(accepted.ok, false);

    const authorizedRoadmap = roadmapText.replace(
      currentRoadmap,
      `${currentRoadmap}\nIMP-036_IMPLEMENTATION_AUTHORIZED: YES\n`,
    );
    const authorized = evaluateImp035ImplementationCompletionCrossDocumentAlignment({
      capabilityText, roadmapText: authorizedRoadmap, stateText,
    });
    assert.equal(authorized.ok, false);
    assert.equal(authorized.code, "IMP035_COMPLETION_RESIDUE");
  });
});

/** Historical GTM-R92 / STATE-R90 IMP-035 completion fixtures captured before GTM-R93 acceptance. */
function deriveImp035CompletionDocs() {
  return {
    roadmapText: readFileSync(new URL("./fixtures/imp035-completion-roadmap.md", import.meta.url), "utf8"),
    stateText: readFileSync(new URL("./fixtures/imp035-completion-state.md", import.meta.url), "utf8"),
    capabilityText: readFileSync(new URL("./fixtures/imp035-completion-capability.md", import.meta.url), "utf8"),
  };
}

/** Use live docs on R93/S91; otherwise reconstruct the accepted R93/S91 governance snapshot. */
function deriveImp035AcceptanceDocs(liveRoadmap, liveState, liveCapability) {
  if (/"roadmapVersion": "GTM-R93"/.test(liveRoadmap) && /"stateVersion": "STATE-R91"/.test(liveState)) {
    return { capabilityText: liveCapability, roadmapText: liveRoadmap, stateText: liveState };
  }
  const base = "c0b6436fcf20553b87afa27d71a74f8bbf94a3aa";
  return {
    capabilityText: liveCapability,
    roadmapText: execSync(`git show ${base}:docs/platform/ROADMAP.md`, { encoding: "utf8" }),
    stateText: execSync(`git show ${base}:docs/platform/STATE.md`, { encoding: "utf8" }),
  };
}

describe("IMP-035 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R93", stateVersion: "STATE-R91", acceptedThrough: "IMP-035",
    currentProductSlice: "NONE", nextProductSlice: "IMP-036", pendingAcceptance: "NONE",
    imp034: "COMPLETE_AND_ACCEPTED", imp035: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp036: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "7e83d5486665ed1a3847f8484d73deb825946501",
    acceptedTree: "83c318ecd9a4cff86e19f9d35ca5ad42bcff357a",
    artifact: true, d373Exists: true, archG25: true, founderUatPass: true,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    schemaChangeNo: true, providerIoNo: true, newServiceNo: true,
    newPermissionsNo: true, newRolesNo: true,
  });

  const capabilityText = readFileSync("docs/platform/capabilities/IMP-035-initial-administration-capabilities.md", "utf8");
  const liveRoadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8");
  const liveStateText = readFileSync("docs/platform/STATE.md", "utf8");
  const { roadmapText, stateText } = deriveImp035AcceptanceDocs(liveRoadmapText, liveStateText, capabilityText);

  it("supports only the R93/S91 acceptance checkpoint and preserves R92/S90 completion", () => {
    assert.deepEqual(evaluateImp035AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91", "imp035Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R92", "STATE-R90", "imp035Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R90", "imp035Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R92", "STATE-R91", "imp035Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91", "imp035Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91"), true);
  });

  it("rejects acceptance lifecycle drift", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R92"],
      ["stateVersion", "STATE-R90"],
      ["acceptedThrough", "IMP-034"],
      ["currentProductSlice", "IMP-035"],
      ["pendingAcceptance", "IMP-035"],
      ["nextProductSlice", "IMP-035"],
      ["imp035", "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"],
      ["architectureLocked", "NO"],
      ["implementationAuthorized", "NO"],
      ["started", "NO"],
      ["implementationComplete", "NO"],
      ["accepted", "NO"],
      ["imp036", "ARCHITECTURE_IN_PROGRESS"],
      ["architectureVersion", "ARCH-R18"],
      ["decisionRegisterVersion", "DR-14"],
      ["acceptedMainSha", "642cf7193a8b8419e8abec3bc24b5a76df9c182a"],
      ["acceptedTree", "6f7d01304bbd66835e8dec18ed8c29b87d2c5513d2b23799b53b6bf1c6f88d13"],
      ["artifact", false],
      ["d373Exists", false],
      ["archG25", false],
      ["founderUatPass", false],
      ["implementationEvidenceComplete", false],
      ["independentReviewPass", false],
      ["independentAcceptanceAccepted", false],
      ["formalAcceptanceAccepted", false],
      ["schemaChangeNo", false],
      ["providerIoNo", false],
      ["newServiceNo", false],
      ["newPermissionsNo", false],
      ["newRolesNo", false],
    ]) {
      assert.equal(
        evaluateImp035AcceptanceCheckpoint({ ...acceptance, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live accepted artifact and rejects pending-acceptance or missing Founder UAT", () => {
    assert.deepEqual(evaluateImp035AcceptanceArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"implementation": "COMPLETE_AND_ACCEPTED"', '"implementation": "AUTHORIZED / STARTED / COMPLETE"'),
      capabilityText.replaceAll("IMP-035: COMPLETE_AND_ACCEPTED", "IMP-035: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"),
      capabilityText.replaceAll("IMP-035_ACCEPTED: YES", "IMP-035_ACCEPTED: NO"),
      capabilityText.replaceAll("IMP035_FORMAL_ACCEPTANCE: ACCEPTED", "IMP035_FORMAL_ACCEPTANCE: NOT_CLAIMED"),
      capabilityText.replaceAll("IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED", "IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED"),
      capabilityText.replace(/IMP035_ACCEPTED_MAIN_SHA:[^\n]*\n/g, ""),
      capabilityText.replace(/IMP035_ACCEPTED_TREE:[^\n]*\n/g, ""),
      capabilityText.replaceAll("FOUNDER_UAT: PASS", "FOUNDER_UAT: NOT_STARTED"),
      capabilityText.replaceAll("IMP-035_FOUNDER_UAT: PASS", "IMP-035_FOUNDER_UAT: NOT_CLAIMED"),
      capabilityText.replaceAll("schema_change: NO", "schema_change: YES"),
      capabilityText.replaceAll("provider_IO: NO", "provider_IO: YES"),
      capabilityText.replaceAll("new_service: NO", "new_service: YES"),
      capabilityText.replaceAll("new_permissions: NO", "new_permissions: YES"),
      capabilityText.replaceAll("new_roles: NO", "new_roles: YES"),
    ]) {
      assert.equal(evaluateImp035AcceptanceArtifact(mutation).ok, false);
    }
  });

  it("aligns live ROADMAP/STATE/capability acceptance markers", () => {
    assert.deepEqual(
      evaluateImp035AcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
    const completionDocs = deriveImp035CompletionDocs();
    assert.equal(
      evaluateImp035AcceptanceCrossDocumentAlignment({
        capabilityText: completionDocs.capabilityText,
        roadmapText: completionDocs.roadmapText,
        stateText: completionDocs.stateText,
      }).ok,
      false,
    );
  });

  it("rejects cross-document alignment that keeps IMP-035 pending or authorizes IMP-036", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const pendingRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-035_ACCEPTED: YES", "IMP-035_ACCEPTED: NO"),
    );
    const pending = evaluateImp035AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: pendingRoadmap, stateText,
    });
    assert.equal(pending.ok, false);
    assert.equal(pending.code, "IMP035_CURRENT_LIFECYCLE");

    const authorizedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(
        "IMP-036: PLANNED / NOT_ACTIVATED",
        "IMP-036: PLANNED / NOT_ACTIVATED\nIMP-036_IMPLEMENTATION_AUTHORIZED: YES",
      ),
    );
    const authorized = evaluateImp035AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: authorizedRoadmap, stateText,
    });
    assert.equal(authorized.ok, false);
    assert.equal(authorized.code, "IMP035_ACCEPTANCE_RESIDUE");
  });
});

/** Project live documents back to the historical GTM-R89 / STATE-R87 acceptance position. */
function deriveImp033AcceptanceDocs(liveRoadmap, liveState) {
  if (/"roadmapVersion": "GTM-R89"/.test(liveRoadmap) && /"stateVersion": "STATE-R87"/.test(liveState)) {
    return { roadmapText: liveRoadmap, stateText: liveState };
  }
  // Historical GTM-R89 / STATE-R87 acceptance fixtures captured before GTM-R90 superseded them.
  return {
    roadmapText: readFileSync(new URL("./fixtures/imp033-acceptance-roadmap.md", import.meta.url), "utf8"),
    stateText: readFileSync(new URL("./fixtures/imp033-acceptance-state.md", import.meta.url), "utf8"),
  };
}

/** Project accepted IMP-033 facts in one document section back to the R88/S86 completion form. */
function deriveImp033CompletionFacts(text) {
  return text
    .replace(/IMP-033:(\s*)COMPLETE_AND_ACCEPTED/g, "IMP-033:$1IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")
    .replace(/IMP-033_ACCEPTED:(\s*)YES/g, "IMP-033_ACCEPTED:$1NO")
    .replace(/IMP-033_FOUNDER_UAT:\s*NOT_APPLICABLE\n/g, "")
    .replace(/IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE:\s*ACCEPTED\n/g, "")
    .replace(/IMP033_FORMAL_ACCEPTANCE:\s*ACCEPTED\n/g, "")
    .replace(/IMP033_ACCEPTED_MAIN_SHA:[^\n]*\n/g, "")
    .replace(/IMP033_ACCEPTED_TREE:[^\n]*\n/g, "")
    .replace(/IMP-034:(\s*)PLANNED \/ NOT_ACTIVATED\n/g, "")
    .replace(
      /IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\n/g,
      "IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS\nCOMPLETION IS NOT ACCEPTANCE: YES\n",
    )
    .replace(/IMP-033 is `COMPLETE_AND_ACCEPTED`/g, "IMP-033 is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`");
}

/** Project GTM-R89 / STATE-R87 (or live later) documents back to the historical R88 / S86 completion position. */
function deriveImp033CompletionDocs(acceptedRoadmap, acceptedState) {
  const acceptanceDocs = deriveImp033AcceptanceDocs(acceptedRoadmap, acceptedState);
  acceptedRoadmap = acceptanceDocs.roadmapText;
  acceptedState = acceptanceDocs.stateText;
  const rewriteRoadmapCurrent = (section) => deriveImp033CompletionFacts(section)
    .replace(/Accepted Through:(\s*)IMP-033[^\n]*/g, "Accepted Through:$1IMP-032 — Dehradun Delivery Operating Mode")
    .replace(/Current Product Slice:(\s*)NONE\b/g, "Current Product Slice:$1IMP-033 — Notification Foundation")
    .replace(/Pending Acceptance:(\s*)NONE\b/g, "Pending Acceptance:$1IMP-033")
    .replace(/Pending acceptance:(\s*)NONE\b/g, "Pending acceptance:$1IMP-033")
    .replace(/acceptedThrough:(\s*)IMP-033\b/g, "acceptedThrough:$1IMP-032");
  const rewriteStateCurrent = (section) => deriveImp033CompletionFacts(section)
    .replace(/Accepted Through:(\s*)IMP-033[^\n]*/g, "Accepted Through:$1IMP-032 — Dehradun Delivery Operating Mode")
    .replace(
      /Current Product Implementation:(\s*)NONE\b/g,
      "Current Product Implementation:$1IMP-033 — Notification Foundation (implementation complete pending acceptance)",
    )
    .replace(/Current Product Slice:(\s*)NONE\b/g, "Current Product Slice:$1IMP-033 — Notification Foundation")
    .replace(/Pending Acceptance:(\s*)NONE\b/g, "Pending Acceptance:$1IMP-033")
    .replace(/acceptedThrough:(\s*)IMP-033\b/g, "acceptedThrough:$1IMP-032")
    .replace(/currentProductSlice:(\s*)NONE\b/g, "currentProductSlice:$1IMP-033")
    .replace(/pendingAcceptance:(\s*)NONE\b/g, "pendingAcceptance:$1IMP-033")
    .replace(
      /Current Governance Activity:\s*IMP-033 COMPLETE_AND_ACCEPTED;\n\s*IMP-034 PLANNED \/ NOT_ACTIVATED\./g,
      "Current Governance Activity:    IMP-033 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE; Founder UAT not required.",
    );

  let roadmapText = rewriteDocSection(acceptedRoadmap, "## 2.", "## 3.", rewriteRoadmapCurrent);
  roadmapText = rewriteDocSection(roadmapText, "## 4. Current Product Slice", "\n## 5.", rewriteRoadmapCurrent);
  roadmapText = roadmapText
    .replace('"roadmapVersion": "GTM-R89"', '"roadmapVersion": "GTM-R88"')
    .replace('"acceptedThrough": "IMP-033"', '"acceptedThrough": "IMP-032"')
    .replace('"currentProductSlice": "NONE"', '"currentProductSlice": "IMP-033"')
    .replace('"supersedes": "GTM-R88"', '"supersedes": "GTM-R87"')
    .replace(
      "IMP-033 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):",
      "IMP-033 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation\n**AUTHORIZED** / **STARTED** / **COMPLETE**; pending acceptance):",
    )
    .replace("| IMP-033 | Notification Foundation | COMPLETE_AND_ACCEPTED |\n", "")
    .replace(
      "| IMP-034 | Meta WhatsApp Cloud API Adapter | PLANNED |",
      "| IMP-033 | Notification Foundation | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |\n| IMP-034 | Meta WhatsApp Cloud API Adapter | PLANNED |",
    );

  let stateText = rewriteDocSection(acceptedState, "## 1. Accepted Position", "\n## ", rewriteStateCurrent);
  stateText = rewriteDocSection(stateText, "## 2. Current Work Position", "\n## ", rewriteStateCurrent);
  stateText = rewriteDocSection(stateText, "## 5. Acceptance Position", "\n## ", rewriteStateCurrent);
  stateText = stateText
    .replace('"stateVersion": "STATE-R87"', '"stateVersion": "STATE-R86"')
    .replace('"acceptedThrough": "IMP-033"', '"acceptedThrough": "IMP-032"')
    .replace('"currentProductSlice": "NONE"', '"currentProductSlice": "IMP-033"')
    .replace('"pendingAcceptance": "NONE"', '"pendingAcceptance": "IMP-033"')
    .replace(
      "IMP-033 locked capability architecture (architecture LOCKED; implementation AUTHORIZED /\nSTARTED / COMPLETE; COMPLETE_AND_ACCEPTED):",
      "IMP-033 locked capability architecture (architecture LOCKED; implementation AUTHORIZED /\nSTARTED / COMPLETE; pending acceptance):",
    )
    .replace("| IMP-033 | Notification Foundation | COMPLETE_AND_ACCEPTED |\n", "")
    .replace(/STATE-R87 records formal acceptance of \*\*IMP-033[\s\S]*?acceptance position\.\n\n/, "");

  return { roadmapText, stateText };
}

/** Derive the historical GTM-R88 / STATE-R86 completion artifact from the live accepted artifact. */
function deriveImp033CompletionArtifact(acceptedArtifact) {
  return acceptedArtifact
    .replace('"implementation": "COMPLETE_AND_ACCEPTED"', '"implementation": "AUTHORIZED / STARTED / COMPLETE"')
    .replace(
      "## Capability Architecture (ARCHITECTURE_LOCKED — COMPLETE_AND_ACCEPTED)",
      "## Capability Architecture (ARCHITECTURE_LOCKED — implementation complete pending acceptance)",
    )
    .replace(
      "Implementation is **AUTHORIZED**, **STARTED**, **COMPLETE**, and formally **COMPLETE_AND_ACCEPTED**.\n\nFormal acceptance does not expand the locked boundary, authorize or start IMP-034, select a WhatsApp\nBSP, perform Meta production onboarding, add provider webhook routes, or create `D-373`.",
      "Implementation is **AUTHORIZED**, **STARTED**, and **COMPLETE** pending independent acceptance.\n\nCompletion does **not** equal acceptance. Formal acceptance is not claimed here.",
    )
    .replace("| Lifecycle | `COMPLETE_AND_ACCEPTED` |", "| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |")
    .replace("| Implementation complete | **YES** |\n", "")
    .replace("| Accepted | **YES** |", "| Accepted | **NO** |")
    .replace("| Accepted product through | IMP-033 |", "| Accepted product through | IMP-032 |")
    .replace("| Current product slice | NONE |", "| Current product slice | IMP-033 |")
    .replace("| Pending acceptance | NONE |", "| Pending acceptance | IMP-033 |")
    .replace("| Governance checkpoint | GTM-R89 / STATE-R87 |", "| Governance checkpoint | GTM-R88 / STATE-R86 |")
    .replace("IMP-033: COMPLETE_AND_ACCEPTED", "IMP-033: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE")
    .replace(
      "IMP-033_ACCEPTED: YES\nFOUNDER_UAT_REQUIRED: NO",
      "IMP-033_ACCEPTED: NO\nCOMPLETION IS NOT ACCEPTANCE: YES\nFOUNDER_UAT_REQUIRED: NO",
    )
    .replace(
      "Implementation is **AUTHORIZED** / **STARTED** / **COMPLETE** within the boundary above and is\nformally **COMPLETE_AND_ACCEPTED**.",
      "Implementation is **AUTHORIZED** / **STARTED** / **COMPLETE** within the boundary above.",
    )
    .replace(
      /## 17\. Implementation and acceptance evidence[\s\S]*$/,
      [
        "## 17. Implementation evidence",
        "",
        "```text",
        "IMP033_IMPLEMENTATION_EVIDENCE: COMPLETE",
        "IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS",
        "IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED",
        "IMP033_FORMAL_ACCEPTANCE: NOT_CLAIMED",
        "IMP-033_ACCEPTED: NO",
        "COMPLETION IS NOT ACCEPTANCE: YES",
        "```",
        "",
        "Formal acceptance SHA / tree provenance is deliberately absent and is recorded only by a later",
        "dedicated acceptance reconciliation.",
        "",
      ].join("\n"),
    );
}

/** Derive the historical GTM-R87 / STATE-R85 IMP-033 draft artifact from the live locked artifact. */
function deriveImp033DraftArtifact(lockedArtifact) {
  return lockedArtifact
    .replace('"status": "CURRENT"', '"status": "DRAFT"')
    .replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"')
    .replace('"implementation": "AUTHORIZED / STARTED / COMPLETE"', '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
    .replace('"implementationAuthorized": true', '"implementationAuthorized": false')
    .replaceAll("IMP-033: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", "IMP-033: ARCHITECTURE_IN_PROGRESS")
    .replaceAll("IMP-033_ARCHITECTURE: LOCKED", "IMP-033_ARCHITECTURE: NOT_LOCKED")
    .replaceAll("IMP-033_ARCHITECTURE_LOCKED: YES", "IMP-033_ARCHITECTURE_LOCKED: NO")
    .replaceAll(
      "IMP-033_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE",
      "IMP-033_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED",
    )
    .replaceAll("IMP-033_IMPLEMENTATION_AUTHORIZED: YES", "IMP-033_IMPLEMENTATION_AUTHORIZED: NO")
    .replaceAll("IMP-033_STARTED: YES", "IMP-033_STARTED: NO")
    .replaceAll("IMP-033_IMPLEMENTATION_COMPLETE: YES", "IMP-033_IMPLEMENTATION_COMPLETE: NO");
}

describe("IMP-036 implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R94", stateVersion: "STATE-R92", acceptedThrough: "IMP-035",
    currentProductSlice: "IMP-036", nextProductSlice: "IMP-037", pendingAcceptance: "IMP-036",
    imp035: "COMPLETE_AND_ACCEPTED", imp036: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    artifact: true, d374Exists: false, founderUatNotRequired: true,
  });

  const completionDocs = deriveImp036CompletionDocs();
  const capabilityText = completionDocs.capabilityText;
  const roadmapText = completionDocs.roadmapText;
  const stateText = completionDocs.stateText;

  it("supports only the R94/S92 completion checkpoint", () => {
    assert.deepEqual(evaluateImp036ImplementationCompletionCheckpoint(completion), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R94", "STATE-R92", "imp036Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R93", "STATE-R91", "imp036Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R93", "imp036Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R93", "imp036Completion"), false);
  });

  it("validates the completion fixture artifact and cross-document alignment", () => {
    assert.deepEqual(evaluateImp036ImplementationCompletionArtifact(capabilityText), { ok: true });
    assert.deepEqual(
      evaluateImp036ImplementationCompletionCrossDocumentAlignment({
        capabilityText,
        roadmapText,
        stateText,
      }),
      { ok: true },
    );
  });
});

/** Historical GTM-R94 / STATE-R92 IMP-036 completion fixtures captured before GTM-R95 acceptance. */
function deriveImp036CompletionDocs() {
  return {
    roadmapText: readFileSync(new URL("./fixtures/imp036-completion-roadmap.md", import.meta.url), "utf8"),
    stateText: readFileSync(new URL("./fixtures/imp036-completion-state.md", import.meta.url), "utf8"),
    capabilityText: readFileSync(new URL("./fixtures/imp036-completion-capability.md", import.meta.url), "utf8"),
  };
}

/** Use compatible live docs on R95/S93; otherwise reconstruct from pre-IMP-036A main. */
function deriveImp036AcceptanceDocs(liveRoadmap, liveState, liveCapability) {
  if (
    /"roadmapVersion": "GTM-R95"/.test(liveRoadmap) &&
    /"stateVersion": "STATE-R93"/.test(liveState)
  ) {
    return { capabilityText: liveCapability, roadmapText: liveRoadmap, stateText: liveState };
  }
  const base = "aa54094b57806acb6aba13e5fff4a8c8a5adf32e";
  return {
    capabilityText: liveCapability,
    roadmapText: execSync(`git show ${base}:docs/platform/ROADMAP.md`, { encoding: "utf8" }),
    stateText: execSync(`git show ${base}:docs/platform/STATE.md`, { encoding: "utf8" }),
  };
}

/** Live docs on R97/S95 or reconstruct from pre-acceptance merge when already at R98/S96. */
function deriveImp036aCompletionDocs(liveRoadmap, liveState, liveCapability) {
  if (
    /"roadmapVersion": "GTM-R97"/.test(liveRoadmap) &&
    /"stateVersion": "STATE-R95"/.test(liveState)
  ) {
    return { capabilityText: liveCapability, roadmapText: liveRoadmap, stateText: liveState };
  }
  const base = "ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f";
  return {
    capabilityText: execSync(
      `git show ${base}:docs/platform/capabilities/IMP-036A-multi-portal-experience-foundation.md`,
      { encoding: "utf8" },
    ),
    roadmapText: execSync(`git show ${base}:docs/platform/ROADMAP.md`, { encoding: "utf8" }),
    stateText: execSync(`git show ${base}:docs/platform/STATE.md`, { encoding: "utf8" }),
  };
}

/** Use live docs on R98/S96; otherwise reconstruct the accepted R98/S96 governance snapshot. */
function deriveImp036aAcceptanceDocs(liveRoadmap, liveState, liveCapability) {
  if (
    /"roadmapVersion": "GTM-R98"/.test(liveRoadmap) &&
    /"stateVersion": "STATE-R96"/.test(liveState)
  ) {
    return { capabilityText: liveCapability, roadmapText: liveRoadmap, stateText: liveState };
  }
  // Published main-history merge for IMP-036A formal acceptance (PR #60).
  // Do not use local-only/orphan abbreviated SHAs — Actions shallow/orphan objects are unreachable.
  const base = "94cb9dee045f03962584ea5be0b624fa4f64092d";
  return {
    capabilityText: liveCapability,
    roadmapText: execSync(`git show ${base}:docs/platform/ROADMAP.md`, { encoding: "utf8" }),
    stateText: execSync(`git show ${base}:docs/platform/STATE.md`, { encoding: "utf8" }),
  };
}

describe("IMP-036 formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R95", stateVersion: "STATE-R93", acceptedThrough: "IMP-036",
    currentProductSlice: "NONE", nextProductSlice: "IMP-037", pendingAcceptance: "NONE",
    imp035: "COMPLETE_AND_ACCEPTED", imp036: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp037: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "68b46a53dc5d1ff84a8493899e713d3ef43db3aa",
    acceptedTree: "9b5c3193bf74d75a820b16976e894ec2dffafa13",
    artifact: true, d374Exists: false, founderUatRequired: false,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    schemaChangeNo: true, providerIoNo: true, newServiceNo: true,
    newPermissionsNo: true, newRolesNo: true,
  });

  const capabilityText = readFileSync(
    "docs/platform/capabilities/IMP-036-observability-operational-controls.md",
    "utf8",
  );
  const liveRoadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8");
  const liveStateText = readFileSync("docs/platform/STATE.md", "utf8");
  const { roadmapText, stateText } = deriveImp036AcceptanceDocs(liveRoadmapText, liveStateText, capabilityText);

  it("supports only the R95/S93 acceptance checkpoint and preserves R94/S92 completion", () => {
    assert.deepEqual(evaluateImp036AcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R93", "imp036Acceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R94", "STATE-R92", "imp036Completion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R92", "imp036Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R94", "STATE-R93", "imp036Acceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R93", "imp036Completion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R93"), true);
  });

  it("rejects acceptance lifecycle drift", () => {
    for (const [key, value] of [
      ["roadmapVersion", "GTM-R94"],
      ["stateVersion", "STATE-R92"],
      ["acceptedThrough", "IMP-035"],
      ["currentProductSlice", "IMP-036"],
      ["pendingAcceptance", "IMP-036"],
      ["nextProductSlice", "IMP-036"],
      ["imp036", "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"],
      ["architectureLocked", "NO"],
      ["accepted", "NO"],
      ["imp037", "ARCHITECTURE_IN_PROGRESS"],
      ["acceptedMainSha", "90593ab846992ca963bf5ae5edc3d0b6a5281d4b"],
      ["acceptedTree", "bc872e19e46d178c9145f743a78a655fa849d145ebadf6c6c2d768768975e915"],
      ["artifact", false],
      ["d374Exists", true],
      ["founderUatRequired", true],
      ["implementationEvidenceComplete", false],
      ["independentReviewPass", false],
      ["independentAcceptanceAccepted", false],
      ["formalAcceptanceAccepted", false],
      ["schemaChangeNo", false],
      ["providerIoNo", false],
      ["newServiceNo", false],
      ["newPermissionsNo", false],
      ["newRolesNo", false],
    ]) {
      assert.equal(
        evaluateImp036AcceptanceCheckpoint({ ...acceptance, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });

  it("validates the live accepted artifact and rejects pending-acceptance or Founder UAT claims", () => {
    assert.deepEqual(evaluateImp036AcceptanceArtifact(capabilityText), { ok: true });
    for (const mutation of [
      capabilityText.replace('"implementation": "COMPLETE_AND_ACCEPTED"', '"implementation": "AUTHORIZED / STARTED / COMPLETE"'),
      capabilityText.replaceAll("IMP-036: COMPLETE_AND_ACCEPTED", "IMP-036: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE"),
      capabilityText.replaceAll("IMP-036_ACCEPTED: YES", "IMP-036_ACCEPTED: NO"),
      capabilityText.replaceAll("IMP036_FORMAL_ACCEPTANCE: ACCEPTED", "IMP036_FORMAL_ACCEPTANCE: NOT_CLAIMED"),
      capabilityText.replaceAll("IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED", "IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE: NOT_CLAIMED"),
      capabilityText.replace(/IMP036_ACCEPTED_MAIN_SHA:[^\n]*\n/g, ""),
      capabilityText.replace(/IMP036_ACCEPTED_TREE:[^\n]*\n/g, ""),
      capabilityText.replaceAll("FOUNDER_UAT_REQUIRED: NO", "FOUNDER_UAT_REQUIRED: YES"),
      capabilityText.replaceAll("schema_change: NO", "schema_change: YES"),
      capabilityText.replaceAll("provider_IO: NO", "provider_IO: YES"),
      capabilityText.replaceAll("new_service: NO", "new_service: YES"),
    ]) {
      assert.equal(evaluateImp036AcceptanceArtifact(mutation).ok, false);
    }
  });

  it("aligns live ROADMAP/STATE/capability acceptance markers", () => {
    assert.deepEqual(
      evaluateImp036AcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
    const completionDocs = deriveImp036CompletionDocs();
    assert.equal(
      evaluateImp036AcceptanceCrossDocumentAlignment({
        capabilityText: completionDocs.capabilityText,
        roadmapText: completionDocs.roadmapText,
        stateText: completionDocs.stateText,
      }).ok,
      false,
    );
  });

  it("rejects cross-document alignment that keeps IMP-036 pending or authorizes IMP-037", () => {
    const currentRoadmap = roadmapText.slice(roadmapText.indexOf("## 2."), roadmapText.indexOf("## 3."));
    const pendingRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replaceAll("IMP-036_ACCEPTED: YES", "IMP-036_ACCEPTED: NO"),
    );
    const pending = evaluateImp036AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: pendingRoadmap, stateText,
    });
    assert.equal(pending.ok, false);
    assert.equal(pending.code, "IMP036_CURRENT_LIFECYCLE");

    const authorizedRoadmap = roadmapText.replace(
      currentRoadmap,
      currentRoadmap.replace(
        "IMP-037: PLANNED / NOT_ACTIVATED",
        "IMP-037: PLANNED / NOT_ACTIVATED\nIMP-037_IMPLEMENTATION_AUTHORIZED: YES",
      ),
    );
    const authorized = evaluateImp036AcceptanceCrossDocumentAlignment({
      capabilityText, roadmapText: authorizedRoadmap, stateText,
    });
    assert.equal(authorized.ok, false);
    assert.equal(authorized.code, "IMP036_ACCEPTANCE_RESIDUE");
  });
});

describe("IMP-036A implementation completion checkpoint", () => {
  const completion = Object.freeze({
    roadmapVersion: "GTM-R97", stateVersion: "STATE-R95", acceptedThrough: "IMP-036",
    currentProductSlice: "IMP-036A", nextProductSlice: "IMP-036B", pendingAcceptance: "IMP-036A",
    imp036: "COMPLETE_AND_ACCEPTED", imp036a: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    architecture: "LOCKED", architectureLocked: "YES", implementationAuthorized: "YES",
    started: "YES", implementationComplete: "YES", accepted: "NO",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    artifact: true, founderUatRequired: true,
  });

  const capabilityText = readFileSync(
    "docs/platform/capabilities/IMP-036A-multi-portal-experience-foundation.md",
    "utf8",
  );
  const liveRoadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8");
  const liveStateText = readFileSync("docs/platform/STATE.md", "utf8");
  const { capabilityText: completionCapabilityText, roadmapText, stateText } =
    deriveImp036aCompletionDocs(liveRoadmapText, liveStateText, capabilityText);

  it("supports only the R97/S95 completion checkpoint", () => {
    assert.deepEqual(evaluateImp036aImplementationCompletionCheckpoint(completion), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R97", "STATE-R95", "imp036aCompletion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R96", "STATE-R94", "imp036aCompletion"), false);
  });

  it("validates the completion artifact snapshot", () => {
    assert.deepEqual(evaluateImp036aImplementationCompletionArtifact(completionCapabilityText), { ok: true });
  });

  it("aligns completion ROADMAP/STATE/capability markers", () => {
    assert.deepEqual(
      evaluateImp036aImplementationCompletionCrossDocumentAlignment({
        capabilityText: completionCapabilityText,
        roadmapText,
        stateText,
      }),
      { ok: true },
    );
  });
});

describe("IMP-036A formal acceptance checkpoint", () => {
  const acceptance = Object.freeze({
    roadmapVersion: "GTM-R98", stateVersion: "STATE-R96", acceptedThrough: "IMP-036A",
    currentProductSlice: "NONE", nextProductSlice: "IMP-036B", pendingAcceptance: "NONE",
    imp036: "COMPLETE_AND_ACCEPTED", imp036a: "COMPLETE_AND_ACCEPTED", architecture: "LOCKED",
    architectureLocked: "YES", implementationAuthorized: "YES", started: "YES",
    implementationComplete: "YES", accepted: "YES", imp036b: "PLANNED",
    architectureVersion: "ARCH-R19", decisionRegisterVersion: "DR-15",
    acceptedMainSha: "ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f",
    acceptedTree: "4fd243f5923565deceeb6c3f461e0d8a2f5a1eec",
    artifact: true, founderUatPass: true,
    implementationEvidenceComplete: true, independentReviewPass: true,
    independentAcceptanceAccepted: true, formalAcceptanceAccepted: true,
    schemaChangeNo: true, providerIoNo: true, newServiceNo: true,
    newPermissionsNo: true, newRolesNo: true,
  });

  const capabilityText = readFileSync(
    "docs/platform/capabilities/IMP-036A-multi-portal-experience-foundation.md",
    "utf8",
  );
  const liveRoadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8");
  const liveStateText = readFileSync("docs/platform/STATE.md", "utf8");
  const { roadmapText, stateText } = deriveImp036aAcceptanceDocs(liveRoadmapText, liveStateText, capabilityText);

  it("supports only the R98/S96 acceptance checkpoint and preserves R97/S95 completion", () => {
    assert.deepEqual(evaluateImp036aAcceptanceCheckpoint(acceptance), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R98", "STATE-R96", "imp036aAcceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R97", "STATE-R95", "imp036aCompletion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R98", "STATE-R95", "imp036aAcceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R97", "STATE-R96", "imp036aAcceptance"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R98", "STATE-R96", "imp036aCompletion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R98", "STATE-R96"), true);
  });

  it("validates the live acceptance artifact", () => {
    assert.deepEqual(evaluateImp036aAcceptanceArtifact(capabilityText), { ok: true });
  });

  it("aligns live ROADMAP/STATE/capability acceptance markers", () => {
    assert.deepEqual(
      evaluateImp036aAcceptanceCrossDocumentAlignment({ capabilityText, roadmapText, stateText }),
      { ok: true },
    );
  });
});

describe("Enterprise Experience planning checkpoint", () => {
  const planning = Object.freeze({
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
    d374Exists: false,
  });

  it("supports only the R96/S94 planning-only checkpoint", () => {
    assert.deepEqual(evaluateEnterpriseExperiencePlanningCheckpoint(planning), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R96", "STATE-R94", "enterpriseExperiencePlan"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R96", "STATE-R93", "enterpriseExperiencePlan"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R95", "STATE-R94", "enterpriseExperiencePlan"), false);
  });

  it("rejects lifecycle progression or planning-artifact gaps", () => {
    for (const [key, value] of [
      ["currentProductSlice", "IMP-036A"],
      ["nextProductSlice", "IMP-037"],
      ["pendingAcceptance", "IMP-036A"],
      ["allNotActivated", false],
      ["allArchitectureNotLocked", false],
      ["allNotAuthorized", false],
      ["allNotStarted", false],
      ["sliceArtifactCount", 6],
      ["figmaRequiredNow", true],
      ["customerSliceOrderCorrect", false],
      ["workforceHubPlanned", false],
      ["teamAdministrationPlanned", false],
      ["supportRefundPlanned", false],
      ["preparationAssessmentPlanned", false],
      ["navigationAvailabilityRule", false],
      ["d374Exists", true],
    ]) {
      assert.equal(
        evaluateEnterpriseExperiencePlanningCheckpoint({ ...planning, [key]: value }).ok,
        false,
        `${key}=${value}`,
      );
    }
  });
});


describe("PD-1 / TEST-1 product delivery process authorities", () => {
  it("emits OK findings for PD-1, TEST-1, product artifacts, and prospective boundaries", () => {
    const findings = runProjectConsistency();
    const failures = findings.filter((f) => !f.ok);
    assert.equal(
      failures.length,
      0,
      failures.map((f) => `[${f.code}] ${f.message}`).join("\n"),
    );

    const messages = findings.filter((f) => f.ok).map((f) => f.message);
    assert.ok(messages.some((m) => m.includes("PRODUCT-DELIVERY.md") && m.includes("governance-meta OK")));
    assert.ok(messages.some((m) => m.includes("TESTING.md") && m.includes("governance-meta OK")));
    assert.ok(messages.some((m) => m === "PRODUCT-DELIVERY.md version PD-1"));
    assert.ok(messages.some((m) => m === "TESTING.md version TEST-1"));
    assert.ok(messages.some((m) => m === "PRODUCT-DELIVERY.md effectiveFrom IMP-036F"));
    assert.ok(messages.some((m) => m === "TESTING.md effectiveFrom contains IMP-036F"));
    assert.ok(messages.some((m) => m === "PRODUCT-DELIVERY.md prospective boundary markers OK"));
    assert.ok(messages.some((m) => m.startsWith("TESTING.md prospective boundary markers OK")));
    assert.ok(messages.some((m) => m === "AGENTS.md prospective boundary markers OK"));
    assert.ok(
      messages.some(
        (m) =>
          m === "supporting GJ/TEST lifecycle markers aligned with IMP-037 activation" ||
          m === "supporting GJ/TEST lifecycle markers aligned with IMP-036G activation" ||
          m === "supporting GJ/TEST lifecycle markers aligned with IMP-036F activation",
      ),
    );
    assert.ok(
      messages.some(
        (m) =>
          m === "IMP-036F-backed Golden Journey statuses aligned at activated-IMP-037 checkpoint" ||
          m === "IMP-036F-backed Golden Journey statuses aligned at activated-G checkpoint" ||
          m === "IMP-036F-backed Golden Journey statuses aligned at accepted-F checkpoint",
      ),
    );
    for (const rel of [
      "docs/platform/product/README.md",
      "docs/platform/product/personas.md",
      "docs/platform/product/golden-journeys.md",
      "docs/platform/product/templates/product-definition-template.md",
    ]) {
      assert.ok(messages.some((m) => m === `product artifact present: ${rel}`), rel);
    }
  });

  it("keeps IMP-036E-backed Golden Journeys CURRENT and menu-launch CURRENT at accepted-F", () => {
    const gj = readFileSync(
      new URL("../docs/platform/product/golden-journeys.md", import.meta.url),
      "utf8",
    );
    const required = {
      "GJ-AVAILABILITY": "CURRENT",
      "GJ-STORE-PAUSE-RESUME": "CURRENT",
      "GJ-TRADING-HOURS": "CURRENT",
      "GJ-ADDRESS-SERVICEABILITY": "CURRENT",
      "GJ-PRODUCT-MENU-LAUNCH": "CURRENT",
    };
    for (const [journeyId, expected] of Object.entries(required)) {
      const match = gj.match(
        new RegExp(String.raw`\| \`${journeyId}\`[^|]*\|[^|]*\|\s*\`([A-Z_]+)\``),
      );
      assert.equal(match?.[1], expected, `${journeyId} status`);
    }
  });
});

describe("canonical authority history compression", () => {
  it("recognizes GTM-R114 / STATE-R112 authorityCompression without treating it as IMP-036E acceptance", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R114", "STATE-R112", "authorityCompression"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R114", "STATE-R112", "imp036eCompletion"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R114", "STATE-R112", "imp036eAcceptance"),
      false,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R114", "STATE-R112"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R113", "STATE-R111", "imp036eCompletion"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R115", "STATE-R113", "imp036eAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036fActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036eAcceptance"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R115", "imp036fProductDefinitionDraftAuthorized"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R115", "imp036fActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036fProductDefinitionDraftAuthorized"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R116", "imp036fProductDefinitionGatePass"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R116", "imp036fProductDefinitionDraftAuthorized"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R115", "imp036fProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R119", "STATE-R117", "imp036fArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R119", "STATE-R117", "imp036fProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R116", "imp036fArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R120", "STATE-R118", "imp036fImplementationAuthorization"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R120", "STATE-R118", "imp036fArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R119", "STATE-R117", "imp036fImplementationAuthorization"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R121", "STATE-R119", "imp036fImplementationStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R121", "STATE-R119", "imp036fImplementationAuthorization"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R120", "STATE-R118", "imp036fImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036fAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036fImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R121", "STATE-R119", "imp036fAcceptance"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R123", "STATE-R121", "imp036gActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R125", "STATE-R123", "imp036gProductDefinitionDraft"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R126", "STATE-R124", "imp036gProductDefinitionGatePass"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R126", "STATE-R124", "imp036gArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gImplementationStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R129", "STATE-R127", "imp036gCompletion"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gCompletion"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R129", "STATE-R127", "imp036gImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R130", "STATE-R128", "imp036gAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R130", "STATE-R128", "imp036gCompletion"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R129", "STATE-R127", "imp036gAcceptance"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R124", "STATE-R122", "imp036gProductDefinitionDraft"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R125", "STATE-R123", "imp036gProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R123", "STATE-R121", "imp036fAcceptance"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036gActivation"),
      false,
    );
  });

  it("loads historical snapshots and keeps them distinct from CURRENT accepted authority text", () => {
    const hist = loadHistoricalAuthorityCorpus();
    assert.match(hist.roadmapText, /"roadmapVersion": "GTM-R113"/);
    assert.match(hist.stateText, /"stateVersion": "STATE-R111"/);
    assert.match(hist.roadmapText, /IMP-036E:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/);

    const roadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    const state = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
    const tipIsImp036iImplementationAuthorization = /"roadmapVersion": "GTM-R155"/.test(roadmap);
    const tipIsImp036iArchitectureLock = /"roadmapVersion": "GTM-R154"/.test(roadmap);
    const tipIsImp036iGatePass = /"roadmapVersion": "GTM-R153"/.test(roadmap);
    const tipIsImp036iDraftReady = /"roadmapVersion": "GTM-R152"/.test(roadmap);
    const tipIsImp036iDraftReadyDraft3Prior = /"roadmapVersion": "GTM-R151"/.test(roadmap);
    const tipIsImp036iDraftReadyDraft2Prior = /"roadmapVersion": "GTM-R150"/.test(roadmap);
    const tipIsImp036iDraftReadyPrior = /"roadmapVersion": "GTM-R149"/.test(roadmap);
    const tipIsImp036iActivation = /"roadmapVersion": "GTM-R148"/.test(roadmap);
    const tipIsImp036hAcceptance = /"roadmapVersion": "GTM-R147"/.test(roadmap);
    const tipIsImp036hImplementationComplete = /"roadmapVersion": "GTM-R146"/.test(roadmap);
    const tipIsImp036hImplementationStart = /"roadmapVersion": "GTM-R145"/.test(roadmap);
    const tipIsImp036hImplementationAuthorization = /"roadmapVersion": "GTM-R144"/.test(roadmap);
    const tipIsImp036hArchitectureLock = /"roadmapVersion": "GTM-R143"/.test(roadmap);
    const tipIsImp036hGatePass = /"roadmapVersion": "GTM-R142"/.test(roadmap);
    const tipIsImp036hActivation = /"roadmapVersion": "GTM-R141"/.test(roadmap);
    const tipIsAuthorizeStart = /"roadmapVersion": "GTM-R140"/.test(roadmap);
    const tipIsArchitectureLock = /"roadmapVersion": "GTM-R139"/.test(roadmap);
    const tipIsControlledContinuation = /"roadmapVersion": "GTM-R138"/.test(roadmap);
    if (tipIsImp036iImplementationAuthorization) {
      const currentMarker = roadmap.split("**GTM-R155**")[0];
      assert.match(roadmap, /"roadmapVersion": "GTM-R155"/);
      assert.match(state, /"stateVersion": "STATE-R153"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "IMP-036I"/);
      assert.match(state, /"nextProductSlice": "IMP-037"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(currentMarker, /IMP-036I:\s*ARCHITECTURE_LOCKED/);
      assert.match(currentMarker, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.doesNotMatch(currentMarker, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(currentMarker, /IMP036I_STARTED:\s*NO/);
      assert.match(currentMarker, /IMP036I_IMPLEMENTATION_COMPLETE:\s*NO/);
      assert.match(currentMarker, /IMP036I_ACCEPTED:\s*NO/);
      assert.match(state, /STATE-R153\s*=\s*IMP036I_IMPLEMENTATION_AUTHORIZED/);
      assert.match(roadmap, /5313026804/);
    } else if (tipIsImp036iArchitectureLock) {
      const currentMarker = roadmap.split("**GTM-R154**")[0];
      assert.match(roadmap, /"roadmapVersion": "GTM-R154"/);
      assert.match(state, /"stateVersion": "STATE-R152"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "IMP-036I"/);
      assert.match(state, /"nextProductSlice": "IMP-037"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(currentMarker, /IMP036I_ACTIVATED:\s*YES/);
      assert.match(currentMarker, /IMP-036I:\s*ARCHITECTURE_LOCKED/);
      assert.match(currentMarker, /IMP036I_PRODUCT_DEFINITION:\s*APPROVED\b/);
      assert.match(currentMarker, /IMP036I_PRODUCT_DEFINITION_VERSION:\s*PD-IMP-036I-DRAFT-4/);
      assert.match(currentMarker, /IMP036I_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(currentMarker, /IMP036I_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(currentMarker, /IMP036I_ARCHITECTURE_LOCKED:\s*YES/);
      assert.doesNotMatch(currentMarker, /IMP036I_ARCHITECTURE_FIT:\s*NOT_PERFORMED/);
      assert.match(currentMarker, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(currentMarker, /IMP036I_STARTED:\s*NO/);
      assert.match(currentMarker, /IMP036I_IMPLEMENTATION_STARTED:\s*NO/);
      assert.match(currentMarker, /IMP036I_IMPLEMENTATION_COMPLETE:\s*NO/);
      assert.match(currentMarker, /IMP036I_ACCEPTED:\s*NO/);
      assert.match(currentMarker, /IMP-036H:\s*COMPLETE_AND_ACCEPTED/);
      assert.match(roadmap, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP037_HOLD:\s*YES/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /IMP039_ACTIVATED:\s*NO/);
      assert.match(roadmap, /IMP040_ACTIVATED:\s*NO/);
      assert.match(state, /STATE-R152\s*=\s*IMP036I_ARCHITECTURE_LOCKED/);
      assert.match(roadmap, /5312653831/);
    } else if (tipIsImp036iGatePass) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R153"/);
      assert.match(state, /"stateVersion": "STATE-R151"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "IMP-036I"/);
      assert.match(state, /"nextProductSlice": "IMP-037"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(roadmap, /IMP036I_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP-036I:\s*PLANNED/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION:\s*APPROVED\b/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_VERSION:\s*PD-IMP-036I-DRAFT-4/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_FIT:\s*NOT_PERFORMED/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_LOCKED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(roadmap, /IMP036I_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_COMPLETE:\s*NO/);
      assert.match(roadmap, /IMP036I_ACCEPTED:\s*NO/);
      assert.match(roadmap, /IMP-036H:\s*COMPLETE_AND_ACCEPTED/);
      assert.match(roadmap, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP037_HOLD:\s*YES/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /IMP039_ACTIVATED:\s*NO/);
      assert.match(roadmap, /IMP040_ACTIVATED:\s*NO/);
      assert.match(state, /STATE-R151\s*=\s*IMP036I_PRODUCT_DEFINITION_GATE_PASS/);
    } else if (tipIsImp036iDraftReady) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R152"/);
      assert.match(state, /"stateVersion": "STATE-R150"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "IMP-036I"/);
      assert.match(state, /"nextProductSlice": "IMP-037"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(roadmap, /IMP036I_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP-036I:\s*PLANNED/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION:\s*DRAFT_READY_FOR_GATE\b/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_VERSION:\s*PD-IMP-036I-DRAFT-4/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_GATE:\s*NOT_PERFORMED/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_FIT:\s*NOT_PERFORMED/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_LOCKED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(roadmap, /IMP036I_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_COMPLETE:\s*NO/);
      assert.match(roadmap, /IMP036I_ACCEPTED:\s*NO/);
      assert.match(roadmap, /IMP-036H:\s*COMPLETE_AND_ACCEPTED/);
      assert.match(roadmap, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP037_HOLD:\s*YES/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /IMP039_ACTIVATED:\s*NO/);
      assert.match(roadmap, /IMP040_ACTIVATED:\s*NO/);
      assert.match(state, /STATE-R150\s*=\s*IMP036I_PRODUCT_DEFINITION_DRAFT_READY/);
    } else if (tipIsImp036iDraftReadyPrior) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R149"/);
      assert.match(state, /"stateVersion": "STATE-R147"/);
      assert.match(state, /STATE-R147\s*=\s*IMP036I_PRODUCT_DEFINITION_DRAFT_READY/);
    } else if (tipIsImp036iActivation) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R148"/);
      assert.match(state, /"stateVersion": "STATE-R146"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "IMP-036I"/);
      assert.match(state, /"nextProductSlice": "IMP-037"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(roadmap, /IMP036I_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP-036I:\s*PLANNED/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION:\s*(?:PRE_GATE_DRAFT|DRAFT)\b/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_VERSION:\s*PD-IMP-036I-DRAFT-1/);
      assert.match(roadmap, /IMP036I_PRODUCT_DEFINITION_GATE:\s*NOT_PERFORMED/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_FIT:\s*NOT_PERFORMED/);
      assert.match(roadmap, /IMP036I_ARCHITECTURE_LOCKED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(roadmap, /IMP036I_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_STARTED:\s*NO/);
      assert.match(roadmap, /IMP036I_IMPLEMENTATION_COMPLETE:\s*NO/);
      assert.match(roadmap, /IMP036I_ACCEPTED:\s*NO/);
      assert.match(roadmap, /IMP-036H:\s*COMPLETE_AND_ACCEPTED/);
      assert.match(roadmap, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP037_HOLD:\s*YES/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /IMP039_ACTIVATED:\s*NO/);
      assert.match(roadmap, /IMP040_ACTIVATED:\s*NO/);
      assert.match(state, /STATE-R146\s*=\s*IMP036I_PRODUCT_DEFINITION_ACTIVATION/);
    } else if (tipIsImp036hAcceptance) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R147"/);
      assert.match(state, /"stateVersion": "STATE-R145"/);
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
      assert.match(state, /"currentProductSlice": "NONE"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(state, /"pendingAcceptance": "NONE"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(roadmap, /IMP036H_STARTED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_COMPLETE:\s*YES/);
      assert.match(roadmap, /IMP-036H:\s*COMPLETE_AND_ACCEPTED/);
      assert.match(roadmap, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(roadmap, /IMP036H_FOUNDER_UAT:\s*PASS/);
      assert.match(roadmap, /IMP036H_FORMAL_ACCEPTANCE:\s*ACCEPTED/);
      assert.match(roadmap, /IMP036I_ACTIVATED:\s*NO/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /D-378_CREATED:\s*YES/);
      assert.match(state, /STATE-R145\s*=\s*IMP036H_ACCEPTANCE/);
    } else if (tipIsImp036hImplementationComplete) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R146"/);
      assert.match(state, /"stateVersion": "STATE-R144"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(state, /"pendingAcceptance": "IMP-036H"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(roadmap, /IMP036H_STARTED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_STARTED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_COMPLETE:\s*YES/);
      assert.match(roadmap, /IMP-036H:\s*IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /D-378_CREATED:\s*YES/);
      assert.match(state, /STATE-R144\s*=\s*IMP036H_IMPLEMENTATION_COMPLETE/);
    } else if (tipIsImp036hImplementationStart) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R145"/);
      assert.match(state, /"stateVersion": "STATE-R143"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(roadmap, /IMP036H_STARTED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_STARTED:\s*YES/);
      assert.match(roadmap, /IMP-036H:\s*IMPLEMENTATION_IN_PROGRESS/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /D-378_CREATED:\s*YES/);
      assert.match(state, /STATE-R143\s*=\s*IMP036H_IMPLEMENTATION_START/);
    } else if (tipIsImp036hImplementationAuthorization) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R144"/);
      assert.match(state, /"stateVersion": "STATE-R142"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(roadmap, /IMP036H_STARTED:\s*NO/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /D-378_CREATED:\s*YES/);
      assert.match(state, /STATE-R142\s*=\s*IMP036H_IMPLEMENTATION_AUTHORIZED/);
    } else if (tipIsImp036hArchitectureLock) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R143"/);
      assert.match(state, /"stateVersion": "STATE-R141"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*NO/);
      assert.match(roadmap, /IMP036H_STARTED:\s*NO/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
      assert.match(roadmap, /D-378_CREATED:\s*YES/);
    } else if (tipIsImp036hGatePass) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R142"/);
      assert.match(state, /"stateVersion": "STATE-R140"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*APPROVED/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION_GATE:\s*PASS/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
    } else if (tipIsImp036hActivation) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R141"/);
      assert.match(state, /"stateVersion": "STATE-R139"/);
      assert.match(state, /"currentProductSlice": "IMP-036H"/);
      assert.match(state, /"nextProductSlice": "IMP-036I"/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_PRODUCT_DEFINITION:\s*DRAFT_READY_FOR_GATE/);
      assert.match(roadmap, /PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/);
      assert.match(roadmap, /IMP038_HOLD:\s*YES/);
    } else if (tipIsAuthorizeStart) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R140"/);
      assert.match(state, /"stateVersion": "STATE-R138"/);
      assert.match(state, /"currentProductSlice": "IMP-038"/);
      assert.match(state, /"nextProductSlice": "IMP-039"/);
      assert.match(roadmap, /IMP038_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP038_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP038_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(roadmap, /IMP038_STARTED:\s*YES/);
      assert.match(roadmap, /IMP-038:\s*IMPLEMENTATION_IN_PROGRESS/);
    } else if (tipIsArchitectureLock) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R139"/);
      assert.match(state, /"stateVersion": "STATE-R137"/);
      assert.match(state, /"currentProductSlice": "IMP-038"/);
      assert.match(state, /"nextProductSlice": "IMP-039"/);
      assert.match(roadmap, /IMP038_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(roadmap, /IMP038_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(roadmap, /IMP-038:\s*ARCHITECTURE_LOCKED/);
    } else if (tipIsControlledContinuation) {
      assert.match(roadmap, /"roadmapVersion": "GTM-R138"/);
      assert.match(state, /"stateVersion": "STATE-R136"/);
      assert.match(state, /"currentProductSlice": "IMP-038"/);
      assert.match(state, /"nextProductSlice": "IMP-039"/);
    } else {
      // Historical live tip until docs author lands GTM-R138 / STATE-R136.
      assert.match(roadmap, /"roadmapVersion": "GTM-R137"/);
      assert.match(state, /"stateVersion": "STATE-R135"/);
      assert.match(state, /"currentProductSlice": "IMP-037"/);
      assert.match(state, /"nextProductSlice": "IMP-038"/);
    }
    if (tipIsImp036iImplementationAuthorization || tipIsImp036iArchitectureLock || tipIsImp036iGatePass || tipIsImp036iDraftReady || tipIsImp036iDraftReadyDraft2Prior || tipIsImp036iDraftReadyPrior || tipIsImp036iActivation || tipIsImp036hAcceptance) {
      assert.match(state, /"acceptedThrough": "IMP-036H"/);
    } else {
      assert.match(state, /"acceptedThrough": "IMP-036G"/);
    }
    if (tipIsImp036hImplementationComplete) {
      assert.match(state, /"pendingAcceptance": "IMP-036H"/);
    } else {
      assert.match(state, /"pendingAcceptance": "NONE"/);
    }
    assert.match(roadmap, /IMP-036E_ACCEPTED:\s*YES/);
    assert.match(state, /IMP-036E_FOUNDER_UAT:\s*PASS/);
    assert.match(roadmap, /IMP-036F:\s*COMPLETE_AND_ACCEPTED/);
    assert.match(roadmap, /IMP036F_ACCEPTED:\s*YES/);
    assert.match(state, /IMP036F_ACCEPTED:\s*YES/);
    assert.match(roadmap, /IMP036F_FOUNDER_UAT:\s*PASS/);
    assert.match(roadmap, /IMP036F_STARTED:\s*YES/);
    assert.match(state, /IMP036F_STARTED:\s*YES/);
    assert.match(roadmap, /IMP036F_PRODUCT_DEFINITION:\s*APPROVED/);
    assert.match(roadmap, /IMP036F_PRODUCT_DEFINITION_GATE:\s*PASS/);
    assert.match(roadmap, /IMP036F_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(roadmap, /IMP036F_ARCHITECTURE_LOCKED:\s*YES/);
    assert.match(state, /IMP036F_PRODUCT_DEFINITION:\s*APPROVED/);
    assert.match(state, /IMP036F_PRODUCT_DEFINITION_GATE:\s*PASS/);
    assert.match(state, /IMP036F_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(state, /IMP036F_ARCHITECTURE_LOCKED:\s*YES/);
    assert.match(roadmap, /IMP036G_ACTIVATED:\s*YES/);
    assert.match(state, /IMP036G_ACTIVATED:\s*YES/);
    assert.match(roadmap, /IMP036G_PRODUCT_DEFINITION:\s*APPROVED/);
    assert.match(roadmap, /IMP036G_PRODUCT_DEFINITION_VERSION:\s*PD-IMP-036G-DRAFT-2/);
    assert.match(roadmap, /IMP036G_PRODUCT_DECISIONS:\s*RESOLVED/);
    assert.match(roadmap, /IMP036G_PRODUCT_DECISION_COUNT:\s*7/);
    assert.match(roadmap, /IMP036G_PRODUCT_DEFINITION_GATE:\s*PASS/);
    assert.match(roadmap, /IMP036G_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(roadmap, /IMP036G_ARCHITECTURE_LOCKED:\s*YES/);
    assert.match(roadmap, /IMP-036G:\s*COMPLETE_AND_ACCEPTED/);
    assert.match(state, /IMP-036G:\s*COMPLETE_AND_ACCEPTED/);
    assert.match(roadmap, /IMP036G_IMPLEMENTATION_AUTHORIZED:\s*YES/);
    assert.match(roadmap, /IMP036G_STARTED:\s*YES/);
    assert.match(roadmap, /IMP036G_IMPLEMENTATION_COMPLETE:\s*YES/);
    assert.match(state, /IMP036G_IMPLEMENTATION_AUTHORIZED:\s*YES/);
    assert.match(state, /IMP036G_STARTED:\s*YES/);
    assert.match(state, /IMP036G_IMPLEMENTATION_COMPLETE:\s*YES/);
    assert.match(roadmap, /IMP036G_MANUAL_TECHNICAL_VALIDATION:\s*PASS/);
    assert.match(state, /IMP036G_MANUAL_TECHNICAL_VALIDATION:\s*PASS/);
    assert.match(roadmap, /IMP036G_ACCEPTED:\s*YES/);
    assert.match(roadmap, /IMP036G_FOUNDER_UAT:\s*PASS/);
    assert.match(roadmap, /IMP036G_FORMAL_ACCEPTANCE:\s*ACCEPTED/);
    assert.match(roadmap, /IMP036G_ACCEPTED_MAIN_SHA:\s*fbf690a67cda51bd6bbc1bad4a9d26f574c4286e/);
    assert.match(roadmap, /IMP036G_ACCEPTED_TREE:\s*84b6a502fcec646cb5a65f3257f19b85c64f49e1/);
    assert.match(roadmap, /IMP036G_FOUNDER_UAT_CANDIDATE_FINGERPRINT:\s*9f472ce6e1ccaa2fe914006c846fb3018d668b718f569b6d0cb4fa64c3013f9b/);
    assert.match(roadmap, /IMP036G_EXACT_MAIN_CI:\s*35366698302/);
    assert.match(roadmap, /IMP036G_IMPLEMENTATION_MERGE_SHA:\s*c35c9eab6a30ec6ce745cefd75c523181326f360/);
    if (tipIsImp036iImplementationAuthorization || tipIsImp036iArchitectureLock || tipIsImp036iGatePass || tipIsImp036iDraftReady || tipIsImp036iDraftReadyDraft2Prior || tipIsImp036iDraftReadyPrior || tipIsImp036iActivation) {
      assert.match(state, /Current Product Slice:\s*IMP-036I/);
    } else if (tipIsImp036hAcceptance) {
      assert.match(state, /Current Product Implementation:\s*IMP-037/);
      assert.match(state, /Current Product Slice:\s*NONE/);
    } else if (!(tipIsImp036hImplementationComplete || tipIsImp036hImplementationStart || tipIsImp036hImplementationAuthorization || tipIsImp036hArchitectureLock || tipIsImp036hGatePass || tipIsImp036hActivation || tipIsAuthorizeStart || tipIsArchitectureLock || tipIsControlledContinuation)) {
      assert.match(state, /Current Product Implementation:\s*NONE/);
    }
    assert.match(roadmap, /IMP037_ACTIVATED:\s*YES/);
    assert.match(state, /IMP037_ACTIVATED:\s*YES/);
    assert.match(roadmap, /IMP037_PRODUCT_DEFINITION:\s*APPROVED/);
    assert.match(roadmap, /IMP037_PRODUCT_DEFINITION_GATE:\s*PASS/);
    assert.match(roadmap, /IMP037_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(roadmap, /IMP037_ARCHITECTURE_LOCKED:\s*YES/);
    assert.match(state, /IMP037_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(state, /IMP037_ARCHITECTURE_LOCKED:\s*YES/);
    assert.match(state, /STATE-R132 = IMP-037_ARCHITECTURE_LOCK/);
    if (tipIsImp036iImplementationAuthorization || tipIsImp036iArchitectureLock || tipIsImp036iGatePass || tipIsImp036iDraftReady || tipIsImp036iDraftReadyDraft2Prior || tipIsImp036iDraftReadyPrior || tipIsImp036iActivation) {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036I_ACTIVATED:\s*YES/);
      assert.match(roadmap, /"currentProductSlice": "IMP-036I"/);
      assert.match(roadmap, /"nextProductSlice": "IMP-037"/);
    } else if (tipIsImp036hAcceptance) {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /"currentProductSlice": "NONE"/);
      assert.match(roadmap, /"nextProductSlice": "IMP-036I"/);
    } else if (tipIsImp036hImplementationComplete || tipIsImp036hImplementationStart || tipIsImp036hImplementationAuthorization || tipIsImp036hArchitectureLock || tipIsImp036hGatePass || tipIsImp036hActivation) {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*YES/);
      assert.match(roadmap, /IMP036H_ACTIVATED:\s*YES/);
      assert.match(roadmap, /"currentProductSlice": "IMP-036H"/);
      assert.match(roadmap, /"nextProductSlice": "IMP-036I"/);
    } else if (tipIsAuthorizeStart || tipIsArchitectureLock || tipIsControlledContinuation) {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*YES/);
      assert.match(roadmap, /CONTINUATION_EXCEPTION:\s*IMP037_PROVIDER_BLOCKED_TO_IMP038/);
      assert.match(roadmap, /IMP038_ACCEPTANCE_BLOCKED_BY_IMP037:\s*YES/);
      assert.match(roadmap, /"currentProductSlice": "IMP-038"/);
      assert.match(roadmap, /"nextProductSlice": "IMP-039"/);
    } else {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*NO/);
      assert.match(roadmap, /"currentProductSlice": "IMP-037"/);
      assert.match(roadmap, /"nextProductSlice": "IMP-038"/);
    }
    assert.match(roadmap, /IMP036E_ACCEPTED_MAIN_SHA:\s*05c534bac3d077f5ab89928495568bb63faf78df/);
    assert.match(roadmap, /FOUNDER_STAGING_INTERMEDIATE_CANDIDATE_SHA:\s*e9821271a29ae35ba6c921008b976cd2e8d15c50/);
    assert.match(state, /FOUNDER_STAGING_INTERMEDIATE_CANDIDATE_SHA:\s*e9821271a29ae35ba6c921008b976cd2e8d15c50/);
    assert.doesNotMatch(roadmap, /FOUNDER_STAGING_DEPLOYMENT:\s*NOT_PERFORMED/);
    assert.doesNotMatch(state, /FOUNDER_STAGING_DEPLOYMENT:\s*NOT_PERFORMED/);

    const current = currentAuthorityBlob({ text: roadmap }, { text: state });
    const evidence = authorityEvidenceBlob({ text: roadmap }, { text: state });
    assert.ok(evidence.includes(hist.roadmapText.slice(0, 80)));
    assert.ok(current.includes("GTM-R130"));
    assert.ok(!current.includes('"roadmapVersion": "GTM-R113"'));
    // Stale historical claim may exist in snapshot evidence without overriding CURRENT metadata.
    assert.ok(/pendingAcceptance:\s*NONE/.test(hist.stateText) || /Pending Acceptance:\s+NONE/.test(hist.stateText));
    if (/"roadmapVersion": "GTM-R146"/.test(roadmap)) {
      assert.match(state, /"pendingAcceptance": "IMP-036H"/);
    } else {
      assert.match(state, /"pendingAcceptance": "NONE"/);
    }
    // Historical snapshots may retain pre-correction FOUNDER_STAGING_DEPLOYMENT: NOT_PERFORMED.
    assert.match(hist.roadmapText, /FOUNDER_STAGING_DEPLOYMENT:\s*NOT_PERFORMED/);
    assert.ok(current.includes("FOUNDER_STAGING_STATUS: FOUNDER_UAT_COMPLETE"));
    assert.ok(!/FOUNDER_STAGING_DEPLOYMENT:\s*NOT_PERFORMED/.test(current));
  });

  it("passes CURRENT authority checks at the IMP-038 authorize+start / Architecture Fit lock / controlled-continuation tip", () => {
    const roadmap = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    const tipIsImp036iImplementationAuthorization = /"roadmapVersion": "GTM-R155"/.test(roadmap);
    const tipIsImp036iArchitectureLock = /"roadmapVersion": "GTM-R154"/.test(roadmap);
    const tipIsImp036iGatePass = /"roadmapVersion": "GTM-R153"/.test(roadmap);
    const tipIsImp036iDraftReady = /"roadmapVersion": "GTM-R152"/.test(roadmap);
    const tipIsImp036iDraftReadyDraft3Prior = /"roadmapVersion": "GTM-R151"/.test(roadmap);
    const tipIsImp036iDraftReadyDraft2Prior = /"roadmapVersion": "GTM-R150"/.test(roadmap);
    const tipIsImp036iDraftReadyPrior = /"roadmapVersion": "GTM-R149"/.test(roadmap);
    const tipIsImp036iActivation = /"roadmapVersion": "GTM-R148"/.test(roadmap);
    const tipIsImp036hAcceptance = /"roadmapVersion": "GTM-R147"/.test(roadmap);
    const tipIsImp036hImplementationComplete = /"roadmapVersion": "GTM-R146"/.test(roadmap);
    const tipIsImp036hImplementationStart = /"roadmapVersion": "GTM-R145"/.test(roadmap);
    const tipIsImp036hImplementationAuthorization = /"roadmapVersion": "GTM-R144"/.test(roadmap);
    const tipIsImp036hArchitectureLock = /"roadmapVersion": "GTM-R143"/.test(roadmap);
    const tipIsImp036hGatePass = /"roadmapVersion": "GTM-R142"/.test(roadmap);
    const tipIsImp036hActivation = /"roadmapVersion": "GTM-R141"/.test(roadmap);
    const tipIsAuthorizeStart = /"roadmapVersion": "GTM-R140"/.test(roadmap);
    const tipIsArchitectureLock = /"roadmapVersion": "GTM-R139"/.test(roadmap);
    const tipIsControlledContinuation = /"roadmapVersion": "GTM-R138"/.test(roadmap);
    const findings = runProjectConsistency();
    const failures = findings.filter((f) => !f.ok);
    assert.equal(failures.length, 0, failures.map((f) => `[${f.code}] ${f.message}`).join("\n"));
    const messages = findings.filter((f) => f.ok).map((f) => f.message);
    if (tipIsImp036iImplementationAuthorization) {
      assert.ok(messages.some((m) => m.includes("IMP-036I implementation authorization persistence is CURRENT")));
    } else if (tipIsImp036iArchitectureLock) {
      assert.ok(messages.some((m) => m.includes("IMP-036I architecture lock persistence is CURRENT")));
    } else if (tipIsImp036iGatePass || tipIsImp036iDraftReady || tipIsImp036iDraftReadyDraft3Prior || tipIsImp036iDraftReadyDraft2Prior || tipIsImp036iDraftReadyPrior) {
      assert.ok(messages.some((m) => m.includes("IMP-036I Product Definition Gate PASS valid") || m.includes("IMP-036I Product Definition DRAFT_READY valid")));
      if (tipIsImp036iGatePass) {
        assert.ok(messages.some((m) => m.includes("IMP-036I Architecture Fit candidate authority valid")));
      }
    } else if (tipIsImp036iActivation) {
      assert.ok(messages.some((m) => m.includes("IMP-036I Product Definition activation valid")));
    } else if (tipIsImp036hAcceptance) {
      assert.ok(messages.some((m) => m.includes("IMP-036H COMPLETE_AND_ACCEPTED")));
    } else if (tipIsImp036hImplementationComplete) {
      assert.ok(messages.some((m) => m.includes("IMP-036H implementation complete persistence valid")));
    } else if (tipIsImp036hImplementationStart) {
      assert.ok(messages.some((m) => m.includes("IMP-036H implementation start persistence valid")));
    } else if (tipIsImp036hImplementationAuthorization) {
      assert.ok(messages.some((m) => m.includes("IMP-036H implementation authorization persistence valid")));
    } else if (tipIsImp036hArchitectureLock) {
      assert.ok(messages.some((m) => m.includes("IMP-036H Architecture Fit lock persistence valid")));
    } else if (tipIsImp036hGatePass) {
      assert.ok(messages.some((m) => m.includes("IMP-036H Product Definition Gate PASS persistence valid")));
    } else if (tipIsImp036hActivation) {
      assert.ok(messages.some((m) => m.includes("IMP-036H Product Definition + program-pause activation valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-038 authorize+start persistence valid")));
    } else if (tipIsAuthorizeStart) {
      assert.ok(messages.some((m) => m.includes("IMP-038 authorize+start persistence valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-038 Architecture Fit lock persistence valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-038 controlled-continuation tip persistence valid")));
    } else if (tipIsArchitectureLock) {
      assert.ok(messages.some((m) => m.includes("IMP-038 Architecture Fit lock persistence valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-038 controlled-continuation tip persistence valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-037 post-merge reconciliation persistence valid")));
    } else if (tipIsControlledContinuation) {
      assert.ok(messages.some((m) => m.includes("IMP-038 controlled-continuation tip persistence valid") || m.includes("IMP-038 controlled-continuation activation persistence valid")));
      assert.ok(!messages.some((m) => m.includes("IMP-037 post-merge reconciliation persistence valid")));
    } else {
      // Until docs land R138/S136, live tip remains the historical post-merge checkpoint.
      assert.ok(messages.some((m) => m.includes("IMP-037 post-merge reconciliation persistence valid")));
    }
    assert.ok(messages.some((m) => m.includes("CURRENT authority anti-stale checks OK")));
    assert.ok(messages.some((m) => m.includes("historical authority corpus loaded")));
    // GTM-R133–R136 D-374 / lock / auth / start persistence are historical from GTM-R137 onward.
    assert.ok(!messages.some((m) => m.includes("D-374 cost-optimized pilot infrastructure persistence valid")));
    assert.ok(!messages.some((m) => m.includes("IMP-037 Architecture Lock persistence valid")));
    assert.ok(!messages.some((m) => m.includes("IMP-037 implementation authorization persistence valid")));
    assert.ok(!messages.some((m) => m.includes("IMP-037 implementation start persistence valid")));
  });

  it("preserves accepted IMP-036E customer-commerce cohesion and dark-only policy in CURRENT capability", () => {
    const capability = readFileSync(
      new URL("../docs/platform/capabilities/IMP-036E-store-operations-management.md", import.meta.url),
      "utf8",
    );
    assert.match(
      capability,
      /WORKFORCE_MUTATION\s*→\s*EXISTING_DOMAIN_AUTHORITY\s*→\s*CUSTOMER_READ\/EVALUATION\s*→\s*TRUTHFUL_CUSTOMER_EXPERIENCE/,
    );
    assert.match(capability, /SELECTED_OUTLET\s*=\s*SERVER_DERIVED_FROM_SERVICEABILITY/);
    assert.match(capability, /CALLER_SELECTED_OUTLET_ID\s*=\s*NOT_GEOGRAPHIC_AUTHORITY/);
    assert.match(capability, /THEME_COUNT\s*=\s*1/);
    assert.match(capability, /PRIMARY_THEME\s*=\s*DARK/);
    assert.match(capability, /FOUNDER_APPROVED_UAT_READINESS_VISUAL_DIRECTION\s*=\s*DARK_ONLY/);
    assert.match(capability, /IMP036F_ACTIVATED:\s*NO/);

    const experience = readFileSync(
      new URL(
        "../docs/platform/experience/enterprise-experience/IMP-036E-store-operations-management.md",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(experience, /Status:\s*SUPERSEDED HISTORICAL PROGRAMME CONTRACT/);
    assert.match(experience, /THEME_COUNT\s*=\s*1/);
    assert.match(experience, /WORKFORCE_MUTATION/);
    assert.match(experience, /SELECTED_OUTLET\s*=\s*SERVER_DERIVED_FROM_SERVICEABILITY/);
    assert.match(experience, /Target outcomes and information architecture/);
    assert.match(experience, /Founder-approved UAT-readiness visual direction/);
  });
});


describe("IMP-036F Product Definition draft authorization checkpoints", () => {
  const activationBase = {
    roadmapVersion: "GTM-R116",
    stateVersion: "STATE-R114",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "PLANNED",
    imp036fActivated: "YES",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    productDefinition: "NOT_CREATED",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: false,
    d374Exists: false,
    archR20Exists: false,
  };

  const draftAuthorizedBase = {
    roadmapVersion: "GTM-R117",
    stateVersion: "STATE-R115",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "PLANNED",
    imp036fActivated: "YES",
    productDefinition: "DRAFT_AUTHORIZED",
    productDefinitionGate: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: false,
    d374Exists: false,
    archR20Exists: false,
  };

  const validUngatedDraft = `<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "PRODUCT_DEFINITION"
}
-->

# IMP-036F Product Definition (ungated draft candidate)

Document status: DRAFT

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
architecture fit: not performed
IMP036F_IMPLEMENTATION_AUTHORIZED: NO
IMP036F_STARTED: NO
IMP036F_ARCHITECTURE_LOCKED: NO
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO
\`\`\`
`;

  it("preserves GTM-R116 / STATE-R114 activation checkpoint with no Product Definition", () => {
    assert.deepEqual(evaluateImp036fActivationCheckpoint(activationBase), { ok: true });
    assert.equal(
      evaluateImp036fActivationCheckpoint({ ...activationBase, productDefinitionExists: true }).ok,
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036fActivation"),
      true,
    );
  });

  it("passes GTM-R117 / STATE-R115 with DRAFT_AUTHORIZED, gate NOT_PERFORMED, and Product Definition absent", () => {
    assert.deepEqual(evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint(draftAuthorizedBase), { ok: true });
  });

  it("passes GTM-R117 / STATE-R115 with a valid ungated DRAFT Product Definition candidate present", () => {
    const result = evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
      ...draftAuthorizedBase,
      productDefinitionExists: true,
      productDefinitionText: validUngatedDraft,
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(evaluateImp036fUngatedProductDefinitionDraftCandidate(validUngatedDraft), { ok: true });
  });

  it("fails GTM-R117 / STATE-R115 when draft candidate claims Gate PASS", () => {
    const bad = validUngatedDraft.replace(
      "Gate Result: NOT_PERFORMED",
      "Gate Result: PASS",
    ).replace(
      "PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED",
      "PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED",
    );
    const result = evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
      ...draftAuthorizedBase,
      productDefinitionExists: true,
      productDefinitionText: bad,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_PREMATURE_GATE_PASS");
  });

  it("rejects NOT_PERFORMED execution with Gate Result STOP (actual verdict before gate)", () => {
    const bad = validUngatedDraft.replace("Gate Result: NOT_PERFORMED", "Gate Result: STOP");
    const result = evaluateImp036fUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_PREMATURE_GATE_PASS");
  });

  it("rejects NOT_PERFORMED execution with Gate Result PASS (actual verdict before gate)", () => {
    const bad = validUngatedDraft.replace("Gate Result: NOT_PERFORMED", "Gate Result: PASS");
    const result = evaluateImp036fUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_PREMATURE_GATE_PASS");
  });

  it("rejects PERFORMED execution even when Gate Result is NOT_PERFORMED", () => {
    const bad = validUngatedDraft.replace(
      "PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED",
      "PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED",
    );
    const result = evaluateImp036fUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_PREMATURE_GATE_PASS");
  });

  it("rejects missing PRODUCT_DEFINITION_GATE_EXECUTION when Gate Result is NOT_PERFORMED", () => {
    const bad = validUngatedDraft.replace(
      "PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED\n",
      "",
    );
    const result = evaluateImp036fUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_GATE_EXECUTION_NOT_PERFORMED");
  });

  it("rejects missing Gate Result when PRODUCT_DEFINITION_GATE_EXECUTION is NOT_PERFORMED", () => {
    const bad = validUngatedDraft.replace("Gate Result: NOT_PERFORMED\n", "");
    const result = evaluateImp036fUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_GATE_RESULT_NOT_PERFORMED");
  });

  it("fails GTM-R117 / STATE-R115 when architecture is locked or implementation is authorized/started", () => {
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        architectureLocked: "YES",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        implementationAuthorized: "YES",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        started: "YES",
      }).ok,
      false,
    );
    const lockedDraft = validUngatedDraft.replace(
      "IMP036F_ARCHITECTURE_LOCKED: NO",
      "IMP036F_ARCHITECTURE_LOCKED: YES",
    );
    assert.equal(
      evaluateImp036fUngatedProductDefinitionDraftCandidate(lockedDraft).ok,
      false,
    );
    const authorizedDraft = validUngatedDraft.replace(
      "IMP036F_IMPLEMENTATION_AUTHORIZED: NO",
      "IMP036F_IMPLEMENTATION_AUTHORIZED: YES",
    );
    assert.equal(
      evaluateImp036fUngatedProductDefinitionDraftCandidate(authorizedDraft).ok,
      false,
    );
  });

  it("fails when IMP-036G is activated", () => {
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        imp036gActivated: "YES",
      }).ok,
      false,
    );
  });

  it("fails on ROADMAP/STATE version mismatch", () => {
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        roadmapVersion: "GTM-R116",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fProductDefinitionDraftAuthorizedCheckpoint({
        ...draftAuthorizedBase,
        stateVersion: "STATE-R114",
      }).ok,
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R114", "imp036fProductDefinitionDraftAuthorized"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R115", "imp036fProductDefinitionDraftAuthorized"),
      false,
    );
  });
});

describe("IMP-036F Product Definition Gate PASS checkpoints", () => {
  const gatePassBase = {
    roadmapVersion: "GTM-R118",
    stateVersion: "STATE-R116",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "PLANNED",
    imp036fActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validApprovedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFit": "NOT_PERFORMED"
}
-->

# IMP-036F Product Definition (gate-passed)

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT: NOT_PERFORMED
IMP036F_IMPLEMENTATION_AUTHORIZED: NO
IMP036F_STARTED: NO
IMP036F_ARCHITECTURE_LOCKED: NO
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO
\`\`\`
`;

  it("passes GTM-R118 / STATE-R116 with approved PD, gate PERFORMED/PASS, Architecture Fit NOT_PERFORMED", () => {
    const result = evaluateImp036fProductDefinitionGatePassCheckpoint({
      ...gatePassBase,
      productDefinitionText: validApprovedPd,
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(evaluateImp036fApprovedProductDefinitionCandidate(validApprovedPd), { ok: true });
  });

  it("fails when Product Definition is absent", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionExists: false,
        productDefinitionText: "",
      }).ok,
      false,
    );
  });

  it("fails when Product Definition still says DRAFT / NOT_PERFORMED", () => {
    const draft = `Document status: DRAFT
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
`;
    const result = evaluateImp036fProductDefinitionGatePassCheckpoint({
      ...gatePassBase,
      productDefinitionText: draft,
    });
    assert.equal(result.ok, false);
  });

  it("fails when ROADMAP/STATE still DRAFT_AUTHORIZED / NOT_PERFORMED", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinition: "DRAFT_AUTHORIZED",
        productDefinitionGate: "NOT_PERFORMED",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
  });

  it("fails when Gate Result is STOP at the PASS checkpoint", () => {
    const stop = validApprovedPd.replace("Gate Result: PASS", "Gate Result: STOP");
    const result = evaluateImp036fApprovedProductDefinitionCandidate(stop);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_GATE_RESULT_STOP");
  });

  it("fails when architecture is locked or Architecture Fit is represented complete", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        architectureLocked: "YES",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
    const locked = validApprovedPd.replace("IMP036F_ARCHITECTURE_LOCKED: NO", "IMP036F_ARCHITECTURE_LOCKED: YES");
    assert.equal(evaluateImp036fApprovedProductDefinitionCandidate(locked).ok, false);
    const fitDone = validApprovedPd.replace("ARCHITECTURE_FIT: NOT_PERFORMED", "ARCHITECTURE_FIT: PASS");
    assert.equal(evaluateImp036fApprovedProductDefinitionCandidate(fitDone).ok, false);
  });

  it("fails when implementation is authorized", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        implementationAuthorized: "YES",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
  });

  it("fails when implementation is started", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        started: "YES",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
  });

  it("fails when IMP-036G is activated", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036gActivated: "YES",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
  });

  it("fails on ROADMAP/STATE version mismatch", () => {
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        roadmapVersion: "GTM-R117",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        stateVersion: "STATE-R115",
        productDefinitionText: validApprovedPd,
      }).ok,
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R115", "imp036fProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R116", "imp036fProductDefinitionGatePass"),
      false,
    );
  });
});

describe("IMP-036F Architecture Lock checkpoints", () => {
  const lockBase = {
    roadmapVersion: "GTM-R119",
    stateVersion: "STATE-R117",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "ARCHITECTURE_LOCKED",
    imp036fActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validLockedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036F",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "impAccepted": false,
  "schemaChangeRequired": true
}
-->

# IMP-036F

IMP036F_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
ARCHITECTURE_REVIEWED_CANDIDATE_TREE = 55adb287bb0eb77240a6becdc16fed2d504ba144
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
`;

  const validFitPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFit": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureLocked": "YES"
}
-->

# IMP-036F Product Definition

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036F_ARCHITECTURE_LOCKED: YES
IMP036F_IMPLEMENTATION_AUTHORIZED: NO
IMP036F_STARTED: NO
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO
ARCHITECTURE_FIT_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
\`\`\`

## US-IMP-036F-009

Permission / resource context:
DELIVERY_TARIFF_AUTHORITY = PRICING
Tariff read: pricing.read @ Brand derived server-side from Outlet
Tariff mutation: pricing.manage @ Brand derived server-side from Outlet
SERVICEABILITY_MANAGE_AUTHORIZES_TARIFF_PRICE = NO
NEW_PERMISSION_REQUIRED = NO
Architecture Fit status: RESOLVED / PASS / LOCKED
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization remains a separate gate and is NOT granted.

| Action | Permission | Scope | Outcome |
|---|---|---|---|
| Mutate delivery tariff | pricing.manage | Brand derived server-side from Outlet | authorized allow / unauthorized deny; serviceability.manage does not authorize tariff price |

## Dependencies

| Dependency | Authority | Required before | Unresolved impact |
|---|---|---|---|
| Architecture Fit | PD-1 phase | Before implementation readiness | PERFORMED / PASS — locked capability architecture; implementation remains separately unauthorized |
| Implementation authorization | ROADMAP/STATE | Before coding | NO |

Originally identified Architecture Fit inputs (Product Definition Gate era; **resolved** by locked capability architecture):
1. \`ARCHITECTURE_FIT_AUTHORIZATION_GAP\` (delivery-tariff mutation permission/command mapping) → **resolved** as Pricing authority / Brand derived from Outlet; \`pricing.read\` / \`pricing.manage\`.
`;

  it("passes valid R119/S117 architecture-lock checkpoint", () => {
    assert.deepEqual(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp036fLockedCapabilityArchitecture(validLockedCapability), { ok: true });
    assert.deepEqual(evaluateImp036fArchitectureFitProductDefinition(validFitPd), { ok: true });
  });

  it("fails when capability architecture is missing", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        capabilityArtifactExists: false,
        productDefinitionText: validFitPd,
        capabilityText: "",
      }).ok,
      false,
    );
  });

  it("fails when capability remains candidate/DRAFT", () => {
    const draft = validLockedCapability
      .replace('"status": "CURRENT"', '"status": "DRAFT"')
      .replace('"authority": "CAPABILITY_ARCHITECTURE"', '"authority": "CAPABILITY_ARCHITECTURE_CANDIDATE"');
    assert.equal(evaluateImp036fLockedCapabilityArchitecture(draft).ok, false);
  });

  it("fails when capability remains NOT_LOCKED", () => {
    const unlocked = validLockedCapability.replace(
      '"architectureLock": "ARCHITECTURE_LOCKED"',
      '"architectureLock": "NOT_LOCKED"',
    );
    assert.equal(evaluateImp036fLockedCapabilityArchitecture(unlocked).ok, false);
  });

  it("fails when Product Definition still says Architecture Fit NOT_PERFORMED", () => {
    const stale = validFitPd
      .replace('"architectureFit": "PASS"', '"architectureFit": "NOT_PERFORMED"')
      .replace("ARCHITECTURE_FIT: PASS", "ARCHITECTURE_FIT: NOT_PERFORMED");
    assert.equal(evaluateImp036fArchitectureFitProductDefinition(stale).ok, false);
  });

  it("fails when Product Definition architecture locked NO", () => {
    const stale = validFitPd
      .replace('"architectureLocked": "YES"', '"architectureLocked": "NO"')
      .replace("IMP036F_ARCHITECTURE_LOCKED: YES", "IMP036F_ARCHITECTURE_LOCKED: NO");
    assert.equal(evaluateImp036fArchitectureFitProductDefinition(stale).ok, false);
  });

  it("fails on ROADMAP/STATE mismatch", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        roadmapVersion: "GTM-R118",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        stateVersion: "STATE-R116",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when implementation authorized YES", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        implementationAuthorized: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    const pdAuthorized = validFitPd.replace(
      "IMP036F_IMPLEMENTATION_AUTHORIZED: NO",
      "IMP036F_IMPLEMENTATION_AUTHORIZED: YES",
    );
    assert.equal(evaluateImp036fArchitectureFitProductDefinition(pdAuthorized).ok, false);
  });

  it("fails when implementation started YES", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        started: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when IMP-036F accepted YES", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        accepted: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when IMP-036G activated YES", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        imp036gActivated: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when D-374 exists", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        d374Exists: true,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when ARCH-R20 exists", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        archR20Exists: true,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when stale R118/S116 markers are mixed into R119/S117 facts", () => {
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        architectureLocked: "NO",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        architectureFit: "NOT_PERFORMED",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036fArchitectureLockCheckpoint({
        ...lockBase,
        imp036fFormalLifecycle: "PLANNED",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails US-009 current readiness blocker ARCHITECTURE_FIT_AUTHORIZATION_GAP", () => {
    const stale = `${validFitPd}

Permission / resource context: Must use the Architecture Fit-mapped existing authorization/command
path only; do not invent a permission in this Product Definition. Current readiness blocker:
ARCHITECTURE_FIT_AUTHORIZATION_GAP until mapping is resolved.
`;
    const result = evaluateImp036fArchitectureFitProductDefinition(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_STALE_US009_FIT_BLOCKER");
  });

  it("fails tariff permission row saying currently ARCHITECTURE_FIT_AUTHORIZATION_GAP", () => {
    const stale = `${validFitPd}

| Mutate delivery tariff | Existing authority/command path mapped by Architecture Fit (currently **ARCHITECTURE_FIT_AUTHORIZATION_GAP** readiness blocker) | Outlet commercial tariff scope | After Fit: authorized allow |
`;
    const result = evaluateImp036fArchitectureFitProductDefinition(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_STALE_TARIFF_PERMISSION_BLOCKER");
  });

  it("fails current Architecture Fit dependency row NOT_PERFORMED", () => {
    const stale = validFitPd.replace(
      "| Architecture Fit | PD-1 phase | Before implementation readiness | PERFORMED / PASS — locked capability architecture; implementation remains separately unauthorized |",
      "| Architecture Fit | PD-1 phase | Before implementation readiness | NOT_PERFORMED |",
    );
    const result = evaluateImp036fArchitectureFitProductDefinition(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_STALE_DEPENDENCY_FIT_NOT_PERFORMED");
  });

  it("allows explicitly historical ARCHITECTURE_FIT_AUTHORIZATION_GAP resolved provenance", () => {
    const historical = `${validFitPd}

Originally identified at Product Definition Gate as ARCHITECTURE_FIT_AUTHORIZATION_GAP;
later resolved by locked capability architecture as pricing.manage @ Brand←Outlet.
`;
    assert.deepEqual(evaluateImp036fArchitectureFitProductDefinition(historical), { ok: true });
  });

  it("fails mutation mapping remains ARCHITECTURE_FIT_AUTHORIZATION_GAP until Fit", () => {
    const stale = `${validFitPd}

Classification: PLANNED_IMP036F; mutation mapping remains ARCHITECTURE_FIT_AUTHORIZATION_GAP until Fit
`;
    const result = evaluateImp036fArchitectureFitProductDefinition(stale);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_STALE_MUTATION_MAPPING_UNTIL_FIT");
  });

  it("preserves prior R116/S114, R117/S115 and R118/S116 checkpoint evaluators", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036fActivation"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R115", "imp036fProductDefinitionDraftAuthorized"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R116", "imp036fProductDefinitionGatePass"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R119", "STATE-R117", "imp036fArchitectureLock"), true);
  });
});

describe("IMP-036F Implementation Authorization checkpoints", () => {
  const authBase = {
    roadmapVersion: "GTM-R120",
    stateVersion: "STATE-R118",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "ARCHITECTURE_LOCKED",
    imp036fActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validAuthorizedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036F",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": true,
  "implementationStarted": false,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true
}
-->

# IMP-036F

IMP036F_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
ARCHITECTURE_REVIEWED_CANDIDATE_TREE = 55adb287bb0eb77240a6becdc16fed2d504ba144
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: NO
CANONICAL_ROADMAP_STATE = GTM-R120 / STATE-R118
`;

  const validAuthorizedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFit": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "NO"
}
-->

# IMP-036F Product Definition

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036F_ARCHITECTURE_LOCKED: YES
IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: NO
IMP036F_ACCEPTED: NO
IMP036G_ACTIVATED: NO
ARCHITECTURE_FIT_REVIEWED_CANDIDATE_HEAD = 9ae06d6267e997223b1995124540974215ee17fd
INDEPENDENT_ARCHITECTURE_REVIEW = 5169723968
CANONICAL_ANCHORS = GTM-R120 / STATE-R118
\`\`\`

## US-IMP-036F-009

Permission / resource context:
DELIVERY_TARIFF_AUTHORITY = PRICING
Architecture Fit status: RESOLVED / PASS / LOCKED
Readiness: READY — Architecture Fit PASS / architecture locked. Implementation authorization is granted at GTM-R120 / STATE-R118; implementation has not started.

## Dependencies

| Dependency | Authority | Required before | Unresolved impact |
|---|---|---|---|
| Architecture Fit | PD-1 phase | Before implementation readiness | PERFORMED / PASS — locked capability architecture |
| Implementation authorization | ROADMAP/STATE | Before coding | YES / PERFORMED / AUTHORIZED |

Originally identified Architecture Fit inputs (Product Definition Gate era; **resolved** by locked capability architecture):
1. \`ARCHITECTURE_FIT_AUTHORIZATION_GAP\` (delivery-tariff mutation permission/command mapping) → **resolved** as Pricing authority / Brand derived from Outlet; \`pricing.read\` / \`pricing.manage\`.
`;

  it("passes valid GTM-R120 / STATE-R118 authorization checkpoint", () => {
    assert.deepEqual(
      evaluateImp036fImplementationAuthorizationCheckpoint({
        ...authBase,
        productDefinitionText: validAuthorizedPd,
        capabilityText: validAuthorizedCapability,
      }),
      { ok: true },
    );
  });

  it("fails when implementation authorized is NO at R120/S118", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      implementationAuthorized: "NO",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when implementation started is YES", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      started: "YES",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when capability claims IMPLEMENTATION_IN_PROGRESS", () => {
    const result = evaluateImp036fAuthorizedCapabilityArchitecture(
      validAuthorizedCapability.replace(
        "IMPLEMENTATION_STARTED: NO",
        "IMPLEMENTATION_STARTED: NO\nIMP-036F: IMPLEMENTATION_IN_PROGRESS",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_PREMATURE_PROGRESSION");
  });

  it("fails when IMP-036F accepted is YES", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      accepted: "YES",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when IMP-036G activated is YES", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      imp036gActivated: "YES",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when Product Definition authorization remains NO", () => {
    const stalePd = validAuthorizedPd
      .replace(/"implementationAuthorized": "YES"/, '"implementationAuthorized": "NO"')
      .replace(/IMP036F_IMPLEMENTATION_AUTHORIZED: YES/, "IMP036F_IMPLEMENTATION_AUTHORIZED: NO");
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      productDefinitionText: stalePd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.code === "IMP036F_PD_IMPLEMENTATION_AUTHORIZED" ||
        result.code === "IMP036F_PD_STALE_UNAUTHORIZED",
    );
  });

  const staleCapabilityStatuses = [
    "implementation remains unauthorized",
    "implementation_authorized_for_any_story = NO",
    "MIGRATION_REQUIRED = YES (architecture conclusion only; not authorized now)",
    "Migration execution is not authorized now",
    "| Explicit implementation authorization | NOT AUTHORIZED (next human gate after merge/reconciliation) |",
    "| Explicit implementation authorization | Pending (next human gate) |",
    "Implementation authorization remains a separate future gate",
    "implementation pending authorization",
    "Implementation detail after implementation authorization",
    "| Story | Ready after future lock |",
    "stories_ready_after_future_lock = US-001…016",
    "PASS + lock still does **not** mean implementation authorization or acceptance.",
  ];

  for (const status of staleCapabilityStatuses) {
    it(`rejects current capability lifecycle prose: ${status}`, () => {
      const result = evaluateImp036fAuthorizedCapabilityArchitecture(
        `${validAuthorizedCapability}\n\n## Current story / migration / readiness status\n\n${status}`,
      );
      assert.equal(result.ok, false);
      assert.equal(result.code, "IMP036F_CAPABILITY_STALE_UNAUTHORIZED_PROSE");
    });

    it(`allows historical R119 capability provenance: ${status}`, () => {
      assert.deepEqual(
        evaluateImp036fAuthorizedCapabilityArchitecture(`${validAuthorizedCapability}

## 29. Architecture-lock persistence record (historical GTM-R119 / STATE-R117 provenance)

${status}
IMP036F_IMPLEMENTATION_AUTHORIZED = NO

## 30. Current implementation status

IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = NO`),
        { ok: true },
      );
    });
  }

  it("allows capability runtime denial and separately granted lifecycle authorization", () => {
    assert.deepEqual(
      evaluateImp036fAuthorizedCapabilityArchitecture(`${validAuthorizedCapability}

Runtime unauthorized actor / unauthorized user denied; unauthorized mutation denied;
server-side denial without authority. Migration rejects an unauthorized actor.

Architecture Fit PASS + lock alone did not authorize implementation;
separate authorization was subsequently granted at GTM-R120 / STATE-R118.
Explicit implementation start / execution authorization remains a separate later gate.`),
      { ok: true },
    );
  });

  it("does not let historical R119 provenance hide a later current capability contradiction", () => {
    const result = evaluateImp036fAuthorizedCapabilityArchitecture(`${validAuthorizedCapability}

## Historical pre-R120 architecture-lock provenance

implementation remains unauthorized

## Current story status

implementation_authorized_for_any_story = NO`);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_STALE_UNAUTHORIZED_PROSE");
  });

  const staleImplementationStatuses = [
    "implementation remains unauthorized",
    "Implementation conformance work NOT YET IMPLEMENTED / NOT AUTHORIZED",
    "Implementation conformance work remains NOT YET IMPLEMENTED / NOT AUTHORIZED",
    "Implementation conformance work NOT YET\nIMPLEMENTED / NOT AUTHORIZED",
    "implementation still unauthorized",
    "implementation pending authorization",
    "Not executed (implementation not authorized)",
  ];

  for (const status of staleImplementationStatuses) {
    it(`rejects current lifecycle prose: ${status}`, () => {
      const result = evaluateImp036fAuthorizedProductDefinition(
        `${validAuthorizedPd}\n\n| Current story / rule / evidence | ${status} |`,
      );
      assert.equal(result.ok, false);
      assert.equal(result.code, "IMP036F_PD_STALE_UNAUTHORIZED_PROSE");
    });

    it(`allows explicitly historical pre-R120 lifecycle prose: ${status}`, () => {
      assert.deepEqual(
        evaluateImp036fAuthorizedProductDefinition(
          `${validAuthorizedPd}\n\nHistorical pre-R120 lifecycle provenance: ${status}.`,
        ),
        { ok: true },
      );
    });
  }

  it("allows runtime authorization-denial product language", () => {
    assert.deepEqual(
      evaluateImp036fAuthorizedProductDefinition(`${validAuthorizedPd}

Error / recovery: unauthorized mutation denied; unauthorized actor;
server-side denial without authority; publish denied without domain authority.
Implementation must ensure unauthorized tariff mutation is denied.`),
      { ok: true },
    );
  });

  it("does not let historical or resolved Fit context exempt current lifecycle status", () => {
    for (const context of [
      "Historical pre-R120 lifecycle provenance: implementation remains unauthorized.\n\n",
      "Originally identified at Product Definition Gate; later resolved by locked architecture. ",
    ]) {
      const result = evaluateImp036fAuthorizedProductDefinition(
        `${validAuthorizedPd}\n\n${context}Implementation conformance work remains NOT YET IMPLEMENTED / NOT AUTHORIZED.`,
      );
      assert.equal(result.ok, false);
      assert.equal(result.code, "IMP036F_PD_STALE_UNAUTHORIZED_PROSE");
    }
  });

  it("fails when capability authorization remains false/NOT_AUTHORIZED", () => {
    const staleCap = validAuthorizedCapability
      .replace(/"implementationAuthorized": true/, '"implementationAuthorized": false')
      .replace(/"implementation": "AUTHORIZED \/ NOT_STARTED"/, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
      .replace(/IMPLEMENTATION_AUTHORIZED: YES/, "IMPLEMENTATION_AUTHORIZED: NO");
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      productDefinitionText: validAuthorizedPd,
      capabilityText: staleCap,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.code === "IMP036F_CAPABILITY_AUTHORIZATION" ||
        result.code === "IMP036F_CAPABILITY_STALE_UNAUTHORIZED",
    );
  });

  it("fails when Architecture Fit/lock regresses", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      architectureFit: "NOT_PERFORMED",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");

    const result2 = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      architectureLocked: "NO",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result2.ok, false);
    assert.equal(result2.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when ROADMAP/STATE versions mismatch", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      roadmapVersion: "GTM-R119",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");

    const result2 = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      stateVersion: "STATE-R117",
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result2.ok, false);
    assert.equal(result2.code, "IMP036F_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when D-374 is created", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      d374Exists: true,
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_D374");
  });

  it("fails when ARCH-R20 is created", () => {
    const result = evaluateImp036fImplementationAuthorizationCheckpoint({
      ...authBase,
      archR20Exists: true,
      productDefinitionText: validAuthorizedPd,
      capabilityText: validAuthorizedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_ARCH_R20");
  });

  it("preserves prior R116/S114, R117/S115, R118/S116 and R119/S117 checkpoints", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R116", "STATE-R114", "imp036fActivation"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R117", "STATE-R115", "imp036fProductDefinitionDraftAuthorized"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R118", "STATE-R116", "imp036fProductDefinitionGatePass"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R119", "STATE-R117", "imp036fArchitectureLock"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R120", "STATE-R118", "imp036fImplementationAuthorization"),
      true,
    );
  });
});

describe("IMP-036F Implementation Start checkpoints", () => {
  const startBase = {
    roadmapVersion: "GTM-R121",
    stateVersion: "STATE-R119",
    acceptedThrough: "IMP-036E",
    currentProductSlice: "IMP-036F",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-036F",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036fFormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp036fActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    accepted: "NO",
    founderUatRequired: "YES",
    imp036gActivated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validStartedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036F",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "AUTHORIZED / STARTED",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true
}
-->

# IMP-036F

IMP036F_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: YES
CANONICAL_ROADMAP_STATE = GTM-R121 / STATE-R119
`;

  const validStartedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFit": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES"
}
-->

# IMP-036F Product Definition

IMP036F_IMPLEMENTATION_AUTHORIZED: YES
IMP036F_STARTED: YES
Canonical anchors GTM-R121 / STATE-R119
`;

  it("passes valid GTM-R121 / STATE-R119 start checkpoint", () => {
    assert.deepEqual(
      evaluateImp036fImplementationStartCheckpoint({
        ...startBase,
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }),
      { ok: true },
    );
  });

  it("fails when started is NO at R121/S119", () => {
    const result = evaluateImp036fImplementationStartCheckpoint({
      ...startBase,
      started: "NO",
      productDefinitionText: validStartedPd,
      capabilityText: validStartedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_START");
  });

  it("fails when formal lifecycle is not IMPLEMENTATION_IN_PROGRESS", () => {
    const result = evaluateImp036fImplementationStartCheckpoint({
      ...startBase,
      imp036fFormalLifecycle: "ARCHITECTURE_LOCKED",
      productDefinitionText: validStartedPd,
      capabilityText: validStartedCapability,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMPLEMENTATION_START");
  });

  it("fails when capability remains NOT_STARTED", () => {
    const result = evaluateImp036fStartedCapabilityArchitecture(
      validStartedCapability
        .replace('"implementation": "AUTHORIZED / STARTED"', '"implementation": "AUTHORIZED / NOT_STARTED"')
        .replace('"implementationStarted": true', '"implementationStarted": false')
        .replace("IMPLEMENTATION_STARTED: YES", "IMPLEMENTATION_STARTED: NO"),
    );
    assert.equal(result.ok, false);
  });

  it("fails when Product Definition implementationStarted is NO", () => {
    const result = evaluateImp036fStartedProductDefinition(
      validStartedPd.replace('"implementationStarted": "YES"', '"implementationStarted": "NO"'),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_START");
  });

  it("fails when capability end matter retains IMP036F_STARTED NO", () => {
    const result = evaluateImp036fStartedCapabilityArchitecture(
      `${validStartedCapability}
## End matter
IMP036F_STARTED: NO
NEXT_GATE = Independent review of Implementation Authorization / GTM-R120 / STATE-R118 persistence
`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_START_STALE");
  });

  it("fails when capability CURRENT body claims implementation has not started", () => {
    const result = evaluateImp036fStartedCapabilityArchitecture(
      validStartedCapability.replace(
        "IMPLEMENTATION_STARTED: YES",
        "IMPLEMENTATION_STARTED: YES\nimplementation has not started.",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_START_STALE");
  });

  it("allows historical GTM-R120 authorization-only NOT_STARTED provenance", () => {
    const result = evaluateImp036fStartedCapabilityArchitecture(
      `${validStartedCapability}
Historical pre-R121 lifecycle provenance: implementation authorization was recorded at
GTM-R120 / STATE-R118 with IMPLEMENTATION_STARTED = NO / AUTHORIZED / NOT_STARTED.
`,
    );
    assert.equal(result.ok, true);
  });

  it("fails when Product Definition gate section retains IMP036F_STARTED NO", () => {
    const result = evaluateImp036fStartedProductDefinition(
      `${validStartedPd}
IMP036F_STARTED: NO
Next gate after canonical merge/reconciliation: explicit implementation start / execution authorization
`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_START_STALE");
  });

  it("preserves prior R120/S118 authorization checkpoint", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R120", "STATE-R118", "imp036fImplementationAuthorization"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R121", "STATE-R119", "imp036fImplementationStart"),
      true,
    );
  });
});


describe("IMP-036F Acceptance checkpoints", () => {
  const acceptanceBase = {
    roadmapVersion: "GTM-R122",
    stateVersion: "STATE-R120",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-036G",
    pendingAcceptance: "NONE",
    imp036e: "COMPLETE_AND_ACCEPTED",
    imp036f: "COMPLETE_AND_ACCEPTED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    artifact: true,
    founderUatPass: true,
    d374Exists: false,
    archR20Exists: false,
    imp036gActivated: false,
  };

  const acceptedCapabilityStub = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036F",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "impAccepted": true
}
-->

# IMP-036F

## End matter

\`\`\`text
IMP-036F: COMPLETE_AND_ACCEPTED
IMP036F_ACCEPTED: YES
IMP036F_FOUNDER_UAT: PASS
IMP036F_FORMAL_ACCEPTANCE: ACCEPTED
IMP036F_ACCEPTED_MAIN_SHA: 91d0b5e5e5815da6bf0bb325a3c6ab884dc06652
IMP036F_ACCEPTED_TREE: ab41fc7f2bf6d0a52c3ea6c2b69ed331ca9540cf
IMP036F_FOUNDER_UAT_CANDIDATE_FINGERPRINT: c689630cb9a4d002fda3376f949a1f324015776d392abfd2abde7b6f5b91f973
IMP036F_FOUNDER_UAT_DECISION_DATE: 2026-09-15
IMP036F_FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
IMP036G_ACTIVATED: NO
CANONICAL_ROADMAP_STATE: GTM-R122 / STATE-R120
\`\`\`
`;

  const acceptedPdStub = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036F",
  "productDefinitionVersion": "PD-IMP-036F-DRAFT-1",
  "impAccepted": "YES",
  "imp036gActivated": "NO"
}
-->

# IMP-036F Product Definition

CURRENT (GTM-R122 / STATE-R120): IMP-036F is COMPLETE_AND_ACCEPTED.
IMP036F_ACCEPTED: YES
IMP036G_ACTIVATED: NO
`;

  it("passes valid GTM-R122 / STATE-R120 acceptance checkpoint", () => {
    assert.equal(evaluateImp036fAcceptanceCheckpoint(acceptanceBase).ok, true);
  });

  it("fails when IMP-036G is activated", () => {
    const result = evaluateImp036fAcceptanceCheckpoint({ ...acceptanceBase, imp036gActivated: true });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_IMP036G_ACTIVATION");
  });

  it("fails when currentProductSlice is not NONE", () => {
    const result = evaluateImp036fAcceptanceCheckpoint({
      ...acceptanceBase,
      currentProductSlice: "IMP-036F",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_ACCEPTANCE");
  });

  it("recognizes GTM-R122 / STATE-R120 as imp036fAcceptance not start", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036fAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036fImplementationStart"),
      false,
    );
  });

  it("validates live accepted capability and product definition authorities", () => {
    const capabilityText = readFileSync(
      "docs/platform/capabilities/IMP-036F-catalog-menu-pricing-promotions-management.md",
      "utf8",
    );
    const productDefinitionText = readFileSync(
      "docs/platform/product/IMP-036F/product-definition.md",
      "utf8",
    );
    assert.deepEqual(evaluateImp036fAcceptanceArtifact(capabilityText), { ok: true });
    assert.deepEqual(evaluateImp036fAcceptedProductDefinition(productDefinitionText), { ok: true });
  });

  it("rejects CURRENT F1 in progress claims", () => {
    const result = evaluateImp036fAcceptanceArtifact(
      `${acceptedCapabilityStub}\n\n## Current readiness\n\nF1 is in progress.\n`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_ACCEPTED_STALE_PROSE");
  });

  it("rejects CURRENT unaccepted claims", () => {
    const result = evaluateImp036fAcceptanceArtifact(
      `${acceptedCapabilityStub}\n\n## Current readiness\n\nIMP-036F remains unaccepted.\n`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_CAPABILITY_ACCEPTED_STALE_PROSE");
  });

  it("rejects CURRENT not-yet-implemented conformance claims", () => {
    const result = evaluateImp036fAcceptedProductDefinition(
      `${acceptedPdStub}\n\nImplementation conformance work NOT YET IMPLEMENTED — AUTHORIZED / STARTED.\n`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_ACCEPTED_STALE_PROSE");
  });

  it("rejects stale Not executed acceptance evidence rows", () => {
    const result = evaluateImp036fAcceptedProductDefinition(
      `${acceptedPdStub}\n\n| US-001 | Planned after implementation execution | Not executed |\n`,
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_ACCEPTED_STALE_PROSE");
  });

  it("rejects Founder UAT later as CURRENT evidence planning", () => {
    const result = evaluateImp036fAcceptedCurrentAuthorityProse(
      "Planned; Founder UAT later",
      "product-definition",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036F_PD_ACCEPTED_STALE_PROSE");
  });

  it("allows explicitly historical equivalent wording", () => {
    assert.deepEqual(
      evaluateImp036fAcceptedCurrentAuthorityProse(
        `Historical GTM-R121 / STATE-R119 state: F1 was in progress.

CURRENT (GTM-R122 / STATE-R120): IMP-036F is COMPLETE_AND_ACCEPTED.`,
        "capability",
      ),
      { ok: true },
    );
    assert.deepEqual(
      evaluateImp036fAcceptedProductDefinition(`${acceptedPdStub}

## 3. Problem statement (Pre-IMP-036F baseline)

Pre-IMP-036F baseline: coherent commercial UX was missing.
Implementation conformance work NOT YET IMPLEMENTED at Fit time.
F1 in progress at that checkpoint.
Not executed before implementation.
Founder UAT later was the planned gate.

## 26. Definition of Ready

CURRENT (GTM-R122 / STATE-R120): COMPLETE_AND_ACCEPTED.
`),
      { ok: true },
    );
  });
});

describe("IMP-036G Acceptance checkpoints", () => {
  const acceptanceBase = {
    roadmapVersion: "GTM-R130",
    stateVersion: "STATE-R128",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036g: "COMPLETE_AND_ACCEPTED",
    architecture: "LOCKED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    artifact: true,
    founderUatPass: true,
    d374Exists: false,
    archR20Exists: false,
    imp037Activated: false,
  };

  const acceptedCapabilityStub = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036G",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "impAccepted": true
}
-->

# IMP-036G

## End matter

\`\`\`text
IMP-036G: COMPLETE_AND_ACCEPTED
IMP036G_ACCEPTED: YES
IMP036G_FOUNDER_UAT: PASS
IMP036G_FORMAL_ACCEPTANCE: ACCEPTED
IMP036G_ACCEPTED_MAIN_SHA: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e
IMP036G_ACCEPTED_TREE: 84b6a502fcec646cb5a65f3257f19b85c64f49e1
IMP036G_FOUNDER_UAT_CANDIDATE_FINGERPRINT: 9f472ce6e1ccaa2fe914006c846fb3018d668b718f569b6d0cb4fa64c3013f9b
IMP036G_FOUNDER_UAT_DECISION_DATE: 2026-09-18
IMP036G_FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
IMP037_ACTIVATED: NO
CANONICAL_ROADMAP_STATE: GTM-R130 / STATE-R128
\`\`\`
`;

  const acceptedPdStub = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036G",
  "productDefinitionVersion": "PD-IMP-036G-DRAFT-2",
  "impAccepted": "YES",
  "imp037Activated": "NO"
}
-->

# IMP-036G Product Definition

| Canonical anchors | VISION-1; ROADMAP GTM-R130; STATE STATE-R128; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |

CURRENT (GTM-R130 / STATE-R128): IMP-036G is COMPLETE_AND_ACCEPTED.
IMP036G_ACCEPTED: YES
IMP037_ACTIVATED: NO

\`\`\`text
CANONICAL_ANCHORS = VISION-1; GTM-R130; STATE-R128; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1
IMPLEMENTATION_COMPLETE_RECORDED_AT = GTM-R129 / STATE-R127
\`\`\`
`;

  it("passes valid GTM-R130 / STATE-R128 acceptance checkpoint", () => {
    assert.equal(evaluateImp036gAcceptanceCheckpoint(acceptanceBase).ok, true);
  });

  it("fails when IMP-037 is activated", () => {
    const result = evaluateImp036gAcceptanceCheckpoint({ ...acceptanceBase, imp037Activated: true });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_IMP037_ACTIVATION");
  });

  it("fails when currentProductSlice is not NONE", () => {
    const result = evaluateImp036gAcceptanceCheckpoint({
      ...acceptanceBase,
      currentProductSlice: "IMP-036G",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_ACCEPTANCE");
  });

  it("recognizes GTM-R130 / STATE-R128 as imp036gAcceptance not completion", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R130", "STATE-R128", "imp036gAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R130", "STATE-R128", "imp036gCompletion"),
      false,
    );
  });

  it("validates live accepted capability and product definition authorities", () => {
    const capabilityText = readFileSync(
      "docs/platform/capabilities/IMP-036G-administration-console-v2.md",
      "utf8",
    );
    const productDefinitionText = readFileSync(
      "docs/platform/product/IMP-036G/product-definition.md",
      "utf8",
    );
    assert.deepEqual(evaluateImp036gAcceptanceArtifact(capabilityText), { ok: true });
    assert.deepEqual(evaluateImp036gAcceptedProductDefinition(productDefinitionText), { ok: true });
  });

  it("rejects CURRENT IMP036G_ACCEPTED NO", () => {
    const result = evaluateImp036gAcceptedCurrentAuthorityProse(
      "IMP036G_ACCEPTED: NO\n",
      "capability",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_CAPABILITY_ACCEPTED_STALE_PROSE");
  });

  it("rejects CURRENT UAT NOT_PERFORMED", () => {
    const result = evaluateImp036gAcceptedCurrentAuthorityProse(
      "IMP036G_FOUNDER_UAT: NOT_PERFORMED\n",
      "product-definition",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_ACCEPTED_STALE_PROSE");
  });

  it("rejects CURRENT pending-acceptance language", () => {
    const result = evaluateImp036gAcceptedCurrentAuthorityProse(
      "Lifecycle is IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.\n",
      "capability",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_CAPABILITY_ACCEPTED_STALE_PROSE");
  });

  it("rejects CURRENT current-slice language", () => {
    const result = evaluateImp036gAcceptedCurrentAuthorityProse(
      "currentProductSlice = IMP-036G\npendingAcceptance = IMP-036G\n",
      "capability",
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_CAPABILITY_ACCEPTED_STALE_PROSE");
  });

  it("rejects missing exact accepted candidate provenance", () => {
    const result = evaluateImp036gAcceptanceArtifact(
      acceptedCapabilityStub.replace(
        "IMP036G_ACCEPTED_MAIN_SHA: fbf690a67cda51bd6bbc1bad4a9d26f574c4286e",
        "IMP036G_ACCEPTED_MAIN_SHA: deadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_CAPABILITY_ACCEPTANCE");
  });

  it("allows explicitly historical equivalent wording", () => {
    assert.deepEqual(
      evaluateImp036gAcceptedCurrentAuthorityProse(
        `Historical GTM-R129 / STATE-R127 state: IMP036G_ACCEPTED: NO; IMP036G_FOUNDER_UAT: NOT_PERFORMED; IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE.

CURRENT (GTM-R130 / STATE-R128): IMP-036G is COMPLETE_AND_ACCEPTED.`,
        "capability",
      ),
      { ok: true },
    );
    assert.deepEqual(
      evaluateImp036gAcceptedProductDefinition(`${acceptedPdStub}

## Historical pre-acceptance baseline

Historical GTM-R129 / STATE-R127: Founder UAT remains a separate later interactive human gate.
IMP036G_ACCEPTED: NO
currentProductSlice = IMP-036G

## 26. Definition of Ready

CURRENT (GTM-R130 / STATE-R128): COMPLETE_AND_ACCEPTED.
`),
      { ok: true },
    );
  });

  it("requires IMPLEMENTATION_COMPLETE_RECORDED_AT at GTM-R129 / STATE-R127", () => {
    const live = readFileSync("docs/platform/product/IMP-036G/product-definition.md", "utf8");
    assert.deepEqual(evaluateImp036gAcceptedProductDefinitionPhaseProvenance(live), { ok: true });
    assert.match(live, /IMPLEMENTATION_COMPLETE_RECORDED_AT\s*=\s*GTM-R129\s*\/\s*STATE-R127/);
  });

  it("rejects IMPLEMENTATION_COMPLETE_RECORDED_AT at GTM-R130 / STATE-R128", () => {
    const result = evaluateImp036gAcceptedProductDefinition(
      acceptedPdStub.replace(
        "IMPLEMENTATION_COMPLETE_RECORDED_AT = GTM-R129 / STATE-R127",
        "IMPLEMENTATION_COMPLETE_RECORDED_AT = GTM-R130 / STATE-R128",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_IMPLEMENTATION_COMPLETE_PROVENANCE");
  });

  it("rejects CURRENT prose claiming implementation completion at acceptance checkpoint", () => {
    const result = evaluateImp036gAcceptedProductDefinitionPhaseProvenance(`${acceptedPdStub}

Implementation completion is recorded at GTM-R130 / STATE-R128 and is not formal acceptance.
`);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_IMPLEMENTATION_COMPLETE_PROVENANCE");
  });

  it("rejects AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128", () => {
    const result = evaluateImp036gAcceptedProductDefinitionPhaseProvenance(`${acceptedPdStub}

Readiness: COMPLETE_AND_ACCEPTED (implementation AUTHORIZED / STARTED / COMPLETE at GTM-R130 / STATE-R128)
`);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_IMPLEMENTATION_COMPLETE_PROVENANCE");
  });

  it("allows clearly labelled historical R129/S127 predecessor completion prose", () => {
    assert.deepEqual(
      evaluateImp036gAcceptedProductDefinition(`${acceptedPdStub}

## Historical pre-acceptance baseline

Historical GTM-R129 / STATE-R127: IMPLEMENTATION_COMPLETE_RECORDED_AT = GTM-R129 / STATE-R127;
implementation AUTHORIZED / STARTED / COMPLETE at GTM-R129 / STATE-R127 pending formal acceptance.
`),
      { ok: true },
    );
  });
});

describe("IMP-040 PRE-GATE Product Definition authority at GTM-R132 / STATE-R130", () => {
  const preGateStub = `# IMP-040 Product Definition

Document status: PRE-GATE DRAFT
PRE-GATE DRAFT: YES
IMP040_ACTIVATED: NO

| Canonical anchors | VISION-1; ROADMAP GTM-R132; STATE STATE-R130; ARCH-R19 |

## 2. Authority and provenance

| Source | Role | Classification |
|---|---|---|
| docs/platform/ROADMAP.md GTM-R132 | IMP-040 identity; gtmBoundary; PLANNED | VERIFIED |
| docs/platform/STATE.md STATE-R130 | acceptedThrough IMP-036G; currentProductSlice IMP-037 | VERIFIED |
`;

  it("validates live IMP-040 PRE-GATE authority sources", () => {
    const live = readFileSync("docs/platform/product/IMP-040/product-definition.md", "utf8");
    assert.deepEqual(evaluateImp040PreGateProductDefinitionAuthority(live), { ok: true });
    assert.match(live, /docs\/platform\/ROADMAP\.md`? GTM-R132/);
    assert.doesNotMatch(live, /docs\/platform\/ROADMAP\.md`? GTM-R131/);
  });

  it("passes aligned PRE-GATE stub", () => {
    assert.deepEqual(evaluateImp040PreGateProductDefinitionAuthority(preGateStub), { ok: true });
  });

  it("rejects stale verified ROADMAP GTM-R131 when CURRENT is GTM-R132", () => {
    const result = evaluateImp040PreGateProductDefinitionAuthority(
      preGateStub.replace(
        "docs/platform/ROADMAP.md GTM-R132",
        "docs/platform/ROADMAP.md GTM-R131",
      ),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP040_PD_STALE_ROADMAP_AUTHORITY");
  });

  it("rejects missing STATE-R130 verified authority", () => {
    const result = evaluateImp040PreGateProductDefinitionAuthority(
      preGateStub.replace("docs/platform/STATE.md STATE-R130", "docs/platform/STATE.md STATE-R129"),
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP040_PD_AUTHORITY");
  });
});

describe("IMP-037 product-slice activation checkpoints", () => {
  const activationBase = {
    roadmapVersion: "GTM-R131",
    stateVersion: "STATE-R129",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "PLANNED",
    imp037Activated: "YES",
    productDefinition: "PRE_GATE_DRAFT",
    productDefinitionGate: "NOT_PERFORMED",
    architectureFit: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    productDefinitionApproved: false,
    productDefinitionGatePass: false,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
  };

  it("preserves GTM-R131 / STATE-R129 activation distinct from later gates", () => {
    assert.deepEqual(evaluateImp037ActivationCheckpoint(activationBase), { ok: true });
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, productDefinitionExists: false }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, productDefinitionApproved: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, productDefinitionGatePass: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, architectureLockedYes: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, implementationAuthorizedYes: true }).ok,
      false,
    );
    assert.equal(evaluateImp037ActivationCheckpoint({ ...activationBase, startedYes: true }).ok, false);
    assert.equal(evaluateImp037ActivationCheckpoint({ ...activationBase, acceptedYes: true }).ok, false);
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, currentProductSlice: "NONE" }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, nextProductSlice: "IMP-037" }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, imp037Activated: "NO" }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, imp038Activated: "YES" }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, imp038ActivatedYes: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ActivationCheckpoint({ ...activationBase, productDefinition: "NOT_CREATED" }).ok,
      false,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R131", "STATE-R129", "imp037Activation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R132", "STATE-R130", "imp037ProductDefinitionGatePass"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R131", "STATE-R129", "imp037ProductDefinitionGatePass"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R132", "STATE-R130", "imp037Activation"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R130", "STATE-R128", "imp036gAcceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R131", "STATE-R129", "imp036gAcceptance"), false);
  });
});

describe("IMP-037 Product Definition Gate PASS checkpoints", () => {
  const gatePassBase = {
    roadmapVersion: "GTM-R132",
    stateVersion: "STATE-R130",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "PLANNED",
    imp037Activated: "YES",
    productDefinition: "APPROVED",
    productDefinitionVersion: "PD-IMP-037-DRAFT-1",
    productDecisions: "RESOLVED",
    productDecisionCount: 7,
    productDefinitionGate: "PASS",
    architectureFit: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    architectureFitPass: false,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
  };

  const validApproved = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-037",
  "productDefinitionVersion": "PD-IMP-037-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-19",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp037Activated": "YES",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "preGateDraft": "NO"
}
-->
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-037-DRAFT-1
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
GATE_EVALUATED_HEAD = fccdf7ef606ca906bcdcd706a6de97f693bb88b4
GATE_EVALUATED_TREE = 1477d12b5c5b3b0ccb8d488757516d5b6e637674
GATE_EVALUATED_PRODUCT_DEFINITION_BLOB = eb792d02dbfede862a0bb104a754d14d875141aa
GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19
Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit NOT_PERFORMED; architecture not locked; implementation not authorized)

## 21. Dependencies
| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| Product Definition Gate | PASS / SATISFIED | Satisfied before Architecture Fit | NONE — gate complete; Architecture Fit remains required before architecture lock / implementation authorization |
| Architecture Fit | NOT_PERFORMED | required before architecture lock / implementation authorization | Product Definition Gate PASS / SATISFIED |
`;

  it("passes valid GTM-R132 / STATE-R130 Gate PASS checkpoint", () => {
    const result = evaluateImp037ProductDefinitionGatePassCheckpoint({
      ...gatePassBase,
      productDefinitionText: validApproved,
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(evaluateImp037ApprovedProductDefinitionCandidate(validApproved), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R132", "STATE-R130", "imp037ProductDefinitionGatePass"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R131", "STATE-R129", "imp037ProductDefinitionGatePass"), false);
  });

  it("requires APPROVED Product Definition with PERFORMED/PASS and preGateDraft NO", () => {
    const live = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    // Live tip advances to GTM-R138 / STATE-R136 controlled continuation; until then post-merge tip remains valid.
    if (/"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap)) {
      assert.deepEqual(evaluateImp037ContinuationProductDefinition(live), { ok: true });
    } else {
      assert.deepEqual(evaluateImp037PostMergedProductDefinition(live), { ok: true });
    }
    assert.match(live, /Document status:\s*APPROVED/);
    assert.match(live, /PRODUCT_DEFINITION_GATE_EXECUTION:\s*PERFORMED/);
    assert.match(live, /Gate Result:\s*PASS/);
    assert.match(live, /"preGateDraft":\s*"NO"/);
    assert.match(live, /GATE_EVALUATED_HEAD\s*[=:]\s*fccdf7ef606ca906bcdcd706a6de97f693bb88b4/);
    assert.match(live, /GATE_EVALUATED_TREE\s*[=:]\s*1477d12b5c5b3b0ccb8d488757516d5b6e637674/);
    assert.match(live, /GATE_EVALUATED_PRODUCT_DEFINITION_BLOB\s*[=:]\s*eb792d02dbfede862a0bb104a754d14d875141aa/);
    assert.match(live, /GATE_EVALUATED_WORKING_TREE_FINGERPRINT\s*[=:]\s*9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19/);
  });

  it("requires story readiness to reflect Gate PASS", () => {
    const result = evaluateImp037ApprovedProductDefinitionCandidate(validApproved);
    assert.deepEqual(result, { ok: true });
    assert.match(
      validApproved,
      /Readiness:\s*NOT_READY_FOR_IMPLEMENTATION\s*\(Product Definition Gate PASS; Architecture Fit NOT_PERFORMED/,
    );
  });

  it("rejects stale Product Definition Gate NOT_PERFORMED in story readiness", () => {
    const bad = `${validApproved}\nReadiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED)\n`;
    const result = evaluateImp037ApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_STORY_READINESS_GATE");
  });

  it("rejects stale READY for gate evaluation", () => {
    const bad = `${validApproved}\nReadiness: READY for Product Definition Gate evaluation (gate NOT_PERFORMED)\n`;
    const result = evaluateImp037ApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_STORY_READINESS_GATE_READY");
  });

  it("rejects stale CURRENT PRE-GATE status", () => {
    const bad = validApproved.replace("Document status: APPROVED", "Document status: PRE-GATE DRAFT").replace(
      "PRE-GATE DRAFT: NO",
      "PRE-GATE DRAFT: YES",
    );
    const result = evaluateImp037ApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_PRE_GATE");
  });

  it("rejects productDefinitionGateExecution NOT_PERFORMED", () => {
    const bad = validApproved.replace(
      '"productDefinitionGateExecution": "PERFORMED"',
      '"productDefinitionGateExecution": "NOT_PERFORMED"',
    );
    const result = evaluateImp037ApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_META_VALUE");
  });

  it("rejects Gate Result NOT_PERFORMED", () => {
    const bad = validApproved.replace("Gate Result: PASS", "Gate Result: NOT_PERFORMED").replace(
      '"productDefinitionGateResult": "PASS"',
      '"productDefinitionGateResult": "NOT_PERFORMED"',
    );
    const result = evaluateImp037ApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
  });

  it("rejects Architecture Fit PASS / architecture locked YES / implementation authorized YES / started YES / accepted YES / IMP038 activated YES", () => {
    assert.equal(
      evaluateImp037ApprovedProductDefinitionCandidate(`${validApproved}\nARCHITECTURE_FIT: PASS\n`).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        architectureFitPass: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        architectureLockedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        implementationAuthorizedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        startedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        acceptedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp037ProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        imp038ActivatedYes: true,
      }).ok,
      false,
    );
  });

  it("allows clearly labelled historical pre-gate provenance", () => {
    const historical = `${validApproved}

Historical pre-gate provenance: Document status PRE-GATE DRAFT; Product Definition Gate NOT_PERFORMED; READY for Product Definition Gate evaluation; candidate subject to pre-gate review.
`;
    assert.deepEqual(evaluateImp037ApprovedProductDefinitionCandidate(historical), { ok: true });
  });

  it("requires gate evaluated head/tree/blob/fingerprint provenance", () => {
    const missingFingerprint = validApproved.replace(
      "GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19\n",
      "",
    );
    const result = evaluateImp037ApprovedProductDefinitionCandidate(missingFingerprint);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_GATE_EVALUATED_FINGERPRINT");
  });
});

describe("IMP-037 Product Definition activation provenance pairing", () => {
  const preActivationHead = "6b1f2344d0184e29403b99adfea85c2e5dc8bf9a";
  const preActivationTree = "5471ea8f72c635a365e9a78ea1394ec212dcad69";
  const gateEvaluatedHead = "fccdf7ef606ca906bcdcd706a6de97f693bb88b4";
  const gateEvaluatedTree = "1477d12b5c5b3b0ccb8d488757516d5b6e637674";
  const correctPairing = `Historical pre-activation base: GTM-R130 / STATE-R128 (\`${preActivationHead}\` / tree \`${preActivationTree}\`). Activation result: GTM-R131 / STATE-R129. Later merged activated main / Product Definition gate-evaluated candidate: \`${gateEvaluatedHead}\` / tree \`${gateEvaluatedTree}\`.`;
  const incorrectPairing = `Historical activation base GTM-R131 / STATE-R129 (\`${preActivationHead}\` / tree \`${preActivationTree}\`) remains predecessor provenance.`;

  it("passes correct pre-activation base pairing GTM-R130 / STATE-R128", () => {
    assert.deepEqual(evaluateImp037ProductDefinitionActivationProvenance(correctPairing), { ok: true });
    assert.deepEqual(
      evaluateImp037ProductDefinitionActivationProvenance(
        `Historical pre-activation base: GTM-R130 / STATE-R128 (\`${preActivationHead}\` / tree \`${preActivationTree}\`).`,
      ),
      { ok: true },
    );
  });

  it("rejects 6b1f2344 labelled GTM-R131 / STATE-R129", () => {
    const result = evaluateImp037ProductDefinitionActivationProvenance(incorrectPairing);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_PRE_ACTIVATION_SHA_VERSION");
  });

  it("distinguishes GTM-R131 / STATE-R129 as activation result, not the pre-activation SHA", () => {
    const result = evaluateImp037ProductDefinitionActivationProvenance(correctPairing);
    assert.deepEqual(result, { ok: true });
    assert.match(correctPairing, /Activation result:\s*GTM-R131\s*\/\s*STATE-R129/);
    assert.doesNotMatch(
      correctPairing,
      /GTM-R131\s*\/\s*STATE-R129[^\n.]{0,80}6b1f2344d0184e29403b99adfea85c2e5dc8bf9a/,
    );
  });

  it("keeps gate-evaluated fccdf7ef identity unchanged when provenance is recorded", () => {
    const live = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    assert.match(live, /GATE_EVALUATED_HEAD\s*[=:]\s*fccdf7ef606ca906bcdcd706a6de97f693bb88b4/);
    assert.match(live, /GATE_EVALUATED_TREE\s*[=:]\s*1477d12b5c5b3b0ccb8d488757516d5b6e637674/);
    assert.match(live, /GATE_EVALUATED_PRODUCT_DEFINITION_BLOB\s*[=:]\s*eb792d02dbfede862a0bb104a754d14d875141aa/);
    assert.match(live, /GATE_EVALUATED_WORKING_TREE_FINGERPRINT\s*[=:]\s*9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19/);
    const approved = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-037",
  "productDefinitionVersion": "PD-IMP-037-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp037Activated": "YES",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "preGateDraft": "NO"
}
-->
Document status: APPROVED
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT: NOT_PERFORMED
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP037_ACCEPTED: NO
GATE_EVALUATED_HEAD = fccdf7ef606ca906bcdcd706a6de97f693bb88b4
GATE_EVALUATED_TREE = 1477d12b5c5b3b0ccb8d488757516d5b6e637674
GATE_EVALUATED_PRODUCT_DEFINITION_BLOB = eb792d02dbfede862a0bb104a754d14d875141aa
GATE_EVALUATED_WORKING_TREE_FINGERPRINT = 9be2a43fe3881ccd28f169f60209cef3c78c991524e5e9d34a8b657e1b1f0c19
Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit NOT_PERFORMED; architecture not locked; implementation not authorized)
${correctPairing}
`;
    assert.deepEqual(evaluateImp037ApprovedProductDefinitionCandidate(approved), { ok: true });
    assert.equal(evaluateImp037ApprovedProductDefinitionCandidate(`${approved}\n${incorrectPairing}`).ok, false);
  });

  it("requires live IMP-037 Product Definition to record the corrected lineage", () => {
    const live = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    assert.deepEqual(evaluateImp037ProductDefinitionActivationProvenance(live), { ok: true });
    if (/"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap)) {
      assert.deepEqual(evaluateImp037ContinuationProductDefinition(live), { ok: true });
    } else {
      assert.deepEqual(evaluateImp037PostMergedProductDefinition(live), { ok: true });
    }
    assert.match(
      live,
      /Historical pre-activation base:\s*GTM-R130\s*\/\s*STATE-R128\s*\(`6b1f2344d0184e29403b99adfea85c2e5dc8bf9a`\s*\/\s*tree\s*`5471ea8f72c635a365e9a78ea1394ec212dcad69`\)/,
    );
    assert.match(live, /Activation result:\s*GTM-R131\s*\/\s*STATE-R129/);
    assert.doesNotMatch(
      live,
      /GTM-R131\s*\/\s*STATE-R129[^\n.]{0,80}6b1f2344d0184e29403b99adfea85c2e5dc8bf9a/,
    );
    assert.match(live, /GATE_EVALUATED_HEAD\s*[=:]\s*fccdf7ef606ca906bcdcd706a6de97f693bb88b4/);
    assert.match(live, /ARCHITECTURE_FIT:\s*PASS/);
    assert.match(live, /IMPLEMENTATION_AUTHORIZED:\s*YES/);
  });
});

describe("D-374 cost-optimized pilot infrastructure checkpoint", () => {
  const base = Object.freeze({
    roadmapVersion: "GTM-R133",
    stateVersion: "STATE-R131",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    d374Created: "YES",
    archR20Created: "YES",
    d374Exists: true,
    d374Current: true,
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    adr016Exists: true,
    nextFreeDecisionId: "D-375",
    pilotComputeSingleDroplet: true,
    dockerCompose: true,
    selfHostedPostgresql18: true,
    spacesOffHostBackups: true,
    k3s: "NO",
    kubernetes: "NO",
    appPlatformPilotProduction: "NO",
    managedPostgresqlPilotProduction: "NO",
    architectureFit: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    imp038Activated: "NO",
    architectureFitReopenReasonMentionsD374ArchR20: true,
    architectureFitPass: false,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    imp038ActivatedYes: false,
    appPlatformCurrentPilotAuthority: false,
    managedPostgresqlCurrentPilotAuthority: false,
    k3sCurrentPilotAuthority: false,
    managedPitrSatisfiesImp037: false,
  });

  it("passes valid GTM-R133 / STATE-R131 D-374 checkpoint", () => {
    assert.deepEqual(evaluateD374CostOptimizedPilotInfrastructureCheckpoint(base), { ok: true });
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R133", "STATE-R131", "d374CostOptimizedPilotInfrastructure"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R132", "STATE-R130", "d374CostOptimizedPilotInfrastructure"),
      false,
    );
  });

  it("requires D-374 CURRENT + DR-16 / ARCH-R20 pairing", () => {
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, d374Current: false }).ok,
      false,
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, architectureVersion: "ARCH-R19" }).ok,
      false,
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, decisionRegisterVersion: "DR-15" }).ok,
      false,
    );
  });

  it("requires single-Droplet + Docker Compose + self-hosted PostgreSQL + Spaces", () => {
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, pilotComputeSingleDroplet: false }).ok,
      false,
    );
    assert.equal(evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, dockerCompose: false }).ok, false);
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, selfHostedPostgresql18: false }).ok,
      false,
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, spacesOffHostBackups: false }).ok,
      false,
    );
  });

  it("rejects managed PostgreSQL / App Platform / k3s as CURRENT pilot authority", () => {
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({
        ...base,
        managedPostgresqlPilotProduction: "YES",
      }).ok,
      false,
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, appPlatformPilotProduction: "YES" }).ok,
      false,
    );
    assert.equal(evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, k3s: "YES" }).ok, false);
    assert.equal(evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, kubernetes: "YES" }).ok, false);
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({
        ...base,
        managedPostgresqlCurrentPilotAuthority: true,
      }).code,
      "D374_STALE_MANAGED_POSTGRESQL",
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({
        ...base,
        appPlatformCurrentPilotAuthority: true,
      }).code,
      "D374_STALE_APP_PLATFORM",
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, k3sCurrentPilotAuthority: true }).code,
      "D374_STALE_K3S",
    );
  });

  it("keeps IMP-037 Fit NOT_PERFORMED and implementation unauthorized; IMP-038 unactivated", () => {
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, architectureFitPass: true }).code,
      "IMP037_ARCHITECTURE_FIT",
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, implementationAuthorizedYes: true }).code,
      "IMP037_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(
      evaluateD374CostOptimizedPilotInfrastructureCheckpoint({ ...base, imp038ActivatedYes: true }).code,
      "IMP038_ACTIVATED",
    );
  });

  it("preserves historical ADR-001/002/013/015 wording while requiring D-374 amendment", () => {
    for (const [adrId, rel] of [
      ["ADR-001", "docs/platform/decisions/ADR-001-digitalocean-platform.md"],
      ["ADR-002", "docs/platform/decisions/ADR-002-environments-ci-cd-release-model.md"],
      ["ADR-013", "docs/platform/decisions/ADR-013-postgresql-drizzle-migrations-persistence.md"],
      ["ADR-015", "docs/platform/decisions/ADR-015-configuration-secrets-feature-flags.md"],
    ]) {
      const text = readFileSync(rel, "utf8");
      assert.deepEqual(evaluateD374AmendedHistoricalAdrPreservation(text, adrId), { ok: true });
      assert.match(text, /AMENDED/);
      assert.match(text, /D-374/);
      assert.match(text, /App Platform|Managed PostgreSQL/);
    }
  });

  it("live authorities keep D-374 / ARCH-R20 pilot topology CURRENT after the IMP-037 lock", () => {
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    const state = readFileSync("docs/platform/STATE.md", "utf8");
    const architecture = readFileSync("docs/platform/ARCHITECTURE.md", "utf8");
    const decision = readFileSync("docs/platform/decision-register.md", "utf8");
    const adr016 = readFileSync(
      "docs/platform/decisions/ADR-016-cost-optimized-pilot-infrastructure.md",
      "utf8",
    );
    assert.match(roadmap, /"roadmapVersion":\s*"GTM-R1(?:37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/);
    assert.match(state, /"stateVersion":\s*"STATE-R1(?:35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53)"/);
    assert.match(architecture, /"architectureVersion":\s*"ARCH-R2[0-3]"/);
    assert.match(decision, /"decisionRegisterVersion":\s*"DR-(?:1[6789]|2[01])"/);
    assert.match(decision, /\|\s*D-374\s*\|[^\n]*\|\s*CURRENT\s*\|/);
    assert.match(decision, /D-375/);
    assert.match(decision, /D-376/);
    assert.match(architecture, /ARCH-G26/);
    assert.match(architecture, /PILOT_COMPUTE_MODEL:\s*single Basic Droplet/);
    assert.match(architecture, /Docker Compose/);
    assert.match(architecture, /SELF_HOSTED_POSTGRESQL:\s*YES/);
    assert.match(architecture, /OFF_HOST_BACKUP_DESTINATION:\s*DigitalOcean Spaces/);
    assert.match(architecture, /DIGITALOCEAN_APP_PLATFORM:\s*NO/);
    assert.match(architecture, /MANAGED_POSTGRESQL:\s*NO/);
    assert.match(architecture, /KUBERNETES:\s*NO/);
    assert.match(architecture, /K3S:\s*NO/);
    // Fit PASS / STARTED / MERGED retained; R138 activates IMP-038 as DRAFT-only continuation.
    assert.match(roadmap, /IMP037_ARCHITECTURE_FIT:\s*PASS/);
    assert.match(roadmap, /IMP037_IMPLEMENTATION_AUTHORIZED:\s*YES/);
    assert.match(roadmap, /IMP037_REPOSITORY_IMPLEMENTATION_MERGED:\s*YES/);
    if (/"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap)) {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*YES/);
      assert.match(roadmap, /CONTINUATION_EXCEPTION:\s*IMP037_PROVIDER_BLOCKED_TO_IMP038/);
    } else {
      assert.match(roadmap, /IMP038_ACTIVATED:\s*NO/);
    }
    assert.match(state, /ARCHITECTURE_FIT_REOPEN_REASON:[\s\S]*D-374[\s\S]*ARCH-R20/);
    assert.match(state, /STATE-R131 = GLOBAL_ARCHITECTURE_DECISION_D374/);
    assert.match(state, /STATE-R132 = IMP-037_ARCHITECTURE_LOCK/);
    assert.match(adr016, /RPO_TARGET\s*<=\s*15 minutes/);
    assert.match(adr016, /does \*\*not\*\* claim those targets are solved|are \*\*not\*\* claimed solved|not claimed solved by D-374/i);
  });
});

describe("IMP-037 Architecture Lock checkpoints", () => {
  const FIT_HEAD = "28e6dd15c48b8c19abbc7057c4dc7e0a7d7cc7ea";
  const FIT_TREE = "5792c963166e8589751d2ba8c8928728e2c83526";
  const FIT_FINGERPRINT = "56fa9b5459fd8acceb2ccc3ab73c5d7d9583dbf4539b10a1ef75553dd5aff8ba";
  const REVIEW_HEAD = "d74ca9a30096fb14bca80643b75aa19d33093dde";
  const REVIEW_TREE = "09c7e3bd6b7832944d07d527c149752ed3bbeb4d";
  const REVIEW_ID = "5256273904";

  const lockedCapability = [
    "<!-- governance-meta",
    "{",
    '  "status": "CURRENT",',
    '  "authority": "CAPABILITY_ARCHITECTURE",',
    '  "capability": "IMP-037",',
    '  "architectureLock": "ARCHITECTURE_LOCKED",',
    '  "architectureFit": "PASS",',
    '  "implementationAuthorized": false,',
    '  "implementationStarted": false,',
    '  "impAccepted": false,',
    '  "schemaChangeRequired": false,',
    '  "architectureBase": "ARCH-R20"',
    "}",
    "-->",
    "",
    "# IMP-037 — Backup, Restore & Migration Readiness",
    "",
    "```text",
    "ARCHITECTURE_FIT: PASS",
    "ARCHITECTURE_FIT_EXECUTION: PERFORMED",
    "IMP037_ARCHITECTURE_LOCKED: YES",
    "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS",
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = ${REVIEW_HEAD}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = ${REVIEW_TREE}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = ${REVIEW_ID}`,
    "IMPLEMENTATION_AUTHORIZED: NO",
    "IMPLEMENTATION_STARTED: NO",
    "IMP037_IMPLEMENTATION_AUTHORIZED: NO",
    "IMP037_STARTED: NO",
    "IMP037_ACCEPTED: NO",
    "IMP038_ACTIVATED: NO",
    "FITS_WITHIN_ARCH_R20: YES",
    "D-374_CREATED: YES (already CURRENT; not created by this Fit)",
    "D375_REQUIRED_FOR_LOCK: NO",
    "D-375_CREATED: NO",
    "ARCH_R21_REQUIRED: NO",
    "ARCH_R21_CREATED: NO",
    "NEW_DEPLOYABLE_SERVICE: NO",
    "NEW_ALWAYS_ON_RECOVERY_SERVICE: NO",
    "APPLICATION_SCHEMA_CHANGE_REQUIRED: NO",
    "NEW_APPLICATION_PERMISSION: NO",
    "NEW_APPLICATION_ROLE: NO",
    "MANAGED_POSTGRESQL: NO (CURRENT pilot)",
    "APP_PLATFORM: NO (CURRENT pilot)",
    "KUBERNETES: NO",
    "K3S: NO",
    "RPO_TARGET <= 15 minutes",
    "RTO_TARGET <= 2 hours",
    "RPO_RTO_PROVEN: NO",
    "DROPLET_2GIB_RTO_VALIDATED: NO",
    "```",
    "",
    "```text",
    "EXECUTION_MODEL: one-shot tooling execution plane",
    "RECOVERY_LAYER_1: self-hosted PostgreSQL physical backup + continuous WAL archiving to Spaces",
    "RECOVERY_LAYER_1_TOOL: pgBackRest (version >= 2.55)",
    "RECOVERY_LAYER_1_REPO_ENCRYPTION: AES-256-CBC",
    "RECOVERY_LAYER_2: independent PostgreSQL logical backup / pg_dump -Fc / age public-key encryption",
    "RECOVERY_LAYER_2_INTEGRITY: SHA-256",
    "RECOVERY_LAYER_2_RETENTION: 35-day rolling retention (age-based; COMPLETE runs only)",
    "RUN_ID: unique per backup invocation",
    "REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED",
    "ENCRYPTION_KEY_VERSIONING: REQUIRED",
    "RETIRED_KEYS_MUST_REMAIN_RESOLVABLE_FOR_RETAINED_ARTIFACTS: YES",
    "RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED",
    "PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN",
    "PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION",
    "Layer 1 key version is BOBA capability / recovery metadata associated with the encrypted repository generation",
    "SPACES_VERSIONING: ENABLED",
    "SPACES_VERSIONING_IS_IMMUTABILITY: NO",
    "SPACES_OBJECT_LOCK_WORM_REQUIRED: NO",
    "Provider lifecycle rules MUST NOT independently expire current pgBackRest repository objects",
    "CAPACITY_COST_OBSERVATION: REQUIRED",
    "STORAGE_CAPACITY_VALIDATED: NO",
    "Layer 1 physical / base backup storage",
    "Retained WAL / archive storage",
    "Layer 2 logical backup storage",
    "Material version-history storage",
    "Projected 35-day retained footprint",
    "HOST_LOCAL_FLOCK_SERIALIZATION: REQUIRED (for scheduled/heavy ops)",
    "CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES",
    "DISTRIBUTED_SPACES_LOCK: FORBIDDEN",
    "SPACES_CONDITIONAL_CREATE_MUTEX: FORBIDDEN",
    "RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN",
    "OUTBOUND_PROVIDER_INITIATION: DISABLED",
    "PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED",
    "```",
    "",
    "```text",
    `ARCHITECTURE_FIT_EVALUATED_HEAD = ${FIT_HEAD}`,
    `ARCHITECTURE_FIT_EVALUATED_TREE = ${FIT_TREE}`,
    `ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = ${FIT_FINGERPRINT}`,
    "```",
  ].join("\n");

  const lockedProductDefinition = [
    "<!-- governance-meta",
    "{",
    '  "status": "APPROVED",',
    '  "authority": "PRODUCT_DEFINITION",',
    '  "capability": "IMP-037",',
    '  "productDefinitionGateExecution": "PERFORMED",',
    '  "productDefinitionGateResult": "PASS",',
    '  "architectureFitExecution": "PERFORMED",',
    '  "architectureFit": "PASS",',
    '  "architectureLocked": "YES",',
    '  "implementationAuthorized": "NO",',
    '  "implementationStarted": "NO",',
    '  "impAccepted": "NO"',
    "}",
    "-->",
    "",
    "```text",
    "Document status: APPROVED",
    "PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED",
    "Gate Result: PASS",
    "ARCHITECTURE_FIT_EXECUTION: PERFORMED",
    "ARCHITECTURE_FIT: PASS",
    "ARCHITECTURE_FIT_RESULT: PASS",
    "IMP037_ARCHITECTURE_LOCKED: YES",
    "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS",
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: ${REVIEW_HEAD}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: ${REVIEW_TREE}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: ${REVIEW_ID}`,
    "IMP037_IMPLEMENTATION_AUTHORIZED: NO",
    "IMP037_STARTED: NO",
    "IMP037_ACCEPTED: NO",
    "IMP038_ACTIVATED: NO",
    `ARCHITECTURE_FIT_EVALUATED_HEAD = ${FIT_HEAD}`,
    `ARCHITECTURE_FIT_EVALUATED_TREE = ${FIT_TREE}`,
    `ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = ${FIT_FINGERPRINT}`,
    "```",
    "",
    "Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation not authorized)",
  ].join("\n");

  const base = Object.freeze({
    roadmapVersion: "GTM-R134",
    stateVersion: "STATE-R132",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "ARCHITECTURE_LOCKED",
    imp037Activated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Created: "YES",
    archR20Created: "YES",
    d374Exists: true,
    d375Exists: false,
    archR21Exists: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
    managedPostgresqlCurrentPilotAuthority: false,
    appPlatformCurrentPilotAuthority: false,
    spacesDistributedLockCanonicalized: false,
    pr169Authoritative: false,
    capabilityText: lockedCapability,
    productDefinitionText: lockedProductDefinition,
  });

  it("passes a valid GTM-R134 / STATE-R132 architecture lock against ARCH-R20 / D-374", () => {
    assert.deepEqual(evaluateImp037ArchitectureLockCheckpoint(base), { ok: true });
  });

  it("recognizes the lock checkpoint kind exclusively at GTM-R134 / STATE-R132", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R132", "imp037ArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R132", "d374CostOptimizedPilotInfrastructure"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R133", "STATE-R131", "imp037ArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R133", "STATE-R131", "d374CostOptimizedPilotInfrastructure"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R131", "imp037ArchitectureLock"), false);
  });

  it("requires ARCH-R20 / DR-16 / PD-1 and the existing D-374 decision", () => {
    for (const override of [
      { architectureVersion: "ARCH-R19" },
      { architectureVersion: "ARCH-R21" },
      { decisionRegisterVersion: "DR-15" },
      { productDeliveryVersion: "PD-2" },
      { d374Exists: false },
      { d374Created: "NO" },
      { archR20Created: "NO" },
      { capabilityArtifactExists: false },
      { productDefinitionExists: false },
    ]) {
      const result = evaluateImp037ArchitectureLockCheckpoint({ ...base, ...override });
      assert.equal(result.ok, false, `expected failure for ${JSON.stringify(override)}`);
    }
  });

  it("rejects premature progression and reintroduced pre-D-374 infrastructure", () => {
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, implementationAuthorizedYes: true }).code,
      "IMP037_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(evaluateImp037ArchitectureLockCheckpoint({ ...base, startedYes: true }).code, "IMP037_STARTED");
    assert.equal(evaluateImp037ArchitectureLockCheckpoint({ ...base, acceptedYes: true }).code, "IMP037_ACCEPTED");
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, imp038ActivatedYes: true }).code,
      "IMP038_ACTIVATED",
    );
    assert.equal(evaluateImp037ArchitectureLockCheckpoint({ ...base, d375Exists: true }).code, "IMP037_D375");
    assert.equal(evaluateImp037ArchitectureLockCheckpoint({ ...base, archR21Exists: true }).code, "IMP037_ARCH_R21");
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, managedPostgresqlCurrentPilotAuthority: true }).code,
      "IMP037_STALE_MANAGED_POSTGRESQL",
    );
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, appPlatformCurrentPilotAuthority: true }).code,
      "IMP037_STALE_APP_PLATFORM",
    );
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, spacesDistributedLockCanonicalized: true }).code,
      "IMP037_SPACES_MUTEX",
    );
    assert.equal(
      evaluateImp037ArchitectureLockCheckpoint({ ...base, pr169Authoritative: true }).code,
      "IMP037_PR169_AUTHORITY",
    );
  });

  it("validates the locked capability architecture markers", () => {
    assert.deepEqual(evaluateImp037LockedCapabilityArchitecture(lockedCapability), { ok: true });
    assert.equal(evaluateImp037LockedCapabilityArchitecture("").code, "IMP037_CAPABILITY_ABSENT");
    for (const [from, to] of [
      ["FITS_WITHIN_ARCH_R20: YES", "FITS_WITHIN_ARCH_R20: NO"],
      ["D375_REQUIRED_FOR_LOCK: NO", "D375_REQUIRED_FOR_LOCK: MAYBE"],
      ["ARCH_R21_REQUIRED: NO", "ARCH_R21_REQUIRED: MAYBE"],
      ["RPO_TARGET <= 15 minutes", "RPO_TARGET <= 60 minutes"],
      ["RTO_TARGET <= 2 hours", "RTO_TARGET <= 8 hours"],
      ["DISTRIBUTED_SPACES_LOCK: FORBIDDEN", "DISTRIBUTED_SPACES_LOCK: ALLOWED"],
      ["PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED", "PR_169_AUTHORITY: AUTHORITATIVE"],
      ["ENCRYPTION_KEY_VERSIONING: REQUIRED", "ENCRYPTION_KEY_VERSIONING: OPTIONAL"],
      ["RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED", "RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: OPTIONAL"],
      ["REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED", "REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: OPTIONAL"],
      ["SPACES_VERSIONING: ENABLED", "SPACES_VERSIONING: DISABLED"],
      ["SPACES_VERSIONING_IS_IMMUTABILITY: NO", "SPACES_VERSIONING_IS_IMMUTABILITY: YES"],
      ["SPACES_OBJECT_LOCK_WORM_REQUIRED: NO", "SPACES_OBJECT_LOCK_WORM_REQUIRED: YES"],
      ["CAPACITY_COST_OBSERVATION: REQUIRED", "CAPACITY_COST_OBSERVATION: OPTIONAL"],
      ["STORAGE_CAPACITY_VALIDATED: NO", "STORAGE_CAPACITY_VALIDATED: YES"],
      ["PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN", "PGBACKREST_CIPHER_ROTATION_IN_PLACE: ALLOWED"],
      ["PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION", "PGBACKREST_KEY_ROTATION_MODEL: IN_PLACE"],
      ["CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES", "CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: NO"],
      ["HOST_LOCAL_FLOCK_SERIALIZATION: REQUIRED (for scheduled/heavy ops)", "HOST_LOCAL_FLOCK_SERIALIZATION: OPTIONAL"],
      ["RPO_RTO_PROVEN: NO", "RPO_RTO_PROVEN: YES"],
      ["RECOVERY_LAYER_1_TOOL: pgBackRest (version >= 2.55)", "RECOVERY_LAYER_1_TOOL: custom script"],
      [FIT_HEAD, "0000000000000000000000000000000000000000"],
      [FIT_FINGERPRINT, "0".repeat(64)],
    ]) {
      const mutated = lockedCapability.replace(from, to);
      assert.notEqual(mutated, lockedCapability, `fixture must contain ${from}`);
      assert.equal(
        evaluateImp037LockedCapabilityArchitecture(mutated).ok,
        false,
        `expected failure after replacing ${from}`,
      );
    }
  });

  it("rejects removal of restored independent-review recovery invariants", () => {
    for (const removed of [
      "SPACES_VERSIONING: ENABLED",
      "SPACES_VERSIONING_IS_IMMUTABILITY: NO",
      "Provider lifecycle rules MUST NOT independently expire current pgBackRest repository objects",
      "RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED",
      "REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED",
      "CAPACITY_COST_OBSERVATION: REQUIRED",
      "STORAGE_CAPACITY_VALIDATED: NO",
      "PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN",
      "PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION",
      "Layer 1 key version is BOBA capability / recovery metadata associated with the encrypted repository generation",
      "Material version-history storage",
      "Projected 35-day retained footprint",
    ]) {
      const mutated = lockedCapability.replace(`${removed}\n`, "");
      assert.notEqual(mutated, lockedCapability, `fixture must contain ${removed}`);
      assert.equal(
        evaluateImp037LockedCapabilityArchitecture(mutated).ok,
        false,
        `expected failure after removing ${removed}`,
      );
    }
  });

  it("rejects a capability artifact that reopens rejected PR #169 mechanisms", () => {
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        lockedCapability.replace("IMP037_IMPLEMENTATION_AUTHORIZED: NO", "IMP037_IMPLEMENTATION_AUTHORIZED: YES"),
      ).code,
      "IMP037_CAPABILITY_PREMATURE_PROGRESSION",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        lockedCapability.replace("IMP037_STARTED: NO", "IMP037_STARTED: YES"),
      ).code,
      "IMP037_CAPABILITY_PREMATURE_PROGRESSION",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        lockedCapability.replace("IMP038_ACTIVATED: NO", "IMP038_ACTIVATED: YES"),
      ).code,
      "IMP037_CAPABILITY_PREMATURE_PROGRESSION",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nRECOVERY_LAYER_1: Managed PostgreSQL PITR (provider-managed)\n`,
      ).code,
      "IMP037_CAPABILITY_STALE_MANAGED_POSTGRESQL",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nSPACES_CONDITIONAL_CREATE_MUTEX: REQUIRED\n`,
      ).code,
      "IMP037_CAPABILITY_SPACES_MUTEX",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nSPACES_VERSIONING: DISABLED\nSPACES_VERSIONING_IS_IMMUTABILITY: YES\n`,
      ).code,
      "IMP037_CAPABILITY_SPACES_VERSIONING",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nPGBACKREST_CIPHER_ROTATION_IN_PLACE: ALLOWED\n`,
      ).code,
      "IMP037_CAPABILITY_PGBACKREST_ROTATION",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nREMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: OPTIONAL\n`,
      ).code,
      "IMP037_CAPABILITY_RECOVERY_INVARIANT_WEAKENED",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nRECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: OPTIONAL\n`,
      ).code,
      "IMP037_CAPABILITY_RECOVERY_INVARIANT_WEAKENED",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        `${lockedCapability}\nCAPACITY_COST_OBSERVATION: OPTIONAL\nSTORAGE_CAPACITY_VALIDATED: YES\n`,
      ).code,
      "IMP037_CAPABILITY_RECOVERY_INVARIANT_WEAKENED",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        lockedCapability.replace('"architectureLock": "ARCHITECTURE_LOCKED"', '"architectureLock": "NOT_LOCKED"'),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(
        lockedCapability.replace(
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS",
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PENDING",
        ),
      ).code,
      "IMP037_CAPABILITY_LOCK",
    );
    assert.equal(
      evaluateImp037LockedCapabilityArchitecture(`${lockedCapability}\nINDEPENDENT_ARCHITECTURE_FIT_REVIEW = PENDING\n`).code,
      "IMP037_INDEPENDENT_REVIEW_STALE",
    );
  });

  it("validates the architecture-locked Product Definition", () => {
    assert.deepEqual(evaluateImp037ArchitectureLockedProductDefinition(lockedProductDefinition), { ok: true });
    assert.equal(evaluateImp037ArchitectureLockedProductDefinition("").code, "IMP037_PD_FIT_ABSENT");
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        lockedProductDefinition.replace('"architectureFit": "PASS"', '"architectureFit": "NOT_PERFORMED"'),
      ).code,
      "IMP037_PD_META_CONFLICT",
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        lockedProductDefinition.replace('"architectureLocked": "YES"', '"architectureLocked": "NO"'),
      ).code,
      "IMP037_PD_META_CONFLICT",
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        lockedProductDefinition.replace("Gate Result: PASS", "Gate Result: NOT_PERFORMED"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        `${lockedProductDefinition}\nARCHITECTURE_FIT: NOT_PERFORMED\n`,
      ).code,
      "IMP037_PD_STALE_FIT_MARKER",
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        `${lockedProductDefinition}\nIMP037_IMPLEMENTATION_AUTHORIZED: YES\n`,
      ).code,
      "IMP037_PD_PREMATURE_PROGRESSION",
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(lockedProductDefinition.replace(FIT_TREE, "0".repeat(40))).code,
      "IMP037_PD_FIT_PROVENANCE",
    );
    assert.equal(
      evaluateImp037ArchitectureLockedProductDefinition(
        lockedProductDefinition.replace(
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS",
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PENDING",
        ),
      ).code,
      "IMP037_PD_INDEPENDENT_REVIEW_PASS",
    );
  });

  it("accepts the live IMP-037 capability artifact and Product Definition", () => {
    const capability = readFileSync(
      "docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md",
      "utf8",
    );
    const productDefinition = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    // Live tip is GTM-R138 / STATE-R136 controlled continuation when docs land; post-merge tip remains valid until then.
    if (/"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap)) {
      assert.deepEqual(evaluateImp037ContinuationCapabilityArchitecture(capability), { ok: true });
      assert.deepEqual(evaluateImp037ContinuationProductDefinition(productDefinition), { ok: true });
    } else {
      assert.deepEqual(evaluateImp037PostMergedCapabilityArchitecture(capability), { ok: true });
      assert.deepEqual(evaluateImp037PostMergedProductDefinition(productDefinition), { ok: true });
    }
  });
});

describe("IMP-037 Implementation Authorization checkpoints", () => {
  const FIT_HEAD = "28e6dd15c48b8c19abbc7057c4dc7e0a7d7cc7ea";
  const FIT_TREE = "5792c963166e8589751d2ba8c8928728e2c83526";
  const FIT_FINGERPRINT = "56fa9b5459fd8acceb2ccc3ab73c5d7d9583dbf4539b10a1ef75553dd5aff8ba";
  const REVIEW_HEAD = "d74ca9a30096fb14bca80643b75aa19d33093dde";
  const REVIEW_TREE = "09c7e3bd6b7832944d07d527c149752ed3bbeb4d";
  const REVIEW_ID = "5256273904";

  const validAuthorizedCapability = [
    "<!-- governance-meta",
    "{",
    '  "status": "CURRENT",',
    '  "authority": "CAPABILITY_ARCHITECTURE",',
    '  "capability": "IMP-037",',
    '  "architectureLock": "ARCHITECTURE_LOCKED",',
    '  "architectureFit": "PASS",',
    '  "implementationAuthorized": true,',
    '  "implementationStarted": false,',
    '  "impAccepted": false,',
    '  "schemaChangeRequired": false,',
    '  "architectureBase": "ARCH-R20"',
    "}",
    "-->",
    "",
    "# IMP-037 — Backup, Restore & Migration Readiness",
    "",
    "```text",
    "ARCHITECTURE_FIT: PASS",
    "ARCHITECTURE_FIT_EXECUTION: PERFORMED",
    "IMP037_ARCHITECTURE_LOCKED: YES",
    "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS",
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = ${REVIEW_HEAD}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = ${REVIEW_TREE}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = ${REVIEW_ID}`,
    "IMPLEMENTATION_AUTHORIZED: YES",
    "IMPLEMENTATION_STARTED: NO",
    "IMP037_IMPLEMENTATION_AUTHORIZED: YES",
    "IMP037_STARTED: NO",
    "IMP037_ACCEPTED: NO",
    "IMP038_ACTIVATED: NO",
    "FITS_WITHIN_ARCH_R20: YES",
    "D-374_CREATED: YES (already CURRENT; not created by this Fit)",
    "D375_REQUIRED_FOR_LOCK: NO",
    "D-375_CREATED: NO",
    "ARCH_R21_REQUIRED: NO",
    "ARCH_R21_CREATED: NO",
    "NEW_DEPLOYABLE_SERVICE: NO",
    "NEW_ALWAYS_ON_RECOVERY_SERVICE: NO",
    "APPLICATION_SCHEMA_CHANGE_REQUIRED: NO",
    "NEW_APPLICATION_PERMISSION: NO",
    "NEW_APPLICATION_ROLE: NO",
    "MANAGED_POSTGRESQL: NO (CURRENT pilot)",
    "APP_PLATFORM: NO (CURRENT pilot)",
    "KUBERNETES: NO",
    "K3S: NO",
    "RPO_TARGET <= 15 minutes",
    "RTO_TARGET <= 2 hours",
    "RPO_RTO_PROVEN: NO",
    "DROPLET_2GIB_RTO_VALIDATED: NO",
    "```",
    "",
    "```text",
    "EXECUTION_MODEL: one-shot tooling execution plane",
    "RECOVERY_LAYER_1: self-hosted PostgreSQL physical backup + continuous WAL archiving to Spaces",
    "RECOVERY_LAYER_1_TOOL: pgBackRest (version >= 2.55)",
    "RECOVERY_LAYER_1_REPO_ENCRYPTION: AES-256-CBC",
    "RECOVERY_LAYER_2: independent PostgreSQL logical backup / pg_dump -Fc / age public-key encryption",
    "RECOVERY_LAYER_2_INTEGRITY: SHA-256",
    "RECOVERY_LAYER_2_RETENTION: 35-day rolling retention (age-based; COMPLETE runs only)",
    "RUN_ID: unique per backup invocation",
    "REMOTE_ARTIFACT_VERIFICATION_BEFORE_COMPLETE: REQUIRED",
    "ENCRYPTION_KEY_VERSIONING: REQUIRED",
    "RETIRED_KEYS_MUST_REMAIN_RESOLVABLE_FOR_RETAINED_ARTIFACTS: YES",
    "RECOVERY_CRITICAL_ENCRYPTION_SECRET_OFF_HOST_CUSTODY: REQUIRED",
    "PGBACKREST_CIPHER_ROTATION_IN_PLACE: FORBIDDEN",
    "PGBACKREST_KEY_ROTATION_MODEL: NEW_ENCRYPTED_REPOSITORY_GENERATION",
    "Layer 1 key version is BOBA capability / recovery metadata associated with the encrypted repository generation",
    "SPACES_VERSIONING: ENABLED",
    "SPACES_VERSIONING_IS_IMMUTABILITY: NO",
    "SPACES_OBJECT_LOCK_WORM_REQUIRED: NO",
    "Provider lifecycle rules MUST NOT independently expire current pgBackRest repository objects",
    "CAPACITY_COST_OBSERVATION: REQUIRED",
    "STORAGE_CAPACITY_VALIDATED: NO",
    "Layer 1 physical / base backup storage",
    "Retained WAL / archive storage",
    "Layer 2 logical backup storage",
    "Material version-history storage",
    "Projected 35-day retained footprint",
    "HOST_LOCAL_FLOCK_SERIALIZATION: REQUIRED (for scheduled/heavy ops)",
    "CONTINUOUS_WAL_NOT_BLOCKED_BY_SCHEDULED_JOB_LOCK: YES",
    "DISTRIBUTED_SPACES_LOCK: FORBIDDEN",
    "SPACES_CONDITIONAL_CREATE_MUTEX: FORBIDDEN",
    "RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN",
    "OUTBOUND_PROVIDER_INITIATION: DISABLED",
    "PR_169_AUTHORITY: NON_AUTHORITATIVE / SUPERSEDED",
    "CANONICAL_ROADMAP_STATE = GTM-R135 / STATE-R133",
    "```",
    "",
    "```text",
    `ARCHITECTURE_FIT_EVALUATED_HEAD = ${FIT_HEAD}`,
    `ARCHITECTURE_FIT_EVALUATED_TREE = ${FIT_TREE}`,
    `ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = ${FIT_FINGERPRINT}`,
    "```",
  ].join("\n");

  const validAuthorizedPd = [
    "<!-- governance-meta",
    "{",
    '  "status": "APPROVED",',
    '  "authority": "PRODUCT_DEFINITION",',
    '  "capability": "IMP-037",',
    '  "productDefinitionGateExecution": "PERFORMED",',
    '  "productDefinitionGateResult": "PASS",',
    '  "architectureFitExecution": "PERFORMED",',
    '  "architectureFit": "PASS",',
    '  "architectureLocked": "YES",',
    '  "implementationAuthorized": "YES",',
    '  "implementationStarted": "NO",',
    '  "impAccepted": "NO"',
    "}",
    "-->",
    "",
    "```text",
    "Document status: APPROVED",
    "PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED",
    "Gate Result: PASS",
    "ARCHITECTURE_FIT_EXECUTION: PERFORMED",
    "ARCHITECTURE_FIT: PASS",
    "ARCHITECTURE_FIT_RESULT: PASS",
    "IMP037_ARCHITECTURE_LOCKED: YES",
    "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS",
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: ${REVIEW_HEAD}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: ${REVIEW_TREE}`,
    `INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: ${REVIEW_ID}`,
    "IMP037_IMPLEMENTATION_AUTHORIZED: YES",
    "IMP037_STARTED: NO",
    "IMP037_ACCEPTED: NO",
    "IMP038_ACTIVATED: NO",
    `ARCHITECTURE_FIT_EVALUATED_HEAD = ${FIT_HEAD}`,
    `ARCHITECTURE_FIT_EVALUATED_TREE = ${FIT_TREE}`,
    `ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = ${FIT_FINGERPRINT}`,
    "CANONICAL_ANCHORS = GTM-R135 / STATE-R133",
    "```",
    "",
    "Readiness: READY_FOR_IMPLEMENTATION_START (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation authorized / not started)",
    "",
    "## Dependencies",
    "",
    "| Dependency | Authority | Required before | Unresolved impact |",
    "|---|---|---|---|",
    "| Architecture Fit | PD-1 phase | Before implementation readiness | PERFORMED / PASS — locked capability architecture |",
    "| Implementation authorization | ROADMAP/STATE | Before coding | YES / PERFORMED / AUTHORIZED |",
  ].join("\n");

  const authBase = Object.freeze({
    roadmapVersion: "GTM-R135",
    stateVersion: "STATE-R133",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "ARCHITECTURE_LOCKED",
    imp037Activated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Created: "YES",
    archR20Created: "YES",
    d374Exists: true,
    d375Exists: false,
    archR21Exists: false,
    startedYes: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
    capabilityText: validAuthorizedCapability,
    productDefinitionText: validAuthorizedPd,
  });

  it("passes valid GTM-R135 / STATE-R133 authorization checkpoint", () => {
    assert.deepEqual(evaluateImp037ImplementationAuthorizationCheckpoint(authBase), { ok: true });
  });

  it("recognizes the authorization checkpoint kind exclusively at GTM-R135 / STATE-R133", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ImplementationAuthorization"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R132", "imp037ImplementationAuthorization"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R132", "imp037ArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R132", "imp037ImplementationAuthorization"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R136", "STATE-R134", "imp037ImplementationStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R136", "STATE-R134", "imp037ImplementationAuthorization"),
      false,
    );
  });

  it("fails when implementation authorized is NO at R135/S133", () => {
    const result = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      implementationAuthorized: "NO",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when implementation started is YES", () => {
    const result = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      started: "YES",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when accepted is YES or IMP-038 activated is YES", () => {
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, accepted: "YES" }).code,
      "IMP037_IMPLEMENTATION_AUTHORIZATION",
    );
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, acceptedYes: true }).code,
      "IMP037_ACCEPTED",
    );
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, imp038Activated: "YES" }).code,
      "IMP037_IMPLEMENTATION_AUTHORIZATION",
    );
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, imp038ActivatedYes: true }).code,
      "IMP038_ACTIVATED",
    );
  });

  it("fails when capability remains unauthorized", () => {
    const staleCap = validAuthorizedCapability
      .replace(/"implementationAuthorized": true/, '"implementationAuthorized": false')
      .replace(/IMPLEMENTATION_AUTHORIZED: YES/g, "IMPLEMENTATION_AUTHORIZED: NO")
      .replace(/IMP037_IMPLEMENTATION_AUTHORIZED: YES/g, "IMP037_IMPLEMENTATION_AUTHORIZED: NO");
    const result = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      capabilityText: staleCap,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.code === "IMP037_CAPABILITY_AUTHORIZATION" ||
        result.code === "IMP037_CAPABILITY_STALE_UNAUTHORIZED",
    );
  });

  it("fails when Architecture Fit/lock regresses", () => {
    const result = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      architectureFit: "NOT_PERFORMED",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");

    const result2 = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      architectureLocked: "NO",
    });
    assert.equal(result2.ok, false);
    assert.equal(result2.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when ROADMAP/STATE versions mismatch", () => {
    const result = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      roadmapVersion: "GTM-R134",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");

    const result2 = evaluateImp037ImplementationAuthorizationCheckpoint({
      ...authBase,
      stateVersion: "STATE-R132",
    });
    assert.equal(result2.ok, false);
    assert.equal(result2.code, "IMP037_IMPLEMENTATION_AUTHORIZATION");
  });

  it("fails when D-375 or ARCH-R21 is created", () => {
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, d375Exists: true }).code,
      "IMP037_D375",
    );
    assert.equal(
      evaluateImp037ImplementationAuthorizationCheckpoint({ ...authBase, archR21Exists: true }).code,
      "IMP037_ARCH_R21",
    );
  });

  it("validates authorized capability markers and rejects premature progression", () => {
    assert.deepEqual(evaluateImp037AuthorizedCapabilityArchitecture(validAuthorizedCapability), { ok: true });
    assert.equal(evaluateImp037AuthorizedCapabilityArchitecture("").code, "IMP037_CAPABILITY_ABSENT");
    assert.equal(
      evaluateImp037AuthorizedCapabilityArchitecture(
        validAuthorizedCapability.replace("IMPLEMENTATION_STARTED: NO", "IMPLEMENTATION_STARTED: NO\nIMP-037: IMPLEMENTATION_IN_PROGRESS"),
      ).code,
      "IMP037_CAPABILITY_PREMATURE_PROGRESSION",
    );
    assert.equal(
      evaluateImp037AuthorizedCapabilityArchitecture(
        validAuthorizedCapability.replace("IMP037_STARTED: NO", "IMP037_STARTED: YES"),
      ).code,
      "IMP037_CAPABILITY_PREMATURE_PROGRESSION",
    );
  });

  it("validates authorized Product Definition markers", () => {
    assert.deepEqual(evaluateImp037AuthorizedProductDefinition(validAuthorizedPd), { ok: true });
    assert.equal(evaluateImp037AuthorizedProductDefinition("").code, "IMP037_PD_AUTH_ABSENT");
    const stalePd = validAuthorizedPd
      .replace(/"implementationAuthorized": "YES"/, '"implementationAuthorized": "NO"')
      .replace(/IMP037_IMPLEMENTATION_AUTHORIZED: YES/, "IMP037_IMPLEMENTATION_AUTHORIZED: NO");
    const staleCode = evaluateImp037AuthorizedProductDefinition(stalePd).code;
    assert.ok(
      staleCode === "IMP037_PD_IMPLEMENTATION_AUTHORIZED" ||
        staleCode === "IMP037_PD_STALE_UNAUTHORIZED",
    );
    assert.equal(
      evaluateImp037AuthorizedProductDefinition(
        `${validAuthorizedPd}\nIMP037_IMPLEMENTATION_AUTHORIZED: YES\nIMP-037: IMPLEMENTATION_IN_PROGRESS\n`,
      ).code,
      "IMP037_PD_PREMATURE_PROGRESSION",
    );
  });

  it("rejects current unauthorized prose while allowing historical pre-R135 provenance", () => {
    assert.equal(
      evaluateImp037AuthorizedCapabilityArchitecture(
        `${validAuthorizedCapability}\n\n## Current story status\n\nimplementation remains unauthorized\n`,
      ).code,
      "IMP037_CAPABILITY_STALE_UNAUTHORIZED_PROSE",
    );
    assert.deepEqual(
      evaluateImp037AuthorizedCapabilityArchitecture(`${validAuthorizedCapability}

## 29. Architecture-lock persistence record (historical GTM-R134 / STATE-R132 provenance)

implementation remains unauthorized
IMP037_IMPLEMENTATION_AUTHORIZED = NO

## 30. Current implementation status

IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = NO`),
      { ok: true },
    );
    assert.equal(
      evaluateImp037AuthorizedProductDefinition(
        `${validAuthorizedPd}\n\n| Current story | NOT_READY_FOR_IMPLEMENTATION |\n`,
      ).code,
      "IMP037_PD_STALE_UNAUTHORIZED_PROSE",
    );
    assert.deepEqual(
      evaluateImp037AuthorizedProductDefinition(
        `${validAuthorizedPd}\n\nHistorical pre-R135 lifecycle provenance: NOT_READY_FOR_IMPLEMENTATION; implementation remains unauthorized.`,
      ),
      { ok: true },
    );
  });

  it("preserves prior R134/S132 architecture-lock checkpoint support", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R134", "STATE-R132", "imp037ArchitectureLock"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ImplementationAuthorization"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R136", "STATE-R134", "imp037ImplementationStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037PostMergeReconciliation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp038ControlledContinuationActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R138", "imp038ImplementationAuthorizeStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ImplementationAuthorizeStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp038ArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ControlledContinuationActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037ImplementationStart"),
      false,
    );
  });
});

describe("IMP-037 Implementation Start checkpoints", () => {
  const liveCapability = readFileSync("docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md", "utf8");
  const livePd = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
  // Shape live tip down to GTM-R136 / STATE-R134 so start unit tests remain start-era fixtures.
  const startCapability = liveCapability
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R139\s*\/\s*STATE-R137/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R138\s*\/\s*STATE-R136/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R137\s*\/\s*STATE-R135/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R140/g, "GTM-R136")
    .replace(/GTM-R139/g, "GTM-R136")
    .replace(/GTM-R138/g, "GTM-R136")
    .replace(/GTM-R137/g, "GTM-R136")
    .replace(/STATE-R138/g, "STATE-R134")
    .replace(/STATE-R137/g, "STATE-R134")
    .replace(/STATE-R136/g, "STATE-R134")
    .replace(/STATE-R135/g, "STATE-R134")
    .replace(/IMP038_ACTIVATED\s*[:=]\s*YES/g, "IMP038_ACTIVATED: NO")
    .replace(/IMP038_ARCHITECTURE_FIT\s*[:=]\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/IMP038_ARCHITECTURE_LOCKED\s*[:=]\s*YES/g, "IMP038_ARCHITECTURE_LOCKED: NO");
  const startPd = livePd
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R139\s*\/\s*STATE-R137/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R138\s*\/\s*STATE-R136/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R137\s*\/\s*STATE-R135/g, "GTM-R136 / STATE-R134")
    .replace(/GTM-R140/g, "GTM-R136")
    .replace(/GTM-R139/g, "GTM-R136")
    .replace(/GTM-R138/g, "GTM-R136")
    .replace(/GTM-R137/g, "GTM-R136")
    .replace(/STATE-R138/g, "STATE-R134")
    .replace(/STATE-R137/g, "STATE-R134")
    .replace(/STATE-R136/g, "STATE-R134")
    .replace(/STATE-R135/g, "STATE-R134")
    .replace(/IMP038_ACTIVATED\s*[:=]\s*YES/g, "IMP038_ACTIVATED: NO")
    .replace(/IMP038_ARCHITECTURE_FIT\s*[:=]\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/IMP038_ARCHITECTURE_LOCKED\s*[:=]\s*YES/g, "IMP038_ARCHITECTURE_LOCKED: NO");

  const startBase = Object.freeze({
    roadmapVersion: "GTM-R136",
    stateVersion: "STATE-R134",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-037",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    accepted: "NO",
    founderUatRequired: "YES",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Created: "YES",
    archR20Created: "YES",
    d374Exists: true,
    d375Exists: false,
    archR21Exists: false,
    startedNo: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
    independentArchitectureFitReview: "PASS",
    implementationAuthorizationEvidence: "PR#171/5743814105",
    implementationStartEvidence: "PR#172/5744869269",
    capabilityText: startCapability,
    productDefinitionText: startPd,
  });

  it("passes valid GTM-R136 / STATE-R134 start checkpoint", () => {
    assert.deepEqual(evaluateImp037ImplementationStartCheckpoint(startBase), { ok: true });
    assert.deepEqual(evaluateImp037StartedCapabilityArchitecture(startCapability), { ok: true });
    assert.deepEqual(evaluateImp037StartedProductDefinition(startPd), { ok: true });
  });

  it("fails when implementationStarted is NO at the start checkpoint", () => {
    const result = evaluateImp037ImplementationStartCheckpoint({ ...startBase, started: "NO", startedNo: true });
    assert.equal(result.ok, false);
  });

  it("fails when accepted is YES or IMP-038 is activated", () => {
    assert.equal(evaluateImp037ImplementationStartCheckpoint({ ...startBase, acceptedYes: true }).code, "IMP037_ACCEPTED");
    assert.equal(
      evaluateImp037ImplementationStartCheckpoint({ ...startBase, imp038ActivatedYes: true }).code,
      "IMP038_ACTIVATED",
    );
  });

  it("fails when D-375 or ARCH-R21 exists", () => {
    assert.equal(evaluateImp037ImplementationStartCheckpoint({ ...startBase, d375Exists: true }).code, "IMP037_D375");
    assert.equal(evaluateImp037ImplementationStartCheckpoint({ ...startBase, archR21Exists: true }).code, "IMP037_ARCH_R21");
  });

  it("fails when Current Product Implementation is NONE", () => {
    assert.equal(
      evaluateImp037ImplementationStartCheckpoint({ ...startBase, currentProductImplementation: "NONE" }).code,
      "IMP037_IMPLEMENTATION_START",
    );
  });

  it("rejects architecture/PD regression", () => {
    assert.equal(
      evaluateImp037ImplementationStartCheckpoint({ ...startBase, architectureFit: "NOT_PERFORMED" }).code,
      "IMP037_IMPLEMENTATION_START",
    );
    assert.equal(
      evaluateImp037ImplementationStartCheckpoint({ ...startBase, architectureLocked: "NO" }).code,
      "IMP037_IMPLEMENTATION_START",
    );
  });

  it("does not treat GTM-R135 / STATE-R133 as the start checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ImplementationStart"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R135", "STATE-R133", "imp037ImplementationAuthorization"), true);
  });

  it("does not treat GTM-R137 / STATE-R135 as the start checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037ImplementationStart"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037PostMergeReconciliation"), true);
  });

  it("does not treat GTM-R138 / STATE-R136 as the start checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp037ImplementationStart"), false);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp038ControlledContinuationActivation"),
      true,
    );
  });
});

describe("IMP-037 post-merge reconciliation checkpoints", () => {
  const liveCapabilityRaw = readFileSync(
    "docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md",
    "utf8",
  );
  const livePdRaw = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
  // Keep R137 post-merge fixtures historically valid even after live tip advances past R137.
  const postMergeCapability = liveCapabilityRaw
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/IMP037_HOLD\s*[:=]\s*YES/g, "IMP037_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R139\s*\/\s*STATE-R137/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R138\s*\/\s*STATE-R136/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R140/g, "GTM-R137")
    .replace(/GTM-R139/g, "GTM-R137")
    .replace(/GTM-R138/g, "GTM-R137")
    .replace(/STATE-R138/g, "STATE-R135")
    .replace(/STATE-R137/g, "STATE-R135")
    .replace(/STATE-R136/g, "STATE-R135")
    .replace(/IMP038_ACTIVATED\s*[:=]\s*YES/g, "IMP038_ACTIVATED: NO")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED\s*[:=]\s*YES/g, "IMP038_STARTED: NO")
    .replace(/IMP038_ARCHITECTURE_FIT\s*[:=]\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/IMP038_ARCHITECTURE_LOCKED\s*[:=]\s*YES/g, "IMP038_ARCHITECTURE_LOCKED: NO");
  const postMergePd = livePdRaw
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/IMP037_HOLD\s*[:=]\s*YES/g, "IMP037_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/CURRENT tip:\s*`GTM-R140`/g, "CURRENT tip: `GTM-R137`")
    .replace(/CURRENT tip[^\n]{0,200}GTM-R140/g, (m) =>
      m.replace(/GTM-R140/g, "GTM-R137").replace(/STATE-R138/g, "STATE-R135"),
    )
    .replace(/ROADMAP GTM-R140\s*\(CURRENT tip/g, "ROADMAP GTM-R137 (CURRENT tip")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R139\s*\/\s*STATE-R137/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R138\s*\/\s*STATE-R136/g, "GTM-R137 / STATE-R135")
    .replace(/GTM-R140/g, "GTM-R137")
    .replace(/GTM-R139/g, "GTM-R137")
    .replace(/GTM-R138/g, "GTM-R137")
    .replace(/STATE-R138/g, "STATE-R135")
    .replace(/STATE-R137/g, "STATE-R135")
    .replace(/STATE-R136/g, "STATE-R135")
    .replace(/IMP038_ACTIVATED\s*[:=]\s*YES/g, "IMP038_ACTIVATED: NO")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED\s*[:=]\s*YES/g, "IMP038_STARTED: NO")
    .replace(/IMP038_ARCHITECTURE_FIT\s*[:=]\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/IMP038_ARCHITECTURE_LOCKED\s*[:=]\s*YES/g, "IMP038_ARCHITECTURE_LOCKED: NO")
    .replace(/currentProductSlice\s*=\s*IMP-036H/g, "currentProductSlice = IMP-037")
    .replace(/currentProductSlice:\s*IMP-036H/g, "currentProductSlice: IMP-037")
    .replace(/nextProductSlice\s*=\s*IMP-036I/g, "nextProductSlice = IMP-038")
    .replace(/nextProductSlice:\s*IMP-036I/g, "nextProductSlice: IMP-038");

  const postMergeBase = Object.freeze({
    roadmapVersion: "GTM-R137",
    stateVersion: "STATE-R135",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-037",
    nextProductSlice: "IMP-038",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-037",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    repositoryImplementationMerged: "YES",
    implementationPr: "174",
    implementationReviewedHead: "ae7328efe1add11a9a4299150251fe14c71b2730",
    implementationReviewedTree: "4ff19a31db947cafadf690cf6bf1b6d2f1de14ac",
    independentImplementationReview: "PASS",
    independentImplementationReviewId: "5265354130",
    implementationMergeSha: "f77a54819f51ad5648dda8acb3a7c93345cd5d6c",
    implementationMergeTree: "4ff19a31db947cafadf690cf6bf1b6d2f1de14ac",
    postMergeCi: "35587376968",
    postMergeCiResult: "SUCCESS",
    repositoryImplementation: "MERGED",
    externalRecoveryProof: "NOT_PERFORMED",
    implementationComplete: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    founderUat: "NOT_PERFORMED",
    imp038Activated: "NO",
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Created: "YES",
    archR20Created: "YES",
    d374Exists: true,
    d375Exists: false,
    archR21Exists: false,
    startedNo: false,
    acceptedYes: false,
    imp038ActivatedYes: false,
    implementationCompleteYes: false,
    independentArchitectureFitReview: "PASS",
    implementationAuthorizationEvidence: "PR#171/5743814105",
    implementationStartEvidence: "PR#172/5744869269",
    capabilityText: postMergeCapability,
    productDefinitionText: postMergePd,
  });

  it("passes valid GTM-R137 / STATE-R135 post-merge reconciliation checkpoint", () => {
    assert.deepEqual(evaluateImp037PostMergeReconciliationCheckpoint(postMergeBase), { ok: true });
  });

  it("recognizes the post-merge checkpoint kind exclusively at GTM-R137 / STATE-R135", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037PostMergeReconciliation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R136", "STATE-R134", "imp037PostMergeReconciliation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp037PostMergeReconciliation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R136", "STATE-R134", "imp037ImplementationStart"),
      true,
    );
  });

  it("fails when repository merge markers are missing", () => {
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({
        ...postMergeBase,
        repositoryImplementationMerged: "NO",
      }).code,
      "IMP037_POST_MERGE_RECONCILIATION",
    );
  });

  it("fails when external recovery proof or implementation complete advances", () => {
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({
        ...postMergeBase,
        externalRecoveryProof: "PASS",
      }).code,
      "IMP037_POST_MERGE_RECONCILIATION",
    );
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({
        ...postMergeBase,
        implementationComplete: "YES",
      }).code,
      "IMP037_POST_MERGE_RECONCILIATION",
    );
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({
        ...postMergeBase,
        implementationCompleteYes: true,
      }).code,
      "IMP037_IMPLEMENTATION_COMPLETE",
    );
  });

  it("fails when accepted is YES or IMP-038 is activated", () => {
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({ ...postMergeBase, acceptedYes: true }).code,
      "IMP037_ACCEPTED",
    );
    assert.equal(
      evaluateImp037PostMergeReconciliationCheckpoint({ ...postMergeBase, imp038ActivatedYes: true }).code,
      "IMP038_ACTIVATED",
    );
  });

  it("rejects Product Definition that only appends GTM-R137 / STATE-R135 without post-merge markers", () => {
    const startShaped = postMergePd
      .replace(/GTM-R137\s*\/\s*STATE-R135/g, "GTM-R136 / STATE-R134")
      .replace(/GTM-R137/g, "GTM-R136")
      .replace(/STATE-R135/g, "STATE-R134")
      .replace(/IMP037_REPOSITORY_IMPLEMENTATION\s*[:=]\s*MERGED/g, "IMP037_REPOSITORY_IMPLEMENTATION: NOT_MERGED")
      .replace(/IMP037_EXTERNAL_RECOVERY_PROOF\s*[:=]\s*NOT_PERFORMED/g, "")
      .replace(/IMP037_IMPLEMENTATION_COMPLETE\s*[:=]\s*NO/g, "");
    const fake = `${startShaped}\n\nHistorical note only: GTM-R137 / STATE-R135 mentioned without CURRENT tip pairing.\n`;
    assert.equal(evaluateImp037PostMergedProductDefinition(fake).code, "IMP037_PD_POST_MERGE");
  });

  it("requires live Product Definition post-merge semantic markers (R137-shaped fixture)", () => {
    assert.deepEqual(evaluateImp037PostMergedProductDefinition(postMergePd), { ok: true });
    assert.match(postMergePd, /CURRENT tip/);
    assert.match(postMergePd, /GTM-R137/);
    assert.match(postMergePd, /STATE-R135/);
    assert.match(postMergePd, /IMP037_REPOSITORY_IMPLEMENTATION\s*[:=]\s*MERGED/);
    assert.match(postMergePd, /IMP037_EXTERNAL_RECOVERY_PROOF\s*[:=]\s*NOT_PERFORMED/);
    assert.match(postMergePd, /IMPLEMENTATION_PERFORMED\s*[:=]\s*NO/);
    assert.match(postMergePd, /IMP037_IMPLEMENTATION_COMPLETE\s*[:=]\s*NO|IMPLEMENTATION_COMPLETE\s*[:=]\s*NO/);
  });
});

describe("IMP-038 controlled-continuation activation checkpoints", () => {
  const continuationCapability = liveCapabilityForContinuation();
  const continuationPd = livePdForContinuation();

  function liveCapabilityForContinuation() {
    const live = readFileSync("docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    if (
      /"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap) &&
      /GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)/.test(live) &&
      /IMP038_ACTIVATED\s*[:=]\s*YES/.test(live) &&
      /IMP037_PROVIDER_BLOCKED_TO_IMP038|CONTINUATION_EXCEPTION/.test(live)
    ) {
      return live;
    }
    // Synthetic continuation-shaped fixture derived from post-merge tip until docs land.
    return `${live
      .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
      .replace(/GTM-R152/g, "GTM-R151")
      .replace(/STATE-R150/g, "STATE-R149")
      .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
      .replace(/GTM-R151/g, "GTM-R150")
      .replace(/STATE-R149/g, "STATE-R148")
      .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
      .replace(/GTM-R150/g, "GTM-R149")
      .replace(/STATE-R148/g, "STATE-R147")
      .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
      .replace(/GTM-R149/g, "GTM-R148")
      .replace(/STATE-R147/g, "STATE-R146")
      .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
      .replace(/GTM-R148/g, "GTM-R147")
      .replace(/STATE-R146/g, "STATE-R145")
      .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
      .replace(/GTM-R147/g, "GTM-R146")
      .replace(/STATE-R145/g, "STATE-R144")
      .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
      .replace(/GTM-R146/g, "GTM-R145")
      .replace(/STATE-R144/g, "STATE-R143")
      .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
      .replace(/GTM-R145/g, "GTM-R144")
      .replace(/STATE-R143/g, "STATE-R142")
      .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
      .replace(/GTM-R144/g, "GTM-R143")
      .replace(/STATE-R142/g, "STATE-R141")
      .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
      .replace(/GTM-R143/g, "GTM-R142")
      .replace(/STATE-R141/g, "STATE-R140")
      .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
      .replace(/GTM-R142/g, "GTM-R141")
      .replace(/STATE-R140/g, "STATE-R139")
      .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
      .replace(/GTM-R141/g, "GTM-R140")
      .replace(/STATE-R139/g, "STATE-R138")
      .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R138 / STATE-R136")
      .replace(/GTM-R139\s*\/\s*STATE-R137/g, "GTM-R138 / STATE-R136")
      .replace(/GTM-R140/g, "GTM-R138")
      .replace(/GTM-R139/g, "GTM-R138")
      .replace(/STATE-R138/g, "STATE-R136")
      .replace(/STATE-R137/g, "STATE-R136")
      .replace(/GTM-R137\s*\/\s*STATE-R135/g, "GTM-R138 / STATE-R136")
      .replace(/GTM-R137/g, "GTM-R138")
      .replace(/STATE-R135/g, "STATE-R136")
      .replace(/IMP038_ACTIVATED\s*[:=]\s*NO/g, "IMP038_ACTIVATED: YES")}

CURRENT tip: GTM-R138 / STATE-R136 controlled continuation
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
Historical post-merge provenance retained: GTM-R137 / STATE-R135
`;
  }

  function livePdForContinuation() {
    const live = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    if (
      /"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(roadmap) &&
      (/CURRENT tip[^\n]{0,200}GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)/.test(live) ||
        /ROADMAP GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)\s*\(CURRENT tip/.test(live) ||
        /GTM-R1(?:48|49|50|51|52)\s*\/\s*STATE-R1(?:46|47|48|49|50|51)/.test(live)) &&
      /IMP038_ACTIVATED\s*[:=]\s*YES/.test(live) &&
      /CONTINUATION_EXCEPTION:\s*IMP037_PROVIDER_BLOCKED_TO_IMP038|IMP037_PROVIDER_BLOCKED_TO_IMP038/.test(live)
    ) {
      return live;
    }
    return `${live
      .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
      .replace(/GTM-R152/g, "GTM-R151")
      .replace(/STATE-R150/g, "STATE-R149")
      .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
      .replace(/GTM-R151/g, "GTM-R150")
      .replace(/STATE-R149/g, "STATE-R148")
      .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
      .replace(/GTM-R150/g, "GTM-R149")
      .replace(/STATE-R148/g, "STATE-R147")
      .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
      .replace(/GTM-R149/g, "GTM-R148")
      .replace(/STATE-R147/g, "STATE-R146")
      .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
      .replace(/GTM-R148/g, "GTM-R147")
      .replace(/STATE-R146/g, "STATE-R145")
      .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
      .replace(/GTM-R147/g, "GTM-R146")
      .replace(/STATE-R145/g, "STATE-R144")
      .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
      .replace(/GTM-R146/g, "GTM-R145")
      .replace(/STATE-R144/g, "STATE-R143")
      .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
      .replace(/GTM-R145/g, "GTM-R144")
      .replace(/STATE-R143/g, "STATE-R142")
      .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
      .replace(/GTM-R144/g, "GTM-R143")
      .replace(/STATE-R142/g, "STATE-R141")
      .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
      .replace(/GTM-R143/g, "GTM-R142")
      .replace(/STATE-R141/g, "STATE-R140")
      .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
      .replace(/GTM-R142/g, "GTM-R141")
      .replace(/STATE-R140/g, "STATE-R139")
      .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
      .replace(/GTM-R141/g, "GTM-R140")
      .replace(/STATE-R139/g, "STATE-R138")
      .replace(/GTM-R137\s*\/\s*STATE-R135/g, "GTM-R138 / STATE-R136")
      .replace(/CURRENT tip[^\n]{0,160}GTM-R137/g, "CURRENT tip GTM-R138")
      .replace(/CURRENT tip:\s*`GTM-R137`/g, "CURRENT tip: `GTM-R138`")
      .replace(/ROADMAP GTM-R137\s*\(CURRENT tip/g, "ROADMAP GTM-R138 (CURRENT tip")
      .replace(/IMP038_ACTIVATED\s*[:=]\s*NO/g, "IMP038_ACTIVATED: YES")}

Historical post-merge provenance retained: GTM-R137 / STATE-R135
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
`;
  }

  const approvedImp038PdForContinuation = readFileSync("docs/platform/product/IMP-038/product-definition.md", "utf8")
    .replace(/"architectureFitExecution":\s*"PERFORMED"/g, '"architectureFitExecution": "NOT_PERFORMED"')
    .replace(/"architectureFit":\s*"PASS"/g, '"architectureFit": "NOT_PERFORMED"')
    .replace(/"architectureLocked":\s*"YES"/g, '"architectureLocked": "NO"')
    .replace(/"implementationAuthorized":\s*"YES"/g, '"implementationAuthorized": "NO"')
    .replace(/"implementationStarted":\s*"YES"/g, '"implementationStarted": "NO"')
    .replace(/ARCHITECTURE_FIT_EXECUTION:\s*PERFORMED/g, "ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED")
    .replace(/ARCHITECTURE_FIT:\s*PASS/g, "ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/ARCHITECTURE_LOCKED:\s*YES/g, "ARCHITECTURE_LOCKED: NO")
    .replace(/IMP038_ARCHITECTURE_FIT:\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED")
    .replace(/IMP038_ARCHITECTURE_LOCKED:\s*YES/g, "IMP038_ARCHITECTURE_LOCKED: NO")
    .replace(/IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMPLEMENTATION_STARTED:\s*YES/g, "IMPLEMENTATION_STARTED: NO")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED:\s*YES/g, "IMP038_STARTED: NO")
    .replace(/FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION:\s*CURSOR_SESSION_MANDATE\n?/g, "")
    .replace(/INDEPENDENT_ARCHITECTURE_FIT_REVIEW:\s*PASS\n?/g, "")
    .replace(/INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD:\s*\S+\n?/g, "")
    .replace(/INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE:\s*\S+\n?/g, "")
    .replace(/INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID:\s*\S+\n?/g, "")
    .replace(/INDEPENDENT_ARCHITECTURE_FIT_REVIEW:\s*PENDING\n?/g, "")
    .replace(/CLOUDFLARE_ARCHITECTURE_LOCKED:\s*YES/g, "CLOUDFLARE_ARCHITECTURE_LOCKED: NO")
    .replace(/CLOUDFLARE_ARCHITECTURE_LOCKED\s*=\s*YES/g, "CLOUDFLARE_ARCHITECTURE_LOCKED = NO")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/ROADMAP: GTM-R142/g, "ROADMAP: GTM-R138")
    .replace(/ROADMAP: GTM-R141/g, "ROADMAP: GTM-R138")
    .replace(/ROADMAP: GTM-R140/g, "ROADMAP: GTM-R138")
    .replace(/ROADMAP: GTM-R139/g, "ROADMAP: GTM-R138")
    .replace(/STATE: STATE-R140/g, "STATE: STATE-R136")
    .replace(/STATE: STATE-R139/g, "STATE: STATE-R136")
    .replace(/STATE: STATE-R138/g, "STATE: STATE-R136")
    .replace(/STATE: STATE-R137/g, "STATE: STATE-R136")
    .replace(/ARCHITECTURE: ARCH-R21/g, "ARCHITECTURE: ARCH-R20")
    .replace(/decision-register: DR-1[789]/g, "decision-register: DR-16")
    .replace(/decision-register: DR-17/g, "decision-register: DR-16")
    .replace(/GTM-R142/g, "GTM-R140")
    .replace(/STATE-R140/g, "STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/GTM-R140/g, "GTM-R138")
    .replace(/GTM-R139/g, "GTM-R138")
    .replace(/STATE-R138/g, "STATE-R136")
    .replace(/STATE-R137/g, "STATE-R136")
    .replace(/ARCH-R21/g, "ARCH-R20")
    .replace(/DR-19/g, "DR-16")
    .replace(/DR-18/g, "DR-16")
    .replace(/DR-17/g, "DR-16");

  const continuationBase = Object.freeze({
    roadmapVersion: "GTM-R138",
    stateVersion: "STATE-R136",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-038",
    nextProductSlice: "IMP-039",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-037",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    imp037ProductDefinition: "APPROVED",
    imp037ProductDefinitionGate: "PASS",
    imp037ArchitectureFit: "PASS",
    imp037ArchitectureLocked: "YES",
    imp037ImplementationAuthorized: "YES",
    imp037Started: "YES",
    repositoryImplementationMerged: "YES",
    repositoryImplementation: "MERGED",
    externalRecoveryProof: "NOT_PERFORMED",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    continuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    continuationAuthority: "PR#179/5771367844",
    imp038Activated: "YES",
    imp038FormalLifecycle: "PLANNED",
    imp038ProductDefinition: "APPROVED",
    imp038ProductDefinitionVersion: "PD-IMP-038-DRAFT-2",
    imp038ProductDefinitionGate: "PASS",
    imp038ArchitectureFit: "NOT_PERFORMED",
    imp038ArchitectureLocked: "NO",
    imp038ImplementationAuthorized: "NO",
    imp038Started: "NO",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp039Activated: "NO",
    architectureVersion: "ARCH-R20",
    decisionRegisterVersion: "DR-16",
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    imp037ProductDefinitionExists: true,
    imp037CapabilityArtifactExists: true,
    imp038ProductDefinitionExists: true,
    imp038CapabilityArtifactExists: false,
    d374Exists: true,
    d375Exists: false,
    archR21Exists: false,
    historicalImp026To028ReopenedAsCurrent: false,
    imp037AcceptedYes: false,
    imp037ImplementationCompleteYes: false,
    imp038ProductDefinitionGatePass: true,
    imp038ArchitectureFitPass: false,
    imp038ArchitectureLockedYes: false,
    imp038ImplementationAuthorizedYes: false,
    imp038StartedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp037CapabilityText: continuationCapability,
    imp037ProductDefinitionText: continuationPd,
    imp038ProductDefinitionText: approvedImp038PdForContinuation,
  });

  it("passes valid GTM-R138 / STATE-R136 controlled-continuation activation checkpoint", () => {
    assert.deepEqual(evaluateImp038ControlledContinuationActivationCheckpoint(continuationBase), { ok: true });
  });

  it("validates live IMP-038 approved Product Definition markers", () => {
    assert.deepEqual(evaluateImp038ApprovedProductDefinition(continuationBase.imp038ProductDefinitionText), { ok: true });
  });

  it("rejects empty or Fit-premature IMP-038 approved Product Definition", () => {
    assert.equal(evaluateImp038ApprovedProductDefinition("").code, "IMP038_PD_APPROVED_EMPTY");
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /ARCHITECTURE_FIT:\s*NOT_PERFORMED/g,
          "ARCHITECTURE_FIT: PASS",
        ).replace(/"architectureFit":\s*"NOT_PERFORMED"/g, '"architectureFit": "PASS"'),
      ).code,
      "IMP038_PD_APPROVED",
    );
  });

  it("rejects IMP-038 approved Product Definition missing Founder security/privacy scope", () => {
    const stripped = continuationBase.imp038ProductDefinitionText
      .replace(/DPDP applicability[\s\S]*?US-IMP-038-020/g, "privacy portal deferred")
      .replace(/DPDP_APPLICABILITY_CONTROL_MATRIX/g, "PORTAL_ONLY")
      .replace(/US-IMP-038-020/g, "US-IMP-038-011")
      .replace(/JOURNEY-DPDP-APPLICABILITY/g, "JOURNEY-PRIVACY-REQUEST");
    assert.equal(evaluateImp038ApprovedProductDefinition(stripped).code, "IMP038_PD_APPROVED");
  });

  it("rejects regression to unresolved Founder decisions, DRAFT markers, or ASVS Level 1 target", () => {
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /UNRESOLVED_PRODUCT_DECISIONS:\s*0/,
          "UNRESOLVED_PRODUCT_DECISIONS: 21",
        ).replace(/"unresolvedProductDecisions":\s*0/, '"unresolvedProductDecisions": 21'),
      ).code,
      "IMP038_PD_UNRESOLVED_DECISIONS",
    );
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText
          .replace(/Document status:\s*APPROVED/g, "Document status: DRAFT")
          .replace(/"status":\s*"APPROVED"/g, '"status": "DRAFT"')
          .replace(/PRE-GATE DRAFT:\s*NO/g, "PRE-GATE DRAFT: YES")
          .replace(/PRODUCT_DEFINITION_GATE_EXECUTION:\s*PERFORMED/g, "PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED")
          .replace(/Gate Result:\s*PASS/g, "Gate Result: NOT_PERFORMED")
          .replace(/IMP038_PRODUCT_DEFINITION:\s*APPROVED/g, "IMP038_PRODUCT_DEFINITION: DRAFT")
          .replace(/IMP038_PRODUCT_DEFINITION_GATE:\s*PASS/g, "IMP038_PRODUCT_DEFINITION_GATE: NOT_PERFORMED"),
      ).code,
      "IMP038_PD_APPROVED",
    );
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /OWASP_ASVS_TARGET\s*=\s*LEVEL_2_APPLICABLE_CONTROLS/g,
          "OWASP_ASVS_TARGET = LEVEL_1",
        ),
      ).code,
      "IMP038_PD_ASVS_LEVEL",
    );
  });

  it("rejects self-service privacy portal, raw card storage, permanent lockout, and Cloudflare architecture lock regressions", () => {
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /FULL_SELF_SERVICE_PRIVACY_PORTAL_V1\s*=\s*NO/g,
          "FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = YES",
        ),
      ).code,
      "IMP038_PD_PRIVACY_PORTAL",
    );
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(/BOBA_RAW_PAN_STORAGE\s*=\s*NO/g, "BOBA_RAW_PAN_STORAGE = YES"),
      ).code,
      "IMP038_PD_RAW_CARD",
    );
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /PERMANENT_ATTACKER_TRIGGERED_LOCKOUT\s*=\s*FORBIDDEN/g,
          "PERMANENT_ATTACKER_TRIGGERED_LOCKOUT = ALLOWED",
        ),
      ).code,
      "IMP038_PD_PERMANENT_LOCKOUT",
    );
    assert.equal(
      evaluateImp038ApprovedProductDefinition(
        continuationBase.imp038ProductDefinitionText.replace(
          /CLOUDFLARE_ARCHITECTURE_LOCKED\s*=\s*NO/g,
          "CLOUDFLARE_ARCHITECTURE_LOCKED = YES",
        ),
      ).code,
      "IMP038_PD_CLOUDFLARE_LOCK",
    );
  });

  it("recognizes the continuation checkpoint kind exclusively at GTM-R138 / STATE-R136", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp038ControlledContinuationActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp038ControlledContinuationActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R137", "STATE-R135", "imp037PostMergeReconciliation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ControlledContinuationActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ArchitectureLock"),
      true,
    );
  });

  it("rejects IMP-037 acceptance or implementation complete", () => {
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp037Accepted: "YES",
      }).code,
      "IMP038_CONTROLLED_CONTINUATION",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp037AcceptedYes: true,
      }).code,
      "IMP037_ACCEPTED",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp037ImplementationCompleteYes: true,
      }).code,
      "IMP037_IMPLEMENTATION_COMPLETE",
    );
  });

  it("rejects missing IMP-038 Gate PASS and Fit/lock/auth/start/accept / IMP-039 activation", () => {
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038ProductDefinitionGate: "NOT_PERFORMED",
        imp038ProductDefinitionGatePass: false,
      }).code,
      "IMP038_CONTROLLED_CONTINUATION",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038ArchitectureFitPass: true,
      }).code,
      "IMP038_ARCHITECTURE_FIT",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038ArchitectureLockedYes: true,
      }).code,
      "IMP038_ARCHITECTURE_LOCKED",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038ImplementationAuthorizedYes: true,
      }).code,
      "IMP038_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038StartedYes: true,
      }).code,
      "IMP038_STARTED",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038AcceptedYes: true,
      }).code,
      "IMP038_ACCEPTED",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp039ActivatedYes: true,
      }).code,
      "IMP039_ACTIVATED",
    );
  });

  it("rejects reopening historical IMP-026→IMP-028 continuation as CURRENT authorization", () => {
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        historicalImp026To028ReopenedAsCurrent: true,
      }).code,
      "HISTORICAL_CONTINUATION_REOPENED",
    );
  });

  it("rejects wrong slice position or missing continuation exception", () => {
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        currentProductSlice: "IMP-037",
      }).code,
      "IMP038_CONTROLLED_CONTINUATION",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        continuationException: "IMP026_TO_IMP028",
      }).code,
      "IMP038_CONTROLLED_CONTINUATION",
    );
    assert.equal(
      evaluateImp038ControlledContinuationActivationCheckpoint({
        ...continuationBase,
        imp038CapabilityArtifactExists: true,
      }).code,
      "IMP038_CONTROLLED_CONTINUATION",
    );
  });
});

describe("IMP-038 Architecture Fit lock checkpoints", () => {
  const live038Capability = readFileSync(
    "docs/platform/capabilities/IMP-038-security-privacy-hardening.md",
    "utf8",
  );
  const live038Pd = readFileSync("docs/platform/product/IMP-038/product-definition.md", "utf8");
  // Shape live authorize+start tip down to lock-era markers for historical lock unit tests.
  const lockedCapability = live038Capability
    .replace(/"implementationAuthorized"\s*:\s*true/g, '"implementationAuthorized": false')
    .replace(/"implementationStarted"\s*:\s*true/g, '"implementationStarted": false')
    .replace(/"implementation"\s*:\s*"AUTHORIZED\s*\/\s*STARTED"/g, '"implementation": "NOT_AUTHORIZED / NOT_STARTED"')
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED\s*[:=]\s*YES/g, "IMP038_STARTED: NO")
    .replace(/(^|[^A-Z0-9_])IMPLEMENTATION_AUTHORIZED\s*[:=]\s*YES/gm, "$1IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/(^|[^A-Z0-9_])IMPLEMENTATION_STARTED\s*[:=]\s*YES/gm, "$1IMPLEMENTATION_STARTED: NO")
    .replace(/IMP-038:\s*IMPLEMENTATION_IN_PROGRESS/g, "IMP-038: ARCHITECTURE_LOCKED")
    .replace(/IMPLEMENTATION_IN_PROGRESS\s*\/\s*AUTHORIZED\s*\/\s*STARTED/g, "ARCHITECTURE_LOCKED / NOT_AUTHORIZED / NOT_STARTED")
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/decision-register:\s*DR-19/g, "decision-register: DR-17")
    .replace(/decision-register:\s*DR-18/g, "decision-register: DR-17")
    .replace(/DR-19/g, "DR-17")
    .replace(/DR-18/g, "DR-17")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R139 / STATE-R137")
    .replace(/GTM-R140/g, "GTM-R139")
    .replace(/STATE-R138/g, "STATE-R137")
    .replace(/CANONICAL_TIP:\s*GTM-R139/g, "CANONICAL_TIP_AFTER_LOCK: GTM-R139")
    .replace(/FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION:\s*CURSOR_SESSION_MANDATE\n?/g, "")
    .replace(/\*\*AUTHORIZED\*\* and \*\*STARTED\*\*/g, "**NOT AUTHORIZED** and **NOT STARTED**");
  const lockedPd = live038Pd
    .replace(/"implementationAuthorized":\s*"YES"/g, '"implementationAuthorized": "NO"')
    .replace(/"implementationStarted":\s*"YES"/g, '"implementationStarted": "NO"')
    .replace(/IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMPLEMENTATION_STARTED:\s*YES/g, "IMPLEMENTATION_STARTED: NO")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED:\s*YES/g, "IMP038_STARTED: NO")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/decision-register:\s*DR-19/g, "decision-register: DR-17")
    .replace(/decision-register:\s*DR-18/g, "decision-register: DR-17")
    .replace(/DR-19/g, "DR-17")
    .replace(/DR-18/g, "DR-17")
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/GTM-R140/g, "GTM-R139")
    .replace(/STATE-R138/g, "STATE-R137")
    .replace(/FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION:\s*CURSOR_SESSION_MANDATE\n?/g, "");
  const live037Capability = readFileSync(
    "docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md",
    "utf8",
  );
  const live037Pd = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
  const locked037Capability = live037Capability
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/IMP037_HOLD\s*[:=]\s*YES/g, "IMP037_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R139 / STATE-R137")
    .replace(/GTM-R140/g, "GTM-R139")
    .replace(/STATE-R138/g, "STATE-R137")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED:\s*YES/g, "IMP038_STARTED: NO")
    .replace(/AUTHORIZE \+ START/g, "Architecture Fit PASS / LOCK");
  const locked037Pd = live037Pd
    .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
    .replace(/GTM-R152/g, "GTM-R151")
    .replace(/STATE-R150/g, "STATE-R149")
    .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
    .replace(/GTM-R151/g, "GTM-R150")
    .replace(/STATE-R149/g, "STATE-R148")
    .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
    .replace(/GTM-R150/g, "GTM-R149")
    .replace(/STATE-R148/g, "STATE-R147")
    .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
    .replace(/GTM-R149/g, "GTM-R148")
    .replace(/STATE-R147/g, "STATE-R146")
    .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
    .replace(/GTM-R148/g, "GTM-R147")
    .replace(/STATE-R146/g, "STATE-R145")
    .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
    .replace(/GTM-R147/g, "GTM-R146")
    .replace(/STATE-R145/g, "STATE-R144")
    .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
    .replace(/GTM-R146/g, "GTM-R145")
    .replace(/STATE-R144/g, "STATE-R143")
    .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
    .replace(/GTM-R145/g, "GTM-R144")
    .replace(/STATE-R143/g, "STATE-R142")
    .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
    .replace(/GTM-R144/g, "GTM-R143")
    .replace(/STATE-R142/g, "STATE-R141")
    .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
    .replace(/GTM-R143/g, "GTM-R142")
    .replace(/STATE-R141/g, "STATE-R140")
    .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
    .replace(/GTM-R142/g, "GTM-R141")
    .replace(/STATE-R140/g, "STATE-R139")
    .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
    .replace(/GTM-R141/g, "GTM-R140")
    .replace(/STATE-R139/g, "STATE-R138")
    .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
    .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
    .replace(/IMP037_HOLD\s*[:=]\s*YES/g, "IMP037_HOLD: NO")
    .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
    .replace(/GTM-R140\s*\/\s*STATE-R138/g, "GTM-R139 / STATE-R137")
    .replace(/CURRENT tip:\s*`GTM-R140`/g, "CURRENT tip: `GTM-R139`")
    .replace(/CURRENT tip[^\n]{0,160}GTM-R140/g, (m) => m.replace(/GTM-R140/g, "GTM-R139").replace(/STATE-R138/g, "STATE-R137"))
    .replace(/ROADMAP GTM-R140\s*\(CURRENT tip/g, "ROADMAP GTM-R139 (CURRENT tip")
    .replace(/GTM-R140/g, "GTM-R139")
    .replace(/STATE-R138/g, "STATE-R137")
    .replace(/IMP038_IMPLEMENTATION_AUTHORIZED:\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO")
    .replace(/IMP038_STARTED:\s*YES/g, "IMP038_STARTED: NO")
    .replace(/implementation AUTHORIZED \/ STARTED/g, "implementation NOT_AUTHORIZED")
    .replace(/IMP-038 implementation AUTHORIZE \+ START/g, "IMP-038 Architecture Fit PASS / LOCK")
    .replace(/formal lifecycle IMPLEMENTATION_IN_PROGRESS/g, "formal lifecycle ARCHITECTURE_LOCKED");

  const lockBase = Object.freeze({
    roadmapVersion: "GTM-R139",
    stateVersion: "STATE-R137",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-038",
    nextProductSlice: "IMP-039",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-037",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    continuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    imp038Activated: "YES",
    imp038FormalLifecycle: "ARCHITECTURE_LOCKED",
    imp038ProductDefinition: "APPROVED",
    imp038ProductDefinitionGate: "PASS",
    imp038ArchitectureFit: "PASS",
    imp038ArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp038ImplementationAuthorized: "NO",
    imp038Started: "NO",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp039Activated: "NO",
    architectureVersion: "ARCH-R21",
    decisionRegisterVersion: "DR-17",
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    imp038ProductDefinitionExists: true,
    imp038CapabilityArtifactExists: true,
    d374Exists: true,
    d375Exists: true,
    d375Created: "YES",
    archR21Created: "YES",
    imp038ArchitectureFitPass: true,
    imp038ImplementationAuthorizedYes: false,
    imp038StartedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp037AcceptedYes: false,
    imp037CapabilityText: locked037Capability,
    imp037ProductDefinitionText: locked037Pd,
    imp038ProductDefinitionText: lockedPd,
    imp038CapabilityText: lockedCapability,
  });

  it("passes valid GTM-R139 / STATE-R137 Architecture Fit lock checkpoint", () => {
    assert.deepEqual(evaluateImp038ArchitectureLockCheckpoint(lockBase), { ok: true });
  });

  it("validates locked IMP-038 capability architecture", () => {
    assert.deepEqual(evaluateImp038LockedCapabilityArchitecture(lockedCapability), { ok: true });
  });

  it("validates architecture-locked IMP-038 Product Definition", () => {
    assert.deepEqual(evaluateImp038ArchitectureLockedProductDefinition(lockedPd), { ok: true });
  });

  it("fails when independent Architecture Fit review provenance is wrong or PENDING", () => {
    const pendingCapability = lockedCapability
      .replaceAll(
        "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS",
        "INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PENDING",
      )
      .replaceAll(
        "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS",
        "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PENDING",
      );
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(pendingCapability).code,
      "IMP038_CAPABILITY_LOCK",
    );
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(
        `${lockedCapability}\nINDEPENDENT_ARCHITECTURE_FIT_REVIEW = PENDING\n`,
      ).code,
      "IMP038_INDEPENDENT_REVIEW_STALE",
    );
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(
        lockedCapability.replaceAll(
          "3b03164d6581c5a98a893c24e92eaddece004e90",
          "0".repeat(40),
        ),
      ).code,
      "IMP038_CAPABILITY_LOCK",
    );
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(
        lockedCapability.replaceAll(
          "5bb499fa84a5bf02682b30518f2bf898ddb23540",
          "0".repeat(40),
        ),
      ).code,
      "IMP038_CAPABILITY_LOCK",
    );
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(
        lockedCapability.replaceAll("5279884548", "0000000000"),
      ).code,
      "IMP038_CAPABILITY_LOCK",
    );
    assert.equal(
      evaluateImp038ArchitectureLockedProductDefinition(
        lockedPd.replaceAll(
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS",
          "INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PENDING",
        ),
      ).code,
      "IMP038_PD_LOCKED",
    );
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({
        ...lockBase,
        independentArchitectureFitReview: "PENDING",
      }).code,
      "IMP038_INDEPENDENT_REVIEW_STALE",
    );
  });

  it("fails when implementation is authorized or started", () => {
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, imp038ImplementationAuthorizedYes: true }).code,
      "IMP038_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, imp038StartedYes: true }).code,
      "IMP038_STARTED",
    );
  });

  it("fails when IMP-039 is activated or acceptedThrough advances", () => {
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, imp039ActivatedYes: true }).code,
      "IMP039_ACTIVATED",
    );
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, acceptedThrough: "IMP-038" }).code,
      "IMP038_ARCHITECTURE_LOCK",
    );
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, imp038AcceptedYes: true }).code,
      "IMP038_ACCEPTED",
    );
  });

  it("fails when D-375 is missing", () => {
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({ ...lockBase, d375Exists: false }).code,
      "IMP038_D375",
    );
  });

  it("fails when Architecture Fit is NOT_PERFORMED", () => {
    assert.equal(
      evaluateImp038ArchitectureLockCheckpoint({
        ...lockBase,
        imp038ArchitectureFit: "NOT_PERFORMED",
      }).code,
      "IMP038_ARCHITECTURE_LOCK",
    );
  });

  it("fails locked capability when Fit marker missing", () => {
    assert.equal(
      evaluateImp038LockedCapabilityArchitecture(
        lockedCapability.replace(/ARCHITECTURE_FIT\s*[:=]\s*PASS/g, "ARCHITECTURE_FIT: NOT_PERFORMED"),
      ).code,
      "IMP038_CAPABILITY_LOCK",
    );
  });

  it("fails locked PD when CURRENT Fit regresses", () => {
    const broken = lockedPd
      .replace(/"architectureFit":\s*"PASS"/g, '"architectureFit": "NOT_PERFORMED"')
      .replace(/ARCHITECTURE_FIT:\s*PASS/g, "ARCHITECTURE_FIT: NOT_PERFORMED")
      .replace(/IMP038_ARCHITECTURE_FIT:\s*PASS/g, "IMP038_ARCHITECTURE_FIT: NOT_PERFORMED");
    assert.equal(evaluateImp038ArchitectureLockedProductDefinition(broken).code, "IMP038_PD_META_CONFLICT");
  });

  it("fails locked PD when implementation is authorized", () => {
    assert.equal(
      evaluateImp038ArchitectureLockedProductDefinition(
        lockedPd.replace(/IMPLEMENTATION_AUTHORIZED:\s*NO/g, "IMPLEMENTATION_AUTHORIZED: YES"),
      ).code,
      "IMP038_PD_PREMATURE_PROGRESSION",
    );
  });

  it("does not treat GTM-R138 / STATE-R136 as the architecture lock checkpoint", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R138", "STATE-R136", "imp038ArchitectureLock"), false);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ArchitectureLock"),
      true,
    );
  });
});

describe("IMP-038 Implementation Authorize+Start checkpoints", () => {
  const toAuthorizeStartTip = (text) =>
    String(text ?? "")
      .replace(/GTM-R153\s*\/\s*STATE-R151/g, "GTM-R152 / STATE-R150")
      .replace(/GTM-R153/g, "GTM-R152")
      .replace(/STATE-R151/g, "STATE-R150")
      .replace(/GTM-R152\s*\/\s*STATE-R150/g, "GTM-R151 / STATE-R149")
      .replace(/GTM-R152/g, "GTM-R151")
      .replace(/STATE-R150/g, "STATE-R149")
      .replace(/GTM-R151\s*\/\s*STATE-R149/g, "GTM-R150 / STATE-R148")
      .replace(/GTM-R151/g, "GTM-R150")
      .replace(/STATE-R149/g, "STATE-R148")
      .replace(/GTM-R150\s*\/\s*STATE-R148/g, "GTM-R149 / STATE-R147")
      .replace(/GTM-R150/g, "GTM-R149")
      .replace(/STATE-R148/g, "STATE-R147")
      .replace(/GTM-R149\s*\/\s*STATE-R147/g, "GTM-R148 / STATE-R146")
      .replace(/GTM-R149/g, "GTM-R148")
      .replace(/STATE-R147/g, "STATE-R146")
      .replace(/GTM-R148\s*\/\s*STATE-R146/g, "GTM-R147 / STATE-R145")
      .replace(/GTM-R148/g, "GTM-R147")
      .replace(/STATE-R146/g, "STATE-R145")
      .replace(/GTM-R147\s*\/\s*STATE-R145/g, "GTM-R146 / STATE-R144")
      .replace(/GTM-R147/g, "GTM-R146")
      .replace(/STATE-R145/g, "STATE-R144")
      .replace(/GTM-R146\s*\/\s*STATE-R144/g, "GTM-R145 / STATE-R143")
      .replace(/GTM-R146/g, "GTM-R145")
      .replace(/STATE-R144/g, "STATE-R143")
      .replace(/GTM-R145\s*\/\s*STATE-R143/g, "GTM-R144 / STATE-R142")
      .replace(/GTM-R145/g, "GTM-R144")
      .replace(/STATE-R143/g, "STATE-R142")
      .replace(/GTM-R144\s*\/\s*STATE-R142/g, "GTM-R143 / STATE-R141")
      .replace(/GTM-R144/g, "GTM-R143")
      .replace(/STATE-R142/g, "STATE-R141")
      .replace(/GTM-R143\s*\/\s*STATE-R141/g, "GTM-R142 / STATE-R140")
      .replace(/GTM-R143/g, "GTM-R142")
      .replace(/STATE-R141/g, "STATE-R140")
      .replace(/GTM-R142\s*\/\s*STATE-R140/g, "GTM-R141 / STATE-R139")
      .replace(/GTM-R142/g, "GTM-R141")
      .replace(/STATE-R140/g, "STATE-R139")
      .replace(/GTM-R141\s*\/\s*STATE-R139/g, "GTM-R140 / STATE-R138")
      .replace(/GTM-R141/g, "GTM-R140")
      .replace(/STATE-R139/g, "STATE-R138")
      .replace(/IMP038_IMPLEMENTATION_COMPLETE\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_COMPLETE: NO")
      .replace(/IMP038_HOLD\s*[:=]\s*YES/g, "IMP038_HOLD: NO")
      .replace(/IMP037_HOLD\s*[:=]\s*YES/g, "IMP037_HOLD: NO")
      .replace(/PROGRAM_PAUSE:\s*PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED/g, "PROGRAM_PAUSE: NONE")
      .replace(/PROGRAM_PAUSE_AUTHORITY:\s*D-377/g, "PROGRAM_PAUSE_AUTHORITY: NONE")
      .replace(/currentProductSlice:\s*IMP-036H/g, "currentProductSlice: IMP-038")
      .replace(/nextProductSlice:\s*IMP-036I/g, "nextProductSlice: IMP-039")
      .replace(/decision-register:\s*DR-19/g, "decision-register: DR-18")
      .replace(/DR-19/g, "DR-18");
  const startedCapability = toAuthorizeStartTip(
    readFileSync("docs/platform/capabilities/IMP-038-security-privacy-hardening.md", "utf8"),
  );
  const startedPd = toAuthorizeStartTip(
    readFileSync("docs/platform/product/IMP-038/product-definition.md", "utf8"),
  );
  const started037Capability = toAuthorizeStartTip(
    readFileSync("docs/platform/capabilities/IMP-037-backup-restore-migration-readiness.md", "utf8"),
  );
  const started037Pd = toAuthorizeStartTip(
    readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8"),
  );

  const authorizeStartBase = Object.freeze({
    roadmapVersion: "GTM-R140",
    stateVersion: "STATE-R138",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-038",
    nextProductSlice: "IMP-039",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-037",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    continuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    imp038Activated: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038ProductDefinition: "APPROVED",
    imp038ProductDefinitionGate: "PASS",
    imp038ArchitectureFit: "PASS",
    imp038ArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp038ImplementationAuthorized: "YES",
    imp038Started: "YES",
    founderImp038ImplementationAuthorization: "CURSOR_SESSION_MANDATE",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp039Activated: "NO",
    architectureVersion: "ARCH-R21",
    decisionRegisterVersion: "DR-18",
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    imp038ProductDefinitionExists: true,
    imp038CapabilityArtifactExists: true,
    d374Exists: true,
    d375Exists: true,
    d375Created: "YES",
    archR21Created: "YES",
    imp038ImplementationAuthorizedYes: true,
    imp038StartedYes: true,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp037AcceptedYes: false,
    imp037CapabilityText: started037Capability,
    imp037ProductDefinitionText: started037Pd,
    imp038ProductDefinitionText: startedPd,
    imp038CapabilityText: startedCapability,
  });

  it("passes valid GTM-R140 / STATE-R138 authorize+start checkpoint", () => {
    assert.deepEqual(evaluateImp038ImplementationAuthorizeStartCheckpoint(authorizeStartBase), { ok: true });
  });

  it("validates authorized+started IMP-038 capability architecture", () => {
    assert.deepEqual(evaluateImp038AuthorizedStartedCapabilityArchitecture(startedCapability), { ok: true });
  });

  it("validates authorized+started IMP-038 Product Definition", () => {
    assert.deepEqual(evaluateImp038AuthorizedStartedProductDefinition(startedPd), { ok: true });
  });

  it("fails when IMP-038 is accepted or IMP-039 is activated", () => {
    assert.equal(
      evaluateImp038ImplementationAuthorizeStartCheckpoint({ ...authorizeStartBase, imp038AcceptedYes: true }).code,
      "IMP038_ACCEPTED",
    );
    assert.equal(
      evaluateImp038ImplementationAuthorizeStartCheckpoint({ ...authorizeStartBase, imp039ActivatedYes: true }).code,
      "IMP039_ACTIVATED",
    );
    assert.equal(
      evaluateImp038ImplementationAuthorizeStartCheckpoint({ ...authorizeStartBase, acceptedThrough: "IMP-038" }).code,
      "IMP038_IMPLEMENTATION_AUTHORIZE_START",
    );
  });

  it("fails when authorization or start markers regress", () => {
    assert.equal(
      evaluateImp038ImplementationAuthorizeStartCheckpoint({
        ...authorizeStartBase,
        imp038ImplementationAuthorized: "NO",
        imp038ImplementationAuthorizedYes: false,
      }).code,
      "IMP038_IMPLEMENTATION_AUTHORIZE_START",
    );
    assert.equal(
      evaluateImp038AuthorizedStartedCapabilityArchitecture(
        startedCapability.replace(/IMP038_IMPLEMENTATION_AUTHORIZED\s*[:=]\s*YES/g, "IMP038_IMPLEMENTATION_AUTHORIZED: NO"),
      ).code,
      "IMP038_CAPABILITY_AUTHORIZE_START",
    );
  });

  it("recognizes authorize+start exclusively at GTM-R140 / STATE-R138", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R138", "imp038ImplementationAuthorizeStart"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R139", "STATE-R137", "imp038ImplementationAuthorizeStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R138", "imp038ArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp038ImplementationAuthorizeStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp036hProductDefinitionActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R138", "imp036hProductDefinitionActivation"),
      false,
    );
  });
});


describe("IMP-036H Product Definition activation checkpoints", () => {
  const validUngatedDraft = `<!-- governance-meta
{
  "status": "DRAFT_READY_FOR_GATE",
  "capability": "IMP-036H",
  "productDefinitionVersion": "PD-IMP-036H-DRAFT-1"
}
-->
Document status: DRAFT_READY_FOR_GATE
Product Definition version: PD-IMP-036H-DRAFT-1
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
READY_FOR_PRODUCT_DEFINITION_GATE: YES
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
IMP036H_ARCHITECTURE_LOCKED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
IMP036H_STARTED: NO
IMP036H_ACCEPTED: NO
`;

  const activationBase = Object.freeze({
    roadmapVersion: "GTM-R141",
    stateVersion: "STATE-R139",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "PLANNED",
    imp036hProductDefinition: "DRAFT_READY_FOR_GATE",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "NOT_PERFORMED",
    imp036hArchitectureFit: "NOT_PERFORMED",
    imp036hArchitectureLocked: "NO",
    imp036hImplementationAuthorized: "NO",
    imp036hStarted: "NO",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R21",
    decisionRegisterVersion: "DR-19",
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    productDefinitionText: validUngatedDraft,
    imp036hProductDefinitionGatePass: false,
    imp036hArchitectureFitPass: false,
    imp036hArchitectureLockedYes: false,
    imp036hImplementationAuthorizedYes: false,
    imp036hStartedYes: false,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
    archRevisionBump: false,
  });

  it("recognizes imp036hProductDefinitionActivation exclusively at GTM-R141 / STATE-R139", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp036hProductDefinitionActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R138", "imp036hProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R138", "imp036hProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R140", "STATE-R139", "imp036hProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp038ImplementationAuthorizeStart"),
      false,
    );
  });

  it("passes valid GTM-R141 / STATE-R139 IMP-036H Product Definition activation checkpoint", () => {
    assert.deepEqual(evaluateImp036hProductDefinitionActivationCheckpoint(activationBase), { ok: true });
  });

  it("accepts IMP-038 HOLD overlay formal lifecycle", () => {
    assert.deepEqual(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS (HOLD — IMPLEMENTATION_COMPLETE / NOT_ACCEPTED)",
      }),
      { ok: true },
    );
  });

  it("fails when GAP-EXT-ASSESS-001 is claimed closed or ARCH bumps", () => {
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        gapExtAssess001Closed: true,
      }).code,
      "IMP036H_GAP_EXT_ASSESS",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        architectureVersion: "ARCH-R22",
      }).code,
      "IMP036H_ARCH_VERSION",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        archRevisionBump: true,
      }).code,
      "IMP036H_ARCH_VERSION",
    );
  });

  it("fails when D-377 is missing or DR version is wrong", () => {
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        d377Exists: false,
      }).code,
      "IMP036H_D377",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        decisionRegisterVersion: "DR-18",
      }).code,
      "IMP036H_DR_VERSION",
    );
  });

  it("fails when program pause markers are missing", () => {
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({ ...activationBase, programPause: "" }).code,
      "IMP036H_PROGRAM_PAUSE",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({ ...activationBase, programPauseAuthority: "" }).code,
      "IMP036H_PROGRAM_PAUSE",
    );
  });

  it("fails on premature IMP-036H gate / fit / lock / implementation / acceptance", () => {
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036hProductDefinitionGate: "PASS",
      }).code,
      "IMP036H_PD_ACTIVATION",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036hProductDefinitionGatePass: true,
      }).code,
      "IMP036H_PREMATURE_GATE",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036hArchitectureLockedYes: true,
      }).code,
      "IMP036H_ARCHITECTURE_LOCKED",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036hImplementationAuthorizedYes: true,
      }).code,
      "IMP036H_IMPLEMENTATION",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036hAcceptedYes: true,
      }).code,
      "IMP036H_ACCEPTED",
    );
  });

  it("fails when IMP-039 is activated or acceptedThrough is wrong", () => {
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp039ActivatedYes: true,
      }).code,
      "IMP039_ACTIVATED",
    );
    assert.equal(
      evaluateImp036hProductDefinitionActivationCheckpoint({
        ...activationBase,
        acceptedThrough: "IMP-038",
      }).code,
      "IMP036H_PD_ACTIVATION",
    );
  });

  it("validates ungated IMP-036H Product Definition draft candidate fixture", () => {
    assert.deepEqual(evaluateImp036hUngatedProductDefinitionDraftCandidate(validUngatedDraft), { ok: true });
  });

  it("validates live IMP-036H Product Definition when present", () => {
    const livePath = new URL("../docs/platform/product/IMP-036H/product-definition.md", import.meta.url);
    let live;
    try {
      live = readFileSync(livePath, "utf8");
    } catch {
      live = null;
    }
    if (live) {
      // Live tip may be Architecture Lock (R143), Gate PASS (R142), or activation (R141).
      const roadmapTip = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
      if (/"roadmapVersion": "GTM-R155"/.test(roadmapTip) || /"roadmapVersion": "GTM-R154"/.test(roadmapTip) || /"roadmapVersion": "GTM-R153"/.test(roadmapTip) || /"roadmapVersion": "GTM-R152"/.test(roadmapTip) || /"roadmapVersion": "GTM-R151"/.test(roadmapTip) || /"roadmapVersion": "GTM-R150"/.test(roadmapTip) || /"roadmapVersion": "GTM-R149"/.test(roadmapTip) || /"roadmapVersion": "GTM-R148"/.test(roadmapTip) || /"roadmapVersion": "GTM-R147"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hAcceptedProductDefinition(live), { ok: true });
      } else if (/"roadmapVersion": "GTM-R146"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hCompleteProductDefinition(live), { ok: true });
      } else if (/"roadmapVersion": "GTM-R145"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hStartedProductDefinition(live), { ok: true });
      } else if (/"roadmapVersion": "GTM-R144"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hAuthorizedProductDefinition(live), { ok: true });
      } else if (/"roadmapVersion": "GTM-R143"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hArchitectureLockedProductDefinition(live), { ok: true });
      } else if (/"roadmapVersion": "GTM-R142"/.test(roadmapTip)) {
        assert.deepEqual(evaluateImp036hApprovedProductDefinitionCandidate(live), { ok: true });
      } else {
        assert.deepEqual(evaluateImp036hUngatedProductDefinitionDraftCandidate(live), { ok: true });
      }
    } else {
      assert.deepEqual(evaluateImp036hUngatedProductDefinitionDraftCandidate(validUngatedDraft), { ok: true });
    }
  });

  it("rejects ungated draft with premature gate PASS or missing READY_FOR_PRODUCT_DEFINITION_GATE", () => {
    assert.equal(
      evaluateImp036hUngatedProductDefinitionDraftCandidate(
        validUngatedDraft.replace(/Gate Result: NOT_PERFORMED/, "Gate Result: PASS"),
      ).code,
      "IMP036H_PD_PREMATURE_GATE_PASS",
    );
    assert.equal(
      evaluateImp036hUngatedProductDefinitionDraftCandidate(
        validUngatedDraft.replace(/READY_FOR_PRODUCT_DEFINITION_GATE: YES/, "READY_FOR_PRODUCT_DEFINITION_GATE: NO"),
      ).code,
      "IMP036H_PD_READY_FOR_GATE",
    );
    assert.equal(
      evaluateImp036hUngatedProductDefinitionDraftCandidate(
        validUngatedDraft.replace(/UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0/, "UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 1"),
      ).code,
      "IMP036H_PD_UNRESOLVED",
    );
  });
});



describe("IMP-036I Product Definition activation checkpoints", () => {
  const validUngatedDraft = `<!-- governance-meta
{
  "status": "PRE_GATE_DRAFT",
  "capability": "IMP-036I",
  "productDefinitionVersion": "PD-IMP-036I-DRAFT-1",
  "readyForProductDefinitionGate": "NO"
}
-->
Document status: PRE-GATE DRAFT
Product Definition version: PD-IMP-036I-DRAFT-1
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
READY_FOR_PRODUCT_DEFINITION_GATE: NO
IMP036I_PRODUCT_DEFINITION: PRE_GATE_DRAFT
IMP036I_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_IMPLEMENTATION_STARTED: NO
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO
`;

  const activationBase = Object.freeze({
    roadmapVersion: "GTM-R148",
    stateVersion: "STATE-R146",
    acceptedThrough: "IMP-036H",
    currentProductSlice: "IMP-036I",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036h: "COMPLETE_AND_ACCEPTED",
    imp036hAccepted: "YES",
    imp036iActivated: "YES",
    imp036iFormalLifecycle: "PLANNED",
    imp036iProductDefinition: "PRE_GATE_DRAFT",
    imp036iProductDefinitionVersion: "PD-IMP-036I-DRAFT-1",
    imp036iProductDefinitionGate: "NOT_PERFORMED",
    imp036iArchitectureFit: "NOT_PERFORMED",
    imp036iArchitectureLocked: "NO",
    imp036iImplementationAuthorized: "NO",
    imp036iStarted: "NO",
    imp036iImplementationStarted: "NO",
    imp036iImplementationComplete: "NO",
    imp036iAccepted: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    d378Exists: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    productDefinitionText: validUngatedDraft,
    imp036iProductDefinitionGatePass: false,
    imp036iArchitectureFitPass: false,
    imp036iArchitectureLockedYes: false,
    imp036iImplementationAuthorizedYes: false,
    imp036iStartedYes: false,
    imp036iImplementationStartedYes: false,
    imp036iImplementationCompleteYes: false,
    imp036iAcceptedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
    archRevisionBump: false,
  });

  it("recognizes imp036iProductDefinitionActivation exclusively at GTM-R148 / STATE-R146", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R146", "imp036iProductDefinitionActivation"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R146"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R147", "STATE-R145", "imp036iProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R145", "imp036iProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R147", "STATE-R146", "imp036iProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R146", "imp036hAcceptance"),
      false,
    );
  });

  it("passes valid GTM-R148 / STATE-R146 IMP-036I Product Definition activation checkpoint", () => {
    assert.deepEqual(evaluateImp036iProductDefinitionActivationCheckpoint(activationBase), { ok: true });
  });

  it("accepts DRAFT as synonym for PRE_GATE_DRAFT", () => {
    assert.deepEqual(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iProductDefinition: "DRAFT",
      }),
      { ok: true },
    );
  });

  it("accepts IMP-038 HOLD overlay formal lifecycle", () => {
    assert.deepEqual(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS (HOLD — IMPLEMENTATION_COMPLETE / NOT_ACCEPTED)",
      }),
      { ok: true },
    );
  });

  it("fails when GAP-EXT-ASSESS-001 is claimed closed or ARCH bumps", () => {
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        gapExtAssess001Closed: true,
      }).code,
      "IMP036I_GAP_EXT_ASSESS",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        architectureVersion: "ARCH-R23",
      }).code,
      "IMP036I_ARCH_VERSION",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        archRevisionBump: true,
      }).code,
      "IMP036I_ARCH_VERSION",
    );
  });

  it("fails when D-377 is missing or DR version is wrong", () => {
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        d377Exists: false,
      }).code,
      "IMP036I_D377",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        decisionRegisterVersion: "DR-21",
      }).code,
      "IMP036I_DR_VERSION",
    );
  });

  it("fails when PROGRAM_PAUSE markers are missing", () => {
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({ ...activationBase, programPause: "" }).code,
      "IMP036I_PROGRAM_PAUSE",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({ ...activationBase, programPauseAuthority: "" }).code,
      "IMP036I_PROGRAM_PAUSE",
    );
  });

  it("fails on premature IMP-036I gate / fit / lock / implementation / acceptance", () => {
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iProductDefinitionGate: "PASS",
      }).code,
      "IMP036I_PD_ACTIVATION",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iProductDefinitionGatePass: true,
      }).code,
      "IMP036I_PREMATURE_GATE",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iArchitectureLockedYes: true,
      }).code,
      "IMP036I_ARCHITECTURE_LOCKED",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iImplementationAuthorizedYes: true,
      }).code,
      "IMP036I_IMPLEMENTATION",
    );
    assert.equal(
      evaluateImp036iProductDefinitionActivationCheckpoint({
        ...activationBase,
        imp036iAcceptedYes: true,
      }).code,
      "IMP036I_ACCEPTED",
    );
  });

  it("validates ungated IMP-036I PRE_GATE Product Definition draft candidate fixture", () => {
    assert.deepEqual(evaluateImp036iUngatedProductDefinitionPreGateDraftCandidate(validUngatedDraft), { ok: true });
  });

  it("rejects ungated PRE_GATE draft with premature gate PASS or READY_FOR_PRODUCT_DEFINITION_GATE YES", () => {
    assert.equal(
      evaluateImp036iUngatedProductDefinitionPreGateDraftCandidate(
        validUngatedDraft.replace(/Gate Result: NOT_PERFORMED/, "Gate Result: PASS"),
      ).code,
      "IMP036I_PD_PREMATURE_GATE_PASS",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionPreGateDraftCandidate(
        validUngatedDraft.replace(/READY_FOR_PRODUCT_DEFINITION_GATE: NO/, "READY_FOR_PRODUCT_DEFINITION_GATE: YES"),
      ).code,
      "IMP036I_PD_READY_FOR_GATE",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionPreGateDraftCandidate(
        validUngatedDraft.replace(/Document status: PRE-GATE DRAFT/, "Document status: APPROVED"),
      ).code,
      "IMP036I_PD_DRAFT_APPROVED_STATUS",
    );
  });
});




describe("IMP-036I Product Definition DRAFT_READY checkpoints", () => {
  const validDraftReady = `<!-- governance-meta
{
  "status": "DRAFT_READY_FOR_GATE",
  "capability": "IMP-036I",
  "productDefinitionVersion": "PD-IMP-036I-DRAFT-4",
  "readyForProductDefinitionGate": "YES",
  "unresolvedProductDecisions": 0,
  "preGateDraft": "NO",
  "documentStatus": "DRAFT_READY_FOR_GATE",
  "imp036iProductDefinition": "DRAFT_READY_FOR_GATE",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED"
}
-->
Document status: DRAFT_READY_FOR_GATE
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-4
Product Definition Version: PD-IMP-036I-DRAFT-4
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
READY_FOR_PRODUCT_DEFINITION_GATE: YES
UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0
IMP036I_PRODUCT_DEFINITION: DRAFT_READY_FOR_GATE
IMP036I_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
IMP036I_STARTED: NO
IMP036I_IMPLEMENTATION_STARTED: NO
IMP036I_IMPLEMENTATION_COMPLETE: NO
IMP036I_ACCEPTED: NO

### 1.1 Draft history — Product Definition Gate

CURRENT candidate is PD-IMP-036I-DRAFT-4. Gate NOT_PERFORMED.

#### Historical — \`PD-IMP-036I-DRAFT-1\` (Gate STOP)

<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-1 -->
\`\`\`text
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-1
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: STOP
Evidence: PR review 5305796113
\`\`\`
<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-1 -->

#### Historical — \`PD-IMP-036I-DRAFT-2\` (Gate STOP)

<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-2 -->
\`\`\`text
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-2
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: STOP
Evidence: PR review 5306341697
\`\`\`
<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-2 -->

#### Historical — \`PD-IMP-036I-DRAFT-3\` (Gate STOP)

<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-3 -->
\`\`\`text
PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-3
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: STOP
Evidence: PR review 5306868578
\`\`\`
<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-3 -->

CURRENT REQUIREMENTS CONTINUE AFTER HISTORY
`;

  const draftReadyBase = Object.freeze({
    roadmapVersion: "GTM-R152",
    stateVersion: "STATE-R150",
    acceptedThrough: "IMP-036H",
    currentProductSlice: "IMP-036I",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036h: "COMPLETE_AND_ACCEPTED",
    imp036hAccepted: "YES",
    imp036iActivated: "YES",
    imp036iFormalLifecycle: "PLANNED",
    imp036iProductDefinition: "DRAFT_READY_FOR_GATE",
    imp036iProductDefinitionVersion: "PD-IMP-036I-DRAFT-4",
    imp036iProductDefinitionGate: "NOT_PERFORMED",
    imp036iArchitectureFit: "NOT_PERFORMED",
    imp036iArchitectureLocked: "NO",
    imp036iImplementationAuthorized: "NO",
    imp036iStarted: "NO",
    imp036iImplementationStarted: "NO",
    imp036iImplementationComplete: "NO",
    imp036iAccepted: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    d378Exists: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    productDefinitionText: validDraftReady,
    imp036iProductDefinitionGatePass: false,
    imp036iArchitectureFitPass: false,
    imp036iArchitectureLockedYes: false,
    imp036iImplementationAuthorizedYes: false,
    imp036iStartedYes: false,
    imp036iImplementationStartedYes: false,
    imp036iImplementationCompleteYes: false,
    imp036iAcceptedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
    archRevisionBump: false,
  });

  it("recognizes imp036iProductDefinitionDraftReady exclusively at GTM-R152 / STATE-R150", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R152", "STATE-R150", "imp036iProductDefinitionDraftReady"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R152", "STATE-R150"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R151", "STATE-R149", "imp036iProductDefinitionDraftReady"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R150", "STATE-R148", "imp036iProductDefinitionDraftReady"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R146", "imp036iProductDefinitionDraftReady"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R148", "STATE-R146", "imp036iProductDefinitionActivation"),
      true,
    );
  });

  it("passes valid GTM-R152 / STATE-R150 IMP-036I Product Definition DRAFT_READY checkpoint", () => {
    assert.deepEqual(evaluateImp036iProductDefinitionDraftReadyCheckpoint(draftReadyBase), { ok: true });
  });

  it("validates ungated IMP-036I DRAFT_READY Product Definition candidate fixture", () => {
    assert.deepEqual(evaluateImp036iUngatedProductDefinitionDraftCandidate(validDraftReady), { ok: true });
  });

  it("validates live IMP-036I Product Definition as DRAFT_READY when present", () => {
    const livePath = new URL("../docs/platform/product/IMP-036I/product-definition.md", import.meta.url);
    let live;
    try {
      live = readFileSync(livePath, "utf8");
    } catch {
      live = null;
    }
    if (live && /IMP036I_PRODUCT_DEFINITION:\s*APPROVED/.test(live)) {
      // Live tip advanced to Gate PASS — DRAFT_READY fixture validation remains covered by other tests.
      assert.deepEqual(evaluateImp036iUngatedProductDefinitionDraftCandidate(validDraftReady), { ok: true });
    } else if (live) {
      assert.deepEqual(evaluateImp036iUngatedProductDefinitionDraftCandidate(live), { ok: true });
    } else {
      assert.deepEqual(evaluateImp036iUngatedProductDefinitionDraftCandidate(validDraftReady), { ok: true });
    }
  });

  it("rejects DRAFT_READY candidate missing READY YES or with unresolved decisions", () => {
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(
        validDraftReady
          .replace(/"readyForProductDefinitionGate": "YES"/, '"readyForProductDefinitionGate": "NO"')
          .replace(/READY_FOR_PRODUCT_DEFINITION_GATE: YES/, "READY_FOR_PRODUCT_DEFINITION_GATE: NO"),
      ).code,
      "IMP036I_PD_READY_FOR_GATE",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(
        validDraftReady
          .replace(/"unresolvedProductDecisions": 0/, '"unresolvedProductDecisions": 1')
          .replace(/UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 0/, "UNRESOLVED_MATERIAL_PRODUCT_DECISIONS: 1"),
      ).code,
      "IMP036I_PD_UNRESOLVED",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(
        validDraftReady
          .replace(/"productDefinitionGateResult": "NOT_PERFORMED"/, '"productDefinitionGateResult": "PASS"')
          .replace(/Gate Result: NOT_PERFORMED/, "Gate Result: PASS"),
      ).code,
      "IMP036I_PD_PREMATURE_GATE_PASS",
    );
  });

  it("P2 rejects meta PRE_GATE_DRAFT contradicted by IMP036I_PRODUCT_DEFINITION DRAFT_READY_FOR_GATE marker", () => {
    const contradicted = validDraftReady
      .replace(/"status": "DRAFT_READY_FOR_GATE"/, '"status": "PRE_GATE_DRAFT"');
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(contradicted).code,
      "IMP036I_PD_STATUS_CONTRADICTION",
    );
  });

  it("P2 rejects document status PRE_GATE_DRAFT contradicted by IMP036I_PRODUCT_DEFINITION DRAFT_READY_FOR_GATE marker", () => {
    const contradicted = validDraftReady.replace(
      /Document status: DRAFT_READY_FOR_GATE/,
      "Document status: PRE_GATE_DRAFT",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(contradicted).code,
      "IMP036I_PD_STATUS_CONTRADICTION",
    );
  });

  it("allows DRAFT-4 fixture with historical DRAFT-1/2/3 Gate STOP when CURRENT remains NOT_PERFORMED", () => {
    assert.deepEqual(evaluateImp036iUngatedProductDefinitionDraftCandidate(validDraftReady), { ok: true });
    assert.match(validDraftReady, /Gate Result: STOP/);
    assert.match(validDraftReady, /5305796113/);
    assert.match(validDraftReady, /5306341697/);
    assert.match(validDraftReady, /5306868578/);
    assert.match(validDraftReady, /"productDefinitionGateExecution": "NOT_PERFORMED"/);
  });

  it("P1 fails when only DRAFT-2 Gate Result mutated to NOT_PERFORMED inside its bounded block", () => {
    const mutated = validDraftReady.replace(
      /<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-2 -->[\s\S]*?<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-2 -->/,
      (block) => block.replace(/Gate Result: STOP/, "Gate Result: NOT_PERFORMED"),
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_HISTORICAL_STOP",
    );
  });

  it("P1 fails when only DRAFT-3 Gate Result mutated to NOT_PERFORMED inside its bounded block", () => {
    const mutated = validDraftReady.replace(
      /<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-3 -->[\s\S]*?<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-3 -->/,
      (block) => block.replace(/Gate Result: STOP/, "Gate Result: NOT_PERFORMED"),
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_HISTORICAL_STOP",
    );
  });

  it("P1 fails when DRAFT-2 review ID mutated inside its bounded block", () => {
    const mutated = validDraftReady.replace(
      /<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-2 -->[\s\S]*?<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-2 -->/,
      (block) => block.replace(/5306341697/, "0000000000"),
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_HISTORICAL_STOP",
    );
  });

  it("P1 fails when DRAFT-3 review ID mutated inside its bounded block", () => {
    const mutated = validDraftReady.replace(
      /<!-- historical-gate-evidence:begin PD-IMP-036I-DRAFT-3 -->[\s\S]*?<!-- historical-gate-evidence:end PD-IMP-036I-DRAFT-3 -->/,
      (block) => block.replace(/5306868578/, "0000000000"),
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_HISTORICAL_STOP",
    );
  });

  it("P1 fails when premature IMP036I_ACCEPTED YES appears after historical blocks", () => {
    const mutated = `${validDraftReady}\nIMP036I_ACCEPTED: YES\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_PREMATURE_ACCEPTANCE",
    );
  });

  it("P1 fails when premature ARCHITECTURE_FIT PASS appears after historical blocks", () => {
    const mutated = `${validDraftReady}\nARCHITECTURE_FIT: PASS\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_PREMATURE_ARCHITECTURE",
    );
  });

  it("P1 fails when premature IMPLEMENTATION_AUTHORIZED YES appears after historical blocks", () => {
    const mutated = `${validDraftReady}\nIMPLEMENTATION_AUTHORIZED: YES\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_PREMATURE_IMPLEMENTATION",
    );
  });

  it("P1 fails when premature IMPLEMENTATION_STARTED YES appears after historical blocks", () => {
    const mutated = `${validDraftReady}\nIMP036I_IMPLEMENTATION_STARTED: YES\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_PREMATURE_IMPLEMENTATION",
    );
  });

  it("P2 fails when meta is DRAFT-3 but visible primary is DRAFT-4", () => {
    const mutated = validDraftReady.replace(
      /"productDefinitionVersion": "PD-IMP-036I-DRAFT-4"/,
      '"productDefinitionVersion": "PD-IMP-036I-DRAFT-3"',
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when meta is DRAFT-4 but visible primary is DRAFT-3", () => {
    const mutated = validDraftReady.replace(
      /PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-4/,
      "PRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-3",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when visible primary is DRAFT-4 but visible alternate is DRAFT-3", () => {
    const mutated = validDraftReady.replace(
      /Product Definition Version: PD-IMP-036I-DRAFT-4/,
      "Product Definition Version: PD-IMP-036I-DRAFT-3",
    );
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when a later duplicate visible primary PRODUCT_DEFINITION_VERSION is stale DRAFT-3", () => {
    const mutated = `${validDraftReady}\nPRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-3\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when a later duplicate visible Product Definition Version is stale DRAFT-3", () => {
    const mutated = `${validDraftReady}\nProduct Definition Version: PD-IMP-036I-DRAFT-3\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when a later visible primary token is non-numeric DRAFT-X", () => {
    const mutated = `${validDraftReady}\nPRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-X\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("P2 fails when a later visible primary token is DRAFT-4-stale suffix", () => {
    const mutated = `${validDraftReady}\nPRODUCT_DEFINITION_VERSION: PD-IMP-036I-DRAFT-4-stale\n`;
    assert.equal(
      evaluateImp036iUngatedProductDefinitionDraftCandidate(mutated).code,
      "IMP036I_PD_DRAFT_VERSION",
    );
  });

  it("fails DRAFT_READY checkpoint when Product Definition remains PRE_GATE_DRAFT", () => {
    assert.equal(
      evaluateImp036iProductDefinitionDraftReadyCheckpoint({
        ...draftReadyBase,
        imp036iProductDefinition: "PRE_GATE_DRAFT",
      }).code,
      "IMP036I_PD_DRAFT_READY",
    );
  });
});

describe("IMP-036H Product Definition Gate PASS checkpoints", () => {
  const validApproved = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036H",
  "productDefinitionVersion": "PD-IMP-036H-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "founderUatStatus": "NOT_PERFORMED",
  "founderDecisions": 23,
  "unresolvedProductDecisions": 0,
  "preGateDraft": "NO",
  "documentStatus": "APPROVED"
}
-->
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-036H-DRAFT-1
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP036H_ACCEPTED: NO
IMP036I_ACTIVATED: NO
UNRESOLVED_PRODUCT_DECISIONS: 0
GATE_EVALUATED_HEAD: 91d3714a9efba59c309db159d112fdbb6c46dc72
GATE_EVALUATED_TREE: 3f8459cfc88c97f4267528fe5b8c3e8773692245
GATE_EVALUATED_FINGERPRINT: 81395a83ca492a791ee1faca3fdbf627b985c30adf00d2163693b3ccd6523664
INDEPENDENT_PRODUCT_DEFINITION_GATE: PASS
INDEPENDENT_PRODUCT_DEFINITION_GATE_EVIDENCE: PR#238 comment 5797812536
`;

  const gatePassBase = Object.freeze({
    roadmapVersion: "GTM-R142",
    stateVersion: "STATE-R140",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "PLANNED",
    imp036hProductDefinition: "APPROVED",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "PASS",
    imp036hArchitectureFit: "NOT_PERFORMED",
    imp036hArchitectureLocked: "NO",
    imp036hImplementationAuthorized: "NO",
    imp036hStarted: "NO",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R21",
    decisionRegisterVersion: "DR-19",
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    productDefinitionText: validApproved,
    imp036hArchitectureFitPass: false,
    imp036hArchitectureLockedYes: false,
    imp036hImplementationAuthorizedYes: false,
    imp036hStartedYes: false,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
  });

  it("recognizes imp036hProductDefinitionGatePass exclusively at GTM-R142 / STATE-R140", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R142", "STATE-R140", "imp036hProductDefinitionGatePass"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R142", "STATE-R140"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp036hProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R142", "STATE-R140", "imp036hProductDefinitionActivation"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R141", "STATE-R139", "imp036hProductDefinitionActivation"),
      true,
    );
  });

  it("passes valid GTM-R142 / STATE-R140 Gate PASS checkpoint", () => {
    assert.deepEqual(evaluateImp036hProductDefinitionGatePassCheckpoint(gatePassBase), { ok: true });
    assert.deepEqual(evaluateImp036hApprovedProductDefinitionCandidate(validApproved), { ok: true });
  });

  it("requires APPROVED Product Definition with PERFORMED/PASS and preGateDraft NO", () => {
    const live = readFileSync("docs/platform/product/IMP-036H/product-definition.md", "utf8");
    const roadmapTip = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    if (/"roadmapVersion": "GTM-R155"/.test(roadmapTip) || /"roadmapVersion": "GTM-R154"/.test(roadmapTip) || /"roadmapVersion": "GTM-R153"/.test(roadmapTip) || /"roadmapVersion": "GTM-R152"/.test(roadmapTip) || /"roadmapVersion": "GTM-R151"/.test(roadmapTip) || /"roadmapVersion": "GTM-R150"/.test(roadmapTip) || /"roadmapVersion": "GTM-R149"/.test(roadmapTip) || /"roadmapVersion": "GTM-R148"/.test(roadmapTip) || /"roadmapVersion": "GTM-R147"/.test(roadmapTip)) {
      assert.deepEqual(evaluateImp036hAcceptedProductDefinition(live), { ok: true });
      assert.match(live, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(live, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(live, /IMP036H_STARTED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_COMPLETE:\s*YES/);
      assert.match(live, /IMP036H_ACCEPTED:\s*YES/);
      assert.match(live, /IMP036H_FOUNDER_UAT:\s*PASS/);
    } else if (/"roadmapVersion": "GTM-R146"/.test(roadmapTip)) {
      assert.deepEqual(evaluateImp036hCompleteProductDefinition(live), { ok: true });
      assert.match(live, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(live, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(live, /IMP036H_STARTED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_COMPLETE:\s*YES/);
    } else if (/"roadmapVersion": "GTM-R145"/.test(roadmapTip)) {
      assert.deepEqual(evaluateImp036hStartedProductDefinition(live), { ok: true });
      assert.match(live, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(live, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(live, /IMP036H_STARTED:\s*YES/);
    } else if (/"roadmapVersion": "GTM-R144"/.test(roadmapTip)) {
      assert.deepEqual(evaluateImp036hAuthorizedProductDefinition(live), { ok: true });
      assert.match(live, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(live, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
      assert.match(live, /IMP036H_IMPLEMENTATION_AUTHORIZED:\s*YES/);
      assert.match(live, /IMP036H_STARTED:\s*NO/);
    } else if (/"roadmapVersion": "GTM-R143"/.test(roadmapTip)) {
      assert.deepEqual(evaluateImp036hArchitectureLockedProductDefinition(live), { ok: true });
      assert.match(live, /IMP036H_ARCHITECTURE_FIT:\s*PASS/);
      assert.match(live, /IMP036H_ARCHITECTURE_LOCKED:\s*YES/);
    } else {
      assert.deepEqual(evaluateImp036hApprovedProductDefinitionCandidate(live), { ok: true });
      assert.match(live, /Document status:\s*APPROVED/);
      assert.match(live, /PRODUCT_DEFINITION_GATE_EXECUTION:\s*PERFORMED/);
      assert.match(live, /Gate Result:\s*PASS/);
      assert.match(live, /"preGateDraft":\s*"NO"/);
      assert.match(live, /GATE_EVALUATED_HEAD\s*[=:]\s*91d3714a9efba59c309db159d112fdbb6c46dc72/);
      assert.match(live, /GATE_EVALUATED_TREE\s*[=:]\s*3f8459cfc88c97f4267528fe5b8c3e8773692245/);
      assert.match(live, /GATE_EVALUATED_FINGERPRINT\s*[=:]\s*81395a83ca492a791ee1faca3fdbf627b985c30adf00d2163693b3ccd6523664/);
      assert.match(live, /5797812536/);
    }
  });

  it("rejects stale CURRENT PRE-GATE status", () => {
    const bad = validApproved.replace("Document status: APPROVED", "Document status: PRE-GATE DRAFT").replace(
      "PRE-GATE DRAFT: NO",
      "PRE-GATE DRAFT: YES",
    );
    const result = evaluateImp036hApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036H_PD_STALE_PRE_GATE");
  });

  it("rejects premature Fit / lock / auth / start / accept / activate claims at gate-pass tip", () => {
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036hArchitectureFitPass: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036hArchitectureLockedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036hImplementationAuthorizedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036hStartedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036hAcceptedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp036iActivatedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp039ActivatedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036hProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        imp040ActivatedYes: true,
      }).ok,
      false,
    );
  });

  it("allows clearly labelled historical pre-gate provenance", () => {
    const historical = `${validApproved}

Historical pre-gate provenance: Document status PRE-GATE DRAFT; Product Definition Gate NOT_PERFORMED; READY for Product Definition Gate evaluation.
`;
    assert.deepEqual(evaluateImp036hApprovedProductDefinitionCandidate(historical), { ok: true });
  });
});

describe("IMP-036H Architecture Fit lock checkpoints", () => {
  const afResolved = Array.from({ length: 14 }, (_, i) => {
    const id = String(i + 1).padStart(2, "0");
    return `AF-036H-${id}: RESOLVED`;
  }).join("\n");

  const validLockedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036H",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "implementationAuthorized": false,
  "implementationStarted": false
}
-->
# IMP-036H locked capability
IMP036H_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5295149318
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
IMP036H_STARTED: NO
IMP036H_ACCEPTED: NO
IMP036I_ACTIVATED: NO
D-378_CREATED: YES
D-378_STATUS: CURRENT
ADR-018 Accepted
ARCH-R22
ARCH-G28
ARCHITECTURE_FIT_EVALUATED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
ARCHITECTURE_FIT_EVALUATED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT: 74b1254f22c9131a6e073522cf9310f264866e442cc074775ad5f4b214f0e51e
${afResolved}
OPEN_ARCHITECTURE_QUESTIONS: NONE
Financial Document corrected Option A — recipient fields null for Pickup
without PickupOrder; never creates/invokes Delivery for Pickup; Delivery fail-closed
MIGRATION_REQUIRED: YES
SCHEMA_MIGRATION_EXECUTION: NOT_AUTHORIZED
IMP036I: PLANNED / NOT_ACTIVATED — scheduling belongs exclusively to **IMP-036I**
`;

  const validLockedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO"
}
-->
# IMP-036H Product Definition
Document status: APPROVED
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
PD-IMP-036H-DRAFT-1
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
ARCHITECTURE_LOCKED: YES
IMP036H_ARCHITECTURE_FIT: PASS
IMP036H_ARCHITECTURE_LOCKED: YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5295149318
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: NO
IMP036H_STARTED: NO
IMP036H_ACCEPTED: NO
GTM-R143 / STATE-R141
ARCH-R22
DR-20
D-378 / ADR-018
UNRESOLVED_PRODUCT_DECISIONS: 0
`;

  const lockBase = Object.freeze({
    roadmapVersion: "GTM-R143",
    stateVersion: "STATE-R141",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "ARCHITECTURE_LOCKED",
    imp036hProductDefinition: "APPROVED",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "PASS",
    imp036hArchitectureFit: "PASS",
    imp036hArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp036hImplementationAuthorized: "NO",
    imp036hStarted: "NO",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d378Exists: true,
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    adr018Accepted: true,
    archG28Present: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    productDefinitionText: validLockedPd,
    capabilityText: validLockedCapability,
    imp036hArchitectureFitPass: true,
    imp036hArchitectureFitNotPerformed: false,
    imp036hArchitectureLockedYes: true,
    imp036hImplementationAuthorizedYes: false,
    imp036hStartedYes: false,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
  });

  it("recognizes imp036hArchitectureLock exclusively at GTM-R143 / STATE-R141", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R143", "STATE-R141", "imp036hArchitectureLock"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R143", "STATE-R141"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R142", "STATE-R140", "imp036hArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R143", "STATE-R141", "imp036hProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R142", "STATE-R140", "imp036hProductDefinitionGatePass"),
      true,
    );
  });

  it("passes valid GTM-R143 / STATE-R141 Architecture Fit lock checkpoint", () => {
    assert.deepEqual(evaluateImp036hArchitectureLockCheckpoint(lockBase), { ok: true });
    assert.deepEqual(evaluateImp036hLockedCapabilityArchitecture(validLockedCapability), { ok: true });
    assert.deepEqual(evaluateImp036hArchitectureLockedProductDefinition(validLockedPd), { ok: true });
  });

  it("rejects Fit NOT_PERFORMED / ARCH-R21 tip / DR-19 tip / D-378 PROPOSED", () => {
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp036hArchitectureFit: "NOT_PERFORMED",
        imp036hArchitectureFitPass: false,
        imp036hArchitectureFitNotPerformed: true,
      }).code,
      "IMP036H_ARCHITECTURE_LOCK",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        architectureVersion: "ARCH-R21",
      }).code,
      "IMP036H_ARCH_VERSION",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        decisionRegisterVersion: "DR-19",
      }).code,
      "IMP036H_DR_VERSION",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        d378Proposed: true,
        d378Status: "PROPOSED",
      }).code,
      "IMP036H_D378_PROPOSED",
    );
  });

  it("rejects implementation auth/start/accept and next-slice activation", () => {
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp036hImplementationAuthorizedYes: true,
      }).code,
      "IMP036H_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp036hStartedYes: true,
      }).code,
      "IMP036H_STARTED",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp036hAcceptedYes: true,
      }).code,
      "IMP036H_ACCEPTED",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp036iActivatedYes: true,
      }).code,
      "IMP036I_ACTIVATED",
    );
    assert.equal(
      evaluateImp036hArchitectureLockCheckpoint({
        ...lockBase,
        imp039ActivatedYes: true,
      }).code,
      "IMP039_ACTIVATED",
    );
  });

  it("rejects locked PD retaining Fit NOT_PERFORMED / NOT_LOCKED", () => {
    assert.equal(
      evaluateImp036hArchitectureLockedProductDefinition(
        validLockedPd
          .replace(/IMP036H_ARCHITECTURE_FIT:\s*PASS/g, "IMP036H_ARCHITECTURE_FIT: NOT_PERFORMED")
          .replace(/"architectureFit":\s*"PASS"/g, '"architectureFit": "NOT_PERFORMED"'),
      ).code,
      "IMP036H_PD_META_CONFLICT",
    );
    assert.equal(
      evaluateImp036hArchitectureLockedProductDefinition(
        validLockedPd
          .replace(/IMP036H_ARCHITECTURE_LOCKED:\s*YES/g, "IMP036H_ARCHITECTURE_LOCKED: NO")
          .replace(/"architectureLocked":\s*"YES"/g, '"architectureLocked": "NO"'),
      ).code,
      "IMP036H_PD_META_CONFLICT",
    );
  });

  it("rejects locked capability retaining DRAFT / NOT_LOCKED / premature progression", () => {
    assert.equal(
      evaluateImp036hLockedCapabilityArchitecture(
        validLockedCapability.replace(/"status"\s*:\s*"CURRENT"/, '"status": "DRAFT"'),
      ).code,
      "IMP036H_CAPABILITY_STALE_DRAFT",
    );
    assert.equal(
      evaluateImp036hLockedCapabilityArchitecture(
        `${validLockedCapability}\nIMP036H_IMPLEMENTATION_AUTHORIZED: YES\n`,
      ).code,
      "IMP036H_CAPABILITY_PREMATURE_PROGRESSION",
    );
  });
});


describe("IMP-036H Implementation Authorization checkpoints", () => {
  const afResolved = Array.from({ length: 14 }, (_, i) => {
    const id = String(i + 1).padStart(2, "0");
    return `AF-036H-${id}: RESOLVED`;
  }).join("\n");

  const validAuthorizedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036H",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "implementationAuthorized": true,
  "implementationStarted": false
}
-->
# IMP-036H authorized capability
IMP036H_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5295149318
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: YES
IMP036H_STARTED: NO
IMP036H_IMPLEMENTATION_STARTED: NO
IMP036H_ACCEPTED: NO
IMP036I_ACTIVATED: NO
CANONICAL_ROADMAP_STATE = GTM-R144 / STATE-R142
D-378_CREATED: YES
D-378_STATUS: CURRENT
ADR-018 Accepted
ARCH-R22
ARCH-G28
ARCHITECTURE_FIT_EVALUATED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
ARCHITECTURE_FIT_EVALUATED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT: 74b1254f22c9131a6e073522cf9310f264866e442cc074775ad5f4b214f0e51e
${afResolved}
OPEN_ARCHITECTURE_QUESTIONS: NONE
Financial Document corrected Option A — recipient fields null for Pickup
without PickupOrder; never creates/invokes Delivery for Pickup; Delivery fail-closed
MIGRATION_REQUIRED: YES
SCHEMA_MIGRATION_EXECUTION: AUTHORIZED_NOT_EXECUTED
IMP036I: PLANNED / NOT_ACTIVATED — scheduling belongs exclusively to **IMP-036I**
`;

  const validAuthorizedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "NO",
  "impAccepted": "NO"
}
-->
# IMP-036H Product Definition
Document status: APPROVED
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
PD-IMP-036H-DRAFT-1
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
ARCHITECTURE_LOCKED: YES
IMP036H_ARCHITECTURE_FIT: PASS
IMP036H_ARCHITECTURE_LOCKED: YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: aab814c238c499367ee921e9f8ffb03ff7b1b373
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 93d4e83d4a73c61c9439bcaae2799920fcca46db
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5295149318
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: NO
IMP036H_IMPLEMENTATION_AUTHORIZED: YES
IMP036H_STARTED: NO
IMP036H_IMPLEMENTATION_STARTED: NO
IMP036H_ACCEPTED: NO
GTM-R144 / STATE-R142
ARCH-R22
DR-20
D-378 / ADR-018
UNRESOLVED_PRODUCT_DECISIONS: 0
`;

  const authBase = Object.freeze({
    roadmapVersion: "GTM-R144",
    stateVersion: "STATE-R142",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "ARCHITECTURE_LOCKED",
    imp036hProductDefinition: "APPROVED",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "PASS",
    imp036hArchitectureFit: "PASS",
    imp036hArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp036hImplementationAuthorized: "YES",
    imp036hStarted: "NO",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d378Exists: true,
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    adr018Accepted: true,
    archG28Present: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    productDefinitionText: validAuthorizedPd,
    capabilityText: validAuthorizedCapability,
    imp036hArchitectureFitPass: true,
    imp036hArchitectureFitNotPerformed: false,
    imp036hArchitectureLockedYes: true,
    imp036hImplementationAuthorizedYes: true,
    imp036hStartedYes: false,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
  });

  it("recognizes imp036hImplementationAuthorization exclusively at GTM-R144 / STATE-R142", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R144", "STATE-R142", "imp036hImplementationAuthorization"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R144", "STATE-R142"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R143", "STATE-R141", "imp036hImplementationAuthorization"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R144", "STATE-R142", "imp036hArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R143", "STATE-R141", "imp036hArchitectureLock"),
      true,
    );
  });

  it("passes valid GTM-R144 / STATE-R142 implementation authorization checkpoint", () => {
    assert.deepEqual(evaluateImp036hImplementationAuthorizationCheckpoint(authBase), { ok: true });
    assert.deepEqual(evaluateImp036hAuthorizedCapabilityArchitecture(validAuthorizedCapability), { ok: true });
    assert.deepEqual(evaluateImp036hAuthorizedProductDefinition(validAuthorizedPd), { ok: true });
  });

  it("allows SCHEMA_MIGRATION_EXECUTION NOT_EXECUTED as authorized-not-executed alias", () => {
    const notExecuted = validAuthorizedCapability.replace(
      /SCHEMA_MIGRATION_EXECUTION:\s*AUTHORIZED_NOT_EXECUTED/,
      "SCHEMA_MIGRATION_EXECUTION: NOT_EXECUTED",
    );
    assert.deepEqual(evaluateImp036hAuthorizedCapabilityArchitecture(notExecuted), { ok: true });
  });

  it("rejects started / accepted / wrong arch at authorization", () => {
    assert.equal(
      evaluateImp036hImplementationAuthorizationCheckpoint({
        ...authBase,
        imp036hStartedYes: true,
      }).code,
      "IMP036H_STARTED",
    );
    assert.equal(
      evaluateImp036hImplementationAuthorizationCheckpoint({
        ...authBase,
        imp036hAcceptedYes: true,
      }).code,
      "IMP036H_ACCEPTED",
    );
    assert.equal(
      evaluateImp036hImplementationAuthorizationCheckpoint({
        ...authBase,
        architectureVersion: "ARCH-R21",
      }).code,
      "IMP036H_ARCH_VERSION",
    );
    assert.equal(
      evaluateImp036hImplementationAuthorizationCheckpoint({
        ...authBase,
        architectureVersion: "ARCH-R23",
      }).code,
      "IMP036H_ARCH_VERSION",
    );
    assert.equal(
      evaluateImp036hImplementationAuthorizationCheckpoint({
        ...authBase,
        decisionRegisterVersion: "DR-21",
      }).code,
      "IMP036H_DR_VERSION",
    );
  });

  it("validates live IMP-036H PD/capability with tip-aware started vs authorized vs locked evaluators", () => {
    const roadmapTip = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    let livePd = null;
    let liveCap = null;
    try {
      livePd = readFileSync(new URL("../docs/platform/product/IMP-036H/product-definition.md", import.meta.url), "utf8");
    } catch {
      livePd = null;
    }
    try {
      liveCap = readFileSync(
        new URL("../docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md", import.meta.url),
        "utf8",
      );
    } catch {
      liveCap = null;
    }
    if (/"roadmapVersion": "GTM-R145"/.test(roadmapTip)) {
      if (livePd) assert.deepEqual(evaluateImp036hCompleteProductDefinition(livePd), { ok: true });
      if (liveCap) assert.deepEqual(evaluateImp036hCompleteCapabilityArchitecture(liveCap), { ok: true });
    } else if (/"roadmapVersion": "GTM-R144"/.test(roadmapTip)) {
      if (livePd) assert.deepEqual(evaluateImp036hAuthorizedProductDefinition(livePd), { ok: true });
      if (liveCap) assert.deepEqual(evaluateImp036hAuthorizedCapabilityArchitecture(liveCap), { ok: true });
    } else if (/"roadmapVersion": "GTM-R143"/.test(roadmapTip)) {
      if (livePd) assert.deepEqual(evaluateImp036hArchitectureLockedProductDefinition(livePd), { ok: true });
      if (liveCap) assert.deepEqual(evaluateImp036hLockedCapabilityArchitecture(liveCap), { ok: true });
    } else {
      assert.deepEqual(evaluateImp036hAuthorizedCapabilityArchitecture(validAuthorizedCapability), { ok: true });
      assert.deepEqual(evaluateImp036hAuthorizedProductDefinition(validAuthorizedPd), { ok: true });
    }
  });
});

describe("IMP-036H implementation start checkpoint (GTM-R145 / STATE-R143)", () => {
  const startBase = {
    roadmapVersion: "GTM-R145",
    stateVersion: "STATE-R143",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp036hProductDefinition: "APPROVED",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "PASS",
    imp036hArchitectureFit: "PASS",
    imp036hArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp036hImplementationAuthorized: "YES",
    imp036hStarted: "YES",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS (HOLD — IMPLEMENTATION_COMPLETE / NOT_ACCEPTED)",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d378Exists: true,
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    adr018Accepted: true,
    archG28Present: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    productDefinitionText: "",
    capabilityText: "",
    imp036hImplementationAuthorizedYes: true,
    imp036hStartedYes: true,
    imp036hImplementationStartedYes: true,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
  };

  it("recognizes imp036hImplementationStart exclusively at GTM-R145 / STATE-R143", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R145", "STATE-R143", "imp036hImplementationStart"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R145", "STATE-R143"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R144", "STATE-R142", "imp036hImplementationStart"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R144", "STATE-R142", "imp036hImplementationAuthorization"),
      true,
    );
  });

  it("recognizes GTM-R145 / STATE-R143 as historical start checkpoint (not live tip)", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R145", "STATE-R143", "imp036hImplementationStart"),
      true,
    );
    // Live tip is GTM-R146 complete; start evaluators reject live complete markers
    const livePd = readFileSync(new URL("../docs/platform/product/IMP-036H/product-definition.md", import.meta.url), "utf8");
    const liveCap = readFileSync(
      new URL("../docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md", import.meta.url),
      "utf8",
    );
    assert.equal(evaluateImp036hStartedCapabilityArchitecture(liveCap).ok, false);
    assert.equal(evaluateImp036hStartedProductDefinition(livePd).ok, false);
  });

  it("rejects not-started / accepted / wrong arch at start", () => {
    assert.equal(
      evaluateImp036hImplementationStartCheckpoint({
        ...startBase,
        imp036hStarted: "NO",
        imp036hStartedYes: false,
        productDefinitionText: startBase.productDefinitionText,
        capabilityText: startBase.capabilityText,
      }).code,
      "IMP036H_IMPLEMENTATION_START",
    );
    assert.equal(
      evaluateImp036hImplementationStartCheckpoint({
        ...startBase,
        imp036hAcceptedYes: true,
        productDefinitionText: startBase.productDefinitionText,
        capabilityText: startBase.capabilityText,
      }).code,
      "IMP036H_ACCEPTED",
    );
    assert.equal(
      evaluateImp036hImplementationStartCheckpoint({
        ...startBase,
        architectureVersion: "ARCH-R23",
        productDefinitionText: startBase.productDefinitionText,
        capabilityText: startBase.capabilityText,
      }).code,
      "IMP036H_ARCH_VERSION",
    );
  });

  it("start checkpoint rejects IMPLEMENTATION_COMPLETE YES (start tip only)", () => {
    const livePd = readFileSync(new URL("../docs/platform/product/IMP-036H/product-definition.md", import.meta.url), "utf8");
    const liveCap = readFileSync(
      new URL("../docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md", import.meta.url),
      "utf8",
    );
    // Live tip is completion; start evaluators must reject complete markers on live artifacts
    const startedCap = evaluateImp036hStartedCapabilityArchitecture(liveCap);
    assert.equal(startedCap.ok, false);
    assert.match(String(startedCap.code), /IMP036H_CAPABILITY/);
  });
});

describe("IMP-036H implementation complete checkpoints (GTM-R146 / STATE-R144)", () => {
  const completeBase = {
    roadmapVersion: "GTM-R146",
    stateVersion: "STATE-R144",
    acceptedThrough: "IMP-036G",
    currentProductSlice: "IMP-036H",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "IMP-036H",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    historicalContinuationException: "IMP037_PROVIDER_BLOCKED_TO_IMP038",
    historicalImp026ToImp028Continuation: "CLOSED",
    imp036hActivated: "YES",
    imp036hFormalLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    imp036hProductDefinition: "APPROVED",
    imp036hProductDefinitionVersion: "PD-IMP-036H-DRAFT-1",
    imp036hProductDefinitionGate: "PASS",
    imp036hArchitectureFit: "PASS",
    imp036hArchitectureLocked: "YES",
    independentArchitectureFitReview: "PASS",
    imp036hImplementationAuthorized: "YES",
    imp036hStarted: "YES",
    imp036hImplementationComplete: "YES",
    imp036hAccepted: "NO",
    imp036hFounderUatRequired: "YES",
    imp036hFounderUat: "NOT_PERFORMED",
    imp036i: "PLANNED",
    imp036iActivated: "NO",
    imp037Hold: "YES",
    imp037FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp037Activated: "YES",
    phase1BlockStatus: "BLOCKED_PROVIDER_ACCESS",
    imp037ImplementationComplete: "NO",
    imp037Accepted: "NO",
    imp038Hold: "YES",
    imp038FormalLifecycle: "IMPLEMENTATION_IN_PROGRESS (HOLD — IMPLEMENTATION_COMPLETE / NOT_ACCEPTED)",
    imp038Activated: "YES",
    imp038ImplementationComplete: "YES",
    imp038Accepted: "NO",
    imp038AcceptanceBlockedByImp037: "YES",
    imp038ExternalAssessment: "DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES",
    imp038FrozenRuntimeHead: "dc6b19e6f88d4084e424d927e6467c374596fb0a",
    imp038FrozenRuntimeTree: "c3aefb57f3f6c941d7f14907b6c095c4aa7f0547",
    imp038FrozenRuntimeFingerprint: "2800fe11397ee2a01e9decf572f85adf5c3a8b244ca34b1f53d579e05feac589",
    gapExtAssess001Closed: false,
    imp039Activated: "NO",
    imp040Activated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    d378Exists: true,
    d377Exists: true,
    d374Exists: true,
    d375Exists: true,
    d376Exists: true,
    adr018Accepted: true,
    archG28Present: true,
    productDeliveryVersion: "PD-1",
    testingPolicyVersion: "TEST-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    productDefinitionText: "",
    capabilityText: "",
    imp036hImplementationAuthorizedYes: true,
    imp036hStartedYes: true,
    imp036hImplementationStartedYes: true,
    imp036hImplementationCompleteYes: true,
    imp036hAcceptedYes: false,
    imp036iActivatedYes: false,
    imp037AcceptedYes: false,
    imp038AcceptedYes: false,
    imp039ActivatedYes: false,
    imp040ActivatedYes: false,
  };

  it("recognizes imp036hImplementationComplete exclusively at GTM-R146 / STATE-R144", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R146", "STATE-R144", "imp036hImplementationComplete"),
      true,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R146", "STATE-R144"), true);
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R145", "STATE-R143", "imp036hImplementationComplete"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R145", "STATE-R143", "imp036hImplementationStart"),
      true,
    );
  });

  it("passes valid GTM-R146 / STATE-R144 implementation complete checkpoint with live artifacts", () => {
    const livePdRaw = readFileSync(new URL("../docs/platform/product/IMP-036H/product-definition.md", import.meta.url), "utf8");
    const liveCapRaw = readFileSync(
      new URL("../docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md", import.meta.url),
      "utf8",
    );
    const roadmapTip = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
    const livePd = /"roadmapVersion": "GTM-R1(?:47|48|49|50|51|52|53|54|55)"/.test(roadmapTip)
      ? toImp036hCompleteShapedAcceptedProductDefinition(livePdRaw)
      : livePdRaw;
    const liveCap = /"roadmapVersion": "GTM-R1(?:47|48|49|50|51|52|53|54|55)"/.test(roadmapTip)
      ? toImp036hCompleteShapedAcceptedCapability(liveCapRaw)
      : liveCapRaw;
    assert.deepEqual(
      evaluateImp036hImplementationCompleteCheckpoint({
        ...completeBase,
        productDefinitionText: livePd,
        capabilityText: liveCap,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp036hCompleteCapabilityArchitecture(liveCap), { ok: true });
    assert.deepEqual(evaluateImp036hCompleteProductDefinition(livePd), { ok: true });
  });

  it("rejects complete YES + IMPLEMENTATION_IN_PROGRESS contradiction", () => {
    assert.equal(
      evaluateImp036hImplementationCompleteCheckpoint({
        ...completeBase,
        imp036hFormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
        productDefinitionText: completeBase.productDefinitionText,
        capabilityText: completeBase.capabilityText,
      }).code,
      "IMP036H_COMPLETE_IN_PROGRESS_CONTRADICTION",
    );
  });

  it("rejects accepted YES + Founder UAT NOT_PERFORMED contradiction", () => {
    assert.equal(
      evaluateImp036hImplementationCompleteCheckpoint({
        ...completeBase,
        imp036hAcceptedYes: true,
        imp036hFounderUat: "NOT_PERFORMED",
        productDefinitionText: completeBase.productDefinitionText,
        capabilityText: completeBase.capabilityText,
      }).code,
      "IMP036H_ACCEPTED_UAT_CONTRADICTION",
    );
  });

  it("rejects wrong pendingAcceptance / arch bump at complete", () => {
    assert.equal(
      evaluateImp036hImplementationCompleteCheckpoint({
        ...completeBase,
        pendingAcceptance: "NONE",
        productDefinitionText: completeBase.productDefinitionText,
        capabilityText: completeBase.capabilityText,
      }).code,
      "IMP036H_IMPLEMENTATION_COMPLETE",
    );
    assert.equal(
      evaluateImp036hImplementationCompleteCheckpoint({
        ...completeBase,
        architectureVersion: "ARCH-R23",
        productDefinitionText: completeBase.productDefinitionText,
        capabilityText: completeBase.capabilityText,
      }).code,
      "IMP036H_ARCH_VERSION",
    );
  });
});

describe("IMP-038 CURRENT implementation-complete marker consistency", () => {
  it("passes consistent CURRENT YES-only markers", () => {
    const text = `
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_ACCEPTED: NO
IMP038_HOLD: YES
`;
    assert.deepEqual(collectCurrentImp038ImplementationCompleteValues(text), ["YES"]);
    assert.deepEqual(
      evaluateCurrentImp038ImplementationCompleteMarkerConsistency([{ name: "fixture", text }]),
      { ok: true },
    );
  });

  it("fails mixed CURRENT YES and NO markers", () => {
    const text = `
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_IMPLEMENTATION_COMPLETE: NO
`;
    assert.deepEqual(collectCurrentImp038ImplementationCompleteValues(text), ["NO", "YES"]);
    const result = evaluateCurrentImp038ImplementationCompleteMarkerConsistency([
      { name: "mixed fixture", text },
    ]);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP038_IMPLEMENTATION_COMPLETE_CURRENT_CONTRADICTION");
  });

  it("allows historical explicitly-classified prior checkpoint NO beside CURRENT YES", () => {
    const text = `
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_ACCEPTED: NO

Historical prior tip record (STATE-R138; superseded as CURRENT tip by STATE-R139; preserved):

## 10a. STATE-R138 record

\`\`\`text
IMP038_IMPLEMENTATION_COMPLETE: NO
IMP038_ACCEPTED: NO
\`\`\`

\`\`\`text
HISTORICAL_CHECKPOINT: STATE-R138
HISTORICAL_AT_THAT_CHECKPOINT: YES
IMP038_IMPLEMENTATION_COMPLETE: NO
\`\`\`
`;
    const stripped = stripExplicitlyHistoricalImp038CompletionContext(text);
    assert.match(stripped, /IMP038_IMPLEMENTATION_COMPLETE: YES/);
    assert.doesNotMatch(stripped, /IMP038_IMPLEMENTATION_COMPLETE: NO/);
    assert.deepEqual(collectCurrentImp038ImplementationCompleteValues(text), ["YES"]);
    assert.deepEqual(
      evaluateCurrentImp038ImplementationCompleteMarkerConsistency([{ name: "historical fixture", text }]),
      { ok: true },
    );
  });

  it("allows narrative prior-tip NO when line situates marker historically", () => {
    const text = `
IMP038_IMPLEMENTATION_COMPLETE: YES
\`IMP038_ACCEPTED: NO\`; \`IMP038_IMPLEMENTATION_COMPLETE: NO\` at that tip. Does **not** accept.
`;
    assert.deepEqual(collectCurrentImp038ImplementationCompleteValues(text), ["YES"]);
    assert.deepEqual(
      evaluateCurrentImp038ImplementationCompleteMarkerConsistency([{ name: "narrative fixture", text }]),
      { ok: true },
    );
  });

  it("live CURRENT IMP-038 capability / PD / tip authorities are consistent", () => {
    const capability = readFileSync(
      "docs/platform/capabilities/IMP-038-security-privacy-hardening.md",
      "utf8",
    );
    const pd = readFileSync("docs/platform/product/IMP-038/product-definition.md", "utf8");
    const roadmap = readFileSync("docs/platform/ROADMAP.md", "utf8");
    const state = readFileSync("docs/platform/STATE.md", "utf8");
    const roadmapSection = roadmap.slice(roadmap.indexOf("## 2."), roadmap.indexOf("## 3."));
    const stateCurrent = state.slice(0, state.search(/\nHistorical prior tip/i));
    assert.deepEqual(
      evaluateCurrentImp038ImplementationCompleteMarkerConsistency([
        { name: "IMP-038 capability architecture", text: capability },
        { name: "IMP-038 Product Definition", text: pd },
        { name: "ROADMAP Current Position", text: roadmapSection },
        { name: "STATE CURRENT tip authority", text: stateCurrent },
      ]),
      { ok: true },
    );
  });
});


describe("IMP-037 Product Definition D-374 CURRENT recovery-read reconciliation", () => {
  const livePd = () => readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");

  const validSkeleton = `<!-- governance-meta
{
  "status": "APPROVED",
  "productDefinitionGateResult": "PASS",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO"
}
-->
Document status: APPROVED
Gate Result: PASS
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP038_ACTIVATED: NO

Two recovery layers remain mandatory:
(1) PITR-capable continuous recovery
(2) independent encrypted logical backup

| PITR-capable continuous recovery layer | self-hosted PostgreSQL 18 under D-374 / ARCH-R20 | PLANNED_IMP037 / ARCHITECTURE_FIT_REQUIRED |
| High-risk migration | Verify PITR-capable recovery-layer health; recovery point; independent backup evidence |
Then applicable PITR-capable recovery-layer health/recovery-point evidence and independent backup evidence are checked.
| DISCOVERY | Readiness status distinguishes PITR-capable continuous recovery vs independent logical backup layers |

| Historical Managed PostgreSQL automated backups / PITR (provider layer) | **HISTORICAL** under ADR-013; **not** CURRENT after D-374 |
`;

  // The live PD advanced past this GTM-R133 / STATE-R131 posture at the GTM-R134 lock,
  // so these remain fixture-driven checks of the historical D-374 recovery read.
  it("passes valid D-374 Product Definition CURRENT read", () => {
    assert.deepEqual(evaluateImp037ProductDefinitionD374CurrentRecoveryRead(validSkeleton), { ok: true });
  });

  it("fails CURRENT Managed PostgreSQL/PITR supported claim", () => {
    const text = validSkeleton.replace(
      "| PITR-capable continuous recovery layer | self-hosted PostgreSQL 18 under D-374 / ARCH-R20 | PLANNED_IMP037 / ARCHITECTURE_FIT_REQUIRED |",
      "| Managed PostgreSQL backup / PITR (ADR-013 first layer) | Managed DigitalOcean PostgreSQL | `CURRENT_SUPPORTED` |",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(text).code,
      "IMP037_PD_D374_STALE_MANAGED_POSTGRES_CURRENT",
    );
  });

  it("fails CURRENT Managed DigitalOcean PostgreSQL source claim", () => {
    const text = `${validSkeleton}\nEntry source: Managed DigitalOcean PostgreSQL for Layer 1\n`;
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(text).code,
      "IMP037_PD_D374_STALE_MANAGED_DO_POSTGRES_CURRENT",
    );
  });

  it("fails CURRENT managed-backup health AC", () => {
    const text = validSkeleton.replace(
      "PITR-capable recovery-layer health/recovery-point evidence",
      "managed-backup health/recovery point",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(text).code,
      "IMP037_PD_D374_STALE_MANAGED_BACKUP_HEALTH",
    );
  });

  it("fails CURRENT managed/PITR journey discovery wording", () => {
    const text = validSkeleton.replace(
      "PITR-capable continuous recovery vs independent logical backup layers",
      "managed/PITR vs independent logical layers",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(text).code,
      "IMP037_PD_D374_STALE_MANAGED_PITR_DISCOVERY",
    );
  });

  it("passes explicit HISTORICAL Managed PostgreSQL reference", () => {
    const text = `${validSkeleton}\n| Historical Managed PostgreSQL | **HISTORICAL** pre-D-374 ADR-013 |\n`;
    assert.deepEqual(evaluateImp037ProductDefinitionD374CurrentRecoveryRead(text), { ok: true });
    const stripped = stripImp037HistoricalManagedRecoveryAuthority(text);
    assert.doesNotMatch(stripped, /Historical Managed PostgreSQL/);
  });

  it("requires PITR-capable continuous recovery and independent logical backup wording", () => {
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/PITR-capable continuous recovery/g, "continuous recovery"),
      ).code,
      "IMP037_PD_D374_LAYER1_MISSING",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/independent (?:encrypted )?logical backup/gi, "offsite copy"),
      ).code,
      "IMP037_PD_D374_LAYER2_MISSING",
    );
  });

  it("preserves Product Definition APPROVED / Gate PASS and non-advancement", () => {
    const live = livePd();
    assert.deepEqual(evaluateImp037ProductDefinitionD374CurrentRecoveryRead(validSkeleton), { ok: true });
    assert.match(validSkeleton, /"architectureFit":\s*"NOT_PERFORMED"/);
    assert.match(validSkeleton, /"architectureLocked":\s*"NO"/);
    // The live PD records the CURRENT tip (R138 continuation when landed; else R137 post-merge) while keeping APPROVED / Gate PASS and start provenance.
    assert.match(live, /"status":\s*"APPROVED"/);
    assert.match(live, /"productDefinitionGateResult":\s*"PASS"/);
    assert.match(live, /"architectureFit":\s*"PASS"/);
    assert.match(live, /"architectureLocked":\s*"YES"/);
    assert.match(live, /"implementationAuthorized":\s*"YES"/);
    assert.match(live, /"implementationStarted":\s*"YES"/);
    assert.match(live, /GTM-R137|GTM-R138|GTM-R139|GTM-R140|GTM-R141|GTM-R142|GTM-R143|GTM-R144|GTM-R145|GTM-R146|GTM-R147|GTM-R148|GTM-R149/);
    assert.match(live, /STATE-R135|STATE-R136|STATE-R137|STATE-R138|STATE-R139|STATE-R140|STATE-R141|STATE-R142|STATE-R143|STATE-R144|STATE-R145|STATE-R146|STATE-R147/);
    assert.match(live, /GTM-R136/);
    assert.match(live, /STATE-R134/);
    if (/"roadmapVersion":\s*"GTM-R1(?:38|39|40|41|42|43|44|45|46|47|48|49|50|51|52|53|54|55)"/.test(readFileSync("docs/platform/ROADMAP.md", "utf8"))) {
      assert.match(live, /IMP038_ACTIVATED:\s*YES/);
      assert.match(live, /CONTINUATION_EXCEPTION:\s*IMP037_PROVIDER_BLOCKED_TO_IMP038|IMP037_PROVIDER_BLOCKED_TO_IMP038/);
      assert.match(live, /IMP038_ACCEPTANCE_BLOCKED_BY_IMP037:\s*YES/);
    } else {
      assert.doesNotMatch(live, /IMP038_ACTIVATED:\s*YES/);
    }
    assert.match(live, /PITR-capable continuous recovery/);
    assert.match(live, /independent encrypted logical backup|independent logical backup/);
    assert.doesNotMatch(live, /managed-backup health/);
    assert.doesNotMatch(live, /managed\/PITR vs independent/);
    assert.doesNotMatch(
      stripImp037HistoricalManagedRecoveryAuthority(live),
      /Managed DigitalOcean PostgreSQL/,
    );
  });

  it("rejects premature Fit lock / implementation / IMP-038 activation in PD CURRENT read", () => {
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/"architectureLocked": "NO"/, '"architectureLocked": "YES"'),
      ).code,
      "IMP037_PD_D374_ARCHITECTURE_LOCKED",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/"implementationAuthorized": "NO"/, '"implementationAuthorized": "YES"'),
      ).code,
      "IMP037_PD_D374_IMPLEMENTATION_AUTHORIZED",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/"implementationStarted": "NO"/, '"implementationStarted": "YES"'),
      ).code,
      "IMP037_PD_D374_IMPLEMENTATION_STARTED",
    );
    assert.equal(
      evaluateImp037ProductDefinitionD374CurrentRecoveryRead(
        validSkeleton.replace(/IMP038_ACTIVATED: NO/, "IMP038_ACTIVATED: YES"),
      ).code,
      "IMP037_PD_D374_IMP038_ACTIVATED",
    );
  });
});

describe("IMP-037 activated Product Definition dependency authority", () => {
  const validActivatedDependencyRow = `| IMP-036G completion / sequencing | IMP-036G \`COMPLETE_AND_ACCEPTED\`; IMP-037 activation satisfied (\`currentProductSlice = IMP-037\`; \`IMP037_ACTIVATED: YES\`) | SATISFIED — no remaining sequencing blocker to Product Definition Gate evaluation | NONE for activation sequencing; Product Definition Gate remains NOT_PERFORMED; Architecture Fit remains NOT_PERFORMED; implementation remains NOT_AUTHORIZED / NOT_STARTED |`;
  const validActivatedPd = `<!-- governance-meta
{
  "status": "PRE_GATE_DRAFT",
  "imp037Activated": "YES",
  "architectureFit": "NOT_PERFORMED",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO"
}
-->
IMP037_ACTIVATED: YES
ARCHITECTURE_FIT: NOT_PERFORMED
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
${validActivatedDependencyRow}
| Architecture Fit | NOT_PERFORMED | Implementation authorization | Mechanisms unresolved |
`;

  it("passes a valid activated dependency row", () => {
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(validActivatedPd), { ok: true });
  });

  it("passes live IMP-037 Product Definition after activation sequencing correction", () => {
    const live = readFileSync("docs/platform/product/IMP-037/product-definition.md", "utf8");
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(live), { ok: true });
    assert.match(live, /IMP-036G `COMPLETE_AND_ACCEPTED`/);
    assert.match(live, /IMP-037 activation satisfied/);
    assert.match(live, /currentProductSlice = IMP-037/);
    assert.doesNotMatch(live, /IMP-037 remains next \/ unactivated/);
    assert.doesNotMatch(live, /Activation blocked until sequencing permits/);
  });

  it("rejects CURRENT 'IMP-037 remains next / unactivated'", () => {
    const bad = validActivatedPd.replace(
      validActivatedDependencyRow,
      "| IMP-036G completion / sequencing | CURRENT product slice; IMP-037 remains next / unactivated | SATISFIED | NONE |",
    );
    const result = evaluateImp037ActivatedProductDefinitionDependencyAuthority(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_UNACTIVATED");
  });

  it("rejects CURRENT 'Activation blocked until sequencing permits'", () => {
    const bad = validActivatedPd.replace(
      "NONE for activation sequencing; Product Definition Gate remains NOT_PERFORMED; Architecture Fit remains NOT_PERFORMED; implementation remains NOT_AUTHORIZED / NOT_STARTED |",
      "Activation blocked until sequencing permits — out of this PRE-GATE persist task |",
    );
    const result = evaluateImp037ActivatedProductDefinitionDependencyAuthority(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_ACTIVATION_BLOCKED");
  });

  it("rejects CURRENT activation requirement still pending", () => {
    const bad = validActivatedPd.replace(
      validActivatedDependencyRow,
      "| IMP-036G completion / sequencing | IMP-036G COMPLETE_AND_ACCEPTED; currentProductSlice = IMP-037 | Canonical IMP-037 activation still required | NONE |",
    );
    const result = evaluateImp037ActivatedProductDefinitionDependencyAuthority(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP037_PD_STALE_ACTIVATION_PENDING");
  });

  it("passes IMP-036G COMPLETE_AND_ACCEPTED / sequencing SATISFIED", () => {
    assert.match(validActivatedPd, /COMPLETE_AND_ACCEPTED/);
    assert.match(validActivatedPd, /SATISFIED/);
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(validActivatedPd), { ok: true });
  });

  it("keeps Architecture Fit NOT_PERFORMED valid", () => {
    assert.match(validActivatedPd, /Architecture Fit \| NOT_PERFORMED/);
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(validActivatedPd), { ok: true });
  });

  it("keeps implementation unauthorized valid", () => {
    assert.match(validActivatedPd, /IMPLEMENTATION_AUTHORIZED: NO/);
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(validActivatedPd), { ok: true });
  });

  it("allows clearly labelled historical pre-activation wording", () => {
    const historical = `${validActivatedPd}

## Historical pre-activation provenance

Historical pre-activation provenance: IMP-037 remains next / unactivated;
Activation blocked until sequencing permits; Canonical IMP-037 activation still required;
currentProductSlice = NONE.
`;
    assert.deepEqual(evaluateImp037ActivatedProductDefinitionDependencyAuthority(historical), { ok: true });
  });
});

describe("IMP-036G product-slice activation checkpoints", () => {
  const activationBase = {
    roadmapVersion: "GTM-R123",
    stateVersion: "STATE-R121",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "PLANNED",
    imp036gActivated: "YES",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    productDefinition: "NOT_CREATED",
    founderUatRequired: "YES",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: false,
    productDefinitionApproved: false,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    d374Exists: false,
    archR20Exists: false,
  };

  it("preserves GTM-R123 / STATE-R121 activation distinct from later gates", () => {
    assert.deepEqual(evaluateImp036gActivationCheckpoint(activationBase), { ok: true });
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, productDefinitionExists: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, productDefinitionApproved: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, architectureLockedYes: true }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, implementationAuthorizedYes: true }).ok,
      false,
    );
    assert.equal(evaluateImp036gActivationCheckpoint({ ...activationBase, startedYes: true }).ok, false);
    assert.equal(evaluateImp036gActivationCheckpoint({ ...activationBase, acceptedYes: true }).ok, false);
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, currentProductSlice: "NONE" }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, nextProductSlice: "IMP-036G" }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, imp036gActivated: "NO" }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gActivationCheckpoint({ ...activationBase, imp037Activated: "YES" }).ok,
      false,
    );
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R123", "STATE-R121", "imp036gActivation"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R122", "STATE-R120", "imp036fAcceptance"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R123", "STATE-R121", "imp036fAcceptance"), false);
  });
});

describe("IMP-036G Product Definition pre-gate draft checkpoints", () => {
  const draftBase = {
    roadmapVersion: "GTM-R125",
    stateVersion: "STATE-R123",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "PLANNED",
    imp036gActivated: "YES",
    productDefinition: "DRAFT",
    productDefinitionVersion: "PD-IMP-036G-DRAFT-2",
    productDecisions: "RESOLVED",
    productDecisionCount: 7,
    productDefinitionGate: "NOT_PERFORMED",
    architectureFit: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    productDefinitionApproved: false,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    d374Exists: false,
    archR20Exists: false,
  };

  const validUngatedDraft = `<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036G",
  "productDefinitionVersion": "PD-IMP-036G-DRAFT-2",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-16",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp037Activated": "NO"
}
-->

# IMP-036G Product Definition (ungated draft candidate)

Document status: DRAFT
PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2

\`\`\`text
PRE-GATE DRAFT: YES
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT_RESULT: NOT_PERFORMED
IMP036G_ARCHITECTURE_LOCKED: NO
IMP036G_IMPLEMENTATION_AUTHORIZED: NO
IMP036G_STARTED: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
UNRESOLVED_COUNT = 0
PRODUCT_DECISIONS: RESOLVED
PRODUCT_DECISION_COUNT: 7
\`\`\`
`;

  /** Mutate only a governance-meta JSON string value; leave prose markers unchanged. */
  function mutateMetaField(text, key, value) {
    return text.replace(new RegExp(`("${key}"\\s*:\\s*)"[^"]*"`), `$1"${value}"`);
  }

  it("passes GTM-R125 / STATE-R123 with required DRAFT-2 Product Definition present", () => {
    const result = evaluateImp036gProductDefinitionDraftCheckpoint({
      ...draftBase,
      productDefinitionText: validUngatedDraft,
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(evaluateImp036gUngatedProductDefinitionDraftCandidate(validUngatedDraft), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R125", "STATE-R123", "imp036gProductDefinitionDraft"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R124", "STATE-R122", "imp036gProductDefinitionDraft"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R123", "STATE-R121", "imp036gProductDefinitionDraft"), false);
  });

  it("fails when Product Definition file is missing (draft requires file)", () => {
    const result = evaluateImp036gProductDefinitionDraftCheckpoint({
      ...draftBase,
      productDefinitionExists: false,
      productDefinitionText: "",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_DRAFT");
  });

  it("rejects DRAFT candidate that claims Gate Result PASS (DRAFT != APPROVED; NOT_PERFORMED != PASS)", () => {
    const bad = validUngatedDraft.replace("Gate Result: NOT_PERFORMED", "Gate Result: PASS");
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_PREMATURE_GATE_PASS");
  });

  it("rejects DRAFT candidate that claims APPROVED status", () => {
    const bad = validUngatedDraft.replace(/"status": "DRAFT"/, '"status": "APPROVED"').replace(
      "Document status: DRAFT",
      "Document status: APPROVED",
    );
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.match(result.code, /IMP036G_PD_DRAFT_(STATUS|APPROVED_STATUS)/);
  });

  it("rejects architecture locked or architecture fit performed", () => {
    const bad = `${validUngatedDraft}\nIMP036G_ARCHITECTURE_LOCKED: YES\n`;
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_PREMATURE_ARCHITECTURE");
  });

  it("rejects implementation authorized/started (PRODUCT_DEFINITION_EXISTS != IMPLEMENTATION_AUTHORIZED)", () => {
    const bad = `${validUngatedDraft}\nIMP036G_IMPLEMENTATION_AUTHORIZED: YES\n`;
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_PREMATURE_IMPLEMENTATION");
  });

  it("rejects IMP acceptance claim", () => {
    const bad = `${validUngatedDraft}\nIMP036G_ACCEPTED: YES\n`;
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_PREMATURE_ACCEPTANCE");
  });

  it("rejects IMP-037 activation", () => {
    const bad = validUngatedDraft.replace("IMP037_ACTIVATED: NO", "IMP037_ACTIVATED: YES");
    assert.equal(evaluateImp036gUngatedProductDefinitionDraftCandidate(bad).ok, false);
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        imp037Activated: "YES",
      }).ok,
      false,
    );
  });

  it("rejects started / authorized / accepted flags on checkpoint", () => {
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        implementationAuthorizedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        startedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        acceptedYes: true,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        architectureLockedYes: true,
      }).ok,
      false,
    );
  });

  it("rejects canonical governance-meta-only mutations while prose remains valid", () => {
    const cases = [
      ["productDefinitionGateExecution", "PERFORMED", /IMP036G_PD_PREMATURE_GATE_PASS/],
      ["productDefinitionGateResult", "PASS", /IMP036G_PD_PREMATURE_GATE_PASS/],
      ["architectureFitExecution", "PERFORMED", /IMP036G_PD_PREMATURE_ARCHITECTURE/],
      ["architectureFit", "PASS", /IMP036G_PD_PREMATURE_ARCHITECTURE/],
      ["architectureLocked", "YES", /IMP036G_PD_PREMATURE_ARCHITECTURE/],
      ["implementationAuthorized", "YES", /IMP036G_PD_PREMATURE_IMPLEMENTATION/],
      ["implementationStarted", "YES", /IMP036G_PD_PREMATURE_IMPLEMENTATION/],
      ["impAccepted", "YES", /IMP036G_PD_PREMATURE_ACCEPTANCE/],
      ["imp037Activated", "YES", /IMP036G_PD_IMP037_ACTIVATION/],
      ["status", "APPROVED", /IMP036G_PD_DRAFT_APPROVED_STATUS/],
    ];
    for (const [key, value, codePattern] of cases) {
      const bad = mutateMetaField(validUngatedDraft, key, value);
      assert.match(bad, new RegExp(`"${key}"\\s*:\\s*"${value}"`));
      assert.match(bad, /PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED/);
      assert.match(bad, /Gate Result: NOT_PERFORMED/);
      assert.match(bad, /Document status: DRAFT/);
      const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
      assert.equal(result.ok, false, `expected fail for meta.${key}=${value}`);
      assert.match(result.code, codePattern, `unexpected code for meta.${key}=${value}: ${result.code}`);
    }
  });

  it("rejects missing or malformed canonical governance-meta", () => {
    const noMeta = validUngatedDraft.replace(/<!--\s*governance-meta[\s\S]*?-->/, "");
    assert.equal(evaluateImp036gUngatedProductDefinitionDraftCandidate(noMeta).ok, false);
    assert.equal(evaluateImp036gUngatedProductDefinitionDraftCandidate(noMeta).code, "IMP036G_PD_META_MISSING");

    const malformed = validUngatedDraft.replace(
      /<!--\s*governance-meta\s*[\s\S]*?-->/,
      "<!-- governance-meta\n{ not-json\n-->",
    );
    assert.equal(evaluateImp036gUngatedProductDefinitionDraftCandidate(malformed).ok, false);
    assert.equal(evaluateImp036gUngatedProductDefinitionDraftCandidate(malformed).code, "IMP036G_PD_META_MALFORMED");

    const missingKey = validUngatedDraft.replace(/\n\s*"process": "PD-1",/, "");
    const missingKeyResult = evaluateImp036gUngatedProductDefinitionDraftCandidate(missingKey);
    assert.equal(missingKeyResult.ok, false);
    assert.equal(missingKeyResult.code, "IMP036G_PD_META_KEY");
  });

  it("rejects DRAFT-1 version or unresolved decision count > 0", () => {
    const draft1 = validUngatedDraft
      .replaceAll("PD-IMP-036G-DRAFT-2", "PD-IMP-036G-DRAFT-1")
      .replace("UNRESOLVED_COUNT = 0", "UNRESOLVED_COUNT = 7");
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(draft1);
    assert.equal(result.ok, false);
    assert.match(result.code, /IMP036G_PD_(DRAFT_VERSION|UNRESOLVED)/);
  });

  it("rejects missing PRODUCT_DECISIONS RESOLVED markers", () => {
    const bad = validUngatedDraft
      .replace("PRODUCT_DECISIONS: RESOLVED\n", "")
      .replace("PRODUCT_DECISION_COUNT: 7\n", "");
    const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
    assert.equal(result.ok, false);
    assert.match(result.code, /IMP036G_PD_DECISION/);
  });

  it("rejects caller-scoped-sufficient / ≤200 accepted / client-only audit / inspection-only mobile / optional Expire / accepted LWW contradictions", () => {
    const cases = [
      ["caller-scoped projection is accepted as V1 sufficient", /IMP036G_PD_CALLER_SCOPED_SUFFICIENT/],
      ["accepted an explicitly disclosed ≤200-item V1 administration operating boundary", /IMP036G_PD_LIST_LIMIT_ACCEPTED/],
      ["V1 filtering disposition is client-side of authorized list", /IMP036G_PD_CLIENT_AUDIT_FILTER/],
      ["inspection-first fallback is acceptable on small mobile", /IMP036G_PD_MOBILE_INSPECTION_ONLY/],
      ["When Expire is used IF V1 exposes the affordance", /IMP036G_PD_EXPIRE_OPTIONAL/],
      ["accept current last-writer-wins behaviour for IMP-036G V1", /IMP036G_PD_LWW_ACCEPTED/],
    ];
    for (const [phrase, codePattern] of cases) {
      const bad = `${validUngatedDraft}\n${phrase}\n`;
      const result = evaluateImp036gUngatedProductDefinitionDraftCandidate(bad);
      assert.equal(result.ok, false, `expected fail for: ${phrase}`);
      assert.match(result.code, codePattern, `unexpected code for: ${phrase}: ${result.code}`);
    }
  });

  it("rejects checkpoint missing Founder decision markers", () => {
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        productDecisions: "UNRESOLVED",
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gProductDefinitionDraftCheckpoint({
        ...draftBase,
        productDefinitionText: validUngatedDraft,
        productDecisionCount: 0,
      }).ok,
      false,
    );
  });
});

describe("IMP-036G Product Definition Gate PASS checkpoints", () => {
  const gatePassBase = {
    roadmapVersion: "GTM-R126",
    stateVersion: "STATE-R124",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "PLANNED",
    imp036gActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionVersion: "PD-IMP-036G-DRAFT-2",
    productDecisions: "RESOLVED",
    productDecisionCount: 7,
    productDefinitionGate: "PASS",
    architectureFit: "NOT_PERFORMED",
    architectureLocked: "NO",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    architectureLockedYes: false,
    implementationAuthorizedYes: false,
    startedYes: false,
    acceptedYes: false,
    d374Exists: false,
    archR20Exists: false,
  };

  const validApproved = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-036G",
  "productDefinitionVersion": "PD-IMP-036G-DRAFT-2",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-16",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp037Activated": "NO"
}
-->
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-036G-DRAFT-2
PRE-GATE DRAFT: NO
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT_RESULT: NOT_PERFORMED
IMP036G_ARCHITECTURE_LOCKED: NO
IMP036G_IMPLEMENTATION_AUTHORIZED: NO
IMP036G_STARTED: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
GATE_EVALUATED_HEAD = 1fe1737d8f05d6069b2073d9faf1142d21b91970
GATE_EVALUATED_TREE = 25412cbadf224ef709687fe067f2427784a414cc
Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit NOT_PERFORMED; architecture not locked; implementation not authorized)
`;

  it("passes GTM-R126 / STATE-R124 with required APPROVED Product Definition present", () => {
    const result = evaluateImp036gProductDefinitionGatePassCheckpoint({
      ...gatePassBase,
      productDefinitionText: validApproved,
    });
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(evaluateImp036gApprovedProductDefinitionCandidate(validApproved), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R126", "STATE-R124", "imp036gProductDefinitionGatePass"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R125", "STATE-R123", "imp036gProductDefinitionGatePass"), false);
  });

  it("passes when story readiness records Product Definition Gate PASS with Architecture Fit pending", () => {
    const result = evaluateImp036gApprovedProductDefinitionCandidate(validApproved);
    assert.deepEqual(result, { ok: true });
    assert.match(
      validApproved,
      /Readiness:\s*NOT_READY_FOR_IMPLEMENTATION\s*\(Product Definition Gate PASS; Architecture Fit NOT_PERFORMED/,
    );
  });

  it("rejects story readiness that claims Product Definition Gate NOT_PERFORMED", () => {
    const bad = `${validApproved}\nReadiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED)\n`;
    const result = evaluateImp036gApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_STALE_STORY_READINESS_GATE");
  });

  it("rejects story readiness that uses stale gates not performed wording", () => {
    const bad = `${validApproved}\nReadiness: NOT_READY_FOR_IMPLEMENTATION (gates not performed — not because unresolved product decisions)\n`;
    const result = evaluateImp036gApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_STALE_STORY_READINESS_GATES");
  });

  it("rejects approved candidate that retains Gate Result NOT_PERFORMED", () => {
    const bad = validApproved.replace("Gate Result: PASS", "Gate Result: NOT_PERFORMED").replace(
      '"productDefinitionGateResult": "PASS"',
      '"productDefinitionGateResult": "NOT_PERFORMED"',
    );
    const result = evaluateImp036gApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
  });

  it("rejects architecture fit PASS / lock / implementation authorized", () => {
    assert.equal(
      evaluateImp036gApprovedProductDefinitionCandidate(`${validApproved}\nIMP036G_ARCHITECTURE_LOCKED: YES\n`).ok,
      false,
    );
    assert.equal(
      evaluateImp036gProductDefinitionGatePassCheckpoint({
        ...gatePassBase,
        productDefinitionText: validApproved,
        implementationAuthorizedYes: true,
      }).ok,
      false,
    );
  });

  const approvedDependencyTable = `
## 21. Dependencies
| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| Product Definition Gate | PASS / PERFORMED | Satisfied before Architecture Fit | NONE — gate complete; Architecture Fit remains the readiness blocker |
| Architecture Fit / lock | NOT_PERFORMED / NOT_LOCKED | Before implementation authorization | Blocks READY; Fit must determine minimum API/schema for Founder-resolved §25 requirements |
`;

  it("passes when §21 Product Definition Gate dependency row records PASS / PERFORMED", () => {
    const candidate = `${validApproved}${approvedDependencyTable}`;
    const result = evaluateImp036gApprovedProductDefinitionCandidate(candidate);
    assert.deepEqual(result, { ok: true });
    assert.match(candidate, /\|\s*Product Definition Gate\s*\|\s*PASS \/ PERFORMED\s*\|/);
  });

  it("rejects §21 Product Definition Gate dependency row NOT_PERFORMED", () => {
    const bad = `${validApproved}${approvedDependencyTable}`.replace(
      "| Product Definition Gate | PASS / PERFORMED | Satisfied before Architecture Fit | NONE — gate complete; Architecture Fit remains the readiness blocker |",
      "| Product Definition Gate | NOT_PERFORMED | Before Architecture Fit / implementation | Blocks READY |",
    );
    const result = evaluateImp036gApprovedProductDefinitionCandidate(bad);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036G_PD_STALE_DEPENDENCY_GATE");
  });

  it("does not reject Architecture Fit NOT_PERFORMED in §21 after Gate PASS", () => {
    const candidate = `${validApproved}${approvedDependencyTable}`;
    const result = evaluateImp036gApprovedProductDefinitionCandidate(candidate);
    assert.deepEqual(result, { ok: true });
    assert.match(
      candidate,
      /\|\s*Architecture Fit \/ lock\s*\|\s*NOT_PERFORMED \/ NOT_LOCKED\s*\|/,
    );
    assert.match(candidate, /ARCHITECTURE_FIT_EXECUTION:\s*NOT_PERFORMED/);
  });
});

describe("IMP-036G Architecture Lock checkpoints", () => {
  const lockBase = {
    roadmapVersion: "GTM-R127",
    stateVersion: "STATE-R125",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "ARCHITECTURE_LOCKED",
    imp036gActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "NO",
    started: "NO",
    accepted: "NO",
    founderUatRequired: "YES",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validLockedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036G",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "impAccepted": false,
  "schemaChangeRequired": true
}
-->

# IMP-036G

IMP036G_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
EXTEND_EXISTING_ADMIN_EFFECTIVE_PERMISSIONS_READ
BOUNDED_ADMIN_OVERVIEW_COMPOSITION_PROJECTION
AUTHORIZED_SET_CURSOR_CONTINUATION
SERVER_ISSUED_REVISION_CAS
`;

  const validFitPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFit": "PASS",
  "architectureFitExecution": "PERFORMED",
  "architectureLocked": "YES"
}
-->

# IMP-036G Product Definition

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION_AUTHORIZED: NO
IMP036G_STARTED: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
\`\`\`

Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation not authorized)

## Dependencies

| Dependency | Authority | Required before | Unresolved impact |
|---|---|---|---|
| Architecture Fit / lock | PASS / LOCKED | Satisfied before implementation authorization | NONE for Fit/lock — implementation authorization remains separate and NOT_GRANTED |
| Implementation authorization | ROADMAP/STATE | Before coding | NO |
`;

  it("registers GTM-R127 / STATE-R125 as architecture lock only", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gArchitectureLock"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R126", "STATE-R124", "imp036gArchitectureLock"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R126", "STATE-R124", "imp036gProductDefinitionGatePass"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gProductDefinitionGatePass"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gImplementationStart"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gArchitectureLock"), false);
  });

  it("passes valid R127/S125 architecture-lock checkpoint", () => {
    assert.deepEqual(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp036gLockedCapabilityArchitecture(validLockedCapability), { ok: true });
    assert.deepEqual(evaluateImp036gArchitectureLockedProductDefinition(validFitPd), { ok: true });
  });

  it("fails when capability architecture is missing", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        capabilityArtifactExists: false,
        productDefinitionText: validFitPd,
        capabilityText: "",
      }).ok,
      false,
    );
  });

  it("fails when capability remains candidate/DRAFT", () => {
    const draft = validLockedCapability
      .replace('"status": "CURRENT"', '"status": "DRAFT"')
      .replace('"authority": "CAPABILITY_ARCHITECTURE"', '"authority": "CAPABILITY_ARCHITECTURE_CANDIDATE"');
    assert.equal(evaluateImp036gLockedCapabilityArchitecture(draft).ok, false);
  });

  it("fails when capability remains NOT_LOCKED", () => {
    const unlocked = validLockedCapability.replace(
      '"architectureLock": "ARCHITECTURE_LOCKED"',
      '"architectureLock": "NOT_LOCKED"',
    );
    assert.equal(evaluateImp036gLockedCapabilityArchitecture(unlocked).ok, false);
  });

  it("fails when Product Definition still says Architecture Fit NOT_PERFORMED", () => {
    const stale = validFitPd
      .replace('"architectureFit": "PASS"', '"architectureFit": "NOT_PERFORMED"')
      .replace("ARCHITECTURE_FIT: PASS", "ARCHITECTURE_FIT: NOT_PERFORMED");
    assert.equal(evaluateImp036gArchitectureLockedProductDefinition(stale).ok, false);
  });

  it("fails when Product Definition architecture locked NO", () => {
    const stale = validFitPd
      .replace('"architectureLocked": "YES"', '"architectureLocked": "NO"')
      .replace("IMP036G_ARCHITECTURE_LOCKED: YES", "IMP036G_ARCHITECTURE_LOCKED: NO");
    assert.equal(evaluateImp036gArchitectureLockedProductDefinition(stale).ok, false);
  });

  it("fails on ROADMAP/STATE mismatch", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        roadmapVersion: "GTM-R126",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        stateVersion: "STATE-R124",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when implementation authorized YES", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        implementationAuthorized: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    const pdAuthorized = validFitPd.replace(
      "IMP036G_IMPLEMENTATION_AUTHORIZED: NO",
      "IMP036G_IMPLEMENTATION_AUTHORIZED: YES",
    );
    assert.equal(evaluateImp036gArchitectureLockedProductDefinition(pdAuthorized).ok, false);
  });

  it("fails when implementation started YES", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        started: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when IMP-036G accepted YES", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        accepted: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when IMP-037 activated YES", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        imp037Activated: "YES",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when D-374 exists", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        d374Exists: true,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when ARCH-R20 exists", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        archR20Exists: true,
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("fails when stale R126/S124 markers are mixed into R127/S125 facts", () => {
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        architectureLocked: "NO",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        architectureFit: "NOT_PERFORMED",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gArchitectureLockCheckpoint({
        ...lockBase,
        imp036gFormalLifecycle: "PLANNED",
        productDefinitionText: validFitPd,
        capabilityText: validLockedCapability,
      }).ok,
      false,
    );
  });

  it("rejects story readiness that still claims Architecture Fit NOT_PERFORMED", () => {
    const stale = validFitPd.replace(
      "Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation not authorized)",
      "Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit NOT_PERFORMED; architecture not locked; implementation not authorized)",
    );
    assert.equal(evaluateImp036gArchitectureLockedProductDefinition(stale).ok, false);
  });

  it("rejects §21 Architecture Fit / lock dependency that remains NOT_PERFORMED / NOT_LOCKED", () => {
    const stale = validFitPd.replace(
      "| Architecture Fit / lock | PASS / LOCKED | Satisfied before implementation authorization | NONE for Fit/lock — implementation authorization remains separate and NOT_GRANTED |",
      "| Architecture Fit / lock | NOT_PERFORMED / NOT_LOCKED | Before implementation authorization | Blocks READY |",
    );
    assert.equal(evaluateImp036gArchitectureLockedProductDefinition(stale).ok, false);
  });
});

describe("IMP-036G Implementation Start checkpoints", () => {
  const startBase = {
    roadmapVersion: "GTM-R128",
    stateVersion: "STATE-R126",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "NONE",
    currentProductImplementation: "IMP-036G",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
    imp036gActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    accepted: "NO",
    founderUatRequired: "YES",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validStartedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036G",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "AUTHORIZED / STARTED",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true
}
-->

# IMP-036G

IMP036G_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMP036G_IMPLEMENTATION_AUTHORIZED = YES
IMP036G_STARTED = YES
IMP036G_IMPLEMENTATION_COMPLETE = NO
IMP036G_ACCEPTED = NO
IMP036G_FOUNDER_UAT = NOT_PERFORMED
IMP037_ACTIVATED = NO
CANONICAL_ROADMAP_STATE = GTM-R128 / STATE-R126

## 28. Historical GTM-R127 architecture lock provenance (superseded predecessor tip; not CURRENT lifecycle)

Historical GTM-R127 / STATE-R125 record. Preserved for lock provenance only.

CANONICAL_ROADMAP_STATE = GTM-R127 / STATE-R125
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
`;

  const validStartedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "impAccepted": "NO",
  "imp037Activated": "NO"
}
-->

# IMP-036G Product Definition

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION_AUTHORIZED: YES
IMP036G_STARTED: YES
IMP036G_IMPLEMENTATION_COMPLETE: NO
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
CANONICAL_ANCHORS = VISION-1; GTM-R128; STATE-R126; ARCH-R19; DR-15; PD-1
\`\`\`

Readiness: READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED at GTM-R128 / STATE-R126)
`;

  it("registers GTM-R128 / STATE-R126 as implementation start only", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gImplementationStart"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gArchitectureLock"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gImplementationStart"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R127", "STATE-R125", "imp036gArchitectureLock"), true);
  });

  it("passes valid GTM-R128 / STATE-R126 start checkpoint", () => {
    assert.deepEqual(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp036gStartedCapabilityArchitecture(validStartedCapability), { ok: true });
    assert.deepEqual(evaluateImp036gStartedProductDefinition(validStartedPd), { ok: true });
  });

  it("fails when ROADMAP/STATE versions are not the start checkpoint", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        roadmapVersion: "GTM-R127",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        stateVersion: "STATE-R125",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });

  it("fails when implementation is not authorized or not started", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        implementationAuthorized: "NO",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        started: "NO",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });

  it("fails when formal lifecycle is not IMPLEMENTATION_IN_PROGRESS", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        imp036gFormalLifecycle: "ARCHITECTURE_LOCKED",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });

  it("fails when Current Product Implementation is not IMP-036G", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        currentProductImplementation: "NONE",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });

  it("fails when acceptance or IMP-037 activation is claimed", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        accepted: "YES",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        imp037Activated: "YES",
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });

  it("allows clearly labelled historical GTM-R127 lock provenance in the capability artifact", () => {
    assert.match(validStartedCapability, /CANONICAL_ROADMAP_STATE = GTM-R127 \/ STATE-R125/);
    assert.deepEqual(evaluateImp036gStartedCapabilityArchitecture(validStartedCapability), { ok: true });
  });

  it("rejects CURRENT capability claims that implementation is unauthorized or unstarted", () => {
    const stale = validStartedCapability.replace(
      "IMP036G_STARTED = YES",
      "IMP036G_STARTED = NO",
    );
    assert.equal(evaluateImp036gStartedCapabilityArchitecture(stale).ok, false);
    const staleMeta = validStartedCapability.replace(
      '"implementationStarted": true',
      '"implementationStarted": false',
    );
    assert.equal(evaluateImp036gStartedCapabilityArchitecture(staleMeta).ok, false);
  });

  it("rejects capability claims of completion, acceptance, or IMP-037 activation", () => {
    assert.equal(
      evaluateImp036gStartedCapabilityArchitecture(
        validStartedCapability.replace("IMP036G_ACCEPTED = NO", "IMP036G_ACCEPTED = YES"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gStartedCapabilityArchitecture(
        validStartedCapability.replace("IMP037_ACTIVATED = NO", "IMP037_ACTIVATED = YES"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gStartedCapabilityArchitecture(
        validStartedCapability.replace(
          "IMP036G_IMPLEMENTATION_COMPLETE = NO",
          "IMP036G_IMPLEMENTATION_COMPLETE = YES",
        ),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gStartedCapabilityArchitecture(
        validStartedCapability.replace(
          "CANONICAL_ROADMAP_STATE = GTM-R128 / STATE-R126",
          "CANONICAL_ROADMAP_STATE = GTM-R128 / STATE-R126\nIMP-036G: COMPLETE_AND_ACCEPTED",
        ),
      ).ok,
      false,
    );
  });

  it("requires preserved Architecture Fit provenance in the started capability artifact", () => {
    const missingProvenance = validStartedCapability.replace(
      "ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f\n",
      "",
    );
    assert.equal(evaluateImp036gStartedCapabilityArchitecture(missingProvenance).ok, false);
  });

  it("rejects started Product Definition that still claims NOT_READY / NOT_AUTHORIZED", () => {
    const stale = validStartedPd.replace(
      "Readiness: READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED at GTM-R128 / STATE-R126)",
      "Readiness: NOT_READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation not authorized)",
    );
    assert.equal(evaluateImp036gStartedProductDefinition(stale).ok, false);
  });

  it("requires started Product Definition to keep APPROVED / Gate PASS / Fit PASS / LOCKED", () => {
    assert.equal(
      evaluateImp036gStartedProductDefinition(
        validStartedPd.replace("Gate Result: PASS", "Gate Result: NOT_PERFORMED"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gStartedProductDefinition(
        validStartedPd.replace('"architectureLocked": "YES"', '"architectureLocked": "NO"'),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gStartedProductDefinition(
        validStartedPd.replace('"implementationAuthorized": "YES"', '"implementationAuthorized": "NO"'),
      ).ok,
      false,
    );
  });

  it("fails when D-374 or ARCH-R20 is created during implementation start", () => {
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        d374Exists: true,
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationStartCheckpoint({
        ...startBase,
        archR20Exists: true,
        productDefinitionText: validStartedPd,
        capabilityText: validStartedCapability,
      }).ok,
      false,
    );
  });
});


describe("IMP-036G Implementation Completion checkpoints", () => {
  const completionBase = {
    roadmapVersion: "GTM-R129",
    stateVersion: "STATE-R127",
    acceptedThrough: "IMP-036F",
    currentProductSlice: "IMP-036G",
    nextProductSlice: "IMP-037",
    pendingAcceptance: "IMP-036G",
    currentProductImplementation: "IMP-036G",
    imp036f: "COMPLETE_AND_ACCEPTED",
    imp036gFormalLifecycle: "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
    imp036gActivated: "YES",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "NO",
    founderUatRequired: "YES",
    founderUat: "NOT_PERFORMED",
    imp037Activated: "NO",
    architectureVersion: "ARCH-R19",
    decisionRegisterVersion: "DR-15",
    productDeliveryVersion: "PD-1",
    productDefinitionExists: true,
    capabilityArtifactExists: true,
    d374Exists: false,
    archR20Exists: false,
  };

  const validCompletedCapability = `<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036G",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFitResult": "PASS",
  "implementation": "AUTHORIZED / STARTED / COMPLETE",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "impAccepted": false,
  "founderUATRequired": true,
  "schemaChangeRequired": true
}
-->

# IMP-036G

IMP-036G: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP036G_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f
ARCHITECTURE_FIT_EVALUATED_TREE = c4ef07bbd00bbbb964a9551b1d04d2fe140170b3
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = e8eb68ebf06aea7ab50305f8e8700d450f9c5e9fd1ae24c91d4d81cfd157eb2c
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMP036G_IMPLEMENTATION_AUTHORIZED = YES
IMP036G_STARTED = YES
IMP036G_IMPLEMENTATION_COMPLETE = YES
IMP036G_ACCEPTED = NO
IMP036G_FOUNDER_UAT = NOT_PERFORMED
IMP037_ACTIVATED = NO
CANONICAL_ROADMAP_STATE = GTM-R129 / STATE-R127

## 28. Historical GTM-R128 implementation start provenance (superseded predecessor tip; not CURRENT lifecycle)

Historical GTM-R128 / STATE-R126 record. Preserved for start provenance only.

CANONICAL_ROADMAP_STATE = GTM-R128 / STATE-R126
IMP036G_IMPLEMENTATION_COMPLETE = NO
IMP-036G: IMPLEMENTATION_IN_PROGRESS
`;

  const validCompletedPd = `<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "impAccepted": "NO",
  "imp037Activated": "NO"
}
-->

# IMP-036G Product Definition

Document status: APPROVED

\`\`\`text
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
IMP036G_ARCHITECTURE_LOCKED: YES
IMP036G_IMPLEMENTATION_AUTHORIZED: YES
IMP036G_STARTED: YES
IMP036G_IMPLEMENTATION_COMPLETE: YES
IMP036G_ACCEPTED: NO
IMP037_ACTIVATED: NO
CANONICAL_ANCHORS = VISION-1; GTM-R129; STATE-R127; ARCH-R19; DR-15; PD-1
\`\`\`

Readiness: READY_FOR_IMPLEMENTATION (Product Definition Gate PASS; Architecture Fit PASS; architecture LOCKED; implementation AUTHORIZED / STARTED / COMPLETE at GTM-R129 / STATE-R127)
`;

  const validCompletedProductIndex = `# Product artifacts

| Artifact | Owns |
|---|---|
| [IMP-036G Product Definition](./IMP-036G/product-definition.md) | Product Definition = APPROVED (\`PD-IMP-036G-DRAFT-2\`); Implementation = AUTHORIZED / STARTED / COMPLETE / \`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\` (ROADMAP/STATE remain lifecycle authority; not accepted) |
| [IMP-037 Product Definition](./IMP-037/product-definition.md) | \`PD-IMP-037-DRAFT-1\`; **PRE-GATE DRAFT**; **IMP037_ACTIVATED: NO**; Implementation = NOT_AUTHORIZED / NOT_STARTED |

IMP-036G has an **APPROVED** Product Definition. Implementation = AUTHORIZED / STARTED / COMPLETE / \`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE\`; not accepted.
`;

  const validManualValidation = `# IMP-036G manual technical validation

\`\`\`text
OVERALL_RESULT: PASS
\`\`\`

## Candidate

\`\`\`text
MERGED_MAIN: c35c9eab6a30ec6ce745cefd75c523181326f360
TREE:        266fe3b07811f6942e76cac155d58ba07daabe56
\`\`\`

\`\`\`text
VALIDATED_IMPLEMENTATION_CANDIDATE_SHA:  c35c9eab6a30ec6ce745cefd75c523181326f360
VALIDATED_IMPLEMENTATION_CANDIDATE_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56
CURRENT_MAIN_AT_EVIDENCE_PERSISTENCE:    129d4541237be2a227899ae288c299e768824db9
\`\`\`

| Field | Recorded value |
|---|---|
| Candidate SHA | \`c35c9eab6a30ec6ce745cefd75c523181326f360\` |
| Candidate tree | \`266fe3b07811f6942e76cac155d58ba07daabe56\` |
| Browser | Chrome latest / Edge latest |
| OS | Windows 11 |
| Viewport(s) | Desktop 1920x1080; small-mobile 375x667 @ 100% zoom |
| Assistive technology | NVDA / Narrator |
| Tester | Ashutosh |
| Date | 2026-09-18 |
| Manual keyboard result | PASS |
| Dialog / focus result | PASS |
| Desktop high-consequence actions | PASS |
| Visible focus result | PASS |
| Labels / semantics result | PASS |
| AT sampling result | PASS |
| Small-mobile result | PASS |
| Defects / observations | NONE |
| Overall result | PASS |

## Keyboard

| Journey | Result (\`PASS\` / \`DEFECT\` / \`NOT_PERFORMED\`) | Notes |
|---|---|---|
| Enter Admin without mouse | PASS | |
| Traverse Overview and primary IA | PASS | |
| Organization resource list / detail / form | PASS | |
| Workforce membership list / detail | PASS | |
| Access / effective permissions | PASS | |
| Audit | PASS | |
| System operational status | PASS | |
| All mandatory high-consequence actions remain keyboard reachable | PASS | |

## Dialog / focus

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | PASS | |
| Suspend membership | PASS | |
| Revoke membership | PASS | |
| Expire invited membership | PASS | |
| Grant role | PASS | |
| Revoke role | PASS | |

## Visible focus

| Surface | Result | Notes |
|---|---|---|
| Navigation | PASS | |
| Buttons | PASS | |
| Links | PASS | |
| Form inputs | PASS | |
| Pagination / load-more | PASS | |
| Dialogs | PASS | |

## Labels / semantics

| Check | Result | Notes |
|---|---|---|
| Form fields have usable names | PASS | |
| Headings are coherent | PASS | |
| Main navigation is understandable | PASS | |
| Status is not communicated only by colour | PASS | |
| Errors are understandable | PASS | |
| Success feedback is perceivable | PASS | |

## Assistive-technology sampling

| Sampled journey | Result | Notes |
|---|---|---|
| Admin Overview | PASS | |
| One resource edit | PASS | |
| One destructive confirmation | PASS | |
| Membership detail | PASS | |
| Effective Permissions | PASS | |
| Audit filters | PASS | |
| System status | PASS | |

\`\`\`text
SCREEN_READER_USED: NVDA / Narrator
BROWSER: Chrome latest / Edge latest
OS: Windows 11
CANDIDATE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360
DATE: 2026-09-18
\`\`\`

## Responsive / small-mobile functional parity

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | PASS | |
| Suspend membership | PASS | |
| Revoke membership | PASS | |
| Expire invited membership | PASS | |
| Grant role | PASS | |
| Revoke role | PASS | |

\`\`\`text
SMALL_MOBILE_VIEWPORT: 375x667 @ 100% zoom
\`\`\`

## Defects / observations

NONE
`;

  completionBase.productIndexText = validCompletedProductIndex;
  completionBase.manualValidationText = validManualValidation;

  it("registers GTM-R129 / STATE-R127 as implementation completion only", () => {
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R129", "STATE-R127", "imp036gCompletion"), true);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R129", "STATE-R127", "imp036gImplementationStart"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gCompletion"), false);
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R128", "STATE-R126", "imp036gImplementationStart"), true);
  });

  it("passes valid GTM-R129 / STATE-R127 completion checkpoint", () => {
    assert.deepEqual(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }),
      { ok: true },
    );
    assert.deepEqual(evaluateImp036gCompletedCapabilityArchitecture(validCompletedCapability), { ok: true });
    assert.deepEqual(evaluateImp036gCompletedProductDefinition(validCompletedPd), { ok: true });
  });

  it("fails when ROADMAP/STATE versions are not the completion checkpoint", () => {
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        roadmapVersion: "GTM-R128",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        stateVersion: "STATE-R126",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
  });

  it("fails when pendingAcceptance is not IMP-036G", () => {
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        pendingAcceptance: "NONE",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
  });

  it("fails when implementation is not complete", () => {
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        implementationComplete: "NO",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        imp036gFormalLifecycle: "IMPLEMENTATION_IN_PROGRESS",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
  });

  it("fails when acceptance or IMP-037 activation is claimed", () => {
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        accepted: "YES",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        founderUat: "PASS",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        imp037Activated: "YES",
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
  });

  it("allows clearly labelled historical GTM-R128 start provenance in the capability artifact", () => {
    assert.match(validCompletedCapability, /CANONICAL_ROADMAP_STATE = GTM-R128 \/ STATE-R126/);
    assert.deepEqual(evaluateImp036gCompletedCapabilityArchitecture(validCompletedCapability), { ok: true });
  });

  it("rejects CURRENT capability claims that remain start-only / incomplete", () => {
    const stale = validCompletedCapability.replace(
      "IMP036G_IMPLEMENTATION_COMPLETE = YES",
      "IMP036G_IMPLEMENTATION_COMPLETE = NO",
    );
    assert.equal(evaluateImp036gCompletedCapabilityArchitecture(stale).ok, false);
    const staleMeta = validCompletedCapability.replace(
      '"implementation": "AUTHORIZED / STARTED / COMPLETE"',
      '"implementation": "AUTHORIZED / STARTED"',
    );
    assert.equal(evaluateImp036gCompletedCapabilityArchitecture(staleMeta).ok, false);
    const staleLifecycle = validCompletedCapability.replace(
      "IMP-036G: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
      "IMP-036G: IMPLEMENTATION_IN_PROGRESS",
    );
    assert.equal(evaluateImp036gCompletedCapabilityArchitecture(staleLifecycle).ok, false);
  });

  it("rejects capability claims of acceptance or IMP-037 activation", () => {
    assert.equal(
      evaluateImp036gCompletedCapabilityArchitecture(
        validCompletedCapability.replace("IMP036G_ACCEPTED = NO", "IMP036G_ACCEPTED = YES"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gCompletedCapabilityArchitecture(
        validCompletedCapability.replace("IMP037_ACTIVATED = NO", "IMP037_ACTIVATED = YES"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gCompletedCapabilityArchitecture(
        validCompletedCapability.replace(
          "CANONICAL_ROADMAP_STATE = GTM-R129 / STATE-R127",
          "CANONICAL_ROADMAP_STATE = GTM-R129 / STATE-R127\nIMP-036G: COMPLETE_AND_ACCEPTED",
        ),
      ).ok,
      false,
    );
  });

  it("requires preserved Architecture Fit provenance in the completed capability artifact", () => {
    const missingProvenance = validCompletedCapability.replace(
      "ARCHITECTURE_FIT_EVALUATED_HEAD = 386a245cde223d87c19742753130113b21b4bb2f\n",
      "",
    );
    assert.equal(evaluateImp036gCompletedCapabilityArchitecture(missingProvenance).ok, false);
  });

  it("rejects completed Product Definition that still claims COMPLETE = NO", () => {
    const stale = validCompletedPd.replace(
      "IMP036G_IMPLEMENTATION_COMPLETE: YES",
      "IMP036G_IMPLEMENTATION_COMPLETE: NO",
    );
    assert.equal(evaluateImp036gCompletedProductDefinition(stale).ok, false);
  });

  it("requires completed Product Definition to keep APPROVED / Gate PASS / Fit PASS / LOCKED and R129/S127 anchors", () => {
    assert.equal(
      evaluateImp036gCompletedProductDefinition(
        validCompletedPd.replace("Gate Result: PASS", "Gate Result: NOT_PERFORMED"),
      ).ok,
      false,
    );
    assert.equal(
      evaluateImp036gCompletedProductDefinition(
        validCompletedPd.replaceAll("GTM-R129", "GTM-R128").replaceAll("STATE-R127", "STATE-R126"),
      ).ok,
      false,
    );
  });

  it("fails when D-374 or ARCH-R20 is created during implementation completion", () => {
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        d374Exists: true,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        archR20Exists: true,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
      }).ok,
      false,
    );
  });

  it("requires the product index to record IMP-036G IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE", () => {
    assert.deepEqual(evaluateImp036gCompletedProductIndex(validCompletedProductIndex), { ok: true });
    assert.deepEqual(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        productIndexText: validCompletedProductIndex,
      }),
      { ok: true },
    );
  });

  it("rejects a missing product index at the R129/S127 completion checkpoint", () => {
    assert.equal(evaluateImp036gCompletedProductIndex("").ok, false);
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        productIndexText: "",
      }).code,
      "IMP036G_PRODUCT_INDEX_ABSENT",
    );
  });

  it("requires the live product index to record IMP-036G COMPLETE_AND_ACCEPTED after acceptance", () => {
    const liveIndex = readFileSync(new URL("../docs/platform/product/README.md", import.meta.url), "utf8");
    assert.match(liveIndex, /IMP-036G Product Definition/);
    assert.match(liveIndex, /COMPLETE_AND_ACCEPTED/);
    assert.match(liveIndex, /Founder UAT PASS/);
    assert.match(liveIndex, /IMP-040 Product Definition/);
    assert.match(liveIndex, /PD-IMP-040-DRAFT-1/);
    assert.match(liveIndex, /IMP040_ACTIVATED: NO/);
    assert.doesNotMatch(liveIndex, /Implementation = AUTHORIZED \/ STARTED \/ COMPLETE \/ `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`/);
    assert.doesNotMatch(liveIndex, /not accepted; Founder UAT NOT_PERFORMED/);
    // Completion-era index evaluator remains valid against completion stubs, not the live accepted tip.
    assert.deepEqual(evaluateImp036gCompletedProductIndex(validCompletedProductIndex), { ok: true });
    const mixedStale = validCompletedProductIndex.replace(
      "Implementation = AUTHORIZED / STARTED / COMPLETE / `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; not accepted.",
      "Implementation = AUTHORIZED / STARTED / `IMPLEMENTATION_IN_PROGRESS`; not accepted.",
    );
    assert.equal(evaluateImp036gCompletedProductIndex(mixedStale).code, "IMP036G_PRODUCT_INDEX_STALE");
  });


  it("passes recorded IMP-036G manual technical validation evidence", () => {
    assert.deepEqual(evaluateImp036gManualTechnicalValidation(validManualValidation), { ok: true });
    const liveManual = readFileSync(
      new URL("../tests/administration/imp036g-manual-validation.md", import.meta.url),
      "utf8",
    );
    assert.deepEqual(evaluateImp036gManualTechnicalValidation(liveManual), { ok: true });
  });

  it("rejects missing, NOT_PERFORMED, DEFECTS, or wrong-candidate manual validation at R129/S127", () => {
    assert.equal(evaluateImp036gManualTechnicalValidation(null).code, "IMP036G_MANUAL_VALIDATION_ABSENT");
    assert.equal(evaluateImp036gManualTechnicalValidation("").code, "IMP036G_MANUAL_VALIDATION_ABSENT");
    assert.equal(
      evaluateImp036gManualTechnicalValidation(
        validManualValidation.replace("OVERALL_RESULT: PASS", "OVERALL_RESULT: NOT_PERFORMED"),
      ).code,
      "IMP036G_MANUAL_VALIDATION_NOT_PERFORMED",
    );
    assert.equal(
      evaluateImp036gManualTechnicalValidation(
        validManualValidation.replace("OVERALL_RESULT: PASS", "OVERALL_RESULT: DEFECTS"),
      ).code,
      "IMP036G_MANUAL_VALIDATION_DEFECTS",
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: validManualValidation.replaceAll(
          "c35c9eab6a30ec6ce745cefd75c523181326f360",
          "0000000000000000000000000000000000000000",
        ),
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: validManualValidation.replaceAll(
          "266fe3b07811f6942e76cac155d58ba07daabe56",
          "1111111111111111111111111111111111111111",
        ),
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: validManualValidation.replace(
          "Manual keyboard result | PASS",
          "Manual keyboard result | NOT_PERFORMED",
        ),
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: validManualValidation.replace(
          "AT sampling result | PASS",
          "AT sampling result | NOT_PERFORMED",
        ),
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: validManualValidation.replace(
          "Small-mobile result | PASS",
          "Small-mobile result | NOT_PERFORMED",
        ),
      }).ok,
      false,
    );
    assert.equal(
      evaluateImp036gImplementationCompletionCheckpoint({
        ...completionBase,
        productDefinitionText: validCompletedPd,
        capabilityText: validCompletedCapability,
        manualValidationText: null,
      }).ok,
      false,
    );
  });

  it("does not require IMP-037 activation in the completed product index", () => {
    assert.match(validCompletedProductIndex, /IMP037_ACTIVATED: NO/);
    assert.deepEqual(evaluateImp036gCompletedProductIndex(validCompletedProductIndex), { ok: true });
  });
});

describe("IMP-036H acceptance checkpoint (GTM-R147 / STATE-R145)", () => {
  const acceptanceBase = {
    roadmapVersion: "GTM-R147",
    stateVersion: "STATE-R145",
    acceptedThrough: "IMP-036H",
    currentProductSlice: "NONE",
    nextProductSlice: "IMP-036I",
    pendingAcceptance: "NONE",
    gtmBoundary: "IMP-040",
    programPause: "PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED",
    programPauseAuthority: "D-377",
    imp036g: "COMPLETE_AND_ACCEPTED",
    imp036h: "COMPLETE_AND_ACCEPTED",
    architectureLocked: "YES",
    implementationAuthorized: "YES",
    started: "YES",
    implementationComplete: "YES",
    accepted: "YES",
    founderUat: "PASS",
    formalAcceptance: "ACCEPTED",
    independentTechnicalAcceptance: "PASS",
    productDefinition: "APPROVED",
    productDefinitionGate: "PASS",
    architectureFit: "PASS",
    imp036iActivated: "NO",
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    productDeliveryVersion: "PD-1",
    artifact: true,
    founderUatPass: true,
    imp036iActivatedYes: false,
    archR23Exists: false,
    dr21Exists: false,
    acceptedYes: true,
  };

  it("passes valid GTM-R147 / STATE-R145 acceptance checkpoint", () => {
    assert.equal(evaluateImp036hAcceptanceCheckpoint(acceptanceBase).ok, true);
  });

  it("fails when IMP-036I is activated", () => {
    const result = evaluateImp036hAcceptanceCheckpoint({ ...acceptanceBase, imp036iActivatedYes: true });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036H_IMP036I_ACTIVATION");
  });

  it("fails when currentProductSlice is not NONE", () => {
    const result = evaluateImp036hAcceptanceCheckpoint({
      ...acceptanceBase,
      currentProductSlice: "IMP-036H",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036H_ACCEPTANCE");
  });

  it("rejects ACCEPTED=YES with FOUNDER_UAT!=PASS", () => {
    const result = evaluateImp036hAcceptanceCheckpoint({
      ...acceptanceBase,
      founderUat: "NOT_PERFORMED",
      founderUatPass: false,
    });
    assert.equal(result.ok, false);
  });

  it("recognizes GTM-R147 / STATE-R145 as imp036hAcceptance not completion", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R147", "STATE-R145", "imp036hAcceptance"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R147", "STATE-R145", "imp036hImplementationComplete"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R146", "STATE-R144", "imp036hImplementationComplete"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R146", "STATE-R144", "imp036hAcceptance"),
      false,
    );
  });

  it("validates live accepted capability and product definition authorities", () => {
    const capabilityText = readFileSync(
      "docs/platform/capabilities/IMP-036H-customer-pickup-takeaway.md",
      "utf8",
    );
    const productDefinitionText = readFileSync(
      "docs/platform/product/IMP-036H/product-definition.md",
      "utf8",
    );
    assert.deepEqual(evaluateImp036hAcceptanceArtifact(capabilityText), { ok: true });
    assert.deepEqual(evaluateImp036hAcceptedProductDefinition(productDefinitionText), { ok: true });
  });
});

describe("IMP-036I Architecture Fit candidate authority (D-379/D-380 PROPOSED)", () => {
  const baseDocs = () => ({
    architectureVersion: "ARCH-R22",
    decisionRegisterVersion: "DR-20",
    decisionText: [
      "## 2. Current Global Decisions",
      "",
      "| ID | Title | Scope | Status | Record | Supersedes | Superseded By | Governs |",
      "|---|---|---|---|---|---|---|---|",
      "| D-379 | Scheduled Timing | IMP-036I | PROPOSED | ADR-019 | — | — | ARCH-G29 |",
      "| D-380 | Delivery Finality | Delivery | PROPOSED | ADR-020 | — | — | ARCH-G30 |",
      "",
      "## 3. Current Capability / Cross-Capability Decisions",
    ].join("\n"),
    capabilityText: [
      "ARCHITECTURE_FIT_EXECUTION = NOT_PERFORMED",
      "ARCHITECTURE_FIT_RESULT = NOT_PERFORMED",
      "IMPLEMENTATION_AUTHORIZED = NO",
      "D379_STATUS = PROPOSED",
      "D380_STATUS = PROPOSED",
      "ADR019_STATUS = Proposed",
      "ADR020_STATUS = Proposed",
    ].join("\n"),
    adr019Text: "Status: Proposed\n\n# ADR-019\n\n**Proposed** (2026-09-25).",
    adr020Text: "Status: Proposed\n\n# ADR-020\n\n**Proposed** (2026-09-25).",
  });

  it("accepts PROPOSED D-379/D-380 candidate authority", () => {
    assert.deepEqual(evaluateImp036IArchitectureFitCandidateAuthority(baseDocs()), { ok: true });
  });

  it("rejects capability D379_STATUS CURRENT while register D-379 stays PROPOSED", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace(
      "D379_STATUS = PROPOSED",
      "D379_STATUS = CURRENT",
    );
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D379_PREMATURE_CURRENT");
    assert.match(result.message, /D-379 cannot be CURRENT|must not claim D-379 CURRENT/);
    assert.match(result.message, /Architecture Fit PASS \+ lock persistence/);
  });

  it("rejects capability missing D379_STATUS PROPOSED candidate marker", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace("D379_STATUS = PROPOSED\n", "");
    assert.equal(/D379_STATUS\s*=\s*PROPOSED/.test(docs.capabilityText), false);
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D379_CANDIDATE_MARKER");
  });

  it("rejects repository-native D-379 CURRENT row while D379_STATUS stays PROPOSED", () => {
    const docs = baseDocs();
    docs.capabilityText += "\n| **D-379** — Scheduled Fulfilment Timing | **CURRENT** |";
    assert.match(docs.capabilityText, /D379_STATUS = PROPOSED/);
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D379_PREMATURE_CURRENT");
  });

  it("rejects repository-native D-380 CURRENT row while D380_STATUS stays PROPOSED", () => {
    const docs = baseDocs();
    docs.capabilityText += "\n| **D-380** — Delivery Finality | **CURRENT** |";
    assert.match(docs.capabilityText, /D380_STATUS = PROPOSED/);
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D380_PREMATURE_CURRENT");
  });

  it("rejects D-380 CURRENT before Fit lock", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace(
      "| D-380 | Delivery Finality | Delivery | PROPOSED | ADR-020 | — | — | ARCH-G30 |",
      "| D-380 | Delivery Finality | Delivery | CURRENT | ADR-020 | — | — | ARCH-G30 |",
    );
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D380_PREMATURE_CURRENT");
  });

  it("rejects ADR-020 Accepted before Fit lock", () => {
    const docs = baseDocs();
    docs.adr020Text = "Status: Accepted\n\n# ADR-020\n\n**Accepted**.";
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ADR020_PREMATURE_ACCEPTED");
  });

  it("rejects ARCH-R23 as CURRENT architecture tip", () => {
    const docs = baseDocs();
    docs.architectureVersion = "ARCH-R23";
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_FIT_CANDIDATE_ARCH");
  });

  it("rejects premature Fit PASS in capability candidate", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace(
      "ARCHITECTURE_FIT_RESULT = NOT_PERFORMED",
      "ARCHITECTURE_FIT_RESULT = PASS",
    );
    const result = evaluateImp036IArchitectureFitCandidateAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_FIT_PREMATURE_PASS");
  });

  it("keeps candidate fixtures distinct from live locked authority", () => {
    const live = evaluateImp036IArchitectureFitCandidateAuthority({
      architectureVersion: "ARCH-R23",
      decisionRegisterVersion: "DR-21",
      decisionText: readFileSync("docs/platform/decision-register.md", "utf8"),
      capabilityText: readFileSync("docs/platform/capabilities/IMP-036I-scheduled-fulfilment.md", "utf8"),
      adr019Text: readFileSync(
        "docs/platform/decisions/ADR-019-scheduled-fulfilment-timing-and-execution.md",
        "utf8",
      ),
      adr020Text: readFileSync(
        "docs/platform/decisions/ADR-020-delivery-successful-completion-finality.md",
        "utf8",
      ),
    });
    assert.equal(live.ok, false);
  });
});

describe("IMP-036I architecture lock authority (D-379/D-380 CURRENT)", () => {
  const baseDocs = () => ({
    architectureVersion: "ARCH-R23",
    decisionRegisterVersion: "DR-21",
    decisionText: [
      "## 2. Current Global Decisions",
      "",
      "| ID | Title | Scope | Status | Record | Supersedes | Superseded By | Governs |",
      "|---|---|---|---|---|---|---|---|",
      "| D-378 | Mode | Pickup | AMENDED | ADR-018 | — | — | ARCH-G28 |",
      "| D-379 | Scheduled Timing | IMP-036I | CURRENT | ADR-019 | — | — | ARCH-G29 |",
      "| D-380 | Delivery Finality | Delivery | CURRENT | ADR-020 | — | — | ARCH-G30 |",
      "",
      "## 3. Current Capability / Cross-Capability Decisions",
    ].join("\n"),
    architectureText: "ARCH-G28 mode\nARCH-G29 timing\nARCH-G30 finality\n",
    capabilityText: [
      "IMP036I_ARCHITECTURE_FIT = PASS",
      "IMP036I_ARCHITECTURE_LOCKED = YES",
      "IMP036I_IMPLEMENTATION_AUTHORIZED = NO",
      "IMPLEMENTATION_AUTHORIZED = NO",
      "IMPLEMENTATION_STARTED = NO",
    ].join("\n"),
    adr019Text: "Status: Accepted\n\n# ADR-019\n",
    adr020Text: "Status: Accepted\n\n# ADR-020\n",
  });

  it("recognizes GTM-R154 / STATE-R152 as architecture lock, not gate pass", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R154", "STATE-R152", "imp036iArchitectureLock"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R154", "STATE-R152", "imp036iProductDefinitionGatePass"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R153", "STATE-R151", "imp036iArchitectureLock"),
      false,
    );
  });

  it("accepts the coherent locked combination", () => {
    assert.deepEqual(evaluateImp036iArchitectureLockAuthority(baseDocs()), { ok: true });
  });

  it("rejects D-379 PROPOSED after lock", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace(
      "| D-379 | Scheduled Timing | IMP-036I | CURRENT | ADR-019 | — | — | ARCH-G29 |",
      "| D-379 | Scheduled Timing | IMP-036I | PROPOSED | ADR-019 | — | — | ARCH-G29 |",
    );
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D379_LOCKED");
  });

  it("rejects D-380 PROPOSED after lock", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace(
      "| D-380 | Delivery Finality | Delivery | CURRENT | ADR-020 | — | — | ARCH-G30 |",
      "| D-380 | Delivery Finality | Delivery | PROPOSED | ADR-020 | — | — | ARCH-G30 |",
    );
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D380_LOCKED");
  });

  it("rejects ADR-019 Proposed after lock", () => {
    const docs = baseDocs();
    docs.adr019Text = "Status: Proposed\n\n# ADR-019\n";
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ADR019_ACCEPTED");
  });

  it("rejects ADR-020 Proposed after lock", () => {
    const docs = baseDocs();
    docs.adr020Text = "Status: Proposed\n\n# ADR-020\n";
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ADR020_ACCEPTED");
  });

  it("rejects ARCH-R22 after lock", () => {
    const docs = baseDocs();
    docs.architectureVersion = "ARCH-R22";
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ARCH_R23");
  });

  it("rejects Fit NOT_PERFORMED with CURRENT decisions", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace(
      "IMP036I_ARCHITECTURE_FIT = PASS",
      "IMP036I_ARCHITECTURE_FIT = NOT_PERFORMED",
    );
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_FIT_LOCKED");
  });

  it("rejects Fit PASS while architecture remains unlocked", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace(
      "IMP036I_ARCHITECTURE_LOCKED = YES",
      "IMP036I_ARCHITECTURE_LOCKED = NO",
    );
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_LOCK_YES");
  });

  it("rejects implementation authorization at lock persistence", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText
      .replace("IMP036I_IMPLEMENTATION_AUTHORIZED = NO", "IMP036I_IMPLEMENTATION_AUTHORIZED = YES")
      .replace("IMPLEMENTATION_AUTHORIZED = NO", "IMPLEMENTATION_AUTHORIZED = YES");
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_IMPLEMENTATION_STILL_UNAUTHORIZED");
  });

  it("rejects unqualified CURRENT D-378 once D-379 is CURRENT", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace(
      "| D-378 | Mode | Pickup | AMENDED | ADR-018 | — | — | ARCH-G28 |",
      "| D-378 | Mode | Pickup | CURRENT | ADR-018 | — | — | ARCH-G28 |",
    );
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D378_AMENDED");
  });

  it("rejects a lock missing ARCH-G29", () => {
    const docs = baseDocs();
    docs.architectureText = "ARCH-G28 mode\nARCH-G30 finality\n";
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ARCH_G29");
  });

  it("rejects a lock missing ARCH-G30", () => {
    const docs = baseDocs();
    docs.architectureText = "ARCH-G28 mode\nARCH-G29 timing\n";
    const result = evaluateImp036iArchitectureLockAuthority(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ARCH_G30");
  });

  it("validates live authorized architecture artifacts", () => {
    const result = evaluateImp036iImplementationAuthorization({
      architectureVersion: "ARCH-R23",
      decisionRegisterVersion: "DR-21",
      decisionText: readFileSync("docs/platform/decision-register.md", "utf8"),
      architectureText: readFileSync("docs/platform/ARCHITECTURE.md", "utf8"),
      capabilityText: readFileSync("docs/platform/capabilities/IMP-036I-scheduled-fulfilment.md", "utf8"),
      adr019Text: readFileSync(
        "docs/platform/decisions/ADR-019-scheduled-fulfilment-timing-and-execution.md",
        "utf8",
      ),
      adr020Text: readFileSync(
        "docs/platform/decisions/ADR-020-delivery-successful-completion-finality.md",
        "utf8",
      ),
      productDefinitionText: readFileSync("docs/platform/product/IMP-036I/product-definition.md", "utf8"),
      executionPlanText: readFileSync("docs/platform/product/IMP-036I/implementation-plan.md", "utf8"),
    });
    assert.deepEqual(result, { ok: true });
  });
});

function imp036iScenarioId(index) {
  return `AC-036I-${String(index).padStart(3, "0")}`;
}

function imp036iScenarioRange(start, end) {
  return Array.from({ length: end - start + 1 }, (_, offset) => imp036iScenarioId(start + offset));
}

function imp036iAuthorizedExecutionPlan(primary = {}) {
  const tranche2 = primary.tranche2 ?? [
    ...imp036iScenarioRange(1, 20),
    ...imp036iScenarioRange(22, 30),
    imp036iScenarioId(40),
    imp036iScenarioId(41),
    imp036iScenarioId(50),
    imp036iScenarioId(51),
  ];
  const tranche3 = primary.tranche3 ?? [
    imp036iScenarioId(21),
    ...imp036iScenarioRange(31, 38),
    ...imp036iScenarioRange(42, 44),
    imp036iScenarioId(48),
    imp036iScenarioId(49),
    imp036iScenarioId(52),
    ...imp036iScenarioRange(56, 58),
  ];
  const tranche4 = primary.tranche4 ?? [
    imp036iScenarioId(39),
    ...imp036iScenarioRange(45, 47),
    ...imp036iScenarioRange(53, 55),
    ...imp036iScenarioRange(59, 66),
  ];
  return [
    "IMPLEMENTATION_EXECUTION_PLAN",
    '"implementationAuthorized": true',
    '"implementationStarted": false',
    "IMPLEMENTATION_AUTHORIZED = YES",
    "IMPLEMENTATION_STARTED = NO",
    "IMPLEMENTATION_COMPLETE = NO",
    "IMP036I_ACCEPTED = NO",
    "FORMAL_LIFECYCLE = ARCHITECTURE_LOCKED",
    "PRODUCTION_CUTOVER_AUTHORIZED = NO",
    "FOUNDER_UAT = NOT_PERFORMED",
    "US-036I-001",
    "US-036I-016",
    "BR-036I-001",
    "BR-036I-019",
    "FD-036I-01",
    "FD-036I-22",
    "D-379",
    "D-380",
    "ARCH-G29",
    "ARCH-G30",
    "TRANCHE_1",
    "TRANCHE_2",
    "TRANCHE_3",
    "TRANCHE_4",
    "TRANCHE_5",
    `TRANCHE_2_PRIMARY_ACS = ${tranche2.join(", ")}`,
    `TRANCHE_3_PRIMARY_ACS = ${tranche3.join(", ")}`,
    `TRANCHE_4_PRIMARY_ACS = ${tranche4.join(", ")}`,
    `TRANCHE_5_PRIMARY_ACS = INTEGRATION_REPROOF, ${imp036iScenarioRange(1, 66).join(", ")}`,
  ].join("\n");
}

describe("IMP-036I implementation authorization persistence", () => {
  const baseDocs = () => ({
    architectureVersion: "ARCH-R23",
    decisionRegisterVersion: "DR-21",
    decisionText: [
      "## 2. Current Global Decisions",
      "",
      "| ID | Title | Scope | Status | Record | Supersedes | Superseded By | Governs |",
      "|---|---|---|---|---|---|---|---|",
      "| D-378 | Mode | Pickup | AMENDED | ADR-018 | — | — | ARCH-G28 |",
      "| D-379 | Scheduled Timing | IMP-036I | CURRENT | ADR-019 | — | — | ARCH-G29 |",
      "| D-380 | Delivery Finality | Delivery | CURRENT | ADR-020 | — | — | ARCH-G30 |",
      "",
      "## 3. Current Capability / Cross-Capability Decisions",
    ].join("\n"),
    architectureText: "ARCH-G28 mode\nARCH-G29 timing\nARCH-G30 finality\n",
    capabilityText: [
      "IMP036I_ARCHITECTURE_FIT = PASS",
      "IMP036I_ARCHITECTURE_LOCKED = YES",
      "IMP036I_IMPLEMENTATION_AUTHORIZED = YES",
      "IMPLEMENTATION_AUTHORIZED = YES",
      "IMPLEMENTATION_STARTED = NO",
      "IMPLEMENTATION_COMPLETE = NO",
      "IMP_ACCEPTED = NO",
    ].join("\n"),
    adr019Text: "Status: Accepted\n\n# ADR-019\n",
    adr020Text: "Status: Accepted\n\n# ADR-020\n",
    productDefinitionText: [
      '"implementationAuthorized": "YES"',
      '"implementationStarted": "NO"',
      '"implementationComplete": "NO"',
      '"imp036iImplementationComplete": "NO"',
      '"impAccepted": "NO"',
    ].join("\n"),
    executionPlanText: imp036iAuthorizedExecutionPlan(),
  });

  it("recognizes GTM-R155 / STATE-R153 as authorization, not architecture lock", () => {
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R155", "STATE-R153", "imp036iImplementationAuthorization"),
      true,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R155", "STATE-R153", "imp036iArchitectureLock"),
      false,
    );
    assert.equal(
      isSupportedImp030GovernanceCheckpoint("GTM-R154", "STATE-R152", "imp036iImplementationAuthorization"),
      false,
    );
  });

  it("accepts authorized and not-started authority", () => {
    assert.deepEqual(evaluateImp036iImplementationAuthorization(baseDocs()), { ok: true });
  });

  it("rejects implementationAuthorized NO after authorization persistence", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText
      .replace("IMP036I_IMPLEMENTATION_AUTHORIZED = YES", "IMP036I_IMPLEMENTATION_AUTHORIZED = NO")
      .replace("IMPLEMENTATION_AUTHORIZED = YES", "IMPLEMENTATION_AUTHORIZED = NO");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_IMPLEMENTATION_AUTHORIZED_YES");
  });

  it("rejects implementationStarted YES in the authorization-only state", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace("IMPLEMENTATION_STARTED = NO", "IMPLEMENTATION_STARTED = YES");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_START");
  });

  it("rejects implementationComplete YES", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace("IMPLEMENTATION_COMPLETE = NO", "IMPLEMENTATION_COMPLETE = YES");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_COMPLETE");
  });

  it("rejects accepted YES", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace("IMP_ACCEPTED = NO", "IMP_ACCEPTED = YES");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_ACCEPTANCE");
  });

  it("rejects architecture no longer locked", () => {
    const docs = baseDocs();
    docs.capabilityText = docs.capabilityText.replace(
      "IMP036I_ARCHITECTURE_LOCKED = YES",
      "IMP036I_ARCHITECTURE_LOCKED = NO",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_LOCK_YES");
  });

  it("rejects D-379 not CURRENT", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace("| CURRENT | ADR-019 |", "| PROPOSED | ADR-019 |");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D379_LOCKED");
  });

  it("rejects D-380 not CURRENT", () => {
    const docs = baseDocs();
    docs.decisionText = docs.decisionText.replace("| CURRENT | ADR-020 |", "| PROPOSED | ADR-020 |");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_D380_LOCKED");
  });

  it("rejects ARCH not R23", () => {
    const docs = baseDocs();
    docs.architectureVersion = "ARCH-R22";
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_ARCH_R23");
  });

  it("rejects Product Definition implementationComplete YES", () => {
    const docs = baseDocs();
    docs.productDefinitionText = docs.productDefinitionText.replace(
      '"implementationComplete": "NO"',
      '"implementationComplete": "YES"',
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_COMPLETE");
  });

  it("rejects Product Definition imp036iImplementationComplete YES", () => {
    const docs = baseDocs();
    docs.productDefinitionText = docs.productDefinitionText.replace(
      '"imp036iImplementationComplete": "NO"',
      '"imp036iImplementationComplete": "YES"',
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_COMPLETE");
  });

  it("rejects execution plan IMPLEMENTATION_AUTHORIZED NO", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace(
      "IMPLEMENTATION_AUTHORIZED = YES",
      "IMPLEMENTATION_AUTHORIZED = NO",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_IMPLEMENTATION_AUTHORIZED_YES");
  });

  it("rejects execution plan IMPLEMENTATION_STARTED YES", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace(
      "IMPLEMENTATION_STARTED = NO",
      "IMPLEMENTATION_STARTED = YES",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_START");
  });

  it("rejects execution plan IMPLEMENTATION_COMPLETE YES", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace(
      "IMPLEMENTATION_COMPLETE = NO",
      "IMPLEMENTATION_COMPLETE = YES",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_COMPLETE");
  });

  it("rejects execution plan IMP036I_ACCEPTED YES", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace("IMP036I_ACCEPTED = NO", "IMP036I_ACCEPTED = YES");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_PREMATURE_ACCEPTANCE");
  });

  it("rejects execution plan formal lifecycle other than ARCHITECTURE_LOCKED", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace(
      "FORMAL_LIFECYCLE = ARCHITECTURE_LOCKED",
      "FORMAL_LIFECYCLE = IMPLEMENTATION_IN_PROGRESS",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_LOCK_YES");
  });

  it("rejects a primary-owner set missing AC-036I-003", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace("AC-036I-003, ", "");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_EXECUTION_PLAN_AC_MISSING");
  });

  it("rejects a primary-owner set missing AC-036I-040", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace("AC-036I-040, ", "");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_EXECUTION_PLAN_AC_MISSING");
  });

  it("rejects a primary-owner set missing AC-036I-041", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace("AC-036I-041, ", "");
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_EXECUTION_PLAN_AC_MISSING");
  });

  it("rejects AC-036I-021 assigned to both Tranche 2 and Tranche 3", () => {
    const docs = baseDocs();
    docs.executionPlanText = docs.executionPlanText.replace(
      "TRANCHE_2_PRIMARY_ACS = ",
      "TRANCHE_2_PRIMARY_ACS = AC-036I-021, ",
    );
    const result = evaluateImp036iImplementationAuthorization(docs);
    assert.equal(result.ok, false);
    assert.equal(result.code, "IMP036I_EXECUTION_PLAN_AC_DUPLICATE");
  });

  it("accepts the corrected primary mapping and ignores Tranche 5 re-proof", () => {
    assert.deepEqual(evaluateImp036iImplementationAuthorization(baseDocs()), { ok: true });
  });
});

