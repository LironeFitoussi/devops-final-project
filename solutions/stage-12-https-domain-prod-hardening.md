# Stage 12 — HTTPS, Domain, Prod Hardening

Built (code complete, plan-verified) 2026-07-28. **Not applied** — see
blocker below.

## Prerequisite check

Domain: `iitc-course.com` — an existing Route 53 hosted zone already in
this AWS account, **shared across the whole IITC class** (existing
records show every other student prefixed with their own name:
`harel-be`/`harel-fe`, `yuval-be`/`yuval-fe`, etc.). Confirmed with the
user before creating anything; used `lirone-app`/`lirone-api` rather than
the doc's literal bare `app`/`api` to match the class convention and
avoid squatting generic names on a shared domain.

## What was built

- `repos/three-tier-infrastructure/modules/domain/`: looks up the
  existing zone (`data "aws_route53_zone"`, doesn't create one), issues
  two DNS-validated ACM certs — `lirone-app.iitc-course.com` in
  **us-east-1** (CloudFront requires this regardless of the stack's own
  region) and `lirone-api.iitc-course.com` regional (`eu-west-1`, same
  provider as everything else). Only creates/validates the certs — the
  final alias records are declared standalone in `environments/prod`
  (after `frontend`/`ecs`) to avoid a module cycle, the same pattern
  already used for the Stage 4↔5 security-group rule.
- `modules/frontend` gained optional `aliases`/`acm_certificate_arn` —
  when set, the CloudFront distribution uses them instead of the default
  cert; dev leaves both at their defaults (`[]`/`null`), unaffected.
- `modules/ecs` gained `enable_https`/`certificate_arn` — when
  `enable_https = true`, the ALB's HTTP listener becomes a 301 redirect
  to a new HTTPS listener (`ELBSecurityPolicy` default TLS policy) instead
  of forwarding directly. **`enable_https` must be a plan-time-known
  literal**, not derived from `certificate_arn == null` — the ALB
  listener map's key set (does an `https` key exist at all) can't depend
  on a value (the cert's ARN) that's still unknown at plan time on a
  first apply; `certificate_arn` only ever appears as a map *value*,
  which is fine to leave unknown.
- `environments/prod`: added the `aws.us_east_1` provider alias, wired
  `module "domain"` in, set `enable_https = true` on `module.ecs`,
  `aliases`/`acm_certificate_arn` on `module.frontend`, and the two
  standalone `aws_route53_record` alias records (`app` → CloudFront,
  `api` → ALB).

## Blocker: shared AWS account is at its VPC quota

`terraform plan` against `environments/prod` succeeds cleanly (62 to add,
3 to change, 0 destroy) — the code is correct. **Not applied**: this AWS
account (`050752632489`) is a shared classroom sandbox already at its
default VPC-per-region quota (5/5 — `luxe-jewelry-dev-vpc`,
`drs-lab-target-vpc`, `ASG-VPC`, the default VPC, and this project's own
`three-tier-dev-vpc`), so `aws_vpc.this` for a separate prod VPC fails
with `VpcLimitExceeded`. Confirmed the hard way: an earlier direct push
(before the Stage 10 approval gate existed) let `apply-prod` run
unattended and hit exactly this error after ~3 minutes, having already
created prod's CloudFront distribution and IAM roles first.

Filed `aws service-quotas request-service-quota-increase` for
`vpc`/`L-F678F1CE` → 10 (request pending as of this doc). Explicitly
**declined** to resolve this by deleting the other three VPCs — they
belong to other students' active coursework in the shared account, not
something either the user or this session has standing to remove.

## Verification once unblocked

Once the quota request clears (or the user approves the pending
`apply-prod` GitHub Environment deployment for some other reason it
becomes safe to retry), re-run `terraform apply "tfplan-prod"` in
`environments/prod` (already saved) or just re-approve the pending
GitHub Actions deployment, then:

```bash
curl -I https://lirone-app.iitc-course.com/   # expect 200, TLS
curl -I https://lirone-api.iitc-course.com/health
curl -I http://lirone-api.iitc-course.com/health  # expect 301 -> https
aws rds describe-db-instances --db-instance-identifier three-tier-prod-db \
  --query 'DBInstances[0].{MultiAZ:MultiAZ,DeletionProtection:DeletionProtection}'
  # expect true, true
```
