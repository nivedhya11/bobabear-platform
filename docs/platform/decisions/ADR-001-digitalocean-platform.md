---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-001: DigitalOcean as the BOBA Bear Platform Cloud Foundation

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

BOBA Bear is evolving from a static marketing website into the BOBA Bear direct platform — a
customer-facing commerce application, a kitchen Operations Console, and the background processing
that connects them. That evolution requires a cloud hosting foundation that can support, from an
early and cost-constrained stage:

- An economical platform appropriate for an early-stage, direct-ordering business run by a small
  team.
- Application and transactional-data hosting located in India where practical, given the
  business's current market and likely regulatory expectations.
- A mobile-first Progressive Web App (PWA) as the primary customer channel.
- A customer-facing commerce application covering accounts, catalog, cart, checkout, payments, and
  order tracking.
- A kitchen Operations Console for direct-order fulfilment.
- Background processing for payment events, notifications, retries, refunds, and delivery
  integrations.
- A relational transactional data model for customers, orders, payments, and related entities (see
  [`architecture-foundation.md`](../architecture-foundation.md)).
- Object storage for menu photography, receipts, and other application assets.
- Future multi-outlet and franchise scaling without a foundational rebuild (see
  [`organization-outlet-access-model.md`](../organization-outlet-access-model.md)).
- A manageable day-to-day operating model for a small team, without the overhead of assembling and
  operating a full multi-service cloud architecture.
- Long-term portability, so the platform is not locked to a single vendor's proprietary runtime or
  data services.
- A foundation capable of eventually supporting BOBA Bear's own point-of-sale evolution (see
  [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md)).

The prior architectural principles recorded in [`architecture-foundation.md`](../architecture-foundation.md)
(economical, operationally simple, India-hosted-preferred, modular monolith) left the specific
cloud provider and hosting model open. This ADR resolves that open decision.

## Decision

BOBA Bear will use **DigitalOcean** as the primary cloud platform. The Next.js modular monolith and
background worker will run on **DigitalOcean App Platform in Bangalore**, transactional data will
use **DigitalOcean Managed PostgreSQL in Bangalore**, and object storage will use **DigitalOcean
Spaces**. Local development will remain Docker-based, while staging and production will use
separate hosted environments.

This is an accepted, final decision for the platform's initial cloud foundation — not a
recommendation or a provisional option.

## Deployment Topology

```text
Customers and staff
        ↓
DigitalOcean App Platform — Bangalore
        ├── Next.js modular monolith
        │   ├── Public website
        │   ├── Customer PWA
        │   ├── Customer account
        │   ├── Checkout and order tracking
        │   ├── Administration
        │   └── Kitchen Operations Console
        │
        └── Background worker
            ├── Payment-event processing
            ├── Notification delivery
            ├── Retry processing
            ├── Refund processing
            └── Delivery-integration jobs

        ↓
DigitalOcean Managed PostgreSQL — Bangalore
        ↓
DigitalOcean Spaces
```

