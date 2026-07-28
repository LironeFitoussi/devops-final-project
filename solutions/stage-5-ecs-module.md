# Stage 5 — ECS Module

## What was built

- `repos/three-tier-infrastructure/modules/ecs/` — `variables.tf`,
  `main.tf`, `outputs.tf`, `README.md`. Creates:
  - `aws_ecr_repository.backend` — `three-tier-dev-backend`, scan on push.
  - `aws_cloudwatch_log_group.backend` — `/ecs/three-tier-dev-backend`,
    7-day retention.
  - `aws_security_group.alb` — HTTP/80 from `0.0.0.0/0`, all egress.
  - `aws_security_group_rule.app_from_alb` — ingress rule *added onto* the
    existing `ecs_tasks` SG (owned by `modules/database`, Stage 4), opening
    the container port only from the ALB SG. Doesn't redefine the SG.
  - `aws_lb.this` + `aws_lb_target_group.backend` (health check
    `/health`, HTTP, matcher 200) + `aws_lb_listener.http` (port 80).
  - `data "aws_secretsmanager_secret_version"` reading Stage 4's raw
    master-password secret, used to assemble a full `DATABASE_URL`
    connection string, stored in a **new** secret
    (`aws_secretsmanager_secret.database_url`) owned by this module.
  - `aws_iam_role.task_execution` (+ AWS-managed
    `AmazonECSTaskExecutionRolePolicy` + inline policy scoped to the
    `database_url` secret's ARN) and `aws_iam_role.task` (no additional
    policies — the app makes no direct AWS API calls).
  - `aws_ecs_cluster.this`, `aws_ecs_task_definition.backend` (Fargate,
    `cpu=256`/`memory=512`, single `backend` container on port 8000,
    `secrets` block injects `DATABASE_URL` from the new secret, `awslogs`
    driver to the log group above), `aws_ecs_service.backend`
    (`desired_count=2`, private app subnets, `ecs_tasks` SG, attached to
    the target group, `lifecycle { ignore_changes = [task_definition] }`).
- `repos/three-tier-infrastructure/environments/dev/main.tf` — added
  `module "ecs"` call (same `./modules/<name>` symlink pattern as prior
  stages), fed entirely from `module.network` and `module.database`
  outputs.
- `repos/three-tier-infrastructure/environments/dev/outputs.tf` — added
  `alb_dns_name`, `ecr_repository_url`, `ecs_cluster_name`,
  `ecs_service_name`.

## Key decisions (see `docs/lab/notes/stage-5.md` for full reasoning)

