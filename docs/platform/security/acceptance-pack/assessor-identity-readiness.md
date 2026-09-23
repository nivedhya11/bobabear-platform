---
Status: SUPPORTING — Assessor identity readiness (IMP-038 external assessment)
Authority: FD-038-18; gap GAP-EXT-ASSESS-001
Compliance claim: NONE
Secrets: ABSENT (credentials delivered OOB only)
---

# Assessor identity readiness — non-secret evidence

```text
ASSESSMENT_WINDOW_STARTED: YES
ASSESSMENT_HEAD: a4680c983934bbf0c889952af19bd99bf3a43ed4
ASSESSMENT_TREE: 9d3fc540a1305f0974dab3098ef59f45310a9a18
ASSESSMENT_FINGERPRINT: 715e9529101310e13b44f153f7c910394cb82aad8082dde5d4d5056591cbc87d
ASSESSMENT_URL: https://cradling-unenvied-sapling.ngrok-free.dev
ASSESSMENT_CREDENTIAL_PACKAGE_READY: YES
CSP_ENFORCE: YES
OOB_PACKAGE_LOCATION: .env.staging/assessment-oob-credentials.txt (gitignored)
```

## Identity matrix (no secrets)

| Requirement | Status | Notes |
|---|---|---|
| CUSTOMER_TEST_IDENTITY | READY | Staging phone `+919876543210`; local OTP provider |
| CUSTOMER_OTP_TEST_PATH | READY | `send-otp` → `verify-otp` via assessment Origin |
| WORKFORCE_TEST_IDENTITY | READY | `assessor.ops` / `assessor.admin` / `assessor.refund` `@bobabear.assessment.test` |
| WORKFORCE_PASSWORD | READY | Delivered OOB only |
| WORKFORCE_MFA_PATH | READY | MFA enrolled; TOTP secret OOB only |
| STEP_UP_CAPABLE_WORKFORCE_IDENTITY | READY | `POST /api/workforce-auth/step-up` returns proofId |
| OPERATIONS_AUTHORIZED_TEST_IDENTITY | READY | `outlet_manager` @ Dehradun outlet |
| ADMIN_AUTHORIZED_TEST_IDENTITY | READY | `brand_admin` @ Boba Bear brand |
| REFUND_CAPABLE_TEST_SCENARIO | READY | `support_refund_operator` @ Dehradun outlet |

## Provisioning path (no second identity authority)

```text
workforce_create: boba-bear-tooling:local on boba-staging_default network
  (existing npm run workforce:user:create operator CLI)
role_grants: Administration use-cases (adminCreateMembership + adminGrantRole)
  actor: existing MFA-enrolled platform_super_admin principal from DB
  script: npm run access:grant-assessment-roles -- --actor-id=<psa-id>
MFA_enroll: normal workforce UX/API (change-password → mfa/enroll → verify-enrollment)
NO fake superuser bypasses
NO MFA/step-up/authorization disabled
NO production customer credentials reused
```

## Tooling EACCES root cause (resolved for provisioning)

```text
ROOT_CAUSE: restrictive umask (077) during git-archive materialize → COPY layers mode 0600 root-owned
  → USER node could not read /app/package.json in staging workforce operator image
WORKAROUND_USED: existing boba-bear-tooling:local (mode 644) on staging network
DURABLE_FIX: Dockerfile tooling COPY --chown=node:node + materializeExactGitTree umask 022
  (PR separately; does not require assessment-candidate redeploy)
```

## Pre-assessment smoke (internal; does not close GAP-EXT-ASSESS-001)

| Check | Result |
|---|---|
| External HTTPS reachable | PASS |
| `GET /` | PASS 200 |
| `GET /order/` | PASS 200 |
| `GET /workforce/login/` | PASS 200 |
| CSP | ENFORCE (not Report-Only) |
| Customer auth origin | assessment URL (running container) |
| Workforce auth origin | assessment URL (running container) |
| Customer OTP path | PASS (202 accept + 200 authenticated) |
| Workforce password + MFA | PASS (3/3 identities) |
| Step-up | PASS (`/api/workforce-auth/step-up` → proofId) |
| Operations | PASS (`/api/operations/v1/orders`, `operational-status`) |
| Administration | PASS (`/api/admin/v1/overview`) |
| Razorpay | sandbox/test only (`rzp_test_*`) |
| Production customer data | ABSENT (Founder staging counts only) |

## Independence reminder

```text
SELF_ASSESSMENT_IS_NOT_INDEPENDENT: YES
GAP-EXT-ASSESS-001: OPEN until Founder-commissioned independent assessor report + Critical/High disposition
```
