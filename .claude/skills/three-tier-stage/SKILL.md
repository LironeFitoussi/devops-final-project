---
name: three-tier-stage
description: Run one stage of the Three-Tier ECS Fargate solo lab. Use when the user says "/three-tier-stage <N>", "do stage N", "next stage", "validate stage N", or asks to work through this lab stage by stage.
---

# three-tier-stage runner

Solo-project workflow for building the Three-Tier ECS Fargate lab stage by
stage. Full context in [docs/lab/00-overview.md](../../../docs/lab/00-overview.md)
and `CLAUDE.md`. `repos/three-tier-*` are independent git repos (gitignored
here), pushed to `github.com/IITC-College/<name>` (private). Once Stage
8–10 CI/CD exists, use feature branches + PRs into `main` rather than
direct pushes.

Read `solutions/PROGRESS.md` first — it's the source of truth for what
stage we're on and any already-known blocking issues.

## Invocation

`/three-tier-stage <N>` where N is one of `1`–`12`, or `next` (first
`not started`/`blocked` row in PROGRESS.md).

## Procedure

Do these steps **in order**.

### 1. Load context

- Read `docs/lab/stage-<N>.md` — the spec (Objective/Tasks/Deliverables/
  Success Criteria), kept pure instructions only.
- Read `docs/lab/notes/stage-<N>.md` if it exists — clarifications/decisions
  already recorded from a prior pass live here, never in the spec file
  itself.
- Read `solutions/PROGRESS.md` for this stage's row and any prior blocking
  issues.
- Confirm the previous stage's row is `done` — if not, stop and tell the
  user; stages are sequential by design (each stage's "Starting Point"
  assumes the previous stage's Success Criteria are actually met).

### 2. Clarity gate — stop before writing any code

Re-read the stage doc as if seeing it for the first time. Check for:
- Instructions that contradict the actual repo/AWS state.
- Ambiguous or underspecified requirements.
- Success criteria that can't be objectively checked from what the tasks
  produce.
- Any conflict with the settled decisions in `CLAUDE.md` (HCP Terraform,
  the two distinct OIDC trusts, `ignore_changes = [task_definition]`, etc.).

If anything is unclear: **stop. Do not implement.**
1. Explain the specific issue in plain terms — quote the offending line.
2. Propose a concrete fix (a doc wording change or an interpretation
   decision).
3. Ask the user to confirm.
4. Once confirmed: if it's a wording issue, this project has no external
   source of truth to defer to (no Notion page, no VCS-synced spec) — just
   patch `docs/lab/stage-<N>.md` directly after the user confirms the fix.
5. Record the resolution in `docs/lab/notes/stage-<N>.md` (create it if it
   doesn't exist — never in `docs/lab/stage-<N>.md`) and in the
   `solutions/PROGRESS.md` row before continuing.

Only proceed to step 3 once the stage is clear.

### 3. Implement

- Work directly in `repos/three-tier-<component>/` (frontend / backend /
  infrastructure, per what the stage touches) — no cloning, no `gh repo
  create`, no PR workflow. Commit locally when the stage's work is done.
- Implement the stage's tasks against its actual Deliverables/Success
  Criteria — don't gold-plate beyond what's listed.
- Before finishing, walk the stage's own Success Criteria checklist and
  verify each one concretely (build it, run it, curl it, `terraform plan/apply`
  it, `aws ecs describe-services` it — whatever proves it, don't just
  eyeball the code).

### 4. Write the solution file

Create `solutions/stage-<N>-<slug>.md` (separate from the actual code/config
changes). Include:
- What was built and where (files/repos touched).
- Key decisions and why, especially any deviation from the literal doc
  wording.
- Any clarity-gate issue found in step 2 and how it was resolved.
- Exact commands to reproduce/verify the stage's Success Criteria.
- Anything worth remembering before starting the next stage.

### 5. Update PROGRESS.md

Flip the stage's status to `done`, fill in the solution-doc link, clear the
blocking-issues cell (or note it's resolved), and add a one-line note for
the next stage's "Starting Point" if anything relevant changed.

## Notes

- `docs/lab/stage-<N>.md` is the pure spec — `docs/lab/notes/stage-<N>.md`
  is where clarifications/decisions/gotchas live. Never mix the two.
- Never silently skip a Deliverable or Success Criterion — if something is
  genuinely out of scope for a pass, say so explicitly in the solution file
  rather than omitting it.
- Two distinct OIDC trusts exist across this lab (Stage 2: HCP Terraform ↔
  AWS; Stage 7: GitHub Actions app-deploy ↔ AWS) — don't conflate them when
  implementing either stage.
