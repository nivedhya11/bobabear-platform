# IMP-036G manual technical validation

Manual keyboard, assistive-technology sampling, and small-mobile functional-parity
record for Administration Console V2.

This artifact is **not** Founder UAT and **not** formal WCAG certification.
Product Definition §18 and PD-1 Definition of Done require this sampling before
`IMP036G_IMPLEMENTATION_COMPLETE = YES`. Automated AC evidence in
`imp036g-ac-evidence.md` is not a substitute.

```text
OVERALL_RESULT: PASS
```

Allowed overall values: `PASS` | `DEFECTS` | `NOT_PERFORMED`.

## Candidate

```text
MERGED_MAIN: c35c9eab6a30ec6ce745cefd75c523181326f360
TREE:        266fe3b07811f6942e76cac155d58ba07daabe56
```

Provenance for this recorded human result:

```text
VALIDATED_IMPLEMENTATION_CANDIDATE_SHA:  c35c9eab6a30ec6ce745cefd75c523181326f360
VALIDATED_IMPLEMENTATION_CANDIDATE_TREE: 266fe3b07811f6942e76cac155d58ba07daabe56
CURRENT_MAIN_AT_EVIDENCE_PERSISTENCE:    129d4541237be2a227899ae288c299e768824db9
```

Subsequent main movement after the validated candidate was documentation-only PR #162
(IMP-040 pre-gate Product Definition / product index / testing inventory). No
application/runtime source changed; the validated IMP-036G implementation candidate
remains `c35c9eab6a30ec6ce745cefd75c523181326f360` /
`266fe3b07811f6942e76cac155d58ba07daabe56`.

| Field | Recorded value |
|---|---|
| Candidate SHA | `c35c9eab6a30ec6ce745cefd75c523181326f360` |
| Candidate tree | `266fe3b07811f6942e76cac155d58ba07daabe56` |
| Browser | Chrome latest / Edge latest |
| OS | Windows 11 |
| Viewport(s) | Desktop 1920x1080; small-mobile 375x667 @ 100% zoom |
| Assistive technology | NVDA / Narrator |
| Tester | Ashutosh |
| Date | 2026-09-18 |
| Manual keyboard result | PASS |
| Dialog / focus result | PASS |
| Desktop high-consequence actions | PASS |
| Visible focus result | PASS |
| Labels / semantics result | PASS |
| AT sampling result | PASS |
| Small-mobile result | PASS |
| Defects / observations | NONE |
| Overall result | PASS |

## Keyboard

Enter Admin without a mouse. Traverse Overview and primary IA, then the listed
workspaces. Mandatory high-consequence actions must remain keyboard reachable.

| Journey | Result (`PASS` / `DEFECT` / `NOT_PERFORMED`) | Notes |
|---|---|---|
| Enter Admin without mouse | PASS | |
| Traverse Overview and primary IA | PASS | |
| Organization resource list / detail / form | PASS | |
| Workforce membership list / detail | PASS | |
| Access / effective permissions | PASS | |
| Audit | PASS | |
| System operational status | PASS | |
| All mandatory high-consequence actions remain keyboard reachable | PASS | |

## Dialog / focus

For each action, verify: focus enters the confirmation dialog; target is
understandable; consequence is announced/readable; Confirm is keyboard reachable;
Cancel is keyboard reachable; Escape cancels when defined; focus returns sensibly
after close; duplicate action cannot accidentally fire.

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | PASS | |
| Suspend membership | PASS | |
| Revoke membership | PASS | |
| Expire invited membership | PASS | |
| Grant role | PASS | |
| Revoke role | PASS | |

## Visible focus

| Surface | Result | Notes |
|---|---|---|
| Navigation | PASS | |
| Buttons | PASS | |
| Links | PASS | |
| Form inputs | PASS | |
| Pagination / load-more | PASS | |
| Dialogs | PASS | |

## Labels / semantics

| Check | Result | Notes |
|---|---|---|
| Form fields have usable names | PASS | |
| Headings are coherent | PASS | |
| Main navigation is understandable | PASS | |
| Status is not communicated only by colour | PASS | |
| Errors are understandable | PASS | |
| Success feedback is perceivable | PASS | |

## Assistive-technology sampling

Use a screen reader appropriate to the tester's environment. Record the AT,
browser, OS, candidate SHA, and date with each sampled journey.

| Sampled journey | Result | Notes |
|---|---|---|
| Admin Overview | PASS | |
| One resource edit | PASS | |
| One destructive confirmation | PASS | |
| Membership detail | PASS | |
| Effective Permissions | PASS | |
| Audit filters | PASS | |
| System status | PASS | |

```text
SCREEN_READER_USED: NVDA / Narrator
BROWSER: Chrome latest / Edge latest
OS: Windows 11
CANDIDATE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360
DATE: 2026-09-18
```

## Responsive / small-mobile functional parity

At a small-mobile viewport, mandatory actions must remain possible and safe.
Layout may differ from desktop. Functional parity is required.

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | PASS | |
| Suspend membership | PASS | |
| Revoke membership | PASS | |
| Expire invited membership | PASS | |
| Grant role | PASS | |
| Revoke role | PASS | |

```text
SMALL_MOBILE_VIEWPORT: 375x667 @ 100% zoom
```

## Defects / observations

NONE
