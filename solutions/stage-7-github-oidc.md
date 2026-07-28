# Stage 7 — GitHub OIDC (App-Deploy Pipelines)

Built 2026-07-28 (new).

## What was built

`repos/three-tier-infrastructure/modules/github-oidc/` — hand-rolled
(the two roles' least-privilege policies are genuinely custom to this
app, not a generic pattern a registry module would help with):

- Reuses the **existing** `token.actions.githubusercontent.com` OIDC
  provider in the AWS account (from unrelated prior work — IAM allows
  only one provider per issuer URL, multiple roles may trust the same
  one) via `data "aws_iam_openid_connect_provider"`, rather than
  recreating it.
- `backend-deploy` role: trust scoped to
  `repo:IITC-College/three-tier-backend:ref:refs/heads/main`; permissions
  limited to ECR push (on the one repo ARN), `ecs:RegisterTaskDefinition`/
  `DescribeTaskDefinition` (no resource-level restriction possible for
  these actions), `ecs:UpdateService`/`DescribeServices` (scoped to the
  one service ARN), `iam:PassRole` (scoped to just the task
  execution/task role ARNs, condition `iam:PassedToService =
  ecs-tasks.amazonaws.com`). No S3, no CloudFront, no RDS access.
- `frontend-deploy` role: trust scoped to
  `repo:IITC-College/three-tier-frontend:ref:refs/heads/main`; permissions
  limited to `s3:PutObject`/`GetObject`/`DeleteObject`/`ListBucket` on the
  one frontend bucket, `cloudfront:CreateInvalidation`/`GetInvalidation`
  on the one distribution. No ECS, no RDS access.

## Clarity-gate issue found mid-stage (real, not simulated)

The doc's literal sub-claim format (`repo:org/repo:ref:refs/heads/branch`)
turned out to be wrong for this GitHub org: **actual** GitHub Actions OIDC
tokens include immutable numeric IDs appended to both the org and repo
names — `repo:IITC-College@221500499/three-tier-frontend@1315047213:ref:refs/heads/main`.
Discovered via CloudTrail after a real GitHub Actions run got
`AccessDenied` on `AssumeRoleWithWebIdentity` (see Stage 8/9 for the
actual failing/passing runs). Fixed by switching the trust condition from
`StringEquals` to `StringLike` with `@*` wildcards around the IDs, rather
than hardcoding them. Not treated as a stop-and-ask clarity-gate item
(the fix was unambiguous once the real claim was visible in CloudTrail)
but documented here since it directly contradicts the doc's literal
wording and would trip up anyone reusing this pattern.

## Verification (Success Criteria)

Static verification (both roles' live IAM policies inspected via
`aws iam get-role-policy`): zero action overlap — `backend-deploy` has no
`s3:*`/`cloudfront:*` actions at all; `frontend-deploy` has no
`ecs:*`/`rds:*` actions at all. **Dynamic verification is stronger and
real**: Stage 8 and Stage 9's actual GitHub Actions runs each assumed
their respective role via `aws-actions/configure-aws-credentials` and
successfully performed only their intended actions (ECR push + ECS
deploy; S3 sync + CloudFront invalidation) — see those stages' docs for
the run IDs.

## Resource IDs

- `arn:aws:iam::050752632489:role/three-tier-dev-backend-deploy`
- `arn:aws:iam::050752632489:role/three-tier-dev-frontend-deploy`

## Next stage starting point

Stage 8/9 need these two role ARNs plus a handful of other outputs
(ECR repo, ECS cluster/service/family, ALB DNS, S3 bucket, CloudFront
distribution ID) as GitHub Actions repo variables — set via
`gh variable set` on `IITC-College/three-tier-backend` and
`IITC-College/three-tier-frontend`.
