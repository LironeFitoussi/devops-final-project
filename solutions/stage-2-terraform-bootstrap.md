# Stage 2 — Terraform Bootstrap (HCP Terraform)

## What was built

- **HCP Terraform**: org `lironefitoussi` (see `docs/lab/notes/stage-2.md`
  for why — free tier blocked a new dedicated org), two new workspaces:
  - `three-tier-dev` (`ws-EeNEXior9u9NQpv2`)
  - `three-tier-prod` (`ws-kCrrU5uk9MAfZZhu`)
  Both: execution mode **Remote**, no VCS connection, env vars
  `TFC_AWS_PROVIDER_AUTH=true` and `TFC_AWS_RUN_ROLE_ARN=<role arn>` set
  via the HCP Terraform API.
- `repos/three-tier-infrastructure/bootstrap/main.tf` — local-state-only
  Terraform (real AWS credentials from the local AWS CLI session,
  `.terraform/`/`*.tfstate` gitignored): imports the AWS account's
  existing `app.terraform.io` OIDC provider and creates IAM role
  `three-tier-lab-tfc-run`, trust-policy-scoped (via the `sub` claim) to
  exactly the two workspaces above. Applied for real — this created a live
  IAM role in AWS account `050752632489`.

## Key decisions / deviations from the literal doc

1. **Reused an existing HCP Terraform org** (`lironefitoussi`) instead of
   creating a new one — the doc says "if none exists," but two existed and
   free-tier org-creation was blocked outright. Confirmed with user.
2. **Imported, not created, the `app.terraform.io` OIDC provider** — one
   already existed in the AWS account from prior unrelated work. IAM only
   allows one provider per issuer URL, so `bootstrap/main.tf`'s
   `aws_iam_openid_connect_provider.tfc` was imported into state rather
   than reapplied from scratch; its `thumbprint_list` in the config was
   updated to match the real provider's thumbprint to avoid perpetual
   diff/drift.
3. **`AdministratorAccess` on the run role** — the role's trust policy is
   already scoped tightly (only `three-tier-dev`/`three-tier-prod` can
   assume it), but the permission policy itself is broad rather than a
   least-privilege custom policy. Reasonable for a solo lab account;
   flagged in a comment in `main.tf` as something to revisit before this
   pattern ever touches a shared/prod AWS account.
4. **`TF_TOKEN_app_terraform_io` GitHub secret deferred to Stage 10** — see
   `docs/lab/notes/stage-2.md`. No GitHub remote exists yet for any of the
   three repos (settled in CLAUDE.md), so there's nowhere to attach the
   secret today; Stage 10 is where GitHub Actions → HCP Terraform CI
   actually gets wired up.

## Verification (Success Criteria)

**No static AWS keys anywhere**: only two env vars are set on each
workspace — confirmed via the API:

```bash
curl -s --header "Authorization: Bearer $TF_API_TOKEN" \
  https://app.terraform.io/api/v2/workspaces/ws-EeNEXior9u9NQpv2/vars | jq '.data[].attributes.key'
# TFC_AWS_PROVIDER_AUTH, TFC_AWS_RUN_ROLE_ARN — nothing else
```

**A manually-queued run in each workspace authenticates to AWS via the
assumed role**: ran a throwaway `terraform plan` (via `terraform { cloud
{...} }`, executed in HCP Terraform's remote runners, config never
committed — just `data.aws_caller_identity`) against both workspaces:

```
# three-tier-dev  → run-nrjKKNT7mCNGJaUt
caller_arn = "arn:aws:sts::050752632489:assumed-role/three-tier-lab-tfc-run/terraform-run-nrjKKNT7mCNGJaUt"

# three-tier-prod → run-wdU8q6iJqwKjegNL
caller_arn = "arn:aws:sts::050752632489:assumed-role/three-tier-lab-tfc-run/terraform-run-wdU8q6iJqwKjegNL"
```

Both show the run assuming `three-tier-lab-tfc-run` in the correct AWS
account (`050752632489`, matching `aws sts get-caller-identity` locally) —
Dynamic Provider Credentials confirmed working end-to-end for both
workspaces. Neither plan was applied (no real resources created by the
smoke test; only `bootstrap/`'s own 2 resources — the role and its policy
attachment — are real).

**`bootstrap/` is one-time, not touched again**: it's a normal committed
file (`main.tf`, `.terraform.lock.hcl`); only its state/plan artifacts are
gitignored. No later stage should `terraform apply` here again.

```bash
git -C repos/three-tier-infrastructure log --oneline
# bf4912e Add HCP Terraform bootstrap: AWS OIDC trust for dynamic credentials
# f1f3b31 Initial project setup (Stage 1)
```

## Next stage starting point

Stage 3 (Networking Module) starts real `environments/dev` Terraform,
executed remotely through the `three-tier-dev` workspace — Dynamic
Provider Credentials are live and verified, so the AWS provider block in
`environments/dev` needs no credentials configuration at all, just
`provider "aws" { region = "eu-west-1" }`. Remember: `TF_TOKEN_app_terraform_io`
as a GitHub secret is still outstanding, needed by Stage 10, not before.
