# Three-Tier ECS Fargate Lab — Overview

Source of truth: this file + `stage-1.md`…`stage-12.md`. Original pasted
architecture spec archived verbatim at [original-spec-he.md](original-spec-he.md)
(kept for context; superseded in places — see there and `CLAUDE.md`).

## Architecture

```
Users → Route 53 → CloudFront ──────► S3 (frontend, private)
                       │
                       ▼
              Application Load Balancer   (public subnets, 2 AZs)
                       │
                       ▼
            ECS Fargate Service           (private app subnets, 2 AZs)
            Backend API (FastAPI)
                       │
                       ▼
              Amazon RDS PostgreSQL       (private DB subnets, 2 AZs)
```

- **Presentation tier**: S3 (private bucket) + CloudFront (Origin Access
  Control) — no public S3 access.
- **Application tier**: ALB (public) + ECS Fargate (private) — backend
  container never reachable directly from the internet.
- **Data tier**: RDS PostgreSQL (private, no public IP) — reachable only
  from the ECS security group.

Region `eu-west-1`. One shared NAT Gateway for cost saving in dev; prod
gets one per AZ (Stage 12).

## Repos

- `repos/three-tier-frontend` — React (Vite) SPA, built to static files, no
  container.
- `repos/three-tier-backend` — Python FastAPI backend, containerized.
- `repos/three-tier-infrastructure` — Terraform, HCP Terraform remote
  execution (`environments/{dev,prod}`, `modules/*`, one-time `bootstrap/`).

All three: independent git repos under the gitignored `repos/` directory
here, pushed to `github.com/IITC-College/<name>` (private).

## Stage roadmap

| # | Title | Doc |
|---|---|---|
| 1 | Repository Structure and Docker | [stage-1.md](stage-1.md) |
| 2 | Terraform Bootstrap (HCP Terraform) | [stage-2.md](stage-2.md) |
| 3 | Networking Module | [stage-3.md](stage-3.md) |
| 4 | Security Groups + RDS Module | [stage-4.md](stage-4.md) |
| 5 | ECS Module | [stage-5.md](stage-5.md) |
| 6 | Frontend Module | [stage-6.md](stage-6.md) |
| 7 | GitHub OIDC (App-Deploy Pipelines) | [stage-7.md](stage-7.md) |
| 8 | Backend CI/CD | [stage-8.md](stage-8.md) |
| 9 | Frontend CI/CD | [stage-9.md](stage-9.md) |
| 10 | Infrastructure CI/CD | [stage-10.md](stage-10.md) |
| 11 | Monitoring | [stage-11.md](stage-11.md) |
| 12 | HTTPS, Domain, Prod Hardening | [stage-12.md](stage-12.md) |

Stages are sequential — each stage's "Starting Point" assumes the previous
stage's Success Criteria are actually met. Track status in
[`../../solutions/PROGRESS.md`](../../solutions/PROGRESS.md).

## Two distinct OIDC trusts — don't conflate them

- **Stage 2**: HCP Terraform's own AWS auth, via Dynamic Provider
  Credentials — OIDC provider `app.terraform.io`, used only by Terraform
  Cloud runs.
- **Stage 7**: GitHub Actions app-deploy pipelines — OIDC provider
  `token.actions.githubusercontent.com`, used by the backend/frontend CI/CD
  workflows, which talk to AWS directly and never go through Terraform.

## Cost note

Starting Stage 3–5 this provisions real, billable AWS resources (NAT
Gateway, RDS, ALB, ECS Fargate tasks). Tear down `environments/dev` via
`terraform destroy` when not actively working through stages, if cost is a
concern.
