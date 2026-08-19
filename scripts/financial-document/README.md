# Financial Document operator commands

## Missing Receipt Voucher recovery

```text
npm run financial-document:recover-missing-receipt-vouchers
npm run financial-document:recover-missing-receipt-vouchers -- --cursor=<paymentId>
npm run financial-document:recover-missing-receipt-vouchers -- --limit=25
```

### What this repairs

After Payment success is committed, automatic RECEIPT_VOUCHER issuance runs
outside the Payment transaction. If that post-commit step fails (missing
issuer profile, numbering series, transient error, process crash), Payment
remains `SUCCEEDED` and no Receipt Voucher may exist.

This command is the operational catch-up path: it scans for Payments with
`status=SUCCEEDED` that lack an `ISSUED` `RECEIPT_VOUCHER` and retries
issuance via `recoverMissingReceiptVouchersBatch`.

### Authority

- Payment `SUCCEEDED` remains authoritative financial truth.
- Recovery authority is durable database state (succeeded Payment + missing
  Receipt Voucher), not process-local memory.
- Safe and idempotent to rerun; repeated runs do not allocate a second
  statutory number for the same Payment logical issuance key.
- Not scheduled automatically (same operator model as `order:recover-missing`
  / D-362).

### Production configuration required

Successful issuance still requires:

- an effective issuer profile with `issuancePolicy=uninvoiced_advance` and
  `enableReceiptVoucher=true`
- a RECEIPT_VOUCHER numbering series for the applicable Indian financial year

## Missing Tax Invoice recovery

```text
npm run financial-document:recover-missing-tax-invoices
npm run financial-document:recover-missing-tax-invoices -- --cursor=<orderId>
npm run financial-document:recover-missing-tax-invoices -- --limit=25
```

### What this repairs

After Order fulfillment is committed, automatic TAX_INVOICE issuance runs
outside the Order fulfillment transaction. If that post-commit step fails
(missing issuer profile, numbering series, transient error, process crash),
Order remains `FULFILLED` and no Tax Invoice may exist.

This command is the operational catch-up path: it scans for Orders with
`status=FULFILLED` that lack an `ISSUED` `TAX_INVOICE` and retries issuance
via `recoverMissingTaxInvoicesBatch`.

### Authority

- Order `FULFILLED` remains authoritative fulfillment/business truth.
- Recovery authority is durable database state (fulfilled Order + missing
  Tax Invoice), not process-local memory.
- Safe and idempotent to rerun; repeated runs do not allocate a second
  statutory number for the same Order logical issuance key
  (`order:<orderId>:TAX_INVOICE`).
- Does not mutate an existing Receipt Voucher.
- Not scheduled automatically (same operator model as Receipt Voucher recovery
  / D-362).

### Production configuration required

Successful issuance still requires:

- an effective issuer profile with `issuancePolicy=uninvoiced_advance` and
  `enableTaxInvoice=true`
- a TAX_INVOICE numbering series for the applicable Indian financial year

## Manual signed-PDF operator workflow (D-367 MVP)

```text
npm run fd:signing -- pending
npm run fd:signing -- export --financial-document-id <id> --out <path>
npm run fd:signing -- upload --financial-document-id <id> --file <path> \
  --signer-profile-id <id> --signed-at <ISO> --signature-profile <value> \
  --attest-signed-artifact
```

### What this does

Attended/manual launch path: export the unsigned statutory PDF, have an authorised human sign
externally, upload the exact signed bytes with operator attestation.

- BOBA performs no cryptographic signing and does not integrate DSC / eSign / ESP / HSM / PFX.
- Durable store is PostgreSQL BYTEA (`putImmutable` / `getExact`).
- Checks are PDF-container validation and SHA-256 byte integrity — not cryptographic signature
  verification.
- Customer download of required documents waits until `SignatureArtifact.status=SIGNED`.
- Payment / Order / Refund commercial truth is never rolled back because signing is pending or
  fails.

### Production configuration required

- a real production `AuthorisedSignerProfile`
- production issuer profile / numbering already required by issuance above
- production signing provider is intentionally **not** configured; attended external signing is
  the MVP launch mechanism

Do not fabricate signer/GST/numbering values merely to make acceptance green.

Authority: [`docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](../../docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md)
(D-367). Operating constraints:
[`docs/platform/accepted-foundation-operating-rules.md`](../../docs/platform/accepted-foundation-operating-rules.md).
