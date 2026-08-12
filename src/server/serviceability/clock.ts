/**
 * Trusted clock for Serviceability evaluation (IMP-019).
 * Production uses wall clock; tests inject a fixed instant.
 */
export type ServiceabilityClock = Readonly<{
  now(): Date;
}>;

export const systemServiceabilityClock: ServiceabilityClock = Object.freeze({
  now(): Date {
    return new Date();
  },
});

export function fixedServiceabilityClock(instant: Date): ServiceabilityClock {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error("fixedServiceabilityClock requires a valid Date.");
  }
  const frozen = new Date(instant.getTime());
  return Object.freeze({
    now(): Date {
      return new Date(frozen.getTime());
    },
  });
}
