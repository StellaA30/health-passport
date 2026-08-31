# Deploying to AWS (Academy Learner Lab)

A highly-available, multi-AZ deployment: an Application Load Balancer terminates HTTPS and spreads
traffic across an EC2 Auto Scaling Group, backed by a Multi-AZ RDS PostgreSQL database and an
encrypted S3 bucket.

| Service | Role in this app |
|---|---|
| **ALB** | Public HTTPS entry point (ACM cert), health checks, spreads load across AZs |
| **EC2 (Auto Scaling Group)** | Runs the Next.js server (`next start`) behind nginx; scales 1–3 |
| **RDS for PostgreSQL (Multi-AZ)** | Application database with a synchronous standby in a second AZ |
| **S3** | Stores health-entry attachments; encrypted at rest (SSE), presigned URLs |
| **IAM** | `LabInstanceProfile` on the instances — least privilege, no access keys on disk |
| **CloudWatch** | Metrics, logs, alarms; drives auto-scaling and the cost alarm |

```
                          User
                           │  HTTPS
                           ▼
                  ┌──────────────────┐
                  │  ALB (HTTPS 443) │  ACM cert, HTTP 80 → 443 redirect
                  └──────────────────┘
        ┌──────────── AWS VPC (10.0.0.0/16, Multi-AZ) ────────────┐
        │                                                          │
        │   AZ us-east-1a                 AZ us-east-1b            │
        │   ┌───────────────────┐         ┌───────────────────┐    │
        │   │ public subnet     │         │ public subnet     │    │
        │   │  EC2 (ASG 1–3)    │         │  EC2 (ASG 1–3)    │    │
        │   │  nginx :80 → :3000│         │  nginx :80 → :3000│    │
        │   └─────────┬─────────┘         └─────────┬─────────┘    │
        │             │                             │              │
        │   ┌─────────▼─────────┐   sync   ┌────────▼──────────┐   │
        │   │ private subnet    │◀────────▶│ private subnet    │   │
        │   │  RDS primary :5432│  failover│  RDS standby      │   │
        │   │  encrypted (KMS)  │          │  encrypted (KMS)  │   │
        │   └───────────────────┘          └───────────────────┘   │
        └──────────────────────────────────────────────────────────┘
             │                    │                     │
             ▼                    ▼                     ▼
        S3 bucket            IAM roles             CloudWatch
        SSE-encrypted        least privilege       logs, metrics, alarms
```

The app in the **public** subnets keeps the design (and bill) simple: the instances reach GitHub,
`dnf`, and S3 straight through the internet gateway, so there is **no NAT gateway** (~$32/mo saved).
RDS sits in **private** subnets with no route to the internet — only the web instances can reach it.

`lib/s3.js` already handles the switch: when `S3_ENDPOINT` is unset it uses the default AWS
credential chain (the instance role) and real S3 URLs — no code change needed for AWS.

---

## What is encrypted, and how hard each one was

| Leg | How | Effort |
|---|---|---|
| **Browser → ALB** | HTTPS on the ALB with a certificate in ACM | Easy if you have a domain (DNS-validated ACM cert, free, no browser warning). No domain → import a self-signed cert into ACM (5 min, browser shows a warning you click past). See step 5. |
| **ALB → EC2** | Plain HTTP inside the VPC | Left as HTTP. The hop never leaves the VPC. Re-encrypting to the instances needs a cert per instance and buys little here. |
| **EC2 → RDS** | `?sslmode=require` on `DATABASE_URL` | **Trivial** — one query-string parameter, no code change. RDS PostgreSQL accepts TLS out of the box. Done in step 4/6. |
| **EC2 → S3** | HTTPS | Automatic — the AWS SDK always uses HTTPS. |
| **RDS at rest** | KMS encryption (default `aws/rds` key) | One checkbox **at creation time** — free, negligible overhead. Cannot be added to an existing instance, so it's set in step 4. |
| **S3 at rest** | SSE-S3 (`AES256`) | On by default for new buckets. Confirmed in step 3. |

---

## Cost — read this before you build (you have ~$50)

The Learner Lab credit meter is your budget gauge (the **Billing** console is usually blocked).
Running 24/7 this stack is roughly:

