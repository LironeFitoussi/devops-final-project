# Stage 3 — Networking Module

**Rebuilt 2026-07-28** on `terraform-aws-modules/vpc/aws` instead of hand-rolled
resources (user's explicit call — see `CLAUDE.md`). Replaces the earlier
version of this doc.

## What was built

`repos/three-tier-infrastructure/modules/network/` wraps
`terraform-aws-modules/vpc/aws ~> 6.0`:

- `name`/`cidr`/`azs` passed through; `public_subnets` = public tier,
  `private_subnets` = app tier, `database_subnets` = db tier (module's own
  naming, remapped to this lab's tier names in `outputs.tf`).
- `create_database_subnet_group = true`.
- `enable_nat_gateway = true`, `single_nat_gateway` /
  `one_nat_gateway_per_az` exposed as module variables so
  `environments/dev` can request the shared-NAT cost-saving default and
  `environments/prod` (Stage 12) can request one-per-AZ.

`environments/dev/main.tf` calls it via the `./modules/network` symlink
pattern (see `docs/lab/notes/stage-3.md` — still applies to
`terraform-aws-modules`-wrapped modules the same as hand-rolled ones).

## Verification (Success Criteria)

```
terraform fmt -check -recursive   # clean
terraform validate                 # Success!
terraform plan / apply             # applied for real via three-tier-dev workspace
```

VPC `vpc-03ab57330a22eb4d4`, 6 subnets across `eu-west-1a`/`eu-west-1b`
(2 public, 2 app, 2 db), NAT gateway `nat-00cec57fb113c4dfd` available —
confirmed via `aws ec2 describe-subnets`/`describe-nat-gateways`.

## Next stage starting point

Stage 4 consumes `module.network.vpc_id`/`app_subnet_ids`/`db_subnet_ids`
the same way the original design intended.
