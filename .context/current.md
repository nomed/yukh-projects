# Current context

**Status:** repository hardening and clean-room planning
**Project:** Yukh Projects
**Visibility:** public

## Objective

Complete the security baseline and approve the behavior-led migration gates before functional code enters the repository.

## Now

- Track the hardening baseline and migration gates in issue #2.
- Review the repository-settings baseline and threat model.
- Apply admin-only GitHub settings.
- Review the candidate capability inventory and provenance ledger.

## Next

- Close every applicable repository-hardening checkbox.
- Approve the contract and diagnostics specification.
- Implement the first pure, bounded, network-free migration slice.
- Add entirely synthetic parser and diagnostic tests.

## Non-goals

- Importing another repository's history.
- Copying legacy tests, documentation, examples, context, or release evidence.
- Introducing GitHub API access or mutations in the first implementation slice.
- Claiming production readiness before the release gates pass.

## Invariants

- Consumer neutrality is mandatory.
- Every migration slice has provenance, neutrality, security, and test evidence.
- Dry-run is structurally separated from mutation.
- Apply requires two explicit gates and least privilege.
- Published Actions install no dependencies at consumer runtime.
- Executable third-party automation is pinned immutably.
