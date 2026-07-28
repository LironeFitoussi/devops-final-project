# Stage 1 – Repository Structure and Docker

## Objective

Establish three independent local repositories with buildable skeletons:
frontend, backend, infrastructure.

## Tasks

1. Create `repos/three-tier-frontend/`, `repos/three-tier-backend/`,
   `repos/three-tier-infrastructure/` under this repo's gitignored `repos/`
   directory.
2. `git init` each one independently (no remote yet).
3. Backend: FastAPI app with a working `/health` route, `requirements.txt`,
   and a **Dockerfile skeleton with `# TODO` comments** instead of working
   instructions (base image, `WORKDIR`, install deps, copy app, `EXPOSE`,
   `CMD` all left as TODOs) — completing it is this stage's exercise.
4. Frontend: Vite React scaffold that builds to static files. No
   Dockerfile — the frontend ships as a static build artifact to S3, never
   runs in a container.
5. Infrastructure: empty directory skeleton matching the module layout used
   from Stage 3 onward (`bootstrap/`, `environments/dev/`,
   `modules/{network,database,ecs,frontend,github-oidc}/`).
6. Each repo gets a README (purpose) and a stack-appropriate `.gitignore`.

## Deliverables

- 3 independent local git repos, each with an initial commit.
- Backend Dockerfile TODOs completed by you, builds and runs.
- Frontend `npm run build` produces `dist/`.

## Success Criteria

- `docker build` + `docker run` on the backend succeeds; `curl localhost:<port>/health`
  returns 200.
- `npm run build` in the frontend succeeds without error.
- `git log` shows one commit in all three repos; none have a remote
  configured; nothing under `repos/` is tracked by the top-level repo.
