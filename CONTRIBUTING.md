# Contributing to Yukh Projects

Thank you for helping build predictable and secure GitHub Projects automation.

## Before contributing

Read the [consumer neutrality policy](NEUTRALITY.md), [security policy](SECURITY.md), [governance](GOVERNANCE.md), and [Code of Conduct](CODE_OF_CONDUCT.md). Never place private or adopter-derived material in an issue, branch, commit, test, or pull request.

For a bug or proposal, open the corresponding structured issue form. Security vulnerabilities use the private process in `SECURITY.md`.

## Development workflow

1. Start from an accepted issue or clearly explain the problem in the pull request.
2. Keep the change focused and consumer-neutral.
3. Add or update tests using invented fixtures only.
4. Run the documented checks locally.
5. Use a Conventional Commit-style subject when practical.
6. Open a draft pull request early for architectural or security-sensitive work.

## Pull request expectations

A mergeable pull request includes:

- a concise problem statement and generic use case;
- tests and documentation appropriate to the behavior;
- security and permission impact;
- migration or compatibility impact;
- an explicit consumer-neutrality attestation;
- immutable pins for executable third-party automation.

Reviewers may ask for a contribution to be redesigned if it introduces consumer coupling, excess permissions, hidden network behavior, unsafe defaults, or an avoidable supply-chain dependency.

## Certificate of origin

By contributing, you certify that you have the right to submit the work under this repository's license. Add a `Signed-off-by` trailer to commits when possible:

```text
Signed-off-by: Your Name <your-address@example.com>
```

This is the Developer Certificate of Origin convention and is not a copyright assignment.
