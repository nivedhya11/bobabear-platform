---
Status: SUPERSEDED HISTORICAL PROGRAMME CONTRACT
Capability: IMP-036B — Customer Account, Onboarding, Address & Location Experience
Superseded by: docs/platform/capabilities/IMP-036B-customer-account-onboarding-address-location.md
Accepted outcome: COMPLETE_AND_ACCEPTED
Founder UAT: PASS
Last reconciled: 2026-09-02
---

# IMP-036B — Customer Account, Onboarding, Address & Location Experience

This planned enterprise-experience contract is historical and is no longer an authority for
IMP-036B architecture, lifecycle, implementation, or customer behavior. It was superseded by the
locked canonical capability architecture after implementation and acceptance.

Current accepted authority:

- [IMP-036B locked capability architecture](../../capabilities/IMP-036B-customer-account-onboarding-address-location.md)
- [Accepted platform state](../../STATE.md)
- [Implementation roadmap](../../ROADMAP.md)

The accepted model is `OUTLET_DISTANCE_SERVICEABILITY_V1`: the BOBA server evaluates customer
coordinates against outlet-distance policy with server-side geodesic Haversine calculation.
Postal/PIN codes are address metadata only, manual customer PIN fallback is removed, and Google
search, device location, and map presentation provide location evidence only. The accepted product
candidate and Founder UAT PASS remain `4c4fcf1887fa6d8386575c77d5da22bb11e79059`.
