---
Status: Accepted
Decision date: 2026-09-19
Last updated: 2026-09-19
Decision ID: D-374
Amends: ADR-001 (pilot hosting topology); ADR-002 (pilot production/staging target); ADR-013 (pilot PostgreSQL hosting / managed PITR assumption); ADR-015 (pilot production secret storage)
---

# ADR-016: Cost-Optimized Pilot Infrastructure

## Status

**Accepted** (2026-09-19). Binding CURRENT decision **[D-374](../decision-register.md)**.

This ADR owns the CURRENT pilot-production infrastructure topology. It amends the
infrastructure-hosting / deployment / persistence-hosting portions of ADR-001, ADR-002, ADR-013,
and ADR-015 for the self-funded pilot stage. Unrelated accepted principles in those ADRs remain
binding. Historical ADR bodies are preserved; they are not rewritten as though their original
choices never existed.

```text
AMENDS:
  ADR-001 — App Platform + Managed PostgreSQL pilot production topology
  ADR-002 — permanent App Platform production target + permanent hosted staging requirement (pilot mode)
  ADR-013 — Managed PostgreSQL hosting + provider-managed PITR assumption (pilot production)
  ADR-015 — App Platform-managed production secret storage (pilot production only)

DOES_NOT_AMEND:
  business domain authority
  HTTP transport authority
  authentication / RBAC
  static frontend model
  commerce domains
  accepted service/process boundaries
  Drizzle migration authority
  immutable SQL migration history
  runtime-vs-migration credential separation
```

## Decision Date

2026-09-19

## Decision Owners

BOBA Bear founder and product leadership

## Context

BOBA Bear currently operates primarily through Swiggy and Zomato. BOBA Direct is being built to
create an owned customer channel, reduce long-term aggregator commission dependence, improve
direct-order economics, and build customer relationship / retention.

However:

```text
direct website demand is not yet proven
expected initial customer traffic is low
platform remains a pilot
business is self-funded
fixed infrastructure burn must remain minimal
```

ADR-001 originally selected DigitalOcean App Platform + Managed PostgreSQL + Spaces as the initial
cloud foundation. That choice optimized for managed convenience. For the current self-funded,
low-volume pilot, fixed monthly burn from managed application hosting and managed PostgreSQL is not
justified relative to proven direct-order volume.

Therefore architecture optimizes for:

```text
lowest responsible steady-state infrastructure cost
+
simple operation
+
off-host data recovery
+
easy vertical scaling
+
clear migration path to managed services later
```

It does **not** optimize for:

```text
high availability on day one
multi-node Kubernetes
horizontal scaling on day one
managed database convenience on day one
enterprise orchestration sophistication
```

## Decision Summary

BOBA Bear Direct pilot production uses a **single DigitalOcean Basic Droplet** running **Docker
Engine + Docker Compose**, with **self-hosted PostgreSQL 18** in Compose on the same Droplet, and
**DigitalOcean Spaces** as the mandatory off-host backup destination.

```text
PILOT_CLOUD_PROVIDER: DigitalOcean
PILOT_PRIMARY_REGION: BLR1 / Bangalore where provider availability permits
PILOT_COMPUTE_MODEL: single Basic Droplet
PILOT_CONTAINER_RUNTIME: Docker Engine
PILOT_ORCHESTRATION: Docker Compose
KUBERNETES: NO
K3S: NO
PODMAN_PRODUCTION_RUNTIME: NO
DIGITALOCEAN_APP_PLATFORM: NO for pilot production
MANAGED_POSTGRESQL: NO for pilot production
SELF_HOSTED_POSTGRESQL: YES
OFF_HOST_BACKUP_DESTINATION: DigitalOcean Spaces
PERMANENT_CLOUD_STAGING: NOT_REQUIRED_FOR_PILOT
```

Register identity: **D-374**. Global architecture: **ARCH-R20**.

## Binding Pilot Production Topology

```text
Customers / staff / operators
        ↓
HTTPS (TLS required; ACME/public CA; automatic renewal)
        ↓
Single DigitalOcean Basic Droplet — BLR1 / Bangalore where available
  Ubuntu 24.04 LTS
  Docker Engine + Docker Compose plugin (official Docker repository)
        │
        ├── compose.yaml
        └── compose.production.yaml   (production-only overrides; architecture direction only)
                ├── app / Nginx static frontend + reverse proxy
                ├── customer-auth
                ├── workforce-auth
                ├── customer-commerce
                ├── operations
                └── postgres (PostgreSQL 18; authoritative persistent state)
```

