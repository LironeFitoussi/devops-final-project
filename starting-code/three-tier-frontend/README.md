# three-tier-frontend

React (Vite) SPA for the Three-Tier ECS Fargate lab. Builds to static
files (`dist/`) uploaded to a private S3 bucket and served through
CloudFront — it never runs in a container.

Part of a 3-repo solo lab: `three-tier-frontend`, `three-tier-backend`,
`three-tier-infrastructure`. See `docs/lab/` in the parent
`devops-mini-project` repo for the full stage-by-stage build plan.

## Local dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Produces `dist/`, synced to S3 + CloudFront-invalidated by the CI pipeline
added in Stage 9.
