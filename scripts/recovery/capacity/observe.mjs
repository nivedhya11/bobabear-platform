/**
 * Capacity / cost observation reporting (IMP-037 §16 capacity).
 * Measures Layer 1 base, WAL, Layer 2, version-history estimate, projected 35-day footprint.
 * STORAGE_CAPACITY_VALIDATED remains "NO" unless options.validated === true from a qualifying env.
 * No hardcoded pricing.
 */
/**
 * @param {object} [options]
 * @param {number} [options.layer1BaseBytes]
 * @param {number} [options.layer1WalBytes]
 * @param {number} [options.layer2Bytes]
 * @param {number} [options.versionHistoryBytes]
 * @param {number} [options.retentionDays]
 * @param {boolean} [options.validated]
 * @returns {object}
 */
export function buildCapacityObservationReport(options = {}) {
  const retentionDays =
    typeof options.retentionDays === "number" && Number.isFinite(options.retentionDays)
      ? options.retentionDays
      : 35;
  const layer1BaseBytes = nonNeg(options.layer1BaseBytes);
  const layer1WalBytes = nonNeg(options.layer1WalBytes);
  const layer2Bytes = nonNeg(options.layer2Bytes);
  const versionHistoryBytes = nonNeg(options.versionHistoryBytes);

  const currentTotalBytes = layer1BaseBytes + layer1WalBytes + layer2Bytes + versionHistoryBytes;
  const projected35DayBytes = projectFootprint({
    layer1BaseBytes,
    layer1WalBytes,
    layer2Bytes,
    versionHistoryBytes,
    retentionDays,
  });

  return {
    operationType: "capacity-observe",
    retentionDays,
    layers: {
      layer1BaseBytes,
      layer1WalBytes,
      layer2Bytes,
      versionHistoryEstimateBytes: versionHistoryBytes,
    },
    currentTotalBytes,
    projected35DayFootprintBytes: projected35DayBytes,
    STORAGE_CAPACITY_VALIDATED: options.validated === true ? "YES" : "NO",
    pricing: null,
    note:
      options.validated === true
        ? "Capacity figures marked validated by qualifying environment observation"
        : "STORAGE_CAPACITY_VALIDATED=NO — observation only; no hardcoded pricing",
  };
}

/**
 * @param {object} input
 * @returns {number}
 */
function projectFootprint(input) {
  // Conservative linear projection across the retention window without inventing pricing.
  const dailyLogical = input.layer2Bytes > 0 ? input.layer2Bytes : 0;
  const dailyWal = input.layer1WalBytes > 0 ? input.layer1WalBytes : 0;
  const base = input.layer1BaseBytes;
  const versions = input.versionHistoryBytes;
  const days = input.retentionDays;
  return Math.round(base + versions + dailyLogical * Math.min(days, 35) + dailyWal * Math.min(days, 35));
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function nonNeg(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

/** CLI / operator alias for {@link buildCapacityObservationReport}. */
export function observeCapacity(options = {}) {
  return buildCapacityObservationReport(options);
}
