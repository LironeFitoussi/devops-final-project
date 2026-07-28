# Stage 10 – Infrastructure CI/CD

## Starting Point

Stages 3–7 complete: all Terraform modules exist and work when applied
manually via the Stage 2 workspace.

## Objective

GitHub Actions drives HCP Terraform remote runs — no VCS-driven Terraform
Cloud workflow.

## Tasks

1. In `repos/three-tier-infrastructure/.github/workflows/terraform-pr.yml`:
   on pull request, `terraform fmt -check -recursive`, `terraform init`,
   `terraform validate`, `terraform plan` (using `hashicorp/setup-terraform`
   + the `TF_TOKEN_app_terraform_io` secret from Stage 2 — the plan itself
   executes remotely in HCP Terraform since the workspace is Remote
   execution mode).
2. In `.github/workflows/terraform-apply.yml`: on push to `main`,
   `terraform apply -auto-approve -input=false` against the dev workspace;
   `concurrency` group to prevent overlapping runs.
3. Create `environments/prod/` (mirrors `environments/dev/` structure,
   bound to the `three-tier-prod` workspace).
4. Gate prod's apply behind a GitHub Environment (`environment: production`)
   requiring manual approval (Settings → Environments → production →
   Required reviewers).

## Deliverables

- `.github/workflows/terraform-pr.yml` and `terraform-apply.yml`.
- `environments/prod/` skeleton.

## Success Criteria

- Opening a PR against `main` shows a real remote plan output from HCP
  Terraform as a check.
- Merging to `main` auto-applies against dev.
- A prod apply visibly waits on the GitHub Environment approval gate before
  running.
