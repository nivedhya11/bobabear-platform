# Observability runbook (IMP-036)

Provider-neutral launch support for BOBA Bear Platform services.

## Health endpoints

| Endpoint | Process | Meaning |
|---|---|---|
| `GET /health/live` | all Node services | Process is running |
| `GET /health/ready` | all Node services | Dependency readiness |

Ready response shape:

```json
{ "ok": true, "checks": { "database": "ok" } }
```

When a check fails, `ok` is `false` and HTTP status is `503`. Operations and customer-commerce may
also include `worker:*` checks for in-process processors.

Customer-auth adds `otpProvider: ok|failed`.

## Structured logs

- JSON lines to stdout
- Level from `BOBA_BEAR_LOG_LEVEL` (`debug`, `info`, `warn`, `error`)
- Safe HTTP fields only: `requestId`, `operation`, `safeOutcomeCode`, `httpStatus`, `durationMs`
- Sensitive metadata is redacted via shared config/observability redaction helpers

Correlate using response header `X-Request-ID` (server-generated; client values are ignored) and
optional `X-Correlation-ID` echo.

## Operational status API (operations process)

`GET /api/operations/v1/operational-status`

Requirements:

- Valid workforce session (`boba-workforce.session_token`)
- Existing `order.read` permission

Read-only response includes:

- `service` name and `uptimeSeconds`
- in-process `metrics` snapshot (`http.requests.total`, etc.)
- `workers` health snapshots (`name`, `running`, `stopped`, optional `lastTickAt`)
- `queues` backlog counts (notification outbox pending, notification review required, payment inbox
  pending/processing, refund reconciliation backlog)

Never exposes secrets, tokens, or raw provider payloads.

## Queue visibility

| Field | Meaning |
|---|---|
| `notificationOutboxPending` | Notification-owned outbox rows pending/processing |
| `notificationReviewRequired` | Notification requests requiring operator review |
| `paymentInboxPending` | Payment provider inbox rows awaiting processing |
| `paymentInboxProcessing` | Payment inbox rows currently leased |
| `refundReconciliationBacklog` | Non-terminal refunds (`ACCEPTED`, `PENDING`, `INDETERMINATE`) |

Counts are read-only `SELECT COUNT(*)` projections; they do not mutate business state.

## Launch checklist

1. Confirm `/health/ready` returns `ok: true` for operations, customer-commerce, customer-auth, and
   workforce-auth.
2. Tail structured logs and verify only allowlisted fields appear.
3. With an authorized workforce session, call operational status and confirm queue counts move under
   load without secret leakage.
4. Record repository path, branch, HEAD, and working-tree fingerprint with acceptance evidence.
