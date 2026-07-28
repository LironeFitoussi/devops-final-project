# Stage 3 – Networking Module

## Starting Point

Stage 2 complete: HCP Terraform workspaces exist and can authenticate to
AWS via Dynamic Provider Credentials.

## Objective

VPC spanning 2 Availability Zones with public / private-app / private-db
subnet tiers.

## Tasks

1. `modules/network/`: VPC, Internet Gateway, 2 public subnets, 2 private
   app subnets, 2 private DB subnets, route tables + associations, one
   shared NAT Gateway + Elastic IP (cost-saving choice for dev — not
   per-AZ; prod gets per-AZ NAT in Stage 12).
2. `environments/dev/main.tf`: root module calling `modules/network`, with
   a `cloud { workspaces { name = "three-tier-dev" } }` block binding this
   environment to the Stage 2 workspace.
3. Outputs: VPC ID, subnet IDs grouped by tier (public / app / db).

## Deliverables

- `modules/network` + `environments/dev` wired together.

## Success Criteria

- `terraform fmt` / `terraform validate` pass locally.
- A plan queued via the Stage 2 workspace (manually, from the CLI, ahead of
  Stage 10's CI pipeline) succeeds and applies cleanly — VPC and all 6
  subnets exist across 2 AZs.
