# Stage 5 – ECS Module

## Starting Point

Stage 4 complete: RDS available, private, password in Secrets Manager.

## Objective

Backend container running on ECS Fargate behind an ALB, with CI-driven
deploys that Terraform won't revert.

## Tasks

1. `modules/ecs/`: ECR repository; ECS cluster; task definition (image
   placeholder tag, DB connection env vars/secrets pulled from Secrets
   Manager); task execution role + task role (least privilege: Secrets
   Manager read, CloudWatch Logs write); ECS service running in the private
   app subnets; ALB in the public subnets + target group + HTTP listener;
   CloudWatch log group.
2. `cpu = 256`, `memory = 512`, `desired_count = 2` as dev defaults.
3. On the `aws_ecs_service` resource:
   ```hcl
   lifecycle {
     ignore_changes = [task_definition]
   }
   ```
   This is required so that Stage 8's CI-driven task-definition updates
   aren't reverted by the next `terraform apply`.

## Deliverables

- `modules/ecs` wired into `environments/dev`; backend reachable via the
  ALB's DNS name.

## Success Criteria

- ECS service is stable with running tasks; ALB target group reports
  healthy targets.
- Hitting the ALB DNS name returns the backend's `/health` endpoint.
- A manual `aws ecs update-service --force-new-deployment` (simulating what
  CI will do in Stage 8) is **not reverted** by re-running `terraform apply`
  — proves the `ignore_changes` lifecycle rule works.
