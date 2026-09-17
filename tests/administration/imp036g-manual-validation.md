# IMP-036G manual technical validation

Manual keyboard, assistive-technology sampling, and small-mobile functional-parity
record for Administration Console V2.

This artifact is **not** Founder UAT and **not** formal WCAG certification.
Product Definition §18 and PD-1 Definition of Done require this sampling before
`IMP036G_IMPLEMENTATION_COMPLETE = YES`. Automated AC evidence in
`imp036g-ac-evidence.md` is not a substitute.

Do **not** mark `OVERALL_RESULT: PASS` until a human tester records actual results
against the exact candidate below.

```text
OVERALL_RESULT: NOT_PERFORMED
```

Allowed overall values: `PASS` | `DEFECTS` | `NOT_PERFORMED`.

## Candidate

```text
MERGED_MAIN: c35c9eab6a30ec6ce745cefd75c523181326f360
TREE:        266fe3b07811f6942e76cac155d58ba07daabe56
```

| Field | Recorded value |
|---|---|
| Candidate SHA | `c35c9eab6a30ec6ce745cefd75c523181326f360` |
| Candidate tree | `266fe3b07811f6942e76cac155d58ba07daabe56` |
| Browser | NOT_PERFORMED |
| OS | NOT_PERFORMED |
| Viewport(s) | NOT_PERFORMED |
| Assistive technology | NOT_PERFORMED |
| Tester | NOT_PERFORMED |
| Date | NOT_PERFORMED |
| Manual keyboard result | NOT_PERFORMED |
| AT sampling result | NOT_PERFORMED |
| Small-mobile result | NOT_PERFORMED |
| Defects / observations | NOT_PERFORMED |
| Overall result | NOT_PERFORMED |

## Keyboard

Enter Admin without a mouse. Traverse Overview and primary IA, then the listed
workspaces. Mandatory high-consequence actions must remain keyboard reachable.

| Journey | Result (`PASS` / `DEFECT` / `NOT_PERFORMED`) | Notes |
|---|---|---|
| Enter Admin without mouse | NOT_PERFORMED | |
| Traverse Overview and primary IA | NOT_PERFORMED | |
| Organization resource list / detail / form | NOT_PERFORMED | |
| Workforce membership list / detail | NOT_PERFORMED | |
| Access / effective permissions | NOT_PERFORMED | |
| Audit | NOT_PERFORMED | |
| System operational status | NOT_PERFORMED | |
| All mandatory high-consequence actions remain keyboard reachable | NOT_PERFORMED | |

## Dialog / focus

For each action, verify: focus enters the confirmation dialog; target is
understandable; consequence is announced/readable; Confirm is keyboard reachable;
Cancel is keyboard reachable; Escape cancels when defined; focus returns sensibly
after close; duplicate action cannot accidentally fire.

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | NOT_PERFORMED | |
| Suspend membership | NOT_PERFORMED | |
| Revoke membership | NOT_PERFORMED | |
| Expire invited membership | NOT_PERFORMED | |
| Grant role | NOT_PERFORMED | |
| Revoke role | NOT_PERFORMED | |

## Visible focus

| Surface | Result | Notes |
|---|---|---|
| Navigation | NOT_PERFORMED | |
| Buttons | NOT_PERFORMED | |
| Links | NOT_PERFORMED | |
| Form inputs | NOT_PERFORMED | |
| Pagination / load-more | NOT_PERFORMED | |
| Dialogs | NOT_PERFORMED | |

## Labels / semantics

| Check | Result | Notes |
|---|---|---|
| Form fields have usable names | NOT_PERFORMED | |
| Headings are coherent | NOT_PERFORMED | |
| Main navigation is understandable | NOT_PERFORMED | |
| Status is not communicated only by colour | NOT_PERFORMED | |
| Errors are understandable | NOT_PERFORMED | |
| Success feedback is perceivable | NOT_PERFORMED | |

## Assistive-technology sampling

Use a screen reader appropriate to the tester's environment. Record the AT,
browser, OS, candidate SHA, and date with each sampled journey.

| Sampled journey | Result | Notes |
|---|---|---|
| Admin Overview | NOT_PERFORMED | |
| One resource edit | NOT_PERFORMED | |
| One destructive confirmation | NOT_PERFORMED | |
| Membership detail | NOT_PERFORMED | |
| Effective Permissions | NOT_PERFORMED | |
| Audit filters | NOT_PERFORMED | |
| System status | NOT_PERFORMED | |

```text
SCREEN_READER_USED: NOT_PERFORMED
BROWSER: NOT_PERFORMED
OS: NOT_PERFORMED
CANDIDATE_SHA: c35c9eab6a30ec6ce745cefd75c523181326f360
DATE: NOT_PERFORMED
```

## Responsive / small-mobile functional parity

At a small-mobile viewport, mandatory actions must remain possible and safe.
Layout may differ from desktop. Functional parity is required.

| Action | Result | Notes |
|---|---|---|
| Deactivate org resource | NOT_PERFORMED | |
| Suspend membership | NOT_PERFORMED | |
| Revoke membership | NOT_PERFORMED | |
| Expire invited membership | NOT_PERFORMED | |
| Grant role | NOT_PERFORMED | |
| Revoke role | NOT_PERFORMED | |

```text
SMALL_MOBILE_VIEWPORT: NOT_PERFORMED
```

## Defects / observations

None recorded. Validation has not been performed.
