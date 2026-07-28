# Stage 4 — Security Groups + RDS Module

## What was built

- `repos/three-tier-infrastructure/modules/database/` — `variables.tf`,
  `main.tf`, `outputs.tf`, `README.md`. Creates:
  - `aws_security_group.ecs_tasks` — the ECS task security group. Defined
    in this module (per the doc, "even though ECS itself lands in
    Stage 5") because the DB security group's ingress rule needs to
    reference it. Egress: all outbound. No ingress rules yet — Stage 5
    adds whatever's needed for ALB → task traffic.
  - `aws_security_group.db` — ingress `tcp/5432` only from
    `aws_security_group.ecs_tasks.id` (security-group reference, not a
    CIDR). No other ingress rules, no egress override (default allow-all
    egress, irrelevant for an RDS-attached SG).
  - `aws_db_subnet_group.this` — over the two private DB subnets
    (`var.db_subnet_ids` from `module.network`).
  - `random_password.master` — 32 chars, `special = false` (avoids
    RDS-master-password character restrictions).
  - `aws_secretsmanager_secret` + `aws_secretsmanager_secret_version` —
    stores the raw password string. Terraform state itself contains the
    password (inherent to `random_password` + local state/HCP Terraform
    state — doc's "never in Terraform code or GitHub Secrets" is
    satisfied literally; state is a separate concern not raised by the
    doc).
  - `aws_db_instance.this` — `postgres`, engine version `16`,
    `db.t4g.micro`, 20 GiB storage, `db_name = "app"`,
    `username = "postgres"`, `multi_az = false`, `publicly_accessible =
    false`, `skip_final_snapshot = true`, `deletion_protection = false`.
- `repos/three-tier-infrastructure/environments/dev/main.tf` — added
  `module "database"` call (`./modules/database`, same symlink pattern as
  Stage 3), and `random` to `required_providers` (needed by
  `random_password`, wasn't declared before this stage).
- `repos/three-tier-infrastructure/environments/dev/outputs.tf` — added
  `db_instance_endpoint`, `db_name`, `db_master_username`,
  `db_secret_arn`, `ecs_tasks_security_group_id`.

## Key decisions

- **`db_name = "app"`, `username = "postgres"`** — not specified by the
  doc. Backend's fallback `DATABASE_URL` (`repos/three-tier-backend/app/db.py:6-7`)
  defaults to db name/user `postgres`/`postgres` for **local dev only**;
  since Stage 5 will construct the real `DATABASE_URL` from this module's
  outputs (endpoint + `db_name` + `master_username` + secret), the actual
  value doesn't need to match that local fallback — just be consistent
  between Stage 4's outputs and Stage 5's consumption. Recorded here so
  Stage 5 uses these output names, not the local-dev fallback values.
- **`engine_version = "16"`** (major version only, `auto_minor_version_upgrade`
  left at its default `true`) — doc didn't pin one; any recent PG major
  version works fine with `sqlalchemy`+`psycopg2`.
- Not a clarity-gate stop: these are ordinary implementation defaults in
  the same category as Stage 3's CIDR sizing — didn't block on them.

## Verification (Success Criteria)

```bash
cd repos/three-tier-infrastructure/environments/dev
terraform fmt -check -diff   # clean
terraform validate           # Success!
terraform plan                # Plan: 7 to add, 0 to change, 0 to destroy.
terraform apply -auto-approve # Apply complete! Resources: 7 added, 0 changed, 0 destroyed.
```

**RDS reaches `available`, no public IP:**

```bash
aws rds describe-db-instances --region eu-west-1 --db-instance-identifier three-tier-dev-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,PubliclyAccessible:PubliclyAccessible,Endpoint:Endpoint.Address}'
```
```json
{"Status": "available", "PubliclyAccessible": false, "Endpoint": "three-tier-dev-db.cdyuq2amav3c.eu-west-1.rds.amazonaws.com"}
```

**Unreachable from `0.0.0.0/0`** — DB security group's only ingress rule
is a security-group reference to the ECS task SG, no CIDR-based rule at
all:

```bash
aws ec2 describe-security-groups --region eu-west-1 --group-ids sg-04a0ab166806f4e6e \
  --query 'SecurityGroups[0].IpPermissions'
```
```json
[{"IpProtocol": "tcp", "FromPort": 5432, "ToPort": 5432,
  "UserIdGroupPairs": [{"GroupId": "sg-0bab71e62ca7f03e6", "Description": "Postgres from ECS tasks"}],
  "IpRanges": []}]
```

**Master password only in Secrets Manager, retrievable via output ARN**
(existence/retrievability checked, value not printed):

```bash
aws secretsmanager describe-secret --region eu-west-1 --secret-id three-tier-dev-db-master-password
aws secretsmanager get-secret-value --region eu-west-1 --secret-id three-tier-dev-db-master-password \
  --query 'SecretString' --output text | wc -c   # 33 (32-char password + newline)
```

## Resource IDs

- RDS instance: `db-RWWHXV6VKWYRMGMRKSBPYAL4SQ` (identifier `three-tier-dev-db`)
- DB security group: `sg-04a0ab166806f4e6e`
- ECS task security group: `sg-0bab71e62ca7f03e6`
- Secret ARN: `arn:aws:secretsmanager:eu-west-1:050752632489:secret:three-tier-dev-db-master-password-8fujLT`

## Cost note

Adds a real, billable `db.t4g.micro` RDS instance (~$0.016/hr) on top of
Stage 3's NAT Gateway/EIP. Not torn down — needed for Stage 5's Starting
Point.

## Next stage starting point

Stage 5 (ECS Module) can consume `module.database.ecs_tasks_security_group_id`
(attach to the ECS service directly — the SG already exists, don't
recreate it), `db_instance_endpoint`, `db_name`, `db_master_username`, and
`db_secret_arn` (resolve the password from Secrets Manager at task
runtime, e.g. via the task definition's `secrets` block, to assemble
`DATABASE_URL` for the backend container). Same `./modules/<name>` symlink
pattern applies to Stage 5's own module call.
