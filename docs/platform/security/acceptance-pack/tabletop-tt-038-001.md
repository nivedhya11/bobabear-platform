---
Status: SUPPORTING — Incident tabletop exercise record (IMP-038 PROVE)
Authority: US-IMP-038-008/018; incident-response.md; CERT-In readiness (no compliance claim)
Compliance claim: NONE
---

# Incident tabletop exercise record

```text
GAP-TABLETOP-001: CLOSED_AS_OF_THIS_EXERCISE
COMPLIANCE_CLAIMS: NONE
ACTUAL_EXTERNAL_NOTIFICATION: NOT_PERFORMED (LEGAL_TRIGGER_DEPENDENT)
EXERCISE_TYPE: FACILITATED_TABLETOP (repository-owned; non-production)
```

## Exercise metadata

| Field | Value |
|---|---|
| Exercise ID | TT-038-001 |
| Conducted at (UTC) | 2026-09-22T21:00:00Z |
| Mode | Documented facilitated walkthrough against locked IR pack |
| Facilitator | Platform security (Cursor delivery agent under Founder IMP-038 mandate) |
| Participants (roles) | Incident commander (ops lead — simulated), Security technical lead (simulated), Legal trigger (deferred — no send) |
| Systems in scope | Auth abuse, payment webhook path, origin-trust design (no live production mutation) |
| Out of scope | Live production changes; real customer/regulator notification; IMP-039 cloud mutation |

## Scenario

**Sev-2 hypothetical:** Elevated failed customer OTP attempts against `/api/customer-auth/`
combined with anomalous Razorpay webhook signature failures. Goal: exercise triage,
evidence preservation, containment options, and the legal-notify gate **without**
sending external notices.

## Walkthrough results

| Step | Expected (IR pack) | Exercise outcome |
|---|---|---|
| Detect / triage | Sev-2 same-business-day | Classified Sev-2; Founder-visible summary drafted (not sent externally) |
| Evidence preserve | Request IDs, user/order IDs; no OTPs/secrets/PAN | Checklist exercised per `incident-response.md` §3 |
| Containment | Rate-limit / challenge / webhook reject paths | Confirmed controls exist in auth abuse + payment webhook evidence maps |
| Legal notify gate | `LEGAL_TRIGGER_DEPENDENT` | **Held** — no customer/regulator message sent; topics 5–6–9 remain open |
| Recovery | Resume normal ops after abuse subsides | Documented; no production action taken |
| Postmortem stub | Link + follow-ups | Follow-ups: CSP Enforce after D-376 Maps Fonts proof; preserve `GAP-EXT-ASSESS-001` |

## Timeline (exercise clock)

```text
INCIDENT_ID: TT-038-001
DETECTED_AT_UTC: 2026-09-22T21:00:00Z
DETECTED_BY: tabletop facilitator
SUMMARY: Simulated OTP abuse + webhook signature anomalies
AFFECTED_SURFACES: customer-auth; customer-commerce webhook path
CUSTOMER_IMPACT: NONE (exercise)
CONTAINMENT_ACTIONS: Documented existing fail-closed gates; no live block applied
ERADICATION_ACTIONS: N/A (no real attacker)
RECOVERY_ACTIONS: N/A
EXTERNAL_NOTIFY_CONSIDERED: YES
LEGAL_TRIGGER_REVIEW: DO_NOT_SEND
CLOSE_AT_UTC: 2026-09-22T21:45:00Z
POSTMORTEM_LINK: this artifact
```

## Explicit non-claims

- Not a CERT-In / DPDP compliance demonstration.
- Not Founder UAT.
- Not an independent external assessment.
- Does not authorize production firewall/DNS changes.

## Closure

```text
GAP-TABLETOP-001: CLOSED
OWNER: ops lead (exercise recorded by platform-security)
EVIDENCE: this file + incident-response.md templates
```
