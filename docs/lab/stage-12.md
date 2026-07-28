# Stage 12 – HTTPS, Domain, Prod Hardening

## Starting Point

Stage 11 complete: dev environment fully built, monitored, and deployed
through CI/CD.

**Prerequisite check**: this stage needs a real domain you control (Route
53 hosted zone, or a domain delegated to Route 53). Confirm this before
starting — it's an external dependency this scaffold can't satisfy.

## Objective

Production-grade TLS and a hardened, cost-normal prod environment distinct
from dev's cost-saving defaults.

## Tasks

1. Route 53 hosted zone/records; ACM certificate (DNS-validated); HTTPS
   listener on the ALB + HTTP→HTTPS redirect.
2. Subdomains: `app.<domain>` → CloudFront, `api.<domain>` → ALB.
3. `environments/prod` tfvars diffs from dev: `multi_az = true` (RDS),
   `deletion_protection = true` (RDS), one NAT Gateway per AZ (drop dev's
   single shared NAT).

## Deliverables

- Prod environment fully parameterized, HTTPS end-to-end.

## Success Criteria

- `https://app.<domain>` and `https://api.<domain>` resolve and serve
  traffic over TLS.
- Plain HTTP requests redirect to HTTPS.
- Prod RDS shows Multi-AZ and deletion protection enabled.
