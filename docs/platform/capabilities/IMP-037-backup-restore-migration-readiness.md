<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-037",
  "title": "Backup, Restore & Migration Readiness",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "architectureFitResult": "PASS",
  "implementationAuthorized": false,
  "implementationStarted": false,
  "impAccepted": false,
  "founderUatRequired": true,
  "schemaChangeRequired": false,
  "lastReviewed": "2026-09-19",
  "productDefinition": "PD-IMP-037-DRAFT-1",
  "bindingDecisions": ["ADR-001", "ADR-002", "ADR-013", "ADR-015"],
  "dependsOn": ["IMP-004", "IMP-005", "IMP-005A", "IMP-036G"]
}
-->

# IMP-037 — Backup, Restore & Migration Readiness

## Capability Architecture — ARCHITECTURE_LOCKED

This document is the **locked capability architecture** for IMP-037. It received Architecture Fit
**PASS** and is the sole CURRENT capability-architecture authority for this slice. Implementation
is **NOT_AUTHORIZED** and **NOT_STARTED**. This lock does **not** authorize implementation, start
implementation, accept IMP-037, activate IMP-038, or claim IMP-039/IMP-040 work complete.

```text
ARCHITECTURE_FIT = PASS
ARCHITECTURE_FIT_EXECUTION = PERFORMED
ARCHITECTURE_FIT_RESULT = PASS
IMP037_ARCHITECTURE_LOCKED = YES
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED = NO
IMPLEMENTATION_STARTED = NO
IMP037_IMPLEMENTATION_AUTHORIZED = NO
IMP037_STARTED = NO
IMP037_ACCEPTED = NO
IMP037_FOUNDER_UAT_REQUIRED = YES
IMP037_FOUNDER_UAT = NOT_PERFORMED
IMP038_ACTIVATED = NO
CANONICAL_ROADMAP_STATE = GTM-R133 / STATE-R131
PRODUCT_DEFINITION = PD-IMP-037-DRAFT-1 APPROVED (Gate PASS; Architecture Fit PASS; architecture LOCKED)
IMP-037: ARCHITECTURE_LOCKED / NOT_AUTHORIZED / NOT_STARTED
```

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Formal ROADMAP lifecycle | `ARCHITECTURE_LOCKED` (`NOT_AUTHORIZED` / `NOT_STARTED`) |
| Product Definition | `PD-IMP-037-DRAFT-1` **APPROVED**; Product Definition Gate **PASS** |
| Architecture Fit | **PASS** (performed; locked) |
| Implementation | **NOT_AUTHORIZED** / **NOT_STARTED** |
| Accepted | **NO** |
| Founder UAT required | **YES** |
| Founder UAT | **NOT_PERFORMED** |
| Schema change required (architecture conclusion) | **NO** |
| New D-number | **NO** (`D374_REQUIRED_FOR_LOCK = NO`) |
| Global ARCH bump | **NO** (`ARCH_R20_REQUIRED = NO`) |
| New permission / role / auth model / deployable | **NO** |

```text
FITS_WITHIN_ARCH_R19: YES
FITS_WITHIN_CURRENT_ADRS: YES
D374_REQUIRED_FOR_LOCK: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
ARCH_R20_CREATED: NO
NEW_DEPLOYABLE_SERVICE: NO
NEW_ALWAYS_ON_RECOVERY_SERVICE: NO
NEW_DEFAULT_RUNTIME_SERVICE: NO
NEW_WEB_UI: NO
NEW_SERVICE: NO
NEW_AUTH_MODEL: NO
NEW_ROLE: NO
NEW_PERMISSION: NO
NEW_APPLICATION_PERMISSION: NO
NEW_APPLICATION_ROLE: NO
NEW_RBAC_SEMANTICS: NO
NEW_AUTHENTICATION_REALM: NO
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
SCHEMA_OR_DATA_CONTRACT_CHANGE: NO
MIGRATION_REQUIRED: NO
DESTRUCTIVE_MIGRATION_REQUIRED: NO
```

