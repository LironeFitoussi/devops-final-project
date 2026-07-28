# Stage 4 — Security Groups + RDS Module

**Rebuilt 2026-07-28** on `terraform-aws-modules/rds/aws`. Replaces the
earlier version of this doc.

## What was built

`repos/three-tier-infrastructure/modules/database/`:

- `aws_security_group.db` — hand-rolled (no ingress baked in here — see
  below for why).
- `module "rds"` (`terraform-aws-modules/rds/aws ~> 7.0`): `postgres`,
  `engine_version = "16"`, `db.t4g.micro`, `db_name = "app"`,
  `username = "postgres"`, `manage_master_user_password = true` (AWS-native
  RDS-managed secret — replaces the original pass's hand-rolled
  `random_password` + own Secrets Manager secret; the master password
  never touches Terraform code, and AWS itself owns rotation-readiness),
  `create_db_subnet_group = true`, `vpc_security_group_ids = [security
  group above]`, `multi_az`/`deletion_protection` exposed as variables
  (false in dev, true in prod), `skip_final_snapshot = true`.

**Key deviation from the original design**: the ECS task security group
is no longer defined here. `terraform-aws-modules/ecs/aws`'s service
submodule (Stage 5) creates its own task security group internally — it
doesn't accept an externally-created one to attach rules to. Defining it
in `modules/database` (per the original hand-rolled design) would create
a real module cycle: `modules/ecs` needs `modules/database`'s DB
endpoint/secret, and the reverse SG-ingress rule would need
`modules/ecs`'s security group ID. Resolved by declaring the cross-module
`aws_security_group_rule` as a **standalone resource in
`environments/dev`** (after both modules), not inside either module.

## Verification (Success Criteria)

RDS `three-tier-dev-db`: `available`, `PubliclyAccessible: false`,
`MultiAZ: false` (dev default) — confirmed via
`aws rds describe-db-instances`. Master credentials live only in the
AWS-managed Secrets Manager secret (`db_instance_master_user_secret_arn`
output) — never in Terraform code, state contains only a reference ARN
via the module boundary the same as any other resource attribute.

## Next stage starting point

Stage 5 consumes `module.database.db_master_user_secret_arn` (JSON
`{username, password}`, not a raw string — Stage 5's `DATABASE_URL`
assembly needs `jsondecode()`), `db_instance_endpoint`, `db_instance_port`,
`db_name`, `db_master_username`.