This topology fixes the hosting provider, application platform, database product, and object
storage. It does **not** fix the internal background-job/queue implementation, the customer
identity and authentication implementation, or the realtime communication approach used for order
updates — those remain open, see [Explicit Non-Decisions](#explicit-non-decisions) below and
[`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md).

## Environment Model

Local development, staging, and production are distinct environments:

**Local development**
- Docker-based, for application dependencies and services where practical.
- Not hosted on DigitalOcean.

**Staging**
- A separate DigitalOcean App Platform application from production.
- A separate staging database — staging must not share the production database.
- Separate configuration and credentials from production.
- No production customer data.
- Lower-cost capacity appropriate for testing, not production-scale traffic.

**Production**
- A separate DigitalOcean App Platform application and database from staging.
- Its capacity and resilience posture evolve through the stages below.

## Controlled-Pilot Position

A controlled, low-volume commercial pilot may initially run on:

- One application instance.
- One worker instance.
- A single-node managed PostgreSQL database.
- DigitalOcean Spaces.

This single-node database configuration is a **consciously accepted availability risk**, suitable
only for a controlled pilot with low order volume and close operational attention — it is not an
acceptable configuration for a broader public commercial launch (see
[Commercial-Production Requirements](#commercial-production-requirements) below).

## Commercial-Production Requirements

Before a broader public commercial launch, production must be upgraded to at least:

- Managed PostgreSQL primary plus standby/high-availability configuration.
- Tested backup and restore procedures.
- Production monitoring and alerting.
- Defined operational recovery procedures.

The exact timing of this upgrade, and the exact HA configuration, remain open — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Scaling Path

As order volume and business criticality grow beyond the commercial-production baseline above, the
intended direction is to:

- Add a second application container.
- Enable or configure horizontal scaling.
- Increase worker capacity.
- Scale the database vertically or through supported managed-database options.
- Introduce additional resilience only when justified by observed load and operational risk.

This ADR documents the approved progression only. None of these growth-stage changes are
implemented as part of this decision.

## Portability Requirements

The following are mandatory implementation constraints, so that the platform can migrate later to
another standard container and PostgreSQL environment without redesigning the business domain:

- Use standard PostgreSQL features where practical.
- Maintain database migrations in the repository.
- Avoid placing core business logic exclusively in provider-specific database automation.
- Keep the Next.js application deployable as a standard Node.js application or container.
- Use S3-compatible storage semantics through an application abstraction.
- Keep external providers behind adapter interfaces.
- Use validated environment-based configuration.
- Avoid unnecessary DigitalOcean-specific coupling in domain and application layers.
- Maintain documented data export and restore procedures.
- Do not make DigitalOcean resource identifiers part of core business entities.
- Keep environment-specific configuration outside application business logic.

## Cost Rationale

The following figures are **indicative planning estimates as of August 2, 2026**, not permanent
contractual prices:

| Configuration | Indicative monthly infrastructure cost |
| --- | ---: |
| Controlled pilot | Approximately USD 37 |
| Public production with highly available database | Approximately USD 82 |
| Application and database high availability | Approximately USD 94 |

These estimates:

- Require verification before procurement.
- Exclude taxes.
- Exclude payment-gateway fees.
- Exclude OTP/SMS charges.
- Exclude WhatsApp charges.
- Exclude delivery-provider charges.
- Exclude maps/geocoding usage.
- Exclude customer-support tools.
- May change as DigitalOcean pricing or system capacity changes.

DigitalOcean offers a materially simpler and more predictable cost structure than assembling an
equivalent multi-service architecture on a larger hyperscale provider, while still supporting
India-region hosting for the application and database tiers, which matches the operating
constraints described in [Context](#context).

## Consequences

### Positive

- Core services can be hosted in India.
- The application and database can reside in the same primary cloud region.
- Pricing is relatively predictable.
- Infrastructure is simpler than assembling a full AWS platform.
- PostgreSQL and container deployment preserve portability.
- DigitalOcean supports gradual scaling as the business grows.
- BOBA Bear retains control of the commerce and operations platform rather than depending on a
  bundled third-party application platform.

### Trade-offs accepted

- Authentication is not supplied as an integrated platform capability and must be implemented by
  the application.
- Realtime order updates require a separate implementation choice.
- Background job reliability must be explicitly designed rather than assumed from the platform.
- App Platform and database capacity must be actively monitored.
- A single-node pilot database creates an availability risk, accepted only for the controlled
  pilot described above.
- DigitalOcean provides fewer integrated application-platform features than some alternatives
  (for example, Vercel or Supabase).
- The team must own more application-level infrastructure decisions than a more fully managed
  alternative would require.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Single-node pilot database is a single point of failure | Explicitly scoped to the controlled pilot only; HA configuration is required before broader commercial launch (see [Commercial-Production Requirements](#commercial-production-requirements)) |
| Background job reliability is not provided by the platform | Job and queue implementation must be explicitly designed as part of the (currently open) background-processing decision |
| App Platform or database capacity is exceeded under real load | Production monitoring and alerting are required before broader launch; scaling path is documented above |
| Team takes on more infrastructure ownership than a fully managed platform would require | Portability requirements (adapters, standard PostgreSQL, environment-based configuration) limit how deeply any single decision couples the codebase to DigitalOcean specifics |
| Cost estimates drift from actual DigitalOcean pricing | Cost figures are documented as indicative planning estimates requiring verification before procurement, not contractual prices |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** and must not be treated as
answered by this ADR:

- Customer authentication architecture
- OTP provider
- Realtime communication approach
- Background job and queue implementation
- Payment gateway
- WhatsApp implementation
- Delivery-provider strategy
- Maps and geocoding provider
- Transactional email provider
- Monitoring and observability products
- Exact application instance sizes
- Exact database size
- Exact storage capacity
- Backup-retention duration
- Disaster-recovery targets
- Final production high-availability date
- Final commercial launch capacity
- Infrastructure-as-code tooling
- Secret-management implementation
- Domain and DNS migration sequence

## Superseded Alternatives

The following approaches were evaluated but are not selected as the V1 hosting foundation:

- Vercel plus Supabase
- Google Cloud Run plus Supabase
- A full AWS managed architecture
- AWS Lightsail
- Cloudflare plus Supabase
- A self-managed VPS

DigitalOcean was selected for a better overall balance of India hosting, predictable pricing,
portability, standard infrastructure, and manageable operational complexity than these
alternatives offered:

- Greater ownership and lower platform coupling than Vercel plus Supabase.
- Lower complexity than a full AWS architecture.
- Lower operational risk than a self-managed VPS.

These alternatives are superseded only for the initial platform foundation described in this ADR.
This decision does not prohibit evaluating a future migration if BOBA Bear's needs change; any such
change would require a new ADR, per the
[documentation update protocol](../README.md#documentation-update-protocol).

## Cross-Reference: ADR-013 Managed PostgreSQL Configuration

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) fixes how the DigitalOcean
Managed PostgreSQL service selected here is configured and operated. DigitalOcean Managed
PostgreSQL 18 Standard Edition is the approved initial database offering, and the same major
version runs in every environment. Runtime application traffic reaches the database through the
managed PgBouncer transaction-mode pool, while migrations, administrative tasks, logical backups,
and restores use direct connections rather than the pooler. DigitalOcean's managed backup and
point-in-time recovery remain necessary but not sufficient: an independent logical backup and a
documented restore validation are both launch requirements. ADR-013 governs database tooling,
roles, pooling, backup, and restore operations; this ADR continues to govern the hosting platform
itself.

## Related Canonical Documents

- [`architecture-foundation.md`](../architecture-foundation.md) — the architectural principles this decision satisfies.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that fixes the PostgreSQL version, pooling, database roles, backup, and restore-validation practice for the managed database selected here, per the cross-reference above.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets decision that fixes how DigitalOcean App Platform environment-variable scopes and encrypted runtime secrets are used on top of the platform selected here.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [`README.md`](../README.md) — the canonical documentation index and update protocol.