Rationale: IMP-037 uses accepted PostgreSQL authority (ADR-013), accepted DigitalOcean platform
(ADR-001), accepted environment/secret separation (ADR-002 / ADR-015), and the existing one-shot
tooling execution plane. It does not add a new domain authority, runtime service, application RBAC
model, or persistence convention. No D-374 or ARCH-R20 is required to lock this capability.

If implementation later proves an application schema change, always-on recovery service, or new
application RBAC is materially necessary: **STOP_ARCHITECTURE_MISMATCH** and return for a new Fit.
Do not silently add those things.

---

## 1. Authority / status

This artifact is CURRENT `CAPABILITY_ARCHITECTURE` for IMP-037 with `architectureLock =
ARCHITECTURE_LOCKED`. It supersedes any Architecture Fit candidate posture for this slice.

Verified Architecture Fit evaluated candidate (provenance for Fit only):

```text
Repository: /home/ajoshi/repos/boba-bear-platform
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = a64ef0eaa65cb5b10add68f7d39c730631246381
ARCHITECTURE_FIT_EVALUATED_TREE = 5ddbd8be425d2bdd44fd08fb7d97f40f985649e6
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = 69a7e7d562b45c30553b3b3d0cd4d608341f43491457b0c8f8470f0e9f993851
ARCHITECTURE_FIT_DATE = 2026-09-19
ARCHITECTURE_FIT_RESULT = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
EXACT_MAIN_CI = 35423266995 SUCCESS
```

The persistence commit that records this lock is a **subsequent governance commit** and is **NOT**
the Fit-evaluated candidate above.

```text
architecture-lock persistence commit
!=
Architecture Fit evaluated candidate
```

Do not treat lock-persistence HEAD/tree/fingerprint as the Fit review candidate.

Product Definition Gate remains independently recorded:

```text
PRODUCT_DEFINITION_GATE_EXECUTION = PERFORMED
PRODUCT_DEFINITION_GATE_RESULT = PASS
GATE_EVALUATED_HEAD = fccdf7ef606ca906bcdcd706a6de97f693bb88b4
GATE_EVALUATED_TREE = 1477d12b5c5b3b0ccb8d488757516d5b6e637674
```

---

## 2. Provider verification

```text
PROVIDER_VERIFICATION_DATE = 2026-09-19
PROVIDER_CONFLICTS = NONE
```

First-party sources verified before locking implementation-sensitive provider classes (not exact
CLI flag pinning):

| Topic | Official source | Verified fact used by this lock |
|---|---|---|
| DigitalOcean Managed PostgreSQL product | https://docs.digitalocean.com/products/databases/postgresql/ | Managed PostgreSQL remains the platform database |
| Managed features / PITR | https://docs.digitalocean.com/products/databases/postgresql/details/features/ | Daily full backups + WAL for point-in-time restore within previous **seven days**; data-at-rest LUKS; TLS in transit |
| Restore / fork behaviour | https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/ | Restore creates a **new** cluster/primary; in-place restore into the existing primary is not the provider restore model; cluster destroy destroys its backups |
| Supported majors | https://docs.digitalocean.com/products/databases/postgresql/details/limits/ | Standard Edition supports PostgreSQL **v14–v18**; Advanced Edition supports v16–v18 and defaults new clusters to v18; no customer `superuser` |
| TLS / users | https://docs.digitalocean.com/products/databases/postgresql/how-to/secure/ ; https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/ | TLS required; default `sslmode=require`; `verify-full` available; users/databases are provider-managed |
| Spaces product | https://docs.digitalocean.com/products/spaces/ | S3-compatible object storage |
| Spaces S3 compatibility / encryption / lifecycle / versioning | https://docs.digitalocean.com/products/spaces/reference/s3-compatibility/ | Private objects; **SSE-C** customer-provided keys (bucket-level default encryption **not** supported); API versioning; time-based lifecycle expiration |
| Spaces versioning | https://docs.digitalocean.com/products/spaces/how-to/enable-versioning/ | Versioning is supported and disabled by default; enable via API |
| Spaces access keys | https://docs.digitalocean.com/reference/api/spaces/ | Scoped keys: Read / Read-Write-Delete / All; bucket/prefix grants available |
| PostgreSQL 18 `pg_dump` | https://www.postgresql.org/docs/18/app-pgdump.html | Native logical dump; custom/directory archives are restore-oriented |
| PostgreSQL 18 `pg_restore` | https://www.postgresql.org/docs/18/app-pgrestore.html | Restores custom/directory/tar archives; not a substitute for managed PITR |

