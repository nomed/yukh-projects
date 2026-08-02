# Repository hardening baseline

This document defines the minimum GitHub repository settings for Yukh Projects. Source-controlled controls complement these settings; they do not replace them.

## Status

The settings below require repository-admin access in the GitHub web interface or an authenticated administrative API. Record completion in tracking issue #2 without posting secrets, token identifiers, or environment details.

## General settings

Configure pull request merges as follows:

- enable squash merging;
- disable merge commits;
- disable rebase merging;
- use the pull request title as the default squash commit title;
- delete head branches automatically after merge;
- keep Issues enabled;
- enable Discussions only after moderation ownership is established.

A single merge strategy keeps the public history linear and makes release notes and provenance easier to audit.

## Default-branch ruleset

Create an active branch ruleset named **main-protection** targeting the default branch.

| Rule | Required value |
| --- | --- |
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require linear history | Enabled |
| Require a pull request before merging | Enabled |
| Required approvals | **0** while there is only one maintainer |
| Require conversation resolution | Enabled |
| Require status checks | Enabled |
| Required check | **Consumer neutrality** |
| Require branch to be up to date | Enabled |
| Allow bypass | None for routine work |
| Require signed commits | Defer until bots and release automation are verified |

Do not require one approval while the project has only one maintainer: GitHub does not allow an author to approve their own pull request, which would make normal maintenance impossible. Raise the requirement to one approval when a second active maintainer is appointed.

## Actions

Apply these defaults:

- allow only GitHub-authored actions initially;
- set workflow permissions to read repository contents and packages;
- do not allow GitHub Actions to create or approve pull requests by default;
- require approval for workflows from first-time external contributors;
- retain logs and artifacts for 30 days unless a release artifact requires a longer documented period;
- require each workflow and job to declare the minimum explicit permissions;
- pin every executable third-party action to a full commit SHA;
- never use **pull_request_target** to execute code from an untrusted pull request.

Extending the action allowlist requires a security review and an immutable pin.

## Code security

Enable every available control:

- dependency graph;
- Dependabot alerts;
- Dependabot security updates;
- secret scanning;
- push protection;
- validity checks for detected credentials;
- private vulnerability reporting.

Dismiss an alert only with a documented rationale. A detected credential is rotated before history cleanup.

## Authentication and secrets

- Prefer short-lived GitHub App installation tokens.
- Keep dry-run read-only.
- Isolate apply credentials from pull request workflows.
- Never use one organization-wide personal access token for unrelated repositories.
- Store only required secrets and document their permissions without recording values or identifiers.
- Review secrets and variables at least quarterly and after every maintainer change.

## Releases

Before the first preview release:

- create a protected release environment;
- require explicit maintainer approval for publication;
- grant release-time write permissions only to the publication job;
- generate provenance, checksums, and a software bill of materials;
- protect stable tags against deletion or movement;
- verify that release notes pass consumer-neutrality review.

## Verification cadence

Review this baseline after material workflow changes and at least quarterly. Evidence should record the setting name, expected value, reviewer, and date—never secrets or private deployment details.
