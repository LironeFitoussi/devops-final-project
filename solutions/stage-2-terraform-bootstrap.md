# Stage 2 — Terraform Bootstrap (HCP Terraform)

**Rebuilt 2026-07-28** — see `PROGRESS.md`'s "2026-07-28 reconciliation" note
for why. This replaces the earlier version of this doc.

## What was built

- HCP Terraform: org `lironefitoussi`, workspaces `three-tier-dev`
  (`ws-EeNEXior9u9NQpv2`) and `three-tier-prod` (`ws-kCrrU5uk9MAfZZhu`) —
  both already existed from a prior pass and were reused as-is (Remote
  execution, no VCS connection).
- `repos/three-tier-infrastructure/bootstrap/main.tf` — local-state-only
  Terraform: creates the `app.terraform.io` OIDC provider (none existed
  this time — the prior pass's provider was gone) and IAM role
  `three-tier-lab-tfc-run`, trust-policy-scoped via the `sub` claim to
  exactly `three-tier-dev`/`three-tier-prod`. `AdministratorAccess`
  attached (broad permissions, tight trust — same tradeoff as the
  original pass, acceptable for a solo/classroom AWS account).
- Role ARN (`arn:aws:iam::050752632489:role/three-tier-lab-tfc-run`) set
  as `TFC_AWS_RUN_ROLE_ARN` on both workspaces via the HCP Terraform API
  (`TFC_AWS_PROVIDER_AUTH=true` was already set from the prior pass and
  happened to already be correct).
- `TF_TOKEN_app_terraform_io` set as a GitHub secret on
  `IITC-College/three-tier-infrastructure` (deferred in the original pass
  since no GitHub remote existed then — one does now).

## Verification (Success Criteria)

Ran a throwaway `terraform { cloud { workspaces { name = "..." } } }`
config (never committed, just `data.aws_caller_identity`) against both
workspaces:

```
three-tier-dev  → caller_arn = arn:aws:sts::050752632489:assumed-role/three-tier-lab-tfc-run/terraform-run-j5XiYzzK2ZKwJiJe
three-tier-prod → caller_arn = arn:aws:sts::050752632489:assumed-role/three-tier-lab-tfc-run/terraform-run-MVD52HxE7r4MAvET
```

Both show the run assuming the correct role in the correct account — no
static AWS keys anywhere. `bootstrap/` is a normal committed file
(state/plan artifacts gitignored); not touched again after this stage.

## Next stage starting point

Stage 3 (`modules/network`, wrapping `terraform-aws-modules/vpc/aws`)
executes remotely through `three-tier-dev`, no credentials configuration
needed in the AWS provider block.
