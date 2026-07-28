# Original architecture spec (verbatim archive)

Pasted by the user in two passes on 2026-07-21: first the base three-tier
ECS Fargate architecture (S3 backend for Terraform state), then a follow-up
that replaces the Terraform backend with HCP Terraform + Dynamic Provider
Credentials. **The second pass supersedes the first wherever they
conflict** — most notably: the "Terraform Backend" bootstrap section below
(S3 bucket + optional DynamoDB) is superseded by the HCP Terraform
bootstrap described in the second pass and implemented in
[stage-2.md](stage-2.md). Kept here verbatim for context/history — do not
treat the S3-backend section as current. See `CLAUDE.md` for the settled
decisions list.

---

## Pass 1 — Base architecture

הפתרון המתאים ביותר לפרויקט כזה הוא **Three-Tier Application על ECS Fargate**, בלי Kubernetes ובלי ניהול שרתי EC2.

### הארכיטקטורה המוצעת

```text
Users
  │
  ▼
Route 53
  │
  ▼
CloudFront
  │
  ├──────────────► S3
  │                 Frontend
  │
  ▼
Application Load Balancer
  │
  ▼
ECS Fargate Service
Backend API Containers
  │
  ▼
Amazon RDS
PostgreSQL / MySQL
```

חלוקה לשלוש השכבות:

| שכבה              | שירות AWS         | תפקיד                      |
| ----------------- | ----------------- | -------------------------- |
| Presentation Tier | S3 + CloudFront   | אחסון והצגת ה־Frontend     |
| Application Tier  | ALB + ECS Fargate | הרצת ה־Backend בתוך Docker |
| Data Tier         | Amazon RDS        | מסד הנתונים                |

ECS Fargate מאפשר להריץ Containers בלי לנהל EC2 או Kubernetes. ה־Application Load Balancer מבצע Health Checks ומעביר תעבורה רק ל־Tasks תקינים.

---

### מבנה הרשת

```text
VPC: 10.0.0.0/16

┌────────────────────────────────────────────┐
│ Availability Zone A                        │
│                                            │
│ Public Subnet                              │
│ ├── Application Load Balancer              │
│ └── NAT Gateway                            │
│                                            │
│ Private App Subnet                         │
│ └── ECS Fargate Task                       │
│                                            │
│ Private DB Subnet                          │
│ └── RDS                                    │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ Availability Zone B                        │
│                                            │
│ Public Subnet                              │
│ └── Application Load Balancer              │
│                                            │
│ Private App Subnet                         │
│ └── ECS Fargate Task                       │
│                                            │
│ Private DB Subnet                          │
│ └── RDS                                    │
└────────────────────────────────────────────┘
```

ה־ALB יהיה ציבורי, אבל ה־Backend וה־Database יישארו ב־Private Subnets.

AWS ממליצה לפזר workloads על פני מספר Availability Zones. ECS Tasks ב־Private Subnets משתמשים ב־NAT Gateway לצורך גישה החוצה, למשל למשיכת Image מ־ECR.

---

### Security Groups

נגדיר שלושה Security Groups ברורים.

**ALB Security Group**

```text
Inbound:
80  ← Internet
443 ← Internet

Outbound:
Backend port → ECS Security Group
```

**ECS Security Group**

```text
Inbound:
Application port ← ALB Security Group

Outbound:
Database port → RDS Security Group
443 → AWS services / Internet
```

לדוגמה:

```text
ALB:80 → ECS:3000
```

לא נאפשר גישה ישירה מהאינטרנט ל־ECS.

**RDS Security Group**

```text
Inbound:
5432 ← ECS Security Group
```

עבור PostgreSQL. או `3306 ← ECS Security Group` עבור MySQL.

לא יהיה ל־RDS Public IP ולא נאפשר אליו גישה מ־`0.0.0.0/0`.

---

### חלוקת הפרויקט לשלבים (8 שלבים, גרסה ראשונית)

**שלב 1 — הכנת האפליקציה ל־Docker**

```text
frontend/
backend/
```

Dockerfile ל־Backend (Node/Python/FastAPI). ה־Frontend נבנה לקבצים סטטיים ומועלה ל־S3 — אין צורך להריץ אותו בתוך ECS.

