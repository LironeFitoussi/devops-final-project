# Stage 9 – Frontend CI/CD

## Starting Point

Stage 8 complete (backend pipeline pattern established; this stage mirrors
it for the frontend).

## Objective

Automated frontend deploy pipeline using the `frontend-deploy` OIDC role
from Stage 7.

## Tasks

In `repos/three-tier-frontend/.github/workflows/frontend.yml`:

1. Checkout, `npm ci`, run tests.
2. `npm run build`.
3. Assume the `frontend-deploy` OIDC role.
4. `aws s3 sync dist/ s3://<bucket> --delete`.
5. `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.

## Deliverables

- `.github/workflows/frontend.yml` inside `repos/three-tier-frontend`.

## Success Criteria

- A commit to the frontend's main branch updates the CloudFront-served
  site within one workflow run.
- The CloudFront invalidation completes and the new content is visible
  (no stale cache).
