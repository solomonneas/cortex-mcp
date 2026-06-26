# Security Policy

## Supported versions

cortex-mcp is published from the `main` branch. Only the latest minor release on `main` receives security fixes. Pin to a released tag if you need a known-good version.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems. Email **me@solomonneas.dev** with: <!-- content-guard: allow pii/email -->

- A short description of the issue.
- Steps to reproduce (or a minimal proof of concept).
- The version or commit you tested against.
- Whether you would like to be credited in the release notes.

You should get an acknowledgment within 72 hours. If you do not, please follow up - the mail may have been filtered.

## In scope

- Path-traversal or symlink-attack flaws in `cortex_run_analyzer_file` and the `CORTEX_FILE_BASE_DIR` confinement (paths outside the configured base directory must be refused, including via `..` or symlink escapes).
- Bypasses of the destructive-action gates: `cortex_run_responder` running without both `CORTEX_ALLOW_DESTRUCTIVE=1` and `confirm=true`, or `cortex_delete_job` / `cortex_disable_analyzer` running without `confirm=true`.
- The scoped SSL behavior leaking: disabling `CORTEX_VERIFY_SSL` must relax TLS only for Cortex requests, never process-wide.
- Leaking the configured `CORTEX_API_KEY` / `CORTEX_SUPERADMIN_KEY` (or other secrets) into tool output, logs, or error messages.
- Unbounded fan-out that ignores `CORTEX_MAX_FANOUT` and submits an observable to every analyzer regardless of the configured cap.

## This server talks to a real Cortex instance

cortex-mcp drives a Cortex engine you point it at. Treat that as a sensitive integration:

- Analyzers submit observables to third-party services (VirusTotal, AbuseIPDB, and similar). Anything you analyze may leave your network. The server does not redact observables before sending them to Cortex.
- Responders cause real-world side effects (blocking, notifying, mailing). They are off by default and require both an environment opt-in and a per-call `confirm=true`.
- The API keys you configure are credentials. Provide them via your MCP client's `env` block or a secret manager, never commit them, and use a least-privilege org key rather than a superadmin key unless you need org/user management.

## Out of scope

- Bugs in Cortex, TheHive, or any analyzer/responder - report those to StrangeBee/TheHive Project or the analyzer author.
- Bugs in the MCP clients themselves (Claude Code, Codex, OpenClaw, Hermes) - report those to their respective projects.
- Issues that require an attacker to already have write access to the user's machine, MCP client config, or npm account.
- Vulnerabilities in the Cortex instance or analyzers that this server merely calls (for example a malicious analyzer report). The server passes Cortex's responses through; hardening Cortex itself is out of scope here.

## Disclosure

We aim to ship a fix within 14 days of confirming a valid report. A coordinated disclosure timeline can be negotiated for issues that need longer.
