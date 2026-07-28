# Stage 4 – Security Groups + RDS Module

## Starting Point

Stage 3 complete: VPC + 6 subnets across 2 AZs exist.

## Objective

Private PostgreSQL instance reachable only from the (not-yet-created) ECS
task security group.

## Tasks

1. `modules/database/`: DB subnet group over the two private-db subnets;
   security group allowing inbound `5432` only from the ECS task security
   group (define the SG here even though ECS itself lands in Stage 5);
   RDS PostgreSQL instance, single-AZ for dev (`db.t4g.micro`,
   `skip_final_snapshot = true`, `deletion_protection = false`).
2. Generate the master password with `random_password` and store it in
   Secrets Manager — never in Terraform code or GitHub Secrets.
3. No public accessibility, no public IP on the RDS instance.

## Deliverables

- `modules/database` wired into `environments/dev`, outputting the Secrets
  Manager ARN for later consumption by the ECS task definition (Stage 5).

## Success Criteria

- RDS instance reaches `available` state.
- RDS has no public IP and is unreachable from `0.0.0.0/0`.
- Master password exists only in Secrets Manager, retrievable via the
  output ARN.
