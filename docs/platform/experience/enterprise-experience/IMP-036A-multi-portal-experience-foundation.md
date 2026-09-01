---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036A — Multi-Portal Experience Foundation
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036A — Multi-Portal Experience Foundation

## Purpose, users, and problem

Establish distinct Customer, Workforce, and Administration application-shell boundaries and a
shared interaction foundation. Customers, workforce personas, and platform administrators currently
encounter overlapping presentation and fragmented navigation. The slice makes each surface coherent
without creating a new deployable topology.

## Target outcomes and information architecture

- **Customer shell:** customer navigation; customer ticker/footer only where appropriate;
  customer restaurant/SEO metadata; landing, order, and account destinations.
- **Workforce shell:** operational identity/navigation, dense task layout, and a coherent
  `/workforce/` landing/application-selection hub or architecture-equivalent outcome; no customer
  promotion, ticker/footer, or customer SEO metadata. The hub exposes only real, currently
  implemented/authorized destinations derived from effective permissions and scope. Future
  destinations may include Operations, Store Management, Commercial/Menu Management, and
  Administration, but they must not appear as dead links before their owning capabilities exist.
- **Administration shell:** distinct administration identity, navigation, and hierarchy; may reuse
  enterprise primitives with Workforce without becoming the same experience.
- **Root:** sufficiently neutral to select or enter the appropriate surface without customer chrome
  leaking into enterprise pages.
- Shared primitives and state patterns defined by the [programme baseline](./README.md), including
  navigation, headers, tables, filters, badges, feedback, dialogs, forms, loading, and pagination.

Exact visual composition is deliberately unlocked. Routes should be preserved where practical;
route changes require the later architecture gate to verify static-export and accepted-link
constraints.

## Primary workflows

1. A user enters a known Customer, Workforce, or Administration URL and receives only that
   surface's identity and navigation.
2. After workforce authentication, an enterprise principal reaches a coherent authorized
   destination or hub without needing to know a deep URL. Exact route/redirect realization is
   deferred to the IMP-036A architecture gate.
3. An authenticated enterprise principal sees only available destinations/actions derived from
   effective permissions and scope, including an authorized context switcher when needed.
4. Direct navigation to a denied or absent resource returns the accepted 401/403/non-disclosing-404
   behavior, independent of menu visibility.
5. Responsive navigation preserves current task context and safe back/close behavior.

## Reused authority and implications

Reuse the one existing canonical workforce authentication/session authority,
RBAC/effective-permission authority, static Next export constraints, design tokens/assets,
operations/admin transports, and current runtime topology.

```text
expected_schema_change = NO
expected_new_service = NO
expected_new_auth = NO
expected_new_role = NO
expected_new_permission = NO
expected_provider_IO = NO
```

No application-shell choice grants access. The later architecture must inventory existing URLs and
metadata and prove that shell selection cannot bypass server-side authorization.

## Responsive, accessibility, and state requirements

Customer shell is mobile-first; Workforce is desktop/tablet-first with sensible mobile use;
Administration is desktop-first with graceful fallback. All shared primitives target WCAG 2.2 AA
where reasonably applicable and must support keyboard use, visible focus, semantic landmarks,
announced feedback, focus restoration, and reduced-motion preferences where motion exists.

Each shell must demonstrate loading, empty, error/retry, authentication expiry, denial,
non-disclosing absence, pending/success/failure, unavailable navigation, and responsive states.
Failures should expose safe correlation support from IMP-036 without leaking diagnostics.

## Major acceptance criteria

- Customer presentation/metadata is absent from Workforce and Administration.
- Three recognizable application boundaries exist without a micro-frontend or new service.
- Shared primitives behave consistently while preserving surface-specific information hierarchy.
- Menus and context selection are permission/scope aware; direct URLs remain independently secure.
- Successful workforce login leads to a coherent authorized destination/hub without customer chrome
  or knowledge of a deep URL.
- Navigation contains no destination for an unimplemented capability, even when a future shell slot
  or configuration point exists.
- Existing authorized workflows and practical URLs remain reachable.
- Focus, keyboard, screen-reader, responsive, and recovery behavior pass focused checks.
- Exact-candidate independent technical acceptance and Founder UAT pass.

## Dependencies, non-goals, and deferred decisions

Depends on accepted IMP-035/036, existing design-system assets, and current auth/RBAC. It precedes
IMP-036B–G. Non-goals: new domain/schema/API/provider/auth semantics, roles, permissions,
micro-frontends, services, or final pixel-perfect design. Exact shell composition, route amendments,
and any necessary static-export accommodations are deferred to architecture lock.

Figma is not required initially. Later approved visual refinements may amend this accepted slice
only when they do not change business or authorization semantics.