| Resource | ~$/day | Note |
|---|---|---|
| RDS `db.t3.micro` **Multi-AZ** | ~$1.75 | **You cannot stop a Multi-AZ RDS instance.** It bills continuously. |
| ALB | ~$0.60 | Plus a few cents of LCU. |
| EC2 `t3.small` × desired 1 | ~$0.50 | More when the ASG scales out. |
| RDS storage / S3 / data | pennies | 20 GB gp3, tiny objects. |

That's **~$3/day ≈ $85/month** — it will outrun $50 if you leave it up. Keep the total footprint
to about **two weeks of uptime**, and between work sessions:

- **Snapshot and delete the RDS instance** (`Actions → Take snapshot`, then delete). Recreate it
  from the snapshot for your next session — same endpoint name is not guaranteed, so update the SSM
  parameter (step 6). *Or* run **Single-AZ** day-to-day and only convert to Multi-AZ for the demo
  (`Modify → Multi-AZ: yes`, applies in minutes).
- **Set the ASG to `min 0 / desired 0`** — stops all EC2 charges.
- Optionally **delete the ALB** (recreate from step 8; the listener config is quick).

See **Cost / teardown** at the end for the full teardown.

---

## 0. Before you start

From the Learner Lab page:

- Click **Start Lab**, wait for the green dot.
- **AWS Details → Download PEM** (`labsuser.pem`) — the `vockey` key pair for SSH.
- Everything must be in **us-east-1**.
- Lab credentials (access key / secret / **session token**) rotate every session. Use them only on
  your laptop for the AWS CLI — never on an instance.

Local CLI setup on your laptop — paste all three values from **AWS Details → AWS CLI** into
`~/.aws/credentials`. You need the CLI for the ACM import and the SSM parameters.

---

## 1. Network — VPC and subnets

Console → VPC → **Create VPC** → **VPC and more**:

- Name: `health-passport-vpc`
- IPv4 CIDR: `10.0.0.0/16`
- AZs: **2**
- Public subnets: **2**, Private subnets: **2**
- **NAT gateways: None**
- VPC endpoints: **None** (or **S3 Gateway** — it's free and keeps S3 traffic off the IGW; add it
  to the public route table if you enable it)
- DNS hostnames + DNS resolution: **Enabled**

Create. This gives you an internet gateway, a public route table (`0.0.0.0/0` → IGW) on the two
public subnets, and a private route table (no internet route) on the two private subnets.

Note the four subnet IDs and which AZ each is in — you'll pick 2 public (for the ALB and ASG) and
2 private (for RDS).

---

## 2. Security groups

Console → EC2 → Security Groups → **Create** three, all in `health-passport-vpc`:

**`hp-alb-sg`** — the load balancer
| Type | Port | Source |
|---|---|---|
| HTTPS | 443 | `0.0.0.0/0` |
| HTTP | 80 | `0.0.0.0/0` (redirected to 443) |

**`hp-web-sg`** — the EC2 instances
| Type | Port | Source |
|---|---|---|
| HTTP | 80 | `hp-alb-sg` (only the ALB reaches the app) |
| SSH | 22 | **My IP** (for the one-time migrate/seed and debugging) |

**`hp-rds-sg`** — the database
| Type | Port | Source |
|---|---|---|
| PostgreSQL | 5432 | `hp-web-sg` (only the web instances reach the DB) |

---

## 3. Create the S3 bucket

Console → S3 → **Create bucket**:

- Name: `health-passport-<your-initials>-<random>` (globally unique)
- Region: **us-east-1**
- Block all public access: **leave ON** (the app uses presigned URLs)
- **Default encryption**: **SSE-S3 (`AES256`)** — this is the default; confirm it's selected

Record the name — it becomes the `S3_BUCKET_NAME` parameter in step 6.

---

## 4. Create the RDS PostgreSQL database (Multi-AZ, encrypted)

First, a DB subnet group so RDS lives in the **private** subnets:

Console → RDS → **Subnet groups → Create**:
- Name: `hp-db-private`
- VPC: `health-passport-vpc`
- Add the **two private** subnets (one per AZ)

Then Console → RDS → **Create database**:

