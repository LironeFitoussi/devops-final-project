# Stage 6 — Frontend Module

Built 2026-07-28 (new — no prior version of this doc existed; the earlier
pass never reached Stage 6).

## What was built

`repos/three-tier-infrastructure/modules/frontend/` — hand-rolled (kept
deliberately small/custom rather than switching to a registry module;
CloudFront + OAC wiring is fiddly enough with community modules that the
already-correct hand-rolled version was kept):

- `aws_s3_bucket` — private, `aws_s3_bucket_public_access_block` fully
  enabled (all 4 flags true).
- `aws_cloudfront_origin_access_control` + `aws_cloudfront_distribution`
  (default cert unless Stage 12 supplies `aliases`/`acm_certificate_arn`,
  in which case it uses those instead — see `stage-12` doc).
- `aws_s3_bucket_policy` restricting reads to the CloudFront distribution
  via `AWS:SourceArn` condition — no other principal can read the bucket.
- `custom_error_response` blocks: 403 and 404 → `/index.html` with a 200
  response code, so client-side SPA routes survive a hard refresh.

## Verification (Success Criteria)

Built the real frontend (`VITE_API_URL` pointed at the live ALB DNS) and
synced it manually to seed the bucket for verification (Stage 9's CI is
the real ongoing deploy path):

```bash
npm run build
aws s3 sync dist/ s3://three-tier-dev-frontend-050752632489 --delete
aws cloudfront create-invalidation --distribution-id E35OJVGL0W9U0S --paths "/*"
```

```
aws s3api get-public-access-block --bucket three-tier-dev-frontend-050752632489
→ BlockPublicAcls/IgnorePublicAcls/BlockPublicPolicy/RestrictPublicBuckets all true

curl https://d33rg73pt27q56.cloudfront.net/               → HTTP 200
curl https://d33rg73pt27q56.cloudfront.net/some/deep/path → HTTP 200, body is index.html (not an S3 XML error)
```

## Resource IDs

- Bucket: `three-tier-dev-frontend-050752632489`
- CloudFront: `E35OJVGL0W9U0S` / `d33rg73pt27q56.cloudfront.net`

## Next stage starting point

Stage 7's `github-oidc` module needs `module.frontend.bucket_arn` and
`module.frontend.cloudfront_distribution_arn` for the `frontend-deploy`
role's scoped policy.
