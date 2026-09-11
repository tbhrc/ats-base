# AGENTS.md — ats-base (vendored OpenCATS reference)

<!-- ROUTER_SHARED_LIFECYCLE_START -->
**Direct execution / optional continuity:** Execute authorised work directly. Use an existing GitHub Issue only when it materially helps continuity, handoff or coordination; create one only when that durable record is genuinely useful. Lifecycle/priority labels and the Lifecycle Lever are optional metadata/mechanics and must never trigger extra AI reads, writes, audits, reconciliation, approvals or execution gates. This rule supersedes older mandatory lifecycle/Issue-gate wording.
<!-- ROUTER_SHARED_LIFECYCLE_END -->
This repository is a **vendored mirror of upstream [OpenCATS](https://github.com/opencats/OpenCATS)**, kept as a clean reference base for the TBHRC ATS. It is not the place TBHRC feature work happens.

**Fast links:** [Sniper](https://github.com/tbhrc/skills/blob/main/human-ai-operations-map/references/ai-sniper-entry-map.md) · [Workflow](https://github.com/tbhrc/skills/tree/main/github-agent-workflow) · [TBHRC ATS](https://github.com/tbhrc/ats) · [ATS on VPS Skill](https://github.com/tbhrc/skills/tree/main/tb-ats-opencats-on-vps) · [Issues](https://github.com/tbhrc/ats-base/issues)

## Route

- TBHRC ATS product, engineering, deployment or candidate/vacancy/application pipeline work → **[`tbhrc/ats`](https://github.com/tbhrc/ats)**, not here.
- Pulling a newer upstream OpenCATS release into TBHRC → sync it here first as a deliberate, isolated upstream-tracking commit, then integrate into `tbhrc/ats`.
- Recruitment evidence / decision workflow → `tbhrc/recruitment`.

## Rules

- Keep this close to upstream. Do not add TBHRC-specific features, config or business logic here; that belongs in `tbhrc/ats`.
- **Issues are optional continuity.** Reuse or create an Issue only when it materially improves continuation, handoff, coordination, durable decision history or founder visibility; do not stop authorised work for Issue or label ceremony.
- Never expose secrets or credentials.
- `main` keeps progress. KISSS.
