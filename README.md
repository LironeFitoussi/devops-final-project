# devops-mini-project — Three-Tier App on ECS Fargate

Solo DevOps lab: a Three-Tier Application deployed to AWS on ECS Fargate,
built stage by stage.

## Architecture

```
Users → Route 53 → CloudFront → S3 (frontend, private)
                        │
                        ▼
                 Application Load Balancer
                        │
                        ▼
              ECS Fargate Service (backend API)
                        │
                        ▼
                 Amazon RDS (PostgreSQL)
```

- **Presentation**: S3 (private) + CloudFront (Origin Access Control)
- **Application**: ALB + ECS Fargate (Python/FastAPI backend container)
- **Data**: RDS PostgreSQL, private subnets only

Stack: Python FastAPI backend, React (Vite) frontend, Terraform on
**HCP Terraform** (remote execution + Dynamic Provider Credentials — not a
plain S3/DynamoDB backend), GitHub Actions CI/CD, Amazon ECR, region
`eu-west-1`.

## Where things live

- [`docs/lab/00-overview.md`](docs/lab/00-overview.md) — full 12-stage build
  roadmap.
- [`solutions/PROGRESS.md`](solutions/PROGRESS.md) — current stage status.
- [`.claude/skills/three-tier-stage/SKILL.md`](.claude/skills/three-tier-stage/SKILL.md)
  — runs one stage at a time (load spec → clarity gate → implement → record
  solution → update progress).
- `repos/three-tier-frontend/`, `repos/three-tier-backend/`,
  `repos/three-tier-infrastructure/` — **the actual code**. Each is its own
  independent git repository (gitignored here), pushed to
  `github.com/IITC-College/<name>` (private). This top-level repo only
  holds planning docs and the stage-runner skill — no app or Terraform code
  is committed here.

## Remote

This top-level planning/docs shell is not currently pushed anywhere. The
three `repos/*` working repos live at `github.com/IITC-College/three-tier-frontend`,
`.../three-tier-backend`, `.../three-tier-infrastructure`.
