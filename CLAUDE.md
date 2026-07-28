# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Planning/orchestration shell for a 12-stage solo DevOps lab: a Three-Tier
Application on AWS ECS Fargate. This top-level repo holds only docs and the
stage-runner skill — **no app or Terraform code is committed here.**

- `docs/lab/00-overview.md` — architecture + full 12-stage roadmap.
- `docs/lab/stage-N.md` — pure stage specs (Objective/Tasks/Deliverables/Success Criteria).
- `docs/lab/original-spec-he.md` — verbatim archive of the original Hebrew architecture spec (superseded in places, see below).
- `solutions/PROGRESS.md` — stage-by-stage status tracker.
- `.claude/skills/three-tier-stage/SKILL.md` — runs one stage: load context → clarity gate → implement → write solution doc → update PROGRESS.
- `repos/three-tier-frontend/`, `repos/three-tier-backend/`, `repos/three-tier-infrastructure/` — the actual code. Each is gitignored here and is its own independent git repo, pushed to `github.com/IITC-College/<name>` (private).

## Settled decisions (don't re-litigate these)

- **Terraform backend is HCP Terraform** (remote execution, Dynamic Provider
  Credentials), **not** a plain S3+DynamoDB backend. GitHub Actions triggers
  HCP Terraform runs via `hashicorp/setup-terraform` + `TF_TOKEN_app_terraform_io`.
- HCP Terraform authenticates to AWS via Dynamic Provider Credentials
  (`TFC_AWS_PROVIDER_AUTH`, `TFC_AWS_RUN_ROLE_ARN`) — set up once in Stage 2's
  `bootstrap/`. This is a **separate OIDC trust** from the GitHub Actions
  app-deploy roles created in Stage 7 (`token.actions.githubusercontent.com`)
  — don't conflate the two.
- Backend/frontend deploy pipelines (Stages 8–9) talk to AWS directly via
  their own GitHub OIDC roles and **never go through Terraform**.
- The ECS service resource needs `lifecycle { ignore_changes = [task_definition] }`
  so CI-driven deploys aren't reverted by the next `terraform apply`.
- `docs/lab/original-spec-he.md`'s own module list still describes
  `bootstrap/` as creating "S3 bucket for Terraform state" — that's
  superseded by Stage 2's HCP Terraform approach. Don't resurrect it.
- Repos under `repos/` are pushed to GitHub under the **`IITC-College`**
  org (private repos), not the personal `LironeFitoussi` account — chosen
  2026-07-28 when reconciling stale docs against actual repo state (see
  `solutions/PROGRESS.md` "Open lab-doc issues"). HCP Terraform stays on
  the personal **`lironefitoussi`** org — that's a separate system, not
  moved.
- As of 2026-07-28: none of the Terraform infrastructure described as
  "done" for Stages 2–5 actually exists (empty `three-tier-infrastructure`
  repo, HCP workspaces `three-tier-dev`/`three-tier-prod` show 0 resources,
  no matching AWS resources) — that work is being redone for real. The
  `repos/three-tier-backend` and `repos/three-tier-frontend` app code is
  real and current (verified: docker build/run + `/health`, `npm run
  build`, both test suites all pass) — keep building on it, don't reset it.
- Once Stage 8–10 CI/CD exists, use feature branches + PRs into `main`
  (not direct pushes) — the whole point is demonstrating a clean CI/CD
  process on merge, and Stage 10's own success criteria requires a PR to
  show a real HCP Terraform plan as a check.

## Working stage by stage

Use the `three-tier-stage` skill (or just read `docs/lab/stage-N.md` +
`solutions/PROGRESS.md` directly) rather than jumping ahead — each stage's
"Starting Point" assumes the previous stage's Success Criteria are actually
met.
