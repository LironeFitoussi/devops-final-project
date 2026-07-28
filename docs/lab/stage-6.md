# Stage 6 – Frontend Module

## Starting Point

Stage 5 complete: backend reachable via ALB.

## Objective

Static frontend served securely via CloudFront, backend never directly
exposed via S3.

## Tasks

1. `modules/frontend/`: private S3 bucket (no public access of any kind);
   CloudFront distribution with an Origin Access Control; S3 bucket policy
   restricting reads to that OAC only.
2. SPA routing: custom error responses mapping `403`/`404` → `/index.html`,
   so client-side routes survive a hard refresh.

## Deliverables

- `modules/frontend` wired into `environments/dev`; CloudFront domain
  serving a placeholder `index.html` (the Stage 1 frontend build, uploaded
  manually for now — automated upload comes in Stage 9).

## Success Criteria

- S3 bucket has zero public access (block public access fully enabled).
- CloudFront URL returns content.
- Requesting a deep client-side route (e.g. `/some/deep/path`) returns
  `index.html` instead of an S3 XML error.
