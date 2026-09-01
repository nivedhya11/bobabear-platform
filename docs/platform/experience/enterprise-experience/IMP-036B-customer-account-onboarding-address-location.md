---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036B — Customer Account, Onboarding, Address & Location Experience
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036B — Customer Account, Onboarding, Address & Location Experience

## Purpose, users, and problem

Create a real My BOBA experience for authenticated customers and reduce friction around first login,
profile, saved addresses, location evidence, and delivery serviceability.

## Target outcomes and information architecture

```text
My BOBA
├── Profile
├── Addresses
├── Orders
└── Sign out
```

Use a suitable account route such as `/account/` only when repository/static routing permits; do not
rename accepted routes without need. Profile uses accepted `givenName`, optional `familyName`, and
optional `email` authority. Profile completion is progressive and non-blocking:

```text
OTP authenticated → profile exists?
  yes → continue intended journey
  no  → optional welcome/profile step (first name, optional last name/email, Save or Not now)
```

Profile absence may represent incomplete setup. Do not add an onboarding-complete persistence flag.
Customer Profile deletion is not Customer Account deletion or privacy erasure; broader erasure is
IMP-038 adjacency unless separately canonicalized.

Addresses support list/default/add/edit/delete and accepted recipient, contact, address, landmark,
locality, city/state, PIN, optional coordinates, Home/Work/Other label, and default semantics.

The location selector presents “Delivering to &lt;current context&gt;” and offers search, current device
location, saved addresses, and manual PIN fallback.

## Primary workflows and serviceability boundary

1. Authenticate by accepted OTP and continue the intended journey, optionally completing Profile.
2. View/update Profile without blocking commerce on optional data.
3. List, add, edit, default, or delete an authorized saved address.
4. Select location evidence through provider search, device, saved address, or manual PIN.
5. Normalize available address/PIN/coordinates and ask BOBA Serviceability for the authoritative
   decision.

```text
provider/manual/device evidence
→ normalized address / postal code / coordinates
→ BOBA Serviceability
→ SERVICEABLE | NOT_SERVICEABLE | TEMPORARILY_UNAVAILABLE | INDETERMINATE
```

Coordinates never upgrade or downgrade PIN-authoritative coverage merely because a provider returns
them. Customer copy maps accepted states safely and provides fallback/retry where appropriate.

## Reused authority and implications

Reuse accepted Customer Identity, Profile, Address, Serviceability, Orders, and static transport
authority. Existing Profile/Address schema is expected to suffice; schema/API changes are not
authorized. Authentication and customer ownership checks remain server-authoritative.

No location provider is selected. IMP-036B architecture must deliberately decide autocomplete,
geocoding/reverse-geocoding/place details, India/PIN quality, browser/server responsibility,
billing/quotas/key restrictions, privacy, fallback, and a minimal search abstraction—without a
speculative provider framework.

## Responsive, accessibility, and state requirements

Mobile-first, touch-friendly address/location selection with keyboard-equivalent controls and a
usable desktop layout. Target WCAG 2.2 AA with semantic labels, autocomplete hints, announced
validation/serviceability outcomes, focus restoration, and device-location consent clarity.

Cover absent Profile, no addresses, denied/unsupported geolocation, provider unavailable, partial or
invalid addresses, indeterminate serviceability, loading/retry, 401, ownership-safe 403/404,
concurrent edits, pending/success/failure, and destructive address deletion confirmation.

## Major acceptance criteria

- First login can continue without forced optional Profile completion or new persistence state.
- Customers can manage only their own Profile and addresses through accepted authority.
- Search/device/provider data remains evidence; BOBA Serviceability decides coverage.
- Manual PIN remains a usable fallback and all four Serviceability states are honest.
- Profile deletion is not presented as account erasure.
- Mobile/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A and accepted Profile/Address/Serviceability. Non-goals: provider selection,
geospatial coverage authority, account-erasure semantics, forced onboarding completion, new auth,
or speculative schema/API additions. Location provider policy is an explicit architecture decision
at activation.

Figma is not required initially; later visual refinements may not change identity, ownership,
serviceability, or provider authority.
