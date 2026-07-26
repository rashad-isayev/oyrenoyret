# Security policy

Do not open a public issue for a suspected vulnerability or exposed credential. Use GitHub's private vulnerability reporting for this repository and include the affected route or component, reproduction steps, impact, and any suggested mitigation.

Never include live credentials, personal student data, or unredacted production records in a report. Revoke and rotate a credential immediately if exposure is suspected.

Security fixes must be validated on an isolated development branch before they
are merged into `main`. Production operators should deploy only reviewed
commits from `main`, apply database migrations before serving a new application
version, and keep automated dependency and secret-scanning checks enabled.
