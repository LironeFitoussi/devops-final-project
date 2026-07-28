# Stage 8 – Backend CI/CD

## Starting Point

Stage 7 complete: `backend-deploy` OIDC role exists.

## Objective

Automated backend deploy pipeline. No Terraform involved — this pipeline
talks to AWS directly.

## Tasks

In `repos/three-tier-backend/.github/workflows/backend.yml`:

1. Checkout, run tests.
2. `docker build`, tag with the git SHA.
3. Assume the `backend-deploy` OIDC role (`aws-actions/configure-aws-credentials`).
4. Push the image to ECR.
5. Render a new ECS task definition revision with the new image tag.
6. `aws ecs update-service` to roll it out; wait for service stability.

## Deliverables

- `.github/workflows/backend.yml` inside `repos/three-tier-backend`.

## Success Criteria

- A commit to the backend's main branch results in a new task definition
  revision live in ECS by the end of the workflow run.
- Post-deploy, the ALB health check confirms the new version is serving
  traffic.
- Image is tagged with the git SHA, never relies solely on `:latest`.
