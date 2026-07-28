# Stage 5 notes

## "Image placeholder tag" vs. success criteria requiring a live `/health`

The task list says the task definition should use an "image placeholder
tag," but the Success Criteria require the ALB to actually return the
backend's `/health` endpoint with healthy targets. A truly empty/dummy
image (e.g. `nginx`) can't satisfy that. Resolved (implementation default,
not a doc contradiction worth stopping for — same category as Stage 4's
`db_name`/`username` defaults): `var.image_tag` defaults to `"latest"` as
the placeholder *tag name*, but the actual image pushed to that tag for
this stage's verification is the real `repos/three-tier-backend` app,
built and pushed manually:

```bash
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 050752632489.dkr.ecr.eu-west-1.amazonaws.com
docker build --platform linux/amd64 -t 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest .
docker push 050752632489.dkr.ecr.eu-west-1.amazonaws.com/three-tier-dev-backend:latest
```

Stage 8's CI pipeline is the real, ongoing deploy path (build → push →
`update-service --force-new-deployment`) — this manual push only seeds the
image so Stage 5 itself is verifiable.

## DATABASE_URL assembly

The backend only reads a single `DATABASE_URL` env var (see
`repos/three-tier-backend/app/db.py:6-7`) — there's no support for split
`DB_HOST`/`DB_USER`/etc. parts. ECS's task-definition `secrets` block can
only inject one secret's raw value as one env var, and Stage 4's secret
holds just the raw master password, not a full connection string.

Resolved: `modules/ecs` reads Stage 4's password secret via a
`data "aws_secretsmanager_secret_version"` data source, assembles the full
`postgresql+psycopg2://user:pass@host:port/dbname` string with Terraform
string interpolation, and stores *that* in its own new secret
(`${name_prefix}-database-url`). The task definition's `secrets` block
injects this one secret as `DATABASE_URL`. Execution role gets
`secretsmanager:GetSecretValue` scoped to this new secret only (not
Stage 4's raw-password secret).

## Execution role vs. task role

Spec says "least privilege: Secrets Manager read, CloudWatch Logs write"
without specifying which of the two ECS IAM roles. In AWS's model, both of
those are execution-role concerns (the ECS agent, not the app, resolves
`secrets` and ships `awslogs` — the app itself never calls Secrets Manager
or CloudWatch Logs directly). So: `task_execution` role gets the AWS
managed `AmazonECSTaskExecutionRolePolicy` (ECR pull + logs write) plus an
inline policy for the `database_url` secret; `task` role (assumed by the
app) gets no additional policies since the app makes no other AWS API
calls.

## Health check path

Per `solutions/PROGRESS.md`'s carried-over Stage 1 note: ALB target group
health check path is `/health` (no DB dependency), not `/health/db` (which
would 503 until the schema/seed step in `main.py`'s lifespan completes and
also makes ALB health depend on DB reachability, which isn't the point of
an ECS-task-liveness check).

## ECS task SG ingress rule ownership

`aws_security_group.ecs_tasks` is defined in `modules/database` (Stage 4).
Stage 5 doesn't redefine it — it adds a separate `aws_security_group_rule`
resource (`app_from_alb`) referencing `var.ecs_tasks_security_group_id`,
scoped to the container port, sourced from the ALB's own new security
group.

## Deployment convergence with rapid manual `update-service` calls

While proving the `ignore_changes = [task_definition]` lifecycle rule
(registering task-def revision 2, then `update-service`), issuing a couple
of back-to-back manual `update-service`/`force-new-deployment` calls in
quick succession left the service with 3-4 stacked deployments briefly
(ECS processes them somewhat asynchronously). It self-resolved within
~5 minutes without intervention — no stuck/failed tasks, just queued
scaling activity. Not an infra bug; just don't fire multiple manual
`update-service` calls back-to-back when testing this in future stages
(Stage 8's CI does exactly one call per deploy, so this doesn't recur
there).
