# Stage 1 — Repository Structure and Docker

## What was built

- `repos/three-tier-backend/` — FastAPI backend, git-initialized, 2 commits:
  1. `Initial project setup (Stage 1)` — the bare skeleton (Dockerfile with
     `# TODO`s, minimal `requirements.txt`, `/health` route only). This
     commit already existed from a prior session.
  2. `Complete Dockerfile skeleton, build Woods & Tools API` — this pass:
     filled in the Dockerfile TODOs, added `.dockerignore`, and committed
     the "Woods & Tools" app (auth, posts, tools marketplace listings on
     Postgres/SQLAlchemy, seed data, pytest suite) that was sitting
     uncommitted in the working tree.
- `repos/three-tier-frontend/` — Vite React SPA, git-initialized, 2 commits:
  1. `Initial project setup (Stage 1)` — bare Vite scaffold (also pre-existing).
  2. `Build out Woods & Tools SPA on the Vite scaffold` — auth context/views,
     posts + tools pages, API client, vitest coverage.
- `repos/three-tier-infrastructure/` — module-layout skeleton (`bootstrap/`,
  `environments/dev/`, `modules/{network,database,ecs,frontend,github-oidc}/`,
  each with a placeholder README). One commit, nothing to add this pass.

## Key decision: the "Woods & Tools" app is intentional

On starting this stage, all three repos already had an `Initial project
setup (Stage 1)` commit matching the stage spec exactly, but the working
tree also had a large pile of **uncommitted** changes implementing a full
woodworking blog/marketplace app (auth, posts, tools-for-sale) — well
beyond a `/health`-only skeleton and not mentioned anywhere in
`docs/lab/`. This was flagged to the user before touching anything (see
`docs/lab/notes/stage-1.md`); confirmed as intentional — "Woods & Tools" is
the real application this lab's infra will serve, not a placeholder. It's
now committed as-is on top of the Stage 1 skeleton commit.

Consequence for later stages: the backend needs a real Postgres connection
at startup (`DATABASE_URL`, defaults to `localhost:5432`) — `app/main.py`'s
`lifespan` runs `Base.metadata.create_all` + seed on boot, so the container
will not start without a reachable DB. Stage 4 (RDS module) needs to wire
`DATABASE_URL` from Secrets Manager into the ECS task definition; Stage 5
(ECS module) health check should hit `/health` (DB-independent), not
`/health/db`, so a container isn't marked unhealthy during a transient DB
blip. Frontend needs a `VITE_API_URL`-style env at build/deploy time to
reach the backend (see `.env.example`) — worth confirming in Stage 6/9.

## Verification (Success Criteria)

Backend — Docker build/run + `/health` 200, against a real throwaway
Postgres (mirrors how RDS will work later; the app cannot boot without a
DB):

```bash
cd repos/three-tier-backend
docker build -t three-tier-backend:stage1 .
docker network create stage1-net
docker run -d --name stage1-pg --network stage1-net \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres \
  postgres:16-alpine
docker run -d --name stage1-backend --network stage1-net -p 8000:8000 \
  -e DATABASE_URL=postgresql+psycopg2://postgres:postgres@stage1-pg:5432/postgres \
  three-tier-backend:stage1
curl -s -w '\nHTTP %{http_code}\n' http://localhost:8000/health
# => {"status":"ok"}  HTTP 200
docker rm -f stage1-backend stage1-pg && docker network rm stage1-net
```

Result: confirmed 200 on `/health`, `/health/db`, and `/posts` (seed data
present).

Frontend build:

```bash
cd repos/three-tier-frontend
npm install
npm run build
# => dist/ produced, no errors
```

Bonus (not a Stage 1 requirement, ran anyway since real app code was being
committed): `npm test` (vitest) — 12/12 passed. `pytest` against the same
throwaway Postgres — 11/11 passed.

Repo hygiene:

```bash
git -C repos/three-tier-backend log --oneline        # 2 commits, no remote
git -C repos/three-tier-frontend log --oneline        # 2 commits, no remote
git -C repos/three-tier-infrastructure log --oneline  # 1 commit, no remote
git -C repos/three-tier-backend remote -v              # (empty)
git ls-files repos/ | head                              # (empty — top-level repo ignores repos/)
```

## Next stage starting point

Stage 2 (Terraform Bootstrap / HCP Terraform) is unaffected by the app
content — it only needs the `three-tier-infrastructure` skeleton, which is
untouched this pass. Carry forward: backend needs `DATABASE_URL` at
runtime, and ECS health checks (Stage 5) should target `/health`, not
`/health/db`.
