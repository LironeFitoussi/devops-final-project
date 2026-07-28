# Stage 1 notes

## Uncommitted app content found at stage start

`repos/three-tier-backend` and `repos/three-tier-frontend` already had an
`Initial project setup (Stage 1)` commit matching the spec skeleton, plus a
large amount of **uncommitted** work implementing a full app ("Woods &
Tools" — woodworking blog + tools marketplace: auth, posts, tools listings,
Postgres/SQLAlchemy backend, matching React frontend). Nothing in
`docs/lab/` describes this app, so it looked like it might be unrelated
work sharing the repo directories.

Asked the user before touching it — confirmed **intentional**: this is the
real application the lab's infra is meant to serve, not filler. Committed
as-is on top of the Stage 1 skeleton commit; see
`solutions/stage-1-repo-structure-and-docker.md` for the verification
details and the runtime implications (backend requires a live
`DATABASE_URL` at boot — no in-memory/SQLite fallback) that later stages
(4, 5, 6, 9) need to account for.
