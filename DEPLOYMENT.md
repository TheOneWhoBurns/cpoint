# Deployment & Infrastructure

## Architecture

The rental system runs on an **AWS Spot ASG** (Auto Scaling Group) for cost-optimized compute. A single spot instance runs the full stack (Node.js app + PostgreSQL + Nginx). Data persists on a dedicated EBS volume that survives spot interruptions.

```
Route 53 (cañonpoint.com)
    → Elastic IP (52.204.93.188)
        → Spot Instance (t3.small/t3.medium/t3a.*)
            ├── Nginx (port 80) → reverse proxy
            ├── SvelteKit app (port 3000)
            └── PostgreSQL 16 (/data/postgresql)
                    ↑
               EBS Volume (20GB gp3, persistent)
```

**Key components:**
- **Spot ASG** (min=0, max=1): Cost savings (~70% vs on-demand)
- **Elastic IP**: Stable address for DNS (52.204.93.188)
- **EBS Data Volume**: PostgreSQL data persists across spot interruptions
- **Lambda** (`rental-system-wakeup`): Scale ASG up/down programmatically
- **Spot Termination Handler**: Graceful PostgreSQL shutdown on 2-min warning

## Quick Reference

| Resource | Value |
|----------|-------|
| **Domain** | cañonpoint.com (xn--caonpoint-m6a.com) |
| **Elastic IP** | 52.204.93.188 |
| **ASG Name** | rental-system-asg |
| **Instance Type** | t3.small (spot pool: t3.small, t3.medium, t3a.small, t3a.medium) |
| **Launch Template** | rental-system-lt |
| **EBS Data Volume** | vol-00326b20f1d67f480 (us-east-1a) |
| **S3 Backups** | rental-system-backups-y0b3eprd |
| **Lambda** | rental-system-wakeup |
| **SSH Key** | cpointEC2ssh4Claude |
| **SSH User** | ubuntu |

## CI/CD Pipeline

### CI (`.github/workflows/ci.yml`)
Runs on push/PR to `main` or `rental-system`: type check → tests → build.

### Deploy (`.github/workflows/deploy.yml`)
Triggered on push to `rental-system`:
1. SSH to instance via Elastic IP
2. `git pull` → `npm ci` → `npm run build` → `npm run db:push`
3. `systemctl restart rental-app`
4. Health check: `curl http://localhost:3000/health`

### GitHub Secrets Required
- `DEPLOY_HOST`: `52.204.93.188` (the Elastic IP)
- `DEPLOY_USER`: `ubuntu`
- `DEPLOY_KEY`: SSH private key for `cpointEC2ssh4Claude`

## Manual Operations

### Scale Up (bring online)
```bash
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name rental-system-asg \
  --desired-capacity 1 --region us-east-1
```
Then associate EIP and attach EBS to the new instance:
```bash
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters 'Name=tag:Name,Values=rental-system-server' 'Name=instance-state-name,Values=running' \
  --query 'Reservations[0].Instances[0].InstanceId' --output text --region us-east-1)

aws ec2 associate-address --instance-id $INSTANCE_ID \
  --allocation-id eipalloc-020d7c1e79d903792 --allow-reassociation --region us-east-1

aws ec2 attach-volume --volume-id vol-00326b20f1d67f480 \
  --instance-id $INSTANCE_ID --device /dev/xvdf --region us-east-1
```

Or invoke the Lambda:
```bash
aws lambda invoke --function-name rental-system-wakeup \
  --payload file://<(echo '{"action":"scale-up"}') /dev/stdout \
  --cli-binary-format raw-in-base64-out --region us-east-1
```

### Scale Down (save costs)
```bash
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name rental-system-asg \
  --desired-capacity 0 --region us-east-1
```

### SSH to Instance
```bash
ssh -i cpointEC2ssh4Claude.pem ubuntu@52.204.93.188
```

### View Logs
```bash
# App logs
journalctl -u rental-app -f

# User-data bootstrap log
cat /var/log/user-data.log

# Spot termination events
cat /var/log/spot-termination.log
```

## Environment Variables

Production env lives at `/opt/rental-system/.env.production` on the instance:
- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — `production`

The DB password is managed by Terraform (`terraform output -raw db_password` in the `terraform/` directory).

**To add a new secret:** SSH to the instance, edit `.env.production`, restart the app.

## Spot Instance Behavior

- **Spot interruption**: AWS gives 2-min warning → spot-termination-handler stops PostgreSQL gracefully → instance terminated → ASG launches replacement
- **After replacement**: EIP must be re-associated and EBS re-attached (manually or via Lambda), then user-data bootstraps the app
- **Data safety**: PostgreSQL data lives on the persistent EBS volume, not the instance root volume

## Infrastructure as Code

Terraform config in `terraform/`:
- `main.tf` — EIP, EBS volume, S3 bucket, security group, launch template, ASG, Lambda
- `variables.tf` — Configuration variables
- `outputs.tf` — Resource IDs and useful commands
- `user-data.sh` — Instance bootstrap script (template)
- `lambda_function.py` — ASG scale controller + instance bootstrap helper

**Note:** Some resources were created via AWS CLI due to IAM permission limitations on the Terraform user. The Terraform state tracks: EIP, EBS, S3, security group, IAM roles, random values. The launch template, ASG, and Lambda were created via CLI.

## Future Improvements

- [ ] Grant `iam:CreateInstanceProfile` + `events:PutRule` permissions to enable fully automated EIP/EBS attachment via EventBridge → Lambda on spot replacement
- [ ] Enable CloudFlare Worker for automatic wake-up from scale-to-zero (needs Lambda Function URL)
- [ ] Enable business hours scheduling (EventBridge → Lambda scale up/down)
- [ ] Add SSL via Certbot once DNS is fully propagated
- [ ] Set up automated EBS snapshots for disaster recovery

## Local Development

```bash
docker-compose up -d    # Start local PostgreSQL
npm install
npm run dev             # Start dev server at http://localhost:5173
```
