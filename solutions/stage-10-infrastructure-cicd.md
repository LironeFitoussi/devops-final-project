# Stage 10 — Infrastructure CI/CD

Built + verified 2026-07-28 (new).

## What was built

- `repos/three-tier-infrastructure/.github/workflows/terraform-pr.yml`:
  on PR against `main`, a `[dev, prod]` matrix job runs
  `terraform fmt -check -recursive`, `terraform init`, `terraform validate`,
  `terraform plan` in each environment directory — the plan itself
  executes remotely in HCP Terraform (Remote execution mode), this job
  just streams it via `hashicorp/setup-terraform` +
  `secrets.TF_TOKEN_app_terraform_io`.
- `terraform-apply.yml`: on push to `main`, `apply-dev` runs
  unconditionally (`concurrency: { group: terraform-apply,
  cancel-in-progress: false }` to serialize runs); `apply-prod` `needs:
  apply-dev` and sets `environment: production`, which GitHub gates
  behind required reviewers.
- `environments/prod/` — mirrors `environments/dev/` (same five modules +
  monitoring), with `multi_az=true`/`deletion_protection=true` (Stage 4/5
  hardening, carried through) and `single_nat_gateway=false`/
  `one_nat_gateway_per_az=true` (Stage 3 hardening).
- GitHub `production` environment created with a required-reviewer
  protection rule (`gh api .../environments/production`). **Note**: this
  needed `three-tier-infrastructure` to be public — GitHub's Free org
  plan doesn't support required-reviewer rules on private repos. Made
  public deliberately (no secrets live in the repo; AWS auth is OIDC,
  DB password is AWS-managed in Secrets Manager) rather than skip the
  gate.

## Real run history — a genuine PR, not a simulated one

1. Branch `bump-log-retention`, one real change (log retention 7→14 days),
   opened as PR #1.
2. **Both matrix plan checks passed for real** against HCP Terraform:
   `https://github.com/IITC-College/three-tier-infrastructure/actions/runs/30374814702`
   (`plan (dev)` 1m29s, `plan (prod)` 2m21s).
3. Squash-merged the PR → `terraform-apply.yml` fired:
   `apply-dev` completed successfully; `apply-prod` **visibly sat waiting**
   at the `production` environment's required-reviewer gate (confirmed via
   `gh run view --json jobs`, status `waiting`) — never auto-ran.
4. A separate direct push earlier (before the reviewer rule existed)
   *had* let `apply-prod` run unattended and fail on a real AWS account
   limit (`VpcLimitExceeded` — see Stage 12 doc); the reviewer gate now
   correctly prevents that from happening silently again.

## Verification (Success Criteria)

- PR shows a real remote HCP Terraform plan as a check: confirmed (both
  `dev` and `prod`).
- Merging to `main` auto-applies dev: confirmed.
- Prod apply visibly waits on the GitHub Environment approval gate:
  confirmed, twice (once per push to `main` since the gate was set up).
