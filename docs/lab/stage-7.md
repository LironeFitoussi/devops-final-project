# Stage 7 – GitHub OIDC (App-Deploy Pipelines)

## Starting Point

Stage 6 complete: frontend and backend both reachable.

## Objective

Passwordless AWS auth for the backend/frontend GitHub Actions pipelines —
a **separate OIDC trust from Stage 2's HCP Terraform trust.**

## Tasks

1. `modules/github-oidc/`: GitHub Actions OIDC identity provider
   (`token.actions.githubusercontent.com`).
2. Two least-privilege IAM roles, trust policy conditions scoped to this
   GitHub repo + branch:
   - `backend-deploy`: ECR push, ECS `RegisterTaskDefinition` /
     `UpdateService` only — no VPC, RDS, or frontend-S3 access.
   - `frontend-deploy`: S3 sync to the frontend bucket only, CloudFront
     invalidation — no ECS or RDS access.

## Deliverables

- `modules/github-oidc` wired into `environments/dev`; both role ARNs
  output for use as GitHub Actions secrets/vars in Stages 8–9.

## Success Criteria

- Each role, assumed via `aws-actions/configure-aws-credentials`, can
  perform only its listed actions.
- Verify at least one explicitly denied action per role (e.g.
  `backend-deploy` cannot touch S3; `frontend-deploy` cannot touch ECS) to
  prove the least-privilege split is real, not accidental.

## Note

Do not confuse this OIDC provider/trust with Stage 2's — that one is
`app.terraform.io`, used only by HCP Terraform's own AWS auth. This one is
`token.actions.githubusercontent.com`, used by app-deploy pipelines that
bypass Terraform entirely.
