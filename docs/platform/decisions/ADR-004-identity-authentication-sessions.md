---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-004: Identity, Authentication, Sessions, and Recovery

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-001](./ADR-001-digitalocean-platform.md) established DigitalOcean as the platform's cloud
foundation and explicitly left "customer authentication architecture" and "OTP provider" as open,
unresolved decisions. [ADR-002](./ADR-002-environments-ci-cd-release-model.md) established the
environment, CI/CD, release, and secrets model around the same workload and explicitly left
"customer authentication implementation" open. [ADR-003](./ADR-003-modular-monolith-node-typescript.md)
fixed the modular-monolith architecture, the Node.js/TypeScript backend, and an **Identity** module
in the initial module-boundary table, but left the authentication framework, the customer and
workforce authentication methods, the session model, and the identity lifecycle open.

BOBA Bear must support two distinct populations of authenticated user against the same underlying
identity system: customers placing direct food orders, and workforce staff operating the Kitchen
Operations Console and administrative surfaces. Both populations require verified identity,
revocable sessions, and clear separation between "who is this person and how did they authenticate"
and "what is this person allowed to do." This ADR resolves the identity, authentication, session,
verification, multi-factor authentication, invitation, and recovery architecture so that the
Identity module described in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries)
can be implemented against a fixed foundation rather than ad hoc, per-change decisions.

## Decision Summary

BOBA Bear will use **Better Auth** as a self-hosted authentication framework, running as an
infrastructure component inside the existing Node.js, TypeScript, Next.js modular monolith, with
authentication data stored in BOBA Bear's DigitalOcean Managed PostgreSQL database. Better Auth sits
behind a BOBA Bear-owned Identity-module boundary; business modules depend on Identity-module
interfaces, never on Better Auth directly, so the authentication framework can be replaced later
without redesigning Customers, Organizations, Access Control, Orders, Operations, Payments,
Delivery, Notifications, or Audit. BOBA Bear uses **one human authentication identity per person**,
which may carry multiple concurrent platform relationships (customer, workforce, or both). Customers
authenticate in V1 using an Indian mobile number and a one-time password (OTP); customers may browse
and build a temporary cart anonymously, but authentication is required before final checkout and
before other protected actions. Workforce access is invitation-only and uses verified email,
password, and mandatory TOTP authenticator-app multi-factor authentication; shared accounts are
prohibited. Sessions are **opaque and database-backed**, never long-lived self-contained JWTs, with
distinct policies for customer and workforce sessions and mandatory step-up authentication for
sensitive actions. Better Auth's own organization and role functionality is explicitly rejected as
BOBA Bear's business-authorization model; authorization remains owned by the Access Control module
described in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries).

This is an accepted, final decision for BOBA Bear's identity, authentication, session, and recovery
architecture — not a recommendation or a provisional option. It fixes the framework, boundary,
identity model, and lifecycle; it does not select an OTP/SMS provider, exact session durations, or
several other implementation details — see [Explicit Non-Decisions](#explicit-non-decisions).

## Better Auth Boundary

Better Auth runs inside the existing Node.js application, TypeScript codebase, Next.js modular
monolith, and BOBA Bear web process described in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md). It is an **infrastructure component within
the Identity module**, not a parallel system:

```text
Customer or workforce user
        ↓
BOBA Bear authentication interface
        ↓
Identity module
        ↓
Better Auth infrastructure adapter
        ↓
BOBA Bear PostgreSQL
```

BOBA Bear business modules must depend on BOBA Bear-owned Identity-module interfaces, never import
Better Auth directly throughout the codebase. This boundary is mandatory so that the authentication
framework can be replaced later without redesigning Customers, Organizations, Access Control,
Orders, Operations, Payments, Delivery, Notifications, or Audit.

### What Better Auth owns

- Authentication identities
- Authentication accounts
- Credential verification
- Phone verification challenges
- Email verification challenges
- Password credentials for workforce users
- MFA credentials
- Authentication sessions
- Session revocation
- Authentication-provider integration

### What Better Auth must not become the source of truth for

- BOBA Bear brand hierarchy
- Franchise organizations
- Legal entities
- Territories
- Outlets
- Staff memberships
- Business roles
- Scoped permissions
- Franchise data boundaries
- Customer profiles
- Loyalty eligibility
- Gated-drop eligibility