Exact provider CLI / API flags remain implementation detail **only where they do not change these
locked semantics**. Implementation must reverify current official syntax before pinning commands.

---

## 3. Recovery model (layered)

IMP-037 is a **layered recovery capability**. Do not weaken FD-037-01 or FD-037-02.

```text
RECOVERY_LAYER_1:
Managed PostgreSQL PITR

PURPOSE:
short-RPO provider-managed recovery point

RECOVERY_LAYER_2:
independent PostgreSQL logical backup

PURPOSE:
portable / independently retained recovery artifact
```

```text
RPO_TARGET <= 15 minutes
RPO <= 15 minutes MUST NOT be attributed to the daily logical backup layer.
```

The ≤15-minute recovery-point objective is evaluated using the managed PITR / recovery-point layer
(DigitalOcean daily backups + WAL point-in-time restore within the documented managed window).

The independent logical backup remains **required independently**. It provides:

- portability to a clean compatible PostgreSQL 18 target
- retention beyond the managed PITR window (35-day rolling independent retention)
- independence from provider backup-window destruction (destroying a managed cluster destroys that
  cluster’s managed backups)

Managed PITR and independent logical backup are not interchangeable. Readiness must distinguish them.

---

## 4. PostgreSQL version / logical tooling

Authoritative database family remains PostgreSQL 18 (ADR-001 / ADR-013).

```text
BACKUP_CLIENT_MAJOR: 18
RESTORE_CLIENT_MAJOR: 18
```

Logical backup must use native PostgreSQL logical tooling equivalent to `pg_dump` / `pg_restore`
over a **direct** PostgreSQL connection — never the transaction-mode PgBouncer pool (ADR-013).

Prefer an archive form suitable for deterministic restore and verification (`pg_dump` custom or
directory archive consumed by `pg_restore`).

Do not use:

```text
plain ad-hoc SQL scraping
application ORM export
table-by-table custom backup logic
drizzle-kit push
```

Do not introduce a second persistence authority.

---

## 5. Execution plane

```text
NEW_DEFAULT_RUNTIME_SERVICE: NO
NEW_ALWAYS_ON_RECOVERY_SERVICE: NO
NEW_WEB_UI: NO
NEW_DEPLOYABLE_SERVICE: NO
```

Architecture direction:

```text
existing tooling image
+
repository recovery CLIs/scripts
+
operator / CI / staging invocation
```

IMP-037 recovery operations lock to the existing **one-shot tooling execution plane** (`Dockerfile`
`tooling` stage; Compose one-shot services). Do not add a sixth/seventh always-on runtime solely for
backup/recovery. Recovery tooling may later be packaged into the existing tooling image.

Production scheduling / hosting realization remains IMP-039.

---

## 6. Operator command model

Architecture defines stable operator operations. Names need not be byte-identical at
implementation if repository conventions prefer another scheme, but the semantic set is locked:

```text
recovery-readiness
backup-create
backup-verify
restore-drill
recovery-validate
migration-readiness
```

Each command must:

