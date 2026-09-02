-- IMP-036C — outlet delivery fee policy (distance bands + free-delivery threshold).
-- Business configuration only; amounts are not seeded here.

ALTER TABLE app.outlet_serviceability_configs
  ADD COLUMN IF NOT EXISTS delivery_fee_bands jsonb,
  ADD COLUMN IF NOT EXISTS free_delivery_subtotal_threshold_paise bigint;

ALTER TABLE app.outlet_serviceability_configs
  ADD CONSTRAINT outlet_serviceability_configs_delivery_fee_bands_shape_check
  CHECK (
    delivery_fee_bands IS NULL
    OR jsonb_typeof(delivery_fee_bands) = 'array'
  );

ALTER TABLE app.outlet_serviceability_configs
  ADD CONSTRAINT outlet_serviceability_configs_free_delivery_threshold_positive_check
  CHECK (
    free_delivery_subtotal_threshold_paise IS NULL
    OR free_delivery_subtotal_threshold_paise >= 0
  );
