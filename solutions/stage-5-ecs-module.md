# Stage 5 — ECS Module

**Rebuilt 2026-07-28** on `terraform-aws-modules/alb/aws` +
`terraform-aws-modules/ecs/aws` (cluster + service submodules). Replaces
the earlier version of this doc.

## What was built

`repos/three-tier-infrastructure/modules/ecs/`:

- `aws_ecr_repository.backend` (hand-rolled — no community module needed
  for a single ECR repo), scan on push.
- `aws_cloudwatch_log_group.backend` (hand-rolled, referenced explicitly
  by the container definition's `logConfiguration`;
  `enable_cloudwatch_logging = false` on the container definition stops
  the service submodule from also auto-creating its own default log
  group).
- `DATABASE_URL` assembly: reads Stage 4's AWS-managed master-credentials
  secret (JSON), `jsondecode()`s it, assembles the full
  `postgresql+psycopg2://...` string, stores it in a **new** secret this
  module owns (`${name_prefix}-database-url`) — the task definition's
  `secrets` block injects that one.
- `module "alb"` (`terraform-aws-modules/alb/aws ~> 10.0`): HTTP/80
  listener forwarding to a target group with `create_attachment = false`
  (ECS manages target registration dynamically, not a static attachment).
  Health check `/health`, matcher `200`.
- `module "ecs_cluster"` (`.../ecs/aws//modules/cluster ~> 7.0`):
  Fargate capacity provider, Container Insights **enabled** (needed by
  Stage 11's running-task-count alarm, which only publishes via
  `ECS/ContainerInsights`).
- `module "ecs_service"` (`.../ecs/aws//modules/service ~> 7.0`):
  `cpu=256`/`memory=512`, one `backend` container, `security_group_ingress_rules`
  opening the container port only from the ALB's security group,
  `create_task_exec_iam_role = true` + `task_exec_secret_arns` scoped to
  the `database_url` secret (the module handles least-privilege the same
  way the original hand-rolled design did: execution role gets Secrets
  Manager read, task role gets nothing extra), `autoscaling_min_capacity
  = var.desired_count` (module default is 1 — without pinning this,
  target-tracking scaled dev down to 1 task the moment CPU/memory went
  idle, undercutting the dev floor of 2), **`ignore_task_definition_changes
  = true`** — the module's own equivalent of
  `lifecycle { ignore_changes = [task_definition] }`, implemented as a
  separate `aws_ecs_service.ignore_task_definition[0]` resource variant.

## Verification (Success Criteria) — the real thing, not simulated

Manually built + pushed the real backend image to seed the ECR repo
(`:latest`), same as the original pass:

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 050752632489.dkr.ecr.eu-west-1.amazonaws.com
docker build --platform linux/amd64 -t 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest .
docker push 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest
aws ecs update-service --cluster three-tier-dev-cluster --service three-tier-dev-backend --force-new-deployment
```

```
aws ecs describe-services ... → running: 2, desired: 2
aws elbv2 describe-target-health ... → ["healthy", "healthy"]
curl http://three-tier-dev-alb-1210103999.eu-west-1.elb.amazonaws.com/health → {"status":"ok"}, HTTP 200
```

**`ignore_task_definition_changes` proven with a *real* CI deploy, not a
simulated one**: Stage 8's actual GitHub Actions pipeline (not a manual
`aws ecs update-service` copy) registered task-definition revision 4
(git-SHA-tagged image) and pointed the service at it. A subsequent
*unrelated* `terraform apply` (Stage 11's monitoring module) destroyed
Terraform's own tracked task-definition resource (revision 3, still
`:latest` — routine AWS-provider round-trip noise on `container_definitions`,
a well-known `aws_ecs_task_definition` quirk) and created a new one
(revision 5) — **the running service never moved**:

```
aws ecs describe-services ... taskDefinition → still .../three-tier-dev-backend:4
aws ecs list-task-definitions --family-prefix three-tier-dev-backend → [...":2", ":3", ":5"]  (revision 4 conspicuously absent - untouched)
```

## Resource IDs

- ECS cluster: `three-tier-dev-cluster`; service: `three-tier-dev-backend`
- ECR: `050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend`
- ALB DNS: `three-tier-dev-alb-1210103999.eu-west-1.elb.amazonaws.com`
- `DATABASE_URL` secret: `three-tier-dev-database-url`

## Next stage starting point

Stage 6 needs `module.network.public_subnet_ids`/`vpc_id` (already
available) and is independent of `module.ecs` otherwise.
