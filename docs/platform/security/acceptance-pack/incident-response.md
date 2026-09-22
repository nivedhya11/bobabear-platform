---
Status: SUPPORTING — Internal incident response pack / templates
Authority: US-IMP-038-008; FD-038-03; CERT-In readiness
Compliance claim: NONE
---

# Incident response (internal pack)

```text
INTERNAL_INCIDENT_RESPONSE_V1: REQUIRED
REGULATOR_CUSTOMER_NOTIFICATION_TEMPLATES: PREPARED
ACTUAL_EXTERNAL_NOTIFICATION: LEGAL_TRIGGER_DEPENDENT
COMPLIANCE_CLAIMS: NONE
```

## 1. Severity triage (internal)

| Severity | Examples | Initial response SLA (ops target) |
|---|---|---|
| Sev-1 | Confirmed payment auth bypass; raw card data exposure; mass account takeover | Immediate bridge; Founder notify |
| Sev-2 | Auth abuse campaign; privilege escalation attempt with evidence; origin bypass in production | Same business day |
| Sev-3 | Single-outlet authz bug; CSP report spike; dependency Critical with exploit | Scheduled fix + exception if needed |
| Sev-4 | Informational scanner noise; failed login noise within limits | Monitor |

## 2. Roles (fill at runtime)

| Role | Name / contact | Backup |
|---|---|---|
| Incident commander | _TBD — ops lead_ | |
| Security technical lead | _TBD_ | |
| Communications (internal) | _TBD_ | |
| Legal counsel trigger | _TBD_ — **required before external notify** | |
| Founder | Human R3 | |

## 3. Evidence preservation checklist

1. Record wall-clock time (UTC) and approx host time sync status.
2. Capture request IDs, order/payment IDs, workforce user IDs — **not** OTPs, passwords, MFA secrets, PAN/CVV, webhook secrets.
3. Preserve relevant DB rows / audit events; avoid destructive “cleanup” until legal/ops clear.
4. Export redacted logs; scrub Authorization headers and provider secrets.
5. Fingerprint candidate if relating to a deployed artifact (`HEAD` + working-tree fingerprint when applicable).

## 4. Internal timeline template

```text
INCIDENT_ID:
DETECTED_AT_UTC:
DETECTED_BY:
SUMMARY:
AFFECTED_SURFACES:
CUSTOMER_IMPACT:
CONTAINMENT_ACTIONS:
ERADICATION_ACTIONS:
RECOVERY_ACTIONS:
EXTERNAL_NOTIFY_CONSIDERED: YES|NO
LEGAL_TRIGGER_REVIEW: PENDING|APPROVED_SEND|DO_NOT_SEND
CLOSE_AT_UTC:
POSTMORTEM_LINK:
```

## 5. External notification

```text
ACTUAL_EXTERNAL_NOTIFICATION: LEGAL_TRIGGER_DEPENDENT
```

Draft customer/regulator wording may be prepared here for legal review, but **sending**
requires explicit legal/Founder authorization. Applicability of CERT-In / DPDP breach
triggers remains [`legal-review-topics.md`](./legal-review-topics.md) topics 5–6–9.

### Draft stub (do not send without legal)

> We are investigating a security incident affecting [surface]. We will provide verified
> updates. This message is not a regulatory determination.

## 6. Tabletop

Record exercises under gap `GAP-TABLETOP-001`. First exercise: [`tabletop-tt-038-001.md`](./tabletop-tt-038-001.md) (`CLOSED`).
