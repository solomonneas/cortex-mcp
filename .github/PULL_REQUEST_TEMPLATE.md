<!--
Thanks for sending a patch. Keep this short; delete sections that do not apply.
See CONTRIBUTING.md for what lands easily and what needs an issue first.
-->

## What and why

<!-- One or two sentences on the user-visible change and the problem it solves. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New tool / resource / prompt
- [ ] Docs
- [ ] Refactor with no tool-surface change
- [ ] Surface change (tool rename, input-shape change, or loosened safety default) — opened an issue first per CONTRIBUTING.md

## Checklist

- [ ] `npm test` passes locally
- [ ] `npm run lint` (type check) passes
- [ ] Added or updated tests covering the change
- [ ] Updated the `Unreleased` section of `CHANGELOG.md` for any user-visible effect (entries describe effects, not commit subjects)
- [ ] Updated `README.md` (tool tables, counts, Configuration) if the tool surface or env changed
- [ ] No API keys, private Cortex URLs, hostnames, real IPs, account names, or unredacted absolute paths in code, tests, docs, or this PR
- [ ] Destructive capabilities stay confirmation-gated by default (`confirm=true`, `CORTEX_ALLOW_DESTRUCTIVE`, `CORTEX_FILE_BASE_DIR` confinement)
- [ ] Conventional commit messages, no AI co-authorship trailers