One-shot tooling remains Compose `tools` / operator commands (migrate, db-check, bootstrap /
verification, backup/recovery). Do not introduce per-domain Kubernetes workloads merely for
deployment. Existing application / domain architecture remains unchanged.

Official Docker production Compose guidance:
https://docs.docker.com/compose/how-tos/production/
Official Docker Engine install (Ubuntu):
https://docs.docker.com/engine/install/ubuntu/

This decision does **not** create `compose.production.yaml`, cloud resources, backup scripts, or
deployment workflows. Implementation remains governed by later authorized slices (IMP-037 Fit for
recovery; IMP-039 for production release pipeline).

## Initial Compute Sizing

Pricing evidence verified **2026-09-19** against
https://www.digitalocean.com/pricing/droplets :

| Droplet | Reference price |
|---|---:|
| 2 GiB / 1 vCPU Basic | $12/month |
| 4 GiB / 2 vCPU Basic | $24/month |

```text
INITIAL_PILOT_SIZE_TARGET: 2 GiB RAM / 1 vCPU
INITIAL_MONTHLY_COMPUTE_TARGET: ~$12/month at 2026-09-19 pricing
```

This is a **cost target, not an unconditional capacity promise**.

Before public pilot use, exact sizing must pass startup health, memory-pressure validation, CPU
validation, database validation, and representative customer-order smoke/load validation.

If 2 GiB cannot safely satisfy the pilot workload:

```text
FIRST_SCALE_ACTION: vertical resize to 4 GiB / 2 vCPU
```

No architecture revision is required merely to vertically resize within the single-Droplet pilot
model. Do not silently add multiple nodes.

## OS

Preferred pilot host OS: **Ubuntu 24.04 LTS** (stable LTS, official Docker Engine support, broad
operational ecosystem, low administrative overhead). A later supported Ubuntu LTS upgrade does not
inherently require a new global architecture decision.

## PostgreSQL Architecture

```text
DATABASE: PostgreSQL 18
DATABASE_LOCATION: same pilot Droplet
DATABASE_RUNTIME: Docker container under Compose
DATABASE_AUTHORITY: PostgreSQL remains authoritative persistent state
```

Preserved from ADR-013 (unchanged by D-374):

- Drizzle schema / migration authority
- immutable forward SQL migration history
- app schema authority
- runtime-vs-migration credential separation
- no `drizzle-kit push` in shared environments
- direct connections for migration / admin / backup / restore tooling
- recovery-before-high-risk-migration principle

Amended for pilot production:

- DigitalOcean Managed PostgreSQL hosting is **not** CURRENT pilot production authority
- provider-managed PITR is **not** available under D-374 and must not be assumed satisfied

## Database Storage

Pilot V1:

```text
POSTGRES_DATA_LOCATION: persistent local Droplet storage / Docker-managed persistent volume
SEPARATE_PAID_BLOCK_VOLUME_REQUIRED: NO
```

Reason: minimize fixed pilot cost.

```text
SINGLE_NODE_FAILURE_DOMAIN: ACCEPTED_FOR_PILOT
HIGH_AVAILABILITY: NOT_PROVIDED
ZERO_DOWNTIME_NODE_FAILURE: NOT_PROMISED
```

This limitation is intentional and must not be disguised. The risk is accepted because **off-host
recoverability is mandatory**.

## Spaces Backup Authority

DigitalOcean Spaces remains part of the pilot architecture.

Base cost evidence verified **2026-09-19** against
https://docs.digitalocean.com/products/spaces/details/pricing/ :

```text
Spaces: $5/month base (250 GiB included)
OFF_HOST_BACKUP_DESTINATION: DigitalOcean Spaces
PREFERRED_REGION: BLR1 where applicable
BACKUP_STORAGE_SHARED_WITH_PRODUCTION_DISK: NO
```

PostgreSQL recovery must not depend only on data remaining on the Droplet.

## Recovery Architecture Direction (IMP-037 Fit reopened)

Managed-provider PITR is removed under D-374. Product targets already approved for IMP-037 remain:

```text
RPO_TARGET <= 15 minutes
RTO_TARGET <= 2 hours
```

D-374 does **not** claim those targets are solved. Exact self-managed PITR mechanism selection is
deferred to a **fresh IMP-037 Architecture Fit** against ARCH-R20. PR #169 predates D-374 /
ARCH-R20; its Architecture Fit / lock candidate is not valid against this infrastructure authority
and must not be reused.

