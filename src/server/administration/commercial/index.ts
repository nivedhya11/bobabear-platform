/** IMP-036F F6A commercial composition barrel. */
import "server-only";

export type {
  CommercialActivityDomain,
  CommercialActivityEvent,
  CompositionProjectionState,
  DiagnosisSignal,
  DiagnosisSignalKey,
  DiagnosisSignalOutcome,
  VerificationOutcome,
} from "./types";

export { inspectCommercialOffering } from "./inspection";
export type { CommercialInspectionResult } from "./inspection";

export { diagnoseSellability, diagnosisSignalKeys } from "./diagnosis";
export type { SellabilityDiagnosisResult } from "./diagnosis";

export { verifyCustomerCommercialTruth } from "./verification";
export type { CustomerVerificationResult } from "./verification";

export { composeCommercialActivity } from "./activity";
export type { CommercialActivityResult } from "./activity";

export { assertCommercialUuid, requireAnyBrandCommercialRead } from "./soft-auth";