Better Auth's own organization or administrative role functionality must not be used as BOBA Bear's
business-authorization model.

### Separation of authentication and business authorization

```text
Better Auth / Identity module
    Who is this person?
    How did they authenticate?
    Is their session valid?

Customers module
    What is their BOBA Bear customer profile?

Organizations module
    Which brand, organization, territory, legal entity, or outlet exists?

Access Control module
    What may this person do, and within which scope?
```

This ADR governs authentication only — identity, credentials, sessions, and recovery. Business
authorization — which memberships, role assignments, permissions, and scopes govern what an
authenticated person may actually do — is governed by
[ADR-005](./ADR-005-organization-outlet-authorization.md). A valid session established under this
ADR does not itself grant business access; Better Auth's own organization or administrative role
functionality is not, and must not become, BOBA Bear's business-authorization source of truth. See
[ADR-005](./ADR-005-organization-outlet-authorization.md) for the full authorization model built on
top of the identity and session architecture fixed here.

## One-Human-Identity Model

BOBA Bear uses **one human authentication identity per person**. The same identity may carry
multiple concurrent platform relationships:

```text
Human identity
├── Customer profile
├── Brand membership
├── Organization membership
├── Territory assignment
├── Outlet assignment
└── Workforce permissions
```

For example, a customer may later become an outlet employee; a franchise owner may also place
personal customer orders; a brand administrator may also hold an outlet-level operational role.
BOBA Bear must not create a separate authentication identity merely because one person holds both
customer and workforce relationships. Customer and staff data remain separate domain relationships
— owned by the Customers module and the Access Control module respectively — linked to the same
underlying identity.

## Customer Authentication

### Primary V1 method

Customers authenticate using an **Indian mobile number and a one-time password (OTP)**. Customer
phone numbers must eventually be normalized and stored in E.164 format. A mobile number must be
verified before an active customer authentication relationship is established. One verified mobile
number must not create multiple active human identities.

### Customer V1 exclusions

V1 does not require a customer password, a customer email, or Google, Apple, Facebook, or other
social login. Email may be collected later for receipts, communication, or recovery, but it is not
required for V1 authentication.

### Customer authentication journey

```text
Customer enters mobile number
        ↓
Platform creates OTP challenge
        ↓
OTP is sent through the selected provider
        ↓
Customer submits OTP
        ↓
Platform verifies the challenge
        ↓
Identity is created or resumed
        ↓
Customer profile is created or loaded
        ↓
Customer continues ordering
```

The exact OTP provider remains open — see [Explicit Non-Decisions](#explicit-non-decisions).

## Anonymous Customer Activity

Customers may, without authentication: browse marketing content, browse the menu, select an
outlet, view product details, select variants and add-ons, and build a temporary cart.

Authentication is mandatory before: final checkout, payment initiation, saving a delivery address,
accessing customer order history, accessing protected order tracking, using account-specific
promotions, using loyalty or gated eligibility later, and changing verified identity information.

Anonymous-cart identity belongs to the Cart module described in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries), not to Better
Auth or the Identity module. The exact anonymous-cart persistence mechanism remains open.

## Workforce Authentication

Workforce access is **invitation-only**; staff self-registration is prohibited.

### Primary V1 workforce method

Workforce users authenticate using a **verified email, a password, and mandatory TOTP
authenticator-app multi-factor authentication**. This applies to Brand Administrator, Outlet
Manager, Kitchen Operator, Delivery Coordinator, Support or Refund Operator, Finance Viewer, and
future franchise roles described in
[`organization-outlet-access-model.md`](../organization-outlet-access-model.md).

### Workforce rules

- Every staff member must have an individual identity.
- Shared usernames, shared passwords, and shared kitchen accounts are prohibited.
- A valid invitation is required before an identity can become an active workforce user.
- MFA must be configured before workforce access becomes active.
- Authentication alone does not grant business access; at least one current scoped membership
  (owned by Access Control) is required.
- Removed or suspended memberships must stop applicable access.
- Workforce actions must remain attributable to an individual actor.

A shared kitchen device may remain signed in during an operational shift, but the session must
belong to a named individual. The exact shared-device operating procedure remains open.

### Deferred workforce authentication capability