**שלב 2 — Terraform Backend** *(superseded — see stage-2.md)*

```text
bootstrap/
├── main.tf
├── variables.tf
├── outputs.tf
└── providers.tf
```

השלב יוצר:

```text
S3 Bucket     → Terraform State
DynamoDB      → אופציונלי בהתאם לשיטת הנעילה
```

אפשר גם להשתמש ב־HCP Terraform במקום S3. חשוב שה־Bootstrap יהיה נפרד, כי אי אפשר להשתמש ב־S3 Backend לפני שה־Bucket עצמו קיים.

**שלב 3 — Networking**

Module `network`: VPC, Internet Gateway, 2 Public Subnets, 2 Private App Subnets, 2 Private DB Subnets, Public/Private Route Tables, NAT Gateway, Elastic IP. לסביבת לימוד: NAT Gateway אחד (חיסכון בעלויות); ל־Production מלא: NAT Gateway בכל AZ.

**שלב 4 — Database**

Module `database`: DB Subnet Group, RDS Instance, RDS Security Group, Secrets Manager Secret. הסיסמה נוצרת עם `random_password` ונשמרת ב־Secrets Manager — לא נכתבת בקוד או ב־GitHub Secrets.

לימוד: `instance_class = "db.t4g.micro"`, `multi_az = false`, `skip_final_snapshot = true`, `deletion_protection = false`.
Production: `multi_az = true`, `deletion_protection = true`.

**שלב 5 — Backend על ECS**

Module `ecs`: ECR Repository, ECS Cluster, ECS Task Definition, ECS Service, ALB, Target Group, Listener, CloudWatch Log Group, Task Execution IAM Role, Application Task IAM Role. Task Definition כולל Image/CPU/Memory/Container port/Env vars/Secrets/CloudWatch logging/Health check (`cpu=256`, `memory=512`, `desired_count=2`). פרטי ה־DB דרך Secrets Manager, לא ערכים גלויים.

**שלב 6 — Frontend על S3 ו־CloudFront**

Module `frontend`: Private S3 Bucket, CloudFront Distribution, Origin Access Control, S3 Bucket Policy. עבור SPA: `403 / 404 → /index.html`.

**שלב 7 — Domain ו־HTTPS**

Route 53, ACM Certificate, HTTPS Listener, HTTP → HTTPS Redirect. אפשר `app.example.com → CloudFront`, `api.example.com → ALB`. בשלב ראשון אפשר בלי Domain (CloudFront URL / ALB DNS name).

**שלב 8 — Monitoring**

CloudWatch Logs, ALB Health Checks, ECS Service Metrics, CloudWatch Alarm, SNS Notification. Alarms: ECS running task count, ALB 5XX errors, Unhealthy targets, RDS CPU utilization, RDS free storage.

---

### מבנה Repository מומלץ (מונוריפו, גרסה ראשונית)

```text
three-tier-application/
├── frontend/
├── backend/
└── infrastructure/
    ├── bootstrap/
    ├── environments/{dev,prod}/
    └── modules/{network,security,database,ecs,frontend,github-oidc}/
```

### הפרדת CI/CD (עקרונית, גרסה ראשונית)

Infrastructure Pipeline (terraform fmt/init/validate/plan on PR, apply after merge), Backend Pipeline (test → docker build → ECR push tagged by SHA → register task def → update service), Frontend Pipeline (test → build → s3 sync → cloudfront invalidation). Image tags use Git SHA, never rely only on `:latest`.

### GitHub ↔ AWS (עקרוני, גרסה ראשונית)

לא לשמור `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` ב־GitHub. Terraform יוצר GitHub OIDC Provider + IAM Roles נפרדים ל־infrastructure/backend-deploy/frontend-deploy, כל אחד עם הרשאות מצומצמות משלו.

### Terraform מנהל מול מה ש־CI/CD מנהל

Terraform: VPC/Subnets/SGs/RDS/ECR/ECS Cluster+Service/Base Task Definition/ALB/S3/CloudFront/IAM/OIDC/CloudWatch.
CI/CD: Application builds/Docker image tags/Frontend files/New ECS Task Definition revisions/Application deployments.

ב־ECS Service:

