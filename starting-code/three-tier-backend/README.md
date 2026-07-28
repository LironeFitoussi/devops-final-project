# three-tier-backend

Python FastAPI backend for the Three-Tier ECS Fargate lab. Runs as an ECS
Fargate service behind an ALB, reads its database connection info from
Secrets Manager (see the infrastructure repo's `modules/database`).

Part of a 3-repo solo lab: `three-tier-frontend`, `three-tier-backend`,
`three-tier-infrastructure`. See `docs/lab/` in the parent
`devops-mini-project` repo for the full stage-by-stage build plan.

## Local dev

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

`GET /health` → `{"status": "ok"}`

## Docker

The `Dockerfile` ships as a skeleton with `# TODO` comments — completing it
is Stage 1's exercise, not something handed over pre-solved.
