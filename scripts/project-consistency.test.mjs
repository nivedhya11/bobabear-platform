import assert from "node:assert/strict";
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
  isAllowedGovernanceVersion,
  isSupportedImp030GovernanceCheckpoint,
  isValidCanonicalRevision,
  runProjectConsistency,
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
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
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

  const roadmapText = readInProgressGovernance("docs/platform/ROADMAP.md");
  const stateText = readInProgressGovernance("docs/platform/STATE.md");
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
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
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
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
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
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

const IMP032_033_FACTS_RE = /IMP-032:[^\n]*\n(?:(?:IMP-032_|IMP032_|IMP_032_|FOUNDER_UAT)[^\n]*\n)*IMP-033:[^\n]*\n(?:IMP-033_[^\n]*\n)*/;

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
    .replace(/Pending Acceptance:\s*(?:NONE|IMP-032)[^\n]*/g, `Pending Acceptance:    ${pendingAcceptance}`)
    .replace(/Pending Acceptance:\s+(?:NONE|IMP-032)[^\n]*/g, `Pending Acceptance:             ${pendingAcceptance}`)
    .replace(/acceptedThrough:\s*IMP-03[12]\b/g, `acceptedThrough: ${acceptedThrough.split(" — ")[0]}`)
    .replace(/currentProductSlice:\s*IMP-03[123]\b/g, `currentProductSlice: ${currentSlice.split(" — ")[0]}`)
    .replace(/nextProductSlice:\s*IMP-03[234][^\n]*/g, `nextProductSlice: ${nextSlice}`)
    .replace(/pendingAcceptance:\s*(?:NONE|IMP-032)\b/g, `pendingAcceptance: ${pendingAcceptance}`);
  if (stateActivity) {
    updated = updated.replace(/Current Governance Activity:\s*[^\n]*/g, `Current Governance Activity:    ${stateActivity}`);
  }
  updated = updated.replace(IMP032_033_FACTS_RE, facts);
  if (section.includes("## 2. Current Position")) {
    updated = updated
      .replace(/IMP-032 is `COMPLETE_AND_ACCEPTED`[\s\S]*?(?=```text\nIMP-030:)/, `${blurb ?? "Historical IMP-032 checkpoint fixture."}\n\n`)
      .replaceAll("`IMP-032_ACCEPTED: YES`", "`IMP-032_ACCEPTED: NO`");
  }
  updated = updated.replace(/IMP-033 is `ARCHITECTURE_IN_PROGRESS`[^\n]*/g, "IMP-033 remains `PLANNED / NOT_ACTIVATED`.");
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

  const roadmapText = readFileSync(new URL("../docs/platform/ROADMAP.md", import.meta.url), "utf8");
  const stateText = readFileSync(new URL("../docs/platform/STATE.md", import.meta.url), "utf8");
  const decisionText = readFileSync(new URL("../docs/platform/decision-register.md", import.meta.url), "utf8");
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
  const roadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8")
    .replaceAll("GTM-R87", "GTM-R86")
    .replaceAll("STATE-R85", "STATE-R84")
    .replaceAll("Current Product Slice: IMP-033", "Current Product Slice: NONE")
    .replaceAll("currentProductSlice: IMP-033", "currentProductSlice: NONE")
    .replaceAll("IMP-033: ARCHITECTURE_IN_PROGRESS", "IMP-033: PLANNED / NOT_ACTIVATED")
    .replaceAll("| IMP-033 | Notification Foundation | ARCHITECTURE_IN_PROGRESS |", "| IMP-033 | Notification Foundation | PLANNED |");
  const stateText = readFileSync("docs/platform/STATE.md", "utf8")
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

  const capabilityText = readFileSync("docs/platform/capabilities/IMP-033-notification-foundation.md", "utf8");
  const roadmapText = readFileSync("docs/platform/ROADMAP.md", "utf8");
  const stateText = readFileSync("docs/platform/STATE.md", "utf8");

  it("supports only the R87/S85 activation checkpoint", () => {
    assert.deepEqual(evaluateImp033ArchitectureActivationCheckpoint(activation), { ok: true });
    assert.equal(isSupportedImp030GovernanceCheckpoint("GTM-R87", "STATE-R85", "imp033Activation"), true);
  });

  it("accepts live draft artifact and current documents", () => {
    assert.deepEqual(evaluateImp033ArchitectureDraftArtifact(capabilityText), { ok: true });
    assert.match(roadmapText, /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/);
    assert.match(stateText, /IMP-033:\s*ARCHITECTURE_IN_PROGRESS/);
  });
});