```text
have deterministic exit status
emit secret-safe output
emit structured evidence
fail closed
never report false success
be suitable for one-shot automation
```

Results are explicit:

```text
SUCCEEDED
FAILED
NOT_READY
BLOCKED
```

Do not report `SUCCEEDED` after an interrupted operation unless full postconditions are verified.
This lock does **not** implement these commands.

---

## 7. Production scheduling boundary

```text
IMP037:
defines scheduler-safe one-shot recovery operations
and readiness semantics

IMP039:
owns final production scheduling / production cloud realization

IMP040:
owns public launch / cutover validation
```

IMP-037 must not claim that production scheduling, HA, production credentials, or production
cutover is complete (FD-037-07).

---

## 8. Database credential separation

Three distinct authority classes:

```text
APPLICATION_RUNTIME_DB_AUTHORITY
!=
BACKUP_SOURCE_AUTHORITY
!=
RECOVERY_TARGET_MIGRATION_AUTHORITY
```

### Backup source

Dedicated restricted backup credential:

- separate from application runtime
- not embedded in image
- server-side only
- ADR-015 secret handling
- minimum source privileges sufficient for logical backup
- no production mutation authority merely for backup

### Recovery target

Separate target-only recovery/migration authority:

- used only against an isolated recovery target
- not interchangeable with the source backup credential
- not mounted into ordinary runtime

Do not define new application RBAC roles/permissions for these infrastructure credentials.
`PERSONA-PLATFORM-OPERATOR` is not converted into an application role.

---

## 9. Spaces backup storage

Independent logical backup destination:

```text
DigitalOcean Spaces
private backup bucket/prefix
```

Consistent with ADR-001.

```text
backup storage authority
!= application runtime authority
```

Use bucket/prefix-scoped credentials where supported. Prefer separate capabilities:

```text
backup writer
recovery verifier / reader
```

when provider capabilities permit (Spaces scoped keys: object read vs object write vs bucket-admin).

Do not expose Spaces backup credentials to customer/workforce application runtimes.

---

## 10. Backup encryption

```text
ENCRYPTION_AT_REST_REQUIRED: YES
PLAINTEXT_PRODUCTION_DUMP_AS_DURABLE_ARTIFACT: FORBIDDEN
ENCRYPTION_KEY: ADR-015 secret authority
  not repository
  not browser
  not evidence
  not application database
```

Official Spaces capability (2026-09-19): object encryption is **SSE-C** (server-side encryption with
customer-provided keys). Bucket-level default encryption settings are **not** supported.

Locked mechanism class:

- durable independent backup objects are stored using Spaces SSE-C (or an equivalent
  Spaces-compatible encrypted-object mechanism that remains first-party supported)
- the encryption key is supplied at operation time from protected runtime/operator secret authority
- the key is never persisted beside the object
- the key is never stored in the manifest, evidence, repository, browser, or application database

Implementation library choice remains local unless it changes these semantics.

---

## 11. Artifact identity

Every independent backup run has a unique immutable run identity.

```text
RUN_ID: unique per backup invocation

OBJECT_IDENTITY:
source environment classification
+
UTC timestamp
+
run ID
+
artifact identity
```

A later backup must never overwrite an earlier retained backup.

No fixed `latest.dump` mutable authority.

A convenience `latest` pointer may exist only as a **non-authoritative projection**.

---

## 12. Integrity

Do not treat provider ETag alone as authoritative corruption proof.

Locked integrity evidence:

```text
artifact byte size
SHA-256
run identity
source classification
creation timestamp
PostgreSQL version
backup format
candidate / repository context
storage object identity/version where available
```

Restore validation must recompute/verify the authoritative checksum before using an independent
artifact.

---

## 13. Backup finalization lifecycle

```text
CREATING
→ VERIFYING
→ COMPLETE
```

Only finalized verified artifacts may be considered usable.

An interrupted upload or backup is never `COMPLETE`.