Passkeys may later become the preferred authentication method for brand administrators, franchise
administrators, finance users, and other high-privilege workforce identities. Passkeys are
**Deferred** and are not implemented or documented as an active V1 requirement.

## Session Model

BOBA Bear uses **opaque, database-backed sessions**. Long-lived self-contained JWTs must not become
the permanent source of customer or workforce authorization. Session state must support server-side
validation, revocation, expiration, renewal, device/session listing, logout from one device, logout
from all devices, forced revocation after security-sensitive changes, and current-membership
authorization evaluation.

### Cookie requirements

Hosted authentication cookies must eventually be `HttpOnly`, `Secure`, `SameSite=Lax` by default,
restricted to the required domain and path, protected using a rotatable secret, excluded from logs,
and unavailable to client-side JavaScript. Exact cookie names and configuration remain
implementation details.

### Authorization boundary

Full session and authorization validation must occur at the application-use-case boundary described
in [ADR-003](./ADR-003-modular-monolith-node-typescript.md#authorization-boundary). Route-level
cookie checks may support navigation or redirects, but must not be treated as final authorization.

## Customer and Workforce Session-Policy Separation

Customer and workforce sessions use **distinct policies**.

Customer sessions prioritize convenience while remaining revocable, and should eventually support a
longer remembered-session duration, multiple personal devices, customer-visible device/session
management, logout from individual devices, logout from all devices, and reauthentication for
sensitive identity changes.

Workforce sessions apply stricter controls, and should eventually support a shorter absolute
duration, a shorter inactivity duration, shift-oriented operation, mandatory completed MFA,
immediate revocation after critical access changes, reauthentication for high-risk actions, and
stronger device and risk monitoring.

Exact absolute and inactivity timeout values remain open; no session duration is invented in this
decision.

## Step-Up Authentication

Sensitive actions require recent authentication even when a valid session already exists — for
example: approving a refund, changing payment-account configuration, changing staff roles, inviting
a high-privilege administrator, changing an outlet's legal entity, exporting sensitive customer
information, disabling MFA, resetting another workforce user's MFA, changing a verified mobile
number, changing a verified workforce email, and changing high-risk security configuration.

Workforce step-up authentication should require primary credential re-verification where
appropriate, current TOTP verification, and a short-lived recent-authentication state. The exact
recent-authentication lifetime remains open.

## OTP Security

Customer OTP authentication must support configurable security controls, including cryptographically
secure OTP generation, short expiration, single-use verification, protected challenge storage,
maximum verification attempts, resend cooldown, per-phone-number rate limiting, per-IP rate
limiting, generic responses that do not disclose account existence, audit events for suspicious
behaviour, escalating abuse protection, invalidation after successful verification, and invalidation
of superseded challenges where applicable.

### Initial configurable policy

| Control                       |                   Initial policy |
| ------------------------------ | --------------------------------: |
| OTP lifetime                  |                        5 minutes |
| Maximum verification attempts |                                5 |
| Minimum resend interval       |                       30 seconds |
| OTP reuse                     |                       Prohibited |
| Successful verification       | Invalidates the active challenge |
| Excessive failures            |      Temporary phone/IP cooldown |

These values are configuration-driven, not hard-coded business constants.

## Indian SMS Requirements

The selected OTP provider must support Indian transactional SMS requirements, including TRAI/DLT
compatibility, BOBA Bear entity registration, a registered sender identity, approved OTP message
templates, required entity and template identifiers, Indian mobile-number delivery,
delivery-status callbacks, a test or sandbox workflow, rate controls, abuse controls, production
support, transparent India pricing, and provider credential rotation. No SMS/OTP provider is
selected in this decision.

## Domain Ownership

### Identity module owns

Human authentication identity, verified mobile numbers, verified email addresses, authentication
accounts, workforce password credentials, MFA methods, verification challenges, authentication
sessions, session revocation, authentication events, and identity authentication status.

### Customers module owns

Customer name, customer profile, saved addresses, customer preferences, communication consent,
customer status, future loyalty relationship, and future gated-drop eligibility.

### Access Control module owns

Workforce memberships, scoped role assignments, permissions, delegation authority,
membership-access status, and scope authorization.

### Organizations module owns

Brand, organization, legal entity, territory, outlet, ownership relationships, and operating
relationships.

No business module may copy password hashes, OTP values, TOTP secrets, session tokens, or
authentication credentials.

## Conceptual Authentication Records

The following are conceptual records that describe the shape of the required data, not approved
physical table names:

```text
identity_user
├── identity identifier
├── primary verified phone
├── primary verified email
├── phone verification timestamp
├── email verification timestamp
├── identity status
├── created timestamp
└── updated timestamp

authentication_account
├── identity identifier
├── provider type
├── provider identifier
└── credential metadata

authentication_session
├── identity identifier
├── opaque session-token digest
├── created timestamp
├── last-active timestamp
├── expiration timestamp
├── revoked timestamp
├── device metadata
└── risk metadata

verification_challenge
├── normalized identifier
├── challenge purpose
├── protected challenge value
├── attempt count
├── expiration timestamp
└── consumed timestamp
```

The exact Better Auth schema, table names, indexes, constraints, and migration mapping remain
implementation decisions. No database schema or migration is created as part of this decision.

## Identity Lifecycle

Identity lifecycle must support at least the following conceptual states:

```text
PENDING_VERIFICATION
ACTIVE
SUSPENDED
DISABLED
DELETION_REQUESTED
CLOSED
```

- **Pending verification** — required identity verification has not been completed.
- **Active** — the identity may authenticate, subject to current memberships, account state, and
  authorization.
- **Suspended** — authentication is temporarily blocked; existing sessions must be revoked.
- **Disabled** — authentication has been administratively disabled.
- **Deletion requested** — a customer has initiated an account-deletion request; access,
  anonymization, and retention depend on approved legal and transactional requirements.
- **Closed** — the active authentication relationship has ended; historical orders, payments,
  invoices, security events, and audit records may still require justified retention or
  anonymization.

Exact account-deletion, anonymization, and retention rules remain open for a later privacy and
data-retention architecture slice.

## Customer Recovery

Customer recovery normally uses verified mobile OTP. A person who no longer controls the verified
mobile number must not be permitted to replace it merely by providing information such as customer
name, delivery address, previous order details, previous order amount, or product names. Lost-number
recovery requires a separate support and fraud-control process. Until that process is designed and
approved, support must escalate the case rather than bypass identity verification. The final
lost-phone recovery process remains open.

## Workforce Recovery

Workforce password recovery uses the verified workforce email address. MFA reset requires an
authorized administrator, appropriate scoped permission, a recorded reason, revocation of affected
sessions, an audit event, and notification to the affected workforce user. Administrators must never
be able to retrieve or view existing passwords, password hashes, TOTP shared secrets, recovery codes,
or session tokens. The exact MFA-recovery workflow and recovery-code policy remain open.

## Invitation Lifecycle

```text
Authorized manager creates invitation
        ↓
Invitation records intended email, scope, and proposed role
        ↓
Recipient verifies email
        ↓
Recipient establishes password
        ↓
Recipient configures TOTP MFA
        ↓
Invitation is accepted
        ↓
Scoped membership becomes active
        ↓
Audit event is recorded
```

An invitation must be single use, expiring, bound to the intended email, bound to the proposed
scope, bound to the proposed role or permission bundle, revocable before acceptance, and audited. An
invitation must not delegate more authority than the inviter possesses. The exact invitation lifetime
remains open.

## Membership and Session Invalidation

Sessions must be revoked or re-evaluated after: identity suspension, identity disablement, password
change, MFA reset, verified mobile-number change, verified email change, workforce membership
removal, critical permission removal, outlet assignment removal, organization assignment removal,
franchise relationship termination, suspicious authentication activity, user-requested logout from
all devices, and administrative security action.

Business authorization must always use current membership and permission state. Permanent business
authority must not be embedded into a long-lived session token or JWT.

## Service Identities

External systems and background processes must not impersonate human users. Future service
identities may be used for payment webhooks, WhatsApp callbacks, delivery-provider callbacks,
scheduled internal jobs, future aggregator integrations, future point-of-sale devices, and internal
automation. Service identities must eventually have an explicit purpose, narrow permissions, a
defined scope, credential rotation, expiration where practical, revocation, and auditability. The
exact API-key, signed-request, OAuth, mutual-TLS, or service-token implementation remains open.

## Audit Requirements

Authentication and identity lifecycle must create appropriate audit or security events, including:
OTP requested, OTP verification succeeded, OTP verification failed, login succeeded, login failed,
password changed, MFA configured, MFA reset, session created, session revoked, all sessions revoked,
mobile number changed, email changed, identity suspended, identity disabled, workforce invitation
created, workforce invitation accepted, workforce invitation revoked, rate-limit threshold reached,
and suspicious authentication activity detected.

Sensitive values must never appear in application logs or audit events, including OTP codes,
passwords, password hashes, session tokens, cookie values, TOTP shared secrets, recovery codes, and
authentication secrets.

## Cross-Reference: ADR-008 Anonymous Carts and Checkout Authentication

Anonymous-cart access, described in
[Anonymous Customer Activity](#anonymous-customer-activity) above, is not customer authentication:
the anonymous-cart token grants no account authority and must not be treated as a credential.
Authentication under this ADR remains required before final checkout, before payment initiation, and
before other protected actions. The authenticated customer identity established here is the identity
that owns the resulting order, per
[ADR-008](./ADR-008-serviceability-cart-checkout.md#checkout-orchestration-sequence). The full
anonymous-cart, cart-ownership, and checkout-orchestration model built on top of this authentication
boundary is fixed by [ADR-008](./ADR-008-serviceability-cart-checkout.md).

## Cross-Reference: ADR-009 Payment Initiation and Refund Step-Up

Customers initiate payment only for their own confirmed order, using the authenticated identity
established under this ADR — never an anonymous-cart identity, per
[Anonymous Customer Activity](#anonymous-customer-activity) above. Refund approval, governed by
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#refund-validation), may require
step-up authentication for the approving workforce user, consistent with this ADR's
[Step-Up Authentication](#step-up-authentication) model. Payment webhooks and scheduled
reconciliation jobs are processed by service identities, per
[Service Identities](#service-identities) above; they never authenticate as, or impersonate, a human
customer or workforce user, consistent with
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance).

## Consequences

### Positive

- A single, self-hosted authentication framework behind an Identity-module boundary lets BOBA Bear
  own its authentication data in the same DigitalOcean Managed PostgreSQL database as the rest of
  the platform, consistent with [ADR-001](./ADR-001-digitalocean-platform.md).
- The one-human-identity model avoids duplicate identities and duplicate verification burden as
  people move between customer and workforce relationships.
- Separating authentication (Identity module) from business authorization (Access Control module)
  keeps role and permission changes from requiring authentication-framework changes, consistent with
  the permission-based authorization already locked in
  [`organization-outlet-access-model.md`](../organization-outlet-access-model.md).
- Mobile-OTP-only customer authentication avoids password-reuse and password-storage risk for the
  V1 customer population.
- Mandatory workforce MFA and invitation-only workforce access reduce the risk of shared or
  compromised staff credentials affecting kitchen and financial operations.
- Opaque, database-backed sessions preserve the ability to revoke, audit, and re-evaluate
  authorization on every request, avoiding the stale-authorization risk of long-lived JWTs.

### Trade-offs accepted

- Better Auth is a newer framework than some established alternatives; BOBA Bear accepts
  self-hosting and operating it rather than depending on a managed identity platform.
- Requiring TOTP MFA for every workforce user adds onboarding friction relative to password-only
  workforce authentication.
- Opaque, database-backed sessions require a session-validation database read on relevant requests,
  rather than the purely stateless validation a self-contained JWT would allow.
- Deferring customer passwords and social login means customers without reliable SMS delivery have
  no alternate V1 authentication path until a future decision changes this.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Better Auth is later replaced or found unsuitable | The Identity-module boundary keeps Better Auth an internal infrastructure adapter; business modules depend only on Identity-module interfaces |
| A shared kitchen device is used to bypass individual attribution | Workforce rule requires every session belong to a named individual even on a shared device; shared accounts are prohibited |
| OTP abuse (enumeration, flooding, brute force) | Configurable OTP controls — rate limiting, attempt limits, cooldowns, and generic responses — as specified in [OTP Security](#otp-security) |
| A compromised workforce credential grants standing access after it should be revoked | Mandatory session revocation on password change, MFA reset, or membership removal, per [Membership and Session Invalidation](#membership-and-session-invalidation) |
| An administrator abuses MFA-reset authority to access another user's account | MFA reset requires recorded reason, audit event, and notification to the affected user; administrators can never view credentials or secrets directly |
| A lost-phone customer is socially engineered into an account takeover | Lost-number recovery is explicitly excluded from self-service and requires a separate support and fraud-control process |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or **Deferred** and must not be
treated as answered by this ADR:

- Exact Better Auth version
- Exact Better Auth schema mapping
- Exact Better Auth plugin configuration
- Indian OTP/SMS provider
- SMS fallback provider
- Exact customer session duration
- Exact workforce session duration
- Exact inactivity timeout
- Exact recent-authentication lifetime
- Exact invitation expiry
- Exact lost-phone recovery process
- Exact account-deletion process
- Exact data-retention requirements
- Exact anonymization process
- Bot-protection provider
- CAPTCHA or challenge provider
- Exact temporary cooldown duration
- Device-fingerprinting approach
- Risk-scoring approach
- Exact MFA recovery-code policy
- Exact shared-device kitchen procedure
- Exact service-account credential technology
- Exact cookie names
- Exact anonymous-cart persistence implementation
- Email provider
- Passkey timing
- Social-login timing

## Rejected or Deferred Alternatives

- **Fully custom authentication** — rejected for V1; implementing credentials, sessions, OTP
  lifecycle, CSRF protection, MFA, recovery, and revocation entirely from scratch creates
  unnecessary security risk.
- **A separate managed identity platform** (for example Clerk, Auth0, Cognito, or Supabase Auth) —
  not selected for V1; the approved direction is self-hosted authentication with identity data in
  BOBA Bear PostgreSQL.
- **Auth.js as the primary authentication framework** — not selected.
- **Better Auth organization or administrative roles as the business-authorization model** —
  rejected as the source of truth for BOBA Bear business hierarchy and permissions.
- **Long-lived JWT authorization** — rejected as the permanent source of customer or workforce
  authorization.
- **Customer passwords** — rejected for normal V1 customer authentication.
- **Shared workforce accounts** — prohibited.
- **Workforce passkeys** — deferred.
- **Social login** — deferred.

## Cross-Reference: ADR-013 Authentication Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#one-database-explicit-schemas)
fixes where the Better Auth data described here is stored. Better Auth tables live in the dedicated
`auth` PostgreSQL schema inside BOBA Bear's own database, separate from the `app` business schema
and the `platform` technical schema. Better Auth remains behind the Identity module boundary fixed
by this ADR: other modules never read or write the `auth` schema directly. Ownership of the `auth`
schema is a persistence-layer arrangement only and does not replace BOBA Bear's own business
authorization, which remains governed by
[ADR-005](./ADR-005-organization-outlet-authorization.md). Exact Better Auth and Drizzle-adapter
versions remain implementation-pinned rather than fixed by either ADR, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#approved-persistence-stack).

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle
  and Identity-module reference this decision implements in detail.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes the `auth` schema, the Drizzle adapter, and the database conventions authentication data is
  stored under, per the cross-reference above.
- [ADR-001](./ADR-001-digitalocean-platform.md) — the cloud hosting foundation and PostgreSQL
  database this decision's authentication data is stored in.
- [ADR-002](./ADR-002-environments-ci-cd-release-model.md) — the secrets and environment-isolation
  model that authentication secrets and credentials follow.
- [ADR-003](./ADR-003-modular-monolith-node-typescript.md) — the module boundaries, dependency
  rules, and Identity-module definition this decision implements.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the scoped
  membership, role, and permission model that governs business authorization once a user is
  authenticated.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the full business-authorization
  decision built on top of this identity and session architecture: scoped RBAC, deny-by-default
  authorization, scope inheritance, delegation, franchise isolation, and customer authorization.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API and Route Handler
  decision that resolves session, actor, and step-up authentication context at the HTTP boundary
  fixed by this ADR.
- [`v1-product-scope.md`](../v1-product-scope.md) — the customer experience this authentication
  model must support.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the checkout and payment
  boundary that requires authenticated customer identity.
- [ADR-008](./ADR-008-serviceability-cart-checkout.md) — the anonymous-cart, cart-ownership, and
  checkout-orchestration decision built on top of the authentication boundary fixed by this ADR.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the payment-initiation,
  refund step-up, and service-identity webhook-processing decision built on top of the
  authentication and step-up model fixed by this ADR, per the cross-reference above.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that classifies and stores the authentication secrets this ADR's session and MFA model
  depends on.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR
  locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
