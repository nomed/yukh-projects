# Security policy

Security is part of the product contract, not a release-stage activity.

## Supported versions

Yukh Projects has not published a production release. The `main` branch receives security review, but it currently carries no production support commitment.

## Report a vulnerability

Do not open a public issue or include exploit details in a pull request.

Use [GitHub private vulnerability reporting](https://github.com/nomed/yukh-projects/security/advisories/new). If the private form is unavailable, contact `@nomed` through a private channel listed on the maintainer's GitHub profile and request a secure disclosure channel without including sensitive details in the first message.

Include, when safe:

- affected revision or release;
- impact and realistic attack prerequisites;
- minimal reproduction using synthetic data;
- suggested mitigation, if known;
- whether the issue may expose credentials or consumer information.

We aim to acknowledge a complete report within five business days. Remediation and disclosure timing depend on severity, exploitability, and downstream impact.

## Security priorities

- Authentication and authorization boundaries.
- GitHub token scope and lifetime.
- Workflow and expression injection.
- Untrusted issue, pull request, webhook, and configuration input.
- Secret handling and log redaction.
- Supply-chain integrity and immutable action references.
- Safe planning, dry-run, concurrency, and mutation semantics.
- Consumer-neutrality failures that disclose private context.

## Coordinated disclosure

Maintainers will validate the report, agree on a communication channel, prepare a fix and advisory, and coordinate disclosure. Please allow a reasonable remediation window before publishing details.
