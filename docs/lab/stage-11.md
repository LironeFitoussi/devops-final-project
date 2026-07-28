# Stage 11 – Monitoring

## Starting Point

Stage 10 complete: full dev environment applies through CI, backend/frontend
deploy through their own pipelines.

## Objective

Baseline observability and alerting for the dev environment.

## Tasks

1. `modules/monitoring/` (or alarms inline in `ecs`/`database` modules):
   CloudWatch alarms for ECS running task count, ALB 5xx error rate,
   unhealthy target count, RDS CPU utilization, RDS free storage.
2. SNS topic + email subscription; wire all alarms to it.

## Deliverables

- Alarms visible in CloudWatch, all wired to one SNS topic.

## Success Criteria

- Forcing a condition (e.g. temporarily scaling ECS desired count to 0)
  triggers the relevant alarm.
- An SNS notification is actually received (email confirmed).