Persist final completion evidence **after** artifact creation and verification.

Express this through artifact/manifest state rather than a database state machine.

No application schema table is required.

---

## 14. Manifest / evidence

Each successful backup produces a safe structured manifest/evidence record containing sufficient
provenance, for example:

```text
schema/version
run ID
operation
source environment classification
source DB identity fingerprint
artifact identity
artifact size
SHA-256
PostgreSQL backup client version
backup format
repository/application candidate if applicable
start/end timestamps
result
safe diagnostic category
```

Must exclude:

```text
database URI
password
provider token
Spaces secret
encryption key
customer payload
raw SQL dump
session secrets
TOTP secrets
```

A human-readable summary may be derived from the structured evidence.

Do not create a recovery-status database table merely to store evidence.

TEST-1 remains binding: first failure is preserved; later success does not erase failure evidence;
silent retry as proof is forbidden.

---

## 15. Retention / versioning

Independent backup retention:

```text
35-day rolling retention
```

This is backup-artifact retention only. It is **not** customer-data, statutory, audit,
financial-document, or privacy deletion policy (FD-037-03).

Production provider lifecycle realization belongs to IMP-039.

Where provider lifecycle capability is available (Spaces time-based object expiration), architecture
requires lifecycle expiry as the production retention enforcement mechanism rather than bespoke
application deletion jobs.

If Spaces object versioning is available (verified: yes, API-enabled), lock it as
**defense-in-depth** for the production backup bucket.

```text
versioning
!=
primary artifact identity
```

Unique backup object identity remains required. Do not depend on versioning to make overwriting
safe.

---

## 16. Restore target isolation / identity contract

```text
RESTORE_TO_ACTIVE_SOURCE: FORBIDDEN
RESTORE_WHEN_SOURCE_TARGET_IDENTITY_CANNOT_BE_DISTINGUISHED: FORBIDDEN
```

All restore drills target an isolated recovery environment. Provider restore itself creates a new
cluster rather than restoring into the existing primary; IMP-037 must still independently refuse
any workflow that would overwrite the active source.

Trusted identity / fingerprint contract (fail closed; not a warning):

Before any destructive target work, compare a trusted identity set derived from connection and
provider metadata, not from an operator-entered free-text label alone. The contract includes, as
available and sufficient to distinguish:

```text
provider cluster UUID (managed DigitalOcean cluster identity)
connection host + port + database name
PostgreSQL system identifier where obtainable
classification of SOURCE vs RECOVERY_TARGET
```

Operator-entered environment labels are non-authoritative projection only.

Fail closed when:

- any trusted identity pair is equal
- required identity cannot be obtained
- source vs target cannot be distinguished
- the nominated target is the active source

```text
PRODUCTION_DATA_RESTORED_TO_ORDINARY_SHARED_STAGING: FORBIDDEN
```

Production-derived recovered data remains production-classified. Recovery environments must have
appropriate access isolation and credentials. IMP-037 drills use dedicated recovery targets. Do not
normalize copying production data into routine staging.

---

## 17. Provider side-effect isolation

Recovered-state application/business validation must not trigger live provider effects.

```text
NO_REAL_PAYMENT_CREATION
NO_REAL_REFUND
NO_REAL_DELIVERY_BOOKING
NO_REAL_CUSTOMER_MESSAGE
NO_LIVE_WEBHOOK_DEPENDENCY
OUTBOUND_PROVIDER_INITIATION: DISABLED
EXTERNAL_SIDE_EFFECT_PROCESSING: DISABLED_OR_NON_SENDING
```

Existing repository fail-closed / non-sending boundaries (implementation evidence, not a new
architecture invention):

- Payment: `disabled` provider unless Razorpay is explicitly enabled
- Delivery: `disabledDeliveryProvider` exists
- Notifications: non-sending / noop registry exists (`createNonSendingChannelRegistry`)