- **Manually built and pushed the real backend image** to the new ECR repo
  under the `latest` tag (the task definition's "placeholder tag") so the
  Success Criteria — ALB actually returning `/health`, target group
  healthy — are genuinely provable now, not just plumbing-only. Stage 8's
  CI is still the real, ongoing deploy path.
- **`DATABASE_URL` assembled in Terraform, re-stored as its own secret** —
  the backend only reads one `DATABASE_URL` env var; ECS `secrets` can only
  inject one raw value per key, and Stage 4's secret holds just the raw
  password. A `data.aws_secretsmanager_secret_version` read of that
  password plus Stage 4's other outputs (host:port, db name, username)
  builds the full connection string, stored in a new
  `three-tier-dev-database-url` secret that the task definition pulls from.
- **All "Secrets Manager read / CloudWatch Logs write" least-privilege
  goes on the execution role, not the task role** — that's who the ECS
  agent actually uses to resolve `secrets` and ship `awslogs`; the app
  itself never calls either API. Task role has no extra policies.
- **Health check path is `/health`**, not `/health/db` — carried over from
  the Stage 1/PROGRESS.md note: `/health` has no DB dependency, matching
  what an ECS target-group liveness check should be.
- Not a clarity-gate stop: all of the above are ordinary implementation
  defaults in the same category as Stage 3/4's CIDR/db-name decisions —
  didn't block on them.

## Verification (Success Criteria)

```bash
cd repos/three-tier-infrastructure/environments/dev
terraform fmt -check -diff   # clean
terraform validate           # Success!
terraform plan                # Plan: 16 to add, 0 to change, 0 to destroy.
terraform apply -auto-approve # Apply complete! Resources: 16 added, 0 changed, 0 destroyed.
```

**Manual image push** (real app, not a dummy placeholder — see decisions
above):

```bash
cd repos/three-tier-backend
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 050752632489.dkr.ecr.eu-west-1.amazonaws.com
docker build --platform linux/amd64 -t 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest .
docker push 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest
```

**ECS service stable, ALB target group healthy:**

```bash
aws ecs describe-services --region eu-west-1 --cluster three-tier-dev-cluster --services three-tier-dev-backend \
  --query 'services[0].{running:runningCount,desired:desiredCount}'
# {"running": 2, "desired": 2}

aws elbv2 describe-target-health --region eu-west-1 \
  --target-group-arn arn:aws:elasticloadbalancing:eu-west-1:050752632489:targetgroup/three-tier-dev-backend-tg/a2917656ce539751 \
  --query 'TargetHealthDescriptions[].TargetHealth.State'
# ["healthy", "healthy"]
```

**ALB DNS name returns the backend's `/health`:**

```bash
curl -sS -w '\nHTTP %{http_code}\n' http://three-tier-dev-alb-1250152126.eu-west-1.elb.amazonaws.com/health
# {"status":"ok"}
# HTTP 200
```

**Manual `force-new-deployment` is not reverted by `terraform apply`** —
registered task-definition revision 2 (a copy of revision 1) and pointed
the service at it directly via the ECS API, simulating what Stage 8's CI
will do:

```bash
aws ecs describe-task-definition --region eu-west-1 --task-definition three-tier-dev-backend --query taskDefinition > /tmp/td.json
# (strip taskDefinitionArn/revision/status/requiresAttributes/compatibilities/registeredAt/registeredBy)
aws ecs register-task-definition --region eu-west-1 --cli-input-json file:///tmp/td-new.json
# family three-tier-dev-backend, revision 2

aws ecs update-service --region eu-west-1 --cluster three-tier-dev-cluster --service three-tier-dev-backend \
  --task-definition three-tier-dev-backend:2 --force-new-deployment
# (deployment took a few minutes to converge — briefly stacked 3-4 deployments
#  from testing with back-to-back manual update-service calls; self-resolved,
#  see docs/lab/notes/stage-5.md)

terraform plan
# module.ecs.aws_ecs_service.backend: Drift detected (update)   <- task_definition arn differs
# No changes. Your infrastructure matches the configuration.
```

The service is running on task-definition revision 2 (confirmed via
`aws ecs describe-tasks`), yet `terraform plan` reports **no changes** —
the `lifecycle { ignore_changes = [task_definition] }` rule works as
intended.

## Resource IDs / outputs

- ECS cluster: `three-tier-dev-cluster`
- ECS service: `three-tier-dev-backend`
- ECR repository: `050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend`
- ALB DNS name: `three-tier-dev-alb-1250152126.eu-west-1.elb.amazonaws.com`
- ALB security group: newly created (`three-tier-dev-alb-sg`)
- ECS task security group: `sg-0bab71e62ca7f03e6` (reused from Stage 4, new ingress rule added)
- `DATABASE_URL` secret: `three-tier-dev-database-url`

## Cost note

Adds a real, billable ALB (~$0.0225/hr + LCU) and 2 Fargate tasks
(0.25 vCPU/0.5 GB each, ~$0.02/hr total) on top of Stage 3/4's NAT
Gateway/EIP/RDS. Not torn down — needed for Stage 6's Starting Point.

## Next stage starting point

Stage 6 (Frontend Module) can reuse `module.ecs`'s ALB pattern or add its
own; either way it needs `module.network.public_subnet_ids`/
`vpc_id` and will likely want its own ECR repo + ECS service following the
same shape as this module. The `ecs_tasks` security group
(`sg-0bab71e62ca7f03e6`) may need another `aws_security_group_rule` if the
frontend also runs as an ECS task and needs to reach the backend
internally — check Stage 6's actual spec before assuming that.
