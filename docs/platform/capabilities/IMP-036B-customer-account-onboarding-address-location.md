<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036B",
  "title": "Customer Account, Onboarding, Address & Location Experience",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-02",
  "bindingDecisions": [],
  "dependsOn": ["IMP-036A", "IMP-017", "IMP-018", "IMP-019", "IMP-025"]
}
-->

# IMP-036B — Customer Account, Onboarding, Address & Location Experience

## Capability Architecture (ARCHITECTURE_LOCKED — COMPLETE_AND_ACCEPTED)

This document is the locked capability architecture for **IMP-036B — Customer Account,
Onboarding, Address & Location Experience**. It delivers My BOBA account routes, progressive
optional profile completion, saved-address management, a reusable delivery-location selector, and
coordinate-authoritative outlet-distance Serviceability over existing Customer Profile, Address,
and Serviceability authorities.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **YES** |
| Accepted product through | IMP-036B |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-036C |
| Governance checkpoint | GTM-R100 / STATE-R98 |
| Founder UAT required for acceptance | **YES** |
| Founder UAT | **PASS** |

```text
IMP-036B: COMPLETE_AND_ACCEPTED
IMP-036B_ARCHITECTURE: LOCKED
IMP-036B_ARCHITECTURE_LOCKED: YES
IMP-036B_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036B_IMPLEMENTATION_AUTHORIZED: YES
IMP-036B_STARTED: YES
IMP-036B_IMPLEMENTATION_COMPLETE: YES
IMP-036B_ACCEPTED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-036B_FOUNDER_UAT_REQUIRED: YES
IMP-036B_FOUNDER_UAT: PASS
IMP036B_FORMAL_ACCEPTANCE: ACCEPTED
FOUNDER_UAT: PASS
IMP-036B_ACCEPTED_MAIN_SHA: 4c4fcf1887fa6d8386575c77d5da22bb11e79059
schema_change: YES
serviceability_model: OUTLET_DISTANCE_SERVICEABILITY_V1
provider_IO: YES
new_service: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
LOCATION_PROVIDER: GOOGLE_MAPS_PLATFORM_V1
provider: GOOGLE_MAPS_PLATFORM
approved_services: PLACES_API_NEW, GEOCODING_API, MAPS_JAVASCRIPT_API
provider_external_IO: YES
IMP036B_IMPLEMENTATION_EVIDENCE: COMPLETE
COMPLETION IS NOT ACCEPTANCE: YES
```

## 1. Purpose

IMP-036B delivers a coherent signed-in customer account and delivery-location foundation:

- **My BOBA** — `/account/profile/`, `/account/addresses/`, existing `/order/orders/`, sign out
- **Progressive profile** — optional welcome step after first OTP; does not block ordering
- **Saved addresses** — list/add/edit/default/delete over IMP-018 authority
- **Location selector** — saved addresses, Google search, device location, map confirmation
- **Serviceability UX** — coordinate-authoritative outlet-distance model; four honest customer states

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| IMP-017 Customer Profile | Reused; no schema change |
| IMP-018 Customer Addresses | Reused; no schema change |
| IMP-019 Serviceability | OUTLET_DISTANCE_SERVICEABILITY_V1; coordinates authoritative; PIN tables deprecated at runtime |
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
src/components/location/DeliveryLocationMapConfirmation.tsx
src/lib/customer-commerce/profile.ts
src/lib/customer-commerce/serviceability.ts
src/lib/customer-commerce/welcome-flow.ts
src/lib/customer-location/delivery-context.ts
src/lib/customer-location/display-label.ts
src/lib/customer-location/geolocation.ts
src/lib/customer-location/location-provider.ts
src/lib/customer-location/maps-js-config.ts
src/lib/customer-location/maps-js-loader.ts
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
approved_services = PLACES_API_NEW + GEOCODING_API + MAPS_JAVASCRIPT_API
```

- **GoogleMapsLocationProvider** — server-side Places Autocomplete (New), Place Details (New),
  and Geocoding reverse geocode through existing customer-commerce `/api/v1/location/*`.
- **Maps JavaScript API** — browser-only visual map confirmation (pan/zoom/center pin). Does not
  perform Serviceability, replace server Places, or expose the server key.
- **Manual PIN entry removed** from customer delivery selector (IMP-036B founder correction).
- **Device geolocation** remains explicit user action; coordinates reverse-geocoded server-side for display.
- Session tokens (UUID v4) group Autocomplete → selected Place Details; they are not credentials.

```text
Google Places / browser GPS
        ↓
location evidence
        ↓
BOBA normalized address/coordinates (postalCode optional metadata)
        ↓
BOBA coordinate Serviceability (server Haversine)
        ↓
authoritative delivery result
```

Google MUST NOT determine serviceable / not serviceable / delivery outlet / fee / radius / coverage.
Postal/PIN codes MUST NOT determine runtime Serviceability. Coordinates are the geographic authority.

## 4.1 Outlet-distance Serviceability V1 (IMP-036B founder correction)

```text
OUTLET_DISTANCE_SERVICEABILITY_V1
SUPERSEDES: HYBRID_PIN_AND_OUTLET_DISTANCE_V1
```

Geographic eligibility:

1. Runtime evaluation requires precise customer coordinates.
2. Postal/PIN codes are address metadata only — never geographic authority.
3. Brand outlets with complete distance policy (origin + max distance) are geographic candidates.
4. Server computes geodesic (Haversine) distance from configured service origin.
5. Candidates outside configured max distance are geographically ineligible.
6. Candidates within max distance proceed to existing Operational Availability evaluation.
7. Outlets without complete distance configuration are NOT geographic candidates.
8. Legacy PIN tables remain for administration/history but are not read at runtime.
9. Google/Routes/PostGIS do not decide Serviceability.

Distance policy is stored on `app.outlet_serviceability_configs` as:

- `service_origin_latitude`
- `service_origin_longitude`
- `max_service_distance_meters`

Administration uses existing Serviceability manage authority via
`setOutletServiceabilityDistancePolicy` and `npm run serviceability:set-distance-policy`.

Customer delivery fee, provider cost, and Serviceability remain separate authorities. Customer
delivery-fee calculation is deferred to IMP-036C.

Location selector dialogs portal to `document.body` so header `backdrop-filter` cannot clip the
delivery selector shell.

Server credential: `BOBA_BEAR_GOOGLE_MAPS_API_KEY` (never `NEXT_PUBLIC_*`). Missing key is
`NOT_CONFIGURED`, not process failure.

Browser credential: `NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY` — Maps JavaScript API only,
HTTP-referrer restricted, intentionally browser-visible. Must be referenced statically in client
code for build-time inlining. Missing key gracefully degrades map confirmation; search and saved
addresses remain available where configured.

## 5. Delivery context persistence

Selected delivery context uses bounded `sessionStorage` via `delivery-context.ts`:

- coordinates (required for Serviceability)
- displayLabel for customer chrome
- postalCode optional address metadata
- source: saved_address | device_location | location_search
- `manual_pin` remains accepted only when reading legacy persisted sessionStorage context; it does
  not represent a current customer manual-PIN flow and cannot determine Serviceability
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
- Location selector: saved address, Google location search, device location, and map confirmation
  with honest fallbacks; manual customer PIN entry is removed
- Serviceability four states from BOBA server-side coordinate/Haversine evaluation; postal/PIN is
  address metadata only
- My BOBA nav reaches Profile, Addresses, Orders
- Mobile/accessibility baseline; no raw IDs/enums in normal customer flow
- Founder UAT required before `COMPLETE_AND_ACCEPTED`