Recovery validation architecture must explicitly use safe provider-disabled / non-sending
configuration. Do not mount live production provider credentials into the recovery validation
environment. Prefer no outbound provider credentials at all.

Do not invent a new application authorization model called “recovery mode”.

Recovery validation should start only the minimum compatible components required to prove restored
business integrity. Do not blindly start production-equivalent provider workers.

Read-only / business-integrity checks may execute directly against the recovered database where
sufficient. Application startup compatibility may be tested with safe recovery configuration.

---

## 18. Post-restore migrations

When a recovery point predates migrations required by the candidate being validated:

```text
RESTORE
→ verify restored DB
→ apply compatible repository migrations to RECOVERY TARGET ONLY
→ application/business validation
```

Reuse existing migration authority (`scripts/database/migrate.ts` /
`src/platform/database/migrate.ts`) and forward migration discipline.

Do not use:

```text
restore as routine application rollback
down migrations as routine rollback
```

ADR-002 remains binding.

---

## 19. Critical-state validation

Read-only verification across applicable authoritative state, including at least:

```text
identity/customer authority
organization/workforce membership/roles
orders
payments
refunds
checkout/pricing historical authority
fulfilment/delivery records
notification records
transactional outbox / idempotency state
financial documents
current persisted signed-artifact bytes / integrity relationships
migration/schema compatibility
```

Validation checks relationships / invariants rather than exporting sensitive rows into evidence.

Do not duplicate these records into a second recovery truth store.

CURRENT signed statutory artifact bytes remain PostgreSQL-backed.

```text
SEPARATE_OBJECT_STORE_RECOVERY_AUTHORITY_FOR_CURRENT_SIGNED_ARTIFACTS: NO
```

Those bytes and integrity relationships are protected through PostgreSQL recovery. If future
accepted architecture moves mutable authoritative artifacts elsewhere, recovery architecture must
be revisited then.

---

## 20. RPO / RTO measurement

```text
RPO_TARGET <= 15 minutes
RTO_TARGET <= 2 hours
```

Measured recovery point is derived from the qualifying recovery scenario. Do not claim that the
logical daily backup satisfies the 15-minute RPO. The qualifying short-RPO scenario must use
managed PITR / recovery-point capability.

RPO evidence must contain:

```text
requested recovery point
achieved recovery point
measured RPO
threshold result
```

If measured RPO > 15 minutes: `BLOCKED` / `NOT_READY`. No PASS.

RTO includes:

```text
recovery provisioning/restoration
required migrations
application compatibility startup/check
mandatory business-integrity validation
```

RTO does **not** stop when PostgreSQL merely becomes reachable.

If measured RTO > 2 hours: `BLOCKED` / `NOT_READY`.

Architecture cannot guarantee external provider provisioning time; acceptance relies on measured
qualifying evidence.

---

## 21. Concurrency / duplicate invocation

```text
two operations may not destructively act on the same recovery target concurrently
```

Smallest sufficient serialization:

```text
target-scoped lock
+
unique run IDs
```

Backup creation with independent immutable run identities may execute separately if it cannot
overwrite another run.

Restore / migration operations sharing a target must serialize or fail closed.

Do not introduce a generic global distributed-lock platform without evidence.

Duplicate operator invocation:

```text
same run identity:
idempotent / safely rejected according to operation

different run identity:
separate artifact/evidence
```

Do not silently reuse another run’s successful result.

---

## 22. Readiness architecture

`recovery-readiness` is evidence-driven.

It must not report healthy merely because:

```text
environment variables exist
bucket exists
database connection succeeds
provider feature is documented
```

Healthy status requires applicable verified evidence. At minimum distinguish:

```text
managed recovery layer
independent logical backup layer
restore validation
RPO/RTO evidence
migration-readiness prerequisites
```

Unknown provider state must not be turned into PASS. Where a provider exposes documented safe
status metadata/API, architecture may use it. Otherwise report a truthful `UNKNOWN` / `NOT_READY`
condition rather than fabricate provider health.

