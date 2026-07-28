# Stage 8 — Backend CI/CD

Built + verified 2026-07-28 (new).

## What was built

`repos/three-tier-backend/.github/workflows/backend.yml`:

- `test` job: `actions/setup-python`, `pip install -r requirements.txt`,
  `pytest tests/` against a real `postgres:16` service container (not
  mocked).
- `deploy` job (only on push to `main`): assumes `backend-deploy` via
  `aws-actions/configure-aws-credentials`, builds+tags the image with
  `github.sha`, pushes to ECR, downloads the current live task definition
  (`aws ecs describe-task-definition`), renders a new revision with just
  the image swapped (`aws-actions/amazon-ecs-render-task-definition`),
  deploys + waits for stability
  (`aws-actions/amazon-ecs-deploy-task-definition`), then curls `/health`
  through the ALB as a final smoke test.
- Config (ECR repo, cluster/service/family names, ALB DNS, role ARN) comes
  from repo variables (`gh variable set` on
  `IITC-College/three-tier-backend`), not hardcoded.

## Real run history (not simulated)

1. **First push to `main`** (adding the workflow itself) triggered a real
   run. `test` passed; `deploy` failed at `Configure AWS credentials`:
   `AccessDenied: Not authorized to perform sts:AssumeRoleWithWebIdentity`.
2. Root-caused via CloudTrail (see Stage 7 doc) — GitHub's real `sub`
   claim includes numeric IDs the trust policy didn't account for. Fixed
   `modules/github-oidc`, re-applied via `terraform apply`.
3. **Re-ran the same workflow** (`gh run rerun --failed`) — full green:
   test (37s) + deploy (3m42s), including a real ECS rollout and a
   passing `/health` curl through the ALB.

Run: `https://github.com/IITC-College/three-tier-backend/actions/runs/30371051818`

## Verification (Success Criteria)

- Commit to `main` → new task-definition revision live in ECS by the end
  of the run: confirmed, service was running the git-SHA-tagged image
  (revision 4) after the run completed.
- Post-deploy ALB health check: the workflow's own `/health` curl step
  passed; independently re-confirmed via `aws ecs describe-services` +
  `curl` after the run.
- Image tagged with git SHA, not `:latest`: confirmed —
  `050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:52573c2e1f7786e3affebd8b99f415e8b5a49141`.
