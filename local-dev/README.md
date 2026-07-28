# local-dev

Docker Compose stack to run the three-tier app locally: Postgres + FastAPI
backend + React frontend built and served via nginx.

Not part of the AWS lab infra (ECS/RDS/Terraform) — pure local convenience.

- `frontend.Dockerfile` — dev-only; multi-stage (vite build → nginx serve).
  The frontend repo itself has no Dockerfile since in the real lab it ships
  as a static build to S3/CloudFront (see `docs/lab/stage-1.md`); nginx here
  mirrors that static-serving shape for local parity. `VITE_API_URL` is
  baked in at build time (build arg) since it's a static bundle — changing
  it requires `docker compose build frontend`.
- `nginx.conf` — SPA fallback (`try_files ... /index.html`) for
  react-router-dom client-side routing.
- `backend.Dockerfile` — copy of `repos/three-tier-backend/Dockerfile`,
  kept here so this folder is self-contained. If the backend Dockerfile
  changes, mirror the change here too.

## Run

```bash
cd local-dev
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000 (docs at /docs)
- Postgres: localhost:5432 (postgres/postgres)

Backend source dir is bind-mounted with `--reload`, so backend edits reload
live. Frontend is a static nginx build — after changes run
`docker compose up --build frontend`. Backend auto-creates tables and seeds
data on first boot.

## Stop / reset

```bash
docker compose down        # stop
docker compose down -v     # stop + wipe db volume
```
