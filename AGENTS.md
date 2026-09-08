# AGENTS.md — ats-base (vendored OpenCATS reference)

This repository is a **vendored mirror of upstream [OpenCATS](https://github.com/opencats/OpenCATS)**, kept as a clean reference base for the TBHRC ATS. It is not the place TBHRC feature work happens.

**Fast links:** [Sniper](https://github.com/tbhrc/skills/blob/main/human-ai-operations-map/references/ai-sniper-entry-map.md) · [Workflow](https://github.com/tbhrc/skills/tree/main/github-agent-workflow) · [TBHRC ATS](https://github.com/tbhrc/ats) · [ATS on VPS Skill](https://github.com/tbhrc/skills/tree/main/tb-ats-opencats-on-vps) · [Issues](https://github.com/tbhrc/ats-base/issues)

## Route

- TBHRC ATS product, engineering, deployment or candidate/vacancy/application pipeline work → **[`tbhrc/ats`](https://github.com/tbhrc/ats)**, not here.
- Pulling a newer upstream OpenCATS release into TBHRC → sync it here first as a deliberate, isolated upstream-tracking commit, then integrate into `tbhrc/ats`.
- Recruitment evidence / decision workflow → `tbhrc/recruitment`.

## Rules

- Keep this close to upstream. Do not add TBHRC-specific features, config or business logic here; that belongs in `tbhrc/ats`.
- **Issue-backed by default.** A master controlling Issue backs every substantive or durable unit of work: reuse the existing master controlling Issue; if none exists anywhere org-wide, create a new master controlling Issue before proceeding; child Issues link back to it. Continuation against an existing Issue needs no new Issue and no ceremony update. Metadata is never runtime permission, and issue-less substantive work is not permitted.
- Never expose secrets or credentials.
- `main` keeps progress. KISSS.