- **Standard create**, Engine **PostgreSQL**
- Templates: **Dev/Test** (Free tier doesn't allow Multi-AZ)
- **Availability & durability**: **Multi-AZ DB instance** (creates the synchronous standby)
- DB instance identifier: `health-passport-db`
- Master username: `postgres` — set a master password, record it
- Instance class: **db.t3.micro** (Burstable)
- Storage: 20 GB gp3, **disable** storage autoscaling
- **Connectivity:**
  - VPC: `health-passport-vpc`
  - DB subnet group: `hp-db-private`
  - Public access: **No**
  - VPC security group: **choose existing → `hp-rds-sg`** (remove `default`)
  - Don't connect to an EC2 compute resource
- **Encryption**: **Enable encryption**, KMS key **`(default) aws/rds`**
- Additional configuration → Initial database name: `health_passport`

Wait for status **Available**, then copy the **endpoint** (e.g.
`health-passport-db.abcdef.us-east-1.rds.amazonaws.com`).

Your `DATABASE_URL` — note the `?sslmode=require`, which is what encrypts the connection:

```
postgresql://postgres:<PASSWORD>@<ENDPOINT>:5432/health_passport?sslmode=require
```

`sslmode=require` encrypts without verifying the server certificate — no CA bundle to manage. If
your assignment needs full verification, download the RDS global bundle and use
`?sslmode=verify-full&sslrootcert=/home/ec2-user/rds-ca.pem` instead.

---

## 5. TLS certificate for the ALB

**If you control a domain**, request a free public cert: Console → ACM → **Request** → your domain →
**DNS validation** → add the CNAME it gives you. No browser warning. Skip to step 6.

**No domain (typical for the lab)** — import a self-signed cert into ACM. On your laptop:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout hp-key.pem -out hp-cert.pem -subj "/CN=health-passport"

aws acm import-certificate --region us-east-1 \
  --certificate fileb://hp-cert.pem --private-key fileb://hp-key.pem
```

Record the `CertificateArn` from the output. Browsers will show a "not private" warning you click
through — the connection is still encrypted, which is what the assignment is about.

---

## 6. Store config in SSM Parameter Store

Keeps the DB password out of the launch template and the AMI. On your laptop:

```bash
aws ssm put-parameter --region us-east-1 --name /health-passport/DATABASE_URL \
  --type SecureString \
  --value 'postgresql://postgres:<PASSWORD>@<ENDPOINT>:5432/health_passport?sslmode=require'

aws ssm put-parameter --region us-east-1 --name /health-passport/S3_BUCKET_NAME \
  --type String --value '<YOUR_BUCKET_NAME>'
```

`LabInstanceProfile` can already read these (and decrypt with the default SSM KMS key). To rotate
the password later, re-run with `--overwrite` and trigger an ASG instance refresh (step 9).

---

## 7. Launch template (with user data)

Console → EC2 → **Launch templates → Create**:

- Name: `hp-web-lt`
- AMI: **Amazon Linux 2023**
- Instance type: **t3.small** (t3.micro's 1 GB RAM OOMs during `next build`)
- Key pair: **vockey**
- **Do not** set subnet here (the ASG picks it)
- **Network settings → Security groups**: `hp-web-sg`
- Advanced → **IAM instance profile**: `LabInstanceProfile`
- Advanced → **User data**:

```bash
#!/bin/bash
set -euxo pipefail

dnf install -y nodejs20 npm20 git nginx
alternatives --install /usr/bin/node node /usr/bin/node-20 100
alternatives --install /usr/bin/npm  npm  /usr/bin/npm-20  100

APP=/home/ec2-user/app
sudo -u ec2-user git clone <YOUR_REPO_URL> $APP
cd $APP
sudo -u ec2-user npm ci

DB_URL=$(aws ssm get-parameter --region us-east-1 --name /health-passport/DATABASE_URL --with-decryption --query Parameter.Value --output text)
BUCKET=$(aws ssm get-parameter --region us-east-1 --name /health-passport/S3_BUCKET_NAME --query Parameter.Value --output text)

cat > $APP/.env <<EOF
DATABASE_URL=$DB_URL
AWS_REGION=us-east-1
S3_BUCKET_NAME=$BUCKET
NODE_ENV=production
EOF
chown ec2-user:ec2-user $APP/.env

sudo -u ec2-user bash -c "cd $APP && set -a && source .env && set +a && npx prisma generate && npm run build"

cat > /etc/systemd/system/health-passport.service <<'EOF'
[Unit]
Description=Health Passport (Next.js)
After=network.target
[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
EnvironmentFile=/home/ec2-user/app/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/nginx/conf.d/health-passport.conf <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 12M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
rm -f /etc/nginx/conf.d/default.conf

systemctl daemon-reload
systemctl enable --now health-passport nginx
```

> The user-data build takes a few minutes on `t3.small`, so a fresh instance isn't healthy
> immediately — the ASG grace period in step 9 covers this. For faster scale-out, build once, then
> **create an AMI** from that instance and point the launch template at it (drop the git/npm/build
> lines from user data).

Migrations are **not** in user data — see step 10.

---

## 8. Target group + ALB

**Target group**: Console → EC2 → Target Groups → **Create**:
- Type: **Instances**, Protocol **HTTP** port **80**
- VPC: `health-passport-vpc`
- Health check path: `/login` (returns 200; `/` returns a 307 redirect)
- Name: `hp-tg`

**Load balancer**: Console → EC2 → Load Balancers → **Create → Application Load Balancer**:
- Name: `hp-alb`, Scheme **Internet-facing**, IP type **IPv4**
- VPC: `health-passport-vpc`, Mappings: the **two public** subnets
- Security group: `hp-alb-sg`
- Listener **HTTPS : 443** → forward to `hp-tg`; **Default SSL cert**: the ACM cert from step 5
- After creating, add a listener **HTTP : 80** → **Redirect** to `HTTPS 443` (permanent)

Copy the ALB **DNS name** (`hp-alb-....us-east-1.elb.amazonaws.com`).

---

## 9. Auto Scaling Group

Console → EC2 → Auto Scaling Groups → **Create**:

- Name: `hp-asg`
- Launch template: `hp-web-lt`
- VPC: `health-passport-vpc`, subnets: the **two public** subnets
- **Attach to an existing load balancer** → target group `hp-tg`
- **Health checks**: **ELB** (plus EC2), grace period **600** seconds
- Group size: **min 1 / desired 1 / max 3**
- **Target tracking** scaling policy: **Average CPU utilization = 50%**

The ASG launches the first instance. Watch **Target Groups → hp-tg → Targets** until it shows
**healthy** (~5 min for the build).

---

## 10. Migrate and seed the database (once)

Do this once, from a single instance — not in user data (every scale-out would re-run it).

```bash
# find a running instance's public IP: EC2 → Instances → the hp-asg one
ssh -i labsuser.pem ec2-user@<INSTANCE_PUBLIC_IP>

cd ~/app
set -a; source .env; set +a

npx prisma migrate deploy      # applies prisma/migrations/* — never drops data
npx prisma db seed             # creates the two demo accounts + entries
```

Expected: `Seed complete. Demo login: jamie.doyle@healthpassport.com / priya.anand@healthpassport.com, password: DemoPass123!`

Never run `migrate dev`, `migrate reset`, or `db push` against RDS.

---

## 11. Verify

Open `https://<ALB_DNS_NAME>/` (accept the self-signed warning if you imported the cert):

1. `http://` redirects to `https://`, which redirects to `/login`.
2. Sign in as `jamie.doyle@healthpassport.com` / `DemoPass123!` → employee passport, two entries.
3. Create an entry with a PDF attachment → open it → **Download** opens an S3 presigned URL.
4. Sign out, sign in as `priya.anand@healthpassport.com` / `DemoPass123!` → Team Overview → open
   Jamie → View Details → download the document.
5. RDS → `health-passport-db` → confirm **Multi-AZ: Yes** and **Encryption: Enabled**.

---

## 12. Monitoring

CloudWatch collects ALB, ASG, EC2, and RDS metrics automatically. Add:

- **Dashboard** `health-passport`: ALB `RequestCount` + `HTTPCode_ELB_5XX_Count` + `TargetResponseTime`,
  ASG `GroupInServiceInstances` + EC2 `CPUUtilization`, RDS `CPUUtilization` + `FreeStorageSpace` +
  `DatabaseConnections`.
- **Alarms** (SNS topic → your email):
  - ALB `HTTPCode_ELB_5XX_Count > 5` in 5 min
  - RDS `FreeStorageSpace < 2 GB`
  - RDS `CPUUtilization > 80%` for 10 min
  - EC2 ASG `CPUUtilization > 70%` for 10 min (sanity check on the scaling policy)
- **Cost**: the AWS Budgets console is usually blocked in the lab — watch the **Learner Lab credit
  meter**. If Budgets is available, set one at **$40** with an 80% alert.
- Optional: install the CloudWatch agent via user data for memory/disk metrics and to ship
  `journalctl -u health-passport` to a log group.

---

## Viewing the data after deployment

### Prisma Studio (SSH tunnel through an instance — RDS stays private)

```bash
ssh -i labsuser.pem -L 5432:<RDS_ENDPOINT>:5432 ec2-user@<INSTANCE_PUBLIC_IP>
```

Leave that open. In another terminal, in the repo:

```bash
DATABASE_URL="postgresql://postgres:<PASSWORD>@localhost:5432/health_passport?sslmode=require" npx prisma studio
# opens http://localhost:5555
```

`psql`, TablePlus, DBeaver, pgAdmin work the same way against `localhost:5432` while the tunnel is up.

---

## Redeploying after code changes

```bash
# 1. push your changes to the repo
# 2. roll the ASG so new instances build the new code:
#    EC2 → Auto Scaling Groups → hp-asg → Instance refresh → Start
#    (set min healthy 0% if desired is 1, so it can replace the only instance)
```

If `prisma/migrations` changed, SSH into one refreshed instance and run `npx prisma migrate deploy`
(step 10) — do it once, before or right after the refresh.

For a hotfix on a single box: `ssh` in, `cd ~/app && git pull && npm ci && npm run build &&
sudo systemctl restart health-passport`. The next instance refresh makes it permanent.

---

## Cost / teardown

**Between work sessions** (to stretch the ~$50):

- ASG → `hp-asg` → Edit → **min 0 / desired 0** (stops EC2 charges).
- RDS → **snapshot then delete**, or **Modify → Multi-AZ: No** to halve it (you can't *stop* a
  Multi-AZ instance).
- Optionally delete `hp-alb` (recreate from step 8).

**Full teardown:**

1. Delete the ASG (`hp-asg`) — terminates its instances.
2. Delete the ALB (`hp-alb`) and target group (`hp-tg`).
3. Delete the launch template (`hp-web-lt`).
4. RDS → delete `health-passport-db` (skip final snapshot, or keep one and delete it later).
5. Empty and delete the S3 bucket.
6. Delete the SSM parameters (`aws ssm delete-parameter --name ...`).
7. ACM → delete the imported cert.
8. VPC → **Delete VPC** (removes subnets, route tables, IGW, security groups).
9. CloudWatch → delete the dashboard, alarms, and SNS topic.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Target group shows instance **unhealthy** | Build still running (wait out the 600 s grace); or `hp-web-sg` missing HTTP 80 from `hp-alb-sg`; SSH in and check `sudo systemctl status health-passport` + `sudo journalctl -u health-passport -e` |
| `next build` killed / OOM | Use `t3.small`, not `t3.micro`. If stuck on micro, add swap in user data: `dd if=/dev/zero of=/swapfile bs=1M count=2048 && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| App 500s, Prisma `P1001: Can't reach database` | `hp-rds-sg` missing inbound 5432 from `hp-web-sg`; or wrong endpoint/password in the SSM parameter; or RDS not `Available` |
| Prisma `P1011` / SSL errors | Keep `?sslmode=require` (not `verify-full` unless you shipped the RDS CA bundle) |
| User data didn't run / no `~/app` | `sudo cat /var/log/cloud-init-output.log` on the instance; common causes: bad `<YOUR_REPO_URL>`, private repo needs a deploy key, SSM parameter name typo |
| `ssm get-parameter` `AccessDenied` in user data | Launch template missing `LabInstanceProfile`, or the parameter is under a different path than `/health-passport/` |
| Browser: "your connection is not private" | Expected with the imported self-signed cert — the traffic is still TLS-encrypted. Use a real domain + DNS-validated ACM cert to remove it. |
| Attachment upload 500s, `Access Denied` / `NoSuchBucket` | `LabInstanceProfile` not on the launch template; or `S3_BUCKET_NAME` parameter wrong; or bucket not in us-east-1 |
| Attachment download link 403 | Presigned URLs expire after 5 minutes — reopen the entry |
| Credit meter dropping fast | The Multi-AZ RDS is the biggest line item and can't be stopped — snapshot + delete it, or run Single-AZ until the demo |
| Logs | `sudo journalctl -u health-passport -f`, `sudo tail -f /var/log/nginx/error.log`, and CloudWatch → ALB metrics |
