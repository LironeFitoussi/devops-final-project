# Stage 3 — Networking Module

## What was built

- `repos/three-tier-infrastructure/modules/network/` — `variables.tf`,
  `main.tf`, `outputs.tf`. Creates:
  - 1 VPC (`10.0.0.0/16`, DNS support + hostnames on)
  - 1 Internet Gateway
  - 2 public subnets (`10.0.0.0/24`, `10.0.1.0/24`, one per AZ,
    `map_public_ip_on_launch = true`) + 1 public route table (default
    route via IGW) + associations
  - 2 private app subnets (`10.0.10.0/24`, `10.0.11.0/24`) + 1 app route
    table (default route via the shared NAT) + associations
  - 2 private DB subnets (`10.0.20.0/24`, `10.0.21.0/24`) + 1 db route
    table (no internet route — DB tier has no NAT/IGW path) + associations
  - 1 Elastic IP + 1 NAT Gateway (shared across both AZs, in
    `public[0]`) — matches the doc's explicit cost-saving choice for dev
  - Outputs: `vpc_id`, `public_subnet_ids`, `app_subnet_ids`,
    `db_subnet_ids`, `nat_gateway_id`
- `repos/three-tier-infrastructure/environments/dev/` — `main.tf`,
  `variables.tf`, `outputs.tf`, `.terraform.lock.hcl`. Root module: `cloud
  { workspaces { name = "three-tier-dev" } }` (org `lironefitoussi`, per
  Stage 2), `provider "aws" { region = "eu-west-1" }`, calls
  `module.network`. Re-exports the same 4 subnet/vpc outputs.

## Key decisions / deviations from the literal doc

1. **`environments/dev/modules` symlink → `../../modules`, module source
   `./modules/network` instead of `../../modules/network`.** HCP
   Terraform CLI-driven runs (no VCS connection) only upload the current
   working directory to the remote runner — `../../modules` doesn't exist
   there and the remote `terraform init` fails with `Unreadable module
   directory`. Confirmed via `TF_LOG=trace`: `backend/cloud: starting
   configuration upload at .../environments/dev`, nothing above it. The
   symlink keeps the module code in the single canonical `modules/`
   location (matching the doc's intended layout and reused by
   Stage 4–7's modules) while making it visible inside the uploaded
   directory. Full writeup in `docs/lab/notes/stage-3.md` — every later
   stage adding a module call needs the same pattern.
2. CIDR sizing (`/16` VPC, `/24` subnets) and exact tiering scheme weren't
   specified in the doc beyond "2 AZs, 3 tiers" — picked conventional
   values, not a clarity-gate stop (ordinary implementation detail, not
   an ambiguous requirement).

## Verification (Success Criteria)

**`terraform fmt` / `terraform validate` pass locally:**

```bash
cd repos/three-tier-infrastructure/environments/dev
terraform fmt -check -diff   # no output = clean
terraform validate           # Success! The configuration is valid.
```

**Plan queued via the `three-tier-dev` workspace succeeds and applies
cleanly:**

```bash
terraform init   # HCP Terraform has been successfully initialized!
terraform plan   # Plan: 21 to add, 0 to change, 0 to destroy.
terraform apply -auto-approve
# Apply complete! Resources: 21 added, 0 changed, 0 destroyed.
```

Run URLs: plan `run-hdKTzoLew49bfJHY` (first attempt, failed on the module
path bug above), subsequent init/plan/apply succeeded after the symlink
fix.

**VPC and all 6 subnets exist across 2 AZs** (verified against real AWS,
not just Terraform state):

```bash
aws ec2 describe-subnets --region eu-west-1 \
  --filters "Name=vpc-id,Values=vpc-0b8950cd4112bb016" \
  --query 'Subnets[].{AZ:AvailabilityZone,CIDR:CidrBlock,ID:SubnetId}' --output table
```

```
eu-west-1a  10.0.0.0/24   subnet-027b84367a356434f   (public)
eu-west-1b  10.0.1.0/24   subnet-058dd69a4342a6dc8   (public)
eu-west-1a  10.0.10.0/24  subnet-071d39bacbd34d2ce   (app)
eu-west-1b  10.0.11.0/24  subnet-0b825d0d0e3f087d4   (app)
eu-west-1a  10.0.20.0/24  subnet-049ba4bed37d802a6   (db)
eu-west-1b  10.0.21.0/24  subnet-01cf03eed620d6ed9   (db)
```

```bash
aws ec2 describe-nat-gateways --region eu-west-1 \
  --filter "Name=vpc-id,Values=vpc-0b8950cd4112bb016" --query 'NatGateways[].State' --output text
# available
```

VPC ID: `vpc-0b8950cd4112bb016`. NAT Gateway: `nat-06dffdc142f3b50cc`.

## Cost note

This stage created **real, billable** AWS resources: 1 NAT Gateway
(~$0.045/hr + data processing) + 1 Elastic IP (free while attached to a
running NAT Gateway). Not torn down after this pass — stays up for
Stage 4 (`Starting Point` needs the VPC/subnets to exist). Tear down via
`terraform destroy` in `environments/dev` if pausing the lab for a while.

## Next stage starting point

Stage 4 (Security Groups + RDS Module) can reference
`module.network.vpc_id`, `module.network.app_subnet_ids`, and
`module.network.db_subnet_ids` directly from within `environments/dev`.
Remember the `./modules/<name>` symlink pattern for its own module call —
see `docs/lab/notes/stage-3.md`.
