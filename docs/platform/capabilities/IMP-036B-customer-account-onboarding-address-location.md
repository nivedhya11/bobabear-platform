<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036B",
  "title": "Customer Account, Onboarding, Address & Location Experience",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-01",
  "bindingDecisions": [],
  "dependsOn": ["IMP-036A", "IMP-017", "IMP-018", "IMP-019", "IMP-025"]
}
-->

# IMP-036B — Customer Account, Onboarding, Address & Location Experience

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

This document is the locked capability architecture for **IMP-036B — Customer Account,
Onboarding, Address & Location Experience**. It delivers My BOBA account routes, progressive
optional profile completion, saved-address management, a reusable delivery-location selector, and
PIN-authoritative Serviceability presentation over existing Customer Profile, Address, and
Serviceability authorities.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-036A |
| Current product slice | IMP-036B |
| Pending acceptance | IMP-036B |
| Next product slice | IMP-036C |
| Governance checkpoint | GTM-R99 / STATE-R97 |
| Founder UAT required for acceptance | **YES** |

```text
IMP-036B: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036B_ARCHITECTURE: LOCKED
IMP-036B_ARCHITECTURE_LOCKED: YES
IMP-036B_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036B_IMPLEMENTATION_AUTHORIZED: YES
IMP-036B_STARTED: YES
IMP-036B_IMPLEMENTATION_COMPLETE: YES
IMP-036B_ACCEPTED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-036B_FOUNDER_UAT_REQUIRED: YES
schema_change: NO
provider_IO: YES
new_service: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
LOCATION_PROVIDER: GOOGLE_MAPS_PLATFORM_V1
provider: GOOGLE_MAPS_PLATFORM
approved_services: PLACES_API_NEW, GEOCODING_API
provider_external_IO: YES
IMP036B_IMPLEMENTATION_EVIDENCE: COMPLETE
COMPLETION IS NOT ACCEPTANCE: YES
```

## 1. Purpose

IMP-036B delivers a coherent signed-in customer account and delivery-location foundation:

- **My BOBA** — `/account/profile/`, `/account/addresses/`, existing `/order/orders/`, sign out
- **Progressive profile** — optional welcome step after first OTP; does not block ordering
- **Saved addresses** — list/add/edit/default/delete over IMP-018 authority
- **Location selector** — saved addresses, manual PIN, optional device coordinates as evidence only
- **Serviceability UX** — BOBA Serviceability remains authoritative; four honest customer states

## 2. Preserved authorities

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| IMP-017 Customer Profile | Reused; no schema change |
| IMP-018 Customer Addresses | Reused; no schema change |
| IMP-019 Serviceability | PIN-authoritative; coordinates never override coverage |
| IMP-009 Customer auth | Single OTP/session model; returnTo preserved |
| IMP-036A customer shell | Customer chrome preserved; no workforce/admin leakage |
| Static export | `output: "export"`, `trailingSlash: true` preserved |

## 3. Locked module placement

```text
src/app/(customer)/account/profile/page.tsx
src/app/(customer)/account/addresses/page.tsx
src/app/(customer)/account/welcome/page.tsx
src/components/account/AccountShell.tsx
src/components/account/ProfileClient.tsx
src/components/account/ProfileWelcomeClient.tsx
src/components/account/AddressesClient.tsx
src/components/location/LocationSelector.tsx
src/lib/customer-commerce/profile.ts
src/lib/customer-commerce/serviceability.ts
src/lib/customer-commerce/welcome-flow.ts
src/lib/customer-location/delivery-context.ts
src/lib/customer-location/geolocation.ts
src/lib/customer-location/location-provider.ts
src/server/customer-commerce/location/
src/server/customer-commerce/http/router.ts   POST /api/v1/serviceability/evaluate
                                              GET  /api/v1/location/status
                                              POST /api/v1/location/autocomplete
                                              POST /api/v1/location/place
                                              POST /api/v1/location/reverse-geocode
```

## 4. Location provider boundary (GOOGLE_MAPS_PLATFORM_V1)

Founder-approved provider amendment (capability-local; no new global ADR):

```text
LOCATION_PROVIDER = GOOGLE_MAPS_PLATFORM_V1
provider = GOOGLE_MAPS_PLATFORM
approved_services = PLACES_API_NEW + GEOCODING_API
```

- **GoogleMapsLocationProvider** — server-side Places Autocomplete (New), Place Details (New),
  and Geocoding reverse geocode through existing customer-commerce `/api/v1/location/*`.
- **Manual PIN and saved addresses** remain mandatory fallbacks when Google is unconfigured,
  timed out, rate-limited, or returns no PIN.
- **Device geolocation** remains explicit user action; coordinates are reverse-geocoded server-side
  and are never independent Serviceability authority.
- Session tokens (UUID v4) group Autocomplete → selected Place Details; they are not credentials.

```text
Google Places / browser GPS
        ↓
location evidence
        ↓
BOBA normalized address/PIN/coordinates
        ↓
BOBA Serviceability
        ↓
authoritative delivery result
```

Google MUST NOT determine serviceable / not serviceable / delivery outlet / fee / radius / coverage.
Coordinates NEVER upgrade or downgrade BOBA PIN-authoritative coverage independently.

Server credential: `BOBA_BEAR_GOOGLE_MAPS_API_KEY` (never `NEXT_PUBLIC_*`). Missing key is
`NOT_CONFIGURED`, not process failure.

## 5. Delivery context persistence

Selected delivery context uses bounded `sessionStorage` via `delivery-context.ts`:

- postalCode (required for Serviceability)
- displayLabel for customer chrome
- source: saved_address | manual_pin | device_location | location_search
- optional savedAddressId when applicable

No durable database state is invented for temporary anonymous location. Device coordinates are not persisted indefinitely.

## 6. Explicit non-goals

| Deferred | Owner |
|---|---|
| External location marketplace / Routes / Distance Matrix / Address Validation / maps tiles | Out of scope |
| Full commerce V2 redesign | IMP-036C |
| Account erasure / privacy deletion semantics | IMP-038 adjacency |
| onboarding_complete persistence flag | Out of scope |
| New auth / roles / permissions | Out of scope |

## 7. Acceptance evidence targets

- Optional welcome/profile after first login; Not now continues journey
- Profile view/edit/delete labeled accurately (not account erasure)
- Address CRUD/default with ownership-safe handling
- Location selector: saved address, manual PIN, device location with honest fallbacks
- Serviceability four states with PIN authority preserved
- My BOBA nav reaches Profile, Addresses, Orders
- Mobile/accessibility baseline; no raw IDs/enums in normal customer flow
- Founder UAT required before `COMPLETE_AND_ACCEPTED`
