# Three-Tier ECS Lab — Progress

Tracks stage-by-stage build status. Updated by the `three-tier-stage` skill
after each stage; safe to edit by hand too.

Repos live under `repos/three-tier-*` and are pushed to GitHub under the
`IITC-College` org (private).

| Stage | Title | Status | Blocking issues | Solution doc |
|---|---|---|---|---|
| 1 | Repository Structure and Docker | done | — | [stage-1-repo-structure-and-docker.md](stage-1-repo-structure-and-docker.md) |
| 2 | Terraform Bootstrap (HCP Terraform) | done | — | [stage-2-terraform-bootstrap.md](stage-2-terraform-bootstrap.md) |
| 3 | Networking Module | done | — | [stage-3-networking-module.md](stage-3-networking-module.md) |
| 4 | Security Groups + RDS Module | done | — | [stage-4-security-groups-rds-module.md](stage-4-security-groups-rds-module.md) |
| 5 | ECS Module | done | — | [stage-5-ecs-module.md](stage-5-ecs-module.md) |
| 6 | Frontend Module | done | — | [stage-6-frontend-module.md](stage-6-frontend-module.md) |
| 7 | GitHub OIDC | done | — | [stage-7-github-oidc.md](stage-7-github-oidc.md) |
| 8 | Backend CI/CD | done | — | [stage-8-backend-cicd.md](stage-8-backend-cicd.md) |
| 9 | Frontend CI/CD | done | — | [stage-9-frontend-cicd.md](stage-9-frontend-cicd.md) |
| 10 | Infrastructure CI/CD | done | — | [stage-10-infrastructure-cicd.md](stage-10-infrastructure-cicd.md) |
| 11 | Monitoring | done | SNS email subscription pending user confirmation; alarm not yet force-triggered | [stage-11-monitoring.md](stage-11-monitoring.md) |
| 12 | HTTPS/Domain/Prod Hardening | blocked | Code complete, plan-verified; shared AWS account at VPC quota (5/5), increase requested and pending | [stage-12-https-domain-prod-hardening.md](stage-12-https-domain-prod-hardening.md) |

Status values: `not started` / `blocked` / `in progress` / `done`.

## Open lab-doc issues

- **2026-07-28 reconciliation**: this doc previously claimed Stages 2–5
  "done," but the actual `repos/` directory didn't exist on disk — the
  top-level `devops-final-project` instead had
  `three-tier-backend/frontend/infrastructure` loose at the repo root,
  already `git init` + pushed to GitHub under the personal `LironeFitoussi`
  account, contradicting the documented local-only convention.
  Investigated before touching anything: `three-tier-infrastructure`
  contained only a README (no Terraform code at all); the HCP Terraform
  workspaces `three-tier-dev`/`three-tier-prod` exist but show 0 resources;
  `aws` CLI confirmed no VPC/RDS/ECS/ALB for this project exists in the AWS
  account (`050752632489`); the `app.terraform.io` IAM OIDC provider Stage
  2's notes said it had imported is also gone. Conclusion: Stages 2–5's
  Terraform work never actually landed anywhere durable (or was destroyed
  along with its code) — only the app-level work (Stage 1's "Woods & Tools"
  app) is real. User decided: move the three repos into `repos/` (matching
  the documented layout) and push them fresh to the **`IITC-College`**
  GitHub org instead of the personal account. Stages 2–5 reset to
  `not started` above and are being redone for real, reusing the existing
  (empty) HCP Terraform workspaces rather than recreating them. See
  `CLAUDE.md` "Settled decisions" for the durable version of this note.
- Stage 1: backend is a real app ("Woods & Tools") requiring a live DB at
  boot, not a bare skeleton — see `docs/lab/notes/stage-1.md`. Carry into
  Stage 4/5/6/9: `DATABASE_URL` wiring, ECS health check must target
  `/health` not `/health/db`, frontend needs `VITE_API_URL` at build time.
  Re-verified 2026-07-28 after the repo move: `docker build`+`run` backend
  against a real Postgres container returns `200` on `/health`, all 11
  backend `pytest` tests pass, `npm run build` and all 12 frontend `vitest`
  tests pass.
- Stage 2 (prior pass, kept for reference): HCP Terraform org is
  `lironefitoussi` (not a new dedicated org — free tier blocked creation).
  This is **not** changing — only the GitHub repo org moved to
  `IITC-College`; HCP Terraform stays on the personal org. The
  `TF_TOKEN_app_terraform_io` GitHub secret is needed by Stage 10, now that
  repos exist on GitHub (under `IITC-College`) — still to be created when
  Stage 10 is implemented.
- Stage 3 (prior pass, kept for reference — technical gotcha still
  applies): CLI-driven HCP Terraform runs (including from GitHub Actions in
  Stage 10) only upload the current working directory —
  `../../modules/*` sources fail remotely. Fix: an
  `environments/dev/modules -> ../../modules` symlink + `./modules/<name>`
  sources. Apply this pattern from the start in every `environments/dev`
  (and later `environments/prod`) module call.
- **Mid-build architecture change (2026-07-28)**: switched
  `modules/network`/`database`/`ecs` from hand-rolled AWS resources to
  thin wrappers around `terraform-aws-modules` (vpc, rds, ecs
  cluster+service, alb) — user's explicit call after reviewing the
  hand-rolled approach mid-Stage-3, on the grounds that it's not how a
  real/portfolio system would be built. `modules/frontend` and
  `modules/github-oidc` were kept hand-rolled (small, genuinely custom).
  See each stage's solution doc for specifics.

## Live system status (2026-07-28, end of this pass)

**Dev is fully live and verified end-to-end, including real CI/CD:**
- API: `http://three-tier-dev-alb-1210103999.eu-west-1.elb.amazonaws.com/health` → `{"status":"ok"}`
- Frontend: `https://d33rg73pt27q56.cloudfront.net/` → 200, SPA routing confirmed
- A real commit → GitHub Actions → OIDC → ECS deploy round-trip has
  actually happened (Stage 8 run `30371051818`), not just planned.
- A real PR → HCP Terraform plan check → merge → auto-apply-dev round-trip
  has actually happened (Stage 10 PR #1), not just planned.

**Outstanding, not something further code changes will fix:**
1. SNS alarm email (`lironefitoussi@gmail.com`) needs manual confirmation
   — check inbox for an AWS Notification subscription-confirmation email.
2. Stage 12 (prod HTTPS/domain) is code-complete and plan-verified but
   blocked on an AWS VPC-quota increase for this shared classroom
   account (request pending, id lookup via
   `aws service-quotas list-requested-service-quota-change-history
   --service-code vpc`). Once it clears: re-approve the waiting
   `apply-prod` GitHub Actions deployment on
   `IITC-College/three-tier-infrastructure`, or re-run
   `terraform apply` in `environments/prod` directly.
3. Stage 11's alarms are applied but not yet force-triggered/confirmed
   to actually fire (would require scaling the shared dev service to 0,
   deliberately deferred rather than done silently).
