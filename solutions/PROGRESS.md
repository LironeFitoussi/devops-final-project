# Three-Tier ECS Lab — Progress

Tracks stage-by-stage build status. Updated by the `three-tier-stage` skill
after each stage; safe to edit by hand too.

Repos live under `repos/three-tier-*` and are pushed to GitHub under the
`IITC-College` org (private).

| Stage | Title | Status | Blocking issues | Solution doc |
|---|---|---|---|---|
| 1 | Repository Structure and Docker | done | — | [stage-1-repo-structure-and-docker.md](stage-1-repo-structure-and-docker.md) |
| 2 | Terraform Bootstrap (HCP Terraform) | not started | — | — |
| 3 | Networking Module | not started | — | — |
| 4 | Security Groups + RDS Module | not started | — | — |
| 5 | ECS Module | not started | — | — |
| 6 | Frontend Module | not started | — | — |
| 7 | GitHub OIDC | not started | — | — |
| 8 | Backend CI/CD | not started | — | — |
| 9 | Frontend CI/CD | not started | — | — |
| 10 | Infrastructure CI/CD | not started | — | — |
| 11 | Monitoring | not started | — | — |
| 12 | HTTPS/Domain/Prod Hardening | not started | — | — |

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