Expected architecture direction for that Fit (not locked tooling in D-374):

```text
RECOVERY_LAYER_1:
  self-managed PostgreSQL physical/base backup
  + continuous WAL archiving to off-host Spaces
  + PITR-capable recovery

RECOVERY_LAYER_2:
  independent encrypted PostgreSQL logical backup
  + portable pg_dump / pg_restore recovery
```

Candidates such as WAL-G or pgBackRest may be evaluated during Fit. Exact selection requires
PostgreSQL 18 compatibility and DigitalOcean Spaces / S3 compatibility verification before
implementation authorization.

### Logical backup (preserved IMP-037 policy)

```text
logical backup: daily
retention: 35 days
encrypted: YES
off-host: YES
tooling direction: PostgreSQL 18 native pg_dump / pg_restore
```

Exact commands remain IMP-037 architecture / implementation scope.

### VM backup

DigitalOcean Droplet backup / snapshot is **OPTIONAL_DEFENSE_IN_DEPTH**, not the authoritative
database-recovery mechanism. Paid Droplet backup is not mandatory for pilot V1 if it increases
fixed spend. Database recovery must remain possible using off-host PostgreSQL recovery artifacts
even if the entire Droplet is lost.

### Recovery target model

Do not reintroduce a Spaces distributed-lock mechanism for recovery targets.

Future IMP-037 Fit should prefer:

```text
ONE_FRESH_RECOVERY_TARGET_PER_RUN_ID
shared destructive target: FORBIDDEN
target reuse across destructive drills: FORBIDDEN
```

For pilot cloud recovery drills, an isolated target may be a temporary / ephemeral DigitalOcean
Droplet + PostgreSQL 18, created only during the drill and destroyed afterward. Exact recovery-
target mechanism remains IMP-037 Fit scope.

## Staging / Non-Production Cost Model

```text
PERMANENT_CLOUD_STAGING: NOT_REQUIRED_FOR_PILOT
FOUNDER_STAGING: existing governed local Founder staging remains valid
CI: temporary test services
EPHEMERAL_CLOUD_VALIDATION: allowed when a release/recovery scenario genuinely requires provider-level validation
```

If a temporary cloud validation Droplet is used: create only for bounded validation; destroy after
evidence capture. The existing Founder staging model remains separate and is not rewritten by this
decision.

## Release Model

Preserved from ADR-002:

```text
short-lived Git branches
PR review
CI
immutable OCI image
exact Git SHA traceability
GHCR
manual production release authorization
serialized DB migrations
same-image deployment discipline
```

Pilot production target changes from App Platform to:

```text
single production Droplet + Docker Compose
```

Production deployment must use an exact immutable image identity / digest. Mutable `latest` is not
production authority.

Expected future IMP-039 direction (PLANNED; not implemented by this decision):

```text
accepted main commit
→ CI
→ immutable OCI image in GHCR
→ Founder/UAT validation
→ explicit production release authorization
→ production Droplet pulls exact image digest
→ serialized DB migration
→ Docker Compose rollout
→ health/smoke validation
```

## Rollback

Preserve ADR-002 principles:

```text
application rollback: previous compatible immutable image
database rollback: NOT routine down-migration
database restore: disaster recovery operation
```

Self-hosting PostgreSQL does not weaken immutable migration discipline.

## Secrets Model (pilot production)

App Platform-managed secret storage is no longer available for pilot production. Amend ADR-015 for
pilot production only.

Minimum requirements:

```text
secrets: never committed; never baked into images; never browser-visible; never logged
production secret storage: host-local protected secret files / equivalent OS-level mechanism
permissions: root/operator restricted; minimum filesystem permissions
```

Suggested implementation direction (IMP-039 exact layout): `/etc/bobabear/` outside the repository
and deployment workspace. Do not require a paid secret manager for the pilot.

Credential separation remains mandatory:

```text
application runtime DB credential
≠
migration DB credential
≠
backup/recovery credential
```

## Host Security

Architecture requirements (not implementation commands):

```text
only public HTTP/HTTPS exposed
PostgreSQL port: NOT publicly exposed
internal application ports: NOT publicly exposed
SSH: restricted
host security updates: required
cloud/host firewall: required
Docker socket: not exposed remotely
production operator access: minimal
```

Implementation must explicitly validate Docker / iptables / `DOCKER-USER` behaviour because
Docker-published ports can interact with host firewall rules.

## TLS

```text
TLS: required
certificate: ACME / public CA acceptable
automatic renewal: required
```