```hcl
lifecycle {
  ignore_changes = [
    task_definition
  ]
}
```

כך GitHub Actions מעדכן את גרסת האפליקציה בלי ש־Terraform יחזיר אותה לגרסה הישנה ב־Apply הבא.

### סדר בנייה מוצע (12 שלבים, גרסה זו)

```text
Stage 1  — Repository structure and Docker
Stage 2  — Terraform bootstrap and remote state
Stage 3  — VPC, subnets and routing
Stage 4  — Security groups and RDS
Stage 5  — ECR, ECS Fargate and ALB
Stage 6  — S3 and CloudFront frontend
Stage 7  — GitHub OIDC
Stage 8  — Backend CI/CD
Stage 9  — Frontend CI/CD
Stage 10 — Infrastructure CI/CD
Stage 11 — Monitoring and alarms
Stage 12 — HTTPS, domain and production improvements
```

Bindings for this pass: Frontend React/Vite → S3+CloudFront; Backend Node.js/FastAPI → ECS Fargate; Database PostgreSQL RDS; IaC Terraform; CI/CD GitHub Actions; Registry ECR; Auth GitHub OIDC; Region eu-west-1; Envs dev then prod.

---

## Pass 2 — Replaces Terraform backend with HCP Terraform

מעולה. במקרה הזה כדאי להפריד בין **שני Pipelines עצמאיים**:

```text
Infrastructure CI/CD → GitHub Actions + Terraform Cloud
Application CI/CD    → GitHub Actions + AWS
```

Terraform Cloud (**HCP Terraform**) שומר את ה־State ומריץ `plan`/`apply` מרחוק. GitHub Actions מפעיל Runs מרוחקים ב־HCP Terraform.

### הארכיטקטורה המעודכנת

```text
GitHub
│
├── infrastructure/  → GitHub Actions → HCP Terraform (Remote State/Plan/Apply) → AWS
├── backend/         → GitHub Actions (Test/Build/Push ECR/Deploy ECS)
└── frontend/        → GitHub Actions (Test/Build/Upload S3/Invalidate CloudFront)
```

### חלוקת אחריות

**GitHub Actions**: code validation, tests, terraform fmt/validate, triggering Terraform Cloud runs, docker build/push, ECS update, frontend upload, CloudFront invalidation.

**Terraform Cloud**: state, locking, plan, apply, run history, workspace variables, AWS auth for Terraform.

**AWS**: runs the actual resources — VPC/Subnets/ALB/ECS Fargate/ECR/RDS/S3/CloudFront/Route 53/CloudWatch.

### מבנה Repositories (גרסת פולירפו, גרסה זו)

לפרויקט לימודי: `three-tier-frontend`, `three-tier-backend`, `three-tier-infrastructure` — כל חלק עם Pipeline עצמאי.

`three-tier-infrastructure/` layout:

```text
three-tier-infrastructure/
├── .github/workflows/{terraform-pr.yml,terraform-apply.yml}
├── environments/{dev,prod}/{main.tf,variables.tf,outputs.tf,providers.tf,terraform.tfvars}
└── modules/{network,security,database,ecs,frontend,monitoring,github-oidc}/
```

### Terraform Cloud Workspaces

`three-tier-dev`, `three-tier-prod`. בהתחלה מספיק `three-tier-dev`.

```hcl
terraform {
  cloud {
    organization = "your-terraform-cloud-organization"
    workspaces {
      name = "three-tier-dev"
    }
  }
  required_version = ">= 1.10.0"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}
```

אין `backend "s3"` — Terraform Cloud מנהל את ה־State בעצמו.

### חיבור GitHub ↔ Terraform Cloud

מומלץ: **GitHub Actions מפעיל Terraform Cloud** (Option 2), לא VCS Integration ישיר (Option 1) — כי המטרה ללמוד GitHub Actions ברצינות, ומאפשר Status Checks לפני/אחרי ה־Remote Run.

```text
Workspace Execution Mode: Remote
VCS Connection: None
Runs are triggered from GitHub Actions
```

### Infrastructure Pipeline

