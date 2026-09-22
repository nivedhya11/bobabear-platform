---
Status: SUPPORTING — IMP-038 Acceptance Pack exception register pointer
Authority: capability §16.1; §15 Secure SDLC
Compliance claim: NONE
Principle: NO EXCEPTION WITHOUT AUTHORITY (+ expiry)
---

# Exception register (Acceptance Pack)

## Canonical vulnerability exceptions

Machine-parsed SCA / Secure SDLC exceptions live in the canonical register:

→ [`../vulnerability-exception-register.md`](../vulnerability-exception-register.md)

```text
CANONICAL_PATH: docs/platform/security/vulnerability-exception-register.md
PACK_ROLE: POINTER + PACK-LEVEL SCHEMA
DO_NOT_DUPLICATE_ACTIVE_ROWS: YES
```

That register owns Active exceptions table schema (`id`, `package/cve`, `severity`,
`owner`, `rationale`, `authority`, `compensating_controls`, `retest_date`, `expiry`).

## Pack-level exception schema (non-SCA)

Use this table for Acceptance Pack exceptions that are **not** npm-audit SCA rows
(for example temporary CSP allowlist exceptions, deferred control waivers with Founder
authority). Empty body = no pack-level exceptions.

| id | control_id | severity | owner | rationale | authority | compensating_controls | retest_date | expiry | status |
|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — |

```text
ACTIVE_PACK_EXCEPTIONS: NONE
UNRESOLVED_CRITICAL_AT_ACCEPTANCE: ZERO
KNOWN_EXPLOITABLE_HIGH: NO_SILENT_ACCEPTANCE
```

## Residual HIGH requiring Founder authority note

If the threat model records residual **HIGH**, the Founder authority note must appear
in [`threat-model.md`](./threat-model.md) and optionally as a dated pack-level exception
row above. Residual **CRITICAL** must remain **ZERO**.
