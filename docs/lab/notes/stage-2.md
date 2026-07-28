# Stage 2 notes

## Clarifications confirmed with the user before implementing

1. **HCP Terraform org**: neither of the account's two existing orgs
   (`lironefitoussi`, `cloudcart-iitc`) is dedicated to this lab, and the
   free tier blocks creating a new org (`409 Free tier organizations
   created by user limit reached`). User chose to reuse the existing
   **`lironefitoussi`** org rather than a new one.
2. **Stage 2 task 4 (`TF_TOKEN_app_terraform_io` GitHub secret)**: this
   needs a GitHub *remote* to attach the secret to, which contradicts
   CLAUDE.md's settled decision that `repos/*` stay local-only ("no GitHub
   push... until told otherwise"). User confirmed: **defer** — this secret
   gets set in Stage 10, when the GitHub Actions → HCP Terraform CI is
   actually wired up and a remote will exist. Not done in this pass.

## Environment discovered mid-stage

- AWS CLI was already authenticated locally (account `050752632489`,
  user `lironef`) and an OIDC provider for `app.terraform.io` **already
  existed** in that account (thumbprint `06b25927c42a721631c1efd9431e648fa62e1e39`,
  created 2026-07-19) — imported into `bootstrap/`'s state rather than
  recreated (IAM allows only one provider per issuer URL; multiple IAM
  roles can trust the same provider). A `token.actions.githubusercontent.com`
  provider also already existed in the account — untouched, belongs to
  other work, relevant again at Stage 7.
- `gh auth status` was already logged in as `LironeFitoussi` — noted for
  when Stage 10 needs to actually push a remote and set secrets.

## Deferred deliverable

`TF_TOKEN_app_terraform_io` as a GitHub secret — not created this stage.
Stage 10's clarity gate should treat this as a prerequisite task, not
assume it already exists.