**PR workflow** (`terraform-pr.yml`): `terraform fmt -check -recursive`, `terraform init`, `terraform validate`, `terraform plan` (הרצה בפועל מתבצעת ב־Terraform Cloud כש־Workspace הוא Remote Execution). Env: `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE=three-tier-dev`, `TF_TOKEN_app_terraform_io: ${{ secrets.TF_API_TOKEN }}`.

**Apply workflow** (`terraform-apply.yml`): trigger on push to `main`, `concurrency: { group: terraform-dev, cancel-in-progress: false }`, `terraform init` → `validate` → `apply -auto-approve -input=false`.

### אישור ידני לפני Apply

Dev: apply אוטומטי אחרי merge. Production: GitHub Environment (`environment: production`) עם Required reviewers תחת Settings → Environments → production. אפשר גם להשאיר את ה־Workspace ללא Auto Apply וללחוץ `Confirm & Apply` ידנית.

| סביבה      | התנהגות                      |
| ---------- | ----------------------------- |
| Dev        | Apply אוטומטי לאחר Merge      |
| Production | אישור דרך GitHub Environment  |

### חיבור Terraform Cloud ל־AWS — Dynamic Provider Credentials

לא לשמור `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` ב־Terraform Cloud. במקום זאת: **Dynamic Provider Credentials** — Terraform Cloud מקבל OIDC Token, ממיר אותו ל־AWS IAM ל־Credentials זמניים לכל Run.

ב־Workspace Environment Variables:

```text
TFC_AWS_PROVIDER_AUTH = true
TFC_AWS_RUN_ROLE_ARN  = arn:aws:iam::123456789012:role/tfc-three-tier-dev
```

אפשר גם לפצל `TFC_AWS_PLAN_ROLE_ARN` (ReadOnlyAccess) מ־`TFC_AWS_APPLY_ROLE_ARN` (יצירה/שינוי) — בפרויקט ראשוני מספיק Role אחד (`TFC_AWS_RUN_ROLE_ARN`).

### בעיית Bootstrap הראשונית

Terraform Cloud עדיין צריך IAM Role קיים כדי להתחבר — לכן שלב **Bootstrap חד־פעמי** (Terraform מקומי עם AWS credentials זמניים, או AWS CLI/Console):

```text
bootstrap/
├── providers.tf
├── main.tf
├── variables.tf
└── outputs.tf
```

Output:

```hcl
output "terraform_cloud_role_arn" {
  value = aws_iam_role.terraform_cloud.arn
}
```

הערך נכנס ל־Workspace כ־`TFC_AWS_RUN_ROLE_ARN`. אחרי שה־Role נוצר, כל שאר התשתית מנוהלת דרך Terraform Cloud בלבד.

### GitHub Secrets נדרשים לתשתית

רק `TF_API_TOKEN` (Token ייעודי, הרשאות מוגבלות ל־Workspace/Team) — אין מפתחות AWS ב־Infrastructure repo כלל.

### Backend CI/CD

לא עובר דרך Terraform Cloud — מתחבר ישירות ל־AWS דרך GitHub OIDC (`permissions: { contents: read, id-token: write }`): checkout → test → configure-aws-credentials (role assume) → ECR login → docker build/push (tag = `github.sha`) → `aws ecs update-service --force-new-deployment` (גרסה מלאה: מעדכן Task Definition עם ה־Image של ה־SHA, לא `latest`).

### Frontend CI/CD

checkout → setup-node → npm ci → test → npm run build → configure-aws-credentials → `aws s3 sync dist/ s3://$BUCKET --delete` → `aws cloudfront create-invalidation --distribution-id $ID --paths "/*"`.

### ההחלטות הסופיות לפרויקט (גרסה זו — הבסיס לתוכנית)

```text
Infrastructure:                Terraform + HCP Terraform remote execution
State:                          HCP Terraform
Infrastructure CI/CD:           GitHub Actions
Terraform authentication:       TF_API_TOKEN from GitHub to HCP Terraform
TFC authentication to AWS:      HCP Terraform Dynamic Provider Credentials
Application authentication:     GitHub Actions OIDC
Backend deployment:             Docker → ECR → ECS Fargate
Frontend deployment:            Build → S3 → CloudFront
Database:                       Amazon RDS PostgreSQL
Dev Apply:                      Automatic after merge
Production Apply:                GitHub Environment approval
```
