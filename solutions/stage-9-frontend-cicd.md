# Stage 9 — Frontend CI/CD

Built + verified 2026-07-28 (new).

## What was built

`repos/three-tier-frontend/.github/workflows/frontend.yml`:

- `build-and-test` job: `npm ci`, `npm test -- --run` (vitest), then
  `npm run build` with `VITE_API_URL` set to `http://<ALB DNS>` at build
  time (confirmed this is a build-time-only env var — see
  `src/api.js:1`, `import.meta.env.VITE_API_URL`). Uploads `dist/` as an
  artifact.
- `deploy` job (only on push to `main`): downloads the artifact, assumes
  `frontend-deploy`, `aws s3 sync dist/ s3://<bucket> --delete`,
  `aws cloudfront create-invalidation --paths "/*"`.
- Config (bucket, distribution ID, ALB DNS, role ARN) via repo variables
  on `IITC-College/three-tier-frontend`.

## Real run history

Same push that added the workflow also hit the Stage 7 OIDC trust-policy
bug (see Stage 7/8 docs) on its first attempt; re-ran after the fix.
Second run fully green: `build-and-test` (21s) + `deploy` (12s).

Run: `https://github.com/IITC-College/three-tier-frontend/actions/runs/30371061129`

## Verification (Success Criteria)

- Commit to `main` updates the CloudFront-served site within one workflow
  run: confirmed — same deploy that pushed `main` also synced `dist/` and
  invalidated the cache in the same run.
- CloudFront invalidation completes, new content visible, no stale cache:
  `curl https://d33rg73pt27q56.cloudfront.net/` returns `HTTP 200` with
  the freshly-built `index.html`/asset hashes matching the just-pushed
  build.
