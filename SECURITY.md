# Security Policy

## Supported versions

MindBop is under active development. Security fixes should target the current `main` branch unless maintainers explicitly identify another supported release.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a suspected security vulnerability.

Use GitHub's private vulnerability reporting/security advisory mechanism when available for the repository. If that channel is unavailable, contact the project maintainer privately through the contact method listed in the repository profile.

When reporting an issue, include:

- A concise description of the vulnerability.
- The affected route, component, game, or server behavior.
- Reproduction steps or a minimal proof of concept.
- The potential impact.
- Relevant logs or screenshots with secrets and personal data removed.
- A suggested mitigation if you have one.

Please allow reasonable time for investigation and remediation before public disclosure.

## Security expectations for contributors

Do not commit:

- API keys
- Database passwords
- Supabase service-role keys
- Private signing secrets
- Production credentials
- Personal data
- Private infrastructure configuration

Client code is untrusted. Multiplayer servers must validate player actions, game rules, scoring, timers, permissions, and state transitions server-side.

## Dependency security

Contributors should keep dependencies reasonably current and review security advisories before introducing or upgrading packages with significant privileges or network access.