---

## 23. Migration readiness

High-risk migration readiness requires identifiable recovery evidence equivalent to:

```text
managed recovery capability healthy/evidenced
independent backup fresh enough
artifact verified
recovery procedure documented
representative restore/migration rehearsal passed
required validation passed
RPO/RTO evidence qualifying
```

Missing or stale required evidence: `BLOCKED`.

Do not treat migration SQL execution alone as readiness.

---

## 24. Schema / topology / authorization posture

```text
APPLICATION_SCHEMA_CHANGE_REQUIRED: NO
NEW_DEPLOYABLE_SERVICE: NO
NEW_APPLICATION_PERMISSION: NO
NEW_APPLICATION_ROLE: NO
NEW_RBAC_SEMANTICS: NO
NEW_AUTHENTICATION_REALM: NO
```

Recovery tooling itself must not create a recovery-status / application-domain table merely for
orchestration.

Database-level users / grants / provider configuration may be required. That does not equal BOBA
Bear application schema migration.

IMP-037 uses trusted infrastructure / operator execution authority.

---

## 25. Fit inputs resolved

Product Definition §25 technical Fit inputs are resolved by this lock:

| Fit input | Locked resolution |
|---|---|
| backup execution location | existing one-shot tooling image + repository recovery CLIs; operator / CI / staging invocation |
| restricted direct DB credential model | three-class split: runtime ≠ backup-source ≠ recovery-target; ADR-015; minimum backup privilege; no app RBAC |
| logical backup encryption implementation | Spaces SSE-C (customer-provided key from ADR-015 secret authority); plaintext durable dump forbidden |
| Spaces integration | private backup bucket/prefix; scoped writer vs reader keys where supported; not mounted into app runtime |
| local/CI/staging validation substitute | isolated recovery target; not ordinary shared staging; not active source |
| artifact identity/checksum | unique run ID + immutable object identity; SHA-256 + size; no mutable `latest.dump` authority |
| backup finalization lifecycle | CREATING → VERIFYING → COMPLETE; interrupted never COMPLETE |
| restore target safety mechanism | isolated target; restore-to-source forbidden |
| source-target identity protection | trusted provider/connection fingerprint contract; fail closed on equality or ambiguity |
| provider-side-effect suppression | disabled/non-sending payment, delivery, notification configuration; no live provider credentials |
| post-restore migration compatibility | forward repository migrations on recovery target only; restore ≠ rollback |
| critical-state verification implementation | read-only invariant checks across listed authoritative state; no second truth store |
| signed-artifact verification mechanism | PostgreSQL-backed bytes/integrity relationships; no separate object-store recovery authority |
| backup observability/status mechanism | evidence-driven readiness; unknown ≠ PASS; secret-safe structured evidence |
| production scheduling boundary | IMP-037 scheduler-safe operations; IMP-039 production realization |
| retention-enforcement mechanism | 35-day independent retention; Spaces lifecycle expiry for production enforcement (IMP-039) |
| parallel-run serialization | target-scoped lock + unique run IDs |
| safe evidence format | structured manifest excluding secrets/payloads; TEST-1 first-failure preservation |
| schema-change requirement | NO |
| new-service requirement | NO |
| application RBAC requirement | NO |
| D-374 requirement | NO |
| ARCH-R20 requirement | NO |

No material mutually exclusive architecture alternative remains open for implementation of this
slice. Implementation authorization remains a separate R3 gate.

---

## 26. Implementation authorization boundary

```text
IMP037_IMPLEMENTATION_AUTHORIZED: NO
IMP037_STARTED: NO
IMP037_ACCEPTED: NO
IMP038_ACTIVATED: NO
```

This architecture lock does **not** authorize implementation. After lock merge and exact-main
verification, the next R3 gate is explicit IMP-037 implementation authorization.
