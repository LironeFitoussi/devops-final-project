# Stage 2 – Terraform Bootstrap (HCP Terraform)

**Supersedes the original spec's "S3 bucket for Terraform state" bootstrap
— this project uses HCP Terraform remote execution, not a plain S3/DynamoDB
backend.** See `docs/lab/original-spec-he.md` for the superseded version.

## Starting Point

Stage 1 complete: three local repos exist, backend Dockerfile builds.

## Objective

Stand up HCP Terraform org/workspaces and the one-time AWS trust that lets
HCP Terraform's Dynamic Provider Credentials authenticate to AWS — with
zero long-lived static AWS keys stored anywhere.

## Tasks

1. Create an HCP Terraform organization (if none exists) and two
   workspaces: `three-tier-dev`, `three-tier-prod`. Execution mode:
   **Remote**. VCS connection: **none** — runs are triggered from GitHub
   Actions, not a VCS-driven workflow (this is a manual/UI step, not
   Terraform code).
2. In `repos/three-tier-infrastructure/bootstrap/`, write a **local-only**
   Terraform config (real or temporary AWS credentials, local state,
   gitignored) that creates:
   - An IAM OIDC identity provider trusting `app.terraform.io`.
   - An IAM role trusted by that provider, scoped via trust-policy
     condition to the two workspace names above.
   - Output: the role's ARN.
3. Paste the role ARN into each HCP Terraform workspace's environment
   variables: `TFC_AWS_PROVIDER_AUTH = true`, `TFC_AWS_RUN_ROLE_ARN = <arn>`.
4. Generate a Terraform Cloud API token and store it as a GitHub Actions
   secret named `TF_TOKEN_app_terraform_io` (used later in Stage 10).

## Deliverables

- `bootstrap/` directory with its own local state (gitignored — this is the
  one config that cannot itself run through HCP Terraform, chicken-and-egg).
- Two HCP Terraform workspaces configured with Dynamic Provider Credentials.
- `TF_API_TOKEN` available as a GitHub secret.

## Success Criteria

- A manually-queued run in each HCP Terraform workspace successfully
  authenticates to AWS via the assumed role — no static `AWS_ACCESS_KEY_ID`/
  `AWS_SECRET_ACCESS_KEY` anywhere in HCP Terraform or GitHub.
- `bootstrap/` is a one-time setup — not touched again after this stage.

## Note

This is a **separate OIDC trust** from Stage 7's GitHub Actions app-deploy
roles (different provider: `app.terraform.io` vs.
`token.actions.githubusercontent.com`, different purpose). Don't conflate
them.