Exact Certbot / Nginx / other ACME implementation remains IMP-039 scope. No paid load balancer is
required for the pilot.

## Monitoring

Do not introduce paid observability infrastructure merely for pilot architecture. Minimum initial
direction:

```text
existing application health endpoints
container logs
host metrics
DigitalOcean included Droplet monitoring/alerts where available
```

IMP-036 accepted observability principles remain binding.

## Cost Guardrail

At provider pricing verified 2026-09-19:

```text
2 GiB Droplet: $12/month
Spaces: $5/month
STEADY_STATE_PILOT_INFRA_TARGET: approximately $17/month
  before tax, optional services, provider traffic overages, domain/provider fees
```

Architecture rule:

```text
DO_NOT_ADD_RECURRING_INFRASTRUCTURE_COST WITHOUT:
  1. demonstrated operational need
  or
  2. measured capacity need
  or
  3. explicit Founder approval
```

First routine scaling action: **vertical Droplet resize**, not Kubernetes.

## Explicitly Rejected for the Pilot Stage

Rejected **for the pilot stage**, not permanently rejected technologies:

```text
Kubernetes / DOKS
k3s single-node orchestration
Podman production migration
DigitalOcean App Platform (pilot production)
DigitalOcean Managed PostgreSQL (pilot production)
always-on cloud staging duplicate
paid load balancer
multi-node HA
Redis merely for infrastructure convenience
new distributed lock service
```

Reason: unproven direct-order volume; self-funded pilot; fixed monthly burn reduction; insufficient
current benefit relative to cost/complexity. These can be revisited based on business/technical
thresholds below.

## Upgrade Triggers

Managed PostgreSQL should be reconsidered when one or more are true:

```text
direct-order revenue becomes material
database downtime has material business impact
operator time maintaining PostgreSQL becomes material
RPO/RTO objectives cannot be economically met with self-managed backup
database size/write volume materially exceeds pilot profile
availability requirements increase
Founder approves higher recurring infrastructure spend
```

Move beyond single Droplet when:

```text
representative load cannot safely fit after reasonable vertical resize
availability/SLA becomes business-critical
single-node maintenance windows become unacceptable
actual traffic/revenue justifies redundancy
```

Do not assign arbitrary customer/order thresholds without evidence.

## IMP-037 Consequence

```text
ARCHITECTURE_FIT_REOPEN_REASON:
  D-374 / ARCH-R20 replaces managed PostgreSQL / App Platform pilot infrastructure assumptions
```

After this decision is CURRENT:

```text
IMP037_ARCHITECTURE_FIT: NOT_PERFORMED
IMP037_ARCHITECTURE_LOCKED: NO
IMP037_IMPLEMENTATION_AUTHORIZED: NO
IMP037_STARTED: NO
```

Next lifecycle gate after D-374 merge is a **fresh IMP-037 Architecture Fit** against ARCH-R20.
Do not reuse the Fit result from PR #169.

## Explicit Non-Decisions

This decision does not resolve:

- exact backup software selection (WAL-G / pgBackRest / other)
- exact Compose production file contents
- Terraform / cloud-init / Droplet provisioning scripts
- exact secret-file layout under `/etc/bobabear/`
- TLS automation tool choice
- DNS cutover sequence
- production environment variable inventory
- IMP-037 Architecture Fit design
- IMP-039 pipeline implementation
- paid Droplet backup enablement

## Consequences

### Positive

- Materially lower steady-state pilot infrastructure burn (~$17/month reference target).
- Operational model reuses the accepted containerized Compose topology.
- Off-host Spaces backups preserve a recovery path if the Droplet is lost.
- Clear vertical-scale and later managed-service upgrade path.

### Trade-offs accepted

- Single-node failure domain; HA and zero-downtime node failure are not promised.
- Operators own PostgreSQL backup / WAL / restore mechanics (Fit still required).
- No App Platform convenience for secrets, scaling, or managed runtime.
- Permanent cloud staging is not maintained during the pilot.

## Related Canonical Documents

- [`decision-register.md`](../decision-register.md) — D-374 CURRENT
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — ARCH-R20 pilot deployment topology
- [ADR-001](./ADR-001-digitalocean-platform.md) — historical DigitalOcean foundation (amended)
- [ADR-002](./ADR-002-environments-ci-cd-release-model.md) — release / rollback principles (amended for pilot target)
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — persistence semantics (amended hosting/PITR)
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — secrets principles (amended pilot storage)
- IMP-037 Product Definition — recovery product targets remain APPROVED; Fit reopened
