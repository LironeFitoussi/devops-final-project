# Stage 3 notes

## Gotcha discovered mid-stage: HCP Terraform CLI-driven runs don't upload parent directories

`environments/dev/main.tf` originally called the module as
`source = "../../modules/network"` (matching the doc's literal layout —
`modules/` and `environments/` as siblings). This passed `terraform
validate` locally but **failed on the remote run**:

```
Error: Unreadable module directory
Unable to evaluate directory symlink: lstat ../../modules: no such file or directory
```

Root cause (confirmed via `TF_LOG=trace`): for CLI-driven (non-VCS) runs,
`backend/cloud` uploads **only the current working directory** as the
configuration archive — `starting configuration upload at
.../environments/dev`. It does not walk up to include module sources
referenced via `../`. This is a real limitation of CLI-driven runs (as
opposed to VCS-connected workspaces, which upload the whole repo and use
the workspace's "Terraform Working Directory" setting) — HCP Terraform
docs confirms modules outside the working directory aren't supported this
way.

**Fix applied**: a symlink `environments/dev/modules -> ../../modules`,
with the module source changed to `./modules/network` (inside the
uploaded directory). The repo's actual module code still lives in the
single canonical `modules/` location — the symlink just makes it visible
to the upload. Confirmed working: `terraform plan`/`apply` both succeeded
remotely once the source pointed inside the symlinked path.

**Carry into every later stage that adds an environments/dev module call**
(Stage 4 database, Stage 5 ecs, Stage 6 frontend, Stage 7 github-oidc):
use `source = "./modules/<name>"` via the same symlink, not
`"../../modules/<name>"`. When Stage 10 stands up `environments/prod`, it
needs the identical `modules` symlink too.

## Decisions

- Kept the doc's sibling `modules/` + `environments/` layout (didn't
  restructure or duplicate module code) — the symlink preserves single
  source of truth while working around the upload limitation.
- Didn't switch the workspace to local execution mode to sidestep this —
  that would break Stage 2's Dynamic Provider Credentials, which only
  federate for runs actually executing inside HCP Terraform's runners
  (settled in `CLAUDE.md`).
