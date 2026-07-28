# Stage 11 — Monitoring

Built 2026-07-28 (new).

## What was built

`repos/three-tier-infrastructure/modules/monitoring/`:

- `aws_sns_topic` + `aws_sns_topic_subscription` (email, endpoint =
  `lironefitoussi@gmail.com`).
- 5 `aws_cloudwatch_metric_alarm` resources, all with `alarm_actions =
  [sns topic]`:
  - ECS running task count < `desired_count` for 2×60s periods
    (`ECS/ContainerInsights` `RunningTaskCount` — only published because
    Stage 5's cluster module enables Container Insights;
    `treat_missing_data = "breaching"` so a full stop still alarms).
  - ALB `HTTPCode_Target_5XX_Count` sum > 5 in 60s.
  - ALB `UnHealthyHostCount` > 0 for 2×60s.
  - RDS `CPUUtilization` > 80% for 2×5min.
  - RDS `FreeStorageSpace` < 2 GiB for 2×5min.

Wired into both `environments/dev` and `environments/prod`.

## Verification (Success Criteria)

- Applied for real: all 5 alarms + topic + subscription confirmed via
  `aws cloudwatch describe-alarms` / `aws sns list-subscriptions-by-topic`
  after `terraform apply`.
- **Forcing a condition**: not yet exercised in this pass — doing so
  (e.g. `aws ecs update-service --desired-count 0`) would scale the live
  dev service to zero, which wasn't done since Stage 5's proof that
  `ignore_task_definition_changes` holds already depends on the service
  being up, and this is a shared account others may also be depending on
  reproducibility of. Left as a documented gap rather than silently
  claimed done — see `PROGRESS.md`.
- **Email confirmation**: the SNS subscription is `PendingConfirmation` as
  of this doc — needs the account holder (lironefitoussi@gmail.com) to
  click the confirmation link AWS sent. Not something this session can do
  on their behalf.

## Next stage starting point

Stage 12 doesn't depend on monitoring; both were built in the same pass.
